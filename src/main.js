import { gsap } from 'gsap';

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
  if (window.scrollY > 40) {
    siteNav?.classList.add('site-nav--scrolled');
  } else {
    siteNav?.classList.remove('site-nav--scrolled');
  }
});

// -------------------------------------------------------------------
// 2. Mobile Menu Toggle
// -------------------------------------------------------------------
const menuToggle = document.getElementById('menuToggle');
const navMenu = document.getElementById('navMenu');

if (menuToggle && navMenu) {
  menuToggle.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('site-nav__links--open');
    menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  // Close menu on navigation click
  navMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('site-nav__links--open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
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
// 4. Animated Number Counters for Stats
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
      { threshold: 0.2 }
    );
    observer.observe(whyChooseSection);
  }
}

// -------------------------------------------------------------------
// 5. GSAP Entrance Animations for Polish
// -------------------------------------------------------------------
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReducedMotion && typeof gsap !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    gsap.from('.hero__title', { y: 20, duration: 0.7, ease: 'power2.out' });
    gsap.from('.hero__lead', { y: 15, duration: 0.7, delay: 0.1, ease: 'power2.out' });
    gsap.from('.hero__buttons', { y: 15, duration: 0.6, delay: 0.2, ease: 'power2.out' });
  });
}

