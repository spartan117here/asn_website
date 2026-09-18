const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = 'C:\\Users\\Pothys\\AppData\\Local\\Temp\\chrome_about_check_' + Date.now();
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
    console.log(`\n=== Testing ${label} (${width}x${height}) ===`);
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768 });
    await send('Page.navigate', { url: 'http://localhost:4173/' });
    await new Promise(r => setTimeout(r, 900));

    const evalRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const leftCard = document.querySelector('.about-card-visual');
          const rightCard = document.querySelector('.about-quote-card');
          const caption = document.querySelector('.about-card-visual__caption');

          return {
            leftH: leftCard ? leftCard.offsetHeight : 0,
            rightH: rightCard ? rightCard.offsetHeight : 0,
            captionW: caption ? caption.offsetWidth : 0,
            captionH: caption ? caption.offsetHeight : 0,
            captionText: caption ? caption.innerText.replace(/\\n/g, ' / ') : '',
            captionPos: caption ? window.getComputedStyle(caption).position : '',
            captionBg: caption ? window.getComputedStyle(caption).backgroundColor : '',
            captionBorderLeft: caption ? window.getComputedStyle(caption).borderLeft : ''
          };
        })()
      `,
      returnByValue: true
    });

    console.log('Result:', JSON.stringify(evalRes.result.value, null, 2));

    await send('Runtime.evaluate', {
      expression: `
        const el = document.getElementById('about');
        if (el) el.scrollIntoView();
      `
    });
    await new Promise(r => setTimeout(r, 400));

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(shot.data, 'base64');
    const outPath = path.join(artifactDir, `about_cards_${label}.png`);
    fs.writeFileSync(outPath, buffer);
  }

  await inspect('desktop_1440', 1440, 900);
  await inspect('desktop_1024', 1024, 768);
  await inspect('mobile_414', 414, 896);
  await inspect('mobile_375', 375, 812);
  await inspect('mobile_320', 320, 640);

  ws.close();
  chrome.kill();
  console.log('\nAll tests completed successfully!');
}

run().catch(e => {
  console.error(e);
  chrome.kill();
  process.exit(1);
});
