// api/document.js — WALT Document Assistant Proxy
// Handles all four document-assistant operations:
//   "manual-entry"  → guided chat to gather complaint details by typing
//   "upload"        → extract structured data from a PDF or image
//   "defense-chat"  → chat to gather denial/defense/jury preferences
//   "generate"      → produce the final Montana court Answer document

// ─── RATE LIMITER ────────────────────────────────────────────
// 30 requests per hour — document assistant is more conversational so
// needs a higher ceiling, but still capped to prevent abuse.
const rateLimitMap = new Map();
const RATE_LIMIT_MAX = 30;
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

// ─── SYSTEM PROMPTS ──────────────────────────────────────────
// Kept server-side so clients can't inspect or manipulate the instructions.

const MANUAL_ENTRY_SYSTEM = `You are helping a Montana resident prepare an Answer to a Debt Collection Complaint by gathering information from them manually (they're typing information from their paper complaint).

INFORMATION TO GATHER (ask ONE question at a time):
1. Plaintiff name (creditor/debt collector)
2. Defendant name (the person being sued)
3. Case number
4. Court name
5. Montana county
6. Amount claimed
7. Account number (if mentioned)
8. Original creditor (if different from plaintiff)
9. Date filed
10. Date served (if known)

ACCEPT VARIED RESPONSES: Users may give short answers, full sentences, or uncertain responses. Be flexible:
- If they give just a name, number, or date → accept it and move to next question
- If they're uncertain but provide something → accept what they have
- If they clearly don't know → mark as "Not found" after ONE attempt to help them locate it

GUIDANCE FOR "I DON'T KNOW" RESPONSES:
- "That's okay! Let me ask it differently - look at the top of your complaint document. What county name appears in the court heading?"
- "No problem! The case number is usually at the top right of the document. It might say 'Case No.' or 'Cause No.' followed by some numbers and letters."
- "That's fine - the account number might be in the body of the complaint, or it might say 'Account ending in...' If you don't see it, that's okay."

Don't ask for clarification if the answer is clear from context. Move efficiently through the questions.

After gathering this basic information, respond with ONLY this JSON (no markdown, no backticks):
{"extracted": true, "plaintiff": "name", "defendant": "name", "caseNumber": "number", "court": "court name", "county": "county", "amountClaimed": "amount", "accountNumber": "number or Not found", "originalCreditor": "name or Not found", "dateFiled": "date", "dateServed": "date or Not found"}

Be conversational but efficient. Accept straightforward answers without unnecessary follow-up.`;

const UPLOAD_EXTRACTION_PROMPT = `This is a debt collection complaint filed in Montana court. Extract the following information and respond ONLY with a JSON object (no markdown): {"plaintiff": "creditor/plaintiff name", "defendant": "defendant name", "caseNumber": "case number", "court": "court name", "county": "Montana county", "amountClaimed": "dollar amount", "accountNumber": "account number if present", "originalCreditor": "original creditor if different from plaintiff", "dateFiled": "date filed", "dateServed": "date served if mentioned"}. If any field is not found, use 'Not found'.`;

function buildDefenseChatSystem(extractedData) {
  return `You are helping a Montana resident complete an Answer to a Debt Collection Complaint. The complaint data: ${JSON.stringify(extractedData)}.

Ask ONE question at a time to gather:
1. Do they admit or deny owing the debt? (General Denial or Specific Admissions/Denials)
2. Any affirmative defenses? (e.g., statute of limitations, payment in full, accord and satisfaction, lack of standing, improper service, identity theft, bankruptcy discharge)
3. Do they want a jury trial?

ACCEPT SIMPLE ANSWERS: If user says simple things like "yes", "no", "deny", "I deny it", "admit", "I don't owe this", "not true" etc., interpret these clearly:
- "no", "deny", "I deny", "I don't owe this", "not true" = They DENY the debt
- "yes", "admit", "I owe it", "that's correct" = They ADMIT the debt
- "jury", "yes jury", "I want a jury" = They want a JURY TRIAL
- "no jury", "judge", "no" (when asked about jury) = They DON'T want a jury trial

After you have clear answers to all 3 questions (usually 3-5 exchanges), respond with ONLY this JSON (no markdown): {"ready": true, "responseType": "General Denial | Specific", "denials": ["paragraph numbers or descriptions"], "affirmativeDefenses": ["list of defenses"], "juryDemand": true/false, "additionalInfo": "any other relevant info"}

Be conversational but efficient.`;
}

function buildGeneratePrompt(extractedData, formData) {
  return `Generate a formal Montana court Answer to Complaint as plain text with proper formatting.

CASE INFORMATION:
Court: ${extractedData.court || "MONTANA DISTRICT COURT"}
County: ${extractedData.county || "[COUNTY]"}
Case Number: ${extractedData.caseNumber || "[CASE NUMBER]"}
Plaintiff: ${extractedData.plaintiff || "[PLAINTIFF]"}
Defendant: ${extractedData.defendant || "[DEFENDANT]"}
Amount Claimed: ${extractedData.amountClaimed || "Not specified"}

RESPONSE DETAILS:
Response Type: ${formData.responseType}
${formData.denials?.length > 0 ? `Specific Denials: ${formData.denials.join(", ")}` : ""}
${formData.affirmativeDefenses?.length > 0 ? `Affirmative Defenses: ${formData.affirmativeDefenses.join("; ")}` : "No affirmative defenses"}
Jury Trial Requested: ${formData.juryDemand ? "Yes" : "No"}

Create a complete, properly formatted Answer document following Montana legal standards. Include all required sections:
1. Court header and case caption (centered)
2. Case number (right-aligned)
3. Title: "ANSWER TO COMPLAINT" (centered, bold/caps)
4. Introduction paragraph starting with "COMES NOW the Defendant..."
5. Response section (either General Denial or Specific Responses)
6. Affirmative Defenses section (if any, numbered)
7. Jury Demand section (if requested)
8. Prayer for Relief (WHEREFORE clause with 3 numbered requests)
9. Signature block with date line and "Defendant, Pro Se"

Use proper spacing between sections. Make it look professional and court-ready. Output ONLY the document text with no markdown, no code blocks, no explanations - just the legal document.`;
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

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY environment variable is not set");
    return res.status(500).json({ error: "Service configuration error" });
  }

  const { type } = req.body || {};
  if (!type) {
    return res.status(400).json({ error: "Invalid request: type required" });
  }

  let anthropicPayload;

  try {
    switch (type) {
      case "manual-entry": {
        const { system, messages } = req.body;
        if (!messages || !Array.isArray(messages)) {
          return res.status(400).json({ error: "messages array required" });
        }
        anthropicPayload = {
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: MANUAL_ENTRY_SYSTEM,
          messages
        };
        break;
      }

      case "upload": {
        const { mediaType, base64 } = req.body;
        if (!mediaType || !base64) {
          return res.status(400).json({ error: "mediaType and base64 required" });
        }
        const contentType = mediaType.includes("pdf") ? "document" : "image";
        anthropicPayload = {
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [{
            role: "user",
            content: [
              { type: contentType, source: { type: "base64", media_type: mediaType, data: base64 } },
              { type: "text", text: UPLOAD_EXTRACTION_PROMPT }
            ]
          }]
        };
        break;
      }

      case "defense-chat": {
        const { messages, extractedData: defenseExtractedData } = req.body;
        if (!messages || !Array.isArray(messages)) {
          return res.status(400).json({ error: "messages array required" });
        }
        anthropicPayload = {
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: buildDefenseChatSystem(defenseExtractedData || {}),
          messages
        };
        break;
      }

      case "generate": {
        const { extractedData, formData } = req.body;
        if (!extractedData || !formData) {
          return res.status(400).json({ error: "extractedData and formData required" });
        }
        anthropicPayload = {
          model: "claude-sonnet-4-20250514",
          max_tokens: 3000,
          messages: [{ role: "user", content: buildGeneratePrompt(extractedData, formData) }]
        };
        break;
      }

      default:
        return res.status(400).json({ error: `Unknown type: ${type}` });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(anthropicPayload)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Anthropic API error:", response.status, errorBody);
      return res.status(502).json({ error: "Upstream API error. Please try again." });
    }

    const data = await response.json();
    const text = data.content?.map(b => b.text || "").join("\n").trim() || "";

    return res.status(200).json({ text });
  } catch (err) {
    console.error("document.js handler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
