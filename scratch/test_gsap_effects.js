import { spawn } from 'child_process';
import http from 'http';

async function checkGsapEffects() {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const port = 9326;
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

  const gsapReport = await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const heroTitle = document.querySelector('.hero__title');
        const productImgs = document.querySelectorAll('.products-grid .product-card__thumb img');
        const revealWrapper = document.querySelector('.about-card-visual__wrapper');

        return {
          heroTitleTransform: heroTitle ? getComputedStyle(heroTitle).transform : 'none',
          productImgFilter: productImgs[0] ? productImgs[0].style.filter : 'none',
          productImgScale: productImgs[0] ? productImgs[0].style.transform : 'none',
          revealClipPath: revealWrapper ? revealWrapper.style.clipPath : 'none'
        };
      })()
    `,
    returnByValue: true
  });

  console.log('GSAP Initialized DOM State:', JSON.stringify(gsapReport.result.value, null, 2));

  // Now scroll to products grid to trigger ScrollTrigger
  await sendSession('Runtime.evaluate', {
    expression: `
      window.scrollTo(0, 1800);
    `
  });
  await new Promise(r => setTimeout(r, 1200));

  const afterScroll = await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const productImgs = document.querySelectorAll('.products-grid .product-card__thumb img');
        return {
          productImgFilterAfterScroll: productImgs[0] ? productImgs[0].style.filter : 'none',
          productImgOpacity: productImgs[0] ? productImgs[0].style.opacity : 'none'
        };
      })()
    `,
    returnByValue: true
  });

  console.log('After ScrollTrigger Reveal:', JSON.stringify(afterScroll.result.value, null, 2));

  ws.close();
  chrome.kill();
}

checkGsapEffects().catch(console.error);
