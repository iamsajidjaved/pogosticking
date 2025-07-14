const puppeteer = require('puppeteer');
const axios = require('axios');
const Captcha = require('@2captcha/captcha-solver');

const KEYWORD = '8xbet';
const PROXY_API = 'https://proxy.shoplike.vn/Api/getCurrentProxy?access_token=b4b85546eaddfd86d54506c91d69e60d';
const CAPTCHA_API_KEY = '97706adf3edd3a9c3b0cc9d589a9f1e9';

const delay = ms => new Promise(r => setTimeout(r, ms));

async function solveRecaptcha(page, apiKey, maxRetries = 3) {
    const solver = new Captcha.Solver(apiKey);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`🧠 Attempt #${attempt} to solve CAPTCHA...`);

        try {
            await page.waitForSelector('iframe[src*="recaptcha"]', { timeout: 20000 });
        } catch {
            console.log('❌ No reCAPTCHA iframe found after waiting');
            return false;
        }

        const siteKey = await page.evaluate(() => {
            const iframe = document.querySelector('iframe[src*="recaptcha"]');
            if (!iframe) return null;
            const src = iframe.getAttribute('src');
            const match = src.match(/[?&]k=([^&]+)/);
            return match ? match[1] : null;
        });

        if (!siteKey) {
            console.log('❌ No sitekey found');
            return false;
        }

        const url = page.url();
        console.log(`Solving reCAPTCHA for sitekey: ${siteKey} on ${url}`);

        let token;
        try {
            const response = await solver.recaptcha({ googlekey: siteKey, pageurl: url });
            token = response.data;
            if (!token) throw new Error('No token received');
        } catch (e) {
            console.log('❌ 2Captcha request failed:', e.message);
            if (attempt === maxRetries) return false;
            console.log('⏳ Waiting 10s before retrying...');
            await delay(10000);
            continue;
        }

        console.log('✅ CAPTCHA solved, token received:', token.substring(0, 20) + '...');

        try {
            await page.evaluate(token => {
                let recaptchaResponse = document.querySelector('#g-recaptcha-response');
                if (!recaptchaResponse) {
                    recaptchaResponse = document.createElement('textarea');
                    recaptchaResponse.id = 'g-recaptcha-response';
                    recaptchaResponse.name = 'g-recaptcha-response';
                    recaptchaResponse.style.display = 'none';
                    document.body.appendChild(recaptchaResponse);
                }
                recaptchaResponse.value = token;
                recaptchaResponse.dispatchEvent(new Event('input', { bubbles: true }));
                recaptchaResponse.dispatchEvent(new Event('change', { bubbles: true }));
            }, token);

            await delay(2000);

            // ✅ Manual redirect using "continue=" URL param
            const redirected = await page.evaluate(() => {
                const match = location.href.match(/continue=([^&]+)/);
                if (match) {
                    const decoded = decodeURIComponent(match[1]);
                    location.href = decoded;
                    return true;
                }
                return false;
            });

            if (redirected) {
                console.log('🔁 Manually redirected to search results page...');
                await page.waitForNavigation({ timeout: 30000, waitUntil: 'domcontentloaded' }).catch(() => {});
            } else {
                console.log('⚠️ Could not find continue= URL for redirection.');
                await delay(5000);
            }

            return true;
        } catch (e) {
            console.log('❌ Error injecting CAPTCHA token:', e.message);
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

        const solved = await solveRecaptcha(page, CAPTCHA_API_KEY);
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
