const puppeteer = require('puppeteer-extra');
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha');
const axios = require('axios');

const KEYWORD = '8xbet';
const PROXY_API = 'https://proxy.shoplike.vn/Api/getCurrentProxy?access_token=b4b85546eaddfd86d54506c91d69e60d';
const CAPTCHA_API_KEY = '97706adf3edd3a9c3b0cc9d589a9f1e9';

const delay = ms => new Promise(r => setTimeout(r, ms));

// Configure puppeteer-extra with recaptcha plugin
puppeteer.use(
  RecaptchaPlugin({
    provider: {
      id: '2captcha',
      token: CAPTCHA_API_KEY,
    },
    throwOnError: false, // Don't throw errors, let us handle retries
  })
);

async function solveRecaptcha(page, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`🧠 Attempt #${attempt} to solve CAPTCHA...`);

    try {
      // Use the recaptcha plugin to solve the CAPTCHA
      const { captchas, solutions, solved, error } = await page.solveRecaptchas();

      if (error) {
        console.log('❌ 2Captcha request failed:', error);
        if (attempt === maxRetries) return false;
        console.log('⏳ Waiting 10s before retrying...');
        await delay(10000);
        continue;
      }

      // Check if CAPTCHA was solved by verifying navigation to SERP
      try {
        await page.waitForFunction(
          () => location.pathname === '/search' && document.title.toLowerCase().includes('google'),
          { timeout: 30000 }
        );
        console.log('✅ CAPTCHA solved successfully (SERP loaded).');
        return true;
      } catch {
        console.log('❌ CAPTCHA solved but SERP did not load.');
        if (solved.length > 0) {
          console.log('ℹ️ CAPTCHA token received:', solved[0]?.response?.substring(0, 20) + '...');
        } else {
          console.log('ℹ️ No CAPTCHA solution data returned by plugin.');
        }
        if (attempt === maxRetries) return false;
        console.log('⏳ Waiting 10s before retrying...');
        await delay(10000);
        continue;
      }
    } catch (e) {
      console.log('❌ Error solving CAPTCHA:', e.message);
      if (attempt === maxRetries) return false;
      console.log('⏳ Waiting 10s before retrying...');
      await delay(10000);
    }
  }

  return false;
}

async function runVisit(browser, visitNumber) {
  const page = await browser.newPage();

  try {
    await page.goto('https://www.google.com.vn', { waitUntil: 'networkidle2' });
  } catch (e) {
    console.error(`Visit #${visitNumber}: Failed to load Google:`, e.message);
    await page.close();
    return false;
  }

  await page.evaluate(() => {
    const textarea = document.querySelector('textarea[name="q"]');
    if (textarea) textarea.value = '';
  });

  await page.type('textarea[name="q"]', KEYWORD, { delay: 100 });
  await Promise.all([
    page.keyboard.press('Enter'),
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}),
  ]);

  const isCaptcha = await page.evaluate(() =>
    !!document.querySelector('form[action="/sorry/index"]') ||
    document.title.toLowerCase().includes('captcha') ||
    document.body.innerText.toLowerCase().includes('unusual traffic')
  );

  if (isCaptcha) {
    console.log(`Visit #${visitNumber}: CAPTCHA detected on SERP.`);
    await page.screenshot({ path: `captcha_visit_${visitNumber}.png` });

    const solved = await solveRecaptcha(page);
    if (!solved) {
      console.error(`Visit #${visitNumber}: Failed to solve CAPTCHA.`);
      await page.close();
      return false;
    }

    console.log(`Visit #${visitNumber}: CAPTCHA solved successfully.`);
    try {
      await page.waitForFunction(() =>
        location.pathname === '/search' &&
        document.title.toLowerCase().includes('google')
      , { timeout: 15000 });
      console.log(`Visit #${visitNumber}: SERP loaded after CAPTCHA.`);
    } catch {
      console.log(`Visit #${visitNumber}: SERP did not load after CAPTCHA.`);
    }
  }

  console.log(`Keeping SERP open for 60 seconds...`);
  await delay(60000);

  await page.close();
  return true;
}

(async () => {
  const visits = parseInt(process.argv[2]) || 1;

  let proxy;
  try {
    const proxyRes = await axios.get(PROXY_API);
    proxy = proxyRes.data?.data?.proxy;
    if (!proxy) throw new Error('No proxy');
  } catch (e) {
    console.error('Proxy fetch failed:', e.message);
    return;
  }

  const [host, port, username, password] = proxy.split(':');

  const browser = await puppeteer.launch({
    headless: false,
    args: [`--proxy-server=${host}:${port}`],
  });

  if (username && password) {
    browser.on('targetcreated', async target => {
      try {
        const page = await target.page();
        if (page) {
          await page.authenticate({ username, password });
        }
      } catch {}
    });
  }

  for (let i = 1; i <= visits; i++) {
    console.log(`\n===== Starting visit #${i} =====`);
    const success = await runVisit(browser, i);
    if (!success) {
      console.log(`Visit #${i} failed.`);
    }
  }

  await browser.close();
  console.log('All visits done.');
})();