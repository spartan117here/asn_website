const { spawn } = require('child_process');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = 'C:\\Users\\Pothys\\AppData\\Local\\Temp\\chrome_home_check_' + Date.now();

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
  const page = targets.find(t => t.type === 'page') || targets[0];

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

  // Scroll to bottom
  await send('Runtime.evaluate', { expression: 'window.scrollTo(0, document.body.scrollHeight);' });
  await new Promise(r => setTimeout(r, 600));

  const scrollBefore = await send('Runtime.evaluate', { expression: 'window.scrollY', returnByValue: true });
  console.log('Scroll before clicking Home:', scrollBefore.result.value);

  // Click footer Home link
  await send('Runtime.evaluate', {
    expression: `(() => {
      const homeLink = Array.from(document.querySelectorAll('.footer-links a')).find(a => a.textContent.trim() === 'Home');
      homeLink.click();
    })()`
  });

  // Wait for smooth scroll to finish
  await new Promise(r => setTimeout(r, 1800));

  const scrollAfter = await send('Runtime.evaluate', { expression: 'window.scrollY', returnByValue: true });
  console.log('Scroll after clicking Home:', scrollAfter.result.value);

  const heroOffset = await send('Runtime.evaluate', {
    expression: `(() => {
      const hero = document.getElementById('hero');
      const nav = document.getElementById('siteNav');
      return {
        heroOffsetTop: hero ? hero.offsetTop : null,
        siteNavHeight: nav ? nav.offsetHeight : null,
        siteNavPosition: nav ? window.getComputedStyle(nav).position : null
      };
    })()`,
    returnByValue: true
  });
  console.log('Hero and nav offsets:', heroOffset.result.value);

  ws.close();
  chrome.kill();
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  chrome.kill();
  process.exit(1);
});
