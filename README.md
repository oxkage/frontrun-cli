# 🔍 frontrun-cli

> Unofficial CLI wrapper for the [FrontRun Pro](https://frontrun.pro) API — built for alpha hunters, on-chain researchers, and AI agents.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)

Scrape smart followers, linked wallets, contract address history, and [Ethos Network](https://ethos.network) trust scores — all from your terminal or automated pipeline.

---

> ⚠️ **Responsible Use**
> This tool wraps a private API from FrontRun Pro. Use it for personal research and automation only. Don't spam, overload, or abuse the API. Respect rate limits. Your session token is your credential — keep it private.

---

## ✨ Features

- **📊 Full Overview** — one command, full profile snapshot
- **🧠 Smart Followers** — see who the alpha/whale accounts follow
- **💰 Wallet Tracker** — linked wallets + mentioned wallets from tweets
- **📜 CA History** — contract addresses shared (and deleted) by any user
- **🛡️ Ethos Trust Score** — reputation score via Twitter username (no wallet needed)
- **🔄 Username History** — track name changes
- **🤖 AI Agent Ready** — structured JSON output, pipe-friendly stderr/stdout split

## 🚀 Quick Start

```bash
git clone <repo-url> && cd frontrun-cli
npm install
cp .env.example .env
```

### Get Your Session Token

1. Click the **FrontRun extension icon** to open the popup (make sure you're logged in)
2. **Right-click** on the popup → **Inspect** (opens DevTools for the extension)
3. Go to **Network** tab → trigger any action → click a request to `loadbalance.frontrun.pro`
4. In **Headers** → find **Cookie** → copy value after `__Secure-frontrun.session_token=`
5. Paste into `.env` as `FRONTRUN_SESSION_TOKEN`

```bash
# Test it
node src/cli.js info
```

> 📖 Full guide: **[SETUP.md](SETUP.md)**

## 📖 Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `overview [user]` | `ov` | Full profile snapshot |
| `info [user]` | — | Account info & linked wallets |
| `smart-followers [user]` | `sf` | Smart followers list |
| `tweets-ca [user]` | `tc` | Tweets containing contract addresses |
| `username-history [user]` | `uh` | Username change history |
| `batch-query <users...>` | `bq` | Light info for multiple usernames |

> `[user]` = optional Twitter username. Without it → your own account.

## 💡 Usage Examples

### Human

```bash
# Your own account
node src/cli.js ov

# Any Twitter user
node src/cli.js ov zachxbt
node src/cli.js ov GuarEmperor --depth light
node src/cli.js sf elonmusk --limit 50

# Batch lookup
node src/cli.js bq vitalik ansem cobie
```

### AI Agent / Automation

```bash
# Clean JSON to stdout, logs to stderr
node src/cli.js --json ov zachxbt 2>/dev/null | jq .

# Extract specific fields
node src/cli.js --json sf zachxbt 2>/dev/null | jq '.data.smartFollowers[:5]'
node src/cli.js --json ov GuarEmperor 2>/dev/null | jq '.data.ethos'

# Save to file
node src/cli.js --json ov zachxbt 2>/dev/null > zachxbt.json
```

## 📊 Output Preview

### Human Mode

```
  ZachXBT @zachxbt
  Scam survivor turned 2D investigator, Advisor @paradigm
  Onchain Investigator
  1920 Following  984,480 Followers  3078 Smart Followers

  💰 Wallets
  Linked: 3  |  Mentioned: 122

  📜 History
  CA: 4 | 2   Profile: 0

  🛡️ Ethos Trust
  Score: 2375 / 2800  Level: distinguished

  🧠 Smart Followers (3078 total, showing 20)
    @cz_binance          3401  Founder@Binance
    @cobie               3330  Founder@echo.xyz
    @toly                2965  Co-Founder@Solana
    ...
```

### JSON Mode

```json
{
  "ok": true,
  "endpoint": "overview",
  "timestamp": "2026-03-24T14:57:44.494Z",
  "data": {
    "_meta": { "depth": "normal", "username": "zachxbt" },
    "account": {
      "name": "ZachXBT",
      "twitterUsername": "zachxbt",
      "followersCount": 984480,
      "wallets": [
        { "chain": "EVM", "address": "0x9d72...", "verified": true }
      ]
    },
    "smartFollowers": {
      "totalCount": 3078,
      "smartFollowers": [{ "twitter": "cz_binance", "smartFollowersCount": 3401 }]
    },
    "tweetsWithCA": {
      "undeletedCACount": 4,
      "deletedCACount": 2,
      "topUndeletedTweets": [{ "ca": "0x74aa...", "chain": "BSC" }]
    },
    "usernameHistory": { "currentTwitterUsername": "zachxbt", "usernameHistory": [] },
    "ethos": {
      "score": 2375,
      "level": "distinguished",
      "userkey": "service:x.com:username:zachxbt",
      "profileUrl": "https://app.ethos.network/profile/service:x.com:username:zachxbt"
    }
  }
}
```

## 🧩 Depth Presets

| Depth | Smart Followers | CA Tweets | Use Case |
|-------|----------------|-----------|----------|
| `light` | 20 | 2 | Quick snapshot |
| `normal` | 20 | 5 | Default, balanced |
| `full` | 20 | all | Deep research |

> Server-side hard limit: smart followers max 20 per request (API limitation).

## 🛡️ Ethos Trust Score

Fetched automatically via [Ethos Network API](https://developers.ethos.network) using `userkey` format `service:x.com:username:<handle>`.

| Level | Score Range | Meaning |
|-------|------------|---------|
| 🔴 untrusted | 0–199 | No trust signals |
| 🟡 neutral | 200–799 | Basic presence |
| 🟢 known | 800–1199 | Recognized by community |
| 🟢 established | 1200–1599 | Active, verified |
| 🔵 reputable | 1600–1999 | Strong reputation |
| 🔵 exemplary | 2000–2199 | Highly trusted |
| 🟣 distinguished | 2200–2399 | Elite tier |
| 🟣 revered | 2400–2599 | Top tier |
| ⭐ renowned | 2600–2800 | Legendary |

## 🗂️ Project Structure

```
frontrun-cli/
├── LICENSE              MIT
├── README.md            This file
├── SETUP.md             Token scraping tutorial
├── .env.example         Environment template
├── .gitignore
├── package.json
└── src/
    ├── cli.js           Entry point (commander)
    ├── client.js        HTTP client + auth headers
    └── endpoints/
        ├── info.js
        ├── smart-followers.js
        ├── tweets-ca.js
        ├── username-history.js
        ├── batch-query.js
        └── ethos.js
```

## 📝 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTRUN_SESSION_TOKEN` | ✅ | — | Session cookie from frontrun.pro |
| `FRONTRUN_BASE_URL` | ❌ | `https://loadbalance.frontrun.pro` | API base URL |
| `FRONTRUN_EXTENSION_ORIGIN` | ❌ | `chrome-extension://kifcal...` | Extension origin header |

## ⚠️ Disclaimer

This is an **unofficial** tool. It is not affiliated with, endorsed by, or supported by FrontRun Pro or Ethos Network. Use at your own risk. API endpoints may change without notice.

**Your session token = your account access.** Never share it, never commit it to git.

---

## 📄 License

[MIT](LICENSE) © 2026
