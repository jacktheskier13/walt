# WALT — Vercel Deployment Guide
# End-to-end instructions for a first-time deployment

---

## What You're Deploying

```
your-repo/
├── src/
│   └── WALT.jsx          ← your React app (updated — no direct API calls)
├── api/
│   ├── chat.js           ← intake chat proxy (rate-limited)
│   ├── assess.js         ← case assessment proxy (rate-limited)
│   └── document.js       ← document assistant proxy (rate-limited)
├── vercel.json           ← Vercel routing config
├── package.json          ← (you need this — see Step 1)
└── vite.config.js        ← (you need this — see Step 1)
```

---

## Step 1 — Set Up Your Project Files (one-time)

If you don't already have a package.json, create one in your project root:

```json
{
  "name": "walt",
  "private": true,
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.4.0"
  }
}
```

And a vite.config.js:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

And an index.html in your root:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>WALT — Montana Legal Help</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

And src/main.jsx:

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './WALT.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

---

## Step 2 — Push to GitHub

1. Create a new repository at github.com (name it "walt" or "walt-legal")
2. In your terminal, from your project folder:

```bash
git init
git add .
git commit -m "Initial WALT deployment"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

---

## Step 3 — Deploy to Vercel

1. Go to vercel.com and sign in (create a free account if needed)
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will auto-detect Vite — leave the build settings as-is
5. Click "Deploy" — your first deploy will FAIL because the API key isn't set yet
   (that's expected — do Step 4 next)

---

## Step 4 — Add Your Anthropic API Key (CRITICAL)

This is what keeps your key out of the browser.

1. In Vercel, go to your project → Settings → Environment Variables
2. Add a new variable:
   - Name:  ANTHROPIC_API_KEY
   - Value: sk-ant-... (your actual key from console.anthropic.com)
   - Environment: Production, Preview, Development (check all three)
3. Click Save
4. Go to Deployments → click the three dots on your latest deploy → Redeploy

Your app will now work. The key is stored in Vercel's encrypted vault and is
only ever read by your serverless functions — never sent to the browser.

---

## Step 5 — Set a Spend Cap on Anthropic (do this NOW)

Before any real users touch the app:

1. Go to console.anthropic.com → Settings → Billing
2. Set a monthly spend limit (suggested: $50 for demo period)
3. Set an email alert at 80% of that limit

This is your insurance policy. The rate limiting in the API functions is your
first line of defense; the Anthropic spend cap is your backstop.

---

## Step 6 — Connect Your Domain (when ready)

1. In Vercel → your project → Settings → Domains
2. Add "walt.legal" (or whatever domain you purchase)
3. Vercel gives you DNS records to add at your registrar
4. SSL is automatic and free

Before you have a domain, Vercel gives you a free URL like:
  https://walt-abc123.vercel.app

This is fully functional and shareable for demos.

---

## Step 7 — Test the Deployed App

After deployment, verify each AI feature works:

[ ] Landing page loads
[ ] "Get Started" opens the intake chat and AI responds
[ ] Completing intake generates a case summary
[ ] Logging in as j.davies / walt2025 shows the attorney dashboard
[ ] The AI case assessment loads on case cards (Gold tier)
[ ] Services → Document Assistant → Type Information works

---

## Rate Limit Summary (what you're protected against)

| Endpoint     | Limit per IP | Window | Purpose                        |
|-------------|-------------|--------|-------------------------------|
| /api/chat   | 20 requests | 1 hour | Intake chat (6–8 msgs/intake) |
| /api/assess | 10 requests | 1 hour | Case assessment (1 per case)  |
| /api/document | 30 requests | 1 hour | Document assistant chat       |

A real user completing a full intake uses ~7 requests to /api/chat.
A spammer hitting the limit gets a clear "try again in X minutes" message.

---

## Troubleshooting

**"Service configuration error" in the app**
→ Your ANTHROPIC_API_KEY env variable isn't set, or you haven't redeployed after setting it.

**AI features return errors but the page loads**
→ Check Vercel → your project → Functions tab → look for error logs in chat.js, assess.js, or document.js.

**"Too many requests" during your own testing**
→ The rate limiter resets every hour. Or temporarily raise RATE_LIMIT_MAX in the function file for testing, then lower it before going public.

**CORS errors in the browser console**
→ This shouldn't happen since all API calls are same-origin (/api/*), but if it does, add a CORS header in the function: res.setHeader('Access-Control-Allow-Origin', '*')
