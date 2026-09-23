const { spawn } = require('child_process');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = 'C:\\Users\\Pothys\\AppData\\Local\\Temp\\chrome_home_test_' + Date.now();

const chrome = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9222',
  `--user-data-dir=${userDataDir}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-gpu',
  'http://localhost:5173/'
]);

async function run() {
  await new Promise(r => setTimeout(r, 1000));
  const res = await fetch('http://127.0.0.1:9222/json/list');
  const targets = await res.json();
  const page = targets.find(t => t.type === 'page' && t.url.includes('localhost:5173')) || targets.find(t => t.type === 'page') || targets[0];

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

  await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 667, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: 'http://localhost:5173/' });
  await new Promise(r => setTimeout(r, 1200));

  // Scroll to footer without smooth behavior so we are at the bottom instantly
  await send('Runtime.evaluate', {
    expression: `
      window.scrollTo(0, document.body.scrollHeight);
    `
  });
  await new Promise(r => setTimeout(r, 500));

  const startY = await send('Runtime.evaluate', { expression: 'window.scrollY', returnByValue: true });
  console.log('Scroll at bottom before test:', startY.result.value);

  // Trigger smooth scroll to 0
  await send('Runtime.evaluate', {
    expression: `
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    `
  });

  // Track scroll position over 2.5 seconds
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 250));
    const y = await send('Runtime.evaluate', { expression: 'window.scrollY', returnByValue: true });
    console.log(`scrollY at ${(i+1)*250}ms: ${y.result.value}`);
  }

  const finalY = await send('Runtime.evaluate', { expression: 'window.scrollY', returnByValue: true });
  console.log('Final scrollY:', finalY.result.value);

  ws.close();
  chrome.kill();
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  chrome.kill();
  process.exit(1);
});
