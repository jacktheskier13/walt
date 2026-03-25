// api/assess.js — WALT Case Assessment Proxy
// Called after a client submits a case. Generates attorney-facing intelligence
// (valuation or hours estimate). Never visible to clients.

// ─── RATE LIMITER ────────────────────────────────────────────
// Assessment is triggered once per case submission, so the limit is tighter.
// 10 per hour per IP is generous for legitimate use, restrictive for abuse.
const rateLimitMap = new Map();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    const resetInMinutes = Math.ceil(
      (RATE_LIMIT_WINDOW_MS - (now - entry.windowStart)) / 60000
    );
    return { allowed: false, resetInMinutes };
  }

  entry.count++;
  return { allowed: true };
}

// ─── HANDLER ─────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: `Too many requests. Please try again in ${rateCheck.resetInMinutes} minutes.`
    });
  }

  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Invalid request: prompt string required" });
  }

  // Guard against extremely long prompts (basic abuse prevention)
  if (prompt.length > 8000) {
    return res.status(400).json({ error: "Prompt too long" });
  }

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
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Anthropic API error:", response.status, errorBody);
      return res.status(502).json({ error: "Upstream API error. Please try again." });
    }

    const data = await response.json();
    const text = data.content?.map(b => b.text || "").join("").trim() || "";

    return res.status(200).json({ text });
  } catch (err) {
    console.error("assess.js handler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
