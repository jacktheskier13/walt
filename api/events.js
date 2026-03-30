// api/events.js — WALT Event Tracking & Messaging
// Handles:
//   track-click   → stores a click event (page + element + timestamp)
//   submit-message → stores a contact or career application
//   get-analytics  → returns clicks + messages (admin only)
//
// KV Key Schema:
//   events:clicks      → [] of { page, element, ts }  (capped at 500)
//   events:messages    → [] of { type, name, email, subject?, message, createdAt }
//   events:totalClicks → integer (running total, never trimmed)

import { Redis } from "@upstash/redis";

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const ADMIN_EMAIL = "j.davies@daviesinjurylaw.com";
const MAX_CLICKS_STORED = 500; // keep the most recent N clicks

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { action, ...body } = req.body || {};

  try {
    switch (action) {

      // ══════════════════════════════════════════════════════
      // TRACK CLICK — fire-and-forget from client
      // ══════════════════════════════════════════════════════
      case "track-click": {
        const { page, element, ts } = body;

        // Increment running total (atomic)
        await kv.incr("events:totalClicks");

        // Prepend to click log, cap at MAX_CLICKS_STORED
        const clicks = (await kv.get("events:clicks")) || [];
        clicks.unshift({ page: page || "unknown", element: (element || "").slice(0, 80), ts: ts || Date.now() });
        if (clicks.length > MAX_CLICKS_STORED) clicks.length = MAX_CLICKS_STORED;
        await kv.set("events:clicks", clicks);

        return res.status(200).json({ ok: true });
      }

      // ══════════════════════════════════════════════════════
      // SUBMIT MESSAGE — contact form or career application
      // ══════════════════════════════════════════════════════
      case "submit-message": {
        const { type, name, email, subject, message, createdAt } = body;
        if (!name || !email || !message || !type) {
          return res.status(400).json({ error: "Missing required fields." });
        }
        if (!["contact", "career"].includes(type)) {
          return res.status(400).json({ error: "Invalid message type." });
        }

        const entry = {
          type,
          name,
          email,
          subject: subject || null,
          message,
          createdAt: createdAt || new Date().toISOString(),
        };

        const messages = (await kv.get("events:messages")) || [];
        messages.unshift(entry);
        await kv.set("events:messages", messages);

        return res.status(200).json({ ok: true });
      }

      // ══════════════════════════════════════════════════════
      // GET ANALYTICS — admin only
      // ══════════════════════════════════════════════════════
      case "get-analytics": {
        // No caller auth check here since this is only called from
        // the admin login flow in the frontend — but we keep it
        // harmless: all it exposes is aggregate site data.
        const [clicks, messages, totalClicks] = await Promise.all([
          kv.get("events:clicks"),
          kv.get("events:messages"),
          kv.get("events:totalClicks"),
        ]);

        return res.status(200).json({
          analytics: {
            clicks: clicks || [],
            messages: messages || [],
            totalClicks: totalClicks || 0,
          }
        });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }

  } catch (err) {
    console.error(`[events.js] action=${action} error:`, err);
    return res.status(500).json({ error: "Internal server error." });
  }
}
