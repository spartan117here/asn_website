import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// -------------------------------------------------------------------
// Scroll Restoration — Reset to top on reload/refresh
// -------------------------------------------------------------------
if (typeof history !== 'undefined' && 'scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

window.addEventListener('load', () => {
  window.scrollTo(0, 0);
  if (typeof ScrollTrigger !== 'undefined') {
    ScrollTrigger.refresh();
  }
});

gsap.registerPlugin(ScrollTrigger);

// -------------------------------------------------------------------
// 1. Copyright Year Initialization
// -------------------------------------------------------------------
function initCopyrightYear() {
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
}

// -------------------------------------------------------------------
// 2. Sticky Navigation Bar with Elevation on Scroll (rAF-Throttled)
// -------------------------------------------------------------------
function initStickyNav() {
  const siteNav = document.getElementById('siteNav');
  if (!siteNav) return;

  let navScrolled = false;
  let navRaf = null;

  function updateNavState() {
    navRaf = null;
    const isScrolled = (window.scrollY || window.pageYOffset || 0) > 20;
    if (isScrolled !== navScrolled) {
      navScrolled = isScrolled;
      if (isScrolled) {
        siteNav.classList.add('site-nav--scrolled');
      } else {
        siteNav.classList.remove('site-nav--scrolled');
      }
    }
  }

  window.addEventListener('scroll', () => {
    if (!navRaf) {
      navRaf = requestAnimationFrame(updateNavState);
    }
  }, { passive: true });
}

// -------------------------------------------------------------------
// 3. Mobile Menu & Products Dropdown Interaction (GPU-Optimized)
// -------------------------------------------------------------------
function initMobileMenu() {
  const siteNav = document.getElementById('siteNav');
  const menuToggle = document.getElementById('menuToggle');
  const navMenu = document.getElementById('navMenu');
  const navDropdown = document.querySelector('.nav-dropdown');
  const dropdownToggle = navDropdown?.querySelector('.nav-link--dropdown');

  if (!menuToggle || !navMenu) return;

  let isMobileMenuOpen = false;
  let savedScrollY = 0;

  function resetMobileProducts() {
    if (navDropdown) {
      navDropdown.classList.remove('nav-dropdown--open');
      const chevron = navDropdown.querySelector('.dropdown-chevron');
      if (chevron) chevron.style.transform = '';
    }
  }

  function preventBackgroundScroll(e) {
    if (navMenu && navMenu.contains(e.target)) {
      return; // Allow touch scrolling inside the mobile navigation menu panel
    }
    e.preventDefault();
  }

  function openMobileMenu() {
    if (isMobileMenuOpen) return;
    isMobileMenuOpen = true;
    savedScrollY = window.scrollY || window.pageYOffset || 0;

    navMenu.classList.add('site-nav__links--open');
    menuToggle.classList.add('menu-toggle--open');
    menuToggle.setAttribute('aria-expanded', 'true');
    siteNav?.classList.add('site-nav--menu-open');
    document.body.classList.add('mobile-nav-locked');

    resetMobileProducts();
    window.addEventListener('touchmove', preventBackgroundScroll, { passive: false });
  }

  function closeMobileMenu() {
    if (!isMobileMenuOpen) return;
    isMobileMenuOpen = false;

    navMenu.classList.remove('site-nav__links--open');
    menuToggle.classList.remove('menu-toggle--open');
    menuToggle.setAttribute('aria-expanded', 'false');
    siteNav?.classList.remove('site-nav--menu-open');
    document.body.classList.remove('mobile-nav-locked');

    window.removeEventListener('touchmove', preventBackgroundScroll);
    resetMobileProducts();

    // Ensure scroll position remains stable without unnecessary jitter
    const currentY = window.scrollY || window.pageYOffset || 0;
    if (typeof savedScrollY === 'number' && Math.abs(currentY - savedScrollY) > 1) {
      window.scrollTo(0, savedScrollY);
    }
  }

  function toggleMobileMenu() {
    if (isMobileMenuOpen) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  }

  menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMobileMenu();
  });

  // Mobile-only Products click toggle
  if (dropdownToggle) {
    dropdownToggle.addEventListener('click', (e) => {
      if (window.innerWidth <= 768) {
        e.preventDefault();
        e.stopPropagation();
        navDropdown?.classList.toggle('nav-dropdown--open');
      }
    });
  }

  // Close menu on navigation link or button click (excluding the Products dropdown trigger)
  navMenu.querySelectorAll('a, button').forEach((item) => {
    if (item === dropdownToggle) return;
    item.addEventListener('click', () => {
      closeMobileMenu();
    });
  });

  // Close menu when tapping outside the menu panel and toggle button
  document.addEventListener('click', (e) => {
    if (window.innerWidth > 768 || !isMobileMenuOpen) return;
    if (navMenu.contains(e.target) || menuToggle.contains(e.target)) return;
    closeMobileMenu();
  });

  // Reset if resized back to desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && isMobileMenuOpen) {
      closeMobileMenu();
    }
  }, { passive: true });
}

// -------------------------------------------------------------------
// 4. Interactive Quote / Contact Modal
// -------------------------------------------------------------------
function initQuoteModal() {
  const quoteModal = document.getElementById('quoteModal');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalClose = document.getElementById('modalClose');
  const formFeedback = document.getElementById('formFeedback');
  const quoteCategory = document.getElementById('quoteCategory');

  function openModal(category = '') {
    if (!quoteModal) return;
    quoteModal.classList.add('quote-modal--active');
    quoteModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    if (category && quoteCategory) {
      for (let i = 0; i < quoteCategory.options.length; i++) {
        if (quoteCategory.options[i].value === category) {
          quoteCategory.selectedIndex = i;
          break;
        }
      }
    }
  }

  function closeModal() {
    if (!quoteModal) return;
    quoteModal.classList.remove('quote-modal--active');
    quoteModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (formFeedback) formFeedback.textContent = '';
  }

  // Attach open handlers
  document.querySelectorAll('.open-quote-modal').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });
  });

  // Product card clicks open modal with pre-selected category
  document.querySelectorAll('.product-card').forEach((card) => {
    card.addEventListener('click', () => {
      const cat = card.getAttribute('data-category') || '';
      openModal(cat);
    });
  });

  modalClose?.addEventListener('click', closeModal);
  modalBackdrop?.addEventListener('click', closeModal);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && quoteModal?.classList.contains('quote-modal--active')) {
      closeModal();
    }
  });
}

// ===================================================================
// 5. Professional WhatsApp Business Enquiry Submission
// Target Company WhatsApp: +91 90873 05577 (wa.me/919087305577)
// ===================================================================
const COMPANY_WHATSAPP_NUMBER = '919087305577';

function formatWhatsAppEnquiry({ name, email, phone, product, message }) {
  return [
    'Hello ASN Imports & Exports Team,',
    '',
    'I would like to submit a business enquiry through your website.',
    '',
    '━━━━━━━━━━━━━━━━━━',
    '',
    'CUSTOMER DETAILS',
    '',
    'Name:',
    name,
    '',
    'Business Email:',
    email,
    '',
    'Phone / WhatsApp:',
    phone,
    '',
    'Product / Service:',
    product,
    '',
    '━━━━━━━━━━━━━━━━━━',
    '',
    'ENQUIRY DETAILS',
    '',
    'Message / Requirements:',
    message,
    '',
    '━━━━━━━━━━━━━━━━━━',
    '',
    'Source:',
    'ASN Logistics Website',
    '',
    'Thank you.'
  ].join('\n');
}

function setupWhatsAppForm(form, feedbackEl, isModal = false) {
  if (!form) return;

  const nameInput = form.querySelector('[name="name"]');
  const emailInput = form.querySelector('[name="email"]');
  const phoneInput = form.querySelector('[name="phone"]');
  const categoryInput = form.querySelector('[name="category"]');
  const messageInput = form.querySelector('[name="message"]');
  const submitBtn = form.querySelector('button[type="submit"]');
  const btnSpan = submitBtn ? submitBtn.querySelector('span') : null;
  const originalBtnText = btnSpan ? btnSpan.textContent : 'Send Enquiry';

  function clearFieldError(input) {
    if (!input) return;
    const group = input.closest('.form-group');
    if (group) {
      group.classList.remove('has-error');
      const errEl = group.querySelector('.field-error');
      if (errEl) errEl.textContent = '';
    }
  }

  function setFieldError(input, msg) {
    if (!input) return;
    const group = input.closest('.form-group');
    if (group) {
      group.classList.add('has-error');
      let errEl = group.querySelector('.field-error');
      if (!errEl) {
        errEl = document.createElement('span');
        errEl.className = 'field-error';
        group.appendChild(errEl);
      }
      errEl.textContent = msg;
    }
  }

  // Clear field errors as soon as user types or selects
  [nameInput, emailInput, phoneInput, categoryInput, messageInput].forEach((input) => {
    if (!input) return;
    const eventName = input.tagName === 'SELECT' ? 'change' : 'input';
    input.addEventListener(eventName, () => clearFieldError(input));
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    let isValid = true;
    let firstInvalid = null;

    if (feedbackEl) {
      feedbackEl.className = isModal ? 'form-feedback' : 'contact-form-feedback';
      feedbackEl.textContent = '';
    }

    // 1. Full Name: required, trimmed
    const nameVal = nameInput ? nameInput.value.trim() : '';
    if (!nameVal) {
      setFieldError(nameInput, 'Full Name is required.');
      isValid = false;
      if (!firstInvalid) firstInvalid = nameInput;
    } else if (nameVal.length < 2) {
      setFieldError(nameInput, 'Please enter at least 2 characters.');
      isValid = false;
      if (!firstInvalid) firstInvalid = nameInput;
    } else {
      clearFieldError(nameInput);
    }

    // 2. Business Email: required, valid format
    const emailVal = emailInput ? emailInput.value.trim() : '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailVal) {
      setFieldError(emailInput, 'Business Email is required.');
      isValid = false;
      if (!firstInvalid) firstInvalid = emailInput;
    } else if (!emailRegex.test(emailVal)) {
      setFieldError(emailInput, 'Please enter a valid business email address.');
      isValid = false;
      if (!firstInvalid) firstInvalid = emailInput;
    } else {
      clearFieldError(emailInput);
    }

    // 3. Phone / WhatsApp: required, international formats allowed
    const phoneVal = phoneInput ? phoneInput.value.trim() : '';
    const digitsOnly = phoneVal.replace(/\D/g, '');
    if (!phoneVal) {
      setFieldError(phoneInput, 'Phone / WhatsApp is required.');
      isValid = false;
      if (!firstInvalid) firstInvalid = phoneInput;
    } else if (digitsOnly.length < 7 || digitsOnly.length > 16) {
      setFieldError(phoneInput, 'Please enter a valid phone number (e.g. +91 90873 05577).');
      isValid = false;
      if (!firstInvalid) firstInvalid = phoneInput;
    } else {
      clearFieldError(phoneInput);
    }

    // 4. Product / Service: required, must not be empty
    const categoryVal = categoryInput ? categoryInput.value.trim() : '';
    if (!categoryVal || categoryVal === '') {
      setFieldError(categoryInput, 'Please select a product or service category.');
      isValid = false;
      if (!firstInvalid) firstInvalid = categoryInput;
    } else {
      clearFieldError(categoryInput);
    }

    // 5. Message / Requirements: required, trimmed
    const messageVal = messageInput ? messageInput.value.trim() : '';
    if (!messageVal) {
      setFieldError(messageInput, 'Please provide details of your enquiry or requirements.');
      isValid = false;
      if (!firstInvalid) firstInvalid = messageInput;
    } else if (messageVal.length < 5) {
      setFieldError(messageInput, 'Please enter at least 5 characters for your requirements.');
      isValid = false;
      if (!firstInvalid) firstInvalid = messageInput;
    } else {
      clearFieldError(messageInput);
    }

    if (!isValid) {
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    // Prevent accidental double submit & update button state
    if (submitBtn) {
      submitBtn.disabled = true;
      if (btnSpan) btnSpan.textContent = 'Preparing WhatsApp...';
    }

    // Format & encode message
    const messageText = formatWhatsAppEnquiry({
      name: nameVal,
      email: emailVal,
      phone: phoneVal,
      product: categoryVal,
      message: messageVal
    });

    const encodedText = encodeURIComponent(messageText);
    const whatsappUrl = `https://wa.me/${COMPANY_WHATSAPP_NUMBER}?text=${encodedText}`;

    // Open WhatsApp
    try {
      const win = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      if (win) {
        win.focus();
      }
    } catch (err) {}

    // Display professional handoff confirmation
    if (feedbackEl) {
      const baseClass = isModal ? 'form-feedback' : 'contact-form-feedback';
      feedbackEl.className = `${baseClass} ${baseClass}--ready`;
      feedbackEl.innerHTML = `
        <div class="feedback-badge">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Your enquiry is ready in WhatsApp. Please press Send to submit it.</span>
        </div>
        <a href="${whatsappUrl}" target="_blank" rel="noopener noreferrer" class="whatsapp-direct-link">
          <span>Click here if WhatsApp did not open automatically &rarr;</span>
        </a>
      `;
    }

    // Restore button after brief handoff delay
    setTimeout(() => {
      if (submitBtn) {
        submitBtn.disabled = false;
        if (btnSpan) btnSpan.textContent = originalBtnText;
      }
    }, 1500);
  });
}

function initWhatsAppForms() {
  const contactForm = document.getElementById('contactForm');
  const contactFormFeedback = document.getElementById('contactFormFeedback');
  if (contactForm) {
    setupWhatsAppForm(contactForm, contactFormFeedback, false);
  }

  const quoteForm = document.getElementById('quoteForm');
  const quoteFeedback = document.getElementById('formFeedback');
  if (quoteForm) {
    setupWhatsAppForm(quoteForm, quoteFeedback, true);
  }
}

// -------------------------------------------------------------------
// 6. Statistics Counter Animation
// -------------------------------------------------------------------
function initCounters() {
  const statNumbers = document.querySelectorAll('.stat-card__number');
  if (!statNumbers.length) return;

  function animateCounters() {
    statNumbers.forEach((el) => {
      const target = parseInt(el.getAttribute('data-target') || '0', 10);
      const suffix = el.getAttribute('data-suffix') || '';
      if (isNaN(target)) return;

      let count = 0;
      const duration = 1200; // ms
      const stepTime = 16;
      const totalSteps = duration / stepTime;
      const stepIncrement = target / totalSteps;

      const timer = setInterval(() => {
        count += stepIncrement;
        if (count >= target) {
          el.textContent = target + suffix;
          clearInterval(timer);
        } else {
          el.textContent = Math.floor(count) + suffix;
        }
      }, stepTime);
    });
  }

  if ('IntersectionObserver' in window) {
    let animated = false;
    const whyChooseSection = document.getElementById('why-choose');
    if (whyChooseSection) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !animated) {
              animated = true;
              animateCounters();
              observer.disconnect();
            }
          });
        },
        { threshold: 0.15 }
      );
      observer.observe(whyChooseSection);
    }
  } else {
    animateCounters();
  }
}

// -------------------------------------------------------------------
// 7. GSAP Premium Image Reveals & Entrance Animations
// -------------------------------------------------------------------
function initImageReveals() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion || typeof gsap === 'undefined') return;

  // Hero text subtle entrance
  gsap.from('.hero__title', { y: 15, duration: 0.7, ease: 'power2.out' });
  gsap.from('.hero__lead', { y: 10, duration: 0.7, delay: 0.1, ease: 'power2.out' });
  gsap.from('.hero__buttons', { y: 10, duration: 0.6, delay: 0.2, ease: 'power2.out' });

  // Individual photographic image containers
  const singleRevealSelectors = [
    '.about-card-visual__wrapper',
    '.about-quote-card__image-box',
    '.why-choose__globe-bg',
    '.cta-banner__bg-container'
  ];

  singleRevealSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((container) => {
      if (!container) return;
      const img = container.querySelector('img');

      gsap.set(container, { clipPath: 'inset(100% 0% 0% 0%)' });
      if (img) gsap.set(img, { scale: 1.12 });

      ScrollTrigger.create({
        trigger: container,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          gsap.to(container, {
            clipPath: 'inset(0% 0% 0% 0%)',
            duration: 0.9,
            ease: 'power3.out'
          });
          if (img) {
            gsap.to(img, {
              scale: 1.0,
              duration: 0.9,
              ease: 'power3.out'
            });
          }
        }
      });
    });
  });

  // Products Grid: Signature Focus Pull Reveal
  const productCards = gsap.utils.toArray('.products-grid .product-card');
  if (productCards.length > 0) {
    const prodImgs = gsap.utils.toArray('.products-grid .product-card__thumb img');
    const prodTitles = gsap.utils.toArray('.products-grid .product-card__title');

    gsap.set(prodImgs, {
      filter: 'blur(7px) grayscale(45%) brightness(0.9)',
      scale: 0.92,
      opacity: 0.3
    });
    gsap.set(prodTitles, { opacity: 0 });

    ScrollTrigger.create({
      trigger: '.products-grid',
      start: 'top 80%',
      once: true,
      onEnter: () => {
        gsap.to(prodImgs, {
          filter: 'blur(0px) grayscale(0%) brightness(1)',
          scale: 1.0,
          opacity: 1.0,
          duration: 0.75,
          stagger: 0.08,
          ease: 'power2.out',
          onComplete: () => {
            gsap.set(prodImgs, { clearProps: 'filter,transform,opacity' });
          }
        });

        gsap.to(prodTitles, {
          opacity: 1,
          duration: 0.5,
          delay: 0.12,
          stagger: 0.08,
          ease: 'power2.out',
          onComplete: () => {
            gsap.set(prodTitles, { clearProps: 'opacity' });
          }
        });
      }
    });
  }
}

// -------------------------------------------------------------------
// 8. Ship & Shipping Motion Animation ("Connecting Businesses Across Borders" card)
// -------------------------------------------------------------------
function initShipHover() {
  const shipImageBox = document.getElementById('shipImageBox');
  const shipImg = document.getElementById('shipImg') || document.querySelector('.about-quote-card__img');
  const shipWaterOverlay = document.getElementById('shipWaterOverlay');
  const shipWaterTrack = document.getElementById('shipWaterTrack');

  if (!shipImageBox || !shipImg) return;

  let shipBobTween = null;
  let waterTween = null;
  let isAnimating = false;

  function startShipAnimation() {
    if (isAnimating) return;
    isAnimating = true;

    // 1. Water wave motion loop
    if (shipWaterOverlay) {
      shipWaterOverlay.style.opacity = '1';
    }
    if (shipWaterTrack) {
      gsap.killTweensOf(shipWaterTrack);
      gsap.set(shipWaterTrack, { xPercent: 0 });
      waterTween = gsap.to(shipWaterTrack, {
        xPercent: -50,
        duration: 4.8,
        ease: 'none',
        repeat: -1
      });
    }

    // 2. Subtle ship vessel bobbing & gentle pitch
    gsap.killTweensOf(shipImg);
    shipBobTween = gsap.to(shipImg, {
      y: -3.5,
      scale: 1.025,
      rotation: 0.35,
      duration: 2.2,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut'
    });
  }

  function stopShipAnimation() {
    if (!isAnimating) return;
    isAnimating = false;

    if (waterTween) {
      waterTween.kill();
      waterTween = null;
    }
    if (shipWaterOverlay) {
      shipWaterOverlay.style.opacity = '0';
    }
    if (shipWaterTrack) {
      gsap.killTweensOf(shipWaterTrack);
      gsap.set(shipWaterTrack, { xPercent: 0 });
    }

    if (shipBobTween) {
      shipBobTween.kill();
      shipBobTween = null;
    }
    gsap.to(shipImg, {
      y: 0,
      scale: 1.0,
      rotation: 0,
      duration: 0.45,
      ease: 'power2.out'
    });
  }

  // Desktop hover interaction
  shipImageBox.addEventListener('mouseenter', () => {
    startShipAnimation();
  });

  shipImageBox.addEventListener('mouseleave', () => {
    const isTouchOnly = window.matchMedia('(hover: none)').matches;
    if (!isTouchOnly) {
      stopShipAnimation();
    }
  });

  // Mobile / Tablet: In-viewport auto-play
  ScrollTrigger.create({
    trigger: shipImageBox,
    start: 'top 85%',
    end: 'bottom 15%',
    onEnter: () => {
      const isMobile = window.innerWidth <= 768 || window.matchMedia('(hover: none)').matches;
      if (isMobile) startShipAnimation();
    },
    onLeave: () => {
      const isMobile = window.innerWidth <= 768 || window.matchMedia('(hover: none)').matches;
      if (isMobile) stopShipAnimation();
    },
    onEnterBack: () => {
      const isMobile = window.innerWidth <= 768 || window.matchMedia('(hover: none)').matches;
      if (isMobile) startShipAnimation();
    },
    onLeaveBack: () => {
      const isMobile = window.innerWidth <= 768 || window.matchMedia('(hover: none)').matches;
      if (isMobile) stopShipAnimation();
    }
  });

  shipImageBox.addEventListener('touchstart', () => {
    startShipAnimation();
  }, { passive: true });
}

// -------------------------------------------------------------------
// 9. High-Performance Scroll-Synchronized Global Trade Animation
// Includes Existing Destinations + South America + Australia
// Pre-cached geometry & zero layout reflows per scroll frame
// -------------------------------------------------------------------
function initGlobalTradeScrollAnimation() {
  const scrollSpace = document.getElementById('globalTradeScrollSpace');
  const card = document.getElementById('globalTradeWatermarkCard');
  const svg = document.getElementById('globalTradeSvg');

  if (!scrollSpace || !svg) return;

  // Reduced motion check
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    svg.querySelectorAll('.trade-route-line').forEach(r => {
      r.style.strokeDashoffset = '0';
      r.style.opacity = '0.75';
    });
    svg.querySelectorAll('.trade-node').forEach(n => {
      n.style.opacity = '1';
      n.style.transform = 'scale(1)';
    });
    svg.querySelectorAll('.trade-particle').forEach(p => {
      p.style.opacity = '0.85';
    });
    const ship = svg.querySelector('#ship-indicator');
    const aircraft = svg.querySelector('#aircraft-indicator');
    if (ship) ship.setAttribute('opacity', '0.85');
    if (aircraft) aircraft.setAttribute('opacity', '0.85');
    return;
  }

  // Target SVG route elements (Existing 7 + 2 New Destinations)
  const routeInMe = svg.querySelector('#route-in-me');
  const routeMeEu = svg.querySelector('#route-me-eu');
  const routeInSea = svg.querySelector('#route-in-sea');
  const routeInAf = svg.querySelector('#route-in-af');
  const routeInEa = svg.querySelector('#route-in-ea');
  const routeEuNa = svg.querySelector('#route-eu-na');
  const routeNaSa = svg.querySelector('#route-na-sa');   // NEW: Destination 1 (South America)
  const routeSeaAus = svg.querySelector('#route-sea-aus'); // NEW: Destination 2 (Australia)
  const routeLoop = svg.querySelector('#route-loop');

  // Target nodes (Existing 7 + 2 New Destinations)
  const nodeIndia = svg.querySelector('#node-india');
  const nodeMe = svg.querySelector('#node-me');
  const nodeEurope = svg.querySelector('#node-europe');
  const nodeSea = svg.querySelector('#node-sea');
  const nodeAf = svg.querySelector('#node-africa');
  const nodeEa = svg.querySelector('#node-ea');
  const nodeNa = svg.querySelector('#node-na');
  const nodeSa = svg.querySelector('#node-sa');   // NEW: South America
  const nodeAus = svg.querySelector('#node-aus'); // NEW: Australia

  // Target particles (Existing 6 + 2 New Destinations)
  const partInMe = svg.querySelector('#particle-in-me');
  const partMeEu = svg.querySelector('#particle-me-eu');
  const partInSea = svg.querySelector('#particle-in-sea');
  const partInAf = svg.querySelector('#particle-in-af');
  const partInEa = svg.querySelector('#particle-in-ea');
  const partEuNa = svg.querySelector('#particle-eu-na');
  const partNaSa = svg.querySelector('#particle-na-sa');   // NEW: South America particle
  const partSeaAus = svg.querySelector('#particle-sea-aus'); // NEW: Australia particle

  // Target logistics indicators
  const aircraft = svg.querySelector('#aircraft-indicator');
  const ship = svg.querySelector('#ship-indicator');

  // Target typography
  const textGlobalTrade = card?.querySelector('.watermark-script span');
  const textTomorrow = card?.querySelector('.watermark-script em');
  const textSubtitle = card?.querySelector('.watermark-sub');

  // Pre-query and cache node rings for synchronous glow
  const allNodeRings = svg.querySelectorAll('.node-ring');

  const allRoutes = [routeInMe, routeMeEu, routeInSea, routeInAf, routeInEa, routeEuNa, routeNaSa, routeSeaAus, routeLoop];

  // Route length caching
  const routeLens = new Map();
  function getRouteLen(el) {
    if (!el) return 100;
    if (routeLens.has(el)) return routeLens.get(el);
    try {
      if (typeof el.getTotalLength === 'function') {
        const l = el.getTotalLength();
        if (l && l > 0) {
          routeLens.set(el, l);
          return l;
        }
      }
    } catch (e) {}
    return 100;
  }

  // High-performance Point Cache for SVG bezier path calculations (avoids repeated CPU math)
  const pointCache = new Map();
  function getSafePointAtLength(route, dist) {
    if (!route || typeof route.getPointAtLength !== 'function') return { x: 0, y: 0 };
    const cacheKey = (route.id || 'r') + '_' + Math.round(dist);
    if (pointCache.has(cacheKey)) {
      return pointCache.get(cacheKey);
    }
    try {
      const pt = route.getPointAtLength(dist);
      if (pt && typeof pt.x === 'number' && typeof pt.y === 'number') {
        const res = { x: pt.x, y: pt.y };
        if (pointCache.size < 2000) {
          pointCache.set(cacheKey, res);
        }
        return res;
      }
    } catch (e) {}
    return { x: 0, y: 0 };
  }

  function measureAndInitRoutes() {
    routeLens.clear();
    pointCache.clear();
    allRoutes.forEach(r => {
      if (r) {
        try {
          const len = getRouteLen(r);
          r.style.strokeDasharray = `${len}`;
          r.style.strokeDashoffset = `${len}`;
        } catch (e) {
          routeLens.set(r, 100);
        }
      }
    });
  }
  measureAndInitRoutes();

  // Pre-cached dimension variables to eliminate all forced synchronous reflows on scroll
  let cachedSpaceTop = 0;
  let cachedTotalDistance = 1;
  let cachedStickyTop = 96;

  function updateScrollDimensions() {
    if (!scrollSpace) return;
    const isMobile = window.innerWidth <= 768;
    cachedStickyTop = isMobile ? 76 : 96;
    const cardHeight = card?.offsetHeight || (isMobile ? 360 : 480);
    cachedTotalDistance = Math.max(1, scrollSpace.offsetHeight - cardHeight);

    const rect = scrollSpace.getBoundingClientRect();
    cachedSpaceTop = rect.top + (window.scrollY || window.pageYOffset || 0);
  }
  updateScrollDimensions();

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function mapRange(val, inMin, inMax) {
    return clamp((val - inMin) / (inMax - inMin), 0, 1);
  }

  // Helper: animate destination node golden bloom upon arrival
  function updateNode(node, cx, cy, progress, tAppear, tPeak, tSettle) {
    if (!node) return;
    if (progress < tAppear) {
      node.style.opacity = '0';
      node.setAttribute('transform', `translate(${cx}, ${cy}) scale(0.4)`);
    } else if (progress < tPeak) {
      // Expanding golden bloom ✨
      const t = mapRange(progress, tAppear, tPeak);
      const s = 0.4 + 0.82 * t; // 0.4 -> ~1.22
      node.style.opacity = `${t}`;
      node.setAttribute('transform', `translate(${cx}, ${cy}) scale(${s})`);
      const ring = node.querySelector('.node-ring');
      if (ring) {
        ring.style.opacity = '1';
        ring.style.strokeWidth = `${2 + 1.6 * t}`;
      }
    } else if (progress < tSettle) {
      // Bloom gracefully settles to standard size
      const t = mapRange(progress, tPeak, tSettle);
      const s = 1.22 - 0.22 * t; // 1.22 -> 1.0
      node.style.opacity = '1';
      node.setAttribute('transform', `translate(${cx}, ${cy}) scale(${s})`);
      const ring = node.querySelector('.node-ring');
      if (ring) {
        ring.style.opacity = `${1 - 0.25 * t}`;
        ring.style.strokeWidth = `${3.6 - 1.8 * t}`;
      }
    } else {
      // Established active node
      node.style.opacity = '1';
      node.setAttribute('transform', `translate(${cx}, ${cy}) scale(1)`);
      const ring = node.querySelector('.node-ring');
      if (ring) {
        ring.style.opacity = '0.75';
        ring.style.strokeWidth = '1.8';
      }
    }
  }

  // Helper: animate route drawing & exact particle path travel from start node to destination node
  function updateJourney(route, particle, progress, tStart, tEnd, tDissolve) {
    if (!route) return;
    const len = getRouteLen(route);
    const t = mapRange(progress, tStart, tEnd);

    // 1. Draw route line
    route.style.strokeDashoffset = `${len * (1 - t)}`;
    route.style.opacity = progress >= tStart ? '0.85' : '0.12';

    // 2. Mathematically synchronize particle along exact route path geometry
    if (particle) {
      if (t > 0 && t < 1) {
        // In transit: follows exact path curve
        const pt = getSafePointAtLength(route, t * len);
        particle.setAttribute('cx', pt.x);
        particle.setAttribute('cy', pt.y);
        particle.setAttribute('opacity', '1');
      } else if (t >= 1 && tDissolve && progress < tDissolve) {
        // Destination reached: sits at destination node before gentle dissolve
        const pt = getSafePointAtLength(route, len);
        particle.setAttribute('cx', pt.x);
        particle.setAttribute('cy', pt.y);
        const pDissolve = mapRange(progress, tEnd, tDissolve);
        particle.setAttribute('opacity', `${1 - pDissolve}`);
      } else {
        particle.setAttribute('opacity', '0');
      }
    }
  }

  // Animation frame scrubbing
  let rafId = null;
  let lastProgress = -1;
  let hadGlow = false;

  function updateScrubbedAnimation(progress) {
    if (Math.abs(progress - lastProgress) < 0.0003) return;
    lastProgress = progress;

    try {
      // ── STAGE 0: Origin Node (India) Awakens (0.00 - 0.05) ──
      if (nodeIndia) {
        if (progress < 0.01) {
          nodeIndia.style.opacity = '0';
          nodeIndia.setAttribute('transform', 'translate(705, 248) scale(0.4)');
        } else if (progress < 0.05) {
          const t = mapRange(progress, 0.01, 0.05);
          const s = 0.4 + 0.75 * t;
          nodeIndia.style.opacity = `${t}`;
          nodeIndia.setAttribute('transform', `translate(705, 248) scale(${s})`);
        } else {
          nodeIndia.style.opacity = '1';
          nodeIndia.setAttribute('transform', 'translate(705, 248) scale(1)');
        }
      }

      // ── STAGE 1: Journey 1 — India -> Middle East (0.05 - 0.15) ──
      updateJourney(routeInMe, partInMe, progress, 0.05, 0.14, 0.17);
      updateNode(nodeMe, 595, 205, progress, 0.12, 0.15, 0.18);

      // ── STAGE 2: Journey 2 — Middle East -> Europe (0.16 - 0.26) ──
      updateJourney(routeMeEu, partMeEu, progress, 0.16, 0.24, 0.27);
      updateNode(nodeEurope, 515, 135, progress, 0.22, 0.25, 0.28);

      // ── STAGE 3: Journey 3 — India -> Southeast Asia (0.27 - 0.37) ──
      updateJourney(routeInSea, partInSea, progress, 0.27, 0.35, 0.38);
      updateNode(nodeSea, 795, 295, progress, 0.33, 0.36, 0.39);

      // ── STAGE 4: Journey 4 — India -> Africa (0.38 - 0.48) ──
      updateJourney(routeInAf, partInAf, progress, 0.38, 0.46, 0.49);
      updateNode(nodeAf, 585, 320, progress, 0.44, 0.47, 0.50);

      // Cargo ship along maritime lane
      if (ship && routeInAf) {
        const lenAf = getRouteLen(routeInAf);
        const tAf = mapRange(progress, 0.38, 0.46);
        if (tAf > 0 && tAf <= 1) {
          const d = tAf * lenAf;
          const pt = getSafePointAtLength(routeInAf, d);
          const ptNext = getSafePointAtLength(routeInAf, Math.min(lenAf, d + 2));
          const angle = Math.atan2(ptNext.y - pt.y, ptNext.x - pt.x) * (180 / Math.PI);
          ship.setAttribute('transform', `translate(${pt.x}, ${pt.y}) rotate(${angle}) scale(0.95)`);
          ship.setAttribute('opacity', '1');
        } else if (progress > 0.46) {
          const pt = getSafePointAtLength(routeInAf, lenAf);
          ship.setAttribute('transform', `translate(${pt.x}, ${pt.y}) scale(0.85)`);
          ship.setAttribute('opacity', '0.75');
        } else {
          ship.setAttribute('opacity', '0');
        }
      }

      // ── STAGE 5: Journey 5 — India -> East Asia (0.49 - 0.59) ──
      updateJourney(routeInEa, partInEa, progress, 0.49, 0.57, 0.60);
      updateNode(nodeEa, 825, 195, progress, 0.55, 0.58, 0.61);

      // ── STAGE 6: Journey 6 — Europe -> North America (0.60 - 0.70) ──
      updateJourney(routeEuNa, partEuNa, progress, 0.60, 0.68, 0.71);
      updateNode(nodeNa, 285, 180, progress, 0.66, 0.69, 0.72);

      // Aircraft indicator along transatlantic route
      if (aircraft && routeEuNa) {
        const lenEuNa = getRouteLen(routeEuNa);
        const tEuNa = mapRange(progress, 0.60, 0.68);
        if (tEuNa > 0 && tEuNa <= 1) {
          const d = tEuNa * lenEuNa;
          const pt = getSafePointAtLength(routeEuNa, d);
          const ptNext = getSafePointAtLength(routeEuNa, Math.min(lenEuNa, d + 2));
          const angle = Math.atan2(ptNext.y - pt.y, ptNext.x - pt.x) * (180 / Math.PI) + 90;
          aircraft.setAttribute('transform', `translate(${pt.x}, ${pt.y}) rotate(${angle}) scale(0.95)`);
          aircraft.setAttribute('opacity', '1');
        } else if (progress > 0.68) {
          const pt = getSafePointAtLength(routeEuNa, lenEuNa);
          aircraft.setAttribute('transform', `translate(${pt.x}, ${pt.y}) rotate(-90) scale(0.9)`);
          aircraft.setAttribute('opacity', '0.75');
        } else {
          aircraft.setAttribute('opacity', '0');
        }
      }

      // ── STAGE 7: Journey 7 — North America -> South America (0.71 - 0.81) [NEW DESTINATION 1] ──
      updateJourney(routeNaSa, partNaSa, progress, 0.71, 0.79, 0.82);
      updateNode(nodeSa, 355, 350, progress, 0.77, 0.80, 0.83);

      // ── STAGE 8: Journey 8 — Southeast Asia -> Australia (0.82 - 0.91) [NEW DESTINATION 2] ──
      updateJourney(routeSeaAus, partSeaAus, progress, 0.82, 0.89, 0.92);
      updateNode(nodeAus, 875, 380, progress, 0.87, 0.90, 0.93);

      // ── STAGE 9: Maritime Connecting Loop & Complete Global Network (0.90 - 1.00) ──
      if (routeLoop) {
        const lenLoop = getRouteLen(routeLoop);
        const tLoop = mapRange(progress, 0.90, 0.98);
        routeLoop.style.strokeDashoffset = `${lenLoop * (1 - tLoop)}`;
        routeLoop.style.opacity = progress >= 0.90 ? '0.55' : '0.1';
      }

      // Synchronous subtle glow across all nodes in final network
      if (progress >= 0.94) {
        const pPulse = mapRange(progress, 0.94, 1.00);
        allNodeRings.forEach(ring => {
          ring.style.opacity = `${0.75 + 0.25 * pPulse}`;
        });
      }

      // ── STAGE 10: Typography Scrubbing ──
      if (textGlobalTrade) {
        const pText1 = mapRange(progress, 0.04, 0.20);
        textGlobalTrade.style.opacity = 0.65 + 0.35 * pText1;
      }
      if (textTomorrow) {
        const shouldGlow = progress > 0.35 && progress < 0.95;
        if (shouldGlow !== hadGlow) {
          hadGlow = shouldGlow;
          textTomorrow.style.filter = shouldGlow ? 'drop-shadow(0 0 12px rgba(229, 169, 60, 0.75))' : 'none';
        }
      }
      if (textSubtitle) {
        const pText3 = mapRange(progress, 0.75, 0.98);
        textSubtitle.style.opacity = 0.3 + 0.7 * pText3;
      }
    } catch (err) {
      console.warn('[GlobalTrade] Animation frame warning:', err);
    }
  }

  // Zero reflow scroll listener (reads cached document dimensions)
  function onScroll() {
    if (rafId) return;

    rafId = requestAnimationFrame(() => {
      rafId = null;
      try {
        const scrollY = window.scrollY || window.pageYOffset || 0;
        const scrolled = scrollY - (cachedSpaceTop - cachedStickyTop);
        const progress = clamp(scrolled / cachedTotalDistance, 0, 1);

        updateScrubbedAnimation(progress);
      } catch (e) {
        console.warn('[GlobalTrade] Scroll error:', e);
      }
    });
  }

  // Initial calculation on load
  onScroll();

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    updateScrollDimensions();
    measureAndInitRoutes();
    lastProgress = -1;
    onScroll();
  }, { passive: true });

  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      updateScrollDimensions();
      measureAndInitRoutes();
      lastProgress = -1;
      onScroll();
    }, 150);
  });
}

// -------------------------------------------------------------------
// 10. Home Link Navigation — Smoothly scrolls to the absolute top (0, 0)
// -------------------------------------------------------------------
function initHomeScrollToTop() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href="#hero"], a[href="#top"], .site-nav__brand');
    if (!link) return;

    // Do not interfere with special keys (Ctrl/Cmd/Shift click or right/middle click)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

    e.preventDefault();

    // Smoothly scroll all the way to the very first top of the page
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });

    if (window.history && window.history.pushState) {
      window.history.pushState(null, '', window.location.pathname + window.location.search);
    }
  });
}

// -------------------------------------------------------------------
// 11. Unified Application Lifecycle Initializer
// -------------------------------------------------------------------
function initApp() {
  initCopyrightYear();
  initStickyNav();
  initMobileMenu();
  initHomeScrollToTop();
  initQuoteModal();
  initWhatsAppForms();
  initCounters();
  initImageReveals();
  initShipHover();
  initGlobalTradeScrollAnimation();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

