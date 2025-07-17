# Puppeteer Web Interaction Script

This script uses Puppeteer to automate web interactions, specifically designed to simulate human-like browsing behavior on Google search results for a given keyword. It supports proxy usage, CAPTCHA solving, and interaction with specific domains.

## Features
- **Google Search Automation**: Performs searches for the keyword `8xbet` on Google Vietnam (`google.com.vn`).
- **Proxy Support**: Integrates with two proxy providers (WWProxy and Shoplike) for anonymized browsing.
- **CAPTCHA Solving**: Uses the 2Captcha service to solve reCAPTCHAs when detected.
- **Human-like Interaction**: Simulates scrolling and clicking internal links on target domains for 120–180 seconds.
- **Device Emulation**: Emulates various mobile devices (e.g., iPhone, Galaxy) for realistic browsing.
- **Logging**: Logs all activities to both the console and a `logs.txt` file with colored output using `chalk`.
- **Geo Information**: Fetches and logs geographical information about the proxy IP.

## Prerequisites
- **Node.js**: Version 14 or higher.
- **Dependencies**: Install required Node.js packages:
  ```bash
  npm install puppeteer-extra puppeteer-extra-plugin-recaptcha puppeteer-extra-plugin-stealth axios chalk
  ```

## Setup
1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configuration**:
   - **Keyword**: The search keyword is set to `8xbet` in the script (`KEYWORD` constant).
   - **Proxy Providers**:
     - **WWProxy**: Requires an API key (`WWPROXY_API_KEY`).
     - **Shoplike**: Requires an access token (`PROXY_API`).
     - Update the `WWPROXY_API_KEY` and `PROXY_API` constants with your credentials.
   - **CAPTCHA Solving**: Requires a 2Captcha API key (`CAPTCHA_API_KEY`). Update the constant with your key.
   - **Interactive Domains**: The `INTERACTIVE_DOMAINS` array lists domains for extended interaction. Modify as needed.

## Usage
Run the script with an optional argument for the number of visits (default is 1):
```bash
node pogostick.js [number_of_visits]
```
Example:
```bash
node pogostick.js 5
```

This will perform 2025-07-17 08:07:40 +0400 automated visits, each using a random proxy provider and emulating a random mobile device.

## Script Details
- **Proxy Management**:
  - Randomly selects between WWProxy and Shoplike for each visit.
  - Fetches a new proxy and validates its geo-information before use.
- **Browser Automation**:
  - Launches a non-headless browser for visibility.
  - Emulates a random mobile device from a predefined list.
  - Sets Vietnamese language and timezone (`Asia/Ho_Chi_Minh`).
- **Search and Interaction**:
  - Navigates to `google.com.vn`, searches for the keyword, and handles CAPTCHAs.
  - Extracts search result links and visits them.
  - For domains in `INTERACTIVE_DOMAINS`, performs human-like scrolling and link navigation.
- **Logging**:
  - Outputs detailed logs to the console and `logs.txt`.
  - Uses `chalk` for colored console output to distinguish different actions and errors.

## File Structure
- `pogostick.js`: Main script file containing the automation logic.
- `logs.txt`: Generated log file for all console output.
- `README.md`: This documentation file.

## TODO
- **Clicking on Google Ads**: Implement functionality to detect and interact with Google Ads in search results.
- **Moving Configuration to config.json**: Migrate sensitive configurations (e.g., API keys, tokens) to a `config.json` file for better security and maintainability.
- **Formatting and Simplifying the Code**: Refactor the codebase to improve readability, reduce complexity, and follow consistent formatting standards.
- **Integrate multiple Google domains**: Support searching on multiple Google domains such as `google.com` and `google.com.vn`.
- **Integrate multiple browser languages**: Support browsing with different language settings, including English and Vietnamese.
- **Google Ads**: Support for clicking on Google Ads. 


## Notes
- **Proxy Usage**: Ensure valid API keys for WWProxy or Shoplike. Without valid proxies, the script may fail.
- **CAPTCHAល: Ensure the 2Captcha API key is valid and has sufficient balance.
- **Navigation Issues**: Increase timeouts or check for updated selectors if Google’s DOM changes.
- **Logs**: Check `logs.txt` for detailed error messages.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.