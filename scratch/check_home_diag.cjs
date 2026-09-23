const { spawn } = require('child_process');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = 'C:\\Users\\Pothys\\AppData\\Local\\Temp\\chrome_home_diag_' + Date.now();

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
  console.log('All targets:', targets.map(t => ({ url: t.url, type: t.type })));
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

  const diag = await send('Runtime.evaluate', {
    expression: `(() => {
      const links = Array.from(document.querySelectorAll('a[href="#hero"]')).map(a => ({
        text: a.textContent.trim(),
        parent: a.parentElement.className,
        href: a.href,
        rect: a.getBoundingClientRect()
      }));
      const hero = document.getElementById('hero');
      return {
        links,
        heroRect: hero ? hero.getBoundingClientRect() : null,
        heroOffsetTop: hero ? hero.offsetTop : null,
        scrollHeight: document.documentElement.scrollHeight
      };
    })()`,
    returnByValue: true
  });
  console.log('DIAGNOSTIC:', JSON.stringify(diag.result.value, null, 2));

  // Now scroll to 5000 and click the footer home link directly
  await send('Runtime.evaluate', { expression: 'window.scrollTo(0, 5000);' });
  await new Promise(r => setTimeout(r, 500));

  const testClick = await send('Runtime.evaluate', {
    expression: `(() => {
      const footerHome = document.querySelector('.site-footer a[href="#hero"]');
      const before = window.scrollY;
      footerHome.click();
      return { before, href: footerHome.href };
    })()`,
    returnByValue: true
  });
  console.log('CLICK RESULT:', testClick.result.value);

  // Poll scrollY over 2 seconds
  for (let i = 0; i < 8; i++) {
    await new Promise(r => setTimeout(r, 250));
    const y = await send('Runtime.evaluate', { expression: 'window.scrollY', returnByValue: true });
    console.log(`scrollY at ${(i+1)*250}ms:`, y.result.value);
  }

  ws.close();
  chrome.kill();
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  chrome.kill();
  process.exit(1);
});
