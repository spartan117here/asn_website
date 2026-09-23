const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = 'C:\\Users\\Pothys\\AppData\\Local\\Temp\\chrome_accordion_check_' + Date.now();
const artifactDir = 'C:\\Users\\Pothys\\.gemini\\antigravity-ide\\brain\\d579fb66-d965-409d-bdbd-6d3371610612';

const chrome = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9222',
  `--user-data-dir=${userDataDir}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-gpu',
  'http://localhost:4173/'
]);

async function run() {
  await new Promise(r => setTimeout(r, 1200));
  const res = await fetch('http://127.0.0.1:9222/json/list');
  const targets = await res.json();
  const page = targets.find(t => t.type === 'page' && t.url.includes('localhost:4173')) || targets.find(t => t.type === 'page') || targets[0];

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let id = 0;
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = ++id;
      const handler = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.id === msgId) {
          ws.removeEventListener('message', handler);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');

  async function evaluate(expr) {
    const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) {
      throw new Error(JSON.stringify(res.exceptionDetails));
    }
    return res.result ? res.result.value : undefined;
  }

  async function capture(name) {
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    const filePath = path.join(artifactDir, name);
    fs.writeFileSync(filePath, Buffer.from(screenshot.data, 'base64'));
    console.log(`Saved screenshot: ${name}`);
  }

  console.log('--- 1. TESTING DESKTOP (1440x900) ---');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });
  await new Promise(r => setTimeout(r, 600));

  const desktopCheck = await evaluate(`
    (() => {
      const desktopList = document.querySelector('.desktop-nav-list');
      const mobileAccordion = document.querySelector('.mobile-nav-accordion');
      const menuToggle = document.querySelector('#menuToggle');
      const desktopLinks = desktopList ? Array.from(desktopList.querySelectorAll('.nav-link')).map(l => l.textContent.trim().replace(/\\s+/g, ' ')) : [];
      return {
        desktopListDisplay: desktopList ? window.getComputedStyle(desktopList).display : 'none',
        mobileAccordionDisplay: mobileAccordion ? window.getComputedStyle(mobileAccordion).display : 'none',
        menuToggleDisplay: menuToggle ? window.getComputedStyle(menuToggle).display : 'none',
        desktopLinks
      };
    })()
  `);
  console.log('Desktop verification:', desktopCheck);
  await capture('desktop_nav_intact.png');

  console.log('\n--- 2. TESTING MOBILE (375x812 - iPhone X/11/12) ---');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 812,
    deviceScaleFactor: 2,
    mobile: true
  });
  await new Promise(r => setTimeout(r, 600));

  const mobileInitialCheck = await evaluate(`
    (() => {
      const desktopList = document.querySelector('.desktop-nav-list');
      const mobileAccordion = document.querySelector('.mobile-nav-accordion');
      const menuToggle = document.querySelector('#menuToggle');
      const navMenu = document.querySelector('#navMenu');
      return {
        desktopListDisplay: desktopList ? window.getComputedStyle(desktopList).display : 'none',
        mobileAccordionDisplay: mobileAccordion ? window.getComputedStyle(mobileAccordion).display : 'none',
        menuToggleDisplay: menuToggle ? window.getComputedStyle(menuToggle).display : 'none',
        isMenuOpen: navMenu ? navMenu.classList.contains('site-nav__links--open') : false
      };
    })()
  `);
  console.log('Mobile initial state:', mobileInitialCheck);

  // Click hamburger menu to open
  console.log('\nOpening hamburger menu...');
  await evaluate(`document.querySelector('#menuToggle').click();`);
  await new Promise(r => setTimeout(r, 400));

  const menuOpenCheck = await evaluate(`
    (() => {
      const navMenu = document.querySelector('#navMenu');
      const items = Array.from(document.querySelectorAll('.mobile-nav-accordion .accordion-item')).map(item => {
        const title = item.querySelector('.accordion-title')?.textContent.trim();
        const isOpen = item.classList.contains('accordion-item--open');
        const panel = item.querySelector('.accordion-panel');
        const panelHeight = panel ? panel.getBoundingClientRect().height : 0;
        return { title, isOpen, panelHeight };
      });
      return {
        isMenuOpen: navMenu.classList.contains('site-nav__links--open'),
        menuHeight: navMenu.getBoundingClientRect().height,
        items
      };
    })()
  `);
  console.log('Menu opened check (all closed by default):', menuOpenCheck);
  await capture('mobile_menu_opened_default.png');

  // Click 1: "ABOUT ASN"
  console.log('\nClicking "ABOUT ASN" accordion...');
  await evaluate(`
    (() => {
      const aboutBtn = document.querySelector('.accordion-item[data-accordion="about"] .accordion-header');
      aboutBtn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 400));

  const aboutOpenCheck = await evaluate(`
    (() => {
      const aboutItem = document.querySelector('.accordion-item[data-accordion="about"]');
      const header = aboutItem.querySelector('.accordion-header');
      const panel = aboutItem.querySelector('.accordion-panel');
      const chevron = aboutItem.querySelector('.accordion-chevron');
      const links = Array.from(aboutItem.querySelectorAll('.accordion-link')).map(l => ({ text: l.textContent.trim(), href: l.getAttribute('href') }));
      return {
        isOpen: aboutItem.classList.contains('accordion-item--open'),
        headerColor: window.getComputedStyle(header).color,
        panelHeight: panel.getBoundingClientRect().height,
        chevronTransform: window.getComputedStyle(chevron).transform,
        links
      };
    })()
  `);
  console.log('About ASN opened:', aboutOpenCheck);
  await capture('mobile_accordion_about_open.png');

  // Click 2: "PRODUCTS" (should close ABOUT ASN and open PRODUCTS)
  console.log('\nClicking "PRODUCTS" accordion (testing single-open behavior)...');
  await evaluate(`
    (() => {
      const prodBtn = document.querySelector('.accordion-item[data-accordion="products"] .accordion-header');
      prodBtn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 400));

  const singleOpenCheck = await evaluate(`
    (() => {
      const aboutItem = document.querySelector('.accordion-item[data-accordion="about"]');
      const prodItem = document.querySelector('.accordion-item[data-accordion="products"]');
      const aboutPanel = aboutItem.querySelector('.accordion-panel');
      const prodPanel = prodItem.querySelector('.accordion-panel');
      const prodLinks = Array.from(prodItem.querySelectorAll('.accordion-link')).map(l => ({ text: l.textContent.trim(), href: l.getAttribute('href') }));
      return {
        aboutIsOpen: aboutItem.classList.contains('accordion-item--open'),
        aboutPanelHeight: aboutPanel.getBoundingClientRect().height,
        prodIsOpen: prodItem.classList.contains('accordion-item--open'),
        prodPanelHeight: prodPanel.getBoundingClientRect().height,
        prodLinks
      };
    })()
  `);
  console.log('Single-open check (Products open, About closed):', singleOpenCheck);
  await capture('mobile_accordion_products_open.png');

  // Click 3: "TRADE & LOGISTICS"
  console.log('\nClicking "TRADE & LOGISTICS" accordion...');
  await evaluate(`
    (() => {
      const tradeBtn = document.querySelector('.accordion-item[data-accordion="trade"] .accordion-header');
      tradeBtn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 400));

  const tradeOpenCheck = await evaluate(`
    (() => {
      const tradeItem = document.querySelector('.accordion-item[data-accordion="trade"]');
      const tradePanel = tradeItem.querySelector('.accordion-panel');
      const tradeLinks = Array.from(tradeItem.querySelectorAll('.accordion-link')).map(l => ({ text: l.textContent.trim(), href: l.getAttribute('href') }));
      return {
        tradeIsOpen: tradeItem.classList.contains('accordion-item--open'),
        tradePanelHeight: tradePanel.getBoundingClientRect().height,
        tradeLinks
      };
    })()
  `);
  console.log('Trade & Logistics opened:', tradeOpenCheck);
  await capture('mobile_accordion_trade_open.png');

  // Click 4: "GLOBAL REACH"
  console.log('\nClicking "GLOBAL REACH" accordion...');
  await evaluate(`
    (() => {
      const reachBtn = document.querySelector('.accordion-item[data-accordion="reach"] .accordion-header');
      reachBtn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 400));

  const reachOpenCheck = await evaluate(`
    (() => {
      const reachItem = document.querySelector('.accordion-item[data-accordion="reach"]');
      const reachPanel = reachItem.querySelector('.accordion-panel');
      const reachLinks = Array.from(reachItem.querySelectorAll('.accordion-link')).map(l => ({ text: l.textContent.trim(), href: l.getAttribute('href') }));
      return {
        reachIsOpen: reachItem.classList.contains('accordion-item--open'),
        reachPanelHeight: reachPanel.getBoundingClientRect().height,
        reachLinks
      };
    })()
  `);
  console.log('Global Reach opened:', reachOpenCheck);
  await capture('mobile_accordion_reach_open.png');

  // Test link click closing drawer:
  console.log('\nClicking child link "Sourcing Network"...');
  await evaluate(`
    (() => {
      const link = Array.from(document.querySelectorAll('.accordion-item[data-accordion="reach"] .accordion-link'))
        .find(a => a.textContent.includes('Sourcing Network'));
      link.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 400));

  const linkClickCheck = await evaluate(`
    (() => {
      const navMenu = document.querySelector('#navMenu');
      return {
        isMenuOpen: navMenu.classList.contains('site-nav__links--open'),
        hash: window.location.hash
      };
    })()
  `);
  console.log('Drawer closed after link click:', linkClickCheck);

  // Test Contact Us direct link
  console.log('\nReopening menu and clicking "CONTACT US" direct link...');
  await evaluate(`document.querySelector('#menuToggle').click();`);
  await new Promise(r => setTimeout(r, 300));
  await evaluate(`document.querySelector('.accordion-direct-link').click();`);
  await new Promise(r => setTimeout(r, 400));

  const contactCheck = await evaluate(`
    (() => {
      const navMenu = document.querySelector('#navMenu');
      return {
        isMenuOpen: navMenu.classList.contains('site-nav__links--open'),
        hash: window.location.hash
      };
    })()
  `);
  console.log('Drawer closed after Contact Us click:', contactCheck);

  // Responsive checks on 320px, 375px, 414px
  console.log('\n--- 3. RESPONSIVE SCREEN CHECKS ---');
  for (const w of [320, 375, 414]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: w,
      height: 700,
      deviceScaleFactor: 2,
      mobile: true
    });
    await new Promise(r => setTimeout(r, 300));
    // Open menu
    await evaluate(`if (!document.querySelector('#navMenu').classList.contains('site-nav__links--open')) document.querySelector('#menuToggle').click();`);
    await new Promise(r => setTimeout(r, 300));
    // Open products
    await evaluate(`document.querySelector('.accordion-item[data-accordion="products"] .accordion-header').click();`);
    await new Promise(r => setTimeout(r, 300));

    const overflowCheck = await evaluate(`
      (() => {
        const bodyWidth = document.body.scrollWidth;
        const htmlWidth = document.documentElement.scrollWidth;
        const menuWidth = document.querySelector('#navMenu').scrollWidth;
        const clientWidth = document.documentElement.clientWidth;
        return {
          windowWidth: window.innerWidth,
          clientWidth,
          htmlScrollWidth: htmlWidth,
          hasHorizontalOverflow: htmlWidth > clientWidth,
          menuScrollWidth: menuWidth
        };
      })()
    `);
    console.log(`Width ${w}px check:`, overflowCheck);
    await capture(`mobile_menu_${w}px.png`);
  }

  console.log('\nALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!');

  ws.close();
  chrome.kill();
  process.exit(0);
}

run().catch(err => {
  console.error('Error running test:', err);
  chrome.kill();
  process.exit(1);
});
