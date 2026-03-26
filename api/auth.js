// api/auth.js — WALT Authentication
// Handles: login (client + attorney), client signup, attorney signup
// All accounts stored in Vercel KV and persist across devices/sessions

import { Redis } from "@upstash/redis";
const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// ─── DEMO ATTORNEY SEED DATA ─────────────────────────────────
// These are seeded on first use if not already in the database.
// m.holloway = Silver, l.zagar = Free (kept for demo purposes)
// j.davies = Gold (your admin account)
const DEMO_ATTORNEYS = [
  {
    id: "demo-1",
    type: "attorney",
    name: "Margaret Holloway",
    firm: "Holloway & Associates",
    email: "m.holloway@hollowayfirm.com",
    phone: "(406) 555-0101",
    tier: "silver",
    barNumber: "11111",
    practiceAreas: ["Personal Injury", "Employment Law", "Family Law"],
    bio: "Experienced litigator handling both contingency and hourly matters across multiple practice areas.",
    bidsThisMonth: 8,
    password: "walt2025",
    createdAt: new Date("2025-01-01").toISOString(),
    isDemo: true
  },
  {
    id: "demo-2",
    type: "attorney",
    name: "Luke Zagar",
    firm: "Zagar Law Office",
    email: "l.zagar@zagarlaw.com",
    phone: "(406) 555-0808",
    tier: "free",
    barNumber: "22222",
    practiceAreas: ["Credit Default / Debt Collection", "Landlord-Tenant", "Bankruptcy"],
    bio: "General practice attorney serving clients across Montana with flat-fee and hourly representation.",
    bidsThisMonth: 2,
    bidsRemaining: 1,
    password: "walt2025",
    createdAt: new Date("2025-01-01").toISOString(),
    isDemo: true
  },
  {
    id: "demo-3",
    type: "attorney",
    name: "Jack Davies",
    firm: "Davies Injury Law",
    email: "j.davies@daviesinjurylaw.com",
    phone: "(406) 555-0707",
    tier: "gold",
    barNumber: "33333",
    practiceAreas: ["Personal Injury", "Employment Law"],
    bio: "15 years of contingency-based litigation across Montana. Specializing in personal injury, wrongful termination, and high-value civil claims.",
    winRate: "84%",
    avgCaseValue: "$48,000",
    casesWonThisMonth: 3,
    bidsThisMonth: 12,
    password: "walt2025",
    createdAt: new Date("2025-01-01").toISOString(),
    isDemo: true,
    isAdmin: true
  }
];

// Ensure demo attorneys exist in KV on first run
async function seedDemoAttorneys() {
  for (const attorney of DEMO_ATTORNEYS) {
    const existing = await kv.get(`attorney:${attorney.email}`);
    if (!existing) {
      await kv.set(`attorney:${attorney.email}`, attorney);
      // Add to attorney index
      const index = await kv.get("index:attorneys") || [];
      if (!index.includes(attorney.email)) {
        index.push(attorney.email);
        await kv.set("index:attorneys", index);
      }
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { action } = req.body || {};

  try {
    await seedDemoAttorneys();

    // ── LOGIN ──────────────────────────────────────────────────
    if (action === "login") {
      const { username, password, loginType } = req.body;

      if (loginType === "attorney") {
        // Try email match first, then username prefix match
        let attorney = await kv.get(`attorney:${username}`);
        if (!attorney) {
          // Search by username prefix (e.g. "j.davies" matches "j.davies@...")
          const index = await kv.get("index:attorneys") || [];
          for (const email of index) {
            if (email.split("@")[0].toLowerCase() === username.toLowerCase()) {
              attorney = await kv.get(`attorney:${email}`);
              break;
            }
          }
        }

        if (!attorney) {
          return res.status(401).json({ error: "Invalid credentials. For demo attorneys, try username: m.holloway, password: walt2025" });
        }

        if (attorney.password !== password) {
          return res.status(401).json({ error: "Invalid credentials. For demo attorneys, try username: m.holloway, password: walt2025" });
        }

        const { password: _, ...safeAttorney } = attorney;
        return res.status(200).json({ user: { type: "attorney", ...safeAttorney } });
      }

      if (loginType === "client") {
        const client = await kv.get(`client:${username}`);
        if (!client || client.password !== password) {
          return res.status(401).json({ error: "Invalid credentials. Please check your email and password, or create an account." });
        }
        const { password: _, ...safeClient } = client;
        return res.status(200).json({ user: { type: "client", ...safeClient } });
      }

      return res.status(400).json({ error: "Invalid login type" });
    }

    // ── CLIENT SIGNUP ──────────────────────────────────────────
    if (action === "signup-client") {
      const { firstName, lastInitial, phone, email, password } = req.body;

      const existing = await kv.get(`client:${email}`);
      if (existing) {
        return res.status(409).json({ error: "An account with this email already exists. Please log in instead." });
      }

      const newClient = {
        type: "client",
        firstName,
        lastInitial,
        phone,
        email,
        password,
        createdAt: new Date().toISOString()
      };

      await kv.set(`client:${email}`, newClient);

      // Add to client index
      const index = await kv.get("index:clients") || [];
      index.push(email);
      await kv.set("index:clients", index);

      // Add to global signups log for j.davies admin panel
      const signups = await kv.get("index:signups") || [];
      signups.unshift({
        type: "client",
        name: `${firstName} ${lastInitial}.`,
        email,
        createdAt: new Date().toISOString()
      });
      await kv.set("index:signups", signups);

      const { password: _, ...safeClient } = newClient;
      return res.status(200).json({ user: { type: "client", ...safeClient } });
    }

    // ── ATTORNEY SIGNUP ────────────────────────────────────────
    if (action === "signup-attorney") {
      const { name, barNumber, firm, email, phone, password, practiceAreas } = req.body;

      const existing = await kv.get(`attorney:${email}`);
      if (existing) {
        return res.status(409).json({ error: "An account with this email already exists. Please log in instead." });
      }

      // Check bar number uniqueness
      const index = await kv.get("index:attorneys") || [];
      for (const existingEmail of index) {
        const a = await kv.get(`attorney:${existingEmail}`);
        if (a && a.barNumber === barNumber) {
          return res.status(409).json({ error: "This bar number is already registered. Please log in instead." });
        }
      }

      const newAttorney = {
        type: "attorney",
        id: `atty-${Date.now()}`,
        name,
        barNumber,
        firm: firm || "Solo Practice",
        email,
        phone,
        password,
        practiceAreas,
        tier: "gold", // All new signups get Gold per marketing strategy
        bidsThisMonth: 0,
        createdAt: new Date().toISOString()
      };

      await kv.set(`attorney:${email}`, newAttorney);

      // Add to attorney index
      index.push(email);
      await kv.set("index:attorneys", index);

      // Add to global signups log for j.davies admin panel
      const signups = await kv.get("index:signups") || [];
      signups.unshift({
        type: "attorney",
        name,
        email,
        firm: firm || "Solo Practice",
        barNumber,
        createdAt: new Date().toISOString()
      });
      await kv.set("index:signups", signups);

      const { password: _, ...safeAttorney } = newAttorney;
      return res.status(200).json({ user: { type: "attorney", ...safeAttorney } });
    }

    // ── GET SIGNUPS (admin only — j.davies) ───────────────────
    if (action === "get-signups") {
      const { email } = req.body;
      if (email !== "j.davies@daviesinjurylaw.com") {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const signups = await kv.get("index:signups") || [];
      return res.status(200).json({ signups });
    }

    return res.status(400).json({ error: "Unknown action" });

  } catch (err) {
    console.error("auth.js error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
