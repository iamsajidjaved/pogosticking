import puppeteer from 'puppeteer-extra';
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha';
import axios from 'axios';
import chalk from 'chalk';

const KEYWORD = '8xbet';
const PROXY_API = 'https://proxy.shoplike.vn/Api/getCurrentProxy?access_token=b4b85546eaddfd86d54506c91d69e60d';
const CAPTCHA_API_KEY = '97706adf3edd3a9c3b0cc9d589a9f1e9';
const IP_GEO_API_BASE = 'https://free.freeipapi.com/api/json/';
const INTERACTIVE_DOMAINS = [
  'infinitelyloft.com', 'gptservice.app', 'doge30.com', '8xbet.promo',
  'paducahteachersfcu.org', 'honistaapk.me', 'ownchat.me', '8xbet.hot',
  '8xbetg.cc', 'servicesdealer.us', 'neodewa.org', 'wallcovering.club',
  '8xbetvn.ch', '8xbetd.xyz'
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

    // ✅ MINIMAL FIX: wait flexibly for page to return to normal
    await Promise.race([
      page.waitForSelector('#search', { timeout: 20000 }).catch(() => {}),
      page.waitForFunction(() => {
        const title = document.title.toLowerCase();
        return !title.includes('sorry') && !title.includes('captcha') && !title.includes('unusual traffic');
      }, { timeout: 20000 }).catch(() => {}),
      delay(5000)
    ]);

    console.log(chalk.green(`✅ CAPTCHA solved.`));
    return true;
  } catch (e) {
    console.log(chalk.red(`❌ CAPTCHA solve error: ${e.message}`));
    await page.screenshot({ path: `captcha_fail_single_attempt.png` });
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
  console.log(chalk.cyanBright(`🌐 Visit #${visitNumber}: Opening Google...`));

  try {
    await page.goto('https://www.google.com.vn', { waitUntil: 'networkidle2' });
  } catch (e) {
    console.error(chalk.red(`❌ Google load failed: ${e.message}`));
    await page.close();
    return false;
  }

  try {
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
      console.log(chalk.red(`🚧 CAPTCHA detected.`));
      await page.screenshot({ path: `captcha_visit_${visitNumber}.png` });
      const solved = await solveRecaptcha(page);
      if (!solved) {
        console.log(chalk.red(`❌ CAPTCHA solve failed.`));
        await page.close();
        return false;
      }
    }

    let pageCount = 0;
    while (true) {
      pageCount++;
      console.log(chalk.cyan(`📄 SERP page #${pageCount}`));

      await page.waitForSelector('span.V9tjod a', { timeout: 10000 }).catch(() => {});

      let links = [];
      try {
        links = await page.$$eval('span.V9tjod a', anchors =>
          anchors.map(a => a.href).filter(href => href && !href.includes('google.com'))
        );
      } catch (e) {
        console.log(chalk.red(`⚠️ Failed to extract SERP links: ${e.message}`));
        await page.close();
        return true;
      }

      console.log(chalk.magenta(`🔗 Found ${links.length} links.`));

      for (const [i, link] of links.entries()) {
        const newTab = await browser.newPage();
        let domain;
        try {
          domain = new URL(link).hostname.replace(/^www\./, '');
        } catch (e) {
          console.log(chalk.red(`  ❌ Invalid URL: ${link}`));
          await newTab.close();
          continue;
        }

        console.log(chalk.gray(`  ➤ Opening [${i + 1}/${links.length}]: ${link}`));
        try {
          await newTab.goto(link, { waitUntil: 'domcontentloaded', timeout: 30000 });
        } catch (e) {
          console.log(chalk.red(`  ⚠️ Failed to load: ${link}`));
          await newTab.close();
          continue;
        }

        if (INTERACTIVE_DOMAINS.includes(domain)) {
          console.log(chalk.green(`  🟢 Interactive domain: ${domain}`));
          await interactWithPage(newTab, domain);
        } else {
          console.log(chalk.yellow(`  🕒 Non-target site, closing after short wait.`));
          await delay(2000 + Math.floor(Math.random() * 1000));
        }

        await newTab.close();
        console.log(chalk.gray(`  ✖️ Closed tab: ${link}`));
      }

      const hasNext = await page.$('a#pnnext');
      if (!hasNext) {
        console.log(chalk.green(`✅ No more SERP pages.`));
        break;
      }

      console.log(chalk.blue(`➡️ Going to next page...`));
      await Promise.all([
        page.click('a#pnnext'),
        page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}),
      ]);
      await delay(2000);
    }

    await page.close();
    return true;
  } catch (err) {
    console.log(chalk.red(`💥 Error in runVisit: ${err.message}`));
    try { await page.close(); } catch {}
    return false;
  }
}

const main = async () => {
  const visits = parseInt(process.argv[2]) || 1;

  for (let i = 1; i <= visits; i++) {
    console.log(chalk.inverse(`\n===== Starting Visit #${i} =====`));

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
        } catch {}
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
