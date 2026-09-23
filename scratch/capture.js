import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';

async function main() {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const port = 9299;
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--no-sandbox',
    `--remote-debugging-port=${port}`,
    '--window-size=1440,900',
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

  const { targetId } = await send('Target.createTarget', { url: 'http://localhost:5173/' });
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
  await sendSession('DOM.enable');
  await sendSession('Page.navigate', { url: 'http://localhost:5173/' });
  await new Promise(r => setTimeout(r, 1500));

  await sendSession('Runtime.evaluate', {
    expression: `document.getElementById('shipImageBox').scrollIntoView({ block: 'center' });`
  });
  await new Promise(r => setTimeout(r, 1000));

  const result = await sendSession('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('c:\\Users\\Pothys\\OneDrive\\Documents\\asn\\desktop_verify.png', Buffer.from(result.data, 'base64'));

  const check = await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const fade = document.querySelector('.about-quote-card__image-fade');
        const cs = window.getComputedStyle(fade);
        return {
          fadeDisplay: cs.display,
          width: cs.width,
          height: cs.height
        };
      })()
    `,
    returnByValue: true
  });

  console.log('Desktop check:', check.result.value);

  ws.close();
  chrome.kill();
}

main().catch(console.error);
