import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';

async function takeBottomScreenshot() {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const port = 9315;
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--no-sandbox',
    `--remote-debugging-port=${port}`,
    '--window-size=390,950',
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
  await sendSession('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 950,
    deviceScaleFactor: 2,
    mobile: true
  });

  await sendSession('Page.navigate', { url: 'http://localhost:5173/' });
  await new Promise(r => setTimeout(r, 1500));

  await sendSession('Runtime.evaluate', {
    expression: `
      window.open = function() { return { closed: false, focus: function() {} }; };
      const nameInput = document.getElementById('contactName');
      const emailInput = document.getElementById('contactEmail');
      const phoneInput = document.getElementById('contactPhone');
      const categorySelect = document.getElementById('contactCategory');
      const messageInput = document.getElementById('contactMessage');

      nameInput.value = 'Rahul Sharma';
      emailInput.value = 'rahul@company.com';
      phoneInput.value = '+91 98765 43210';
      categorySelect.value = 'Agricultural Products';
      messageInput.value = 'We need pricing and availability for bulk orders.';

      document.getElementById('contactForm').querySelector('button[type="submit"]').click();
      document.getElementById('contactFormFeedback').scrollIntoView({ block: 'center' });
    `
  });
  await new Promise(r => setTimeout(r, 1600)); // wait for button restoration

  const shot = await sendSession('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('c:\\Users\\Pothys\\OneDrive\\Documents\\asn\\contact_mobile_feedback.png', Buffer.from(shot.data, 'base64'));

  console.log('Feedback screenshot captured');

  ws.close();
  chrome.kill();
}

takeBottomScreenshot().catch(console.error);
