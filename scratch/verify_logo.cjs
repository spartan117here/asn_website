const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = 'C:\\Users\\Pothys\\AppData\\Local\\Temp\\chrome_logo_check_' + Date.now();
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

  async function inspect(label, width, height) {
    console.log(`\n=== Testing Logo on ${label} (${width}x${height}) ===`);
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768 });
    await send('Page.navigate', { url: 'http://localhost:4173/' });
    await new Promise(r => setTimeout(r, 1000));

    const evalRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const brandLogo = document.querySelector('.brand-logo');
          const footerLogo = document.querySelector('.footer-logo');

          return {
            brandLogo: brandLogo ? {
              src: brandLogo.currentSrc,
              naturalWidth: brandLogo.naturalWidth,
              naturalHeight: brandLogo.naturalHeight,
              naturalRatio: (brandLogo.naturalWidth / brandLogo.naturalHeight).toFixed(3),
              renderedWidth: brandLogo.offsetWidth,
              renderedHeight: brandLogo.offsetHeight,
              renderedRatio: (brandLogo.offsetWidth / brandLogo.offsetHeight).toFixed(3)
            } : null,
            footerLogo: footerLogo ? {
              src: footerLogo.currentSrc,
              naturalWidth: footerLogo.naturalWidth,
              naturalHeight: footerLogo.naturalHeight,
              naturalRatio: (footerLogo.naturalWidth / footerLogo.naturalHeight).toFixed(3),
              renderedWidth: footerLogo.offsetWidth,
              renderedHeight: footerLogo.offsetHeight,
              renderedRatio: (footerLogo.offsetWidth / footerLogo.offsetHeight).toFixed(3)
            } : null
          };
        })()
      `,
      returnByValue: true
    });

    console.log('Logo Measurements:', JSON.stringify(evalRes.result.value, null, 2));

    // Capture Header screenshot
    const shotHeader = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactDir, `logo_header_${label}.png`), Buffer.from(shotHeader.data, 'base64'));

    // Scroll to Footer Logo
    await send('Runtime.evaluate', {
      expression: `
        const footerLogo = document.querySelector('.footer-logo-box');
        if (footerLogo) footerLogo.scrollIntoView({ behavior: 'instant', block: 'center' });
      `
    });
    await new Promise(r => setTimeout(r, 600));

    // Capture Footer screenshot
    const shotFooter = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactDir, `logo_footer_${label}.png`), Buffer.from(shotFooter.data, 'base64'));
  }

  await inspect('desktop', 1440, 900);
  await inspect('mobile', 375, 812);

  ws.close();
  chrome.kill();
  console.log('\nLogo verification finished successfully!');
}

run().catch(e => {
  console.error(e);
  chrome.kill();
  process.exit(1);
});
