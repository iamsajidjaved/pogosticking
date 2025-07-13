const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const AnonymizeUAPlugin = require('puppeteer-extra-plugin-anonymize-ua');
const axios = require('axios');

puppeteer.use(StealthPlugin());
puppeteer.use(AnonymizeUAPlugin());

const KEYWORD = '8xbet';
const TARGET_DOMAIN = 'honistaapk.me';
const PROXY_API = 'https://proxy.shoplike.vn/Api/getCurrentProxy?access_token=b4b85546eaddfd86d54506c91d69e60d';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/109.0',
    'Mozilla/5.0 (Linux; Android 11; SM-A107F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1'
];
const getRandomUserAgent = () => userAgents[Math.floor(Math.random() * userAgents.length)];

(async () => {
    const proxyRes = await axios.get(PROXY_API);
    const proxyData = proxyRes.data?.data;
    const proxy = proxyData?.proxy;

    if (!proxy) {
        console.error('❌ No proxy returned');
        return;
    }

    console.log(`🔗 Using proxy: ${proxy}`);

    // Parse proxy for potential authentication
    const proxyParts = proxy.split(':');
    let proxyHost, proxyPort, proxyUsername, proxyPassword;
    if (proxyParts.length === 4) {
        [proxyHost, proxyPort, proxyUsername, proxyPassword] = proxyParts;
    } else {
        [proxyHost, proxyPort] = proxyParts;
    }

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: [
            `--proxy-server=${proxyHost}:${proxyPort}`,
            '--lang=vi-VN',
            '--start-maximized',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-infobars',
            '--window-position=0,0'
        ],
        ...(proxyUsername && proxyPassword ? {
            authentication: {
                username: proxyUsername,
                password: proxyPassword
            }
        } : {})
    });

    const page = await browser.newPage();

    await page.setUserAgent(getRandomUserAgent());
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'vi-VN,vi;q=0.9'
    });
    await page.setViewport({ width: 1366, height: 768 });
    await page.emulateTimezone('Asia/Ho_Chi_Minh');

    // Go to Google Vietnam with retry mechanism for CAPTCHA
    let attempts = 0;
    const maxAttempts = 3;
    let captchaDetected = false;

    while (attempts < maxAttempts) {
        try {
            await page.goto('https://www.google.com.vn/ncr', { waitUntil: 'networkidle2', timeout: 30000 });

            // Check for CAPTCHA
            const isCaptcha = await page.evaluate(() => {
                return document.querySelector('form[action="/sorry/index"]') !== null ||
                       document.title.includes('CAPTCHA') ||
                       document.body.innerText.includes('Our systems have detected unusual traffic');
            });

            if (isCaptcha) {
                console.log('⚠️ CAPTCHA detected, retrying...');
                captchaDetected = true;
                attempts++;
                await delay(5000 + Math.random() * 2000);
                continue;
            }

            // Handle consent screen
            try {
                await page.waitForSelector('#L2AGLb', { timeout: 5000 });
                await page.click('#L2AGLb');
                await delay(1000);
            } catch { }

            break; // Exit loop if no CAPTCHA
        } catch (err) {
            console.error(`❌ Navigation error (Attempt ${attempts + 1}):`, err.message);
            attempts++;
            if (attempts >= maxAttempts) {
                console.error('❌ Max navigation attempts reached');
                await browser.close();
                return;
            }
            await delay(5000 + Math.random() * 2000);
        }
    }

    if (captchaDetected && attempts >= maxAttempts) {
        console.error('❌ Failed to bypass CAPTCHA after max attempts');
        await browser.close();
        return;
    }

    // Simulate human activity with randomized mouse movements
    await page.mouse.move(
        100 + Math.random() * 400,
        100 + Math.random() * 400,
        { steps: 10 }
    );
    await delay(2000 + Math.random() * 1000);

    // Search using Vietnamese keyword
    await page.waitForSelector('textarea[name="q"]', { timeout: 10000 });
    await delay(1000 + Math.random() * 500);
    await page.type('textarea[name="q"]', KEYWORD, { delay: 100 + Math.random() * 50 });
    await page.keyboard.press('Enter');
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 });

    // Extract search result links
    let searchLinks = [];
    try {
        await page.waitForSelector('a', { timeout: 10000 });
        await delay(1500 + Math.random() * 1000);
        searchLinks = await page.$$eval('a', links =>
            links.map(link => link.href).filter(href =>
                href.startsWith('http') && !href.includes('google') && !href.includes('#')
            )
        );
    } catch (err) {
        console.error('❌ Failed to extract links:', err.message);
    }

    for (const link of searchLinks) {
        const tempPage = await browser.newPage();
        try {
            await delay(1000 + Math.random() * 500);
            await tempPage.goto(link, { timeout: 20000, waitUntil: 'domcontentloaded' });
            const currentURL = tempPage.url();
            console.log('Visited:', currentURL);

            // Check for CAPTCHA on visited page
            const isCaptcha = await tempPage.evaluate(() => {
                return document.querySelector('form[action="/sorry/index"]') !== null ||
                       document.title.includes('CAPTCHA') ||
                       document.body.innerText.includes('Our systems have detected unusual traffic');
            });

            if (isCaptcha) {
                console.log('⚠️ CAPTCHA detected on:', currentURL);
                await tempPage.close();
                continue;
            }

            if (currentURL.includes(TARGET_DOMAIN)) {
                console.log('✅ Found target domain. Simulating interaction...');
                await simulateUserBehavior(tempPage);
                break;
            }

            await delay(1500 + Math.random() * 1000); // Simulate pogo exit
        } catch (err) {
            console.error('❌ Failed to load:', link, err.message);
        }
        await tempPage.close();
    }

    await browser.close();
})();

async function simulateUserBehavior(page) {
    const start = Date.now();
    const duration = 60000 + Math.random() * 30000;

    for (let i = 0; i < 6; i++) {
        await page.evaluate(() => window.scrollBy(0, window.innerHeight / 2));
        await delay(2500 + Math.random() * 1500);
    }

    const links = await page.$$('a[href^="/"], a[href*="honistaapk.me"]');
    for (let i = 0; i < Math.min(2, links.length); i++) {
        try {
            await links[i].click();
            await delay(4000 + Math.random() * 3000);
        } catch { }
    }

    const timeSpent = Date.now() - start;
    const timeLeft = duration - timeSpent;
    if (timeLeft > 0) {
        await delay(timeLeft);
    }

    console.log('🧠 Simulated dwell time complete');
}