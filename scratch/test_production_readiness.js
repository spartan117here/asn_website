import { spawn } from 'child_process';
import http from 'http';

async function runProductionAudit() {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const port = 9325;
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
  const pageExceptions = [];
  const networkFailures = [];
  const responses = [];

  ws.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    if (data.sessionId === sessionId) {
      if (data.method === 'Runtime.consoleAPICalled') {
        consoleMessages.push(data.params);
      }
      if (data.method === 'Runtime.exceptionThrown') {
        pageExceptions.push(data.params);
      }
      if (data.method === 'Network.loadingFailed') {
        networkFailures.push(data.params);
      }
      if (data.method === 'Network.responseReceived') {
        responses.push({
          url: data.params.response.url,
          status: data.params.response.status,
          mimeType: data.params.response.mimeType
        });
        if (data.params.response.status >= 400) {
          networkFailures.push({
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

  // Load production preview
  await sendSession('Page.navigate', { url: 'http://localhost:4173/' });
  await new Promise(r => setTimeout(r, 2000));

  console.log('=== 1. NETWORK & CONSOLE AUDIT ===');
  console.log('Total HTTP Responses:', responses.length);
  console.log('Network Failures (should be 0):', JSON.stringify(networkFailures, null, 2));
  console.log('Page Exceptions (should be 0):', JSON.stringify(pageExceptions, null, 2));
  console.log('Console API Messages:', consoleMessages.map(m => `[${m.type}] ${m.args.map(a => a.value || a.description).join(' ')}`));

  console.log('\n=== 2. FUNCTIONALITY & INTERACTION AUDIT ===');
  const results = await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const testReport = {};

        // Test A: GSAP & ScrollTrigger loaded and active
        testReport.hasGsap = typeof gsap !== 'undefined';
        testReport.hasScrollTrigger = typeof ScrollTrigger !== 'undefined';

        // Test B: 3-dot / Mobile Menu Toggle
        const menuToggle = document.getElementById('menuToggle');
        const navMenu = document.getElementById('navMenu');
        testReport.menuToggleExists = !!menuToggle;
        testReport.navMenuExists = !!navMenu;
        if (menuToggle && navMenu) {
          menuToggle.click();
          testReport.menuOpenedOnClick = navMenu.classList.contains('site-nav__links--open');
          menuToggle.click();
          testReport.menuClosedOnSecondClick = !navMenu.classList.contains('site-nav__links--open');
        }

        // Test C: Quote Modal Open & Close
        const openQuoteBtn = document.querySelector('.open-quote-modal');
        const quoteModal = document.getElementById('quoteModal');
        const modalClose = document.getElementById('modalClose');
        testReport.openQuoteBtnExists = !!openQuoteBtn;
        testReport.quoteModalExists = !!quoteModal;
        if (openQuoteBtn && quoteModal) {
          openQuoteBtn.click();
          testReport.modalOpenedOnClick = quoteModal.classList.contains('quote-modal--active');
          if (modalClose) {
            modalClose.click();
            testReport.modalClosedOnCloseBtn = !quoteModal.classList.contains('quote-modal--active');
          }
        }

        // Test D: Product Card Click Opens Modal with Selected Category
        const firstCard = document.querySelector('.product-card');
        if (firstCard && quoteModal) {
          firstCard.click();
          const selCat = document.getElementById('quoteCategory')?.value;
          testReport.productCardOpensModal = quoteModal.classList.contains('quote-modal--active');
          testReport.productCardCategorySelected = !!selCat;
          if (modalClose) modalClose.click();
        }

        // Test E: WhatsApp Enquiry Form Submission & Validation
        const contactForm = document.getElementById('contactForm');
        testReport.contactFormExists = !!contactForm;
        if (contactForm) {
          // Submit empty - check validation
          const submitBtn = contactForm.querySelector('button[type="submit"]');
          submitBtn.click();
          const nameGroup = contactForm.querySelector('[name="name"]').closest('.form-group');
          testReport.validationTriggeredOnEmptySubmit = nameGroup?.classList.contains('has-error');

          // Fill valid data
          contactForm.querySelector('[name="name"]').value = 'Acme Logistics Global';
          contactForm.querySelector('[name="email"]').value = 'imports@acme-logistics.com';
          contactForm.querySelector('[name="phone"]').value = '+91 9876543210';
          contactForm.querySelector('[name="category"]').value = 'Food Products';
          contactForm.querySelector('[name="message"]').value = 'Looking to import 5 metric tons of premium Indian spices.';

          submitBtn.click();
          const feedback = document.getElementById('contactFormFeedback');
          testReport.whatsappHandoffCreated = feedback?.classList.contains('contact-form-feedback--ready');
          testReport.whatsappDirectLinkPresent = !!feedback?.querySelector('.whatsapp-direct-link');
        }

        // Test F: Global Trade Scroll Elements
        const scrollSpace = document.getElementById('globalTradeScrollSpace');
        const svg = document.getElementById('globalTradeSvg');
        testReport.globalTradeScrollSpaceExists = !!scrollSpace;
        testReport.globalTradeSvgExists = !!svg;

        const routes = svg ? svg.querySelectorAll('.trade-route-line') : [];
        const nodes = svg ? svg.querySelectorAll('.trade-node') : [];
        const particles = svg ? svg.querySelectorAll('.trade-particle') : [];
        testReport.tradeRouteLinesCount = routes.length;
        testReport.tradeNodesCount = nodes.length;
        testReport.tradeParticlesCount = particles.length;

        // Test G: ScrollTrigger & Global Trade Scrubbing
        const initialScrollY = window.scrollY;
        // Scroll down to middle of Global Trade section
        const tradeRect = scrollSpace?.getBoundingClientRect();
        const targetScroll = window.scrollY + (tradeRect ? tradeRect.top + 200 : 800);
        window.scrollTo(0, targetScroll);

        return testReport;
      })()
    `,
    returnByValue: true
  });

  console.log('Interaction Audit Results:', JSON.stringify(results.result.value, null, 2));

  // Wait for requestAnimationFrame scroll update
  await new Promise(r => setTimeout(r, 600));

  const scrollScrubCheck = await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const svg = document.getElementById('globalTradeSvg');
        if (!svg) return { error: 'No svg' };
        const routeInMe = svg.querySelector('#route-in-me');
        const particleInMe = svg.querySelector('#particle-in-me');
        const nodeMe = svg.querySelector('#node-me');
        return {
          routeInMeOffset: routeInMe?.style.strokeDashoffset,
          routeInMeOpacity: routeInMe?.style.opacity,
          particleInMeOpacity: particleInMe?.getAttribute('opacity'),
          particleInMeCx: particleInMe?.getAttribute('cx'),
          particleInMeCy: particleInMe?.getAttribute('cy'),
          nodeMeOpacity: nodeMe?.style.opacity,
          scrollY: window.scrollY
        };
      })()
    `,
    returnByValue: true
  });

  console.log('\n=== 3. SCROLL SCRUB ANIMATION STATE ===');
  console.log('Global Trade Scrubbed State:', JSON.stringify(scrollScrubCheck.result.value, null, 2));

  // Test Mobile Viewport
  console.log('\n=== 4. MOBILE VIEWPORT AUDIT (375x812) ===');
  await sendSession('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 812,
    deviceScaleFactor: 2,
    mobile: true
  });
  await new Promise(r => setTimeout(r, 500));

  const mobileResults = await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const report = {};
        const menuToggle = document.getElementById('menuToggle');
        const navMenu = document.getElementById('navMenu');
        
        menuToggle.click();
        report.mobileMenuOpened = navMenu.classList.contains('site-nav__links--open');
        report.bodyLocked = document.body.classList.contains('mobile-nav-locked');

        // Test Products dropdown inside mobile menu
        const dropdownToggle = document.querySelector('.nav-dropdown .nav-link--dropdown');
        const navDropdown = document.querySelector('.nav-dropdown');
        if (dropdownToggle && navDropdown) {
          dropdownToggle.click();
          report.productsDropdownOpened = navDropdown.classList.contains('nav-dropdown--open');
        }

        // Close mobile menu
        menuToggle.click();
        report.mobileMenuClosed = !navMenu.classList.contains('site-nav__links--open');

        // Test mobile modal trigger
        const mobileQuoteBtn = document.querySelector('.mobile-nav__action .open-quote-modal') || document.querySelector('.open-quote-modal');
        const quoteModal = document.getElementById('quoteModal');
        mobileQuoteBtn?.click();
        report.mobileModalOpened = quoteModal?.classList.contains('quote-modal--active');
        document.getElementById('modalClose')?.click();
        report.mobileModalClosed = !quoteModal?.classList.contains('quote-modal--active');

        return report;
      })()
    `,
    returnByValue: true
  });

  console.log('Mobile Viewport Results:', JSON.stringify(mobileResults.result.value, null, 2));

  ws.close();
  chrome.kill();
  console.log('\nProduction Audit Complete!');
}

runProductionAudit().catch(console.error);
