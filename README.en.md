# 🐋 DeepSeek Balance Viewer & Token Estimates

[简体中文](README.md) | **English**

View your DeepSeek API account balance and estimate the tokens it could buy using the reference rates in the code. Choose between a **PWA web app** and an **iOS Scriptable home screen widget**.

> The current implementation queries account balances. Token figures are calculated from the balance and reference prices; they are not historical usage or billing records. The app interface and the detailed guides linked below are currently in Chinese.

## ✨ Features

- 💰 **Account balance** — View total, topped-up, and granted balances, plus account availability
- 📊 **Token estimates** — Estimate available input or output tokens using built-in reference prices
- 📱 **PWA web app** — Add it to your home screen, follow the system's dark mode, and refresh with a button or pull gesture
- 🧩 **iOS widgets** — The Scriptable script offers small, medium, and large layouts and runs independently of the web app
- 📴 **Web caching** — Fall back to previously saved data when the network fails; cached data is not a live balance
- 🔄 **Foreground refresh** — The PWA attempts to refresh every five minutes while visible and when you return to the page

## 🧭 Where to Start

| Your goal | Option | Guide |
|-----------|--------|-------|
| View your balance in a phone or desktop browser | PWA web app | [Web usage and deployment](docs/PWA.md) |
| Display your balance directly on your iPhone home screen | Scriptable widget | [iOS widget setup](docs/SCRIPTABLE.md) |
| Understand the structure, data flow, and known limitations | Source maintenance | [Development and maintenance](docs/DEVELOPMENT.md) |

Adding the PWA to your home screen creates a web app shortcut that opens in its own window. The Scriptable script provides the widget that displays data directly on the home screen. Their setup and refresh behavior are documented separately.

## 🚀 Quick Start

### Option 1: PWA Web App

1. Download the repository with `Code → Download ZIP`, then extract it.
2. Open a terminal in the repository root and start a static server with Python 3:

```sh
python -m http.server 8000 --directory "Token Query/deepseek-token-pwa"
```

3. Open `http://localhost:8000` in your desktop browser. This command serves the actual application directory as the website root.
4. Get your own API key from the [DeepSeek platform](https://platform.deepseek.com/api_keys). After confirming that a Service Worker controls the page, test the connection and save the key in the app.
5. For phone use, deploy the app to a trusted HTTPS site, then use your browser's Add to Home Screen option.

**Before deploying:** The current code uses the root-relative `/api/balance` endpoint and root-relative static resource paths. Subdirectory deployment needs adaptation. A Service Worker cannot bypass CORS, and a page that loads successfully does not prove that balance queries work. See the [PWA guide](docs/PWA.md) for deployment settings, Service Worker checks, and troubleshooting.

### Option 2: iOS Scriptable Widget

1. Install [Scriptable](https://scriptable.app/) on your iPhone.
2. Open [scriptable-widget.js](Token%20Query/deepseek-token-pwa/scriptable-widget.js) and copy its complete contents into a new Scriptable script.
3. Set `DEEPSEEK_API_KEY` in your own local copy and run it to check for errors. Do not commit a copy containing a real key.
4. Add a Scriptable widget to your home screen, then select this script and your preferred size.

The script queries the balance through Scriptable without deploying the web app. iOS schedules widget refreshes; this script does not implement a fixed five-minute refresh interval or offline caching. See the [widget guide](docs/SCRIPTABLE.md).

## 📊 What the Numbers Mean

| Displayed item | Actual meaning |
|----------------|----------------|
| Total, topped-up, and granted balances | Values returned by DeepSeek's `/user/balance` endpoint |
| Available input/output tokens | Balance ÷ reference unit price in the code × 1,000,000; these are separate estimates and must not be added together as if both were available at once |
| Progress bar | The proportions of topped-up and granted balances |
| Automatic refresh | Scheduled requests while the PWA page is in the foreground, not continuous background activity |

The current code uses `balance_infos[0]`, displays `¥`, and calculates estimates using CNY reference rates. Multi-currency accounts are not fully supported. Reference prices are stored separately in each implementation's `MODEL_PRICING` object and may be outdated. Use the official platform for bills, actual usage, and current pricing. See the [DeepSeek balance API](https://api-docs.deepseek.com/api/get-user-balance/) for the response definition.

## 🔒 API Keys and Local Data

- The PWA stores the key in browser `localStorage` without application-level encryption. The page includes the key in its query request; when a Service Worker controls the page, it uses the key to authenticate with DeepSeek. Requests not intercepted by the Service Worker may also reach the same-origin hosting server. Enter a key only on a deployment you trust.
- The Scriptable example stores the key in a script constant and does not currently use Keychain. Protect your local copy and any synced copies or backups.
- The web app saves balance data in a cache. It does not currently isolate caches by account or provide a one-click clearing control. When changing keys or using a shared device, review and clear the site's data as needed.
- Do not share real keys in issues, screenshots, public scripts, or commit history. Clearing site data removes local settings and caches, so you will need to configure the app again.

See [development and maintenance](docs/DEVELOPMENT.md) for storage details and request paths.

## 📁 Project Structure

```text
deepseek-token-pwa/
├── README.md
├── README.en.md
├── docs/
│   ├── PWA.md              # Web usage, deployment, and troubleshooting
│   ├── SCRIPTABLE.md       # iOS widget setup
│   └── DEVELOPMENT.md      # Data flow, maintenance points, and limitations
└── Token Query/
    └── deepseek-token-pwa/
        ├── README.md       # Entry point linking to the root documentation
        ├── README.en.md
        ├── index.html
        ├── manifest.json
        ├── sw.js
        ├── scriptable-widget.js
        ├── js/app.js
        ├── css/style.css
        └── icons/
```

The application source lives in [`Token Query/deepseek-token-pwa/`](Token%20Query/deepseek-token-pwa/), not at the repository root. Deployment tools should use that directory as the application root. The existing source layout retains its original paths.

## ❓ Frequently Asked Questions

| Question | Answer |
|----------|--------|
| Why do the token figures differ from historical usage in the dashboard? | This app shows estimates calculated from the balance. It does not read historical usage. |
| Why do queries fail even though the web deployment succeeded? | Check Service Worker control, the API key, network access, and CORS. See the PWA troubleshooting guide. |
| Can I deploy it to GitHub Pages? | You can publish the static files, but the current root-relative paths and browser cross-origin requirements need separate adaptation and verification. |
| Can I see a new balance while offline? | The web app can only show previously saved data. The widget script has no offline cache. |
| Does the English README mean the interface supports English? | This update provides English documentation. The existing web and widget interfaces remain in Chinese. |

## 🤝 Feedback and Contributions

When opening an issue, include the option you use (PWA or Scriptable), your browser or iOS environment, the deployment root directory, the error you see, and sanitized logs. After changing paths, cross-origin handling, or caching, check first load, account switching, and offline fallback separately.

## 📄 License

The original project description labels the project as MIT. The repository does not currently contain a standalone LICENSE text; the maintainer still needs to add the formal license file.
