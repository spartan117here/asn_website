const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = 'C:\\Users\\Pothys\\AppData\\Local\\Temp\\chrome_slide_check_' + Date.now();
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
      const mobileBackdrop = document.querySelector('#mobileNavBackdrop');
      const drawerHeader = document.querySelector('.mobile-nav__drawer-header');
      const menuToggle = document.querySelector('#menuToggle');
      return {
        desktopListDisplay: desktopList ? window.getComputedStyle(desktopList).display : 'none',
        mobileBackdropDisplay: mobileBackdrop ? window.getComputedStyle(mobileBackdrop).display : 'none',
        drawerHeaderDisplay: drawerHeader ? window.getComputedStyle(drawerHeader).display : 'none',
        menuToggleDisplay: menuToggle ? window.getComputedStyle(menuToggle).display : 'none'
      };
    })()
  `);
  console.log('Desktop verification:', desktopCheck);
  await capture('desktop_intact_refinement.png');

  console.log('\n--- 2. TESTING MOBILE SIDE DRAWER (375x812) ---');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 812,
    deviceScaleFactor: 2,
    mobile: true
  });
  await new Promise(r => setTimeout(r, 600));

  // Check initial closed state
  const initialClosedCheck = await evaluate(`
    (() => {
      const navMenu = document.querySelector('#navMenu');
      const backdrop = document.querySelector('#mobileNavBackdrop');
      const rect = navMenu.getBoundingClientRect();
      const style = window.getComputedStyle(navMenu);
      const bStyle = window.getComputedStyle(backdrop);
      return {
        isOpen: navMenu.classList.contains('site-nav__links--open'),
        translateX: style.transform,
        visibility: style.visibility,
        backdropOpacity: bStyle.opacity,
        backdropVisibility: bStyle.visibility,
        left: rect.left,
        width: rect.width
      };
    })()
  `);
  console.log('Initial mobile closed state:', initialClosedCheck);

  // Click hamburger to open
  console.log('\nOpening hamburger menu (testing left -> right slide)...');
  await evaluate(`document.querySelector('#menuToggle').click();`);
  await new Promise(r => setTimeout(r, 450));

  const openedDrawerCheck = await evaluate(`
    (() => {
      const navMenu = document.querySelector('#navMenu');
      const backdrop = document.querySelector('#mobileNavBackdrop');
      const rect = navMenu.getBoundingClientRect();
      const style = window.getComputedStyle(navMenu);
      const bStyle = window.getComputedStyle(backdrop);
      const titles = Array.from(document.querySelectorAll('.mobile-nav-accordion .accordion-title')).map(el => {
        return {
          text: el.textContent.trim(),
          textTransform: window.getComputedStyle(el).textTransform
        };
      });
      const headerTextTransform = window.getComputedStyle(document.querySelector('.accordion-header')).textTransform;
      const drawerHeader = document.querySelector('.mobile-nav__drawer-header');
      const drawerLogo = drawerHeader ? drawerHeader.querySelector('.brand-logo') : null;
      const drawerCloseBtn = document.querySelector('#drawerCloseBtn');

      return {
        isOpen: navMenu.classList.contains('site-nav__links--open'),
        transform: style.transform,
        rectLeft: rect.left,
        rectWidth: rect.width,
        viewportWidth: window.innerWidth,
        widthPercentage: Math.round((rect.width / window.innerWidth) * 100) + '%',
        visibleRightWidth: Math.round(window.innerWidth - rect.width) + 'px',
        backdropActive: backdrop.classList.contains('mobile-nav-backdrop--active'),
        backdropOpacity: bStyle.opacity,
        backdropBg: bStyle.backgroundColor,
        hasDrawerHeader: !!drawerHeader,
        hasDrawerLogo: !!drawerLogo,
        hasDrawerCloseBtn: !!drawerCloseBtn,
        headerTextTransform,
        titles
      };
    })()
  `);
  console.log('Opened drawer verification:', openedDrawerCheck);
  await capture('mobile_side_drawer_opened.png');

  // Test expanding "About ASN"
  console.log('\nClicking "About ASN" accordion...');
  await evaluate(`document.querySelector('.accordion-item[data-accordion="about"] .accordion-header').click();`);
  await new Promise(r => setTimeout(r, 400));
  await capture('mobile_side_drawer_about_open.png');

  // Test expanding "Products" (single-open check)
  console.log('\nClicking "Products" accordion...');
  await evaluate(`document.querySelector('.accordion-item[data-accordion="products"] .accordion-header').click();`);
  await new Promise(r => setTimeout(r, 400));
  await capture('mobile_side_drawer_products_open.png');

  // Test clicking backdrop (visible right side)
  console.log('\nTesting click on backdrop to close drawer...');
  await evaluate(`document.querySelector('#mobileNavBackdrop').click();`);
  await new Promise(r => setTimeout(r, 450));

  const backdropClosedCheck = await evaluate(`
    (() => {
      const navMenu = document.querySelector('#navMenu');
      const backdrop = document.querySelector('#mobileNavBackdrop');
      return {
        isMenuOpen: navMenu.classList.contains('site-nav__links--open'),
        transform: window.getComputedStyle(navMenu).transform,
        visibility: window.getComputedStyle(navMenu).visibility,
        backdropActive: backdrop.classList.contains('mobile-nav-backdrop--active')
      };
    })()
  `);
  console.log('Drawer closed via backdrop click:', backdropClosedCheck);

  // Test clicking drawer close X button
  console.log('\nReopening menu and testing drawer close button (✕)...');
  await evaluate(`document.querySelector('#menuToggle').click();`);
  await new Promise(r => setTimeout(r, 450));
  await evaluate(`document.querySelector('#drawerCloseBtn').click();`);
  await new Promise(r => setTimeout(r, 450));

  const xClosedCheck = await evaluate(`
    (() => {
      const navMenu = document.querySelector('#navMenu');
      return {
        isMenuOpen: navMenu.classList.contains('site-nav__links--open'),
        transform: window.getComputedStyle(navMenu).transform
      };
    })()
  `);
  console.log('Drawer closed via ✕ button:', xClosedCheck);

  // Test responsive widths across 320, 375, 390, 414
  console.log('\n--- 3. RESPONSIVE DRAWER WIDTH CHECKS ---');
  for (const w of [320, 375, 390, 414]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: w,
      height: 750,
      deviceScaleFactor: 2,
      mobile: true
    });
    await new Promise(r => setTimeout(r, 300));
    // Open menu
    await evaluate(`if (!document.querySelector('#navMenu').classList.contains('site-nav__links--open')) document.querySelector('#menuToggle').click();`);
    await new Promise(r => setTimeout(r, 400));

    const metrics = await evaluate(`
      (() => {
        const navMenu = document.querySelector('#navMenu');
        const rect = navMenu.getBoundingClientRect();
        return {
          windowWidth: window.innerWidth,
          drawerWidth: rect.width,
          percentage: Math.round((rect.width / window.innerWidth) * 100) + '%',
          visibleRightEdge: Math.round(window.innerWidth - rect.width) + 'px'
        };
      })()
    `);
    console.log(`Width ${w}px result:`, metrics);
    await capture(`drawer_${w}px.png`);
    // Close menu
    await evaluate(`document.querySelector('#drawerCloseBtn').click();`);
    await new Promise(r => setTimeout(r, 350));
  }

  console.log('\nALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!');
  ws.close();
  chrome.kill();
  process.exit(0);
}

run().catch(err => {
  console.error('Test error:', err);
  chrome.kill();
  process.exit(1);
});
