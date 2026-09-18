import { spawn } from 'child_process';
import http from 'http';

async function testFeatures() {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const port = 9330;
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

  const consoleLogs = [];
  const errors = [];

  ws.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    if (data.sessionId === sessionId) {
      if (data.method === 'Runtime.consoleAPICalled') {
        consoleLogs.push(data.params.args.map(a => a.value || a.description).join(' '));
      }
      if (data.method === 'Runtime.exceptionThrown') {
        errors.push(data.params.exceptionDetails);
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
  await sendSession('Page.navigate', { url: 'http://localhost:4173/' });
  await new Promise(r => setTimeout(r, 2000));

  // Test feature execution
  const results = await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const out = {};

        // 1. Check Scroll Space & SVG
        const scrollSpace = document.getElementById('globalTradeScrollSpace');
        const svg = document.getElementById('globalTradeSvg');
        const card = document.getElementById('globalTradeWatermarkCard');
        out.hasScrollSpace = !!scrollSpace;
        out.hasSvg = !!svg;
        out.hasCard = !!card;

        const routeInMe = svg?.querySelector('#route-in-me');
        out.routeInMeInitialOffset = routeInMe ? routeInMe.style.strokeDashoffset : null;

        // 2. Scroll to scrollSpace to trigger animation
        if (scrollSpace) {
          scrollSpace.scrollIntoView();
          window.scrollBy(0, 300);
        }

        return out;
      })()
    `,
    returnByValue: true
  });

  console.log('Setup Results:', results.result.value);

  // Wait for RAF scroll
  await new Promise(r => setTimeout(r, 500));

  const scrollResults = await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const svg = document.getElementById('globalTradeSvg');
        const routeInMe = svg?.querySelector('#route-in-me');
        const partInMe = svg?.querySelector('#particle-in-me');
        const nodeMe = svg?.querySelector('#node-me');
        return {
          routeInMeScrolledOffset: routeInMe ? routeInMe.style.strokeDashoffset : null,
          routeInMeOpacity: routeInMe ? routeInMe.style.opacity : null,
          particleOpacity: partInMe ? partInMe.getAttribute('opacity') : null,
          nodeMeOpacity: nodeMe ? nodeMe.style.opacity : null
        };
      })()
    `,
    returnByValue: true
  });

  console.log('Scrolled Results:', scrollResults.result.value);
  console.log('Errors caught:', errors);
  console.log('Console logs:', consoleLogs);

  ws.close();
  chrome.kill();
}

testFeatures().catch(console.error);
