import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-extra';
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import axios from 'axios';
import chalk from 'chalk';

puppeteer.use(StealthPlugin());

// ======= Log to logs.txt =======
const logStream = fs.createWriteStream('logs.txt', { flags: 'a' });
const origLog = console.log;
const origErr = console.error;

console.log = (...args) => {
  origLog(...args);
  logStream.write(args.map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ') + '\n');
};
console.error = (...args) => {
  origErr(...args);
  logStream.write(args.map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ') + '\n');
};
// =================================

const KEYWORD = '8xbet';
const PROXY_API = 'https://proxy.shoplike.vn/Api/getCurrentProxy?access_token=251911d53fcc081fcbff56c222917c7c';
const CAPTCHA_API_KEY = '792e588602955a039923cf4feeff93ad';
const IP_GEO_API_BASE = 'https://free.freeipapi.com/api/json/';
const INTERACTIVE_DOMAINS = [
  'infinitelyloft.com', 'gptservice.app', 'doge30.com', '8xbet.promo',
  'paducahteachersfcu.org', 'honistaapk.me', 'ownchat.me', '8xbet.hot',
  '8xbetg.cc', 'servicesdealer.us', 'neodewa.org', 'wallcovering.club',
  '8xbetvn.ch', '8xbetd.xyz', 'europauniversitypress.co.uk'
];

const delay = ms => new Promise(res => setTimeout(res, ms));

puppeteer.use(
  RecaptchaPlugin({
    provider: { id: '2captcha', token: CAPTCHA_API_KEY },
    throwOnError: false,
  })
);

async function fetchProxyGeoInfo(ip) {
  try {
    const res = await axios.get(IP_GEO_API_BASE + ip, { timeout: 10000 });
    const data = res.data;
    if (!data || !data.ipAddress) throw new Error('Invalid geo data');

    console.log(chalk.blueBright('🌍 Proxy Geo Info:'));
    console.log(`  Country:  ${data.countryName || 'N/A'}`);
    console.log(`  City:     ${data.cityName || 'N/A'}`);
    console.log(`  Region:   ${data.regionName || 'N/A'}`);
    console.log(`  Telecom:  ${data.asnOrganization || 'N/A'}`);
    console.log(`  Timezone: ${Array.isArray(data.timeZones) ? data.timeZones.join(', ') : 'N/A'}`);
    console.log(`  Language: ${Array.isArray(data.languages) ? data.languages.join(', ') : 'N/A'}`);
    return true;
  } catch (err) {
    console.log(chalk.red(`❌ Failed to fetch proxy geo info: ${err.message}`));
    return false;
  }
}

async function solveRecaptcha(page) {
  console.log(chalk.yellow(`🔐 Solving CAPTCHA (single attempt)...`));
  try {
    const { solved, error } = await page.solveRecaptchas();
    if (error) {
      console.log(chalk.red(`❌ 2Captcha error: ${error}`));
      return false;
    }

    await Promise.race([
      page.waitForSelector('#search', { timeout: 20000 }).catch(() => { }),
      page.waitForFunction(() => {
        const title = document.title.toLowerCase();
        return !title.includes('sorry') && !title.includes('captcha') && !title.includes('unusual traffic');
      }, { timeout: 20000 }).catch(() => { }),
      delay(5000)
    ]);

    console.log(chalk.green(`✅ CAPTCHA solved.`));
    return true;
  } catch (e) {
    console.log(chalk.red(`❌ CAPTCHA solve error: ${e.message}`));
    return false;
  }
}

async function interactWithPage(page, domain) {
  const totalTime = 60000 + Math.floor(Math.random() * 15000);
  const endTime = Date.now() + totalTime;
  console.log(chalk.cyan(`🕹️ Interacting with ${domain} for ${Math.floor(totalTime / 1000)}s...`));

  try {
    await page.evaluate(() => window.scrollTo(0, 0));
    while (Date.now() < endTime) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight / 2));
      await delay(3000 + Math.random() * 2000);

      const links = await page.$$eval('a', anchors =>
        anchors.map(a => a.href).filter(h => h && h.startsWith(location.origin) && !h.includes('#'))
      );

      if (links.length > 0) {
        const randomLink = links[Math.floor(Math.random() * links.length)];
        console.log(chalk.gray(`    🔗 Navigating to: ${randomLink}`));
        try {
          await page.goto(randomLink, { waitUntil: 'domcontentloaded', timeout: 30000 });
        } catch {
          console.log(chalk.red(`    ⚠️ Failed internal navigation.`));
        }
      }
    }
  } catch (e) {
    console.log(chalk.red(`⚠️ Interaction failed: ${e.message}`));
  }
}

async function runVisit(browser, visitNumber) {
  const page = await browser.newPage();

  const device = puppeteer.pptr.KnownDevices[
    'Blackberry PlayBook',
    'Blackberry PlayBook landscape',
    'BlackBerry Z30',
    'BlackBerry Z30 landscape',
    'Galaxy Note 3',
    'Galaxy Note 3 landscape',
    'Galaxy Note II',
    'Galaxy Note II landscape',
    'Galaxy S III',
    'Galaxy S III landscape',
    'Galaxy S5',
    'Galaxy S5 landscape',
    'Galaxy S8',
    'Galaxy S8 landscape',
    'Galaxy S9+',
    'Galaxy S9+ landscape',
    'Galaxy Tab S4',
    'Galaxy Tab S4 landscape',
    'iPad',
    'iPad landscape',
    'iPad (gen 6)',
    'iPad (gen 6) landscape',
    'iPad (gen 7)',
    'iPad (gen 7) landscape',
    'iPad Mini',
    'iPad Mini landscape',
    'iPad Pro',
    'iPad Pro landscape',
    'iPad Pro 11',
    'iPad Pro 11 landscape',
    'iPhone 4',
    'iPhone 4 landscape',
    'iPhone 5',
    'iPhone 5 landscape',
    'iPhone 6',
    'iPhone 6 landscape',
    'iPhone 6 Plus',
    'iPhone 6 Plus landscape',
    'iPhone 7',
    'iPhone 7 landscape',
    'iPhone 7 Plus',
    'iPhone 7 Plus landscape',
    'iPhone 8',
    'iPhone 8 landscape',
    'iPhone 8 Plus',
    'iPhone 8 Plus landscape',
    'iPhone SE',
    'iPhone SE landscape',
    'iPhone X',
    'iPhone X landscape',
    'iPhone XR',
    'iPhone XR landscape',
    'iPhone 11',
    'iPhone 11 landscape',
    'iPhone 11 Pro',
    'iPhone 11 Pro landscape',
    'iPhone 11 Pro Max',
    'iPhone 11 Pro Max landscape',
    'iPhone 12',
    'iPhone 12 landscape',
    'iPhone 12 Pro',
    'iPhone 12 Pro landscape',
    'iPhone 12 Pro Max',
    'iPhone 12 Pro Max landscape',
    'iPhone 12 Mini',
    'iPhone 12 Mini landscape',
    'iPhone 13',
    'iPhone 13 landscape',
    'iPhone 13 Pro',
    'iPhone 13 Pro landscape',
    'iPhone 13 Pro Max',
    'iPhone 13 Pro Max landscape',
    'iPhone 13 Mini',
    'iPhone 13 Mini landscape',
    'iPhone 14',
    'iPhone 14 landscape',
    'iPhone 14 Plus',
    'iPhone 14 Plus landscape',
    'iPhone 14 Pro',
    'iPhone 14 Pro landscape',
    'iPhone 14 Pro Max',
    'iPhone 14 Pro Max landscape',
    'iPhone 15',
    'iPhone 15 landscape',
    'iPhone 15 Plus',
    'iPhone 15 Plus landscape',
    'iPhone 15 Pro',
    'iPhone 15 Pro landscape',
    'iPhone 15 Pro Max',
    'iPhone 15 Pro Max landscape',
    'JioPhone 2',
    'JioPhone 2 landscape',
    'Kindle Fire HDX',
    'Kindle Fire HDX landscape',
    'LG Optimus L70',
    'LG Optimus L70 landscape',
    'Microsoft Lumia 550',
    'Microsoft Lumia 950',
    'Microsoft Lumia 950 landscape',
    'Nexus 10',
    'Nexus 10 landscape',
    'Nexus 4',
    'Nexus 4 landscape',
    'Nexus 5',
    'Nexus 5 landscape',
    'Nexus 5X',
    'Nexus 5X landscape',
    'Nexus 6',
    'Nexus 6 landscape',
    'Nexus 6P',
    'Nexus 6P landscape',
    'Nexus 7',
    'Nexus 7 landscape',
    'Nokia Lumia 520',
    'Nokia Lumia 520 landscape',
    'Nokia N9',
    'Nokia N9 landscape',
    'Pixel 2',
    'Pixel 2 landscape',
    'Pixel 2 XL',
    'Pixel 2 XL landscape',
    'Pixel 3',
    'Pixel 3 landscape',
    'Pixel 4',
    'Pixel 4 landscape',
    'Pixel 4a (5G)',
    'Pixel 4a (5G) landscape',
    'Pixel 5',
    'Pixel 5 landscape',
    'Moto G4',
    'Moto G4 landscape'
  ];

  console.log(chalk.blueBright('📱 Device Info:'));
  console.log(`    Name:           ${device.name || 'N/A'}`);
  console.log(`    User Agent:     ${device.userAgent || 'N/A'}`);
  console.log(`    Width:        ${device.viewport.width || 'N/A'}`);
  console.log(`    Height:       ${device.viewport.height || 'N/A'}`);
  console.log(`    Device Scale: ${device.viewport.deviceScaleFactor || 'N/A'}`);
  console.log(`    Mobile:       ${device.viewport.isMobile ? 'Yes' : 'No'}`);
  console.log(`    Touch:        ${device.viewport.hasTouch ? 'Yes' : 'No'}`);
  console.log(`    Landscape:    ${device.viewport.isLandscape ? 'Yes' : 'No'}`);


  await page.emulate(device);

  await page.setExtraHTTPHeaders({ 'Accept-Language': 'vi-VN,vi;q=0.9' });
  await page.emulateTimezone('Asia/Ho_Chi_Minh');

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'language', { get: () => 'vi-VN' });
    Object.defineProperty(navigator, 'languages', { get: () => ['vi-VN', 'vi'] });
  });

  console.log(chalk.cyanBright(`🌐 Visit #${visitNumber}: Opening Google...`));

  try {
    await page.goto('https://www.google.com.vn', { waitUntil: 'networkidle2' });
    const searchSelector = 'textarea[name="q"], input[name="q"]';
    await page.waitForSelector(searchSelector, { timeout: 100 });
    await page.type(searchSelector, KEYWORD, { delay: 100 });
    await page.keyboard.press('Enter');

    try {
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
    } catch (err) {
      console.log('⏳ Navigation timeout or early redirect. Continuing anyway...');
    }


    const isCaptcha = await page.evaluate(() =>
      !!document.querySelector('form[action="/sorry/index"]') ||
      document.title.toLowerCase().includes('captcha') ||
      document.body.innerText.toLowerCase().includes('unusual traffic')
    );

    if (isCaptcha) {
      console.log(chalk.red(`🚧 CAPTCHA detected.`));
      const solved = await solveRecaptcha(page);
      if (!solved) {
        console.log(chalk.red(`❌ CAPTCHA solve failed.`));
        await page.close();
        return false;
      }
    }

    let links = [];
    try {
      // Wait again after CAPTCHA solve
      await page.waitForSelector('.MjjYud', { timeout: 10000 });
      await delay(1000); // optional: extra safety wait

      links = await page.$$eval('.MjjYud', divs =>
        divs.map(div => {
          const aTag = div.querySelector('a');
          return aTag ? aTag.href : null;
        }).filter(href => href && !href.includes('google.com'))
      );

      console.log(chalk.magenta(`🔗 Found ${links.length} links.`));
    } catch (e) {
      console.log(chalk.red(`⚠️ Failed to extract SERP links: ${e.message}`));
      await page.close();
      return true;
    }

    console.log(chalk.magenta(`🔗 Found ${links.length} links.`));

    for (const [i, link] of links.entries()) {
      let domain;
      try {
        domain = new URL(link).hostname.replace(/^www\./, '');
      } catch (e) {
        console.log(chalk.red(`  ❌ Invalid URL: ${link}`));
        continue;
      }

      console.log(chalk.gray(`  ➤ Clicking [${i + 1}/${links.length}]: ${link}`));
      try {
        // Simulate a human clicking the link
        const clicked = await page.evaluate((targetHref) => {
          const anchors = Array.from(document.querySelectorAll('.MjjYud a'));
          const target = anchors.find(a => a.href === targetHref);
          if (target) {
            target.click();
            return true;
          }
          return false;
        }, link);

        if (!clicked) {
          console.log(chalk.red(`  ❌ Couldn't find clickable link for: ${link}`));
          continue;
        }

        await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 });

        if (INTERACTIVE_DOMAINS.includes(domain)) {
          console.log(chalk.green(`  🟢 Interactive domain matched: ${domain}`));
          await interactWithPage(page, domain);
          console.log(chalk.gray(`  ✖️ Finished interaction on: ${link}`));
          break;
        } else {
          console.log(chalk.yellow(`  🕒 Non-target site, closing after short wait.`));
          await delay(2000 + Math.floor(Math.random() * 1000));
          console.log(chalk.gray(`  ✖️ Leaving site: ${link}`));
          await page.goBack({ waitUntil: 'domcontentloaded', timeout: 10000 });
        }
      } catch (e) {
        console.log(chalk.red(`  ⚠️ Click failed or navigation issue: ${e.message}`));
        try { await page.goBack(); } catch { }
        continue;
      }
    }


    await page.close();
    return true;
  } catch (err) {
    console.log(chalk.red(`💥 Error in runVisit: ${err.message}`));
    try { await page.close(); } catch { }
    return false;
  }
}

const main = async () => {
  const visits = parseInt(process.argv[2]) || 1;

  for (let i = 1; i <= visits; i++) {
    console.log(chalk.inverse(`\n===== Starting Visit #${i} =====`));

    // ✅ ORDER new proxy and WAIT for response (success or fail)
    console.log(chalk.bold.yellow(`📡 Ordering new proxy...`));
    try {
      await axios.get('https://proxy.shoplike.vn/Api/getNewProxy?access_token=251911d53fcc081fcbff56c222917c7c&location=hcm');
      console.log(chalk.gray('📨 Requested new 1-minute proxy.'));
    } catch (e) {
      console.log(chalk.red(`⚠️ Failed to order new proxy: ${e.message}`));
    }

    console.log(chalk.bold.yellow(`📡 Fetching proxy...`));
    let proxyHost, proxyPort, proxyUsername, proxyPassword;

    try {
      const proxyRes = await axios.get(PROXY_API);
      const data = proxyRes.data?.data;
      if (!data?.proxy) throw new Error('No proxy found in response');

      [proxyHost, proxyPort] = data.proxy.split(':');
      if (data.auth?.account && data.auth.account.includes(':')) {
        [proxyUsername, proxyPassword] = data.auth.account.split(':');
      }

      console.log(chalk.green(`🔐 Proxy: ${chalk.bold(`${proxyHost}:${proxyPort}`)}`));
      if (proxyUsername && proxyPassword) {
        console.log(chalk.green(`🔐 Auth: ${proxyUsername}:${proxyPassword}`));
      } else {
        console.log(chalk.yellow(`🔓 No authentication required.`));
      }

      const geoOk = await fetchProxyGeoInfo(proxyHost);
      if (!geoOk) {
        console.log(chalk.red('❌ Proxy geo check failed, skipping visit.'));
        continue;
      }
    } catch (e) {
      console.error(chalk.red(`❌ Proxy fetch failed: ${e.message}`));
      continue;
    }

    const browser = await puppeteer.launch({
      headless: false,
      args: [`--proxy-server=${proxyHost}:${proxyPort}`],
    });

    if (proxyUsername && proxyPassword) {
      browser.on('targetcreated', async target => {
        try {
          const page = await target.page();
          if (page) {
            await page.authenticate({ username: proxyUsername, password: proxyPassword });
          }
        } catch { }
      });
    }

    try {
      const success = await runVisit(browser, i);
      if (!success) {
        console.log(chalk.red(`Visit #${i} failed.`));
      }
    } catch (err) {
      console.log(chalk.red(`💥 Visit #${i} crashed: ${err.message}`));
    }

    await browser.close();
  }

  console.log(chalk.greenBright('🎉 All visits completed.'));
};


process.on('unhandledRejection', (reason, promise) => {
  console.log(chalk.red('⚠️ Unhandled Rejection:'), reason);
});
process.on('uncaughtException', err => {
  console.log(chalk.red('💥 Uncaught Exception:'), err.message);
});

main();
