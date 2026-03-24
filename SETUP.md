# 🛠️ Setup Guide — How to Get Your Session Token

frontrun-cli needs your FrontRun Pro session token to make API calls. The token **must** be obtained from the **FrontRun browser extension**, not the web app.

---

## Method: Network Tab (Recommended)

The session token is an `HttpOnly` cookie, so it can't be accessed via `document.cookie` or the Application tab. Use the Network tab instead.

### 1. Open the FrontRun Extension

Click the FrontRun Pro extension icon in your browser toolbar to open the popup. Make sure you're logged in.

### 2. Inspect the Extension Popup

Right-click anywhere on the extension popup → **Inspect** (or press **F12** while the popup is open).

> ⚠️ This opens DevTools **specifically for the extension popup**. Regular DevTools on frontrun.pro website won't work — the token is scoped to the extension.

### 3. Go to Network Tab

1. In the extension DevTools, go to the **Network** tab
2. Trigger any action in the extension (e.g., click "Smart Followers" or refresh the page)
3. Click any request to `loadbalance.frontrun.pro`
4. In the request details, go to **Headers** tab
5. Find the **Cookie** header section
6. Look for `__Secure-frontrun.session_token=...`
7. Copy the value **after** the `=` sign

It looks like:
```
YOUR_SESSION_TOKEN_HERE
```

### 4. Paste into .env

```bash
cp .env.example .env
```

Edit `.env`:
```
FRONTRUN_SESSION_TOKEN=YOUR_SESSION_TOKEN_HERE
```

### 5. Verify

```bash
node src/cli.js info
```

✅ See account data → done.
❌ See `Session token expired` → token invalid, repeat steps 1-3.

---

## Why Not Application Tab or Console?

| Method | Works? | Reason |
|--------|--------|--------|
| Application → Cookies | ❌ | Extension cookies not exposed to page context |
| Console → `document.cookie` | ❌ | `HttpOnly` flag blocks JS access |
| **Network → Headers → Cookie** | ✅ | Shows raw request headers |

---

## Token Expiry

Session tokens expire after some time. When you see:

```
✗ Session token expired or invalid.
  Update FRONTRUN_SESSION_TOKEN in .env
```

Just repeat the steps above to grab a fresh token.

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTRUN_SESSION_TOKEN` | ✅ | — | Session cookie from extension |
| `FRONTRUN_BASE_URL` | ❌ | `https://loadbalance.frontrun.pro` | API base URL |
| `FRONTRUN_EXTENSION_ORIGIN` | ❌ | `chrome-extension://kifcal...` | Extension origin header |
