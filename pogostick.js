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

const keywords = [
  { keyword: '8xbet', visits_required: 500, visits_completed: 0 },
  { keyword: '8x bet', visits_required: 50, visits_completed: 0 },
  { keyword: 'đăng nhập 8xbet', visits_required: 30, visits_completed: 0 },
  { keyword: 'x8bet', visits_required: 20, visits_completed: 0 },
  { keyword: 'Cược 8x bet', visits_required: 10, visits_completed: 0 },
  { keyword: '8xbet bóng đá', visits_required: 10, visits_completed: 0 },
  { keyword: '8xbet chính thức', visits_required: 10, visits_completed: 0 },
  { keyword: '8xbet Man City', visits_required: 10, visits_completed: 0 },
  { keyword: '8xbet có uy tín không', visits_required: 10, visits_completed: 0 },
  { keyword: 'Xóa tài khoản 8xbet', visits_required: 10, visits_completed: 0 },
  { keyword: '8xbet của nước nào', visits_required: 10, visits_completed: 0 },
  { keyword: '8xbet hoàn cược lần đầu', visits_required: 10, visits_completed: 0 },
  { keyword: '8xbet soi kèo', visits_required: 10, visits_completed: 0 },
  // Add more keywords as needed
];


const PROXY_API = 'https://proxy.shoplike.vn/Api/getCurrentProxy?access_token=251911d53fcc081fcbff56c222917c7c';

const CAPTCHA_API_KEY = '792e588602955a039923cf4feeff93ad';

const IP_GEO_API_BASE = 'https://free.freeipapi.com/api/json/';

const WWPROXY_API_KEY = 'UK-e37a0660-63d7-4fc3-8301-85c3848f2292';
const WWPROXY_BASE = 'https://wwproxy.com/api/client/proxy';

const INTERACTIVE_DOMAINS = [
  'infinitelyloft.com', 'gptservice.app', 'doge30.com', '8xbet.promo',
  'paducahteachersfcu.org', 'honistaapk.me', 'ownchat.me', '8xbet.hot',
  '8xbetg.cc', 'servicesdealer.us', 'neodewa.org', 'wallcovering.club',
  '8xbetvn.ch', '8xbetd.xyz', 'europauniversitypress.co.uk', 'www.andygriffithshow.net'
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
  const totalVisitTime = 120000 + Math.floor(Math.random() * 60000); // 120s–180s
  const endTime = Date.now() + totalVisitTime;
  let pageCount = 0;

  console.log(chalk.cyan(`🕹️ Interacting with ${domain} for ${Math.floor(totalVisitTime / 1000)}s...`));

  try {
    while (Date.now() < endTime) {
      // Scroll up and down like a human
      const scrollTimes = 3 + Math.floor(Math.random() * 3); // 3–5 scrolls
      for (let i = 0; i < scrollTimes; i++) {
        await page.evaluate(() => window.scrollBy(0, window.innerHeight / 1.5));
        await delay(2000 + Math.random() * 2000);
      }

      // Sometimes scroll up a bit
      if (Math.random() > 0.5) {
        await page.evaluate(() => window.scrollBy(0, -window.innerHeight / 2));
        await delay(1500 + Math.random() * 1500);
      }

      // Interact with internal links on the page
      const internalLinks = await page.$$eval('a', anchors =>
        anchors.map(a => a.href).filter(href => {
          try {
            const url = new URL(href);
            return url.hostname === location.hostname && !href.includes('#');
          } catch {
            return false;
          }
        })
      );

      if (internalLinks.length > 0 && Date.now() + 10000 < endTime) {
        const nextLink = internalLinks[Math.floor(Math.random() * internalLinks.length)];
        console.log(chalk.gray(`    🔗 Navigating to: ${nextLink}`));
        try {
          await page.goto(nextLink, { waitUntil: 'domcontentloaded', timeout: 20000 });
          pageCount++;
        } catch (e) {
          console.log(chalk.red(`    ⚠️ Navigation error: ${e.message}`));
          break;
        }
      } else {
        // No more time or no links — just stay on the current page
        const remaining = endTime - Date.now();
        const stay = Math.max(10000, Math.min(30000, remaining));
        console.log(chalk.gray(`    💤 Staying on current page for ${Math.floor(stay / 1000)}s...`));
        await delay(stay);
        break;
      }

      // Stay 10–60s per page
      const dwell = 10000 + Math.floor(Math.random() * 50000);
      console.log(chalk.gray(`    ⏳ Staying on this page for ${Math.floor(dwell / 1000)}s...`));
      await delay(dwell);
    }

    console.log(chalk.cyan(`✅ Finished interaction. Visited ${pageCount + 1} page(s).`));
  } catch (e) {
    console.log(chalk.red(`⚠️ Interaction error: ${e.message}`));
  }
}



async function runVisit(browser, visitNumber, keyword) {

  const page = await browser.newPage();


  const devices = [
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
    'Galaxy S5',
    'Galaxy S5 landscape',
    'Galaxy S8',
    'Galaxy S8 landscape',
    'Galaxy S9+',
    'Galaxy S9+ landscape',
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
    'Moto G4 landscape',
    'iPad',
    'iPad landscape',
    'iPad Mini',
    'iPad Mini landscape',
    'iPad Pro 11',
    'iPad Pro 11 landscape'
  ];



  const randomDeviceName = devices[Math.floor(Math.random() * devices.length)];
  const device = puppeteer.pptr.KnownDevices[randomDeviceName];

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
    await page.type(searchSelector, keyword, { delay: 100 });

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
      await page.waitForSelector('.MjjYud, .egMi0', { timeout: 3000000 });
      await delay(1000); // optional: extra safety wait

      links = await page.$$eval('.MjjYud, .egMi0', divs =>
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

      console.log(chalk.gray(`  ➤ Opening in new tab [${i + 1}/${links.length}]: ${link}`));

      // Open new tab/page
      const newPage = await browser.newPage();
      await newPage.emulate(device); // Keep same device emulation

      try {
        await newPage.goto(link, { waitUntil: 'domcontentloaded', timeout: 30000 });

        if (INTERACTIVE_DOMAINS.includes(domain)) {
          console.log(chalk.green(`  🟢 Interactive domain matched: ${domain}`));
          await interactWithPage(newPage, domain);
          console.log(chalk.gray(`  ✖️ Finished interaction on: ${link}`));
          await newPage.close();
          break; // Exit loop if needed after interaction
        } else {
          console.log(chalk.yellow(`  🕒 Non-target site, closing after short wait.`));
          await delay(2000 + Math.floor(Math.random() * 1000));
          await newPage.close();
          console.log(chalk.gray(`  ✖️ Closed tab: ${link}`));
        }
      } catch (e) {
        console.log(chalk.red(`  ⚠️ Failed to load or interact: ${e.message}`));
        await newPage.close();
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

async function getProxyFromWWProxy() {
  console.log(chalk.bold.yellow(`📡 [WWProxy] Requesting new proxy...`));
  try {
    await axios.get(`${WWPROXY_BASE}/available?key=${WWPROXY_API_KEY}`);
    console.log(chalk.gray(`📨 [WWProxy] Requested new 1-minute proxy.`));
  } catch (e) {
    console.log(chalk.red(`⚠️ [WWProxy] Failed to request new proxy: ${e.message}`));
  }

  console.log(chalk.bold.yellow(`📡 [WWProxy] Fetching current proxy...`));
  try {
    const proxyRes = await axios.get(`${WWPROXY_BASE}/current?key=${WWPROXY_API_KEY}`);
    const data = proxyRes.data?.data;
    if (!data?.proxy) throw new Error('No proxy in response');

    const [proxyHost, proxyPort] = data.proxy.split(':');
    console.log(chalk.green(`🔐 [WWProxy] Proxy: ${chalk.bold(`${proxyHost}:${proxyPort}`)}`));

    const geoOk = await fetchProxyGeoInfo(proxyHost);
    if (!geoOk) {
      console.log(chalk.red('[WWProxy] ❌ Proxy geo check failed, skipping visit.'));
      return null;
    }

    return { proxyHost, proxyPort, proxyUsername: null, proxyPassword: null };
  } catch (e) {
    console.log(chalk.red(`❌ [WWProxy] Proxy fetch failed: ${e.message}`));
    return null;
  }
}

async function getProxyFromShoplike() {
  console.log(chalk.bold.yellow(`📡 [Shoplike] Requesting new proxy...`));
  try {
    await axios.get('https://proxy.shoplike.vn/Api/getNewProxy?access_token=251911d53fcc081fcbff56c222917c7c');
    console.log(chalk.gray('[Shoplike] 📨 Requested new 1-minute proxy.'));
  } catch (e) {
    console.log(chalk.red(`⚠️ [Shoplike] Failed to order new proxy: ${e.message}`));
  }

  console.log(chalk.bold.yellow(`📡 [Shoplike] Fetching proxy...`));
  try {
    const proxyRes = await axios.get(PROXY_API);
    const data = proxyRes.data?.data;
    if (!data?.proxy) throw new Error('No proxy found in response');

    const [proxyHost, proxyPort] = data.proxy.split(':');
    let proxyUsername = null, proxyPassword = null;

    if (data.auth?.account && data.auth.account.includes(':')) {
      [proxyUsername, proxyPassword] = data.auth.account.split(':');
    }

    console.log(chalk.green(`🔐 [Shoplike] Proxy: ${chalk.bold(`${proxyHost}:${proxyPort}`)}`));
    if (proxyUsername && proxyPassword) {
      console.log(chalk.green(`🔐 Auth: ${proxyUsername}:${proxyPassword}`));
    } else {
      console.log(chalk.yellow(`🔓 No authentication required.`));
    }

    const geoOk = await fetchProxyGeoInfo(proxyHost);
    if (!geoOk) {
      console.log(chalk.red('[Shoplike] ❌ Proxy geo check failed, skipping visit.'));
      return null;
    }

    return { proxyHost, proxyPort, proxyUsername, proxyPassword };
  } catch (e) {
    console.error(chalk.red(`❌ [Shoplike] Proxy fetch failed: ${e.message}`));
    return null;
  }
}


const main = async () => {
  let totalVisits = 0;

  while (true) {
    const remainingKeywords = keywords.filter(k => k.visits_completed < k.visits_required);
    if (remainingKeywords.length === 0) {
      console.log(chalk.greenBright('\n🎉 All keyword traffic goals completed. Exiting...'));
      break;
    }

    const selected = remainingKeywords[Math.floor(Math.random() * remainingKeywords.length)];
    const keyword = selected.keyword;
    const keywordIndex = keywords.findIndex(k => k.keyword === keyword);
    const visitNumber = selected.visits_completed + 1;
    totalVisits++;

    console.log(chalk.inverse(`\n===== Starting Visit #${visitNumber} for keyword "${keyword}" =====`));

    // 🔀 Random proxy provider
    const useWWProxy = Math.random() > 0.5;
    const providerName = useWWProxy ? 'WWProxy' : 'Shoplike';
    console.log(chalk.bold.cyan(`🔀 Using proxy provider: ${providerName}`));

    let proxyInfo = useWWProxy
      ? await getProxyFromWWProxy()
      : await getProxyFromShoplike();

    if (!proxyInfo) {
      console.log(chalk.red(`❌ Skipping visit due to proxy error.`));
      continue;
    }

    const { proxyHost, proxyPort, proxyUsername, proxyPassword } = proxyInfo;

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
      const success = await runVisit(browser, visitNumber, keyword);
      if (success) {
        keywords[keywordIndex].visits_completed++;
        console.log(chalk.green(`✅ Updated visits_completed: ${keywords[keywordIndex].visits_completed}/${keywords[keywordIndex].visits_required} for "${keyword}"`));
      } else {
        console.log(chalk.red(`❌ Visit failed for keyword "${keyword}".`));
      }
    } catch (err) {
      console.log(chalk.red(`💥 Visit crashed: ${err.message}`));
    }

    await browser.close();
  }

  console.log(chalk.greenBright(`\n🏁 Finished ${totalVisits} total visits.`));
};




process.on('unhandledRejection', (reason, promise) => {
  console.log(chalk.red('⚠️ Unhandled Rejection:'), reason);
});
process.on('uncaughtException', err => {
  console.log(chalk.red('💥 Uncaught Exception:'), err.message);
});

main();
