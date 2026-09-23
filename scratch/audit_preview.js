import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';

async function audit() {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const port = 9320;
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

  const consoleMessages = [];
  const pageErrors = [];
  const networkErrors = [];

  ws.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    if (data.sessionId === sessionId) {
      if (data.method === 'Runtime.consoleAPICalled') {
        consoleMessages.push(data.params);
      }
      if (data.method === 'Runtime.exceptionThrown') {
        pageErrors.push(data.params);
      }
      if (data.method === 'Network.loadingFailed') {
        networkErrors.push(data.params);
      }
      if (data.method === 'Network.responseReceived') {
        if (data.params.response.status >= 400) {
          networkErrors.push({
            url: data.params.response.url,
            status: data.params.response.status
          });
        }
      }
    }
  });

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
  await sendSession('Runtime.enable');
  await sendSession('Network.enable');

  await sendSession('Page.navigate', { url: 'http://localhost:4173/' });
  await new Promise(r => setTimeout(r, 2000));

  console.log('--- AUDIT REPORT FOR PREVIEW ---');
  console.log('Page Errors:', JSON.stringify(pageErrors, null, 2));
  console.log('Network Errors:', JSON.stringify(networkErrors, null, 2));
  console.log('Console Messages count:', consoleMessages.length);
  for (const m of consoleMessages) {
    console.log(`[${m.type}]`, m.args.map(a => a.value || a.description).join(' '));
  }

  // Test interactive elements in preview
  const interactions = await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const results = {};
        
        // 1. Check GSAP and ScrollTrigger
        results.gsapAvailable = typeof gsap !== 'undefined';
        results.scrollTriggerAvailable = typeof ScrollTrigger !== 'undefined';
        
        // 2. Check modal open button
        const quoteBtn = document.querySelector('.open-quote-modal');
        const modal = document.getElementById('quoteModal');
        if (quoteBtn && modal) {
          quoteBtn.click();
          results.modalOpened = modal.classList.contains('quote-modal--active');
          const closeBtn = document.getElementById('modalClose');
          if (closeBtn) closeBtn.click();
          results.modalClosed = !modal.classList.contains('quote-modal--active');
        }

        // 3. Check mobile menu toggle
        const menuToggle = document.getElementById('menuToggle');
        const navMenu = document.getElementById('navMenu');
        if (menuToggle && navMenu) {
          menuToggle.click();
          results.menuOpened = navMenu.classList.contains('site-nav__links--open');
          menuToggle.click();
          results.menuClosed = !navMenu.classList.contains('site-nav__links--open');
        }

        // 4. Check Global Trade elements
        const tradeSection = document.getElementById('global-trade');
        const svgMap = document.getElementById('tradeMapSvg');
        const routes = svgMap ? svgMap.querySelectorAll('.trade-route') : [];
        results.tradeSectionExists = !!tradeSection;
        results.svgMapExists = !!svgMap;
        results.tradeRoutesCount = routes.length;

        // 5. Scroll page to test ScrollTrigger
        window.scrollTo(0, 1000);

        return results;
      })()
    `,
    returnByValue: true
  });

  console.log('Interaction Tests:', JSON.stringify(interactions.result.value, null, 2));

  ws.close();
  chrome.kill();
}

audit().catch(console.error);
