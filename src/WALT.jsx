import { useState, useRef, useEffect } from "react";

// ============================================================
// WALT — MONTANA LEGAL HELP MARKETPLACE
// ============================================================
// Architecture:
//   • Chat-based AI intake (uses Anthropic API)
//   • Generates structured case summaries
//   • Attorney Partners bid on cases (Uber-style marketplace)
//   • Clients select winning bid
// ============================================================

// ─── MOCK ATTORNEY PARTNERS ─────────────────────────────────
const ATTORNEY_PARTNERS = [
  { 
    id: 1, 
    name: "Margaret Holloway", 
    firm: "Holloway & Associates", 
    email: "m.holloway@hollowayfirm.com", 
    phone: "(406) 555-0101",
    tier: "silver",
    practiceAreas: ["Personal Injury", "Employment Law", "Family Law"],
    bio: "Experienced litigator handling both contingency and hourly matters across multiple practice areas.",
    bidsThisMonth: 8,
    bidsRemaining: null // unlimited for silver
  },
  { id: 2, name: "David Kearney", firm: "Kearney Legal Group", email: "d.kearney@kearneylaw.com", phone: "(406) 555-0202" },
  { id: 3, name: "Susan Tibbitts", firm: "Tibbitts & Wolf", email: "s.tibbitts@tibbittswolf.com", phone: "(406) 555-0303" },
  { id: 4, name: "Robert Crane", firm: "Crane Law", email: "r.crane@cranelaw.com", phone: "(406) 555-0404" },
  { id: 5, name: "Elena Vasquez", firm: "Vasquez & Partners", email: "e.vasquez@vasquezlaw.com", phone: "(406) 555-0505" },
  { id: 6, name: "Tom Whitefish", firm: "Whitefish Legal", email: "t.whitefish@whitefishleg.com", phone: "(406) 555-0606" },
  {
    id: 7,
    name: "Jack Davies",
    firm: "Davies Injury Law",
    email: "j.davies@daviesinjurylaw.com",
    phone: "(406) 555-0707",
    tier: "gold",
    practiceAreas: ["Personal Injury", "Employment Law"],
    bio: "15 years of contingency-based litigation across Montana. Specializing in personal injury, wrongful termination, and high-value civil claims.",
    winRate: "84%",
    avgCaseValue: "$48,000",
    casesWonThisMonth: 3,
    bidsThisMonth: 12,
    bidsRemaining: null // unlimited for gold
  },
  {
    id: 8,
    name: "Luke Zagar",
    firm: "Zagar Law Office",
    email: "l.zagar@zagarlaw.com",
    phone: "(406) 555-0808",
    tier: "free",
    practiceAreas: ["Credit Default / Debt Collection", "Landlord-Tenant", "Bankruptcy"],
    bio: "General practice attorney serving clients across Montana with flat-fee and hourly representation.",
    bidsThisMonth: 2,
    bidsRemaining: 1 // 3 per month for free tier
  },
];

// ─── PRACTICE AREAS ──────────────────────────────────────────
const PRACTICE_AREAS = [
  "Credit Default / Debt Collection",
  "Landlord-Tenant",
  "Family Law",
  "Criminal Defense",
  "Personal Injury",
  "Employment Law",
  "Estate Planning",
  "Real Estate",
  "Business Law",
  "Bankruptcy",
  "Immigration",
  "Other"
];

// ─── STYLES ─────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500&family=Source+Sans+3:wght@300;400;500;600&display=swap');
  :root {
    --cream: #FAFAF8; --warm-white: #FFFFFF; --sand: #E8E6E1;
    --tan: #D4C4A8; --sage: #6B7F7C; --sage-dark: #556563;
    --navy: #1E3A5F; --navy-hover: #152D4A; --charcoal: #2E2420;
    --gold: #C5A572; --gold-hover: #B38F5C;
    --muted: #6B7F7C; --danger: #C0392B; --success: #27AE60;
    --radius: 10px; --shadow: 0 2px 12px rgba(30,58,95,0.1);
    --shadow-md: 0 6px 24px rgba(30,58,95,0.15);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Source Sans 3', sans-serif; background: var(--cream); color: var(--charcoal); line-height: 1.6; min-height: 100vh; }
  h1,h2,h3,h4 { font-family: 'Cormorant Garamond', serif; }

  /* ─ NAV ─ */
  .nav { display:flex; align-items:center; justify-content:space-between; padding:16px 32px; background:var(--navy); border-bottom:1px solid var(--navy-hover); position:sticky; top:0; z-index:50; }
  .nav-logo { font-size:1.4rem; font-weight:700; color:#fff; cursor:pointer; letter-spacing:-0.5px; }
  .nav-logo span { color:var(--gold); }

  /* Hamburger button */
  .nav-hamburger { display:flex; flex-direction:column; justify-content:center; gap:5px; width:36px; height:36px; background:transparent; border:1px solid rgba(255,255,255,0.3); border-radius:8px; cursor:pointer; padding:7px 8px; transition:all 0.2s; flex-shrink:0; }
  .nav-hamburger:hover { border-color:var(--gold); background:rgba(197,165,114,0.1); }
  .nav-hamburger span { display:block; height:2px; background:#fff; border-radius:2px; transition:all 0.25s; }
  .nav-hamburger.open span:nth-child(1) { transform:translateY(7px) rotate(45deg); }
  .nav-hamburger.open span:nth-child(2) { opacity:0; }
  .nav-hamburger.open span:nth-child(3) { transform:translateY(-7px) rotate(-45deg); }

  /* Drawer overlay */
  .drawer-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:80; opacity:0; pointer-events:none; transition:opacity 0.25s; }
  .drawer-overlay.open { opacity:1; pointer-events:all; }

  /* Side drawer */
  .drawer { position:fixed; top:0; right:0; height:100%; width:280px; background:var(--navy); z-index:90; transform:translateX(100%); transition:transform 0.28s cubic-bezier(0.4,0,0.2,1); display:flex; flex-direction:column; box-shadow:-4px 0 24px rgba(0,0,0,0.3); }
  .drawer.open { transform:translateX(0); }
  .drawer-header { display:flex; align-items:center; justify-content:space-between; padding:20px 24px 16px; border-bottom:1px solid rgba(255,255,255,0.1); }
  .drawer-logo { font-size:1.2rem; font-weight:700; color:#fff; letter-spacing:-0.5px; }
  .drawer-logo span { color:var(--gold); }
  .drawer-close { background:transparent; border:none; color:rgba(255,255,255,0.6); font-size:1.4rem; cursor:pointer; padding:4px 8px; line-height:1; }
  .drawer-close:hover { color:#fff; }
  .drawer-body { flex:1; overflow-y:auto; padding:12px 0; }
  .drawer-user { padding:14px 24px 10px; font-size:0.8rem; color:var(--gold); font-weight:600; text-transform:uppercase; letter-spacing:1px; border-bottom:1px solid rgba(255,255,255,0.08); margin-bottom:8px; }
  .drawer-item { display:block; width:100%; padding:13px 24px; background:transparent; border:none; color:rgba(255,255,255,0.85); font-size:0.9rem; font-weight:400; font-family:inherit; text-align:left; cursor:pointer; transition:all 0.15s; border-left:3px solid transparent; }
  .drawer-item:hover { background:rgba(255,255,255,0.06); color:#fff; border-left-color:var(--gold); }
  .drawer-item.active { color:#fff; background:rgba(197,165,114,0.12); border-left-color:var(--gold); font-weight:600; }
  .drawer-item.primary { color:var(--gold); font-weight:600; }
  .drawer-divider { height:1px; background:rgba(255,255,255,0.08); margin:8px 24px; }
  .drawer-section-label { padding:10px 24px 4px; font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:1.4px; color:rgba(255,255,255,0.35); }
  .drawer-footer { padding:16px 24px; border-top:1px solid rgba(255,255,255,0.1); font-size:0.72rem; color:rgba(255,255,255,0.3); }

  /* Keep .nav-btn for any lingering uses but hide in logged-in state */
  .nav-btn { padding:7px 16px; border:1px solid rgba(255,255,255,0.3); border-radius:50px; background:transparent; color:#fff; font-size:0.82rem; font-weight:500; cursor:pointer; transition:all 0.2s; font-family:inherit; }
  .nav-btn:hover, .nav-btn.active { background:var(--gold); color:var(--navy); border-color:var(--gold); }
  .portal-dropdown { position:absolute; top:100%; right:0; margin-top:8px; background:#fff; border:1px solid var(--sand); border-radius:12px; box-shadow:var(--shadow-md); min-width:200px; z-index:100; }
  .portal-dropdown-item { padding:12px 20px; font-size:0.82rem; color:var(--navy); cursor:pointer; transition:all 0.2s; border-bottom:1px solid var(--sand); }
  .portal-dropdown-item:first-child { border-radius:12px 12px 0 0; }
  .portal-dropdown-item:last-child { border-bottom:none; border-radius:0 0 12px 12px; }
  .portal-dropdown-item:hover { background:var(--cream); }
  .portal-dropdown-item.primary { font-weight:600; color:var(--gold); }

  /* ─ LANDING ─ */
  .landing { max-width:900px; margin:80px auto 60px; padding:0 24px; text-align:center; }
  .landing h1 { font-size:3.2rem; font-weight:700; color:var(--navy); margin-bottom:16px; line-height:1.15; letter-spacing:-0.5px; }
  .landing h1 em { font-style:italic; color:var(--gold); font-weight:600; }
  .landing > p { color:var(--charcoal); font-size:1.15rem; max-width:680px; margin:0 auto 48px; font-weight:400; line-height:1.8; }
  .landing-cta { display:inline-block; padding:16px 48px; background:var(--navy); color:#fff; border-radius:50px; font-size:1.05rem; font-weight:600; cursor:pointer; border:none; font-family:inherit; transition:all 0.3s; box-shadow:0 6px 24px rgba(30,58,95,0.3); }
  .landing-cta:hover { background:var(--navy-hover); transform:translateY(-3px); box-shadow:0 8px 32px rgba(30,58,95,0.4); }

  /* ─ CHAT INTERFACE ─ */
  .chat-page { max-width:780px; margin:40px auto; padding:0 24px; display:flex; flex-direction:column; height:calc(100vh - 200px); }
  .chat-header { text-align:center; margin-bottom:24px; }
  .chat-header h2 { font-size:1.9rem; color:var(--navy); margin-bottom:6px; }
  .chat-header p { font-size:0.88rem; color:var(--charcoal); }
  .chat-messages { flex:1; overflow-y:auto; background:#fff; border:1px solid var(--sand); border-radius:14px; padding:24px; margin-bottom:16px; display:flex; flex-direction:column; gap:16px; }
  .message { display:flex; gap:12px; max-width:85%; animation:fadeIn 0.3s ease; }
  .message.assistant { align-self:flex-start; }
  .message.user { align-self:flex-end; flex-direction:row-reverse; }
  .message-avatar { width:36px; height:36px; border-radius:50%; background:var(--sage); color:#fff; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:600; flex-shrink:0; }
  .message.user .message-avatar { background:var(--gold); }
  .message-bubble { background:var(--cream); padding:12px 16px; border-radius:14px; font-size:0.88rem; line-height:1.7; color:var(--charcoal); white-space:pre-wrap; }
  .message.user .message-bubble { background:var(--navy); color:#fff; }
  .message-bubble strong { color:var(--gold); }
  .message.user .message-bubble strong { color:var(--gold); }
  .typing-indicator { display:flex; gap:4px; padding:8px; }
  .typing-indicator span { width:8px; height:8px; border-radius:50%; background:var(--muted); animation:typing 1.4s infinite; }
  .typing-indicator span:nth-child(2) { animation-delay:0.2s; }
  .typing-indicator span:nth-child(3) { animation-delay:0.4s; }
  @keyframes typing { 0%, 60%, 100% { opacity:0.3; } 30% { opacity:1; } }
  @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  .chat-input-wrapper { display:flex; gap:12px; }
  .chat-input { flex:1; padding:12px 18px; border:1.5px solid var(--sand); border-radius:50px; font-family:inherit; font-size:0.9rem; outline:none; transition:all 0.2s; }
  .chat-input:focus { border-color:var(--gold); box-shadow:0 0 0 3px rgba(197,165,114,0.12); }
  .chat-send { padding:12px 28px; background:var(--navy); color:#fff; border:none; border-radius:50px; font-size:0.88rem; font-weight:500; cursor:pointer; font-family:inherit; transition:all 0.2s; }
  .chat-send:hover:not(:disabled) { background:var(--navy-hover); }
  .chat-send:disabled { background:var(--tan); cursor:not-allowed; }

  /* ─ CASE SUMMARY ─ */
  .summary-page { max-width:780px; margin:40px auto; padding:0 24px; }
  .summary-page h2 { font-size:2rem; color:var(--navy); margin-bottom:4px; text-align:center; }
  .summary-page > p { text-align:center; color:var(--charcoal); font-size:0.88rem; margin-bottom:28px; }
  .summary-card { background:#fff; border:1px solid var(--sand); border-radius:14px; overflow:hidden; box-shadow:var(--shadow); margin-bottom:24px; }
  .summary-header { background:var(--navy); color:#fff; padding:20px 28px; }
  .summary-header h3 { font-size:1.3rem; font-weight:500; }
  .summary-body { padding:28px; }
  .summary-section { margin-bottom:20px; }
  .summary-section:last-child { margin-bottom:0; }
  .summary-section h4 { font-size:0.75rem; font-weight:600; text-transform:uppercase; letter-spacing:1.2px; color:var(--gold); margin-bottom:10px; border-bottom:1px solid var(--sand); padding-bottom:6px; }
  .summary-row { padding:6px 0; font-size:0.85rem; }
  .summary-actions { text-align:center; }
  .btn { padding:12px 32px; border-radius:50px; font-size:0.88rem; font-weight:500; cursor:pointer; border:none; font-family:inherit; transition:all 0.2s; }
  .btn-primary { background:var(--navy); color:#fff; }
  .btn-primary:hover { background:var(--navy-hover); box-shadow:0 2px 8px rgba(30,58,95,0.2); }
  .btn-secondary { background:transparent; color:var(--navy); border:1.5px solid var(--sand); }
  .btn-secondary:hover { border-color:var(--navy); }

  /* ─ ATTORNEY PARTNERS DASHBOARD ─ */
  .dashboard { max-width:1100px; margin:40px auto; padding:0 24px; }
  .dashboard h2 { font-size:2rem; color:var(--navy); margin-bottom:4px; }
  .dashboard > p { color:var(--charcoal); font-size:0.88rem; margin-bottom:24px; }
  .case-grid { display:grid; gap:20px; }
  .case-card { background:#fff; border:1px solid var(--sand); border-radius:12px; padding:24px; box-shadow:var(--shadow); transition:box-shadow 0.2s; }
  .case-card:hover { box-shadow:var(--shadow-md); }
  .case-header { display:flex; justify-content:space-between; align-items:start; margin-bottom:16px; }
  .case-id { font-size:0.75rem; font-weight:600; color:var(--gold); text-transform:uppercase; letter-spacing:1px; }
  .case-status { font-size:0.7rem; padding:4px 12px; border-radius:50px; font-weight:600; text-transform:uppercase; letter-spacing:0.8px; }
  .status-open { background:#E8F5E9; color:#2E7D32; }
  .status-pending { background:#FFF3E0; color:#E65100; }
  .status-bidding { background:#E3F2FD; color:#1565C0; }
  .status-closed { background:#F5F5F5; color:#757575; }
  .case-summary { font-size:0.88rem; color:var(--charcoal); line-height:1.7; margin-bottom:16px; white-space:pre-wrap; }
  .bid-section { border-top:1px solid var(--sand); padding-top:16px; margin-top:16px; }
  .bid-form { display:grid; gap:12px; }
  .bid-form input, .bid-form textarea { width:100%; padding:10px 14px; border:1.5px solid var(--sand); border-radius:8px; font-family:inherit; font-size:0.85rem; outline:none; }
  .bid-form input:focus, .bid-form textarea:focus { border-color:var(--gold); }
  .bid-form textarea { resize:vertical; min-height:80px; }
  .bid-form button { justify-self:start; }
  .bids-list { margin-top:16px; }
  .bid-item { background:var(--cream); padding:12px 16px; border-radius:8px; margin-bottom:10px; font-size:0.82rem; }
  .bid-item:last-child { margin-bottom:0; }
  .bid-attorney { font-weight:600; color:var(--navy); margin-bottom:4px; }
  .bid-details { color:var(--muted); line-height:1.6; }

  /* ─ MODAL ─ */
  .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:100; display:flex; align-items:center; justify-content:center; padding:24px; }
  .modal { background:#fff; border-radius:14px; max-width:420px; width:100%; padding:28px; position:relative; }
  .modal-close { position:absolute; top:12px; right:16px; background:none; border:none; font-size:1.4rem; cursor:pointer; color:var(--muted); }
  .modal h3 { font-size:1.2rem; color:var(--navy); margin-bottom:12px; }
  .modal p { font-size:0.85rem; color:var(--charcoal); margin-bottom:20px; line-height:1.6; }
  .form-group { margin-bottom:16px; }
  .form-group label { display:block; font-size:0.82rem; font-weight:600; color:var(--navy); margin-bottom:7px; }
  .form-group input { width:100%; padding:11px 14px; border:1.5px solid var(--sand); border-radius:8px; font-family:inherit; font-size:0.9rem; outline:none; }
  .form-group input:focus { border-color:var(--gold); box-shadow:0 0 0 3px rgba(197,165,114,0.12); }
  .modal code { background:var(--sand); padding:2px 6px; border-radius:4px; font-size:0.72rem; color:var(--navy); }

  /* ─ ABOUT ─ */
  .about-page { max-width:780px; margin:60px auto; padding:0 24px; }
  .about-page h2 { font-size:2rem; color:var(--navy); margin-bottom:8px; text-align:center; }
  .about-page > p { text-align:center; color:var(--charcoal); margin-bottom:40px; font-size:0.88rem; }
  .about-block { background:#fff; border:1px solid var(--sand); border-radius:14px; padding:32px; margin-bottom:20px; }
  .about-block h3 { font-size:1.3rem; color:var(--navy); margin-bottom:10px; }
  .about-block p { font-size:0.88rem; color:var(--charcoal); line-height:1.8; }
  .disclaimer { background:#FFF8F0; border:1px solid #F0D5B8; border-radius:var(--radius); padding:14px 20px; margin-bottom:24px; font-size:0.8rem; color:var(--navy); line-height:1.5; }
  .disclaimer strong { color:var(--gold); }

  /* ─ CLIENT DASHBOARD TABS ─ */
  .portal-tabs { display:flex; gap:0; border-bottom:1px solid var(--sand); margin-bottom:24px; }
  .portal-tab { padding:10px 20px; font-size:0.83rem; font-weight:600; color:var(--muted); background:transparent; border:none; border-bottom:2px solid transparent; cursor:pointer; font-family:inherit; transition:all 0.15s; }
  .portal-tab.active { color:var(--navy); border-bottom-color:var(--navy); }
  .portal-tab-count { display:inline-block; background:var(--sand); color:var(--charcoal); font-size:0.68rem; font-weight:700; border-radius:50px; padding:1px 7px; margin-left:6px; }
  .portal-tab.active .portal-tab-count { background:var(--navy); color:#fff; }

  /* ─ CASE TIMELINE ─ */
  .case-timeline { display:flex; align-items:flex-start; gap:0; margin-bottom:16px; }
  .timeline-step { display:flex; flex-direction:column; align-items:center; flex:1; position:relative; }
  .timeline-step:not(:last-child)::after { content:''; position:absolute; top:11px; left:50%; width:100%; height:2px; background:var(--sand); z-index:0; }
  .timeline-step.done:not(:last-child)::after { background:var(--success); }
  .timeline-dot { width:22px; height:22px; border-radius:50%; border:2px solid var(--sand); background:#fff; z-index:1; display:flex; align-items:center; justify-content:center; font-size:0.6rem; font-weight:700; color:var(--muted); }
  .timeline-step.done .timeline-dot { background:var(--success); border-color:var(--success); color:#fff; }
  .timeline-step.current .timeline-dot { background:var(--navy); border-color:var(--navy); color:#fff; }
  .timeline-label { font-size:0.62rem; color:var(--muted); margin-top:5px; text-align:center; font-weight:500; white-space:nowrap; }
  .timeline-step.done .timeline-label { color:var(--success); }
  .timeline-step.current .timeline-label { color:var(--navy); font-weight:700; }

  /* ─ MESSAGE THREAD ─ */
  .msg-thread { background:var(--cream); border-radius:10px; padding:16px; margin-top:12px; }
  .msg-thread-header { font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:var(--muted); margin-bottom:12px; }
  .msg-bubble-wrap { display:flex; flex-direction:column; gap:10px; max-height:240px; overflow-y:auto; margin-bottom:12px; }
  .msg-bubble { max-width:80%; padding:10px 14px; border-radius:12px; font-size:0.83rem; line-height:1.6; }
  .msg-bubble.client { align-self:flex-end; background:var(--navy); color:#fff; border-radius:12px 12px 2px 12px; }
  .msg-bubble.attorney { align-self:flex-start; background:#fff; border:1px solid var(--sand); color:var(--charcoal); border-radius:12px 12px 12px 2px; }
  .msg-bubble-meta { font-size:0.68rem; color:var(--muted); margin-top:3px; }
  .msg-bubble.client .msg-bubble-meta { text-align:right; color:rgba(255,255,255,0.6); }
  .msg-input-row { display:flex; gap:8px; }
  .msg-input-row input { flex:1; padding:9px 14px; border:1.5px solid var(--sand); border-radius:50px; font-family:inherit; font-size:0.85rem; outline:none; }
  .msg-input-row input:focus { border-color:var(--navy); }
  .msg-send-btn { padding:9px 18px; background:var(--navy); color:#fff; border:none; border-radius:50px; font-size:0.82rem; font-weight:500; cursor:pointer; font-family:inherit; }

  /* ─ ATTORNEY PROFILE ─ */
  .profile-page { max-width:700px; margin:40px auto; padding:0 24px; }
  .profile-header { background:var(--navy); border-radius:14px 14px 0 0; padding:32px 36px; color:#fff; }
  .profile-name { font-size:1.8rem; font-weight:600; font-family:'Cormorant Garamond',serif; margin-bottom:4px; }
  .profile-firm { font-size:0.9rem; color:rgba(255,255,255,0.7); margin-bottom:16px; }
  .profile-badges { display:flex; gap:8px; flex-wrap:wrap; }
  .profile-badge { font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; padding:3px 10px; border-radius:50px; border:1px solid rgba(255,255,255,0.3); color:rgba(255,255,255,0.85); }
  .profile-badge.gold { background:rgba(197,165,114,0.25); border-color:var(--gold); color:var(--gold); }
  .profile-body { background:#fff; border:1px solid var(--sand); border-top:none; border-radius:0 0 14px 14px; padding:28px 36px; }
  .profile-stat-row { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:24px; }
  .profile-stat { text-align:center; padding:16px 12px; background:var(--cream); border-radius:10px; }
  .profile-stat-val { font-size:1.4rem; font-family:'Cormorant Garamond',serif; font-weight:600; color:var(--navy); }
  .profile-stat-lbl { font-size:0.68rem; text-transform:uppercase; letter-spacing:1px; color:var(--muted); margin-top:2px; }
  .profile-section { margin-bottom:20px; }
  .profile-section h4 { font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:1.2px; color:var(--gold); margin-bottom:8px; border-bottom:1px solid var(--sand); padding-bottom:6px; }
  .profile-section p { font-size:0.87rem; color:var(--charcoal); line-height:1.75; }
  .profile-areas { display:flex; flex-wrap:wrap; gap:6px; }
  .profile-area-tag { font-size:0.75rem; padding:4px 12px; border-radius:50px; background:var(--cream); border:1px solid var(--sand); color:var(--charcoal); }

  /* ─ EDIT PROFILE ─ */
  .edit-profile-panel { background:#fff; border:1px solid var(--sand); border-radius:12px; padding:24px; margin-bottom:24px; box-shadow:var(--shadow); }
  .edit-profile-panel h3 { font-size:1.1rem; color:var(--navy); margin-bottom:16px; padding-bottom:10px; border-bottom:1px solid var(--sand); }

  /* ─ FREE TIER BANNER ─ */
  .free-tier-banner { background:linear-gradient(135deg,rgba(197,165,114,0.12),rgba(197,165,114,0.06)); border:1.5px solid rgba(197,165,114,0.4); border-radius:12px; padding:16px 24px; margin-bottom:28px; display:flex; align-items:center; gap:14px; }
  .free-tier-banner-icon { font-size:1.5rem; flex-shrink:0; }
  .free-tier-banner h4 { font-size:1rem; color:var(--navy); margin-bottom:4px; font-family:'Cormorant Garamond',serif; }
  .free-tier-banner p { font-size:0.82rem; color:var(--charcoal); line-height:1.5; margin:0; }

  /* ─ CAREERS / CONTACT ─ */
  .static-page { max-width:780px; margin:60px auto; padding:0 24px; }
  .static-page h2 { font-size:2rem; color:var(--navy); margin-bottom:8px; text-align:center; }
  .static-page > p { text-align:center; color:var(--charcoal); margin-bottom:40px; font-size:0.88rem; }
  .contact-form { background:#fff; border:1px solid var(--sand); border-radius:14px; padding:32px; }
  .contact-form textarea { width:100%; padding:12px 14px; border:1.5px solid var(--sand); border-radius:8px; font-family:inherit; font-size:0.88rem; resize:vertical; min-height:120px; outline:none; }
  .contact-form textarea:focus { border-color:var(--gold); box-shadow:0 0 0 3px rgba(197,165,114,0.12); }

  /* ─ ADMIN COMMAND CENTER ─ */
  .admin-page { max-width:1100px; margin:40px auto; padding:0 24px; }
  .admin-page h2 { font-size:2rem; color:var(--navy); margin-bottom:4px; }
  .admin-kpi-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(170px,1fr)); gap:16px; margin-bottom:32px; }
  .admin-kpi { background:#fff; border:1px solid var(--sand); border-radius:12px; padding:20px 22px; box-shadow:var(--shadow); }
  .admin-kpi-label { font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:1.2px; color:var(--muted); margin-bottom:6px; }
  .admin-kpi-value { font-size:2rem; font-family:'Cormorant Garamond',serif; font-weight:600; color:var(--navy); line-height:1; }
  .admin-kpi-sub { font-size:0.72rem; color:var(--muted); margin-top:4px; }
  .admin-section { background:#fff; border:1px solid var(--sand); border-radius:12px; padding:24px; margin-bottom:24px; box-shadow:var(--shadow); }
  .admin-section h3 { font-size:1.2rem; color:var(--navy); margin-bottom:16px; padding-bottom:10px; border-bottom:1px solid var(--sand); }
  .admin-tabs { display:flex; gap:0; margin-bottom:16px; border-bottom:1px solid var(--sand); }
  .admin-tab { padding:8px 18px; font-size:0.78rem; font-weight:600; color:var(--muted); background:transparent; border:none; border-bottom:2px solid transparent; cursor:pointer; font-family:inherit; transition:all 0.15s; }
  .admin-tab.active { color:var(--navy); border-bottom-color:var(--navy); }
  .admin-msg-card { background:var(--cream); border-radius:8px; padding:14px 18px; margin-bottom:10px; font-size:0.82rem; }
  .admin-msg-card:last-child { margin-bottom:0; }
  .admin-msg-meta { font-size:0.72rem; color:var(--muted); margin-bottom:6px; }
  .admin-msg-body { color:var(--charcoal); line-height:1.6; white-space:pre-wrap; }
  .clicks-table { width:100%; border-collapse:collapse; font-size:0.8rem; }
  .clicks-table th { padding:8px 12px; text-align:left; font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:var(--navy); background:var(--cream); border-bottom:1px solid var(--sand); }
  .clicks-table td { padding:8px 12px; border-bottom:1px solid var(--sand); color:var(--charcoal); }

  /* ─ SERVICES ─ */
  .services-page { max-width:900px; margin:60px auto; padding:0 24px; }
  .services-page h2 { font-size:2rem; color:var(--navy); margin-bottom:4px; text-align:center; }
  .services-page > p { text-align:center; color:var(--charcoal); margin-bottom:32px; font-size:0.88rem; }
  .services-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:16px; }
  .service-card { background:#fff; border:1.5px dashed var(--tan); border-radius:12px; padding:28px 20px; text-align:center; position:relative; }
  .service-card .placeholder-tag { position:absolute; top:-10px; left:50%; transform:translateX(-50%); font-size:0.62rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#fff; background:var(--sage); padding:2px 10px; border-radius:50px; white-space:nowrap; }
  .service-card .svc-icon { font-size:0.65rem; font-weight:700; letter-spacing:0.8px; text-transform:uppercase; color:var(--sage); background:rgba(107,127,124,0.1); display:inline-block; padding:4px 12px; border-radius:50px; margin-bottom:14px; }
  .service-card h4 { font-size:1rem; color:var(--navy); margin-bottom:6px; }
  .service-card p { font-size:0.78rem; color:var(--charcoal); line-height:1.6; }
  .service-card .future-note { margin-top:12px; font-size:0.68rem; color:var(--gold); font-style:italic; }

  /* ─ DOCUMENT PREVIEW ─ */
  .document-preview { background:#fff; border:1px solid var(--sand); border-radius:8px; padding:40px; max-height:500px; overflow-y:auto; font-family:monospace; font-size:0.75rem; line-height:1.6; white-space:pre-wrap; margin-bottom:24px; }

  /* ─ TWO-COLUMN LAYOUT FOR ENTRY METHODS ─ */
  .entry-methods { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:24px; }
  .entry-method { background:#fff; border:1px solid var(--sand); border-radius:12px; padding:32px; text-align:center; cursor:pointer; transition:all 0.2s; }
  .entry-method:hover { box-shadow:var(--shadow-md); border-color:var(--gold); }
  .entry-method-icon { font-size:2.5rem; margin-bottom:16px; }
  .entry-method h3 { font-size:1.2rem; color:var(--navy); margin-bottom:8px; }
  .entry-method p { font-size:0.85rem; color:var(--charcoal); line-height:1.6; }

  @media(max-width:768px) {
    .nav { padding:12px 20px; flex-wrap:wrap; }
    .chat-page { height:calc(100vh - 250px); }
    .entry-methods { grid-template-columns:1fr; }
  }
`;

// ─── AI INTAKE CHAT COMPONENT ───────────────────────────────
function ChatIntake({ onComplete, onBack, userName }) {
  const initialMessage = userName 
    ? `Hi ${userName}! I'm here to help you connect with the right Montana attorney. Can you tell me what's going on? Please describe your legal situation in as much detail as you're comfortable sharing.`
    : "Hi! I'm here to help connect you with the right Montana attorney for your legal issue. Can you tell me what's going on? Please describe your situation in as much detail as you're comfortable sharing.";

  const [messages, setMessages] = useState([
    { role: "assistant", content: initialMessage }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      // Build conversation history for API
      const apiMessages = [...messages, { role: "user", content: userMessage }].map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Request failed (${response.status})`);
      }

      const data = await response.json();
      let assistantReply = (data.text || "").trim();
      
      // Strip markdown code blocks if present
      assistantReply = assistantReply.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

      // Try to extract JSON if present
      const firstBrace = assistantReply.indexOf("{");
      const lastBrace = assistantReply.lastIndexOf("}");
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const potentialJSON = assistantReply.substring(firstBrace, lastBrace + 1);
        
        try {
          const parsed = JSON.parse(potentialJSON);
          
          if (parsed.ready) {
            onComplete(parsed);
            return;
          }
        } catch (e) {
          // Not valid JSON, continue as normal message
        }
      }

      setMessages(prev => [...prev, { role: "assistant", content: assistantReply }]);
    } catch (error) {
      console.error("Error:", error);
      
      let userMessage = "I'm having a bit of trouble understanding. Could you rephrase that for me?";
      
      if (error.message.includes("fetch")) {
        userMessage = "I'm having trouble connecting right now. Please try again in a moment.";
      }
      
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: userMessage
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-page">
      <div className="chat-header">
        <h2>Tell Us About Your Situation</h2>
        <p>Montana Legal Help • Describe your issue and we'll connect you with the right attorney</p>
      </div>

      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="message-avatar">{msg.role === "assistant" ? "W" : "You"}</div>
            <div className="message-bubble">{msg.content}</div>
          </div>
        ))}
        {loading && (
          <div className="message assistant">
            <div className="message-avatar">W</div>
            <div className="message-bubble">
              <div className="typing-indicator"><span></span><span></span><span></span></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-wrapper">
        <input
          type="text"
          className="chat-input"
          placeholder="Type your message here..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => e.key === "Enter" && sendMessage()}
          disabled={loading}
        />
        <button className="chat-send" onClick={sendMessage} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>

      <div style={{ textAlign: "center", marginTop: "16px" }}>
        <button className="btn btn-secondary" onClick={onBack}>Back to Home</button>
      </div>
    </div>
  );
}

// ─── CASE SUMMARY & CONFIRMATION ────────────────────────────
function CaseSummary({ caseData, onBack, onConfirm }) {
  return (
    <div className="summary-page">
      <h2>Let's Make Sure We Got Everything Right</h2>
      <p>Here's what we understand about your situation. Does this look accurate?</p>

      <div className="summary-card">
        <div className="summary-header">
          <h3>Your Legal Issue</h3>
        </div>
        <div className="summary-body">
          <div className="summary-section">
            <h4>Summary</h4>
            <div className="summary-row">{caseData.summary}</div>
          </div>
          <div className="summary-section">
            <h4>Location & Category</h4>
            <div className="summary-row">
              <strong>County:</strong> {caseData.county}<br />
              <strong>Type:</strong> {caseData.category}
            </div>
          </div>
        </div>
      </div>

      <div className="summary-actions">
        <button className="btn btn-secondary" onClick={onBack} style={{ marginRight: "12px" }}>
          No, let me clarify
        </button>
        <button className="btn btn-primary" onClick={onConfirm}>
          Yes, submit my case to attorneys
        </button>
      </div>
    </div>
  );
}

// ─── ACCOUNT CREATION ───────────────────────────────────────
function AccountCreation({ onComplete, onBack, contextMessage }) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastInitial: "",
    phone: "",
    email: "",
    password: ""
  });

  const handleSubmit = () => {
    if (!formData.firstName || !formData.lastInitial || !formData.phone || !formData.email || !formData.password) {
      alert("Please fill out all fields");
      return;
    }
    if (formData.password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }
    onComplete(formData);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="summary-page">
      <h2>Create Your Account</h2>
      <p>{contextMessage || "Set up your WALT account to submit claims and receive attorney bids."}</p>

      <div className="summary-card">
        <div className="summary-body" style={{ padding: "32px" }}>
          <div>
            <div className="form-group">
              <label>First Name</label>
              <input 
                type="text" 
                placeholder="e.g., Sarah"
                value={formData.firstName}
                onChange={e => setFormData({...formData, firstName: e.target.value})}
                onKeyPress={handleKeyPress}
                required
              />
            </div>
            <div className="form-group">
              <label>Last Initial</label>
              <input 
                type="text" 
                maxLength="1"
                placeholder="e.g., M"
                value={formData.lastInitial}
                onChange={e => setFormData({...formData, lastInitial: e.target.value.toUpperCase()})}
                onKeyPress={handleKeyPress}
                required
              />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input 
                type="tel" 
                placeholder="(406) 555-1234"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                onKeyPress={handleKeyPress}
                required
              />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input 
                type="email" 
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                onKeyPress={handleKeyPress}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                onKeyPress={handleKeyPress}
                required
                minLength="6"
              />
            </div>
            <div className="summary-actions" style={{ marginTop: "24px" }}>
              <button className="btn btn-secondary" onClick={onBack} style={{ marginRight: "12px" }}>
                Back
              </button>
              <button className="btn btn-primary" onClick={handleSubmit}>
                Create Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ATTORNEY SIGNUP ─────────────────────────────────────────────────────────
function AttorneySignup({ onComplete, onBack }) {
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    barNumber: "",
    firm: "",
    email: "",
    phone: "",
    password: "",
    practiceAreas: []
  });

  const handlePracticeAreaToggle = (area) => {
    setFormData(prev => ({
      ...prev,
      practiceAreas: prev.practiceAreas.includes(area)
        ? prev.practiceAreas.filter(a => a !== area)
        : [...prev.practiceAreas, area]
    }));
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.username || !formData.barNumber || !formData.email || !formData.phone || !formData.password) {
      alert("Please fill out all required fields");
      return;
    }

    if (!/^[a-zA-Z0-9._-]{3,30}$/.test(formData.username)) {
      alert("Username must be 3–30 characters and may only contain letters, numbers, periods, underscores, or hyphens.");
      return;
    }
    
    if (formData.password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }
    
    if (formData.practiceAreas.length === 0) {
      alert("Please select at least one practice area");
      return;
    }
    
    if (!/^\d{4,6}$/.test(formData.barNumber)) {
      alert("Please enter a valid Montana Bar Number (4-6 digits)");
      return;
    }
    
    onComplete(formData);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="summary-page">
      <h2>Join WALT Attorney Network</h2>
      <p>Register to access new clients and grow your Montana practice</p>

      <div className="free-tier-banner">
        <div className="free-tier-banner-icon" style={{ fontSize: "1.2rem", color: "var(--gold)", fontWeight: 700 }}>★</div>
        <div>
          <h4>Free Subscription — No Credit Card Required</h4>
          <p>Every attorney who joins WALT during our launch period receives a <strong>free subscription</strong> with full access to the platform. Bid on cases, connect with clients, and grow your practice at no cost while we build Montana's legal marketplace together.</p>
        </div>
      </div>

      <div className="summary-card">
        <div className="summary-body" style={{ padding: "32px" }}>
          <div>
            <div className="form-group">
              <label>Full Name *</label>
              <input 
                type="text" 
                placeholder="e.g., Sarah Martinez"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                onKeyPress={handleKeyPress}
                required
              />
            </div>

            <div className="form-group">
              <label>Username *</label>
              <input 
                type="text" 
                placeholder="e.g., s.martinez"
                value={formData.username}
                onChange={e => setFormData({...formData, username: e.target.value.toLowerCase()})}
                onKeyPress={handleKeyPress}
                required
              />
              <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "4px" }}>
                3–30 characters. Letters, numbers, periods, underscores, and hyphens only. You'll use this to log in.
              </p>
            </div>
            
            <div className="form-group">
              <label>Montana State Bar Number *</label>
              <input 
                type="text" 
                placeholder="e.g., 12345"
                value={formData.barNumber}
                onChange={e => setFormData({...formData, barNumber: e.target.value})}
                onKeyPress={handleKeyPress}
                required
              />
              <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "4px" }}>
                Enter your Montana State Bar Number (4-6 digits)
              </p>
            </div>
            
            <div className="form-group">
              <label>Law Firm or Practice Name</label>
              <input 
                type="text" 
                placeholder="e.g., Martinez Law Office (optional)"
                value={formData.firm}
                onChange={e => setFormData({...formData, firm: e.target.value})}
                onKeyPress={handleKeyPress}
              />
            </div>
            
            <div className="form-group">
              <label>Email Address *</label>
              <input 
                type="email" 
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                onKeyPress={handleKeyPress}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Phone Number *</label>
              <input 
                type="tel" 
                placeholder="(406) 555-1234"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                onKeyPress={handleKeyPress}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Password *</label>
              <input 
                type="password" 
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                onKeyPress={handleKeyPress}
                required
                minLength="6"
              />
            </div>
            
            <div className="form-group">
              <label>Practice Areas * (Select all that apply)</label>
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", 
                gap: "10px", 
                marginTop: "12px" 
              }}>
                {PRACTICE_AREAS.map(area => (
                  <label 
                    key={area} 
                    style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "flex-start",
                      gap: "10px", 
                      padding: "10px 14px",
                      border: `1.5px solid ${formData.practiceAreas.includes(area) ? "var(--gold)" : "var(--sand)"}`,
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      background: formData.practiceAreas.includes(area) ? "rgba(197,165,114,0.1)" : "transparent"
                    }}
                  >
                    <input 
                      type="checkbox"
                      checked={formData.practiceAreas.includes(area)}
                      onChange={() => handlePracticeAreaToggle(area)}
                      style={{ 
                        cursor: "pointer",
                        margin: 0,
                        width: "16px",
                        height: "16px"
                      }}
                    />
                    <span style={{ 
                      fontSize: "0.85rem",
                      lineHeight: "1.2"
                    }}>{area}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="summary-actions" style={{ marginTop: "24px" }}>
              <button className="btn btn-secondary" onClick={onBack} style={{ marginRight: "12px" }}>
                Back
              </button>
              <button className="btn btn-primary" onClick={handleSubmit}>
                Submit Application
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div style={{ marginTop: "16px", textAlign: "center", fontSize: "0.82rem", color: "var(--muted)" }}>
        Already registered? <span style={{ color: "var(--gold)", cursor: "pointer", textDecoration: "underline" }} onClick={() => onBack()}>Login here</span>
      </div>
    </div>
  );
}

// ─── CLIENT PORTAL ──────────────────────────────────────────
function ClientPortal({ clientData, cases, onLogout, onStartNewClaim, savedDocuments, onSelectAttorney, onViewProfile }) {
  const [activeTab, setActiveTab] = useState("active");
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [selectedBid, setSelectedBid] = useState(null);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [messages, setMessages] = useState({}); // { caseId: [{sender,text,ts}] }
  const [msgInputs, setMsgInputs] = useState({}); // { caseId: string }
  const msgsFetched = useRef(false); // prevent double-fetch in strict mode

  const clientCases = cases.filter(c => c.clientEmail === clientData.email);
  const clientDocs = savedDocuments?.filter(d => d.clientEmail === clientData.email) || [];
  const activeCases = clientCases.filter(c => !c.selectedAttorney);
  const closedCases = clientCases.filter(c => c.selectedAttorney);

  // ── Load persisted messages from KV once on mount ─────────
  useEffect(() => {
    if (msgsFetched.current) return;
    msgsFetched.current = true;
    const caseIds = cases.filter(c => c.clientEmail === clientData.email).map(c => c.id);
    if (caseIds.length === 0) return;
    fetch("/api/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get-messages", caseIds })
    })
      .then(r => r.json())
      .then(data => { if (data.messages) setMessages(data.messages); })
      .catch(e => console.error("Failed to load messages:", e));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownloadDocument = (doc) => {
    const blob = new Blob([doc.documentText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.type.replace(/\s+/g, "_")}_${doc.caseNumber || "Document"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSelectClick = (caseId, bid) => {
    setSelectedCaseId(caseId);
    setSelectedBid(bid);
    setShowSelectionModal(true);
  };

  const confirmSelection = () => {
    onSelectAttorney(selectedCaseId, selectedBid);
    setShowSelectionModal(false);
    setSelectedBid(null);
    setSelectedCaseId(null);
    setActiveTab("closed");
  };

  const sendMessage = async (caseId) => {
    const text = (msgInputs[caseId] || "").trim();
    if (!text) return;
    const newMsg = { sender: "client", text, ts: new Date().toISOString() };

    // Optimistic local update
    setMessages(prev => ({
      ...prev,
      [caseId]: [...(prev[caseId] || []), newMsg]
    }));
    setMsgInputs(prev => ({ ...prev, [caseId]: "" }));

    // Persist to KV
    try {
      await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send-message", caseId, message: newMsg })
      });
    } catch (e) {
      console.error("Failed to persist message:", e);
    }
  };

  // Case timeline helper
  const getTimelineSteps = (c) => {
    const hasBids = c.bids?.length > 0;
    const hasSelection = !!c.selectedAttorney;
    return [
      { label: "Submitted", done: true, current: false },
      { label: "Awaiting Bids", done: hasBids || hasSelection, current: !hasBids && !hasSelection },
      { label: "Bids Received", done: hasSelection, current: hasBids && !hasSelection },
      { label: "Attorney Selected", done: hasSelection, current: false },
    ];
  };

  const renderCaseCard = (c) => {
    const hasBids = c.bids && c.bids.length > 0;
    const hasSelection = !!c.selectedAttorney;
    const steps = getTimelineSteps(c);

    return (
      <div className="case-card" key={c.id}>
        <div className="case-header">
          <div className="case-id">Case {c.id}</div>
          <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
            {new Date(c.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>
        </div>

        {/* Timeline */}
        <div className="case-timeline">
          {steps.map((s, i) => (
            <div key={i} className={`timeline-step ${s.done ? "done" : ""} ${s.current ? "current" : ""}`}>
              <div className="timeline-dot">{s.done ? "✓" : i + 1}</div>
              <div className="timeline-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="case-summary">
          <strong>{c.category}</strong> · {c.county} County
          <br /><br />
          {c.summary}
        </div>

        {/* Attorney selected — contact info + messaging */}
        {hasSelection && (
          <div style={{ background: "#E8F5E9", border: "1px solid #4CAF50", borderRadius: "8px", padding: "16px", marginTop: "16px" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#2E7D32", marginBottom: "8px" }}>
              Attorney Selected
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--charcoal)", marginBottom: "10px" }}>
              <strong>{c.selectedAttorney.attorney}</strong> · {c.selectedAttorney.firm}<br />
              Phone: {c.selectedAttorney.phone} · Email: {c.selectedAttorney.email}
            </div>
            <button
              onClick={() => onViewProfile(c.selectedAttorney.email)}
              style={{ fontSize: "0.75rem", color: "var(--navy)", background: "transparent", border: "1px solid rgba(30,58,95,0.3)", borderRadius: "50px", padding: "4px 12px", cursor: "pointer", fontFamily: "inherit", marginBottom: "12px" }}
            >
              View Attorney Profile
            </button>
            {/* Message thread */}
            <div className="msg-thread">
              <div className="msg-thread-header">Messages with {c.selectedAttorney.attorney.split(" ")[0]}</div>
              <div className="msg-bubble-wrap">
                {(messages[c.id] || []).length === 0 && (
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)", fontStyle: "italic", textAlign: "center", padding: "12px 0" }}>
                    No messages yet. Say hello!
                  </div>
                )}
                {(messages[c.id] || []).map((m, i) => (
                  <div key={i}>
                    <div className={`msg-bubble ${m.sender}`}>{m.text}</div>
                    <div className="msg-bubble-meta">
                      {m.sender === "client" ? "You" : c.selectedAttorney.attorney.split(" ")[0]} · {new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="msg-input-row">
                <input
                  type="text"
                  placeholder="Send a message..."
                  value={msgInputs[c.id] || ""}
                  onChange={e => setMsgInputs(prev => ({ ...prev, [c.id]: e.target.value }))}
                  onKeyPress={e => e.key === "Enter" && sendMessage(c.id)}
                />
                <button className="msg-send-btn" onClick={() => sendMessage(c.id)}>Send</button>
              </div>
            </div>
          </div>
        )}

        {/* Bids list */}
        {hasBids && !hasSelection && (
          <div className="bid-section">
            <h4 style={{ fontSize: "0.85rem", color: "var(--navy)", marginBottom: "12px" }}>
              Attorney Bids ({c.bids.length})
            </h4>
            <div className="bids-list">
              {c.bids.map((bid, i) => (
                <div className="bid-item" key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div className="bid-attorney">{bid.attorney} · {bid.firm}</div>
                    <button
                      onClick={() => onViewProfile(bid.email)}
                      style={{ fontSize: "0.72rem", color: "var(--navy)", background: "transparent", border: "1px solid rgba(30,58,95,0.25)", borderRadius: "50px", padding: "3px 10px", cursor: "pointer", fontFamily: "inherit", flexShrink: 0, marginLeft: "8px" }}
                    >
                      View Profile
                    </button>
                  </div>
                  <div className="bid-details">
                    <strong>Rate:</strong> {bid.rate}<br />
                    <strong>Timeline:</strong> {bid.timeline}<br />
                    <strong>Message:</strong> {bid.pitch}
                  </div>
                  <div style={{ marginTop: "8px" }}>
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: "0.8rem", padding: "6px 16px" }}
                      onClick={() => handleSelectClick(c.id, bid)}
                    >
                      Select This Attorney
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!hasBids && !hasSelection && (
          <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: "12px", fontStyle: "italic" }}>
            Your case has been sent to our attorney network. You'll be notified when bids come in.
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="dashboard">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h2>Welcome, {clientData.firstName} {clientData.lastInitial}.</h2>
          <p>Track your cases, review attorney bids, and manage your documents</p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button className="btn btn-primary" onClick={onStartNewClaim}>Start New Claim</button>
          <button className="btn btn-secondary" onClick={onLogout}>Logout</button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="portal-tabs">
        <button className={`portal-tab ${activeTab === "active" ? "active" : ""}`} onClick={() => setActiveTab("active")}>
          Active Cases <span className="portal-tab-count">{activeCases.length}</span>
        </button>
        <button className={`portal-tab ${activeTab === "closed" ? "active" : ""}`} onClick={() => setActiveTab("closed")}>
          Closed Cases <span className="portal-tab-count">{closedCases.length}</span>
        </button>
        {clientDocs.length > 0 && (
          <button className={`portal-tab ${activeTab === "docs" ? "active" : ""}`} onClick={() => setActiveTab("docs")}>
            Documents <span className="portal-tab-count">{clientDocs.length}</span>
          </button>
        )}
      </div>

      {/* Active cases */}
      {activeTab === "active" && (
        <div className="case-grid">
          {activeCases.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--muted)" }}>
              <p style={{ marginBottom: "16px" }}>No active cases.</p>
              <button className="btn btn-primary" onClick={onStartNewClaim}>Start Your First Claim</button>
            </div>
          ) : activeCases.map(renderCaseCard)}
        </div>
      )}

      {/* Closed cases */}
      {activeTab === "closed" && (
        <div className="case-grid">
          {closedCases.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--muted)" }}>
              <p>No closed cases yet.</p>
            </div>
          ) : closedCases.map(renderCaseCard)}
        </div>
      )}

      {/* Documents */}
      {activeTab === "docs" && (
        <div className="case-grid">
          {clientDocs.map((doc, i) => (
            <div className="case-card" key={i}>
              <div className="case-header">
                <div className="case-id">{doc.type}</div>
                <div className="case-status status-open">Ready</div>
              </div>
              <div className="case-summary">
                <strong>Case:</strong> {doc.caseNumber}<br />
                <strong>Plaintiff:</strong> {doc.plaintiff}<br />
                <strong>Created:</strong> {new Date(doc.createdAt).toLocaleDateString()}
              </div>
              <div style={{ marginTop: "12px" }}>
                <button className="btn btn-primary" style={{ fontSize: "0.82rem", padding: "8px 20px" }} onClick={() => handleDownloadDocument(doc)}>
                  Download Document
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selection Confirmation Modal */}
      {showSelectionModal && selectedBid && (
        <div className="modal-overlay" onClick={() => setShowSelectionModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowSelectionModal(false)}>×</button>
            <h3>Confirm Attorney Selection</h3>
            <p>You're about to select <strong>{selectedBid.attorney}</strong> from {selectedBid.firm}.</p>
            <div style={{ background: "var(--cream)", padding: "16px", borderRadius: "8px", marginBottom: "20px", fontSize: "0.85rem" }}>
              <div style={{ marginBottom: "8px" }}><strong>Rate:</strong> {selectedBid.rate}</div>
              <div style={{ marginBottom: "8px" }}><strong>Timeline:</strong> {selectedBid.timeline}</div>
              <div><strong>Contact:</strong> {selectedBid.phone}</div>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
              {selectedBid.attorney.split(" ")[0]} will contact you at <strong>{clientData.phone}</strong> within 24 hours.
            </p>
            <div style={{ textAlign: "center", marginTop: "24px", display: "flex", gap: "12px", justifyContent: "center" }}>
              <button className="btn btn-secondary" onClick={() => setShowSelectionModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmSelection}>Confirm Selection</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [selectedBid, setSelectedBid] = useState(null);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  
  const clientCases = cases.filter(c => c.clientEmail === clientData.email);
  const clientDocs = savedDocuments?.filter(d => d.clientEmail === clientData.email) || [];

  const handleDownloadDocument = (doc) => {
    const blob = new Blob([doc.documentText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.type.replace(/\s+/g, "_")}_${doc.caseNumber || "Document"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

// ─── ATTORNEY PARTNERS DASHBOARD ────────────────────────────
function AttorneyDashboard({ cases, currentAttorney, onBidSubmit, signups, onApproveAttorney, onDenyAttorney, onDeleteAccount, onChangeTier, onUpdateProfile }) {
  const [expandedCase, setExpandedCase] = useState(null);
  const [bidForms, setBidForms] = useState({});
  const [expandedAssessments, setExpandedAssessments] = useState({});
  const [showSignups, setShowSignups] = useState(false);
  const [adminTab, setAdminTab] = useState("pending");
  const [approvalTiers, setApprovalTiers] = useState({});
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [editProfile, setEditProfile] = useState({
    bio: currentAttorney?.bio || "",
    feeStructure: currentAttorney?.feeStructure || "",
    approach: currentAttorney?.approach || "",
    counties: currentAttorney?.counties || "",
    yearsExperience: currentAttorney?.yearsExperience || "",
    winRate: currentAttorney?.winRate || "",
    avgCaseValue: currentAttorney?.avgCaseValue || "",
  });

  const toggleAssessment = (caseId) => setExpandedAssessments(prev => ({ ...prev, [caseId]: !prev[caseId] }));

  const isAdmin = currentAttorney?.email === "j.davies@daviesinjurylaw.com";
  const attorneyTier = currentAttorney?.tier || "free";
  const isGold = attorneyTier === "gold";
  const isSilver = attorneyTier === "silver";
  const isFree = attorneyTier === "free";

  // Calculate hours since case was posted
  const getHoursSincePosted = (submittedAt) => {
    return (Date.now() - new Date(submittedAt)) / (1000 * 60 * 60);
  };

  // Filter cases based on tier and timing
  const visibleCases = cases.filter(c => {
    const hoursSincePosted = getHoursSincePosted(c.submittedAt);
    
    // Marketplace cases: everyone sees immediately
    if (!c.isPremium) {
      return true;
    }
    
    // Premium cases
    if (isGold) {
      return true; // Gold sees everything immediately
    }
    
    if (isSilver && hoursSincePosted >= 48) {
      return true; // Silver sees premium after 48 hours
    }
    
    if (isFree && hoursSincePosted >= 120) {
      return true; // Free tier sees premium after 5 days
    }
    
    return false;
  });

  const handleBidChange = (caseId, field, value) => {
    setBidForms(prev => ({
      ...prev,
      [caseId]: { ...prev[caseId], [field]: value }
    }));
  };

  const submitBid = (caseId) => {
    // Check if free tier has bids remaining
    if (isFree && currentAttorney.bidsRemaining <= 0) {
      alert("You've used all 3 free bids this month. Upgrade to Silver ($199/mo) for unlimited marketplace bids, or purchase individual bids for $49 each.");
      return;
    }

    const bid = bidForms[caseId];
    if (!bid?.rate || !bid?.timeline || !bid?.pitch) {
      alert("Please fill out all bid fields");
      return;
    }
    onBidSubmit(caseId, { 
      ...bid, 
      attorney: currentAttorney.name,
      firm: currentAttorney.firm,
      email: currentAttorney.email,
      phone: currentAttorney.phone
    });
    setBidForms(prev => ({ ...prev, [caseId]: {} }));
    setExpandedCase(null);
    alert("Bid submitted successfully!");
  };

  // Render star rating for case quality
  const renderStars = (score) => {
    return "★".repeat(score) + "☆".repeat(5 - score);
  };

  return (
    <div className="dashboard">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
        <div>
          <h2>
            {isGold && (
              <span style={{
                display: "inline-block",
                fontSize: "0.65rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "1.2px",
                background: "linear-gradient(135deg, #C5A572, #B38F5C)",
                color: "#fff",
                padding: "3px 10px",
                borderRadius: "50px",
                marginRight: "10px",
                verticalAlign: "middle",
                fontFamily: "'Source Sans 3', sans-serif"
              }}>
                Gold
              </span>
            )}
            {isSilver && (
              <span style={{
                display: "inline-block",
                fontSize: "0.65rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "1.2px",
                background: "linear-gradient(135deg, #94A3B8, #64748B)",
                color: "#fff",
                padding: "3px 10px",
                borderRadius: "50px",
                marginRight: "10px",
                verticalAlign: "middle",
                fontFamily: "'Source Sans 3', sans-serif"
              }}>
                Silver
              </span>
            )}
            Attorney Partners Dashboard
          </h2>
          <p style={{ marginTop: "4px", fontSize: "0.88rem" }}>
            {isGold && "Premium case feed — immediate access to high-value contingency matters."}
            {isSilver && "Access to all marketplace cases plus premium cases after 48 hours."}
            {isFree && "Browse marketplace cases and submit up to 3 bids per month."}
          </p>
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "flex-end" }}>
          <button
            className="btn btn-secondary"
            style={{ fontSize: "0.8rem", padding: "7px 16px" }}
            onClick={() => setShowEditProfile(prev => !prev)}
          >
            {showEditProfile ? "Hide Profile Editor" : "Edit My Profile"}
          </button>
          <div style={{
            background: isGold ? "rgba(197,165,114,0.08)" : isSilver ? "rgba(148,163,184,0.08)" : "rgba(107,127,124,0.08)",
            border: `1px solid ${isGold ? "rgba(197,165,114,0.3)" : isSilver ? "rgba(148,163,184,0.3)" : "rgba(107,127,124,0.3)"}`,
            borderRadius: "10px",
            padding: "12px 18px",
            fontSize: "0.78rem",
            color: "var(--charcoal)",
            maxWidth: "260px",
            lineHeight: "1.6"
          }}>
            {isGold && (
              <>
                <div style={{ fontWeight: 600, color: "var(--gold)", marginBottom: "4px", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "1px" }}>Your Stats This Month</div>
                Bids submitted: {currentAttorney.bidsThisMonth || 0}<br />
                Cases won: {currentAttorney.casesWonThisMonth || 0}<br />
                Avg. case value: {currentAttorney.avgCaseValue || "N/A"}
              </>
            )}
            {isSilver && (
              <>
                <div style={{ fontWeight: 600, color: "#64748B", marginBottom: "4px", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "1px" }}>Your Activity</div>
                Bids this month: {currentAttorney.bidsThisMonth || 0}<br />
                Unlimited bids remaining<br />
                Access: All cases
              </>
            )}
            {isFree && (
              <>
                <div style={{ fontWeight: 600, color: "var(--sage)", marginBottom: "4px", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "1px" }}>Free Tier</div>
                Bids used: {currentAttorney.bidsThisMonth || 0}/3<br />
                Bids remaining: {currentAttorney.bidsRemaining || 0}<br />
                <span style={{ fontSize: "0.7rem", color: "var(--gold)", cursor: "pointer", textDecoration: "underline" }}>Upgrade to Silver</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── EDIT PROFILE PANEL ── */}
      {showEditProfile && (
        <div className="edit-profile-panel">
          <h3>Edit Your Public Profile</h3>
          <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: "20px" }}>
            This information is shown to clients when they view your profile from a bid or after selecting you.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="form-group">
              <label>Years of Experience</label>
              <input type="text" placeholder="e.g., 12" value={editProfile.yearsExperience}
                onChange={e => setEditProfile(p => ({ ...p, yearsExperience: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Win Rate</label>
              <input type="text" placeholder="e.g., 78%" value={editProfile.winRate}
                onChange={e => setEditProfile(p => ({ ...p, winRate: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Average Case Value</label>
              <input type="text" placeholder="e.g., $42,000" value={editProfile.avgCaseValue}
                onChange={e => setEditProfile(p => ({ ...p, avgCaseValue: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Counties Served</label>
              <input type="text" placeholder="e.g., Yellowstone, Missoula, Cascade" value={editProfile.counties}
                onChange={e => setEditProfile(p => ({ ...p, counties: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label>Bio</label>
            <textarea
              placeholder="A brief professional bio that clients will see on your profile..."
              value={editProfile.bio}
              onChange={e => setEditProfile(p => ({ ...p, bio: e.target.value }))}
              style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--sand)", borderRadius: "8px", fontFamily: "inherit", fontSize: "0.88rem", resize: "vertical", minHeight: "100px", outline: "none" }}
            />
          </div>
          <div className="form-group">
            <label>Fee Structure</label>
            <textarea
              placeholder="How do you charge clients? e.g., 33% contingency for personal injury, $250/hr for hourly matters..."
              value={editProfile.feeStructure}
              onChange={e => setEditProfile(p => ({ ...p, feeStructure: e.target.value }))}
              style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--sand)", borderRadius: "8px", fontFamily: "inherit", fontSize: "0.88rem", resize: "vertical", minHeight: "80px", outline: "none" }}
            />
          </div>
          <div className="form-group">
            <label>My Approach</label>
            <textarea
              placeholder="Describe how you work with clients and what sets you apart..."
              value={editProfile.approach}
              onChange={e => setEditProfile(p => ({ ...p, approach: e.target.value }))}
              style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--sand)", borderRadius: "8px", fontFamily: "inherit", fontSize: "0.88rem", resize: "vertical", minHeight: "80px", outline: "none" }}
            />
          </div>
          <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
            <button className="btn btn-secondary" onClick={() => setShowEditProfile(false)}>Cancel</button>
            <button
              className="btn btn-primary"
              disabled={profileSaving}
              onClick={async () => {
                setProfileSaving(true);
                await onUpdateProfile(editProfile);
                setProfileSaving(false);
                setShowEditProfile(false);
              }}
            >
              {profileSaving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </div>
      )}

      {/* ── ADMIN PANEL (j.davies only) ── */}
      {isAdmin && (
        <div style={{ marginBottom: "28px" }}>
          <div
            onClick={() => setShowSignups(prev => !prev)}
            style={{
              background: "rgba(30,58,95,0.04)",
              border: "1px solid rgba(30,58,95,0.15)",
              borderRadius: showSignups ? "10px 10px 0 0" : "10px",
              padding: "12px 18px",
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              userSelect: "none"
            }}
          >
            <div>
              <span style={{ fontWeight: 700, color: "var(--navy)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "1.2px" }}>
                Admin — Attorney Applications
              </span>
              <span style={{ marginLeft: "12px", fontSize: "0.72rem", color: "var(--muted)" }}>
                {(signups || []).filter(s => s.type === "attorney" && s.status === "pending").length} pending
                {" · "}
                {(signups || []).filter(s => s.type === "attorney").length} total attorneys
              </span>
            </div>
            <span style={{ color: "var(--navy)", fontSize: "0.85rem", fontWeight: 600 }}>
              {showSignups ? "▲ Hide" : "▼ View"}
            </span>
          </div>

          {showSignups && (() => {
            const attorneys = (signups || []).filter(s => s.type === "attorney");
            const pending = attorneys.filter(s => s.status === "pending");
            const approved = attorneys.filter(s => s.status === "approved");
            const denied = attorneys.filter(s => s.status === "denied");
            const clients = (signups || []).filter(s => s.type === "client");

            const tabList = [
              { key: "pending", label: `Pending (${pending.length})` },
              { key: "approved", label: `Approved (${approved.length})` },
              { key: "denied", label: `Denied (${denied.length})` },
              { key: "clients", label: `Clients (${clients.length})` },
            ];

            const tabData = { pending, approved, denied, clients };
            const rows = tabData[adminTab] || [];

            const tierColor = (t) => t === "gold" ? "var(--gold)" : t === "silver" ? "#64748B" : "var(--sage)";
            const tierBg = (t) => t === "gold" ? "rgba(197,165,114,0.12)" : t === "silver" ? "rgba(148,163,184,0.12)" : "rgba(107,127,124,0.1)";

            return (
              <div style={{ border: "1px solid rgba(30,58,95,0.1)", borderTop: "none", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
                {/* Tab bar */}
                <div style={{ display: "flex", background: "var(--cream)", borderBottom: "1px solid var(--sand)" }}>
                  {tabList.map(t => (
                    <button
                      key={t.key}
                      onClick={() => setAdminTab(t.key)}
                      style={{
                        padding: "10px 18px",
                        fontSize: "0.75rem",
                        fontWeight: adminTab === t.key ? 700 : 400,
                        color: adminTab === t.key ? "var(--navy)" : "var(--muted)",
                        background: "transparent",
                        border: "none",
                        borderBottom: adminTab === t.key ? "2px solid var(--navy)" : "2px solid transparent",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transition: "all 0.15s"
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {rows.length === 0 ? (
                  <div style={{ padding: "28px", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>
                    {adminTab === "pending" ? "No pending applications." : adminTab === "approved" ? "No approved attorneys yet." : adminTab === "denied" ? "No denied applications." : "No client accounts yet."}
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                    <thead>
                      <tr style={{ background: "var(--cream)", borderBottom: "1px solid var(--sand)" }}>
                        <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "var(--navy)", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.8px" }}>Name</th>
                        <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "var(--navy)", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.8px" }}>Username / Email</th>
                        {adminTab !== "clients" && (
                          <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "var(--navy)", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.8px" }}>Bar # / Firm</th>
                        )}
                        {adminTab !== "clients" && (
                          <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "var(--navy)", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.8px" }}>Tier</th>
                        )}
                        <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "var(--navy)", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.8px" }}>Date</th>
                        <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "var(--navy)", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.8px" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((s, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid var(--sand)", background: i % 2 === 0 ? "#fff" : "var(--cream)", verticalAlign: "middle" }}>
                          <td style={{ padding: "10px 14px", fontWeight: 500, color: "var(--charcoal)" }}>{s.name}</td>
                          <td style={{ padding: "10px 14px" }}>
                            {s.username && (
                              <div style={{ fontWeight: 600, color: "var(--navy)", fontSize: "0.78rem" }}>@{s.username}</div>
                            )}
                            <div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{s.email}</div>
                          </td>
                          {adminTab !== "clients" && (
                            <td style={{ padding: "10px 14px", color: "var(--muted)", fontSize: "0.75rem" }}>
                              <div>Bar #{s.barNumber || "—"}</div>
                              <div>{s.firm || "Solo"}</div>
                            </td>
                          )}
                          {adminTab !== "clients" && (
                            <td style={{ padding: "10px 14px" }}>
                              {adminTab === "approved" ? (
                                <select
                                  value={s.tier || "free"}
                                  onChange={e => onChangeTier(s.email, e.target.value)}
                                  style={{
                                    padding: "4px 8px",
                                    borderRadius: "6px",
                                    border: `1.5px solid ${tierColor(s.tier || "free")}`,
                                    color: tierColor(s.tier || "free"),
                                    background: tierBg(s.tier || "free"),
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    fontFamily: "inherit",
                                    cursor: "pointer"
                                  }}
                                >
                                  <option value="free">Free</option>
                                  <option value="silver">Silver</option>
                                  <option value="gold">Gold</option>
                                </select>
                              ) : adminTab === "pending" ? (
                                <select
                                  value={approvalTiers[s.email] || "free"}
                                  onChange={e => setApprovalTiers(prev => ({ ...prev, [s.email]: e.target.value }))}
                                  style={{
                                    padding: "4px 8px",
                                    borderRadius: "6px",
                                    border: "1.5px solid var(--sand)",
                                    fontSize: "0.75rem",
                                    fontFamily: "inherit",
                                    cursor: "pointer"
                                  }}
                                >
                                  <option value="free">Free</option>
                                  <option value="silver">Silver</option>
                                  <option value="gold">Gold</option>
                                </select>
                              ) : (
                                <span style={{ fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", color: "var(--muted)" }}>—</span>
                              )}
                            </td>
                          )}
                          <td style={{ padding: "10px 14px", color: "var(--muted)", fontSize: "0.75rem" }}>
                            {new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                              {adminTab === "pending" && (
                                <>
                                  <button
                                    onClick={() => onApproveAttorney(s.email, approvalTiers[s.email] || "free")}
                                    style={{
                                      padding: "4px 12px",
                                      fontSize: "0.72rem",
                                      fontWeight: 600,
                                      border: "none",
                                      borderRadius: "50px",
                                      background: "var(--success)",
                                      color: "#fff",
                                      cursor: "pointer",
                                      fontFamily: "inherit"
                                    }}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => onDenyAttorney(s.email)}
                                    style={{
                                      padding: "4px 12px",
                                      fontSize: "0.72rem",
                                      fontWeight: 600,
                                      border: "1px solid var(--danger)",
                                      borderRadius: "50px",
                                      background: "transparent",
                                      color: "var(--danger)",
                                      cursor: "pointer",
                                      fontFamily: "inherit"
                                    }}
                                  >
                                    Deny
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => onDeleteAccount(s.email)}
                                style={{
                                  padding: "4px 10px",
                                  fontSize: "0.7rem",
                                  fontWeight: 600,
                                  border: "1px solid var(--sand)",
                                  borderRadius: "50px",
                                  background: "transparent",
                                  color: "var(--muted)",
                                  cursor: "pointer",
                                  fontFamily: "inherit"
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })()}
        </div>
      )}

      <div className="case-grid">
        {visibleCases.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--muted)" }}>
            {isGold && "No new cases at the moment. You'll be notified immediately when qualifying cases are submitted."}
            {isSilver && "No active cases at the moment. Check back soon!"}
            {isFree && "No marketplace cases available. Check back soon or upgrade to access more cases."}
          </div>
        )}

        {visibleCases.map(c => {
          const isExpanded = expandedCase === c.id;
          const hasBids = c.bids && c.bids.length > 0;
          const alreadyBid = c.bids?.some(b => b.email === currentAttorney.email);
          const wonCase = c.selectedAttorney?.email === currentAttorney.email;
          const status = wonCase ? "closed" : (hasBids ? "bidding" : "open");
          const hoursSincePosted = getHoursSincePosted(c.submittedAt);
          const isExclusiveToGold = c.isPremium && hoursSincePosted < 48;

          return (
            <div className="case-card" key={c.id} style={c.isPremium && isGold ? { borderLeft: "3px solid var(--gold)" } : {}}>
              <div className="case-header">
                <div className="case-id">
                  Case {c.id}
                </div>
                <div className={`case-status status-${status}`}>
                  {wonCase ? "You Won!" : (status === "open" ? "Open" : `${c.bids.length} Bid${c.bids.length > 1 ? "s" : ""}`)}
                  {isExclusiveToGold && isGold && !wonCase && (
                    <span style={{ marginLeft: "8px", fontSize: "0.65rem", background: "var(--gold)", padding: "2px 6px", borderRadius: "4px" }}>
                      Exclusive
                    </span>
                  )}
                </div>
              </div>

              {wonCase && (
                <div style={{ 
                  background: "#E8F5E9", 
                  border: "1px solid #4CAF50", 
                  borderRadius: "8px", 
                  padding: "16px", 
                  marginBottom: "12px",
                  fontSize: "0.82rem"
                }}>
                  <div style={{ fontWeight: 600, color: "#2E7D32", marginBottom: "8px" }}>
                    ✓ Client Selected You!
                  </div>
                  <div style={{ color: "var(--charcoal)" }}>
                    <strong>Client:</strong> {c.clientFirstName} {c.clientLastInitial}.<br />
                    <strong>Phone:</strong> {c.clientPhone}<br />
                    <strong>Email:</strong> {c.clientEmail}<br />
                    <em style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "8px", display: "block" }}>
                      Contact the client within 24 hours to discuss next steps.
                    </em>
                  </div>
                </div>
              )}

              {/* Case Assessment — Gold sees all, Silver sees hours-only assessments */}
              {!wonCase && (isGold || (isSilver && c.assessment?.assessmentType === "hours")) && (
                <>
                  {c.assessmentPending && (
                    <div style={{
                      background: "rgba(197,165,114,0.06)",
                      border: "1px dashed rgba(197,165,114,0.3)",
                      borderRadius: "8px",
                      padding: "12px 16px",
                      marginBottom: "12px",
                      fontSize: "0.78rem",
                      color: "var(--muted)",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px"
                    }}>
                      <div className="typing-indicator" style={{ transform: "scale(0.7)" }}><span></span><span></span><span></span></div>
                      Generating case assessment...
                    </div>
                  )}

                  {/* ── VALUATION ASSESSMENT (collapsible) ── */}
                  {!c.assessmentPending && c.assessment?.assessmentType === "valuation" && (() => {
                    const isOpen = expandedAssessments[c.id];
                    const a = c.assessment;
                    return (
                      <div style={{ border: "1px solid rgba(197,165,114,0.3)", borderRadius: "10px", marginBottom: "12px", overflow: "hidden" }}>
                        {/* Header / toggle */}
                        <div
                          onClick={() => toggleAssessment(c.id)}
                          style={{
                            background: "rgba(197,165,114,0.08)",
                            padding: "10px 14px",
                            cursor: "pointer",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            userSelect: "none"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ fontWeight: 700, color: "var(--gold)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "1px" }}>
                              {renderStars(a.overallScore)} AI Claim Assessment
                            </span>
                            {!isOpen && (
                              <span style={{ fontSize: "0.72rem", color: "var(--charcoal)" }}>
                                {a.estimatedValue} · {a.confidence} Confidence
                              </span>
                            )}
                          </div>
                          <span style={{ color: "var(--gold)", fontSize: "0.85rem", fontWeight: 600 }}>{isOpen ? "▲ Hide" : "▼ View"}</span>
                        </div>
                        {/* Body */}
                        {isOpen && (
                          <div style={{ padding: "14px 16px", fontSize: "0.78rem", background: "rgba(197,165,114,0.04)" }}>
                            {/* Confidence + disclaimer */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px", gap: "8px" }}>
                              <div style={{ fontSize: "0.72rem", color: "var(--muted)", fontStyle: "italic", flex: 1 }}>
                                This assessment is AI-generated from client intake responses and should be independently verified before relying on it.
                              </div>
                              <div style={{ fontSize: "0.72rem", color: "var(--charcoal)", whiteSpace: "nowrap", fontWeight: 500 }}>
                                {a.confidence} Confidence
                              </div>
                            </div>
                            {/* Value cards */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
                              <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: "6px", padding: "8px 10px" }}>
                                <div style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--muted)", marginBottom: "2px" }}>Est. Settlement Range</div>
                                <div style={{ fontWeight: 700, color: "var(--navy)", fontSize: "0.9rem" }}>{a.estimatedValue}</div>
                              </div>
                              <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: "6px", padding: "8px 10px" }}>
                                <div style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--muted)", marginBottom: "2px" }}>Est. Attorney Fee ({a.typicalContingencyRate})</div>
                                <div style={{ fontWeight: 700, color: "var(--navy)", fontSize: "0.9rem" }}>{a.estimatedAttorneyFee}</div>
                              </div>
                            </div>
                            {/* Score bars */}
                            <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                              {[["Liability", a.liabilityScore], ["Damages", a.damagesScore], ["Collectibility", a.collectibilityScore]].map(([label, score]) => (
                                <div key={label} style={{ flex: 1, textAlign: "center", background: "rgba(255,255,255,0.7)", borderRadius: "6px", padding: "6px 4px" }}>
                                  <div style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.6px", color: "var(--muted)" }}>{label}</div>
                                  <div style={{ color: "var(--gold)", fontSize: "0.75rem", marginTop: "2px" }}>{renderStars(score)}</div>
                                </div>
                              ))}
                            </div>
                            {/* Strengths / Risks */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                              <div>
                                <div style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--success)", marginBottom: "4px" }}>Strengths</div>
                                {a.keyStrengths?.map((s, i) => <div key={i} style={{ color: "var(--charcoal)", marginBottom: "2px" }}>+ {s}</div>)}
                              </div>
                              <div>
                                <div style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--danger)", marginBottom: "4px" }}>Risks</div>
                                {a.keyRisks?.map((r, i) => <div key={i} style={{ color: "var(--charcoal)", marginBottom: "2px" }}>− {r}</div>)}
                              </div>
                            </div>
                            {a.confidenceReason && (
                              <div style={{ paddingTop: "8px", borderTop: "1px solid rgba(197,165,114,0.2)", color: "var(--muted)", fontStyle: "italic", fontSize: "0.72rem" }}>
                                {a.confidenceReason}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* ── HOURS ASSESSMENT (collapsible) ── */}
                  {!c.assessmentPending && c.assessment?.assessmentType === "hours" && (() => {
                    const isOpen = expandedAssessments[c.id];
                    const a = c.assessment;
                    return (
                      <div style={{ border: "1px solid rgba(107,127,124,0.25)", borderRadius: "10px", marginBottom: "12px", overflow: "hidden" }}>
                        <div
                          onClick={() => toggleAssessment(c.id)}
                          style={{
                            background: "rgba(107,127,124,0.07)",
                            padding: "10px 14px",
                            cursor: "pointer",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            userSelect: "none"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ fontWeight: 700, color: "var(--sage-dark)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "1px" }}>
                              {renderStars(a.overallScore)} AI Hours Estimate
                            </span>
                            {!isOpen && (
                              <span style={{ fontSize: "0.72rem", color: "var(--charcoal)" }}>
                                {a.estimatedHours} · {a.complexity}
                              </span>
                            )}
                          </div>
                          <span style={{ color: "var(--sage-dark)", fontSize: "0.85rem", fontWeight: 600 }}>{isOpen ? "▲ Hide" : "▼ View"}</span>
                        </div>
                        {isOpen && (
                          <div style={{ padding: "14px 16px", fontSize: "0.78rem", background: "rgba(107,127,124,0.04)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px", gap: "8px" }}>
                              <div style={{ fontSize: "0.72rem", color: "var(--muted)", fontStyle: "italic", flex: 1 }}>
                                This estimate is AI-generated from client intake responses and should be independently verified before relying on it.
                              </div>
                              <div style={{ fontSize: "0.72rem", color: "var(--charcoal)", whiteSpace: "nowrap", fontWeight: 500 }}>
                                {a.complexity}
                              </div>
                            </div>
                            <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: "6px", padding: "8px 10px", marginBottom: "10px", textAlign: "center" }}>
                              <div style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--muted)", marginBottom: "2px" }}>Estimated Hours to Complete</div>
                              <div style={{ fontWeight: 700, color: "var(--navy)", fontSize: "1.1rem" }}>{a.estimatedHours}</div>
                            </div>
                            {a.phases?.map((phase, i) => (
                              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "5px 0", borderBottom: i < a.phases.length - 1 ? "1px solid rgba(107,127,124,0.15)" : "none" }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 600, color: "var(--navy)", marginBottom: "1px" }}>{phase.phase}</div>
                                  <div style={{ color: "var(--muted)", fontSize: "0.72rem" }}>{phase.description}</div>
                                </div>
                                <div style={{ fontWeight: 600, color: "var(--sage-dark)", whiteSpace: "nowrap", marginLeft: "12px" }}>{phase.hours}</div>
                              </div>
                            ))}
                            {a.likelyOutcome && (
                              <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px solid rgba(107,127,124,0.2)", color: "var(--charcoal)", fontStyle: "italic", fontSize: "0.72rem" }}>
                                <strong style={{ color: "var(--sage-dark)", fontStyle: "normal" }}>Likely outcome: </strong>{a.likelyOutcome}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}



              <div className="case-summary">
                <strong>{c.category}</strong> • {c.county} County
                <br /><br />
                {c.summary}
              </div>

              {isSilver && c.isPremium && hoursSincePosted < 48 && !wonCase && (
                <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "12px", fontStyle: "italic" }}>
                  This premium case will be available to Silver tier in {Math.ceil(48 - hoursSincePosted)} hours
                </div>
              )}

              {alreadyBid && !wonCase && (
                <div style={{ fontSize: "0.82rem", color: "var(--success)", marginTop: "12px", fontWeight: 500 }}>
                  ✓ You've already submitted a bid for this case
                </div>
              )}

              {!alreadyBid && !isExpanded && !wonCase && (
                <button 
                  className="btn btn-primary" 
                  style={{ fontSize: "0.82rem", padding: "8px 20px", marginTop: "12px" }}
                  onClick={() => setExpandedCase(c.id)}
                  disabled={isFree && currentAttorney.bidsRemaining <= 0}
                >
                  {isFree && currentAttorney.bidsRemaining <= 0 ? "No Bids Remaining" : "View Details & Submit Bid"}
                </button>
              )}

              {!alreadyBid && isExpanded && (
                <div className="bid-section">
                  <h4 style={{ fontSize: "0.85rem", color: "var(--walnut)", marginBottom: "12px" }}>Submit Your Bid</h4>
                  {isFree && (
                    <div style={{ background: "#FFF8F0", border: "1px solid #F0D5B8", borderRadius: "8px", padding: "10px 14px", marginBottom: "12px", fontSize: "0.78rem", color: "var(--navy)" }}>
                      Using bid {currentAttorney.bidsThisMonth + 1} of 3 this month. {currentAttorney.bidsRemaining - 1} will remain after this bid.
                    </div>
                  )}
                  <div className="bid-form">
                    <input 
                      type="text" 
                      placeholder={c.isPremium ? "Your contingency rate (e.g., 33%)" : "Your hourly rate or flat fee (e.g., $250/hr or $1,500 flat)"}
                      value={bidForms[c.id]?.rate || ""}
                      onChange={e => handleBidChange(c.id, "rate", e.target.value)}
                    />
                    <input 
                      type="text" 
                      placeholder="Estimated timeline (e.g., 2-3 weeks)" 
                      value={bidForms[c.id]?.timeline || ""}
                      onChange={e => handleBidChange(c.id, "timeline", e.target.value)}
                    />
                    <textarea 
                      placeholder="Brief pitch to the client (why you're the right fit for this case)"
                      value={bidForms[c.id]?.pitch || ""}
                      onChange={e => handleBidChange(c.id, "pitch", e.target.value)}
                    />
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button className="btn btn-primary" onClick={() => submitBid(c.id)}>Submit Bid</button>
                      <button className="btn btn-secondary" onClick={() => setExpandedCase(null)}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ABOUT PAGE ─────────────────────────────────────────────
function AboutPage() {
  return (
    <div className="about-page">

      {/* ── DEMO NOTICE ── */}
      <div style={{
        background: "linear-gradient(135deg, rgba(30,58,95,0.06), rgba(30,58,95,0.03))",
        border: "1.5px solid rgba(30,58,95,0.2)",
        borderRadius: "12px",
        padding: "20px 28px",
        marginBottom: "24px",
        display: "flex",
        gap: "16px",
        alignItems: "flex-start"
      }}>
        <div style={{ fontSize: "0.7rem", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", color: "var(--navy)", background: "rgba(30,58,95,0.12)", padding: "4px 10px", borderRadius: "6px", flexShrink: 0, whiteSpace: "nowrap" }}>Demo</div>
        <div>
          <div style={{ fontWeight: 700, color: "var(--navy)", fontSize: "1.05rem", marginBottom: "8px", fontFamily: "'Cormorant Garamond', serif" }}>
            WALT is Currently in Demo Mode
          </div>
          <p style={{ fontSize: "0.84rem", color: "var(--charcoal)", lineHeight: "1.75", margin: 0 }}>
            This is a working demonstration of the WALT platform. <strong>Any case submitted here is for testing purposes only</strong> — no real attorney-client relationships are formed and no actual legal services are provided through this demo.
          </p>
          <p style={{ fontSize: "0.84rem", color: "var(--charcoal)", lineHeight: "1.75", marginTop: "10px", marginBottom: 0 }}>
            <strong>Attorneys who create an account during the demo period</strong> are doing so for informational and preview purposes. When WALT launches as a fully operating business, every attorney who signed up during the demo will automatically receive a <strong style={{ color: "var(--gold)" }}>free Gold-tier subscription</strong> — our highest access level — as a thank-you for being an early supporter.
          </p>
        </div>
      </div>

      <div className="disclaimer">
        <strong>Important Disclaimer:</strong> WALT is a legal marketplace platform and does <strong>not</strong> provide legal advice. No attorney-client relationship is formed through use of this service. This platform is limited to <strong>Montana jurisdiction only</strong>. Always consult a licensed Montana attorney for guidance specific to your situation.
      </div>

      <h2>About WALT</h2>
      <p>Worth A Lawyer's Time</p>

      <div className="about-block">
        <h3>Our Mission</h3>
        <p>
          <strong>WALT stands for Worth A Lawyer's Time.</strong> Montana faces a shocking access to justice crisis. 
          A 2010 Carmody & Associates report found that nearly half of low-income Montanans faced at least one civil 
          legal problem, one-third faced multiple issues, and fewer than a quarter took action to address them. 
          Across eviction, consumer credit, and child support cases, an overwhelming 95–99% of people facing these 
          legal challenges do so without an attorney. Several Montana counties lack a single attorney.
        </p>
        <p style={{ marginTop: "16px" }}>
          Built by a University of Montana law student, WALT aims to alleviate some of these issues by providing an 
          easy-to-use service that connects qualified attorneys to Montanans in need of assistance.
        </p>
      </div>

      <div className="about-block">
        <h3>Frequently Asked Questions</h3>
        
        <div style={{ marginBottom: "20px" }}>
          <h4 style={{ fontSize: "0.95rem", color: "var(--navy)", marginBottom: "8px", fontWeight: 600 }}>
            How does WALT work?
          </h4>
          <p style={{ fontSize: "0.85rem", color: "var(--charcoal)", lineHeight: "1.7" }}>
            WALT uses AI-powered intake to gather information about your legal issue, then connects you with Montana 
            attorneys who can help. Attorneys review your case and submit competitive bids. You choose the attorney 
            that best fits your needs and budget.
          </p>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <h4 style={{ fontSize: "0.95rem", color: "var(--navy)", marginBottom: "8px", fontWeight: 600 }}>
            Is WALT free to use?
          </h4>
          <p style={{ fontSize: "0.85rem", color: "var(--charcoal)", lineHeight: "1.7" }}>
            Creating an account and submitting your case to attorneys is free. You only pay attorney fees if you 
            choose to hire an attorney who bid on your case. The self-service document tools are completely free.
          </p>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <h4 style={{ fontSize: "0.95rem", color: "var(--navy)", marginBottom: "8px", fontWeight: 600 }}>
            What types of legal issues does WALT handle?
          </h4>
          <p style={{ fontSize: "0.85rem", color: "var(--charcoal)", lineHeight: "1.7" }}>
            WALT currently focuses on all civil legal matters in Montana. Free self-service tools are available 
            for landlord-tenant issues and debt collection matters, allowing you to prepare court documents at no 
            cost. For other civil legal needs, our attorney marketplace connects you with qualified Montana lawyers 
            who can provide representation.
          </p>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <h4 style={{ fontSize: "0.95rem", color: "var(--navy)", marginBottom: "8px", fontWeight: 600 }}>
            Are the attorneys on WALT licensed in Montana?
          </h4>
          <p style={{ fontSize: "0.85rem", color: "var(--charcoal)", lineHeight: "1.7" }}>
            Yes. All attorney partners on WALT are licensed to practice law in Montana and are in good standing 
            with the Montana State Bar. We verify credentials before accepting attorneys into our network.
          </p>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <h4 style={{ fontSize: "0.95rem", color: "var(--navy)", marginBottom: "8px", fontWeight: 600 }}>
            Can I use the self-service document tools without creating an account?
          </h4>
          <p style={{ fontSize: "0.85rem", color: "var(--charcoal)", lineHeight: "1.7" }}>
            Yes! You can use our document assistant tools and download the completed documents as drafts without 
            creating an account. However, creating a free account allows you to save your documents and access 
            them anytime.
          </p>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <h4 style={{ fontSize: "0.95rem", color: "var(--navy)", marginBottom: "8px", fontWeight: 600 }}>
            How do I know which attorney to choose?
          </h4>
          <p style={{ fontSize: "0.85rem", color: "var(--charcoal)", lineHeight: "1.7" }}>
            Each attorney bid includes their rate, estimated timeline, and a personalized message explaining why 
            they're a good fit for your case. You can review their firm information and choose based on your 
            priorities—whether that's cost, experience, or timeline.
          </p>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <h4 style={{ fontSize: "0.95rem", color: "var(--navy)", marginBottom: "8px", fontWeight: 600 }}>
            What if I can't afford an attorney?
          </h4>
          <p style={{ fontSize: "0.85rem", color: "var(--charcoal)", lineHeight: "1.7" }}>
            WALT's self-service tools are designed to help you handle certain legal tasks yourself at no cost. 
            For representation, you may also qualify for free legal aid through Montana Legal Services Association 
            (MLSA). Call the MLSA HelpLine at 1-800-666-6899 or visit mtlsa.org to see if you qualify.
          </p>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <h4 style={{ fontSize: "0.95rem", color: "var(--navy)", marginBottom: "8px", fontWeight: 600 }}>
            Is my information confidential?
          </h4>
          <p style={{ fontSize: "0.85rem", color: "var(--charcoal)", lineHeight: "1.7" }}>
            Yes. Your case information is only shared with attorneys in our verified network. We take privacy 
            seriously and protect your data. However, remember that no attorney-client relationship exists until 
            you formally hire an attorney.
          </p>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <h4 style={{ fontSize: "0.95rem", color: "var(--navy)", marginBottom: "8px", fontWeight: 600 }}>
            I'm an attorney. How can I join the WALT network?
          </h4>
          <p style={{ fontSize: "0.85rem", color: "var(--charcoal)", lineHeight: "1.7" }}>
            Montana-licensed attorneys can apply to join our network by contacting us at partners@walt.legal 
            (example). We welcome attorneys committed to expanding access to justice in Montana.
          </p>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <h4 style={{ fontSize: "0.95rem", color: "var(--navy)", marginBottom: "8px", fontWeight: 600 }}>
            How does WALT make money? What do attorneys pay?
          </h4>
          <p style={{ fontSize: "0.85rem", color: "var(--charcoal)", lineHeight: "1.7", marginBottom: "12px" }}>
            WALT operates on a subscription model that delivers pre-qualified client leads to Montana attorneys. 
            Clients always use WALT for free—we never charge clients to post cases or receive bids.
          </p>
          <p style={{ fontSize: "0.85rem", color: "var(--charcoal)", lineHeight: "1.7", marginBottom: "12px" }}>
            <strong>For attorneys, we offer three tiers:</strong>
          </p>
          
          <div style={{ 
            background: "var(--cream)", 
            border: "1px solid var(--sand)", 
            borderRadius: "8px", 
            padding: "16px 20px",
            marginBottom: "12px"
          }}>
            <div style={{ fontWeight: 600, color: "var(--sage)", marginBottom: "8px", fontSize: "0.88rem" }}>
              Free Tier (Marketplace)
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--charcoal)", lineHeight: "1.6", marginBottom: "6px" }}>
              • <strong>3 bids per month included</strong> at no cost<br />
              • Access to all marketplace cases (debt defense, family law, landlord-tenant, bankruptcy)<br />
              • Additional bids available at $49 each<br />
              • Perfect for testing WALT or attorneys with selective caseloads
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "8px", fontStyle: "italic" }}>
              Example: An attorney handling 1-2 new cases per month can use WALT completely free.
            </p>
          </div>

          <div style={{ 
            background: "rgba(148,163,184,0.08)", 
            border: "1.5px solid rgba(148,163,184,0.4)", 
            borderRadius: "8px", 
            padding: "16px 20px",
            marginBottom: "12px"
          }}>
            <div style={{ fontWeight: 600, color: "#64748B", marginBottom: "8px", fontSize: "0.88rem" }}>
              Silver Tier — $199/month
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--charcoal)", lineHeight: "1.6", marginBottom: "6px" }}>
              • <strong>Unlimited bids</strong> on marketplace cases<br />
              • Access to premium cases (personal injury, employment) <strong>after 48 hours</strong><br />
              • Priority placement in bid queue<br />
              • Basic analytics dashboard<br />
              • Best for: General practice attorneys handling 5-10 cases/month
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "8px", fontStyle: "italic" }}>
              Break-even: Just 5 bids per month vs. buying à la carte ($245 in overage fees). Perfect for attorneys 
              who want volume across multiple practice areas.
            </p>
          </div>

          <div style={{ 
            background: "rgba(197,165,114,0.08)", 
            border: "1.5px solid rgba(197,165,114,0.4)", 
            borderRadius: "8px", 
            padding: "16px 20px"
          }}>
            <div style={{ fontWeight: 600, color: "var(--gold)", marginBottom: "8px", fontSize: "0.88rem" }}>
              Gold Tier — $499/month
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--charcoal)", lineHeight: "1.6", marginBottom: "6px" }}>
              • <strong>Immediate exclusive access</strong> to premium contingency cases<br />
              • Personal injury, wrongful termination, civil rights, wrongful death<br />
              • <strong>First 48 hours exclusive</strong> before cases go to Silver tier<br />
              • Unlimited bids on all case types (premium + marketplace)<br />
              • Case quality scoring with estimated settlement values<br />
              • Priority placement and direct client contact<br />
              • Advanced analytics and ROI tracking
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "8px", fontStyle: "italic" }}>
              Why it's worth it: One quality PI case (avg. $50k settlement at 33% = $16,500 fee) covers 33 months of 
              subscription. Compare to traditional PI marketing ($5,000–$15,000 per signed client) or referral fees (25–33%). 
              Gold members average 2-3 signed cases per month.
            </p>
          </div>
          
          <p style={{ fontSize: "0.85rem", color: "var(--charcoal)", lineHeight: "1.7", marginTop: "12px" }}>
            Our pricing is designed to be significantly cheaper than traditional client acquisition channels while 
            delivering pre-qualified leads. Attorneys can start with the free tier and upgrade as they see ROI.
          </p>
        </div>

        <div style={{ marginBottom: "0" }}>
          <h4 style={{ fontSize: "0.95rem", color: "var(--navy)", marginBottom: "8px", fontWeight: 600 }}>
            Why Montana only?
          </h4>
          <p style={{ fontSize: "0.85rem", color: "var(--charcoal)", lineHeight: "1.7" }}>
            Montana has unique legal characteristics—from its court system to specific statutes like the Residential 
            Landlord and Tenant Act. WALT is built exclusively for Montana law to ensure clients get connected with 
            attorneys who understand the local landscape. We may expand to other states in the future.
          </p>
        </div>
      </div>

      <div className="about-block">
        <h3>Ethics &amp; Compliance</h3>
        <p>
          WALT is designed from the ground up to operate in full compliance with both the ABA Model Rules of Professional 
          Conduct and the Montana Rules of Professional Conduct. Our subscription-based revenue model and operational 
          structure reflect a deliberate commitment to legal ethics — not as an afterthought, but as a core design principle.
        </p>

        <div style={{ marginTop: "20px" }}>
          <h4 style={{ fontSize: "0.95rem", color: "var(--navy)", marginBottom: "8px", fontWeight: 600 }}>
            Rule 5.4 — Independence of the Legal Profession
          </h4>
          <p style={{ fontSize: "0.85rem", color: "var(--charcoal)", lineHeight: "1.7" }}>
            Both ABA Model Rule 5.4 and Montana Rule 5.4 prohibit attorneys from sharing legal fees with 
            non-lawyers. WALT's business model is structured entirely around flat-rate attorney subscriptions — 
            we never take a percentage of case fees, referral fees, or contingency cuts. Attorneys pay a fixed 
            monthly subscription for access to pre-qualified leads, and all compensation flows directly between 
            client and attorney. This structure ensures complete attorney independence and full Rule 5.4 compliance.
          </p>
        </div>

        <div style={{ marginTop: "20px" }}>
          <h4 style={{ fontSize: "0.95rem", color: "var(--navy)", marginBottom: "8px", fontWeight: 600 }}>
            Rule 7.2 — Communications Concerning Services
          </h4>
          <p style={{ fontSize: "0.85rem", color: "var(--charcoal)", lineHeight: "1.7" }}>
            Montana Rule 7.2 permits attorneys to pay for advertising and referral services, provided the 
            arrangement does not involve fee-splitting or compromise independent professional judgment. WALT 
            operates as a permitted advertising and lead-generation platform — attorneys pay for access to 
            the marketplace, not per referral or case outcome. This is consistent with the Montana Supreme 
            Court's recognition that subscription-based legal marketing services are permissible under the 
            Rules of Professional Conduct.
          </p>
        </div>

        <div style={{ marginTop: "20px" }}>
          <h4 style={{ fontSize: "0.95rem", color: "var(--navy)", marginBottom: "8px", fontWeight: 600 }}>
            Unauthorized Practice of Law
          </h4>
          <p style={{ fontSize: "0.85rem", color: "var(--charcoal)", lineHeight: "1.7" }}>
            WALT's AI-powered intake tool gathers and organizes information from clients — it does not analyze 
            legal claims, advise clients on strategy, or predict legal outcomes. The platform functions as an 
            intake and routing mechanism, not a legal advisor. All substantive legal advice is provided exclusively 
            by licensed Montana attorneys. Our self-service document tools assist users in preparing procedural 
            forms they are entitled to prepare themselves as pro se litigants, consistent with Montana's 
            recognition of self-represented parties' rights.
          </p>
        </div>

        <div style={{ marginTop: "20px" }}>
          <h4 style={{ fontSize: "0.95rem", color: "var(--navy)", marginBottom: "8px", fontWeight: 600 }}>
            Attorney Verification
          </h4>
          <p style={{ fontSize: "0.85rem", color: "var(--charcoal)", lineHeight: "1.7" }}>
            All attorneys admitted to the WALT network are verified as licensed and in good standing with the 
            Montana State Bar prior to platform access. WALT does not restrict, direct, or otherwise influence 
            the independent professional judgment of attorneys in the network.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── DOCUMENT ASSISTANT (Debt Answer Helper) ───────────────
function DocumentAssistant({ onBack, onSave, currentUser, onCreateAccount }) {
  const [step, setStep] = useState("method-select"); // method-select, upload, manual-entry, analyzing, chat, generating, preview
  const [uploadedFile, setUploadedFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(null);
  const [documentText, setDocumentText] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // METHOD SELECTION HANDLERS
  const handleUploadChoice = () => {
    setStep("upload");
  };

  const handleManualChoice = () => {
    setStep("manual-entry");
    setMessages([{
      role: "assistant",
      content: "I'll help you create an Answer to the debt collection complaint. Let's start by gathering the basic information from your complaint. First, what is the name of the plaintiff (the company or person suing you)?"
    }]);
  };

  // MANUAL ENTRY HANDLER
  const sendManualEntryMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const conversationHistory = [...messages, { role: "user", content: userMessage }].map(m => ({
        role: m.role,
        content: m.content
      }));

      const systemPrompt = `You are helping a Montana resident prepare an Answer to a Debt Collection Complaint by gathering information from them manually (they're typing information from their paper complaint).

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

      const response = await fetch("/api/document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "manual-entry", system: systemPrompt, messages: conversationHistory })
      });

      const data = await response.json();
      let reply = (data.text || "").trim();
      reply = reply.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

      // Check for completion JSON
      const firstBrace = reply.indexOf("{");
      const lastBrace = reply.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && reply.includes("\"extracted\"")) {
        const jsonStr = reply.substring(firstBrace, lastBrace + 1);
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.extracted) {
            setExtractedData(parsed);
            // Start the defense questions
            setMessages([{
              role: "assistant",
              content: `Great! I've recorded all the basic information about your case. Now I need to ask you a few questions to complete your Answer. Let's start: Do you admit or deny that you owe this debt?`
            }]);
            setStep("chat");
            setLoading(false);
            return;
          }
        } catch (e) {
          // Continue as normal message
        }
      }

      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I had trouble processing that. Could you try again?"
      }]);
    } finally {
      setLoading(false);
    }
  };

  // FILE UPLOAD HANDLER
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.includes("pdf") && !file.type.includes("image")) {
      alert("Please upload a PDF or image file");
      return;
    }

    setUploadedFile(file);
    setStep("analyzing");
    setLoading(true);

    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const mediaType = file.type.includes("pdf") ? "application/pdf" : file.type;
      
      const response = await fetch("/api/document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "upload", mediaType, base64 })
      });

      const data = await response.json();
      let reply = (data.text || "").trim();
      
      const firstBrace = reply.indexOf("{");
      const lastBrace = reply.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1) {
        const jsonStr = reply.substring(firstBrace, lastBrace + 1);
        const extracted = JSON.parse(jsonStr);
        setExtractedData(extracted);
        
        setMessages([{
          role: "assistant",
          content: `Great! I've analyzed the complaint filed against you by ${extracted.plaintiff}. Now I need to ask you a few questions to complete your Answer. Let's start: Do you admit or deny that you owe this debt?`
        }]);
        setStep("chat");
      } else {
        throw new Error("Could not extract data from complaint");
      }
    } catch (error) {
      console.error("Analysis error:", error);
      alert("I had trouble reading that document. Please make sure it's a clear image or PDF of the complaint, then try again.");
      setStep("upload");
    } finally {
      setLoading(false);
    }
  };

  // DEFENSE CHAT HANDLER (after extraction)
  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const conversationHistory = [...messages, { role: "user", content: userMessage }].map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch("/api/document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "defense-chat", extractedData, messages: conversationHistory })
      });

      const data = await response.json();
      let reply = (data.text || "").trim();
      reply = reply.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

      const firstBrace = reply.indexOf("{");
      const lastBrace = reply.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && reply.includes("\"ready\"")) {
        const jsonStr = reply.substring(firstBrace, lastBrace + 1);
        const parsed = JSON.parse(jsonStr);
        if (parsed.ready) {
          setFormData(parsed);
          await generateDocument(parsed);
          return;
        }
      }

      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I had trouble processing that. Could you rephrase your answer?"
      }]);
    } finally {
      setLoading(false);
    }
  };

  // DOCUMENT GENERATION (Solution 3 - Text format)
  const generateDocument = async (formData) => {
    setStep("generating");
    setLoading(true);

    try {
      const response = await fetch("/api/document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "generate", extractedData, formData })
      });

      const data = await response.json();
      const docText = (data.text || "").trim();
      
      setDocumentText(docText);
      setStep("preview");
    } catch (error) {
      console.error("Document generation error:", error);
      alert("There was an error generating the document. Please try again.");
      setStep("chat");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([documentText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Answer_to_Complaint_${extractedData.caseNumber || "Draft"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveToAccount = () => {
    if (!currentUser) {
      alert("Please log in or create an account to save documents.");
      return;
    }
    onSave({
      type: "Answer to Debt Collection Complaint",
      caseNumber: extractedData.caseNumber,
      plaintiff: extractedData.plaintiff,
      documentText: documentText,
      createdAt: new Date().toISOString()
    });
    alert("Document saved to your account!");
  };

  // RENDER DIFFERENT STEPS
  if (step === "method-select") {
    return (
      <div className="summary-page">
        <h2>Answer to Debt Collection Complaint</h2>
        <p>Choose how you'd like to provide your complaint information</p>

        <div className="entry-methods">
          <div className="entry-method" onClick={handleUploadChoice}>
            <div className="entry-method-icon" style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--navy)", letterSpacing: "0.5px" }}>Upload</div>
            <h3>Upload Document</h3>
            <p>Upload a PDF or image of your complaint and I'll automatically extract the information</p>
          </div>

          <div className="entry-method" onClick={handleManualChoice}>
            <div className="entry-method-icon" style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--navy)", letterSpacing: "0.5px" }}>Type</div>
            <h3>Type Information</h3>
            <p>I'll ask you questions and you can type the information from your paper complaint</p>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <button className="btn btn-secondary" onClick={onBack}>Back to Services</button>
        </div>
      </div>
    );
  }

  if (step === "upload") {
    return (
      <div className="summary-page">
        <h2>Upload Your Complaint</h2>
        <p>Upload a PDF or clear image of the debt collection complaint filed against you.</p>

        <div className="summary-card">
          <div className="summary-body" style={{ padding: "40px", textAlign: "center" }}>
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--navy)", marginBottom: "16px" }}>Upload</div>
              <p style={{ color: "var(--muted)", marginBottom: "24px" }}>
                Upload a PDF or clear image of the debt collection complaint filed against you in Montana court.
              </p>
            </div>
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={handleFileUpload}
              style={{ display: "none" }}
              id="file-upload"
            />
            <label htmlFor="file-upload" className="btn btn-primary" style={{ cursor: "pointer", display: "inline-block" }}>
              Choose File to Upload
            </label>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <button className="btn btn-secondary" onClick={() => setStep("method-select")}>Back</button>
        </div>
      </div>
    );
  }

  if (step === "manual-entry") {
    return (
      <div className="chat-page">
        <div className="chat-header">
          <h2>Enter Complaint Information</h2>
          <p>I'll ask you questions to gather the details from your complaint</p>
        </div>

        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              <div className="message-avatar">{msg.role === "assistant" ? "W" : "You"}</div>
              <div className="message-bubble">{msg.content}</div>
            </div>
          ))}
          {loading && (
            <div className="message assistant">
              <div className="message-avatar">W</div>
              <div className="message-bubble">
                <div className="typing-indicator"><span></span><span></span><span></span></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-wrapper">
          <input
            type="text"
            className="chat-input"
            placeholder="Type your answer..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === "Enter" && sendManualEntryMessage()}
            disabled={loading}
          />
          <button className="chat-send" onClick={sendManualEntryMessage} disabled={loading || !input.trim()}>
            Send
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: "16px" }}>
          <button className="btn btn-secondary" onClick={() => setStep("method-select")}>Back</button>
        </div>
      </div>
    );
  }

  if (step === "analyzing") {
    return (
      <div className="summary-page">
        <h2>Analyzing Your Complaint...</h2>
        <div className="summary-card">
          <div className="summary-body" style={{ padding: "60px", textAlign: "center" }}>
            <div className="typing-indicator" style={{ justifyContent: "center", marginBottom: "16px" }}>
              <span></span><span></span><span></span>
            </div>
            <p style={{ color: "var(--muted)" }}>Reading the complaint and extracting key information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === "chat") {
    return (
      <div className="chat-page">
        <div className="chat-header">
          <h2>Complete Your Answer</h2>
          <p>Answer a few questions to finish your court document</p>
        </div>

        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              <div className="message-avatar">{msg.role === "assistant" ? "W" : "You"}</div>
              <div className="message-bubble">{msg.content}</div>
            </div>
          ))}
          {loading && (
            <div className="message assistant">
              <div className="message-avatar">W</div>
              <div className="message-bubble">
                <div className="typing-indicator"><span></span><span></span><span></span></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-wrapper">
          <input
            type="text"
            className="chat-input"
            placeholder="Type your answer..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === "Enter" && sendMessage()}
            disabled={loading}
          />
          <button className="chat-send" onClick={sendMessage} disabled={loading || !input.trim()}>
            Send
          </button>
        </div>
      </div>
    );
  }

  if (step === "generating") {
    return (
      <div className="summary-page">
        <h2>Generating Your Answer...</h2>
        <div className="summary-card">
          <div className="summary-body" style={{ padding: "60px", textAlign: "center" }}>
            <div className="typing-indicator" style={{ justifyContent: "center", marginBottom: "16px" }}>
              <span></span><span></span><span></span>
            </div>
            <p style={{ color: "var(--muted)" }}>Creating your court-ready Answer document...</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === "preview") {
    return (
      <div className="summary-page">
        <h2>Your Answer is Ready!</h2>
        <p>Review the document below, then download or save to your account.</p>

        <div className="summary-card">
          <div className="summary-header">
            <h3>Answer to Complaint - Case {extractedData.caseNumber}</h3>
          </div>
          <div className="summary-body">
            <div className="summary-section">
              <h4>Case Information</h4>
              <div className="summary-row"><strong>Court:</strong> {extractedData.court}</div>
              <div className="summary-row"><strong>County:</strong> {extractedData.county}</div>
              <div className="summary-row"><strong>Case Number:</strong> {extractedData.caseNumber}</div>
              <div className="summary-row"><strong>Plaintiff:</strong> {extractedData.plaintiff}</div>
              <div className="summary-row"><strong>Defendant:</strong> {extractedData.defendant}</div>
            </div>
            <div className="summary-section">
              <h4>Your Response</h4>
              <div className="summary-row"><strong>Response Type:</strong> {formData.responseType}</div>
              {formData.affirmativeDefenses?.length > 0 && (
                <div className="summary-row">
                  <strong>Affirmative Defenses:</strong> {formData.affirmativeDefenses.join(", ")}
                </div>
              )}
              <div className="summary-row"><strong>Jury Trial:</strong> {formData.juryDemand ? "Yes" : "No"}</div>
            </div>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-header">
            <h3>Document Preview</h3>
          </div>
          <div className="document-preview">
            {documentText}
          </div>
        </div>

        <div className="summary-actions">
          <button className="btn btn-secondary" onClick={() => setStep("chat")}>Back to Edit</button>
          <button className="btn btn-primary" onClick={handleDownload} style={{ marginLeft: "12px" }}>
            Save as Draft
          </button>
          {!currentUser && (
            <button className="btn btn-primary" onClick={() => {
              onCreateAccount({
                extractedData,
                formData,
                documentText
              });
            }} style={{ marginLeft: "12px" }}>
              Create Account & Save
            </button>
          )}
          {currentUser && (
            <button className="btn btn-primary" onClick={handleSaveToAccount} style={{ marginLeft: "12px" }}>
              Save to My Account
            </button>
          )}
        </div>
      </div>
    );
  }
}

// ─── CAREERS PAGE ────────────────────────────────────────────
function CareersPage({ onSubmit, onBack }) {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.message) {
      alert("Please fill out all fields.");
      return;
    }
    setLoading(true);
    await onSubmit({ type: "career", ...formData });
    setSubmitted(true);
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="static-page" style={{ textAlign: "center", paddingTop: "40px" }}>
        <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "var(--success)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: "1.2rem", fontWeight: 700 }}>✓</div>
        <h2>Application Received</h2>
        <p style={{ marginTop: "12px", marginBottom: "32px" }}>Thanks for your interest in joining the WALT team. We'll be in touch if there's a fit.</p>
        <button className="btn btn-secondary" onClick={onBack}>Back to Home</button>
      </div>
    );
  }

  return (
    <div className="static-page">
      <h2>Join Our Team</h2>
      <p>WALT is building Montana's legal marketplace. We're always interested in talented, mission-driven people.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px", marginBottom: "40px" }}>
        {[
          { role: "Legal Operations", desc: "Help build attorney relationships and marketplace quality." },
          { role: "Software Development", desc: "Build the platform that expands access to justice in Montana." },
          { role: "Marketing & Outreach", desc: "Connect Montanans with legal resources they didn't know existed." },
          { role: "Other", desc: "Have a skill that would help WALT's mission? Tell us about it." },
        ].map(r => (
          <div key={r.role} style={{ background: "#fff", border: "1px solid var(--sand)", borderRadius: "12px", padding: "20px" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--gold)", marginBottom: "6px" }}>{r.role}</div>
            <p style={{ fontSize: "0.82rem", color: "var(--charcoal)", lineHeight: "1.6" }}>{r.desc}</p>
          </div>
        ))}
      </div>

      <div className="contact-form">
        <h3 style={{ fontSize: "1.2rem", color: "var(--navy)", marginBottom: "20px" }}>Tell Us About Yourself</h3>
        <div className="form-group">
          <label>Full Name *</label>
          <input type="text" placeholder="Your name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Email Address *</label>
          <input type="email" placeholder="your.email@example.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Why would you be a great addition to the WALT team? *</label>
          <textarea
            placeholder="Tell us about your background, what draws you to WALT's mission, and what you'd bring to the team. No resume required — just be genuine."
            value={formData.message}
            onChange={e => setFormData({ ...formData, message: e.target.value })}
            style={{ minHeight: "160px" }}
          />
        </div>
        <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
          <button className="btn btn-secondary" onClick={onBack}>Back</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? "Submitting..." : "Submit Application"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CONTACT PAGE ─────────────────────────────────────────────
function ContactPage({ onSubmit, onBack }) {
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.message) {
      alert("Please fill out all required fields.");
      return;
    }
    setLoading(true);
    await onSubmit({ type: "contact", ...formData });
    setSubmitted(true);
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="static-page" style={{ textAlign: "center", paddingTop: "40px" }}>
        <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "var(--success)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: "1.2rem", fontWeight: 700 }}>✓</div>
        <h2>Message Sent</h2>
        <p style={{ marginTop: "12px", marginBottom: "32px" }}>We've received your message and will get back to you as soon as possible.</p>
        <button className="btn btn-secondary" onClick={onBack}>Back to Home</button>
      </div>
    );
  }

  return (
    <div className="static-page">
      <h2>Contact Us</h2>
      <p>Questions, feedback, or just want to connect? We'd love to hear from you.</p>

      <div className="contact-form">
        <div className="form-group">
          <label>Full Name *</label>
          <input type="text" placeholder="Your name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Email Address *</label>
          <input type="email" placeholder="your.email@example.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Subject</label>
          <input type="text" placeholder="e.g., Question about the platform, Attorney inquiry..." value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Message *</label>
          <textarea
            placeholder="How can we help?"
            value={formData.message}
            onChange={e => setFormData({ ...formData, message: e.target.value })}
          />
        </div>
        <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
          <button className="btn btn-secondary" onClick={onBack}>Back</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? "Sending..." : "Send Message"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SERVICES PAGE ──────────────────────────────────────────
function ServicesPage({ onServiceClick }) {
  const services = [
    {
      icon: "Forms", 
      title: "Answer to Debt Collection Complaint",
      desc: "Upload your debt collection complaint or type the information, and we'll help you prepare a complete Answer to file with the court.",
      future: "Click to get started with our AI-powered document assistant.",
      clickable: true,
      action: "debt-answer"
    },
    {
      icon: "Templates", title: "Legal Document Templates",
      desc: "Montana-compliant legal document templates for various situations.",
      future: "Future: Interactive document builder with county-specific provisions."
    },
    {
      icon: "Deadlines", title: "Deadline Calculator",
      desc: "Calculate Montana statutory deadlines for filings, responses, and notices.",
      future: "Future: Automated calendar sync with deadline reminders and alerts."
    },
    {
      icon: "Search", title: "Court Records Access",
      desc: "Quick links to Montana court systems for case lookup and filing.",
      future: "Future: Direct API integration for real-time case status updates."
    }
  ];

  return (
    <div className="services-page">
      <h2>Self-Service Tools</h2>
      <p>AI-powered legal document assistance for Montana</p>
      <div className="services-grid">
        {services.map((s, i) => (
          <div 
            className="service-card" 
            key={i}
            onClick={s.clickable ? () => onServiceClick(s.action) : undefined}
            style={s.clickable ? { cursor: "pointer", borderColor: "var(--gold)", borderStyle: "solid" } : {}}
          >
            {!s.clickable && <span className="placeholder-tag">Coming Soon</span>}
            {s.clickable && <span className="placeholder-tag" style={{ background: "var(--gold)" }}>Available Now</span>}
            <div className="svc-icon">{s.icon}</div>
            <h4>{s.title}</h4>
            <p>{s.desc}</p>
            <p className="future-note">{s.clickable ? s.future : `Future: ${s.future}`}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ATTORNEY PROFILE PAGE ───────────────────────────────────
function AttorneyProfile({ attorney, onBack }) {
  if (!attorney) return null;
  const tierLabel = attorney.tier === "gold" ? "Gold" : attorney.tier === "silver" ? "Silver" : "Free";

  return (
    <div className="profile-page">
      <button className="btn btn-secondary" style={{ marginBottom: "20px", fontSize: "0.82rem", padding: "7px 18px" }} onClick={onBack}>
        ← Back
      </button>

      <div className="profile-header">
        <div className="profile-name">{attorney.name}</div>
        <div className="profile-firm">{attorney.firm || "Solo Practice"}</div>
        <div className="profile-badges">
          <span className={`profile-badge ${attorney.tier === "gold" ? "gold" : ""}`}>{tierLabel} Member</span>
          {attorney.barNumber && <span className="profile-badge">Bar #{attorney.barNumber}</span>}
          {attorney.phone && <span className="profile-badge">{attorney.phone}</span>}
        </div>
      </div>

      <div className="profile-body">
        {/* Stats row — only show if data exists */}
        {(attorney.winRate || attorney.avgCaseValue || attorney.bidsThisMonth !== undefined) && (
          <div className="profile-stat-row">
            {attorney.winRate && (
              <div className="profile-stat">
                <div className="profile-stat-val">{attorney.winRate}</div>
                <div className="profile-stat-lbl">Win Rate</div>
              </div>
            )}
            {attorney.avgCaseValue && (
              <div className="profile-stat">
                <div className="profile-stat-val">{attorney.avgCaseValue}</div>
                <div className="profile-stat-lbl">Avg. Case Value</div>
              </div>
            )}
            {attorney.casesWonThisMonth !== undefined && (
              <div className="profile-stat">
                <div className="profile-stat-val">{attorney.casesWonThisMonth}</div>
                <div className="profile-stat-lbl">Cases Won This Month</div>
              </div>
            )}
            {attorney.yearsExperience && (
              <div className="profile-stat">
                <div className="profile-stat-val">{attorney.yearsExperience}</div>
                <div className="profile-stat-lbl">Years Experience</div>
              </div>
            )}
          </div>
        )}

        {attorney.bio && (
          <div className="profile-section">
            <h4>About</h4>
            <p>{attorney.bio}</p>
          </div>
        )}

        {attorney.practiceAreas?.length > 0 && (
          <div className="profile-section">
            <h4>Practice Areas</h4>
            <div className="profile-areas">
              {attorney.practiceAreas.map(a => (
                <span key={a} className="profile-area-tag">{a}</span>
              ))}
            </div>
          </div>
        )}

        {attorney.feeStructure && (
          <div className="profile-section">
            <h4>Fee Structure</h4>
            <p>{attorney.feeStructure}</p>
          </div>
        )}

        {attorney.approach && (
          <div className="profile-section">
            <h4>My Approach</h4>
            <p>{attorney.approach}</p>
          </div>
        )}

        {attorney.counties && (
          <div className="profile-section">
            <h4>Counties Served</h4>
            <p>{attorney.counties}</p>
          </div>
        )}

        <div className="profile-section">
          <h4>Contact</h4>
          <p>
            {attorney.email && <><strong>Email:</strong> {attorney.email}<br /></>}
            {attorney.phone && <><strong>Phone:</strong> {attorney.phone}</>}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN COMMAND CENTER ────────────────────────────────────
function AdminCommandCenter({ signups, cases, analytics, onApproveAttorney, onDenyAttorney, onDeleteAccount, onChangeTier, onRefresh }) {
  const [tab, setTab] = useState("overview");
  const [approvalTiers, setApprovalTiers] = useState({});
  const [attyTab, setAttyTab] = useState("pending");

  const attorneys = (signups || []).filter(s => s.type === "attorney");
  const clients = (signups || []).filter(s => s.type === "client");
  const pending = attorneys.filter(s => s.status === "pending");
  const approved = attorneys.filter(s => s.status === "approved");
  const denied = attorneys.filter(s => s.status === "denied");
  const contacts = (analytics?.messages || []).filter(m => m.type === "contact");
  const careers = (analytics?.messages || []).filter(m => m.type === "career");
  const clicks = analytics?.clicks || [];
  const totalBids = cases.reduce((sum, c) => sum + (c.bids?.length || 0), 0);

  const tierColor = t => t === "gold" ? "var(--gold)" : t === "silver" ? "#64748B" : "var(--sage)";
  const tierBg = t => t === "gold" ? "rgba(197,165,114,0.12)" : t === "silver" ? "rgba(148,163,184,0.12)" : "rgba(107,127,124,0.1)";

  const attyRows = { pending, approved, denied }[attyTab] || [];

  return (
    <div className="admin-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <h2>Command Center</h2>
          <p style={{ fontSize: "0.88rem", color: "var(--muted)" }}>WALT platform overview — j.davies admin</p>
        </div>
        <button className="btn btn-secondary" style={{ fontSize: "0.8rem", padding: "8px 20px" }} onClick={onRefresh}>↻ Refresh</button>
      </div>

      {/* KPI tiles */}
      <div className="admin-kpi-grid">
        {[
          { label: "Total Attorneys", value: attorneys.length, sub: `${pending.length} pending approval` },
          { label: "Approved Attorneys", value: approved.length, sub: `${denied.length} denied` },
          { label: "Registered Clients", value: clients.length, sub: "all time" },
          { label: "Cases Submitted", value: cases.length, sub: "all time" },
          { label: "Total Bids", value: totalBids, sub: "across all cases" },
          { label: "Messages", value: contacts.length, sub: `${careers.length} career apps` },
          { label: "Page Clicks", value: analytics?.totalClicks || 0, sub: "tracked interactions" },
        ].map(k => (
          <div className="admin-kpi" key={k.label}>
            <div className="admin-kpi-label">{k.label}</div>
            <div className="admin-kpi-value">{k.value}</div>
            <div className="admin-kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Tab nav */}
      <div className="admin-tabs">
        {[
          { key: "overview", label: "Overview" },
          { key: "attorneys", label: `Attorneys (${attorneys.length})` },
          { key: "clients", label: `Clients (${clients.length})` },
          { key: "contacts", label: `Messages (${contacts.length + careers.length})` },
          { key: "activity", label: "Activity" },
        ].map(t => (
          <button key={t.key} className={`admin-tab ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === "overview" && (
        <div className="admin-section">
          <h3>Recent Cases</h3>
          {cases.length === 0 ? <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>No cases yet.</p> : (
            <table className="clicks-table">
              <thead><tr><th>Case ID</th><th>Category</th><th>County</th><th>Client</th><th>Bids</th><th>Submitted</th></tr></thead>
              <tbody>
                {cases.slice(0, 15).map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600, color: "var(--navy)", fontSize: "0.75rem" }}>{c.id}</td>
                    <td>{c.category}</td>
                    <td>{c.county}</td>
                    <td>{c.clientFirstName} {c.clientLastInitial}.</td>
                    <td>{c.bids?.length || 0}</td>
                    <td style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{new Date(c.submittedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ATTORNEYS */}
      {tab === "attorneys" && (
        <div className="admin-section">
          <h3>Attorney Applications</h3>
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            {[
              { key: "pending", label: `Pending (${pending.length})` },
              { key: "approved", label: `Approved (${approved.length})` },
              { key: "denied", label: `Denied (${denied.length})` },
            ].map(t => (
              <button key={t.key} onClick={() => setAttyTab(t.key)} style={{
                padding: "5px 14px", fontSize: "0.75rem", fontWeight: 600,
                border: `1.5px solid ${attyTab === t.key ? "var(--navy)" : "var(--sand)"}`,
                borderRadius: "50px", background: attyTab === t.key ? "var(--navy)" : "transparent",
                color: attyTab === t.key ? "#fff" : "var(--charcoal)", cursor: "pointer", fontFamily: "inherit"
              }}>{t.label}</button>
            ))}
          </div>
          {attyRows.length === 0 ? <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>No {attyTab} attorneys.</p> : (
            <table className="clicks-table">
              <thead><tr><th>Name</th><th>Username / Email</th><th>Bar # / Firm</th><th>Tier</th><th>Applied</th><th>Actions</th></tr></thead>
              <tbody>
                {attyRows.map((s, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                    <td>
                      {s.username && <div style={{ fontWeight: 600, color: "var(--navy)", fontSize: "0.78rem" }}>@{s.username}</div>}
                      <div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{s.email}</div>
                    </td>
                    <td style={{ fontSize: "0.75rem" }}>
                      <div>Bar #{s.barNumber || "—"}</div>
                      <div style={{ color: "var(--muted)" }}>{s.firm || "Solo"}</div>
                    </td>
                    <td>
                      {attyTab === "approved" ? (
                        <select value={s.tier || "free"} onChange={e => onChangeTier(s.email, e.target.value)} style={{ padding: "3px 7px", borderRadius: "6px", border: `1.5px solid ${tierColor(s.tier || "free")}`, color: tierColor(s.tier || "free"), background: tierBg(s.tier || "free"), fontSize: "0.73rem", fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}>
                          <option value="free">Free</option><option value="silver">Silver</option><option value="gold">Gold</option>
                        </select>
                      ) : attyTab === "pending" ? (
                        <select value={approvalTiers[s.email] || "free"} onChange={e => setApprovalTiers(prev => ({ ...prev, [s.email]: e.target.value }))} style={{ padding: "3px 7px", borderRadius: "6px", border: "1.5px solid var(--sand)", fontSize: "0.73rem", fontFamily: "inherit", cursor: "pointer" }}>
                          <option value="free">Free</option><option value="silver">Silver</option><option value="gold">Gold</option>
                        </select>
                      ) : <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>—</span>}
                    </td>
                    <td style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: "flex", gap: "5px" }}>
                        {attyTab === "pending" && (
                          <>
                            <button onClick={() => onApproveAttorney(s.email, approvalTiers[s.email] || "free")} style={{ padding: "3px 10px", fontSize: "0.7rem", fontWeight: 600, border: "none", borderRadius: "50px", background: "var(--success)", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>Approve</button>
                            <button onClick={() => onDenyAttorney(s.email)} style={{ padding: "3px 10px", fontSize: "0.7rem", fontWeight: 600, border: "1px solid var(--danger)", borderRadius: "50px", background: "transparent", color: "var(--danger)", cursor: "pointer", fontFamily: "inherit" }}>Deny</button>
                          </>
                        )}
                        <button onClick={() => onDeleteAccount(s.email)} style={{ padding: "3px 10px", fontSize: "0.7rem", fontWeight: 600, border: "1px solid var(--sand)", borderRadius: "50px", background: "transparent", color: "var(--muted)", cursor: "pointer", fontFamily: "inherit" }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* CLIENTS */}
      {tab === "clients" && (
        <div className="admin-section">
          <h3>Registered Clients</h3>
          {clients.length === 0 ? <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>No client accounts yet.</p> : (
            <table className="clicks-table">
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Registered</th><th>Actions</th></tr></thead>
              <tbody>
                {clients.map((s, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                    <td style={{ color: "var(--muted)", fontSize: "0.78rem" }}>{s.email}</td>
                    <td style={{ color: "var(--muted)", fontSize: "0.78rem" }}>{s.phone || "—"}</td>
                    <td style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                    <td><button onClick={() => onDeleteAccount(s.email)} style={{ padding: "3px 10px", fontSize: "0.7rem", fontWeight: 600, border: "1px solid var(--sand)", borderRadius: "50px", background: "transparent", color: "var(--muted)", cursor: "pointer", fontFamily: "inherit" }}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* MESSAGES */}
      {tab === "contacts" && (
        <div>
          <div className="admin-section">
            <h3>Contact Messages ({contacts.length})</h3>
            {contacts.length === 0 ? <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>No messages yet.</p>
              : contacts.map((m, i) => (
                <div className="admin-msg-card" key={i}>
                  <div className="admin-msg-meta">
                    <strong>{m.name}</strong> · {m.email}{m.subject ? ` · "${m.subject}"` : ""}
                    <span style={{ float: "right" }}>{new Date(m.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="admin-msg-body">{m.message}</div>
                </div>
              ))}
          </div>
          <div className="admin-section">
            <h3>Career Applications ({careers.length})</h3>
            {careers.length === 0 ? <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>No applications yet.</p>
              : careers.map((m, i) => (
                <div className="admin-msg-card" key={i}>
                  <div className="admin-msg-meta">
                    <strong>{m.name}</strong> · {m.email}
                    <span style={{ float: "right" }}>{new Date(m.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="admin-msg-body">{m.message}</div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ACTIVITY */}
      {tab === "activity" && (
        <div className="admin-section">
          <h3>Click Activity</h3>
          {clicks.length === 0 ? <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>No click data yet.</p> : (
            <>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
                {Object.entries(clicks.reduce((acc, c) => { acc[c.page] = (acc[c.page] || 0) + 1; return acc; }, {}))
                  .sort((a, b) => b[1] - a[1]).map(([pg, count]) => (
                    <div key={pg} style={{ background: "var(--cream)", border: "1px solid var(--sand)", borderRadius: "8px", padding: "10px 16px" }}>
                      <div style={{ fontWeight: 700, color: "var(--navy)", fontSize: "1rem" }}>{count}</div>
                      <div style={{ color: "var(--muted)", fontSize: "0.72rem" }}>{pg}</div>
                    </div>
                  ))}
              </div>
              <table className="clicks-table">
                <thead><tr><th>Time</th><th>Page</th><th>Element</th></tr></thead>
                <tbody>
                  {clicks.slice(0, 50).map((c, i) => (
                    <tr key={i}>
                      <td style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{new Date(c.ts).toLocaleString()}</td>
                      <td>{c.page}</td>
                      <td style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{c.element}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════
export default function App() {
  const [page, setPage] = useState("landing");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginType, setLoginType] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [caseData, setCaseData] = useState(null);
  
  // Initialize with demo cases (timestamps dynamically generated to stay fresh)
  const [cases, setCases] = useState(() => [
    {
      id: "MT-1740000001",
      summary: "Client was rear-ended at a stoplight on Reserve Street in Missoula. Police report confirms other driver was texting and failed to brake. Client has $28,000 in medical bills from resulting neck and back injuries, missed 6 weeks of work. Other driver has State Farm insurance with $250k liability coverage. Client has all medical documentation organized and is eager to settle.",
      category: "Personal Injury",
      county: "Missoula",
      isPremium: true,
      clientFirstName: "Sarah",
      clientLastInitial: "M",
      clientPhone: "(406) 555-9001",
      clientEmail: "sarah.m.demo@example.com",
      bids: [],
      submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      assessmentPending: false,
      assessment: {
        assessmentType: "valuation",
        estimatedValue: "$85,000 – $130,000",
        confidence: "High",
        confidenceReason: "Clear liability via police report, documented medical bills, and confirmed insurance coverage combine for a strong damages picture.",
        liabilityScore: 5,
        damagesScore: 4,
        collectibilityScore: 5,
        overallScore: 5,
        keyStrengths: ["Police report confirms fault", "Insurance coverage verified at $250k", "Organized medical documentation"],
        keyRisks: ["Neck/back injuries may face soft-tissue skepticism", "Pre-existing conditions unknown"],
        typicalContingencyRate: "33%",
        estimatedAttorneyFee: "$28,000 – $43,000"
      }
    },
    {
      id: "MT-1739900002",
      summary: "Client was terminated from manufacturing job after reporting safety violations to OSHA. Has emails documenting complaints and subsequent retaliation. Employer is mid-size company with 200+ employees. Seeking wrongful termination and whistleblower protection claim. Lost wages approximately $52,000/year.",
      category: "Employment Law",
      county: "Yellowstone",
      isPremium: true,
      clientFirstName: "Michael",
      clientLastInitial: "R",
      clientPhone: "(406) 555-9002",
      clientEmail: "michael.r.demo@example.com",
      bids: [],
      submittedAt: new Date(Date.now() - 55 * 60 * 60 * 1000).toISOString(),
      assessmentPending: false,
      assessment: {
        assessmentType: "valuation",
        estimatedValue: "$60,000 – $95,000",
        confidence: "Moderate",
        confidenceReason: "Strong documentary evidence of retaliation, though employer size and arbitration clauses may limit recovery.",
        liabilityScore: 4,
        damagesScore: 4,
        collectibilityScore: 4,
        overallScore: 4,
        keyStrengths: ["Documented email trail of complaints and retaliation", "OSHA report creates public record", "Clear lost wages calculation at $52k/yr"],
        keyRisks: ["Employment contract may contain arbitration clause", "Montana is at-will — whistleblower claim is primary theory"],
        typicalContingencyRate: "40%",
        estimatedAttorneyFee: "$24,000 – $38,000"
      }
    },
    {
      id: "MT-1739800003",
      summary: "Client is being sued by Portfolio Recovery Associates for an alleged credit card debt of $4,200 from 2018. Client believes the debt was already paid and has bank records showing payments. Needs help filing an Answer and defending against the collection lawsuit. Court date is in 18 days.",
      category: "Credit Default / Debt Collection",
      county: "Cascade",
      isPremium: false,
      clientFirstName: "Jennifer",
      clientLastInitial: "T",
      clientPhone: "(406) 555-9003",
      clientEmail: "jennifer.t.demo@example.com",
      bids: [],
      submittedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      assessmentPending: false,
      assessment: {
        assessmentType: "hours",
        estimatedHours: "4 – 8 hours",
        complexity: "Moderate",
        complexityReason: "Client has supporting bank records which strengthens the defense, but the 18-day court deadline adds time pressure.",
        overallScore: 3,
        phases: [
          { phase: "Document Review & Answer Drafting", hours: "1 – 2 hrs", description: "Review complaint, analyze bank records, draft and file Answer with affirmative defenses" },
          { phase: "Discovery / Evidence Prep", hours: "1 – 2 hrs", description: "Organize payment documentation, request debt validation from plaintiff" },
          { phase: "Hearing Preparation & Appearance", hours: "2 – 4 hrs", description: "Prepare client, attend hearing, present payment defense" }
        ],
        keyConsiderations: ["18-day deadline requires immediate action", "Bank records are strong evidence if payments are clearly documented", "Portfolio Recovery may lack original creditor documentation"],
        likelyOutcome: "Strong candidate for dismissal or negotiated settlement given client's payment evidence and plaintiff's likely inability to produce original account records."
      }
    }
  ]);
  
  const [isGuestFlow, setIsGuestFlow] = useState(false);
  const [savedDocuments, setSavedDocuments] = useState([]);
  const [showPortalDropdown, setShowPortalDropdown] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [pendingDocument, setPendingDocument] = useState(null);
  const [casesLoading, setCasesLoading] = useState(false);
  const [signups, setSignups] = useState([]);
  const [analytics, setAnalytics] = useState({ clicks: [], messages: [], totalClicks: 0 });
  const [viewingProfile, setViewingProfile] = useState(null); // attorney object to display

  // ── CLICK TRACKING ────────────────────────────────────────
  // Attaches a global listener on mount; fires fire-and-forget POST
  // to /api/events for every click. Captures page + element label.
  const pageRef = useRef(page);
  useEffect(() => { pageRef.current = page; }, [page]);

  useEffect(() => {
    const handleClick = (e) => {
      const el = e.target;
      const label = el.innerText?.trim().slice(0, 60)
        || el.getAttribute("aria-label")
        || el.className?.toString().slice(0, 40)
        || el.tagName;
      fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "track-click", page: pageRef.current, element: label, ts: Date.now() })
      }).catch(() => {});
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // ── LOAD CASES FROM KV ON MOUNT ───────────────────────────
  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    setCasesLoading(true);
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get-cases" })
      });
      const data = await res.json();
      if (data.cases && data.cases.length > 0) {
        // Merge KV cases with demo cases, KV takes priority
        setCases(prev => {
          const kvIds = new Set(data.cases.map(c => c.id));
          const demoCases = prev.filter(c => !kvIds.has(c.id));
          return [...data.cases, ...demoCases];
        });
      }
    } catch (e) {
      console.error("Failed to load cases:", e);
    } finally {
      setCasesLoading(false);
    }
  };

  // ── LOAD SIGNUPS FOR ADMIN (j.davies only) ────────────────
  const loadSignups = async (email) => {
    if (email !== "j.davies@daviesinjurylaw.com") return;
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get-signups", email })
      });
      const data = await res.json();
      if (data.signups) setSignups(data.signups);
    } catch (e) {
      console.error("Failed to load signups:", e);
    }
  };

  // ── LOAD ANALYTICS FOR ADMIN ──────────────────────────────
  const loadAnalytics = async () => {
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get-analytics" })
      });
      const data = await res.json();
      if (data.analytics) setAnalytics(data.analytics);
    } catch (e) {
      console.error("Failed to load analytics:", e);
    }
  };

  // ── HANDLE CONTACT / CAREER SUBMISSION ────────────────────
  const handleMessage = async (formData) => {
    try {
      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit-message", ...formData, createdAt: new Date().toISOString() })
      });
    } catch (e) {
      console.error("Failed to submit message:", e);
    }
  };

  // ── ADMIN REFRESH ─────────────────────────────────────────
  const handleAdminRefresh = async () => {
    await Promise.all([loadSignups(currentUser?.email), loadAnalytics(), loadCases()]);
  };

  // ── ATTORNEY PROFILE UPDATE ───────────────────────────────
  const handleUpdateProfile = async (profileData) => {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-profile", email: currentUser.email, profileData })
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Failed to save profile."); return; }
      // Update local currentUser so the edit panel pre-populates correctly
      setCurrentUser(prev => ({ ...prev, ...profileData }));
    } catch (e) {
      console.error("Profile update error:", e);
      alert("Failed to save profile. Please try again.");
    }
  };

  // ── VIEW ATTORNEY PROFILE ─────────────────────────────────
  // Looks up attorney by email from known cases/signups, then shows profile
  const handleViewProfile = async (attorneyEmail) => {
    // Check signups list first (admin has this; attorneys have their own data)
    const fromSignups = signups.find(s => s.email === attorneyEmail);
    if (fromSignups) { setViewingProfile(fromSignups); setPage("attorney-profile"); return; }

    // Try fetching from the auth API
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get-attorney-profile", email: attorneyEmail })
      });
      const data = await res.json();
      if (res.ok && data.attorney) {
        setViewingProfile(data.attorney);
        setPage("attorney-profile");
      }
    } catch (e) {
      console.error("Failed to load profile:", e);
    }
  };

  // ── ADMIN: APPROVE ATTORNEY ───────────────────────────────
  const handleApproveAttorney = async (attorneyEmail, tier) => {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve-attorney", email: attorneyEmail, tier, callerEmail: currentUser.email })
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Approval failed."); return; }
      // Refresh signups list
      await loadSignups(currentUser.email);
    } catch (e) {
      console.error("Approve error:", e);
      alert("Approval failed. Please try again.");
    }
  };

  // ── ADMIN: DENY ATTORNEY ──────────────────────────────────
  const handleDenyAttorney = async (attorneyEmail) => {
    if (!window.confirm("Deny this application? The account will be marked as denied.")) return;
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deny-attorney", email: attorneyEmail, callerEmail: currentUser.email })
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Action failed."); return; }
      await loadSignups(currentUser.email);
    } catch (e) {
      console.error("Deny error:", e);
      alert("Action failed. Please try again.");
    }
  };

  // ── ADMIN: DELETE ACCOUNT ─────────────────────────────────
  const handleDeleteAccount = async (accountEmail) => {
    if (!window.confirm(`Permanently delete the account for ${accountEmail}? This cannot be undone.`)) return;
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-account", email: accountEmail, callerEmail: currentUser.email })
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Delete failed."); return; }
      await loadSignups(currentUser.email);
    } catch (e) {
      console.error("Delete error:", e);
      alert("Delete failed. Please try again.");
    }
  };

  // ── ADMIN: CHANGE TIER ────────────────────────────────────
  const handleChangeTier = async (attorneyEmail, newTier) => {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-tier", email: attorneyEmail, tier: newTier, callerEmail: currentUser.email })
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Tier change failed."); return; }
      await loadSignups(currentUser.email);
    } catch (e) {
      console.error("Tier change error:", e);
      alert("Tier change failed. Please try again.");
    }
  };

  // Close portal dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showPortalDropdown && !e.target.closest('.nav-links')) {
        setShowPortalDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showPortalDropdown]);

  const handleNavClick = (key) => {
    if (key === "portal") {
      setShowPortalDropdown(!showPortalDropdown);
    } else if (key === "login-attorney") {
      setLoginType("attorney");
      setShowLoginModal(true);
      setShowPortalDropdown(false);
    } else if (key === "login-client") {
      setLoginType("client");
      setShowLoginModal(true);
      setShowPortalDropdown(false);
    } else if (key === "create-account") {
      setPage("create-account");
      setShowPortalDropdown(false);
    } else if (key === "attorney-signup") {
      setPage("attorney-signup");
      setShowPortalDropdown(false);
    } else {
      setPage(key);
      setShowPortalDropdown(false);
    }
  };

  const handleLogin = async (username, password) => {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", username, password, loginType })
      });
      const data = await res.json();
      if (!res.ok) {
        // Check for pending status specifically
        if (data.status === "pending") {
          setShowLoginModal(false);
          setPage("attorney-pending");
          return;
        }
        alert(data.error || "Login failed. Please try again.");
        return;
      }
      setCurrentUser(data.user);
      setShowLoginModal(false);
      if (data.user.type === "attorney") {
        await loadCases();
        await loadSignups(data.user.email);
        if (data.user.email === "j.davies@daviesinjurylaw.com") {
          await loadAnalytics();
          setPage("admin");
        } else {
          setPage("dashboard");
        }
      } else {
        setPage("client-portal");
      }
    } catch (e) {
      console.error("Login error:", e);
      alert("Login failed. Please try again.");
    }
  };

  const handleAccountCreation = async (accountData) => {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "signup-client", ...accountData })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Account creation failed. Please try again.");
        return;
      }

      setCurrentUser(data.user);

      if (pendingDocument) {
        setSavedDocuments(prev => [...prev, {
          type: "Answer to Debt Collection Complaint",
          caseNumber: pendingDocument.extractedData.caseNumber,
          plaintiff: pendingDocument.extractedData.plaintiff,
          documentText: pendingDocument.documentText,
          createdAt: new Date().toISOString(),
          clientEmail: data.user.email
        }]);
        setPendingDocument(null);
        alert(`Welcome, ${accountData.firstName}! Your account has been created and your document has been saved.`);
        setPage("client-portal");
        return;
      }

      if (isGuestFlow && caseData) {
        setPage("summary");
      } else {
        alert(`Welcome, ${accountData.firstName}! Your account has been created.`);
        setPage("client-portal");
      }
    } catch (e) {
      console.error("Account creation error:", e);
      alert("Account creation failed. Please try again.");
    }
  };

  const handleDocumentAccountCreation = (documentData) => {
    setPendingDocument(documentData);
    setPage("create-account");
  };

  const handleAttorneySignup = async (attorneyData) => {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "signup-attorney", ...attorneyData })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Registration failed. Please try again.");
        return;
      }
      // Do NOT log the attorney in — their account is pending approval
      setPage("attorney-pending");
    } catch (e) {
      console.error("Attorney signup error:", e);
      alert("Registration failed. Please try again.");
    }
  };

  const handleIntakeComplete = (data) => {
    setCaseData({ ...data });
    
    if (currentUser?.type === "client") {
      setPage("summary");
    } else {
      setIsGuestFlow(true);
      setPage("create-account-prompt");
    }
  };

  const generateCaseAssessment = async (caseInfo) => {
    const isPremium = caseInfo.isPremium;
    const inputs = caseInfo.assessmentInputs || {};

    const prompt = isPremium
      ? `You are a Montana legal case analyst providing attorney-facing intelligence for a legal marketplace. Based on the case details below, generate a claim valuation assessment. This is ONLY shown to attorneys, never to clients.

CASE DETAILS:
Category: ${caseInfo.category}
County: ${caseInfo.county}
Summary: ${caseInfo.summary}
Medical Bills: ${inputs.medicalBills || "Not provided"}
Lost Wages: ${inputs.lostWages || "Not provided"}
Annual Salary: ${inputs.annualSalary || "Not provided"}
Liability Clarity: ${inputs.liabilityClarity || "unknown"}
Has Insurance: ${inputs.hasInsurance || "unknown"}
Case Complexity: ${inputs.caseComplexity || "unknown"}
Additional Notes: ${inputs.additionalNotes || "none"}

Respond ONLY with a JSON object (no markdown, no explanation):
{
  "assessmentType": "valuation",
  "estimatedValue": "$X,000 – $Y,000",
  "confidence": "High | Moderate | Low",
  "confidenceReason": "one sentence explaining confidence level",
  "liabilityScore": 1-5,
  "damagesScore": 1-5,
  "collectibilityScore": 1-5,
  "overallScore": 1-5,
  "keyStrengths": ["strength 1", "strength 2"],
  "keyRisks": ["risk 1", "risk 2"],
  "typicalContingencyRate": "33% | 40%",
  "estimatedAttorneyFee": "$X,000 – $Y,000"
}`
      : `You are a Montana legal case analyst providing attorney-facing intelligence for a legal marketplace. Based on the case details below, estimate the hours required to handle this matter. This is ONLY shown to attorneys, never to clients.

CASE DETAILS:
Category: ${caseInfo.category}
County: ${caseInfo.county}
Summary: ${caseInfo.summary}
Claim Amount: ${inputs.claimAmount || "Not provided"}
Case Complexity: ${inputs.caseComplexity || "unknown"}
Additional Notes: ${inputs.additionalNotes || "none"}

Respond ONLY with a JSON object (no markdown, no explanation):
{
  "assessmentType": "hours",
  "estimatedHours": "X – Y hours",
  "complexity": "Simple | Moderate | Complex",
  "complexityReason": "one sentence explaining complexity rating",
  "overallScore": 1-5,
  "phases": [
    {"phase": "phase name", "hours": "X – Y hrs", "description": "brief description"},
    {"phase": "phase name", "hours": "X – Y hrs", "description": "brief description"}
  ],
  "keyConsiderations": ["consideration 1", "consideration 2"],
  "likelyOutcome": "one sentence on most probable resolution path"
}`;

    try {
      const response = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });
      const data = await response.json();
      let text = (data.text || "").trim();
      text = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const first = text.indexOf("{");
      const last = text.lastIndexOf("}");
      if (first !== -1 && last !== -1) {
        return JSON.parse(text.substring(first, last + 1));
      }
    } catch (e) {
      console.error("Assessment generation failed:", e);
    }
    return null;
  };

  const handleSummaryConfirm = async () => {
    const caseId = `MT-${Date.now()}`;
    const newCase = {
      id: caseId,
      summary: caseData.summary,
      category: caseData.category,
      county: caseData.county,
      isPremium: caseData.isPremium === true,
      clientFirstName: currentUser.firstName,
      clientLastInitial: currentUser.lastInitial,
      clientPhone: currentUser.phone,
      clientEmail: currentUser.email,
      bids: [],
      submittedAt: new Date().toISOString(),
      assessment: null,
      assessmentPending: true
    };

    // Optimistically add to local state so client sees it immediately
    setCases(prev => [newCase, ...prev]);
    alert(`Thank you, ${currentUser.firstName}! Your case has been submitted to our Montana attorney network.\n\nCase ID: ${caseId}`);
    setCaseData(null);
    setIsGuestFlow(false);
    setPage("client-portal");

    // Persist to KV
    try {
      await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit-case", caseData: newCase })
      });
    } catch (e) {
      console.error("Failed to persist case:", e);
    }

    // Generate assessment in background, then persist it
    const assessment = await generateCaseAssessment(caseData);
    const updatedAssessment = assessment || null;

    setCases(prev => prev.map(c =>
      c.id === caseId ? { ...c, assessment: updatedAssessment, assessmentPending: false } : c
    ));

    try {
      await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-assessment", caseId, assessment: updatedAssessment })
      });
    } catch (e) {
      console.error("Failed to persist assessment:", e);
    }
  };

  const handleBidSubmit = async (caseId, bid) => {
    // Optimistic local update
    setCases(prev => prev.map(c =>
      c.id === caseId
        ? { ...c, bids: [...(c.bids || []), { ...bid, submittedAt: new Date().toISOString() }] }
        : c
    ));

    // Decrement bid count for free tier attorneys
    if (currentUser?.tier === "free") {
      setCurrentUser(prev => ({
        ...prev,
        bidsThisMonth: (prev.bidsThisMonth || 0) + 1,
        bidsRemaining: Math.max(0, (prev.bidsRemaining || 0) - 1)
      }));
    }

    // Persist to KV
    try {
      await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "place-bid", caseId, bid })
      });
    } catch (e) {
      console.error("Failed to persist bid:", e);
    }
  };

  const handleSelectAttorney = async (caseId, selectedBid) => {
    // Optimistic local update
    setCases(prev => prev.map(c =>
      c.id === caseId
        ? { ...c, selectedAttorney: selectedBid, status: "closed" }
        : c
    ));

    // Persist to KV
    try {
      await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "select-attorney", caseId, selectedBid })
      });
    } catch (e) {
      console.error("Failed to persist attorney selection:", e);
    }
  };

  // Reload cases whenever attorney visits dashboard so cross-device bids appear
  useEffect(() => {
    if (page === "dashboard" && currentUser?.type === "attorney") {
      loadCases();
    }
    if (page === "client-portal" && currentUser?.type === "client") {
      loadCases();
    }
  }, [page]);

  const handleLogout = () => {
    setCurrentUser(null);
    setPage("landing");
  };

  const handleStartNewClaim = () => {
    setIsGuestFlow(false);
    setCaseData(null);
    setPage("chat");
  };

  const handleGuestGetStarted = () => {
    setIsGuestFlow(true);
    setCaseData(null);
    setCurrentUser(null);
    setPage("chat");
  };

  const handleServiceClick = (action) => {
    if (action === "debt-answer") {
      setPage("document-assistant");
    }
  };

  const handleDocumentSave = (document) => {
    if (currentUser?.type === "client") {
      setSavedDocuments(prev => [...prev, {
        ...document,
        clientEmail: currentUser.email
      }]);
    }
  };

  const navItems = [
    { key: "landing", label: "Home" },
    { key: "about", label: "About" },
    { key: "contact", label: "Contact" },
    { key: "services", label: "Services" },
    { key: "careers", label: "Careers" },
  ];

  const closeDrawer = () => setShowDrawer(false);
  const openPage = (key) => { handleNavClick(key); closeDrawer(); };

  return (
    <>
      <style>{STYLES}</style>

      {/* ── SIDE DRAWER OVERLAY ── */}
      <div className={`drawer-overlay ${showDrawer ? "open" : ""}`} onClick={closeDrawer} />

      {/* ── SIDE DRAWER ── */}
      <div className={`drawer ${showDrawer ? "open" : ""}`}>
        <div className="drawer-header">
          <div className="drawer-logo">WALT<span>.</span></div>
          <button className="drawer-close" onClick={closeDrawer}>×</button>
        </div>
        <div className="drawer-body">
          {currentUser ? (
            <>
              <div className="drawer-user">
                {currentUser.type === "attorney" ? currentUser.name : `${currentUser.firstName} ${currentUser.lastInitial}.`}
              </div>
              {currentUser.type === "client" && (
                <button className="drawer-item" onClick={() => { setPage("client-portal"); closeDrawer(); }}>My Cases</button>
              )}
              {currentUser.type === "attorney" && currentUser.email === "j.davies@daviesinjurylaw.com" && (
                <>
                  <button className="drawer-item" onClick={() => { setPage("admin"); closeDrawer(); }}>Command Center</button>
                  <button className="drawer-item" onClick={() => { setPage("dashboard"); closeDrawer(); }}>Dashboard</button>
                </>
              )}
              {currentUser.type === "attorney" && currentUser.email !== "j.davies@daviesinjurylaw.com" && (
                <button className="drawer-item" onClick={() => { setPage("dashboard"); closeDrawer(); }}>Dashboard</button>
              )}
              <div className="drawer-divider" />
              <button className="drawer-item" onClick={() => { handleLogout(); closeDrawer(); }}>Logout</button>
            </>
          ) : (
            <>
              <div className="drawer-section-label">Navigate</div>
              {navItems.map(n => (
                <button
                  key={n.key}
                  className={`drawer-item ${page === n.key ? "active" : ""}`}
                  onClick={() => openPage(n.key)}
                >
                  {n.label}
                </button>
              ))}
              <div className="drawer-divider" />
              <div className="drawer-section-label">Account</div>
              <button className="drawer-item primary" onClick={() => openPage("create-account")}>Create Account</button>
              <button className="drawer-item" onClick={() => { handleNavClick("login-client"); closeDrawer(); }}>Client Login</button>
              <button className="drawer-item" onClick={() => { handleNavClick("login-attorney"); closeDrawer(); }}>Attorney Login</button>
              <button className="drawer-item" onClick={() => openPage("attorney-signup")}>Attorney Signup</button>
            </>
          )}
        </div>
        <div className="drawer-footer">© 2026 Worth A Lawyer's Time, LLC.</div>
      </div>

      {/* ── TOP NAV BAR ── */}
      <nav className="nav">
        <div className="nav-logo" onClick={() => { setPage("landing"); if (!currentUser) setCaseData(null); }}>
          WALT<span>.</span>
        </div>
        <button
          className={`nav-hamburger ${showDrawer ? "open" : ""}`}
          onClick={() => setShowDrawer(prev => !prev)}
          aria-label="Open menu"
        >
          <span /><span /><span />
        </button>
      </nav>

      {page === "landing" && (
        <div className="landing">
          <div style={{ marginBottom: "16px" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", color: "var(--gold)" }}>Montana Jurisdiction Only</span>
          </div>
          <h1>Because your issue is<br /><em>worth a lawyer's time.</em></h1>
          <p>
            Facing a legal challenge and don't know where to start? WALT connects you with experienced 
            Montana attorneys who compete for your case. Describe your situation, receive bids, and 
            choose the professional who's the best fit — all in one place.
          </p>
          <button className="landing-cta" onClick={handleGuestGetStarted}>
            Get Started — Describe Your Issue
          </button>
          <p style={{ marginTop: "20px", fontSize: "0.85rem", color: "var(--muted)" }}>
            Already have an account? <span style={{ color: "var(--gold)", cursor: "pointer", textDecoration: "underline" }} onClick={() => handleNavClick("login-client")}>Sign in</span>
          </p>
          <div className="disclaimer" style={{ maxWidth: "680px", margin: "32px auto 0", textAlign: "left" }}>
            <strong>Important Disclaimer:</strong> WALT is a legal marketplace platform and does <strong>not</strong> provide legal advice. No attorney-client relationship is formed through use of this service. This platform is limited to <strong>Montana jurisdiction only</strong>. Always consult a licensed Montana attorney for guidance specific to your situation.
          </div>
        </div>
      )}

      {page === "create-account" && (
        <AccountCreation
          onComplete={handleAccountCreation}
          onBack={() => {
            if (pendingDocument) {
              setPage("document-assistant");
              setPendingDocument(null);
            } else {
              setPage("landing");
            }
          }}
          contextMessage={pendingDocument ? "Create an account to save your Answer document and access it anytime." : null}
        />
      )}

      {page === "attorney-signup" && (
        <AttorneySignup
          onComplete={handleAttorneySignup}
          onBack={() => setPage("landing")}
        />
      )}

      {page === "attorney-pending" && (
        <div className="summary-page" style={{ textAlign: "center", paddingTop: "60px" }}>
          <div style={{ maxWidth: "560px", margin: "0 auto" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(197,165,114,0.15)", border: "2px solid var(--gold)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: "1rem", fontWeight: 700 }}>~</div>
            <h2 style={{ marginBottom: "12px" }}>Application Received</h2>
            <p style={{ fontSize: "0.95rem", color: "var(--charcoal)", lineHeight: "1.8", marginBottom: "32px" }}>
              Thank you for applying to join the WALT attorney network. Your application is under review. 
              You'll be able to log in and access the platform once your account has been approved.
            </p>
            <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "32px" }}>
              If you have questions, contact us at <strong>partners@walt.legal</strong>.
            </p>
            <button className="btn btn-secondary" onClick={() => setPage("landing")}>
              Return to Home
            </button>
          </div>
        </div>
      )}

      {page === "create-account-prompt" && caseData && (
        <div className="summary-page">
          <h2>Almost Done!</h2>
          <p>Create a free account to save your claim and receive attorney bids.</p>
          
          <div className="summary-card">
            <div className="summary-body" style={{ padding: "32px", textAlign: "center" }}>
              <p style={{ fontSize: "0.9rem", color: "var(--muted)", marginBottom: "24px" }}>
                We've gathered all the information about your legal issue. Create an account so we can connect you with Montana attorneys and keep you updated on bids.
              </p>
              <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                <button className="btn btn-primary" onClick={() => setPage("create-account")}>
                  Create Account
                </button>
                <button className="btn btn-secondary" onClick={() => setPage("chat")}>
                  Back to Chat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {page === "chat" && (
        <ChatIntake 
          onComplete={handleIntakeComplete} 
          onBack={() => currentUser ? setPage("client-portal") : setPage("landing")}
          userName={currentUser?.type === "client" ? currentUser.firstName : null}
        />
      )}

      {page === "summary" && caseData && currentUser?.type === "client" && (
        <CaseSummary 
          caseData={caseData}
          onBack={() => setPage("chat")}
          onConfirm={handleSummaryConfirm}
        />
      )}

      {page === "dashboard" && currentUser?.type === "attorney" && (
        <AttorneyDashboard 
          cases={cases}
          currentAttorney={currentUser}
          onBidSubmit={handleBidSubmit}
          signups={signups}
          onApproveAttorney={handleApproveAttorney}
          onDenyAttorney={handleDenyAttorney}
          onDeleteAccount={handleDeleteAccount}
          onChangeTier={handleChangeTier}
          onUpdateProfile={handleUpdateProfile}
        />
      )}

      {page === "client-portal" && currentUser?.type === "client" && (
        <ClientPortal 
          clientData={currentUser}
          cases={cases}
          savedDocuments={savedDocuments}
          onLogout={handleLogout}
          onStartNewClaim={handleStartNewClaim}
          onSelectAttorney={handleSelectAttorney}
          onViewProfile={handleViewProfile}
        />
      )}

      {page === "about" && <AboutPage />}
      {page === "services" && <ServicesPage onServiceClick={handleServiceClick} />}

      {page === "attorney-profile" && viewingProfile && (
        <AttorneyProfile
          attorney={viewingProfile}
          onBack={() => {
            setPage(currentUser?.type === "client" ? "client-portal" : "dashboard");
            setViewingProfile(null);
          }}
        />
      )}

      {page === "careers" && (
        <CareersPage
          onSubmit={handleMessage}
          onBack={() => setPage("landing")}
        />
      )}

      {page === "contact" && (
        <ContactPage
          onSubmit={handleMessage}
          onBack={() => setPage("landing")}
        />
      )}

      {page === "admin" && currentUser?.email === "j.davies@daviesinjurylaw.com" && (
        <AdminCommandCenter
          signups={signups}
          cases={cases}
          analytics={analytics}
          onApproveAttorney={handleApproveAttorney}
          onDenyAttorney={handleDenyAttorney}
          onDeleteAccount={handleDeleteAccount}
          onChangeTier={handleChangeTier}
          onRefresh={handleAdminRefresh}
        />
      )}
      
      {page === "document-assistant" && (
        <DocumentAssistant 
          onBack={() => setPage("services")}
          onSave={handleDocumentSave}
          currentUser={currentUser}
          onCreateAccount={handleDocumentAccountCreation}
        />
      )}

      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowLoginModal(false)}>×</button>
            <h3>{loginType === "attorney" ? "Attorney Login" : "Client Login"}</h3>
            <p>
              {loginType === "attorney" 
                ? "Access the WALT attorney partner dashboard to view cases and submit bids."
                : "Access your client portal to view your cases and attorney bids."
              }
            </p>
            <div>
              <div className="form-group">
                <label>{loginType === "attorney" ? "Username" : "Email"}</label>
                <input 
                  type="text" 
                  id="login-username" 
                  placeholder={loginType === "attorney" ? "Enter username" : "Enter email"}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const u = document.getElementById("login-username").value;
                      const p = document.getElementById("login-password").value;
                      if (u && p) handleLogin(u, p);
                    }
                  }}
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input 
                  type="password" 
                  id="login-password" 
                  placeholder="Enter password"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const u = document.getElementById("login-username").value;
                      const p = document.getElementById("login-password").value;
                      if (u && p) handleLogin(u, p);
                    }
                  }}
                />
              </div>
              <div style={{ textAlign: "center", marginTop: "20px" }}>
                <button className="btn btn-primary" onClick={() => {
                  const u = document.getElementById("login-username").value;
                  const p = document.getElementById("login-password").value;
                  if (u && p) handleLogin(u, p);
                }}>Login</button>
              </div>
              {loginType === "attorney" && (
                <>
                  <p style={{ fontSize: "0.75rem", color: "var(--muted)", textAlign: "center", marginTop: "8px" }}>
                    Not registered? <span style={{ color: "var(--gold)", cursor: "pointer", textDecoration: "underline" }} onClick={() => { setShowLoginModal(false); setPage("attorney-signup"); }}>Sign up as an attorney</span>
                  </p>
                </>
              )}
              {loginType === "client" && (
                <p style={{ fontSize: "0.75rem", color: "var(--muted)", textAlign: "center", marginTop: "12px" }}>
                  Don't have an account? <span style={{ color: "var(--gold)", cursor: "pointer", textDecoration: "underline" }} onClick={() => { setShowLoginModal(false); setPage("create-account"); }}>Create one</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <footer style={{ background: "var(--warm-white)", borderTop: "1px solid var(--sand)", padding: "24px", textAlign: "center", marginTop: "80px" }}>
        <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
          © 2026 Worth A Lawyer's Time, LLC. All rights reserved. • Montana Jurisdiction Only
        </p>
      </footer>
    </>
  );
}
