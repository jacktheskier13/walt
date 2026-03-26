// api/auth.js — WALT Authentication & Account Management
// Vercel Serverless Function backed by Upstash Redis (KV)
//
// ── KV Key Schema ────────────────────────────────────────────
//   attorney:{email}           → full attorney account object
//   attorney:username:{u}      → email string (username → email index)
//   client:{email}             → full client account object
//   index:attorneys            → [] of email strings
//   index:clients              → [] of email strings
//   index:signups              → [] of signup summary objects (admin panel feed)
//
// ── Attorney Account Object ──────────────────────────────────
//   { type, id, name, username, email, phone, firm, barNumber,
//     practiceAreas, passwordHash, tier, status, createdAt, isDemo?, isAdmin? }
//   status : "pending" | "approved" | "denied"
//   tier   : "free" | "silver" | "gold"
//
// ── Client Account Object ────────────────────────────────────
//   { type, firstName, lastInitial, phone, email, passwordHash, createdAt }
//
// ── Password Handling ────────────────────────────────────────
//   New accounts use SHA-256 + PASSWORD_SALT (env var).
//   Demo attorneys seeded with plaintext passwords are migrated to
//   passwordHash on first successful login so the plaintext field is removed.
// ─────────────────────────────────────────────────────────────

import { Redis } from "@upstash/redis";
import crypto from "crypto";

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const ADMIN_EMAIL = "j.davies@daviesinjurylaw.com";

// ─── Password Helpers ────────────────────────────────────────

function hashPassword(password) {
  const salt = process.env.PASSWORD_SALT || "walt-default-salt";
  return crypto.createHash("sha256").update(password + salt).digest("hex");
}

function checkPassword(password, account) {
  // Support legacy plaintext passwords (demo accounts seeded before hashing was added)
  if (account.password && !account.passwordHash) {
    return account.password === password;
  }
  return account.passwordHash === hashPassword(password);
}

// Strip credential fields before returning to client
function safeAccount(account) {
  const { password, passwordHash, ...safe } = account;
  return safe;
}

// ─── Demo Attorney Seed Data ─────────────────────────────────
// Seeded on first run if not already in KV.
// j.davies = Gold + admin, m.holloway = Silver, l.zagar = Free.
// All three get status: "approved" so they can log in immediately.
// Usernames match the existing email-prefix login convention.

const DEMO_ATTORNEYS = [
  {
    id: "demo-1",
    type: "attorney",
    name: "Margaret Holloway",
    username: "m.holloway",
    firm: "Holloway & Associates",
    email: "m.holloway@hollowayfirm.com",
    phone: "(406) 555-0101",
    tier: "silver",
    status: "approved",
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
    username: "l.zagar",
    firm: "Zagar Law Office",
    email: "l.zagar@zagarlaw.com",
    phone: "(406) 555-0808",
    tier: "free",
    status: "approved",
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
    username: "j.davies",
    firm: "Davies Injury Law",
    email: "j.davies@daviesinjurylaw.com",
    phone: "(406) 555-0707",
    tier: "gold",
    status: "approved",
    barNumber: "33333",
    practiceAreas: ["Personal Injury", "Employment Law"],
    bio: "15 years of contingency-based litigation across Montana.",
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

async function seedDemoAttorneys() {
  for (const attorney of DEMO_ATTORNEYS) {
    const emailKey = `attorney:${attorney.email}`;
    const usernameKey = `attorney:username:${attorney.username}`;

    const existing = await kv.get(emailKey);

    if (!existing) {
      // First-time seed: write account and username index
      await kv.set(emailKey, attorney);
      await kv.set(usernameKey, attorney.email);

      const index = (await kv.get("index:attorneys")) || [];
      if (!index.includes(attorney.email)) {
        index.push(attorney.email);
        await kv.set("index:attorneys", index);
      }
    } else {
      // Account exists — patch in missing fields without overwriting user changes
      let needsWrite = false;
      const patched = { ...existing };

      if (!patched.username) {
        patched.username = attorney.username;
        needsWrite = true;
      }
      if (!patched.status) {
        patched.status = "approved";
        needsWrite = true;
      }

      if (needsWrite) {
        await kv.set(emailKey, patched);
      }

      // Ensure username index key exists
      const usernameIndexExists = await kv.get(usernameKey);
      if (!usernameIndexExists) {
        await kv.set(usernameKey, attorney.email);
      }
    }
  }
}

// ─── Signups List Helpers ────────────────────────────────────
// index:signups is an array of summary objects. It's kept in sync
// on every account write so the admin panel can load everything
// with a single KV read (no scanning required).

function buildSignupSummary(account) {
  if (account.type === "attorney") {
    return {
      type: "attorney",
      name: account.name,
      username: account.username || null,
      email: account.email,
      phone: account.phone || null,
      firm: account.firm || null,
      barNumber: account.barNumber || null,
      practiceAreas: account.practiceAreas || [],
      tier: account.tier || "free",
      status: account.status || "pending",
      createdAt: account.createdAt,
    };
  }
  return {
    type: "client",
    name: `${account.firstName} ${account.lastInitial}.`,
    email: account.email,
    phone: account.phone || null,
    status: "approved",
    createdAt: account.createdAt,
  };
}

async function upsertSignupSummary(account) {
  const list = (await kv.get("index:signups")) || [];
  const summary = buildSignupSummary(account);
  const idx = list.findIndex(s => s.email === account.email);
  if (idx >= 0) {
    list[idx] = summary;
  } else {
    list.unshift(summary);
  }
  await kv.set("index:signups", list);
}

async function removeFromSignupsList(email) {
  const list = (await kv.get("index:signups")) || [];
  await kv.set("index:signups", list.filter(s => s.email !== email));
}

// ─── Main Handler ────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { action, ...body } = req.body || {};

  try {
    await seedDemoAttorneys();

    switch (action) {

      // ══════════════════════════════════════════════════════
      // LOGIN
      // ══════════════════════════════════════════════════════
      case "login": {
        const { username, password, loginType } = body;
        if (!username || !password) {
          return res.status(400).json({ error: "Username and password are required." });
        }

        if (loginType === "attorney") {
          const input = username.trim().toLowerCase();
          let account = null;

          if (input.includes("@")) {
            // Full email provided
            account = await kv.get(`attorney:${input}`);
          } else {
            // Username provided — look up email via username index
            const mappedEmail = await kv.get(`attorney:username:${input}`);
            if (mappedEmail) {
              account = await kv.get(`attorney:${mappedEmail}`);
            } else {
              // Fallback: legacy prefix scan against index:attorneys
              // Covers any pre-username accounts not yet migrated
              const index = (await kv.get("index:attorneys")) || [];
              for (const email of index) {
                if (email.split("@")[0].toLowerCase() === input) {
                  account = await kv.get(`attorney:${email}`);
                  break;
                }
              }
            }
          }

          if (!account) {
            return res.status(401).json({ error: "Invalid username or password." });
          }

          if (!checkPassword(password, account)) {
            return res.status(401).json({ error: "Invalid username or password." });
          }

          // Migrate legacy plaintext password to hash on successful login
          if (account.password && !account.passwordHash) {
            const migrated = { ...account, passwordHash: hashPassword(password) };
            delete migrated.password;
            await kv.set(`attorney:${account.email}`, migrated);
            account = migrated;
          }

          if (account.status === "pending") {
            return res.status(403).json({
              error: "Your application is pending review. You will receive access once approved.",
              status: "pending"
            });
          }
          if (account.status === "denied") {
            return res.status(403).json({
              error: "Your application was not approved. Contact partners@walt.legal if you believe this is an error.",
              status: "denied"
            });
          }

          return res.status(200).json({ user: { type: "attorney", ...safeAccount(account) } });
        }

        if (loginType === "client") {
          const account = await kv.get(`client:${username.trim().toLowerCase()}`);
          if (!account || !checkPassword(password, account)) {
            return res.status(401).json({ error: "Invalid email or password." });
          }
          // Migrate legacy plaintext password on successful login
          if (account.password && !account.passwordHash) {
            const migrated = { ...account, passwordHash: hashPassword(password) };
            delete migrated.password;
            await kv.set(`client:${account.email}`, migrated);
          }
          return res.status(200).json({ user: { type: "client", ...safeAccount(account) } });
        }

        return res.status(400).json({ error: "Invalid login type." });
      }

      // ══════════════════════════════════════════════════════
      // SIGNUP — CLIENT
      // ══════════════════════════════════════════════════════
      case "signup-client": {
        const { firstName, lastInitial, phone, email, password } = body;
        if (!firstName || !lastInitial || !phone || !email || !password) {
          return res.status(400).json({ error: "All fields are required." });
        }

        const emailLower = email.trim().toLowerCase();
        const existing = await kv.get(`client:${emailLower}`);
        if (existing) {
          return res.status(409).json({ error: "An account with this email already exists. Please log in instead." });
        }

        const account = {
          type: "client",
          firstName,
          lastInitial: lastInitial.toUpperCase(),
          phone,
          email: emailLower,
          passwordHash: hashPassword(password),
          createdAt: new Date().toISOString(),
        };

        await kv.set(`client:${emailLower}`, account);

        const index = (await kv.get("index:clients")) || [];
        index.push(emailLower);
        await kv.set("index:clients", index);

        await upsertSignupSummary(account);

        return res.status(200).json({ user: { type: "client", ...safeAccount(account) } });
      }

      // ══════════════════════════════════════════════════════
      // SIGNUP — ATTORNEY
      // ══════════════════════════════════════════════════════
      case "signup-attorney": {
        const { name, username, barNumber, firm, email, phone, password, practiceAreas } = body;
        if (!name || !username || !barNumber || !email || !phone || !password) {
          return res.status(400).json({ error: "All required fields must be filled out." });
        }

        if (!/^[a-zA-Z0-9._-]{3,30}$/.test(username)) {
          return res.status(400).json({
            error: "Username must be 3–30 characters and may only contain letters, numbers, periods, underscores, or hyphens."
          });
        }

        if (password.length < 6) {
          return res.status(400).json({ error: "Password must be at least 6 characters." });
        }

        const emailLower = email.trim().toLowerCase();
        const usernameLower = username.trim().toLowerCase();
        const emailKey = `attorney:${emailLower}`;
        const usernameKey = `attorney:username:${usernameLower}`;

        const [existingByEmail, existingUsername] = await Promise.all([
          kv.get(emailKey),
          kv.get(usernameKey),
        ]);

        if (existingByEmail) {
          return res.status(409).json({ error: "An account with this email already exists. Please log in instead." });
        }
        if (existingUsername) {
          return res.status(409).json({ error: "That username is already taken. Please choose another." });
        }

        // Bar number uniqueness check
        const attorneyIndex = (await kv.get("index:attorneys")) || [];
        for (const existingEmail of attorneyIndex) {
          const a = await kv.get(`attorney:${existingEmail}`);
          if (a && a.barNumber === barNumber) {
            return res.status(409).json({ error: "This bar number is already registered." });
          }
        }

        const account = {
          type: "attorney",
          id: `atty-${Date.now()}`,
          name,
          username: usernameLower,
          barNumber,
          firm: firm || "Solo Practice",
          email: emailLower,
          phone,
          practiceAreas: practiceAreas || [],
          passwordHash: hashPassword(password),
          tier: "free",        // Admin assigns tier on approval
          status: "pending",   // Blocked from login until approved by j.davies
          bidsThisMonth: 0,
          createdAt: new Date().toISOString(),
        };

        await Promise.all([
          kv.set(emailKey, account),
          kv.set(usernameKey, emailLower),
        ]);

        attorneyIndex.push(emailLower);
        await kv.set("index:attorneys", attorneyIndex);
        await upsertSignupSummary(account);

        // Return pending — frontend redirects to attorney-pending page, does NOT log in
        return res.status(200).json({ status: "pending" });
      }

      // ══════════════════════════════════════════════════════
      // GET SIGNUPS — admin only
      // ══════════════════════════════════════════════════════
      case "get-signups": {
        const { email } = body;
        if (email !== ADMIN_EMAIL) {
          return res.status(403).json({ error: "Unauthorized." });
        }
        const signups = (await kv.get("index:signups")) || [];
        return res.status(200).json({ signups });
      }

      // ══════════════════════════════════════════════════════
      // APPROVE ATTORNEY — admin only
      // ══════════════════════════════════════════════════════
      case "approve-attorney": {
        const { email, tier, callerEmail } = body;
        if (callerEmail !== ADMIN_EMAIL) {
          return res.status(403).json({ error: "Unauthorized." });
        }
        if (!email) return res.status(400).json({ error: "Email required." });

        const key = `attorney:${email.toLowerCase()}`;
        const account = await kv.get(key);
        if (!account) return res.status(404).json({ error: "Account not found." });

        const validTiers = ["free", "silver", "gold"];
        const assignedTier = validTiers.includes(tier) ? tier : "free";
        const updated = { ...account, status: "approved", tier: assignedTier };

        await kv.set(key, updated);
        await upsertSignupSummary(updated);

        return res.status(200).json({ success: true });
      }

      // ══════════════════════════════════════════════════════
      // DENY ATTORNEY — admin only
      // ══════════════════════════════════════════════════════
      case "deny-attorney": {
        const { email, callerEmail } = body;
        if (callerEmail !== ADMIN_EMAIL) {
          return res.status(403).json({ error: "Unauthorized." });
        }
        if (!email) return res.status(400).json({ error: "Email required." });

        const key = `attorney:${email.toLowerCase()}`;
        const account = await kv.get(key);
        if (!account) return res.status(404).json({ error: "Account not found." });

        const updated = { ...account, status: "denied" };
        await kv.set(key, updated);
        await upsertSignupSummary(updated);

        return res.status(200).json({ success: true });
      }

      // ══════════════════════════════════════════════════════
      // SET TIER — admin only
      // ══════════════════════════════════════════════════════
      case "set-tier": {
        const { email, tier, callerEmail } = body;
        if (callerEmail !== ADMIN_EMAIL) {
          return res.status(403).json({ error: "Unauthorized." });
        }
        if (!email || !tier) return res.status(400).json({ error: "Email and tier required." });

        const validTiers = ["free", "silver", "gold"];
        if (!validTiers.includes(tier)) {
          return res.status(400).json({ error: "Invalid tier. Must be free, silver, or gold." });
        }

        const key = `attorney:${email.toLowerCase()}`;
        const account = await kv.get(key);
        if (!account) return res.status(404).json({ error: "Account not found." });

        const updated = { ...account, tier };
        await kv.set(key, updated);
        await upsertSignupSummary(updated);

        return res.status(200).json({ success: true });
      }

      // ══════════════════════════════════════════════════════
      // DELETE ACCOUNT — admin only
      // ══════════════════════════════════════════════════════
      case "delete-account": {
        const { email, callerEmail } = body;
        if (callerEmail !== ADMIN_EMAIL) {
          return res.status(403).json({ error: "Unauthorized." });
        }
        if (!email) return res.status(400).json({ error: "Email required." });
        if (email.toLowerCase() === ADMIN_EMAIL) {
          return res.status(403).json({ error: "Cannot delete the admin account." });
        }

        const emailLower = email.toLowerCase();

        // Try attorney first, then client
        const attorney = await kv.get(`attorney:${emailLower}`);
        if (attorney) {
          const delOps = [kv.del(`attorney:${emailLower}`)];
          if (attorney.username) {
            delOps.push(kv.del(`attorney:username:${attorney.username.toLowerCase()}`));
          }
          await Promise.all(delOps);

          const attorneyIndex = (await kv.get("index:attorneys")) || [];
          await kv.set("index:attorneys", attorneyIndex.filter(e => e !== emailLower));
        } else {
          const client = await kv.get(`client:${emailLower}`);
          if (!client) return res.status(404).json({ error: "Account not found." });
          await kv.del(`client:${emailLower}`);

          const clientIndex = (await kv.get("index:clients")) || [];
          await kv.set("index:clients", clientIndex.filter(e => e !== emailLower));
        }

        await removeFromSignupsList(emailLower);
        return res.status(200).json({ success: true });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }

  } catch (err) {
    console.error(`[auth.js] action=${action} error:`, err);
    return res.status(500).json({ error: "Internal server error. Please try again." });
  }
}
