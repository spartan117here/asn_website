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
});

gsap.registerPlugin(ScrollTrigger);

// Update Copyright Year
const yearEl = document.getElementById('year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

// -------------------------------------------------------------------
// 1. Sticky Navigation Bar with Elevation on Scroll
// -------------------------------------------------------------------
// 1. Sticky/Fixed Navigation Bar with Elevation on Scroll
// -------------------------------------------------------------------
const siteNav = document.getElementById('siteNav');
window.addEventListener('scroll', () => {
  if (window.scrollY > 20) {
    siteNav?.classList.add('site-nav--scrolled');
  } else {
    siteNav?.classList.remove('site-nav--scrolled');
  }
}, { passive: true });

// -------------------------------------------------------------------
// 2. Mobile Menu & Products Dropdown Interaction (Mobile-Safe Scroll Lock)
// -------------------------------------------------------------------
const menuToggle = document.getElementById('menuToggle');
const navMenu = document.getElementById('navMenu');
const navDropdown = document.querySelector('.nav-dropdown');
const dropdownToggle = navDropdown?.querySelector('.nav-link--dropdown');

let isMobileMenuOpen = false;
let savedScrollY = 0;

function resetMobileProducts() {
  if (navDropdown) {
    navDropdown.classList.remove('nav-dropdown--open');
    const chevron = navDropdown.querySelector('.dropdown-chevron');
    if (chevron) chevron.style.transform = '';
  }
}

// Touch event handler to prevent background scroll without moving window.scrollY
function preventBackgroundScroll(e) {
  if (navMenu && navMenu.contains(e.target)) {
    return; // Allow touch scrolling inside the mobile navigation menu panel
  }
  e.preventDefault();
}

function openMobileMenu() {
  isMobileMenuOpen = true;
  savedScrollY = window.scrollY || window.pageYOffset || 0;

  navMenu?.classList.add('site-nav__links--open');
  menuToggle?.classList.add('menu-toggle--open');
  menuToggle?.setAttribute('aria-expanded', 'true');
  siteNav?.classList.add('site-nav--menu-open');
  document.body.classList.add('mobile-nav-locked');

  resetMobileProducts();
  window.addEventListener('touchmove', preventBackgroundScroll, { passive: false });
}

function closeMobileMenu() {
  if (!isMobileMenuOpen) return;
  isMobileMenuOpen = false;

  navMenu?.classList.remove('site-nav__links--open');
  menuToggle?.classList.remove('menu-toggle--open');
  menuToggle?.setAttribute('aria-expanded', 'false');
  siteNav?.classList.remove('site-nav--menu-open');
  document.body.classList.remove('mobile-nav-locked');

  window.removeEventListener('touchmove', preventBackgroundScroll);
  resetMobileProducts();

  // Ensure scroll position remains exactly where the user was
  if (typeof savedScrollY === 'number') {
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

if (menuToggle && navMenu) {
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
// 3. Interactive Quote / Contact Modal
// -------------------------------------------------------------------
const quoteModal = document.getElementById('quoteModal');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalClose = document.getElementById('modalClose');
const quoteForm = document.getElementById('quoteForm');
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

// ===================================================================
// 3. Professional WhatsApp Business Enquiry Submission
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
    let opened = false;
    try {
      const win = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      if (win) {
        opened = true;
        win.focus();
      }
    } catch (err) {
      opened = false;
    }

    // Display professional handoff confirmation (Do not claim that website sent it)
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

// Initialize WhatsApp submission for Contact Section Form
const contactForm = document.getElementById('contactForm');
const contactFormFeedback = document.getElementById('contactFormFeedback');
setupWhatsAppForm(contactForm, contactFormFeedback, false);

// Initialize WhatsApp submission for Quote Modal Form
setupWhatsAppForm(quoteForm, formFeedback, true);


// -------------------------------------------------------------------
const statNumbers = document.querySelectorAll('.stat-card__number');

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
}

// -------------------------------------------------------------------
// 5. GSAP Premium Image Reveals & Entrance Animations
// -------------------------------------------------------------------
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReducedMotion && typeof gsap !== 'undefined') {
  // Hero text subtle entrance
  gsap.from('.hero__title', { y: 15, duration: 0.7, ease: 'power2.out' });
  gsap.from('.hero__lead', { y: 10, duration: 0.7, delay: 0.1, ease: 'power2.out' });
  gsap.from('.hero__buttons', { y: 10, duration: 0.6, delay: 0.2, ease: 'power2.out' });

  // 1. Hero background photo renders immediately at 100% native resolution without scale/opacity distortion

  // 2. Individual photographic image containers (ScrollTrigger at ~85% viewport)
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
            duration: 1.0,
            ease: 'power3.out'
          });
          if (img) {
            gsap.to(img, {
              scale: 1.0,
              duration: 1.0,
              ease: 'power3.out'
            });
          }
        }
      });
    });
  });

  // 3. Products Grid: Signature Focus Pull Reveal
  // Optical rack-focus: blurred & desaturated at 92% scale racking into sharp, vibrant 100% focus
  // Completely free of directional translation (x/y: 0) across all devices
  const productCards = gsap.utils.toArray('.products-grid .product-card');

  if (productCards.length > 0) {
    const prodImgs = gsap.utils.toArray('.products-grid .product-card__thumb img');
    const prodTitles = gsap.utils.toArray('.products-grid .product-card__title');

    // Initial setup: rack focus blur, gentle desaturation, optical contraction (92% scale)
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
        // Step 1: Optical rack-focus: blur and desaturation clear to razor sharpness
        gsap.to(prodImgs, {
          filter: 'blur(0px) grayscale(0%) brightness(1)',
          scale: 1.0,
          opacity: 1.0,
          duration: 0.85,
          stagger: 0.1,
          ease: 'power2.out',
          onComplete: () => {
            gsap.set(prodImgs, { clearProps: 'filter,transform,opacity' });
          }
        });

        // Step 2: Clean title fade in place (no directional translation)
        gsap.to(prodTitles, {
          opacity: 1,
          duration: 0.6,
          delay: 0.15,
          stagger: 0.1,
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
// 6. Ship & Shipping Motion Animation ("Connecting Businesses Across Borders" card)
// Desktop: Interactive hover cinemagraph (mouseenter / mouseleave)
// Mobile / Tablet: In-viewport auto-play via ScrollTrigger + touch tap
// -------------------------------------------------------------------
function initShipHover() {
  const shipImageBox = document.getElementById('shipImageBox');
  const shipImg = document.getElementById('shipImg') || document.querySelector('.about-quote-card__img');
  const shipWaterOverlay = document.getElementById('shipWaterOverlay');
  const shipWaterTrack = document.getElementById('shipWaterTrack');

  if (!shipImageBox || !shipImg) {
    console.warn('[ASN] Ship hover elements not found:', { shipImageBox, shipImg });
    return;
  }

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

    // Stop and reset water wave motion
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

    // Stop ship bobbing and smoothly ease back to static resting state
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
    // On desktop, mouse leave returns ship to resting state
    const isTouchOnly = window.matchMedia('(hover: none)').matches;
    if (!isTouchOnly) {
      stopShipAnimation();
    }
  });

  // Mobile / Tablet: Scroll-triggered auto-play so the animation is fully visible on touch devices
  ScrollTrigger.create({
    trigger: shipImageBox,
    start: 'top 85%',
    end: 'bottom 15%',
    onEnter: () => {
      const isMobile = window.innerWidth <= 768 || window.matchMedia('(hover: none)').matches;
      if (isMobile) {
        startShipAnimation();
      }
    },
    onLeave: () => {
      const isMobile = window.innerWidth <= 768 || window.matchMedia('(hover: none)').matches;
      if (isMobile) {
        stopShipAnimation();
      }
    },
    onEnterBack: () => {
      const isMobile = window.innerWidth <= 768 || window.matchMedia('(hover: none)').matches;
      if (isMobile) {
        startShipAnimation();
      }
    },
    onLeaveBack: () => {
      const isMobile = window.innerWidth <= 768 || window.matchMedia('(hover: none)').matches;
      if (isMobile) {
        stopShipAnimation();
      }
    }
  });

  // Touch tap interaction for touch devices
  shipImageBox.addEventListener('touchstart', () => {
    startShipAnimation();
  }, { passive: true });
}

// Initialize ship hover
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initShipHover);
} else {
  initShipHover();
}

// -------------------------------------------------------------------
// 7. Mobile-Only Scroll-Synchronized Global Trade Animation
// SCROLL POSITION = ANIMATION PROGRESS (Forward, Pause, Reverse Scrubbing)
// Strictly mobile only (<= 768px). Desktop remains 100% untouched.
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

  // Target SVG route elements
  const routeInMe = svg.querySelector('#route-in-me');
  const routeMeEu = svg.querySelector('#route-me-eu');
  const routeInSea = svg.querySelector('#route-in-sea');
  const routeInAf = svg.querySelector('#route-in-af');
  const routeInEa = svg.querySelector('#route-in-ea');
  const routeEuNa = svg.querySelector('#route-eu-na');
  const routeLoop = svg.querySelector('#route-loop');

  // Target nodes
  const nodeIndia = svg.querySelector('#node-india');
  const nodeMe = svg.querySelector('#node-me');
  const nodeEurope = svg.querySelector('#node-europe');
  const nodeSea = svg.querySelector('#node-sea');
  const nodeAf = svg.querySelector('#node-africa');
  const nodeEa = svg.querySelector('#node-ea');
  const nodeNa = svg.querySelector('#node-na');

  // Target particles
  const partInMe = svg.querySelector('#particle-in-me');
  const partMeEu = svg.querySelector('#particle-me-eu');
  const partInSea = svg.querySelector('#particle-in-sea');
  const partInAf = svg.querySelector('#particle-in-af');
  const partInEa = svg.querySelector('#particle-in-ea');
  const partEuNa = svg.querySelector('#particle-eu-na');

  // Target logistics indicators
  const aircraft = svg.querySelector('#aircraft-indicator');
  const ship = svg.querySelector('#ship-indicator');

  // Target typography
  const textGlobalTrade = card?.querySelector('.watermark-script span');
  const textTomorrow = card?.querySelector('.watermark-script em');
  const textSubtitle = card?.querySelector('.watermark-sub');

  const allRoutes = [routeInMe, routeMeEu, routeInSea, routeInAf, routeInEa, routeEuNa, routeLoop];
  const allParticles = [partInMe, partMeEu, partInSea, partInAf, partInEa, partEuNa];

  const routeLens = new Map();
  function getRouteLen(el) {
    if (!el) return 100;
    if (routeLens.has(el)) return routeLens.get(el);
    try {
      const l = el.getTotalLength();
      if (l && l > 0) {
        routeLens.set(el, l);
        return l;
      }
    } catch (e) {}
    return 100;
  }

  function measureAndInitRoutes() {
    routeLens.clear();
    allRoutes.forEach(r => {
      if (r) {
        try {
          const len = r.getTotalLength() || 100;
          routeLens.set(r, len);
          r.style.strokeDasharray = `${len}`;
          r.style.strokeDashoffset = `${len}`;
        } catch (e) {
          routeLens.set(r, 100);
        }
      }
    });
  }
  measureAndInitRoutes();

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
        const pt = route.getPointAtLength(t * len);
        particle.setAttribute('cx', pt.x);
        particle.setAttribute('cy', pt.y);
        particle.setAttribute('opacity', '1');
      } else if (t >= 1 && tDissolve && progress < tDissolve) {
        // Destination reached: sits at destination node before gentle dissolve
        const pt = route.getPointAtLength(len);
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

  function updateScrubbedAnimation(progress) {
    if (Math.abs(progress - lastProgress) < 0.0003) return;
    lastProgress = progress;

    // ── STAGE 0: Origin Node (India) Awakens (0.00 - 0.07) ──
    if (nodeIndia) {
      if (progress < 0.01) {
        nodeIndia.style.opacity = '0';
        nodeIndia.setAttribute('transform', 'translate(705, 248) scale(0.4)');
      } else if (progress < 0.07) {
        const t = mapRange(progress, 0.01, 0.07);
        const s = 0.4 + 0.75 * t; // 0.4 -> 1.15
        nodeIndia.style.opacity = `${t}`;
        nodeIndia.setAttribute('transform', `translate(705, 248) scale(${s})`);
      } else {
        nodeIndia.style.opacity = '1';
        nodeIndia.setAttribute('transform', 'translate(705, 248) scale(1)');
      }
    }

    // ── STAGE 1: Journey 1 — India -> Middle East (0.07 - 0.20) ──
    // Particle travels (705, 248) -> (595, 205). Middle East blooms (0.16 - 0.24).
    updateJourney(routeInMe, partInMe, progress, 0.07, 0.18, 0.22);
    updateNode(nodeMe, 595, 205, progress, 0.16, 0.20, 0.24);

    // ── STAGE 2: Journey 2 — Middle East -> Europe (0.22 - 0.35) ──
    // Particle travels (595, 205) -> (515, 135). Europe blooms (0.30 - 0.38).
    updateJourney(routeMeEu, partMeEu, progress, 0.22, 0.32, 0.36);
    updateNode(nodeEurope, 515, 135, progress, 0.30, 0.34, 0.38);

    // ── STAGE 3: Journey 3 — India -> Southeast Asia (0.36 - 0.49) ──
    // Particle travels (705, 248) -> (795, 295). SE Asia blooms (0.44 - 0.52).
    updateJourney(routeInSea, partInSea, progress, 0.36, 0.46, 0.50);
    updateNode(nodeSea, 795, 295, progress, 0.44, 0.48, 0.52);

    // ── STAGE 4: Journey 4 — India -> Africa (0.50 - 0.63) ──
    // Particle & cargo ship travel (705, 248) -> (585, 320). Africa blooms (0.58 - 0.66).
    updateJourney(routeInAf, partInAf, progress, 0.50, 0.60, 0.64);
    updateNode(nodeAf, 585, 320, progress, 0.58, 0.62, 0.66);

    // Cargo ship along maritime lane
    if (ship && routeInAf) {
      const lenAf = getRouteLen(routeInAf);
      const tAf = mapRange(progress, 0.50, 0.60);
      if (tAf > 0 && tAf <= 1) {
        const d = tAf * lenAf;
        const pt = routeInAf.getPointAtLength(d);
        const ptNext = routeInAf.getPointAtLength(Math.min(lenAf, d + 2));
        const angle = Math.atan2(ptNext.y - pt.y, ptNext.x - pt.x) * (180 / Math.PI);
        ship.setAttribute('transform', `translate(${pt.x}, ${pt.y}) rotate(${angle}) scale(0.95)`);
        ship.setAttribute('opacity', '1');
      } else if (progress > 0.60) {
        const pt = routeInAf.getPointAtLength(lenAf);
        ship.setAttribute('transform', `translate(${pt.x}, ${pt.y}) scale(0.85)`);
        ship.setAttribute('opacity', '0.75');
      } else {
        ship.setAttribute('opacity', '0');
      }
    }

    // ── STAGE 5: Journey 5 — India -> East Asia (0.64 - 0.76) ──
    // Particle travels (705, 248) -> (825, 195). East Asia blooms (0.71 - 0.79).
    updateJourney(routeInEa, partInEa, progress, 0.64, 0.73, 0.77);
    updateNode(nodeEa, 825, 195, progress, 0.71, 0.75, 0.79);

    // ── STAGE 6: Journey 6 — Europe -> North America (0.77 - 0.89) ──
    // Particle & aircraft travel transatlantic (515, 135) -> (285, 180). North America blooms (0.84 - 0.92).
    updateJourney(routeEuNa, partEuNa, progress, 0.77, 0.86, 0.90);
    updateNode(nodeNa, 285, 180, progress, 0.84, 0.88, 0.92);

    // Aircraft indicator along transatlantic route
    if (aircraft && routeEuNa) {
      const lenEuNa = getRouteLen(routeEuNa);
      const tEuNa = mapRange(progress, 0.77, 0.86);
      if (tEuNa > 0 && tEuNa <= 1) {
        const d = tEuNa * lenEuNa;
        const pt = routeEuNa.getPointAtLength(d);
        const ptNext = routeEuNa.getPointAtLength(Math.min(lenEuNa, d + 2));
        const angle = Math.atan2(ptNext.y - pt.y, ptNext.x - pt.x) * (180 / Math.PI) + 90;
        aircraft.setAttribute('transform', `translate(${pt.x}, ${pt.y}) rotate(${angle}) scale(0.95)`);
        aircraft.setAttribute('opacity', '1');
      } else if (progress > 0.86) {
        const pt = routeEuNa.getPointAtLength(lenEuNa);
        aircraft.setAttribute('transform', `translate(${pt.x}, ${pt.y}) rotate(-90) scale(0.9)`);
        aircraft.setAttribute('opacity', '0.75');
      } else {
        aircraft.setAttribute('opacity', '0');
      }
    }

    // ── STAGE 7: Maritime Connecting Loop & Complete Global Network (0.88 - 1.00) ──
    if (routeLoop) {
      const lenLoop = getRouteLen(routeLoop);
      const tLoop = mapRange(progress, 0.88, 0.98);
      routeLoop.style.strokeDashoffset = `${lenLoop * (1 - tLoop)}`;
      routeLoop.style.opacity = progress >= 0.88 ? '0.55' : '0.1';
    }

    // Synchronous subtle glow across all nodes in final network
    if (progress >= 0.94) {
      const pPulse = mapRange(progress, 0.94, 1.00);
      svg.querySelectorAll('.node-ring').forEach(ring => {
        ring.style.opacity = `${0.75 + 0.25 * pPulse}`;
      });
    }

    // ── STAGE 8: Typography Scrubbing ──
    if (textGlobalTrade) {
      const pText1 = mapRange(progress, 0.04, 0.24);
      textGlobalTrade.style.opacity = 0.65 + 0.35 * pText1;
    }
    if (textTomorrow) {
      const pText2 = mapRange(progress, 0.30, 0.65);
      textTomorrow.style.filter = pText2 > 0.5 ? 'drop-shadow(0 0 12px rgba(229, 169, 60, 0.75))' : 'none';
    }
    if (textSubtitle) {
      const pText3 = mapRange(progress, 0.70, 0.96);
      textSubtitle.style.opacity = 0.3 + 0.7 * pText3;
    }
  }

  function onScroll() {
    if (rafId) return;

    rafId = requestAnimationFrame(() => {
      rafId = null;
      const rect = scrollSpace.getBoundingClientRect();
      const isMobile = window.innerWidth <= 768;
      const stickyTop = isMobile ? 76 : 96;
      const cardHeight = card?.offsetHeight || (isMobile ? 360 : 480);
      const totalDistance = scrollSpace.offsetHeight - cardHeight;
      if (totalDistance <= 0) return;

      const scrolled = -rect.top + stickyTop;
      let progress = scrolled / totalDistance;
      progress = clamp(progress, 0, 1);

      updateScrubbedAnimation(progress);
    });
  }

  // Initial calculation on load
  onScroll();

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    measureAndInitRoutes();
    lastProgress = -1;
    onScroll();
  }, { passive: true });
}

// Initialize Global Trade Scroll Animation
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGlobalTradeScrollAnimation);
} else {
  initGlobalTradeScrollAnimation();
}






