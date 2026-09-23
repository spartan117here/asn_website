const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = 'C:\\Users\\Pothys\\AppData\\Local\\Temp\\chrome_shake_check_' + Date.now();
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

  // Test Mobile (375x812)
  console.log('--- Testing Mobile View for Image Shaking (375x812) ---');
  await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url: 'http://localhost:4173/' });
  await new Promise(r => setTimeout(r, 1000));

  // Scroll to ship image box
  await send('Runtime.evaluate', {
    expression: `
      const shipBox = document.getElementById('shipImageBox');
      if (shipBox) shipBox.scrollIntoView({ behavior: 'instant', block: 'center' });
    `
  });
  await new Promise(r => setTimeout(r, 500));

  // Sample transform 5 times across 2 seconds to prove it does NOT move/shake
  const samples = [];
  for (let i = 0; i < 5; i++) {
    const sample = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const img = document.getElementById('shipImg') || document.querySelector('.about-quote-card__img');
          const overlay = document.getElementById('shipWaterOverlay');
          const track = document.getElementById('shipWaterTrack');
          const style = window.getComputedStyle(img);
          return {
            transform: style.transform,
            displayOverlay: overlay ? window.getComputedStyle(overlay).display : 'none',
            displayTrack: track ? window.getComputedStyle(track).display : 'none'
          };
        })()
      `,
      returnByValue: true
    });
    samples.push(sample.result.value);
    await new Promise(r => setTimeout(r, 400));
  }

  console.log('Mobile Motion Samples over 2s:', JSON.stringify(samples, null, 2));

  // Verify transform is completely static ('none')
  const allNone = samples.every(s => s.transform === 'none');
  console.log('Are all samples transform: "none"?', allNone ? 'YES (Completely stable, zero shake!)' : 'NO');

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'ship_card_mobile_fixed.png'), Buffer.from(shot.data, 'base64'));

  ws.close();
  chrome.kill();
}

run().catch(e => {
  console.error(e);
  chrome.kill();
  process.exit(1);
});
