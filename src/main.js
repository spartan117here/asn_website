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
const siteNav = document.getElementById('siteNav');
window.addEventListener('scroll', () => {
  if (window.scrollY > 20) {
    siteNav?.classList.add('site-nav--scrolled');
  } else {
    siteNav?.classList.remove('site-nav--scrolled');
  }
});

// -------------------------------------------------------------------
// 2. Mobile Menu & Products Dropdown Interaction
// -------------------------------------------------------------------
const menuToggle = document.getElementById('menuToggle');
const navMenu = document.getElementById('navMenu');
const navDropdown = document.querySelector('.nav-dropdown');
const dropdownToggle = navDropdown?.querySelector('.nav-link--dropdown');

function resetMobileProducts() {
  if (navDropdown) {
    navDropdown.classList.remove('nav-dropdown--open');
    const chevron = navDropdown.querySelector('.dropdown-chevron');
    if (chevron) chevron.style.transform = '';
  }
}

if (menuToggle && navMenu) {
  menuToggle.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('site-nav__links--open');
    menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    
    // Always reset products submenu to closed state when opening or closing hamburger
    resetMobileProducts();

    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
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
      navMenu.classList.remove('site-nav__links--open');
      menuToggle.setAttribute('aria-expanded', 'false');
      resetMobileProducts();
      document.body.style.overflow = '';
    });
  });

  // Reset if resized back to desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      navMenu.classList.remove('site-nav__links--open');
      menuToggle.setAttribute('aria-expanded', 'false');
      resetMobileProducts();
      document.body.style.overflow = '';
    }
  });
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

// Form Submission Simulation
quoteForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const formData = new FormData(quoteForm);
  const name = formData.get('name');

  if (formFeedback) {
    formFeedback.className = 'form-feedback form-feedback--success';
    formFeedback.textContent = `Thank you, ${name}! Your trade inquiry has been received. Our export specialist will contact you shortly.`;
  }

  quoteForm.reset();
  setTimeout(() => {
    closeModal();
  }, 3500);
});

// -------------------------------------------------------------------
// 3b. Inline Contact Form (in the Contact Section)
// -------------------------------------------------------------------
const contactForm = document.getElementById('contactForm');
const contactFormFeedback = document.getElementById('contactFormFeedback');

contactForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const formData = new FormData(contactForm);
  const name = formData.get('name');

  if (contactFormFeedback) {
    contactFormFeedback.className = 'contact-form-feedback contact-form-feedback--success';
    contactFormFeedback.textContent = `Thank you, ${name}! We've received your enquiry and will get back to you within one business day.`;
  }

  contactForm.reset();
  setTimeout(() => {
    if (contactFormFeedback) contactFormFeedback.textContent = '';
  }, 5000);
});


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

  // 1. Hero background photo entrance (immediate on load)
  const heroImg = document.querySelector('.hero__photo-img');
  if (heroImg) {
    gsap.fromTo(
      heroImg,
      { scale: 1.08, opacity: 0.8 },
      { scale: 1.0, opacity: 1.0, duration: 1.3, ease: 'power2.out' }
    );
  }

  // 2. Individual photographic image containers (ScrollTrigger at ~85% viewport)
  const singleRevealSelectors = [
    '.about-card-visual__wrapper',
    '.about-quote-card__image-box',
    '.why-choose__globe-bg',
    '.cta-banner__bg-container'
  ];

  singleRevealSelectors.forEach((selector) => {
    const container = document.querySelector(selector);
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

  // Target logistics indicators
  const aircraft = svg.querySelector('#aircraft-indicator');
  const ship = svg.querySelector('#ship-indicator');

  // Target typography
  const textGlobalTrade = card?.querySelector('.watermark-script span');
  const textTomorrow = card?.querySelector('.watermark-script em');
  const textSubtitle = card?.querySelector('.watermark-sub');

  // Pre-calculate path total lengths
  const routes = [
    { el: routeInMe, start: 0.08, end: 0.25 },
    { el: routeMeEu, start: 0.25, end: 0.42 },
    { el: routeInSea, start: 0.44, end: 0.58 },
    { el: routeInAf, start: 0.56, end: 0.70 },
    { el: routeInEa, start: 0.68, end: 0.80 },
    { el: routeEuNa, start: 0.74, end: 0.90 },
    { el: routeLoop, start: 0.82, end: 0.98 }
  ];

  routes.forEach(r => {
    if (r.el) {
      try {
        const len = r.el.getTotalLength() || 100;
        r.len = len;
        r.el.style.strokeDasharray = `${len}`;
        r.el.style.strokeDashoffset = `${len}`;
      } catch (err) {
        r.len = 100;
      }
    }
  });

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function mapRange(val, inMin, inMax) {
    return clamp((val - inMin) / (inMax - inMin), 0, 1);
  }

  // Animation frame scrubbing
  let rafId = null;
  let lastProgress = -1;

  function updateScrubbedAnimation(progress) {
    if (Math.abs(progress - lastProgress) < 0.0005) return;
    lastProgress = progress;

    // 1. India Node (origin hub): activates early 0.02 - 0.12
    if (nodeIndia) {
      const pIndia = mapRange(progress, 0.02, 0.12);
      nodeIndia.style.opacity = pIndia;
      const s = 0.5 + 0.5 * pIndia;
      nodeIndia.setAttribute('transform', `translate(705, 248) scale(${s})`);
    }

    // 2. Route 1: India -> Middle East (0.08 - 0.25)
    const tInMe = mapRange(progress, 0.08, 0.25);
    if (routeInMe && routes[0].len) {
      routeInMe.style.strokeDashoffset = routes[0].len * (1 - tInMe);
      routeInMe.style.opacity = progress >= 0.08 ? '0.85' : '0.15';
    }
    if (partInMe && routeInMe && routes[0].len) {
      if (tInMe > 0 && tInMe < 1) {
        const pt = routeInMe.getPointAtLength(tInMe * routes[0].len);
        partInMe.setAttribute('cx', pt.x);
        partInMe.setAttribute('cy', pt.y);
        partInMe.setAttribute('opacity', '1');
      } else {
        partInMe.setAttribute('opacity', '0');
      }
    }

    // 3. Middle East Node: activates 0.22 - 0.30
    if (nodeMe) {
      const pMe = mapRange(progress, 0.22, 0.30);
      nodeMe.style.opacity = pMe;
      const s = 0.5 + 0.5 * pMe;
      nodeMe.setAttribute('transform', `translate(595, 205) scale(${s})`);
    }

    // 4. Route 2: Middle East -> Europe (0.25 - 0.42)
    const tMeEu = mapRange(progress, 0.25, 0.42);
    if (routeMeEu && routes[1].len) {
      routeMeEu.style.strokeDashoffset = routes[1].len * (1 - tMeEu);
      routeMeEu.style.opacity = progress >= 0.25 ? '0.85' : '0.15';
    }
    if (partMeEu && routeMeEu && routes[1].len) {
      if (tMeEu > 0 && tMeEu < 1) {
        const pt = routeMeEu.getPointAtLength(tMeEu * routes[1].len);
        partMeEu.setAttribute('cx', pt.x);
        partMeEu.setAttribute('cy', pt.y);
        partMeEu.setAttribute('opacity', '1');
      } else {
        partMeEu.setAttribute('opacity', '0');
      }
    }

    // 5. Europe Node: activates 0.38 - 0.48
    if (nodeEurope) {
      const pEu = mapRange(progress, 0.38, 0.48);
      nodeEurope.style.opacity = pEu;
      const s = 0.5 + 0.5 * pEu;
      nodeEurope.setAttribute('transform', `translate(515, 135) scale(${s})`);
    }

    // 6. Route 3: India -> Southeast Asia (0.44 - 0.58)
    const tInSea = mapRange(progress, 0.44, 0.58);
    if (routeInSea && routes[2].len) {
      routeInSea.style.strokeDashoffset = routes[2].len * (1 - tInSea);
      routeInSea.style.opacity = progress >= 0.44 ? '0.85' : '0.15';
    }
    if (partInSea && routeInSea && routes[2].len) {
      if (tInSea > 0 && tInSea < 1) {
        const pt = routeInSea.getPointAtLength(tInSea * routes[2].len);
        partInSea.setAttribute('cx', pt.x);
        partInSea.setAttribute('cy', pt.y);
        partInSea.setAttribute('opacity', '1');
      } else {
        partInSea.setAttribute('opacity', '0');
      }
    }

    // Southeast Asia Node: activates 0.52 - 0.60
    if (nodeSea) {
      const pSea = mapRange(progress, 0.52, 0.60);
      nodeSea.style.opacity = pSea;
      const s = 0.5 + 0.5 * pSea;
      nodeSea.setAttribute('transform', `translate(795, 295) scale(${s})`);
    }

    // 7. Route 4: India -> Africa (0.56 - 0.70)
    const tInAf = mapRange(progress, 0.56, 0.70);
    if (routeInAf && routes[3].len) {
      routeInAf.style.strokeDashoffset = routes[3].len * (1 - tInAf);
      routeInAf.style.opacity = progress >= 0.56 ? '0.85' : '0.15';
    }
    if (partInAf && routeInAf && routes[3].len) {
      if (tInAf > 0 && tInAf < 1) {
        const pt = routeInAf.getPointAtLength(tInAf * routes[3].len);
        partInAf.setAttribute('cx', pt.x);
        partInAf.setAttribute('cy', pt.y);
        partInAf.setAttribute('opacity', '1');
      } else {
        partInAf.setAttribute('opacity', '0');
      }
    }

    // Ship indicator along India -> Africa / maritime lane (0.56 - 0.72)
    if (ship && routeInAf && routes[3].len) {
      if (tInAf > 0 && tInAf <= 1) {
        const d = tInAf * routes[3].len;
        const pt = routeInAf.getPointAtLength(d);
        const ptNext = routeInAf.getPointAtLength(Math.min(routes[3].len, d + 2));
        const angle = Math.atan2(ptNext.y - pt.y, ptNext.x - pt.x) * (180 / Math.PI);
        ship.setAttribute('transform', `translate(${pt.x}, ${pt.y}) rotate(${angle}) scale(0.9)`);
        ship.setAttribute('opacity', '1');
      } else if (progress > 0.70) {
        const pt = routeInAf.getPointAtLength(routes[3].len);
        ship.setAttribute('transform', `translate(${pt.x}, ${pt.y}) scale(0.85)`);
        ship.setAttribute('opacity', '0.75');
      } else {
        ship.setAttribute('opacity', '0');
      }
    }

    // Africa Node: activates 0.64 - 0.72
    if (nodeAf) {
      const pAf = mapRange(progress, 0.64, 0.72);
      nodeAf.style.opacity = pAf;
      const s = 0.5 + 0.5 * pAf;
      nodeAf.setAttribute('transform', `translate(585, 320) scale(${s})`);
    }

    // 8. Route 5: India -> East Asia (0.68 - 0.80)
    const tInEa = mapRange(progress, 0.68, 0.80);
    if (routeInEa && routes[4].len) {
      routeInEa.style.strokeDashoffset = routes[4].len * (1 - tInEa);
      routeInEa.style.opacity = progress >= 0.68 ? '0.85' : '0.15';
    }
    if (partInEa && routeInEa && routes[4].len) {
      if (tInEa > 0 && tInEa < 1) {
        const pt = routeInEa.getPointAtLength(tInEa * routes[4].len);
        partInEa.setAttribute('cx', pt.x);
        partInEa.setAttribute('cy', pt.y);
        partInEa.setAttribute('opacity', '1');
      } else {
        partInEa.setAttribute('opacity', '0');
      }
    }

    // East Asia Node: activates 0.74 - 0.82
    if (nodeEa) {
      const pEa = mapRange(progress, 0.74, 0.82);
      nodeEa.style.opacity = pEa;
      const s = 0.5 + 0.5 * pEa;
      nodeEa.setAttribute('transform', `translate(825, 195) scale(${s})`);
    }

    // 9. Route 6: Europe -> North America (0.74 - 0.90)
    const tEuNa = mapRange(progress, 0.74, 0.90);
    if (routeEuNa && routes[5].len) {
      routeEuNa.style.strokeDashoffset = routes[5].len * (1 - tEuNa);
      routeEuNa.style.opacity = progress >= 0.74 ? '0.85' : '0.15';
    }

    // Aircraft indicator along transatlantic route (0.74 - 0.90)
    if (aircraft && routeEuNa && routes[5].len) {
      if (tEuNa > 0 && tEuNa <= 1) {
        const d = tEuNa * routes[5].len;
        const pt = routeEuNa.getPointAtLength(d);
        const ptNext = routeEuNa.getPointAtLength(Math.min(routes[5].len, d + 2));
        const angle = Math.atan2(ptNext.y - pt.y, ptNext.x - pt.x) * (180 / Math.PI) + 90;
        aircraft.setAttribute('transform', `translate(${pt.x}, ${pt.y}) rotate(${angle}) scale(0.95)`);
        aircraft.setAttribute('opacity', '1');
      } else if (progress > 0.90) {
        const pt = routeEuNa.getPointAtLength(routes[5].len);
        aircraft.setAttribute('transform', `translate(${pt.x}, ${pt.y}) rotate(-90) scale(0.9)`);
        aircraft.setAttribute('opacity', '0.75');
      } else {
        aircraft.setAttribute('opacity', '0');
      }
    }

    // North America Node: activates 0.82 - 0.90
    if (nodeNa) {
      const pNa = mapRange(progress, 0.82, 0.90);
      nodeNa.style.opacity = pNa;
      const s = 0.5 + 0.5 * pNa;
      nodeNa.setAttribute('transform', `translate(285, 180) scale(${s})`);
    }

    // 10. Route 7: Maritime Connecting Loop (0.82 - 0.98)
    const tLoop = mapRange(progress, 0.82, 0.98);
    if (routeLoop && routes[6].len) {
      routeLoop.style.strokeDashoffset = routes[6].len * (1 - tLoop);
      routeLoop.style.opacity = progress >= 0.82 ? '0.45' : '0.1';
    }

    // 11. Subtle Typography Enhancements tied to scroll scrubbing
    if (textGlobalTrade) {
      const pText1 = mapRange(progress, 0.05, 0.22);
      textGlobalTrade.style.opacity = 0.65 + 0.35 * pText1;
    }
    if (textTomorrow) {
      const pText2 = mapRange(progress, 0.30, 0.55);
      textTomorrow.style.filter = pText2 > 0.5 ? 'drop-shadow(0 0 10px rgba(229, 169, 60, 0.6))' : 'none';
    }
    if (textSubtitle) {
      const pText3 = mapRange(progress, 0.65, 0.95);
      textSubtitle.style.opacity = 0.3 + 0.7 * pText3;
    }
  }

  function onScroll() {
    if (window.innerWidth > 768) return;
    if (rafId) return;

    rafId = requestAnimationFrame(() => {
      rafId = null;
      const rect = scrollSpace.getBoundingClientRect();
      const stickyTop = 76;
      const totalDistance = scrollSpace.offsetHeight - (window.innerHeight - stickyTop);
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
    if (window.innerWidth <= 768) {
      routes.forEach(r => {
        if (r.el) {
          try {
            r.len = r.el.getTotalLength() || 100;
          } catch (e) {}
        }
      });
      lastProgress = -1;
      onScroll();
    }
  }, { passive: true });
}

// Initialize Global Trade Scroll Animation
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGlobalTradeScrollAnimation);
} else {
  initGlobalTradeScrollAnimation();
}






