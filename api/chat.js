// api/chat.js — WALT Intake Chat Proxy
// Sits between the browser and Anthropic. The API key never leaves this server.

// ─── RATE LIMITER ────────────────────────────────────────────
// Keeps a counter per IP address. Resets automatically after the window expires.
// "20 requests per hour" means a full intake conversation (6–8 messages) can
// be completed ~2–3 times per hour per person — plenty for real users,
// painful enough to deter scrapers and bots.
const rateLimitMap = new Map(); // ip → { count, windowStart }
const RATE_LIMIT_MAX = 20;       // max requests per window
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour in milliseconds

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    // First request from this IP, or window has expired — start fresh
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    // Over the limit — calculate when their window resets
    const resetInMs = RATE_LIMIT_WINDOW_MS - (now - entry.windowStart);
    const resetInMinutes = Math.ceil(resetInMs / 60000);
    return { allowed: false, resetInMinutes };
  }

  // Under the limit — increment and allow
  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count };
}

// ─── SYSTEM PROMPT ───────────────────────────────────────────
// Kept server-side so clients can't inspect or manipulate it.
const INTAKE_SYSTEM_PROMPT = `You are an intake assistant for WALT, a Montana-only legal help marketplace. Ask ONE question at a time - never multiple questions. Be empathetic and conversational.

Your goal is to gather enough information to connect the client with the right Montana attorney. Follow this general flow, adapting naturally to the conversation:

1. Understand the legal issue (type, county, timeline, key facts)
2. Gather case-specific details (medical bills for injury, salary for employment, etc.)
3. Near the end, ask ONE gentle question about fee preferences — see instructions below

FEE/MEANS QUESTION (ask this naturally near the end, after you understand the case):
Ask something like: "One more thing — attorneys handle fees in different ways. Some work on contingency (no fee unless you win), others charge hourly or a flat rate. Do you have a preference, or is cost a significant factor for you right now?"

Listen carefully to the response:
- If the client indicates cost is a significant concern, they're on a fixed income, unemployed, mention they can't afford an attorney, or express financial hardship → set isProBono to true in the JSON. Do NOT tell the client their case is being flagged — simply acknowledge their situation warmly and continue.
- If they indicate they're fine with standard fees or have a preference → set isProBono to false

For personal injury cases, also gather: approximate medical bills, lost wages, whether the other party has insurance.
For employment cases, gather: annual salary and time out of work.

After gathering sufficient information (typically 5-8 exchanges), respond with ONLY this JSON (no markdown, no backticks, no explanation):
{"ready": true, "summary": "2-3 sentence summary of the legal situation", "category": "Credit Default | Landlord-Tenant | Family Law | Criminal | Personal Injury | Employment Law | Other", "county": "Montana county", "isPremium": true, "isProBono": false, "assessmentInputs": {"medicalBills": null, "lostWages": null, "liabilityClarity": "clear | contested | unknown", "hasInsurance": null, "annualSalary": null, "claimAmount": null, "caseComplexity": "simple | moderate | complex", "additionalNotes": "any other relevant details"}}

Set isPremium to true for contingency cases: personal injury, car accidents, slip and fall, wrongful death, medical malpractice, employment discrimination, wrongful termination, civil rights violations.
Set isPremium to false for hourly/flat-fee cases: debt defense, landlord-tenant, divorce, bankruptcy, estate planning, criminal defense, immigration, contracts.
Set isProBono to true only if the client indicated financial hardship or inability to afford representation.

Never mention fees, tiers, premium, pro bono, or valuations to the client. Do NOT ask for contact information. Always be warm, clear, and non-judgmental — especially around financial topics.`;

// ─── HANDLER ─────────────────────────────────────────────────
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Get the caller's IP address (Vercel provides this in the x-forwarded-for header)
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  // Check rate limit before doing anything else
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: `Too many requests. Please try again in ${rateCheck.resetInMinutes} minutes.`
    });
  }

  // Validate the request body
  const { messages } = req.body || {};
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid request: messages array required" });
  }

  // Make sure the API key is configured
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY environment variable is not set");
    return res.status(500).json({ error: "Service configuration error" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: INTAKE_SYSTEM_PROMPT,
        messages
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Anthropic API error:", response.status, errorBody);
      return res.status(502).json({ error: "Upstream API error. Please try again." });
    }

    const data = await response.json();
    const text = data.content?.map(b => b.text || "").join("\n").trim() || "";

    // Return a clean, simple shape to the browser
    return res.status(200).json({ text });
  } catch (err) {
    console.error("chat.js handler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
