import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './WALT.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

**17.** Move your `WALT.jsx` file into the `src` folder.

Your folder should now look like this:
```
walt/
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
├── src/
│   ├── WALT.jsx
│   └── main.jsx
└── api/
    ├── chat.js
    ├── assess.js
    └── document.js
```

---

## Part 4 — Put the Files on GitHub

GitHub is a free website that stores your code. Vercel (the hosting platform) will pull your code directly from GitHub. You need a free GitHub account.

**18.** Go to **github.com** and sign up for a free account if you don't have one.

**19.** Once logged in, click the **+** button in the top-right corner and select **New repository**.

**20.** Name it `walt`. Leave everything else as the default. Click **Create repository**.

**21.** Now you need to install Git on your computer so you can send files to GitHub. Go to **git-scm.com/downloads** and download the installer for your operating system. Run it and click through the defaults — you don't need to change any settings.

**22.** On Windows, open the program called **Git Bash** (it was just installed). On Mac, open the **Terminal** app (press Command + Space, type Terminal, hit Enter).

**23.** Type this command and hit Enter to navigate to your walt folder. Replace `YourName` with your actual Windows username, or adjust the path to wherever your `walt` folder actually is:

On Windows:
```
cd C:/Users/YourName/Desktop/walt
```

On Mac:
```
cd ~/Desktop/walt
```

**24.** Now type each of these commands one at a time, hitting Enter after each:
```
git init
```
```
git add .
```
```
git commit -m "Initial WALT deployment"