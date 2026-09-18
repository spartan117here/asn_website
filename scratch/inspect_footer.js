import { spawn } from 'child_process';
import http from 'http';

async function inspectFooter() {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const port = 9328;
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--no-sandbox',
    `--remote-debugging-port=${port}`,
    '--window-size=375,812',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1200));

  const versionData = await new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}/json/version`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const ws = new WebSocket(versionData.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let id = 1;
  function send(method, params = {}) {
    return new Promise((resolve) => {
      const msgId = id++;
      const handler = (event) => {
        const res = JSON.parse(event.data);
        if (res.id === msgId) {
          ws.removeEventListener('message', handler);
          resolve(res.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  const { targetId } = await send('Target.createTarget', { url: 'http://localhost:4173/' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });

  function sendSession(method, params = {}) {
    return new Promise((resolve) => {
      const msgId = id++;
      const handler = (event) => {
        const res = JSON.parse(event.data);
        if (res.id === msgId) {
          ws.removeEventListener('message', handler);
          resolve(res.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: msgId, sessionId, method, params }));
    });
  }

  await sendSession('Page.enable');
  await sendSession('Runtime.enable');
  await sendSession('Page.navigate', { url: 'http://localhost:4173/' });
  await new Promise(r => setTimeout(r, 1500));

  const info = await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const footer = document.querySelector('.site-footer');
        const footerTop = document.querySelector('.site-footer__top');
        const logoBox = document.querySelector('.footer-logo-box');

        return {
          windowWidth: window.innerWidth,
          footerComputedPadding: getComputedStyle(footer).padding,
          footerTopComputedPadding: getComputedStyle(footerTop).padding,
          footerTopPaddingTop: getComputedStyle(footerTop).paddingTop,
          logoBoxMarginTop: getComputedStyle(logoBox).marginTop,
          footerRect: footer.getBoundingClientRect(),
          footerTopRect: footerTop.getBoundingClientRect(),
          logoBoxRect: logoBox.getBoundingClientRect()
        };
      })()
    `,
    returnByValue: true
  });

  console.log('Inspection:', JSON.stringify(info.result.value, null, 2));

  ws.close();
  chrome.kill();
}

inspectFooter().catch(console.error);
