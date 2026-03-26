// api/cases.js — WALT Cases
// Handles: fetching all cases, submitting a new case, updating assessment

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

    // ── GET ALL CASES ──────────────────────────────────────────
    if (action === "get-cases") {
      const index = await kv.get("index:cases") || [];
      const cases = [];
      for (const caseId of index) {
        const c = await kv.get(`case:${caseId}`);
        if (c) cases.push(c);
      }
      // Sort newest first
      cases.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
      return res.status(200).json({ cases });
    }

    // ── SUBMIT NEW CASE ────────────────────────────────────────
    if (action === "submit-case") {
      const { caseData } = req.body;
      if (!caseData || !caseData.id) {
        return res.status(400).json({ error: "Invalid case data" });
      }

      await kv.set(`case:${caseData.id}`, caseData);

      // Add to case index
      const index = await kv.get("index:cases") || [];
      if (!index.includes(caseData.id)) {
        index.unshift(caseData.id);
        await kv.set("index:cases", index);
      }

      return res.status(200).json({ success: true });
    }

    // ── UPDATE ASSESSMENT (runs after AI generates it) ────────
    if (action === "update-assessment") {
      const { caseId, assessment } = req.body;
      if (!caseId) {
        return res.status(400).json({ error: "caseId required" });
      }

      const existing = await kv.get(`case:${caseId}`);
      if (!existing) {
        return res.status(404).json({ error: "Case not found" });
      }

      const updated = { ...existing, assessment: assessment || null, assessmentPending: false };
      await kv.set(`case:${caseId}`, updated);

      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: "Unknown action" });

  } catch (err) {
    console.error("cases.js error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
