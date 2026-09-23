import { spawn } from 'child_process';
import http from 'http';

async function measureVisuals() {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const port = 9327;
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--no-sandbox',
    `--remote-debugging-port=${port}`,
    '--window-size=1280,900',
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

  // Desktop checks
  const desktopChecks = await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        // Open modal to measure
        document.querySelector('.open-quote-modal').click();
        const modalDialog = document.querySelector('.quote-modal__dialog');
        const dRect = modalDialog.getBoundingClientRect();
        document.getElementById('modalClose').click();

        const mapBg = document.querySelector('.watermark-world-bg');

        return {
          desktopModalWidth: dRect.width,
          desktopModalHeight: dRect.height,
          mapFilter: mapBg ? getComputedStyle(mapBg).filter : 'none'
        };
      })()
    `,
    returnByValue: true
  });

  console.log('Desktop Measurements:', JSON.stringify(desktopChecks.result.value, null, 2));

  // Mobile checks (375x812)
  await sendSession('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 812,
    deviceScaleFactor: 2,
    mobile: true
  });
  await new Promise(r => setTimeout(r, 500));

  const mobileChecks = await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        // Measure mobile footer logo top spacing
        const footer = document.querySelector('.site-footer');
        const footerLogoBox = document.querySelector('.footer-logo-box');
        const footerTop = document.querySelector('.site-footer__top');
        
        const footerRect = footer.getBoundingClientRect();
        const logoBoxRect = footerLogoBox.getBoundingClientRect();
        const distanceFromFooterTopToLogo = logoBoxRect.top - footerRect.top;

        // Open and measure mobile modal
        document.querySelector('.open-quote-modal').click();
        const modalDialog = document.querySelector('.quote-modal__dialog');
        const mRect = modalDialog.getBoundingClientRect();
        document.getElementById('modalClose').click();

        return {
          distanceFromFooterTopToLogoBox: distanceFromFooterTopToLogo,
          footerTopPadding: getComputedStyle(footerTop).paddingTop,
          mobileModalWidth: mRect.width,
          mobileModalHeight: mRect.height
        };
      })()
    `,
    returnByValue: true
  });

  console.log('Mobile Measurements:', JSON.stringify(mobileChecks.result.value, null, 2));

  ws.close();
  chrome.kill();
}

measureVisuals().catch(console.error);
