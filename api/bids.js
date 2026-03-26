// api/bids.js — WALT Bids
// Handles: placing a bid on a case, selecting an attorney (client action)

import { Redis } from "@upstash/redis";
const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { action } = req.body || {};

  try {

    // ── PLACE BID ──────────────────────────────────────────────
    if (action === "place-bid") {
      const { caseId, bid } = req.body;
      if (!caseId || !bid) {
        return res.status(400).json({ error: "caseId and bid required" });
      }

      const existing = await kv.get(`case:${caseId}`);
      if (!existing) {
        return res.status(404).json({ error: "Case not found" });
      }

      const updatedBids = [...(existing.bids || []), { ...bid, submittedAt: new Date().toISOString() }];
      const updated = { ...existing, bids: updatedBids };
      await kv.set(`case:${caseId}`, updated);

      return res.status(200).json({ success: true, case: updated });
    }

    // ── SELECT ATTORNEY ────────────────────────────────────────
    if (action === "select-attorney") {
      const { caseId, selectedBid } = req.body;
      if (!caseId || !selectedBid) {
        return res.status(400).json({ error: "caseId and selectedBid required" });
      }

      const existing = await kv.get(`case:${caseId}`);
      if (!existing) {
        return res.status(404).json({ error: "Case not found" });
      }

      const updated = { ...existing, selectedAttorney: selectedBid, status: "closed" };
      await kv.set(`case:${caseId}`, updated);

      return res.status(200).json({ success: true, case: updated });
    }

    return res.status(400).json({ error: "Unknown action" });

  } catch (err) {
    console.error("bids.js error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
