const { spawn } = require('child_process');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = 'C:\\Users\\Pothys\\AppData\\Local\\Temp\\chrome_footer_check_' + Date.now();

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
    return new Promise((res, rej) => {
      const msgId = ++id;
      const handler = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.id === msgId) {
          ws.removeEventListener('message', handler);
          if (data.error) rej(data.error);
          else res(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 667,
    deviceScaleFactor: 2,
    mobile: true
  });
  await send('Page.navigate', { url: 'http://localhost:5173/' });
  await new Promise(r => setTimeout(r, 1200));

  // Scroll to bottom of body
  await send('Runtime.evaluate', {
    expression: `
      window.scrollTo(0, document.body.scrollHeight);
    `
  });
  await new Promise(r => setTimeout(r, 600));

  const styles = await send('Runtime.evaluate', {
    expression: `(() => {
      const footer = document.querySelector('.site-footer');
      const top = document.querySelector('.site-footer__top');
      const brand = document.querySelector('.footer-col--brand');
      const logoBox = document.querySelector('.footer-logo-box');
      return {
        footerPadding: window.getComputedStyle(footer).padding,
        topPadding: window.getComputedStyle(top).padding,
        topMargin: window.getComputedStyle(top).margin,
        brandMargin: window.getComputedStyle(brand).margin,
        brandPadding: window.getComputedStyle(brand).padding,
        logoBoxMargin: window.getComputedStyle(logoBox).margin
      };
    })()`,
    returnByValue: true
  });
  console.log('COMPUTED STYLES:', styles.result.value);

  // Measure space above logo box relative to .site-footer
  const measurements = await send('Runtime.evaluate', {
    expression: `(() => {
      const footer = document.querySelector('.site-footer');
      const logoBox = document.querySelector('.footer-logo-box');
      const fRect = footer.getBoundingClientRect();
      const lRect = logoBox.getBoundingClientRect();
      return {
        footerTop: fRect.top,
        logoBoxTop: lRect.top,
        distanceAboveLogo: lRect.top - fRect.top
      };
    })()`,
    returnByValue: true
  });
  console.log('MEASUREMENTS BEFORE:', measurements.result.value);

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('scratch/footer_mobile_before.png', Buffer.from(shot.data, 'base64'));
  console.log('Saved scratch/footer_mobile_before.png');

  ws.close();
  chrome.kill();
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  chrome.kill();
  process.exit(1);
});
