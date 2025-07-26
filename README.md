# Puppeteer Web Interaction Script

Automate human-like browsing on Google search results using Puppeteer, with support for proxies, CAPTCHA solving, device emulation, and detailed logging.

---

## Features

- **Google Search Automation**: Performs searches for configurable keywords on Google Vietnam (`google.com.vn`).
- **Proxy Support**: Integrates with Shoplike proxy provider for anonymized browsing.
- **CAPTCHA Solving**: Uses the 2Captcha service to solve reCAPTCHAs automatically.
- **Human-like Interaction**: Simulates scrolling and clicking internal links on target domains for realistic dwell time.
- **Device Emulation**: Emulates a wide range of mobile devices (iPhone, Galaxy, Pixel, iPad, etc.).
- **Logging**: Logs all activities to both the console and a `logs.txt` file with colored output using `chalk`.
- **Geo Information**: Fetches and logs geographical information about the proxy IP.
- **Configurable**: All sensitive data and settings are managed via `config.json`.

---

## Prerequisites

- **Node.js**: Version 14 or higher.
- **npm**: Node.js package manager.

---

## Installation

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. **Install Dependencies**
   ```bash
   npm install puppeteer-extra puppeteer-extra-plugin-recaptcha puppeteer-extra-plugin-stealth axios chalk
   ```

---

## Configuration

1. **Edit `config.json`**

   Create or update a `config.json` file in the project root:

   ```json
   {
     "PROXY_API_BASE": "https://proxy.shoplike.vn/Api/getCurrentProxy",
     "SHOPLIKE_ACCESS_TOKEN": "YOUR_SHOPLIKE_TOKEN",
     "CAPTCHA_API_KEY": "YOUR_2CAPTCHA_API_KEY",
     "IP_GEO_API_BASE": "https://free.freeipapi.com/api/json/",
     "keywords": [
       { "keyword": "Guest Post", "visits_required": 10, "visits_completed": 0 }
     ],
     "INTERACTIVE_DOMAINS": ["guestspostings.co.in"
     ]
   }
   ```

   - **PROXY_API_BASE**: Shoplike proxy API base endpoint (without the access token).
   - **SHOPLIKE_ACCESS_TOKEN**: Your Shoplike API access token.
   - **CAPTCHA_API_KEY**: Your 2Captcha API key.
   - **IP_GEO_API_BASE**: Base URL for IP geo lookup.
   - **keywords**: List of keywords to search, with visit requirements.
   - **INTERACTIVE_DOMAINS**: Domains for extended, human-like interaction.

   The script will automatically combine `PROXY_API_BASE` and `SHOPLIKE_ACCESS_TOKEN` to form the full proxy API URL.

---

## Usage

Run the script with Node.js:

```bash
node pogostick.js
```

- The script will loop through keywords and perform visits as configured in `config.json`.
- All logs are saved to `logs.txt` and printed to the console.

---

## File Structure

- `pogostick.js` — Main automation script.
- `config.json` — Configuration file (not included in repo by default; create your own).
- `logs.txt` — Log file generated during script execution.
- `README.md` — This documentation.

---

## Notes

- **Proxy Usage**: Ensure your Shoplike API token is valid and has available quota.
- **CAPTCHA Solving**: Ensure your 2Captcha API key is valid and has sufficient balance.
- **Google DOM Changes**: If Google updates its DOM, you may need to update selectors in the script.
- **Persistence**: If you want to persist `visits_completed`, you must manually update `config.json` or implement a save routine.

---

## Security

- **Never commit your `config.json` with real API keys or tokens to public repositories.**  
  Add `config.json` to your `.gitignore` file.

---

## License

MIT License. See the [LICENSE](LICENSE) file for details.

---

## TODO

- [🟡] Click on Google Ads in search results.
- [🟡] Support multiple Google domains (e.g., `google.com`, `google.com.vn`).
- [🟡] Support multiple browser languages.
- [✅] ~~Refactor and simplify codebase.~~
- [✅] ~~Add persistence for `visits_completed` in `config.json`.~~

---