const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = 'C:\\Users\\Pothys\\AppData\\Local\\Temp\\chrome_verify_dir_' + Date.now();
const artifactDir = 'C:\\Users\\Pothys\\.gemini\\antigravity-ide\\brain\\d579fb66-d965-409d-bdbd-6d3371610612';

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 0;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.id && this.callbacks.has(data.id)) {
          const { res, rej } = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) rej(data.error);
          else res(data.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((res, rej) => {
      const id = ++this.id;
      this.callbacks.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(code) {
    const expression = `(() => {\n${code}\n})()`;
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      const desc = res.exceptionDetails.exception?.description || res.exceptionDetails.text;
      console.error('CDP EVAL EXCEPTION:', desc);
      throw new Error(desc || 'Evaluation error');
    }
    return res.result ? res.result.value : undefined;
  }

  async captureScreenshot(outputPath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    fs.writeFileSync(outputPath, buffer);
    console.log(`Saved screenshot: ${outputPath} (${buffer.length} bytes)`);
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function runVerification() {
  console.log('=== STARTING PRODUCTION PREVIEW VERIFICATION ===');
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    'http://localhost:4173/'
  ]);

  try {
    let targets = null;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 400));
      try {
        const res = await fetch('http://127.0.0.1:9222/json/list');
        if (res.ok) {
          targets = await res.json();
          if (targets && targets.length > 0) break;
        }
      } catch (e) {}
    }

    if (!targets || targets.length === 0) throw new Error('No targets found');
    const pageTarget = targets.find(t => t.type === 'page') || targets[0];
    console.log('Attaching to page target:', pageTarget.title || pageTarget.url);

    const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('DOM.enable');

    // ==========================================
    // 1. DESKTOP AUDIT (1440x900)
    // ==========================================
    console.log('\n--- 1. DESKTOP VIEWPORT TEST (1440x900) ---');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await client.send('Page.navigate', { url: 'http://localhost:4173/' });
    await new Promise(r => setTimeout(r, 1200));

    // Check page errors
    const errs = await client.evaluate(`
      return window.__errors || [];
    `);
    console.log('Initial page load console errors:', errs);

    // ==========================================
    // 2. GLOBAL TRADE ANIMATION AUDIT (DESKTOP)
    // ==========================================
    console.log('\n--- 2. GLOBAL TRADE SCROLL ANIMATION AUDIT ---');
    const gtInfo = await client.evaluate(`
      const space = document.getElementById('globalTradeScrollSpace');
      const card = document.getElementById('globalTradeWatermarkCard');
      const svg = document.getElementById('globalTradeSvg');
      const naSaRoute = document.getElementById('route-na-sa');
      const saNode = document.getElementById('node-sa');
      const seaAusRoute = document.getElementById('route-sea-aus');
      const ausNode = document.getElementById('node-aus');
      const naSaParticle = document.getElementById('particle-na-sa');
      const seaAusParticle = document.getElementById('particle-sea-aus');

      const rect = space ? space.getBoundingClientRect() : null;
      const cardRect = card ? card.getBoundingClientRect() : null;
      return {
        spaceHeight: space ? space.offsetHeight : 0,
        cardHeight: card ? card.offsetHeight : 0,
        spaceTop: rect ? rect.top + window.scrollY : 0,
        naSaRouteExists: !!naSaRoute,
        saNodeExists: !!saNode,
        seaAusRouteExists: !!seaAusRoute,
        ausNodeExists: !!ausNode,
        naSaParticleExists: !!naSaParticle,
        seaAusParticleExists: !!seaAusParticle
      };
    `);
    console.log('Global Trade elements info:', gtInfo);

    const startY = gtInfo.spaceTop;
    const totalDist = gtInfo.spaceHeight - gtInfo.cardHeight;
    console.log(`Scroll space startY: ${startY}, total distance: ${totalDist}px`);

    const scrollSteps = [
      { pct: 0, desc: 'Start (India)' },
      { pct: 0.15, desc: 'Stage 1 (Middle East)' },
      { pct: 0.28, desc: 'Stage 2 (Europe)' },
      { pct: 0.40, desc: 'Stage 3 (SE Asia)' },
      { pct: 0.52, desc: 'Stage 4 (Africa)' },
      { pct: 0.63, desc: 'Stage 5 (East Asia)' },
      { pct: 0.74, desc: 'Stage 6 (North America)' },
      { pct: 0.85, desc: 'Stage 7 (NEW DESTINATION 1: South America)' },
      { pct: 0.95, desc: 'Stage 8 (NEW DESTINATION 2: Australia)' },
      { pct: 1.00, desc: 'Stage 9 (Global Maritime Loop)' }
    ];

    for (const step of scrollSteps) {
      const targetScrollY = Math.round(startY + totalDist * step.pct);
      await client.evaluate(`
        window.scrollTo(0, ${targetScrollY});
        window.dispatchEvent(new Event('scroll'));
      `);
      await new Promise(r => setTimeout(r, 60)); // allow rAF update

      const stageState = await client.evaluate(`
        const naSaRoute = document.getElementById('route-na-sa');
        const saNode = document.getElementById('node-sa');
        const seaAusRoute = document.getElementById('route-sea-aus');
        const ausNode = document.getElementById('node-aus');
        const naSaParticle = document.getElementById('particle-na-sa');
        const seaAusParticle = document.getElementById('particle-sea-aus');
        const loopRoute = document.getElementById('route-loop');

        return {
          scrollY: window.scrollY,
          saNodeOpacity: saNode ? window.getComputedStyle(saNode).opacity : null,
          ausNodeOpacity: ausNode ? window.getComputedStyle(ausNode).opacity : null,
          naSaParticleOpacity: naSaParticle ? window.getComputedStyle(naSaParticle).opacity : null,
          naSaParticleCx: naSaParticle ? naSaParticle.getAttribute('cx') : null,
          naSaParticleCy: naSaParticle ? naSaParticle.getAttribute('cy') : null,
          seaAusParticleOpacity: seaAusParticle ? window.getComputedStyle(seaAusParticle).opacity : null,
          seaAusParticleCx: seaAusParticle ? seaAusParticle.getAttribute('cx') : null,
          seaAusParticleCy: seaAusParticle ? seaAusParticle.getAttribute('cy') : null,
          loopOpacity: loopRoute ? window.getComputedStyle(loopRoute).opacity : null
        };
      `);
      console.log(`[${(step.pct * 100).toFixed(0)}% - ${step.desc}]`, stageState);

      if (step.pct === 0.85) {
        await client.captureScreenshot(path.join(artifactDir, 'desktop_global_trade_south_america.png'));
      } else if (step.pct === 0.95) {
        await client.captureScreenshot(path.join(artifactDir, 'desktop_global_trade_australia.png'));
      }
    }

    // Test REVERSE scroll (Australia -> South America -> India)
    console.log('\n[Testing Scroll Direction Reversibility (BOTTOM -> TOP)]');
    const reverseSteps = [0.95, 0.85, 0.50, 0.0];
    for (const pct of reverseSteps) {
      const targetScrollY = Math.round(startY + totalDist * pct);
      await client.evaluate(`
        window.scrollTo(0, ${targetScrollY});
        window.dispatchEvent(new Event('scroll'));
      `);
      await new Promise(r => setTimeout(r, 50));
      const revState = await client.evaluate(`
        const saNode = document.getElementById('node-sa');
        const ausNode = document.getElementById('node-aus');
        return {
          scrollY: window.scrollY,
          saOpacity: saNode ? window.getComputedStyle(saNode).opacity : null,
          ausOpacity: ausNode ? window.getComputedStyle(ausNode).opacity : null
        };
      `);
      console.log(`Reverse to ${(pct * 100).toFixed(0)}%:`, revState);
    }

    // ==========================================
    // 3. FULL PAGE TOP -> BOTTOM AND BOTTOM -> TOP SCROLL BENCHMARK
    // ==========================================
    console.log('\n--- 3. FULL PAGE SCROLL PERFORMANCE BENCHMARK (DESKTOP) ---');
    const maxScrollY = await client.evaluate(`return document.documentElement.scrollHeight - window.innerHeight;`);
    console.log(`Document max scroll height: ${maxScrollY}px`);

    const scrollBenchmark = await client.evaluate(`
      return new Promise(resolve => {
        let currentY = 0;
        const total = document.documentElement.scrollHeight - window.innerHeight;
        const step = 80;
        let frameCount = 0;
        const start = performance.now();
        let maxFrameDuration = 0;
        let lastFrameTime = performance.now();

        function scrollStep() {
          const now = performance.now();
          const frameDuration = now - lastFrameTime;
          if (frameDuration > maxFrameDuration) maxFrameDuration = frameDuration;
          lastFrameTime = now;
          frameCount++;

          currentY = Math.min(currentY + step, total);
          window.scrollTo(0, currentY);
          if (currentY < total) {
            requestAnimationFrame(scrollStep);
          } else {
            const totalDuration = performance.now() - start;
            resolve({
              direction: 'TOP_TO_BOTTOM',
              totalDurationMs: Math.round(totalDuration),
              frameCount,
              avgFps: Math.round((frameCount / (totalDuration / 1000))),
              maxFrameDurationMs: Math.round(maxFrameDuration)
            });
          }
        }
        requestAnimationFrame(scrollStep);
      });
    `);
    console.log('Top to Bottom scroll benchmark:', scrollBenchmark);

    const reverseBenchmark = await client.evaluate(`
      return new Promise(resolve => {
        let currentY = document.documentElement.scrollHeight - window.innerHeight;
        const step = 80;
        let frameCount = 0;
        const start = performance.now();
        let maxFrameDuration = 0;
        let lastFrameTime = performance.now();

        function scrollUp() {
          const now = performance.now();
          const frameDuration = now - lastFrameTime;
          if (frameDuration > maxFrameDuration) maxFrameDuration = frameDuration;
          lastFrameTime = now;
          frameCount++;

          currentY = Math.max(currentY - step, 0);
          window.scrollTo(0, currentY);
          if (currentY > 0) {
            requestAnimationFrame(scrollUp);
          } else {
            const totalDuration = performance.now() - start;
            resolve({
              direction: 'BOTTOM_TO_TOP',
              totalDurationMs: Math.round(totalDuration),
              frameCount,
              avgFps: Math.round((frameCount / (totalDuration / 1000))),
              maxFrameDurationMs: Math.round(maxFrameDuration)
            });
          }
        }
        requestAnimationFrame(scrollUp);
      });
    `);
    console.log('Bottom to Top scroll benchmark:', reverseBenchmark);

    // ==========================================
    // 4. TABLET / COMPACT MENU TEST (800x900)
    // ==========================================
    console.log('\n--- 4. COMPACT / TABLET MENU TEST (800x900) ---');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 800,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await new Promise(r => setTimeout(r, 200));

    // Open Menu at 800px
    await client.evaluate(`
      const toggle = document.getElementById('menuToggle');
      if (toggle) toggle.click();
    `);
    await new Promise(r => setTimeout(r, 230));
    const tabletMenuOpenState = await client.evaluate(`
      const navMenu = document.getElementById('navMenu');
      const style = window.getComputedStyle(navMenu);
      return {
        hasOpenClass: navMenu.classList.contains('site-nav__links--open'),
        opacity: style.opacity,
        transform: style.transform,
        visibility: style.visibility
      };
    `);
    console.log('Tablet menu open state (230ms):', tabletMenuOpenState);
    await client.captureScreenshot(path.join(artifactDir, 'tablet_menu_open.png'));

    // Close Menu
    await client.evaluate(`
      const toggle = document.getElementById('menuToggle');
      if (toggle) toggle.click();
    `);
    await new Promise(r => setTimeout(r, 240));

    // ==========================================
    // 5. MOBILE VIEWPORT TEST (390x844)
    // ==========================================
    console.log('\n--- 5. MOBILE VIEWPORT TEST (390x844) ---');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true
    });
    await client.send('Page.navigate', { url: 'http://localhost:4173/' });
    await new Promise(r => setTimeout(r, 1200));

    // Test Mobile Hamburger / 3-dot Menu
    console.log('\n[Mobile Menu Test]');
    await client.evaluate(`
      const toggle = document.getElementById('menuToggle');
      toggle.click();
    `);
    await new Promise(r => setTimeout(r, 230));
    const mobileMenuOpenState = await client.evaluate(`
      const navMenu = document.getElementById('navMenu');
      const style = window.getComputedStyle(navMenu);
      return {
        hasOpenClass: navMenu.classList.contains('site-nav__links--open'),
        opacity: style.opacity,
        transform: style.transform,
        visibility: style.visibility,
        display: style.display
      };
    `);
    console.log('Mobile menu open state (230ms):', mobileMenuOpenState);
    await client.captureScreenshot(path.join(artifactDir, 'mobile_menu_open.png'));

    // Close Mobile Menu
    await client.evaluate(`
      const toggle = document.getElementById('menuToggle');
      toggle.click();
    `);
    await new Promise(r => setTimeout(r, 250));
    const mobileMenuClosedState = await client.evaluate(`
      const navMenu = document.getElementById('navMenu');
      const style = window.getComputedStyle(navMenu);
      return {
        hasOpenClass: navMenu.classList.contains('site-nav__links--open'),
        opacity: style.opacity,
        visibility: style.visibility
      };
    `);
    console.log('Mobile menu closed state:', mobileMenuClosedState);

    // Mobile Global Trade Animation Test
    console.log('\n[Mobile Global Trade Animation Test]');
    const mobileGtInfo = await client.evaluate(`
      const space = document.getElementById('globalTradeScrollSpace');
      const card = document.getElementById('globalTradeWatermarkCard');
      const rect = space.getBoundingClientRect();
      return {
        spaceHeight: space.offsetHeight,
        cardHeight: card.offsetHeight,
        spaceTop: rect.top + window.scrollY
      };
    `);
    console.log('Mobile Global Trade dimensions:', mobileGtInfo);

    const mStartY = mobileGtInfo.spaceTop;
    const mDist = mobileGtInfo.spaceHeight - mobileGtInfo.cardHeight;

    // Scroll to South America stage (85%)
    await client.evaluate(`
      window.scrollTo(0, ${Math.round(mStartY + mDist * 0.85)});
      window.dispatchEvent(new Event('scroll'));
    `);
    await new Promise(r => setTimeout(r, 100));
    const mSaState = await client.evaluate(`
      const saNode = document.getElementById('node-sa');
      const naSaParticle = document.getElementById('particle-na-sa');
      return {
        saNodeOpacity: saNode ? window.getComputedStyle(saNode).opacity : null,
        particleCx: naSaParticle ? naSaParticle.getAttribute('cx') : null,
        particleCy: naSaParticle ? naSaParticle.getAttribute('cy') : null
      };
    `);
    console.log('Mobile South America stage state:', mSaState);
    await client.captureScreenshot(path.join(artifactDir, 'mobile_global_trade_south_america.png'));

    // Scroll to Australia stage (95%)
    await client.evaluate(`
      window.scrollTo(0, ${Math.round(mStartY + mDist * 0.95)});
      window.dispatchEvent(new Event('scroll'));
    `);
    await new Promise(r => setTimeout(r, 100));
    const mAusState = await client.evaluate(`
      const ausNode = document.getElementById('node-aus');
      const seaAusParticle = document.getElementById('particle-sea-aus');
      return {
        ausNodeOpacity: ausNode ? window.getComputedStyle(ausNode).opacity : null,
        particleCx: seaAusParticle ? seaAusParticle.getAttribute('cx') : null,
        particleCy: seaAusParticle ? seaAusParticle.getAttribute('cy') : null
      };
    `);
    console.log('Mobile Australia stage state:', mAusState);
    await client.captureScreenshot(path.join(artifactDir, 'mobile_global_trade_australia.png'));

    // Mobile Top->Bottom & Bottom->Top scroll benchmark
    console.log('\n[Mobile Scroll Benchmark]');
    const mScrollBenchmark = await client.evaluate(`
      return new Promise(resolve => {
        let currentY = 0;
        const total = document.documentElement.scrollHeight - window.innerHeight;
        const step = 80;
        let frameCount = 0;
        const start = performance.now();
        let maxFrameDuration = 0;
        let lastFrameTime = performance.now();

        function scrollStep() {
          const now = performance.now();
          const frameDuration = now - lastFrameTime;
          if (frameDuration > maxFrameDuration) maxFrameDuration = frameDuration;
          lastFrameTime = now;
          frameCount++;

          currentY = Math.min(currentY + step, total);
          window.scrollTo(0, currentY);
          if (currentY < total) {
            requestAnimationFrame(scrollStep);
          } else {
            const totalDuration = performance.now() - start;
            resolve({
              direction: 'MOBILE_TOP_TO_BOTTOM',
              totalDurationMs: Math.round(totalDuration),
              frameCount,
              avgFps: Math.round((frameCount / (totalDuration / 1000))),
              maxFrameDurationMs: Math.round(maxFrameDuration)
            });
          }
        }
        requestAnimationFrame(scrollStep);
      });
    `);
    console.log('Mobile Top to Bottom benchmark:', mScrollBenchmark);

    client.close();
    console.log('\n=== VERIFICATION COMPLETED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Verification failed:', err);
  } finally {
    chrome.kill();
    process.exit(0);
  }
}

runVerification();
