const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = 'C:\\Users\\Pothys\\AppData\\Local\\Temp\\chrome_img_check_' + Date.now();
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
  await new Promise(r => setTimeout(r, 1000));
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

  // ==========================================
  // 1. DESKTOP VERIFICATION (1440x900)
  // ==========================================
  console.log('--- 1. TESTING DESKTOP (1440x900) ---');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:4173/' });
  await new Promise(r => setTimeout(r, 1200));

  // Scroll to about section
  await send('Runtime.evaluate', {
    expression: `
      const about = document.getElementById('about');
      if (about) about.scrollIntoView();
    `
  });
  await new Promise(r => setTimeout(r, 400));

  const desktopImgData = await send('Runtime.evaluate', {
    expression: `(() => {
      const img = document.querySelector('.about-card-visual__img');
      const box = document.querySelector('.about-card-visual__wrapper');
      return {
        src: img ? img.currentSrc || img.src : null,
        naturalWidth: img ? img.naturalWidth : null,
        naturalHeight: img ? img.naturalHeight : null,
        complete: img ? img.complete : null,
        imgWidth: img ? img.offsetWidth : null,
        imgHeight: img ? img.offsetHeight : null,
        boxWidth: box ? box.offsetWidth : null,
        boxHeight: box ? box.offsetHeight : null,
        objectFit: img ? window.getComputedStyle(img).objectFit : null
      };
    })()`,
    returnByValue: true
  });
  console.log('Desktop Image Info:', desktopImgData.result.value);

  const desktopShot = await send('Page.captureScreenshot', { format: 'png' });
  const desktopShotPath = path.join(artifactDir, 'desktop_about_replaced_image.png');
  fs.writeFileSync(desktopShotPath, Buffer.from(desktopShot.data, 'base64'));
  console.log('Saved desktop screenshot:', desktopShotPath);

  // ==========================================
  // 2. MOBILE VERIFICATION (390x844)
  // ==========================================
  console.log('\n--- 2. TESTING MOBILE (390x844) ---');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
  await send('Page.navigate', { url: 'http://localhost:4173/' });
  await new Promise(r => setTimeout(r, 1200));

  // Scroll to about section
  await send('Runtime.evaluate', {
    expression: `
      const about = document.getElementById('about');
      if (about) about.scrollIntoView();
    `
  });
  await new Promise(r => setTimeout(r, 400));

  const mobileImgData = await send('Runtime.evaluate', {
    expression: `(() => {
      const img = document.querySelector('.about-card-visual__img');
      const box = document.querySelector('.about-card-visual__wrapper');
      return {
        src: img ? img.currentSrc || img.src : null,
        naturalWidth: img ? img.naturalWidth : null,
        naturalHeight: img ? img.naturalHeight : null,
        complete: img ? img.complete : null,
        imgWidth: img ? img.offsetWidth : null,
        imgHeight: img ? img.offsetHeight : null,
        boxWidth: box ? box.offsetWidth : null,
        boxHeight: box ? box.offsetHeight : null,
        objectFit: img ? window.getComputedStyle(img).objectFit : null
      };
    })()`,
    returnByValue: true
  });
  console.log('Mobile Image Info:', mobileImgData.result.value);

  const mobileShot = await send('Page.captureScreenshot', { format: 'png' });
  const mobileShotPath = path.join(artifactDir, 'mobile_about_replaced_image.png');
  fs.writeFileSync(mobileShotPath, Buffer.from(mobileShot.data, 'base64'));
  console.log('Saved mobile screenshot:', mobileShotPath);

  ws.close();
  chrome.kill();
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  chrome.kill();
  process.exit(1);
});
