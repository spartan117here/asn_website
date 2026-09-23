import { spawn } from 'child_process';
import http from 'http';

async function testScroll() {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const port = 9335;
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
  await sendSession('DOM.enable');
  await sendSession('Runtime.enable');
  await sendSession('Page.navigate', { url: 'http://localhost:4173/' });
  await new Promise(r => setTimeout(r, 2000));

  // Check initial state
  const r0 = await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const space = document.getElementById('globalTradeScrollSpace');
        const r = space.getBoundingClientRect();
        return { top: r.top, height: space.offsetHeight };
      })()
    `,
    returnByValue: true
  });
  console.log('Initial Space:', r0.result.value);

  // Scroll so that space is midway
  await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const space = document.getElementById('globalTradeScrollSpace');
        const offsetTop = space.offsetTop;
        window.scrollTo(0, offsetTop + 600);
      })()
    `
  });

  await new Promise(r => setTimeout(r, 600));

  const rMid = await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const svg = document.getElementById('globalTradeSvg');
        const routeInMe = svg?.querySelector('#route-in-me');
        const partInMe = svg?.querySelector('#particle-in-me');
        const nodeMe = svg?.querySelector('#node-me');
        const ship = svg?.querySelector('#ship-indicator');
        return {
          routeInMeOffset: routeInMe?.style.strokeDashoffset,
          routeInMeOpacity: routeInMe?.style.opacity,
          partInMeOpacity: partInMe?.getAttribute('opacity'),
          nodeMeOpacity: nodeMe?.style.opacity,
          shipOpacity: ship?.getAttribute('opacity')
        };
      })()
    `,
    returnByValue: true
  });

  console.log('Midway Scrolled Results:', rMid.result.value);

  ws.close();
  chrome.kill();
}

testScroll().catch(console.error);
