/**
 * BLACK. - Luxury Editorial & Agency Showcase
 * Interactive Presentation Deck & Continuous Scroll Engine
 */

// Global State
const state = {
  currentSlide: 0,
  totalSlides: 10,
  viewMode: 'scroll', // 'deck' or 'scroll'
  isAudioEnabled: false,
  isAutoPlay: false,
  autoPlayTimer: null,
  autoPlayDuration: 7000,
  audioContext: null,
  mouse: { x: window.innerWidth / 2, y: window.innerHeight / 2, targetX: window.innerWidth / 2, targetY: window.innerHeight / 2 },
  isLiveTimeMode: false,
};

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

// Slide Metadata for Modals and Overview
const slideData = [
  {
    index: 0,
    number: "01",
    tag: "Services",
    title: "Our Services.",
    subtitle: "Acoustic Engineering & Minimalist Photography",
    desc: "Crafting monochrome brand identities, avant-garde sonic products, and cinematic visual narratives with pure brutalist precision.",
    image: "assets/sand_dunes.jpg",
    details: {
      category: "Creative Services & Production",
      client: "Global Editorial & Luxury Tech",
      scope: ["Acoustic Identity", "Editorial Photography", "Exhibition Scenography", "Minimalist Industrial Design"],
      stats: { "Global Accolades": "24", "Sound Labs": "3", "Publications": "40+" }
    }
  },
  {
    index: 1,
    number: "02",
    tag: "Philosophy",
    title: "Our Company Mission.",
    subtitle: "Purity of Contrast. Uncompromising Elegance.",
    desc: "To strip away the non-essential until only raw form, structural light, and commanding dark architecture remain.",
    image: "assets/mission_woman.jpg",
    details: {
      category: "Vision & Strategic Pillars",
      client: "Institutional Ethos",
      scope: ["Monochrome Hegemony", "Sensory Restraint", "Architectural Typography", "Bespoke Production"],
      stats: { "Retention Rate": "99.4%", "Projects Realized": "180+", "Design Patents": "14" }
    }
  },
  {
    index: 2,
    number: "03",
    tag: "Project 01",
    title: "Botanical Synthesis & Kinetic Geometry",
    subtitle: "A curated interplay of organic flora, haute couture and track cycling.",
    desc: "An exploration into the juxtaposition of delicate botanical textures against industrial carbon-fiber speed and avant-garde millinery.",
    image: "assets/bicycle.jpg",
    details: {
      category: "Experimental Creative Direction",
      client: "Atelier Veloce x Haute Botanica",
      scope: ["High-speed Track Frame", "Haute Couture Headpiece", "Tactile Studio Scenography"],
      stats: { "Weight": "6.2 kg", "Couture Pieces": "12", "Exhibition": "Milan Triennale" }
    }
  },
  {
    index: 3,
    number: "04",
    tag: "Project 02",
    title: "Soundform Zero: Studio Acoustics",
    subtitle: "Floating matte wireless acoustic transducers with bespoke rim illumination.",
    desc: "Engineered with 45mm neodymium drivers suspended in acoustic titanium chambers. Sound stripped to its purest spatial frequency.",
    image: "assets/headphones.jpg",
    details: {
      category: "Industrial Acoustic Design",
      client: "Black. Acoustics Lab",
      scope: ["Spatial Titanium Enclosure", "Glow-Rim Capacitive Touch", "Sub-bass Resonance Chamber"],
      stats: { "Frequency Response": "4Hz - 48kHz", "Distortion": "<0.01% THD", "Battery Life": "48 Hours" }
    }
  },
  {
    index: 4,
    number: "05",
    tag: "Leadership",
    title: "Miguel S Hanskin.",
    subtitle: "Chief Executive Officer & Head of Strategic Direction",
    desc: "Leading the global creative vision of Black. Hanskin pairs architectural discipline with avant-garde product strategies for the world's most discerning brands.",
    image: "assets/miguel.jpg",
    details: {
      category: "Executive Board",
      role: "Chief Executive Officer",
      tenure: "Founding Partner (2018 - Present)",
      quote: "True luxury is not the presence of decoration, but the absolute confidence of its absence.",
      stats: { "Visionary Index": "Top 100", "Keynotes": "32", "Advisory Seats": "6" }
    }
  },
  {
    index: 5,
    number: "06",
    tag: "Leadership",
    title: "Claudine Blevins.",
    subtitle: "Managing Director & Executive Creative Producer",
    desc: "Championing high-contrast editorial photography and cinematic branding across Paris, Tokyo, and New York. Founder of the Black. Photography Fellowship.",
    image: "assets/claudine.jpg",
    details: {
      category: "Executive Board",
      role: "Executive Creative Producer",
      tenure: "Managing Director",
      quote: "Shadow is not merely the negation of light; it is the sculptress that bestows form upon reality.",
      stats: { "Covers Shot": "88", "Fellows Mentored": "140", "Cannes Lions": "7" }
    }
  },
  {
    index: 6,
    number: "07",
    tag: "Leadership",
    title: "Stephen S Thompson.",
    subtitle: "Chief Technology Officer & Acoustic Architect",
    desc: "Pioneering spatial audio algorithms, hardware integration, and interactive digital interfaces for the next generation of sensory tech.",
    image: "assets/stephen.jpg",
    details: {
      category: "Executive Board",
      role: "Chief Technology Officer",
      tenure: "Acoustic Architect",
      quote: "When audio becomes tactile, interface dissolves into pure intuition.",
      stats: { "Patents Filed": "19", "Audio Engines": "5", "Publications": "IEEE 2024" }
    }
  },
  {
    index: 7,
    number: "08",
    tag: "Design Studio",
    title: "John B Thompson & James T Campos.",
    subtitle: "Principal Graphic Designers & Typography Directors",
    desc: "Curating bespoke typographic systems, brutalist spatial graphics, and monochrome print editions from our flagship industrial atelier.",
    image: "assets/john.jpg",
    details: {
      category: "Creative Direction & Typography",
      team: "John B Thompson (Visual Identity) & James T Campos (Spatial Systems)",
      scope: ["Custom Type Foundry", "Exhibition Monoliths", "Luxury Book Publishing"],
      stats: { "Typefaces Published": "18", "TDC Awards": "9", "Monographs": "6" }
    }
  },
  {
    index: 8,
    number: "09",
    tag: "Creative Roster",
    title: "Mel, Dana & Collen.",
    subtitle: "Photographer, Interior Designer & Haute Fashion Model",
    desc: "A multidisciplinary tri-collective pushing tactile material design, interior architecture, and wearable micro-tech interfaces.",
    image: "assets/smartwatch.jpg",
    details: {
      category: "Multidisciplinary Talent",
      members: [
        { name: "Mel R Gavin", role: "Photographer", img: "assets/mel.jpg" },
        { name: "Dana J Garcia", role: "Interior Designer", img: "assets/dana.jpg" },
        { name: "Collen J Grimes", role: "Haute Fashion Model", img: "assets/collen.jpg" }
      ],
      hardware: "Chronograph Zero: Sapphire curved AMOLED wearable edge interface.",
      stats: { "Editorial Shoots": "240+", "Interior Spaces": "35", "Runway Shows": "90+" }
    }
  },
  {
    index: 9,
    number: "10",
    tag: "Creative Ensemble",
    title: "Myra, Mack & Wilma.",
    subtitle: "The Avant-Garde Performance & Scenography Trio",
    desc: "Bridging architectural millinery, conceptual graphic design, and high-fashion runway performance into unified live installations.",
    image: "assets/wilma.jpg",
    details: {
      category: "Performance & Installation Ensemble",
      members: [
        { name: "Myra J Todd", role: "Editorial Model", img: "assets/myra.jpg" },
        { name: "Mack E Spiegel", role: "Graphic Designer", img: "assets/mack.jpg" },
        { name: "Wilma G Ventura", role: "Haute Couture Model", img: "assets/wilma.jpg" }
      ],
      stats: { "Live Installations": "42", "Venice Biennale": "2024", "Audience Reach": "1.2M+" }
    }
  }
];

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initPreloader();
  initWebAudio();
  initCursor();
  initDeckSlider();
  initViewModes();
  initTiltAndSpotlight();
  initVisualizer();
  initSmartwatchClock();
  initModalAndGrid();
  initKeyboardNav();
  initAutoPlay();
  initRevealAnimations();
  initStoryNav();
  initScrollEffects();
  initMagnetic();
});

/* ==========================================================================
   1. Luxury Custom Magnetic Cursor
   ========================================================================== */
function initCursor() {
  const cursorDot = document.getElementById('customCursor');
  const cursorFollower = document.getElementById('cursorFollower');
  const cursorBadge = document.getElementById('cursorBadge');

  // Touch screens and pens get the native cursor only
  if (!cursorDot || !cursorFollower) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  let currentX = window.innerWidth / 2;
  let currentY = window.innerHeight / 2;
  let followerX = window.innerWidth / 2;
  let followerY = window.innerHeight / 2;

  window.addEventListener('mousemove', (e) => {
    state.mouse.x = e.clientX;
    state.mouse.y = e.clientY;
    currentX = e.clientX;
    currentY = e.clientY;
    cursorDot.style.left = `${currentX}px`;
    cursorDot.style.top = `${currentY}px`;
    if (!document.body.classList.contains('cursor-ready')) {
      // Jump the follower to the pointer instead of sliding in from the centre
      followerX = currentX;
      followerY = currentY;
      document.body.classList.add('cursor-ready');
    }
  });
  document.documentElement.addEventListener('mouseleave', () => {
    document.body.classList.remove('cursor-ready');
  });

  // Smooth lerp loop
  function renderCursor() {
    followerX += (currentX - followerX) * 0.16;
    followerY += (currentY - followerY) * 0.16;
    cursorFollower.style.left = `${followerX}px`;
    cursorFollower.style.top = `${followerY}px`;
    requestAnimationFrame(renderCursor);
  }
  requestAnimationFrame(renderCursor);

  // Hover badge text (delegated, so elements built later by JS are covered too)
  const hoverSelector = '[data-cursor-text], a, button, .spotlight-card, .tilt-card';
  const interactiveSelector = 'a, button, [onclick], [role="button"], input, select, textarea, label';
  let hoverTarget = null;

  function setHoverTarget(el) {
    if (el === hoverTarget) return;
    hoverTarget = el;
    if (el) {
      const isInteractive = el.matches(interactiveSelector);
      document.body.classList.add('cursor-hover');
      document.body.classList.toggle('cursor-passive', !isInteractive);
      cursorBadge.textContent = el.getAttribute('data-cursor-text') || (isInteractive ? 'OPEN' : '');
      playSoftHoverSound();
    } else {
      document.body.classList.remove('cursor-hover', 'cursor-passive');
      cursorBadge.textContent = '';
    }
  }

  document.addEventListener('mouseover', (e) => setHoverTarget(e.target.closest(hoverSelector)));
  document.addEventListener('mouseout', (e) => {
    if (!e.relatedTarget) setHoverTarget(null);
  });

  window.addEventListener('mousedown', () => {
    document.body.classList.add('cursor-click');
    playClickSound();
  });
  window.addEventListener('mouseup', () => {
    document.body.classList.remove('cursor-click');
  });
}

/* ==========================================================================
   2. Slide Deck Navigation Engine
   ========================================================================== */
function initDeckSlider() {
  const slides = document.querySelectorAll('.deck-slide');
  const counterCurrent = document.getElementById('deckCounterCurrent');
  const progressBar = document.getElementById('deckProgressBar');
  const navDots = document.querySelectorAll('.deck-nav-dot');

  window.goToSlide = function(targetIndex) {
    if (targetIndex < 0) targetIndex = state.totalSlides - 1;
    if (targetIndex >= state.totalSlides) targetIndex = 0;

    const previousIndex = state.currentSlide;
    state.currentSlide = targetIndex;

    slides.forEach((slide, idx) => {
      slide.classList.remove('active-slide', 'prev-slide');
      if (idx === targetIndex) {
        slide.classList.add('active-slide');
      } else if (idx === previousIndex) {
        slide.classList.add('prev-slide');
      }
    });

    // Update Counter & Progress
    const displayNum = String(targetIndex + 1).padStart(2, '0');
    if (counterCurrent) counterCurrent.textContent = displayNum;
    if (progressBar) {
      const pct = ((targetIndex + 1) / state.totalSlides) * 100;
      progressBar.style.width = `${pct}%`;
    }

    // Update Dots
    navDots.forEach((dot, idx) => {
      dot.setAttribute('aria-current', idx === targetIndex ? 'true' : 'false');
    });

    // Play synthesized sound
    playSlideSound();

    // Trigger visualizer refresh if headphones slide
    if (targetIndex === 3) {
      triggerVisualizerBurst();
    }
  };

  // Prev / Next button listeners
  const btnPrev = document.getElementById('deckPrevBtn');
  const btnNext = document.getElementById('deckNextBtn');
  if (btnPrev) btnPrev.addEventListener('click', () => goToSlide(state.currentSlide - 1));
  if (btnNext) btnNext.addEventListener('click', () => goToSlide(state.currentSlide + 1));

  // Dot clicks
  navDots.forEach((dot, idx) => {
    dot.addEventListener('click', () => goToSlide(idx));
  });

  // Touch swipe detection for mobile
  let touchStartX = 0;
  let touchStartY = 0;
  window.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    if (state.viewMode !== 'deck') return;
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
      if (diffX < 0) {
        goToSlide(state.currentSlide + 1); // Swipe Left -> Next
      } else {
        goToSlide(state.currentSlide - 1); // Swipe Right -> Prev
      }
    }
  }, { passive: true });

  // Initial setup
  goToSlide(0);
}

/* ==========================================================================
   3. Dual View Mode (Deck Slider vs Continuous Scroll)
   ========================================================================== */
function initViewModes() {
  const modeDeckBtn = document.getElementById('modeDeckBtn');
  const modeScrollBtn = document.getElementById('modeScrollBtn');
  const deckContainer = document.getElementById('slideDeckContainer');
  const scrollContainer = document.getElementById('continuousScrollContainer');
  const deckControls = document.getElementById('deckControlsBar');
  // The deck is a desktop presentation; on smaller screens the slides can't fit
  // a single viewport, so those visitors always get the scroll story
  const deckAllowed = window.matchMedia('(min-width: 1024px)');

  function setMode(mode, { silent = false } = {}) {
    if (mode === 'deck' && !deckAllowed.matches) mode = 'scroll';
    state.viewMode = mode;
    modeDeckBtn?.setAttribute('aria-pressed', String(mode === 'deck'));
    modeScrollBtn?.setAttribute('aria-pressed', String(mode === 'scroll'));
    document.body.classList.toggle('mode-deck', mode === 'deck');
    document.body.classList.toggle('mode-scroll', mode === 'scroll');
    document.getElementById('siteHeader')?.classList.remove('is-hidden', 'is-scrolled');

    if (mode === 'deck') {
      deckContainer.classList.remove('hidden');
      scrollContainer.classList.add('hidden');
      if (deckControls) deckControls.classList.remove('hidden');
      modeDeckBtn.classList.add('bg-white', 'text-black');
      modeDeckBtn.classList.remove('text-white/70');
      modeScrollBtn.classList.remove('bg-white', 'text-black');
      modeScrollBtn.classList.add('text-white/70');
      goToSlide(state.currentSlide);
      window.scrollTo({ top: 0, behavior: 'instant' });
    } else {
      deckContainer.classList.add('hidden');
      scrollContainer.classList.remove('hidden');
      if (deckControls) deckControls.classList.add('hidden');
      modeScrollBtn.classList.add('bg-white', 'text-black');
      modeScrollBtn.classList.remove('text-white/70');
      modeDeckBtn.classList.remove('bg-white', 'text-black');
      modeDeckBtn.classList.add('text-white/70');

      // Layout-dependent effects need re-measuring once the story is visible
      window.dispatchEvent(new Event('resize'));

      // Scroll to the active slide's section in scroll mode
      const targetSec = document.getElementById(`scroll-sec-${state.currentSlide}`);
      if (targetSec && !silent) {
        targetSec.scrollIntoView({ behavior: 'smooth' });
      }
    }
    if (!silent) playClickSound();
  }

  // Jump to a section/slide in whichever view is active
  window.navigateTo = function(index) {
    if (state.viewMode === 'deck') {
      goToSlide(index);
      return;
    }
    const total = state.totalSlides;
    const target = document.getElementById(`scroll-sec-${((index % total) + total) % total}`);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  window.scrollToTop = function() {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  };

  window.goHome = function() {
    if (state.viewMode === 'deck') goToSlide(0);
    else scrollToTop();
  };

  if (modeDeckBtn) modeDeckBtn.addEventListener('click', () => setMode('deck'));
  if (modeScrollBtn) modeScrollBtn.addEventListener('click', () => setMode('scroll'));
  window.switchMode = setMode;
  window.isDeckAllowed = () => deckAllowed.matches;

  deckAllowed.addEventListener('change', (e) => {
    if (!e.matches && state.viewMode === 'deck') setMode('scroll', { silent: true });
  });

  setMode(state.viewMode, { silent: true });
}

/* ==========================================================================
   4. Synthesized Web Audio API (Zero dependencies sound engine)
   ========================================================================== */
function initWebAudio() {
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const soundStatusText = document.getElementById('soundStatusText');

  function getAudioCtx() {
    if (!state.audioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        state.audioContext = new AudioContext();
      }
    }
    if (state.audioContext && state.audioContext.state === 'suspended') {
      state.audioContext.resume();
    }
    return state.audioContext;
  }

  window.playClickSound = function() {
    if (!state.isAudioEnabled) return;
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch(e) {}
  };

  window.playSoftHoverSound = function() {
    if (!state.isAudioEnabled) return;
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      gain.gain.setValueAtTime(0.012, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    } catch(e) {}
  };

  window.playSlideSound = function() {
    if (!state.isAudioEnabled) return;
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      // Sub-bass air whoosh
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.36);
    } catch(e) {}
  };

  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
      state.isAudioEnabled = !state.isAudioEnabled;
      soundToggleBtn.setAttribute('aria-pressed', String(state.isAudioEnabled));
      setIcon(soundToggleBtn, state.isAudioEnabled ? 'volume-2' : 'volume-x');
      if (soundStatusText) soundStatusText.textContent = state.isAudioEnabled ? 'SOUND ON' : 'SOUND OFF';
      if (state.isAudioEnabled) {
        getAudioCtx();
        playClickSound();
      }
    });
  }
}

// Swap the Lucide icon inside a button (Lucide replaces <i> with <svg> once rendered)
function setIcon(container, name) {
  const current = container.querySelector('svg, i');
  if (!current || !window.lucide) return;
  const icon = document.createElement('i');
  icon.setAttribute('data-lucide', name);
  icon.setAttribute('class', 'w-3.5 h-3.5');
  current.replaceWith(icon);
  lucide.createIcons();
}

/* ==========================================================================
   5. Interactive 3D Card Tilt & Mouse Spotlight Tracking
   ========================================================================== */
function initTiltAndSpotlight() {
  const cards = document.querySelectorAll('.spotlight-card, .tilt-card');

  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Update CSS variables for flashlight spotlight
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);

      // 3D Tilt calculation
      const tiltInner = card.querySelector('.tilt-inner');
      if (tiltInner) {
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -10;
        const rotateY = ((x - centerX) / centerX) * 10;
        tiltInner.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;
      }
    });

    card.addEventListener('mouseleave', () => {
      const tiltInner = card.querySelector('.tilt-inner');
      if (tiltInner) {
        tiltInner.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
      }
    });
  });
}

/* ==========================================================================
   6. Live Acoustic Frequency Visualizer (Slide 4 - Headphones)
   ========================================================================== */
function initVisualizer() {
  const visualizerWraps = document.querySelectorAll('#acousticVisualizer, #acousticVisualizerScroll');
  if (!visualizerWraps.length) return;

  const barCount = 32;
  const bars = [];

  visualizerWraps.forEach(visualizerWrap => {
    visualizerWrap.innerHTML = '';
    for (let i = 0; i < barCount; i++) {
      const bar = document.createElement('div');
      bar.className = 'w-1 bg-white/40 hover:bg-white rounded-full transition-all duration-150';
      bar.style.height = `${Math.sin(i * 0.25) * 20 + 24}px`;
      visualizerWrap.appendChild(bar);
      bars.push(bar);
    }
  });

  let phase = 0;
  function animateVisualizer() {
    phase += 0.08;
    bars.forEach((bar, n) => {
      const i = n % barCount;
      const wave = Math.sin(phase + i * 0.35) * 16 + Math.cos(phase * 1.5 + i * 0.2) * 10 + 26;
      bar.style.height = `${Math.max(6, Math.min(68, wave))}px`;
    });
    requestAnimationFrame(animateVisualizer);
  }
  requestAnimationFrame(animateVisualizer);

  window.triggerVisualizerBurst = function() {
    bars.forEach((bar) => {
      bar.style.height = `${Math.floor(Math.random() * 55) + 15}px`;
      bar.classList.add('bg-white');
      setTimeout(() => bar.classList.remove('bg-white'), 400);
    });
  };
}

/* ==========================================================================
   7. Real-Time Smartwatch Clock & Live Toggle (Slide 9)
   ========================================================================== */
function initSmartwatchClock() {
  const watchTimeElem = document.getElementById('smartwatchDisplayTime');
  const scrollWatchTimeElem = document.getElementById('scrollWatchTime');
  const watchToggleBtn = document.getElementById('smartwatchTimeToggle');
  const footerClock = document.getElementById('footerClock');

  function updateClock() {
    const now = new Date();
    if (footerClock) {
      footerClock.textContent = now.toLocaleTimeString('en-GB', { timeZone: 'Europe/Rome', hour12: false });
    }
    if (!watchTimeElem) return;
    if (state.isLiveTimeMode) {
      const hrs = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      watchTimeElem.textContent = `${hrs}:${mins}`;
    } else {
      watchTimeElem.textContent = `11:36`;
    }
    if (scrollWatchTimeElem) scrollWatchTimeElem.textContent = watchTimeElem.textContent;
  }

  if (watchToggleBtn) {
    watchToggleBtn.addEventListener('click', () => {
      state.isLiveTimeMode = !state.isLiveTimeMode;
      // Label names the action the button will take next
      watchToggleBtn.textContent = state.isLiveTimeMode ? 'SHOW ICONIC 11:36' : 'SHOW LIVE TIME';
      watchToggleBtn.setAttribute('aria-pressed', String(state.isLiveTimeMode));
      updateClock();
      playClickSound();
    });
  }

  setInterval(updateClock, 1000);
  updateClock();
}

/* ==========================================================================
   8. Dialogs: Detail Lightbox, Index Grid & Inquiry Form
   ========================================================================== */
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
let modalReturnFocus = null;

function getOpenModal() {
  return document.querySelector('.modal.flex');
}

function getFocusable(root) {
  return [...root.querySelectorAll(FOCUSABLE)].filter(el => el.getClientRects().length > 0);
}

// Everything outside the dialog becomes inert so screen readers and Tab stay inside
function setBackgroundInert(isInert) {
  [...document.body.children].forEach(el => {
    if (el.classList.contains('modal') || el.tagName === 'SCRIPT') return;
    el.inert = isInert;
  });
}

function openModal(modal, focusTarget) {
  if (!modal) return;
  const current = getOpenModal();
  if (current === modal) return;
  if (current) {
    current.classList.add('hidden');
    current.classList.remove('flex');
  } else {
    modalReturnFocus = document.activeElement;
  }
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.documentElement.classList.add('modal-open');
  setBackgroundInert(true);
  (focusTarget || getFocusable(modal)[0])?.focus({ preventScroll: true });
  playClickSound();
}

function closeModal(modal) {
  if (!modal || modal.classList.contains('hidden')) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  if (getOpenModal()) return;
  document.documentElement.classList.remove('modal-open');
  setBackgroundInert(false);
  if (modalReturnFocus && document.contains(modalReturnFocus)) {
    modalReturnFocus.focus({ preventScroll: true });
  }
  modalReturnFocus = null;
}

function initModalAndGrid() {
  const detailModal = document.getElementById('detailModal');
  const overviewModal = document.getElementById('overviewModal');
  const inquiryModal = document.getElementById('inquiryModal');
  const detailScroller = detailModal?.querySelector('.overflow-y-auto');

  const modalNumber = document.getElementById('modalNumber');
  const modalTag = document.getElementById('modalTag');
  const modalTitle = document.getElementById('modalTitle');
  const modalSubtitle = document.getElementById('modalSubtitle');
  const modalDesc = document.getElementById('modalDesc');
  const modalImage = document.getElementById('modalImage');
  const modalStatsList = document.getElementById('modalStatsList');
  const modalExtra = document.getElementById('modalExtra');
  const overviewGridContainer = document.getElementById('overviewGridContainer');

  let detailIndex = 0;

  // Leadership gets their quote, rosters get their people, projects get their scope
  function renderExtra(details = {}) {
    const label = (text) => `<div class="text-[11px] font-mono tracking-widest text-neutral-400 uppercase mb-3">${text}</div>`;

    if (details.members) {
      return label('The team') + `
        <ul class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          ${details.members.map(m => `
            <li class="flex items-center gap-3">
              <img src="${m.img}" alt="" loading="lazy" class="w-10 h-10 rounded-full object-cover grayscale border border-white/15">
              <span>
                <span class="block text-sm font-syne font-bold text-white leading-tight">${m.name}</span>
                <span class="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider">${m.role}</span>
              </span>
            </li>`).join('')}
        </ul>`;
    }
    if (details.quote) {
      return label('In their words') + `
        <blockquote class="pl-4 border-l border-white/30 text-lg md:text-xl font-italiana text-white/90 leading-snug">“${details.quote}”</blockquote>
        <div class="mt-3 text-[11px] font-mono tracking-widest text-neutral-400 uppercase">${[details.role, details.tenure].filter(Boolean).join(' · ')}</div>`;
    }
    if (details.scope) {
      return label('Scope of practice') + `
        <ul class="space-y-1.5">
          ${details.scope.map(item => `
            <li class="flex items-center gap-2 text-sm text-white/80">
              <span class="w-1.5 h-1.5 bg-white rounded-full shrink-0"></span>
              <span>${item}</span>
            </li>`).join('')}
        </ul>`;
    }
    return '';
  }

  window.openDetailModal = function(slideIndex) {
    if (!detailModal) return;
    const total = slideData.length;
    detailIndex = ((slideIndex % total) + total) % total;
    const data = slideData[detailIndex];
    const details = data.details || {};

    modalNumber.textContent = data.number;
    modalTag.textContent = data.tag;
    modalTitle.textContent = data.title;
    modalSubtitle.textContent = data.subtitle;
    modalDesc.textContent = data.desc;
    modalImage.src = data.image;

    modalStatsList.innerHTML = Object.entries(details.stats || {}).map(([k, v]) => `
      <div class="p-3 bg-white/[0.03] border border-white/10 rounded flex sm:block items-baseline justify-between gap-3">
        <div class="text-lg md:text-xl font-bold font-syne text-white leading-tight">${v}</div>
        <div class="text-[10px] text-white/60 tracking-wider uppercase sm:mt-1">${k}</div>
      </div>
    `).join('');

    const extra = renderExtra(details);
    modalExtra.innerHTML = extra;
    modalExtra.hidden = !extra;

    if (detailScroller) detailScroller.scrollTop = 0;
    openModal(detailModal);
  };

  window.closeDetailModal = () => closeModal(detailModal);

  document.getElementById('modalCloseBtn')?.addEventListener('click', closeDetailModal);
  document.getElementById('modalPrevBtn')?.addEventListener('click', () => openDetailModal(detailIndex - 1));
  document.getElementById('modalNextBtn')?.addEventListener('click', () => openDetailModal(detailIndex + 1));

  // Clicking the dimmed backdrop closes any dialog
  [detailModal, overviewModal, inquiryModal].forEach(modal => {
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  // Index grid
  if (overviewGridContainer) {
    overviewGridContainer.innerHTML = slideData.map((item, idx) => `
      <button type="button" data-index="${idx}" style="--i:${idx}"
           class="overview-card group relative text-left bg-[#121216] border border-white/10 hover:border-white/40 rounded-lg overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
        <span class="block aspect-[16/9] w-full overflow-hidden bg-black relative">
          <img src="${item.image}" alt="" loading="lazy" class="w-full h-full object-cover grayscale opacity-75 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500">
          <span class="absolute top-2 left-2 px-2 py-0.5 bg-black/80 backdrop-blur text-[10px] font-mono tracking-wider text-white border border-white/20">${item.number}</span>
        </span>
        <span class="block p-3 md:p-4">
          <span class="block text-[11px] text-white/60 font-mono tracking-wider uppercase mb-1">${item.tag}</span>
          <span class="block text-sm font-syne font-bold text-white truncate" title="${item.title}">${item.title}</span>
        </span>
      </button>
    `).join('');

    overviewGridContainer.addEventListener('click', (e) => {
      const card = e.target.closest('[data-index]');
      if (!card) return;
      closeOverviewModal();
      navigateTo(parseInt(card.dataset.index, 10));
    });
  }

  window.openOverviewModal = function() {
    if (!overviewModal) return;
    // Mark (and focus) where the visitor currently is
    let currentCard = null;
    overviewGridContainer?.querySelectorAll('[data-index]').forEach(card => {
      const isCurrent = parseInt(card.dataset.index, 10) === state.currentSlide;
      card.setAttribute('aria-current', isCurrent ? 'true' : 'false');
      if (isCurrent) currentCard = card;
    });
    openModal(overviewModal, currentCard);
  };

  window.closeOverviewModal = () => closeModal(overviewModal);

  document.getElementById('openOverviewBtn')?.addEventListener('click', openOverviewModal);
  document.getElementById('closeOverviewBtn')?.addEventListener('click', closeOverviewModal);

  // Inquiry form
  const inquiryForm = document.getElementById('inquiryForm');
  const inquiryStatus = document.getElementById('inquiryStatus');

  window.openInquiryModal = function() {
    if (!inquiryModal) return;
    // Don't pop the on-screen keyboard on touch devices
    const firstField = window.matchMedia('(pointer: fine)').matches ? document.getElementById('inqName') : null;
    openModal(inquiryModal, firstField);
  };

  window.closeInquiryModal = () => closeModal(inquiryModal);

  document.getElementById('openInquiryBtn')?.addEventListener('click', openInquiryModal);
  document.getElementById('closeInquiryBtn')?.addEventListener('click', closeInquiryModal);

  if (inquiryForm) {
    const fields = [...inquiryForm.querySelectorAll('[required]')];

    const validate = (field) => {
      const valid = field.value.trim() !== '' && field.checkValidity();
      field.setAttribute('aria-invalid', valid ? 'false' : 'true');
      const error = document.getElementById(`${field.id}Error`);
      if (error) field.setAttribute('aria-describedby', error.id);
      return valid;
    };

    // Only re-check while typing once a field has already been flagged
    fields.forEach(field => {
      field.addEventListener('input', () => {
        if (field.getAttribute('aria-invalid') === 'true') validate(field);
      });
      field.addEventListener('blur', () => {
        if (field.value.trim() !== '') validate(field);
      });
    });

    inquiryForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const invalid = fields.filter(field => !validate(field));
      if (invalid.length) {
        invalid[0].focus();
        inquiryStatus.textContent = 'Please fix the highlighted fields.';
        return;
      }

      const submitBtn = inquiryForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';
      inquiryStatus.textContent = '';

      setTimeout(() => {
        submitBtn.textContent = '✓ Inquiry sent';
        inquiryStatus.textContent = "Thank you — we'll be in touch shortly.";
        playClickSound();
        setTimeout(() => {
          closeInquiryModal();
          inquiryForm.reset();
          fields.forEach(field => field.removeAttribute('aria-invalid'));
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send inquiry';
          inquiryStatus.textContent = '';
        }, 2200);
      }, 700);
    });
  }

  // Keep Tab cycling inside the open dialog
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const modal = getOpenModal();
    if (!modal) return;
    const focusable = getFocusable(modal);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!modal.contains(document.activeElement)) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
}

/* ==========================================================================
   9. Keyboard Navigation (Arrows, Space, G, M, V, ESC)
   ========================================================================== */
function initKeyboardNav() {
  window.addEventListener('keydown', (e) => {
    // Leave browser/OS shortcuts (Ctrl+G, Cmd+M…) alone
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;

    const openDialog = getOpenModal();
    if (e.key === 'Escape') {
      if (openDialog) closeModal(openDialog);
      return;
    }

    // Typing in a field never triggers shortcuts
    if (e.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;

    if (openDialog) {
      if (openDialog.id === 'overviewModal' && (e.key === 'g' || e.key === 'G')) closeOverviewModal();
      if (openDialog.id === 'detailModal' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        e.preventDefault();
        document.getElementById(e.key === 'ArrowRight' ? 'modalNextBtn' : 'modalPrevBtn')?.click();
      }
      return;
    }

    // In the scroll story, Space/PageUp/PageDown keep their native scrolling;
    // Left/Right arrows still jump between sections
    const isDeck = state.viewMode === 'deck';
    // Space on a focused button should press that button, not change slide
    const onControl = e.target.closest?.('button, a');

    switch (e.key) {
      case 'ArrowRight':
      case 'PageDown':
      case ' ':
        if (!isDeck && e.key !== 'ArrowRight') break;
        if (e.key === ' ' && onControl) break;
        e.preventDefault();
        navigateTo(state.currentSlide + 1);
        break;
      case 'ArrowLeft':
      case 'PageUp':
        if (!isDeck && e.key !== 'ArrowLeft') break;
        e.preventDefault();
        navigateTo(state.currentSlide - 1);
        break;
      case 'g':
      case 'G':
        e.preventDefault();
        openOverviewModal();
        break;
      case 'm':
      case 'M':
        document.getElementById('soundToggleBtn')?.click();
        break;
      case 'v':
      case 'V':
        if (isDeckAllowed()) switchMode(isDeck ? 'scroll' : 'deck');
        break;
    }
  });
}

/* ==========================================================================
   10. Auto-Play Presentation Mode ("Auto Tour")
   ========================================================================== */
function initAutoPlay() {
  const autoPlayBtn = document.getElementById('autoPlayBtn');
  const autoPlayStatus = document.getElementById('autoPlayStatus');

  function setAutoPlayUi(isOn) {
    if (autoPlayStatus) autoPlayStatus.textContent = isOn ? 'AUTO ON' : 'AUTO';
    if (autoPlayBtn) {
      autoPlayBtn.setAttribute('aria-pressed', String(isOn));
      setIcon(autoPlayBtn, isOn ? 'pause' : 'play');
    }
  }

  function startAutoPlay() {
    state.isAutoPlay = true;
    setAutoPlayUi(true);
    state.autoPlayTimer = setInterval(() => {
      // Hold still while the visitor is reading a dialog
      if (getOpenModal()) return;
      navigateTo(state.currentSlide + 1);
    }, state.autoPlayDuration);
  }

  function stopAutoPlay() {
    state.isAutoPlay = false;
    setAutoPlayUi(false);
    clearInterval(state.autoPlayTimer);
  }

  if (autoPlayBtn) {
    autoPlayBtn.addEventListener('click', () => {
      if (state.isAutoPlay) {
        stopAutoPlay();
      } else {
        startAutoPlay();
      }
      playClickSound();
    });
  }
}

/* ==========================================================================
   11. Intro Preloader
   ========================================================================== */
function initPreloader() {
  const root = document.documentElement;
  const preloader = document.getElementById('preloader');
  const count = document.getElementById('preloaderCount');
  const bar = document.getElementById('preloaderBar');

  // Always start the story from the top so the intro plays in order
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo({ top: 0, behavior: 'instant' });

  function finish() {
    root.classList.remove('is-loading');
    root.classList.add('is-loaded');
    if (!preloader) return;
    preloader.classList.add('is-done');
    setTimeout(() => preloader.remove(), 1200);
  }

  if (!preloader || prefersReducedMotion) {
    finish();
    return;
  }

  let pageLoaded = document.readyState === 'complete';
  window.addEventListener('load', () => { pageLoaded = true; });

  const start = performance.now();
  let shown = 0;

  function step(now) {
    const elapsed = now - start;
    // Creep toward 90% while assets load, then sprint to 100 (capped at 3.5s)
    const ready = (pageLoaded && elapsed > 1100) || elapsed > 3500;
    const target = ready ? 100 : Math.min(90, elapsed / 14);
    shown += (target - shown) * 0.08;
    if (ready && shown > 99.5) shown = 100;

    if (count) count.textContent = String(Math.floor(shown)).padStart(3, '0');
    if (bar) bar.style.transform = `scaleX(${shown / 100})`;

    if (shown < 100) requestAnimationFrame(step);
    else setTimeout(finish, 200);
  }
  requestAnimationFrame(step);
}

/* ==========================================================================
   12. Scroll Reveal Animations (split headings, fades, image wipes, counters)
   ========================================================================== */
function splitWords(el, className, masked = false) {
  const words = [];

  const walk = (node) => {
    [...node.childNodes].forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(' '));
            return;
          }
          const word = document.createElement('span');
          word.className = className;
          if (masked) {
            const inner = document.createElement('span');
            inner.className = 'split-inner';
            inner.textContent = part;
            inner.style.setProperty('--i', words.length);
            word.appendChild(inner);
            words.push(inner);
          } else {
            word.textContent = part;
            words.push(word);
          }
          frag.appendChild(word);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
        walk(child);
      }
    });
  };

  walk(el);
  return words;
}

function scrambleText(el) {
  if (prefersReducedMotion) return;
  const original = el.textContent;
  const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#*+';
  const totalFrames = 26;
  let frame = 0;

  function run() {
    const resolved = (frame / totalFrames) * original.length;
    el.textContent = original
      .split('')
      .map((ch, i) => (ch === ' ' || i < resolved ? ch : glyphs[Math.floor(Math.random() * glyphs.length)]))
      .join('');
    if (++frame <= totalFrames) requestAnimationFrame(run);
    else el.textContent = original;
  }
  run();
}

function countUp(el) {
  const target = parseFloat(el.dataset.count);
  const decimals = parseInt(el.dataset.decimals || '0', 10);
  if (prefersReducedMotion) {
    el.textContent = target.toFixed(decimals);
    return;
  }
  const duration = 1800;
  const start = performance.now();

  function step(now) {
    const p = clamp((now - start) / duration);
    const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p); // easeOutExpo
    el.textContent = (target * eased).toFixed(decimals);
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function initRevealAnimations() {
  // Hero wordmark: one masked span per letter
  document.querySelectorAll('[data-hero-split]').forEach(el => {
    const letters = el.textContent.trim().split('');
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = letters
      .map((ch, i) => `<span class="hero-letter" aria-hidden="true" style="--i:${i}">${ch}</span>`)
      .join('');
  });

  document.querySelectorAll('[data-split]').forEach(el => splitWords(el, 'split-word', true));

  // Children of a [data-stagger] group reveal one after another
  document.querySelectorAll('[data-stagger]').forEach(group => {
    group.querySelectorAll('[data-reveal]').forEach((child, i) => child.style.setProperty('--d', i));
  });

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('is-inview');
      if (el.hasAttribute('data-scramble')) scrambleText(el);
      if (el.hasAttribute('data-count')) countUp(el);
      revealObserver.unobserve(el);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

  document.querySelectorAll('[data-reveal], [data-split], [data-scramble], [data-count]').forEach(el => {
    revealObserver.observe(el);
  });
}

/* ==========================================================================
   13. Scroll Story Section Navigator
   ========================================================================== */
function initStoryNav() {
  const nav = document.getElementById('storyNav');
  if (!nav) return;

  nav.innerHTML = slideData.map((item, idx) => `
    <button class="story-nav-item" aria-label="Go to ${item.tag}" data-cursor-text="${item.number}">
      <span class="story-nav-label">${item.number} — ${item.tag}</span>
      <span class="story-nav-line"></span>
    </button>
  `).join('');

  const items = [...nav.children];
  items.forEach((btn, idx) => btn.addEventListener('click', () => navigateTo(idx)));

  // A section is "current" while it crosses the middle of the viewport
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting || state.viewMode !== 'scroll') return;
      const index = parseInt(entry.target.dataset.section, 10);
      state.currentSlide = index;
      items.forEach((btn, i) => {
        btn.classList.toggle('is-active', i === index);
        if (i === index) btn.setAttribute('aria-current', 'true');
        else btn.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });

  document.querySelectorAll('[data-section]').forEach(sec => sectionObserver.observe(sec));
}

/* ==========================================================================
   14. Cinematic Scroll Effects (parallax, pinned gallery, marquee, scrubbing)
   ========================================================================== */
function initScrollEffects() {
  const header = document.getElementById('siteHeader');
  const progressBar = document.getElementById('scrollProgress');
  const backToTop = document.getElementById('backToTop');
  const backToTopRing = document.getElementById('backToTopRing');
  const storyNav = document.getElementById('storyNav');
  const heroBg = document.getElementById('heroBgImage');
  const heroContent = document.getElementById('heroContent');
  const RING_LENGTH = 163.4;

  const parallaxEls = [...document.querySelectorAll('[data-speed]')];
  const scrubTexts = [...document.querySelectorAll('[data-scrub-text]')].map(el => ({
    el,
    words: splitWords(el, 'scrub-word'),
  }));
  const scrubRows = [...document.querySelectorAll('[data-scrub-x]')];
  const marquees = [...document.querySelectorAll('[data-marquee]')].map(track => ({
    track,
    dir: parseFloat(track.dataset.marquee) || 1,
    x: 0,
    width: 0,
  }));

  const hscroll = document.querySelector('[data-hscroll]');
  const hscrollTrack = hscroll && hscroll.querySelector('[data-hscroll-track]');
  const hscrollImages = hscrollTrack ? [...hscrollTrack.querySelectorAll('img')] : [];
  const hscrollBar = document.getElementById('hscrollBar');
  const hscrollCounter = document.getElementById('hscrollCounter');
  let hscrollDistance = 0;

  const scroll = { last: window.scrollY, velocity: 0, direction: 1 };

  // Measurements that only change on resize
  function layout() {
    if (state.viewMode !== 'scroll') return;
    if (hscroll && hscrollTrack) {
      hscrollDistance = Math.max(0, hscrollTrack.scrollWidth - window.innerWidth);
      hscroll.style.height = `${window.innerHeight + hscrollDistance}px`;
    }
    marquees.forEach(m => {
      m.width = m.track.firstElementChild ? m.track.firstElementChild.offsetWidth : 0;
      if (m.dir < 0 && m.x === 0) m.x = -m.width;
    });
  }
  window.addEventListener('resize', layout);
  window.addEventListener('load', layout);
  layout();

  function updateChrome(y, delta, vh, galleryPinned) {
    const max = document.documentElement.scrollHeight - vh;
    const progress = max > 0 ? clamp(y / max) : 0;

    if (progressBar) progressBar.style.transform = `scaleX(${progress})`;
    if (backToTopRing) backToTopRing.style.strokeDashoffset = RING_LENGTH * (1 - progress);
    // Step aside at the very bottom, where the footer has its own "Back to top"
    if (backToTop) backToTop.classList.toggle('is-visible', y > vh * 0.8 && y < max - 140);
    // The side nav would sit on top of the full-width archive cards
    if (storyNav) storyNav.classList.toggle('is-visible', y > vh * 0.6 && !galleryPinned);

    if (header) {
      header.classList.toggle('is-scrolled', y > 40);
      if (delta > 4 && y > vh * 0.5) header.classList.add('is-hidden');
      else if (delta < -4 || y < vh * 0.5) header.classList.remove('is-hidden');
    }
  }

  function updateHero(y, vh) {
    if (!heroBg || y > vh * 1.2) return;
    const p = y / vh;
    heroBg.style.transform = `translate3d(0, ${(y * 0.35).toFixed(1)}px, 0) scale(${(1.08 + p * 0.12).toFixed(4)})`;
    if (heroContent) {
      heroContent.style.transform = `translate3d(0, ${(y * 0.2).toFixed(1)}px, 0)`;
      heroContent.style.opacity = clamp(1 - p * 1.3).toFixed(3);
    }
  }

  function updateParallax(vh) {
    parallaxEls.forEach(el => {
      // Measure the parent so the element's own translate doesn't feed back
      const rect = el.parentElement.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > vh + 200) return;
      const offset = (rect.top + rect.height / 2 - vh / 2) * parseFloat(el.dataset.speed);
      el.style.translate = `0 ${offset.toFixed(1)}px`;
    });
  }

  function updateScrubText(vh) {
    scrubTexts.forEach(({ el, words }) => {
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > vh) return;
      // Lights up between "top at 85% of viewport" and "bottom at 40%"
      const p = clamp((vh * 0.85 - rect.top) / (vh * 0.45 + rect.height));
      const lit = p * words.length;
      words.forEach((word, i) => {
        const opacity = (0.12 + 0.88 * clamp(lit - i)).toFixed(2);
        if (word.dataset.o !== opacity) {
          word.style.opacity = opacity;
          word.dataset.o = opacity;
        }
      });
    });
  }

  function updateScrubRows(vh) {
    scrubRows.forEach(row => {
      const rect = row.parentElement.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > vh + 200) return;
      const x = (rect.top + rect.height / 2 - vh / 2) * parseFloat(row.dataset.scrubX);
      row.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
    });
  }

  function updateMarquees() {
    const skew = clamp(-scroll.velocity * 0.15, -8, 8);
    marquees.forEach(m => {
      if (!m.width) return;
      // Flows with the scroll direction and speeds up with scroll velocity
      const speed = (0.6 + Math.min(Math.abs(scroll.velocity) * 0.25, 18)) * m.dir * scroll.direction;
      m.x -= speed;
      if (m.x <= -m.width) m.x += m.width;
      if (m.x > 0) m.x -= m.width;
      m.track.style.transform = `translate3d(${m.x.toFixed(1)}px, 0, 0) skewX(${skew.toFixed(2)}deg)`;
    });
  }

  // Returns true while the gallery is pinned and filling the viewport
  function updateHorizontalGallery(vh) {
    if (!hscroll || !hscrollTrack) return false;
    const rect = hscroll.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > vh) return false;

    const p = clamp(-rect.top / Math.max(1, rect.height - vh));
    const skew = prefersReducedMotion ? 0 : clamp(-scroll.velocity * 0.08, -4, 4);
    hscrollTrack.style.transform = `translate3d(${(-p * hscrollDistance).toFixed(1)}px, 0, 0) skewX(${skew.toFixed(2)}deg)`;

    if (hscrollBar) hscrollBar.style.transform = `scaleX(${p})`;
    if (hscrollCounter) {
      const index = Math.round(p * (hscrollImages.length - 1)) + 1;
      hscrollCounter.textContent = String(index).padStart(2, '0');
    }

    // Inner horizontal parallax: images drift against the track
    if (!prefersReducedMotion) {
      const vw = window.innerWidth;
      hscrollImages.forEach(img => {
        const r = img.parentElement.getBoundingClientRect();
        if (r.right < 0 || r.left > vw) return;
        const offset = (r.left + r.width / 2 - vw / 2) * -0.05;
        img.style.translate = `${offset.toFixed(1)}px 0`;
      });
    }
    return rect.top <= vh * 0.1 && rect.bottom >= vh * 0.9;
  }

  function tick() {
    requestAnimationFrame(tick);
    if (state.viewMode !== 'scroll') return;

    const y = window.scrollY;
    const vh = window.innerHeight;
    const delta = y - scroll.last;
    scroll.last = y;
    scroll.velocity += (delta - scroll.velocity) * 0.12;
    if (Math.abs(delta) > 0.5) scroll.direction = Math.sign(delta);

    const galleryPinned = updateHorizontalGallery(vh);
    updateChrome(y, delta, vh, galleryPinned);

    if (prefersReducedMotion) return;
    updateHero(y, vh);
    updateParallax(vh);
    updateScrubText(vh);
    updateScrubRows(vh);
    updateMarquees();
  }
  requestAnimationFrame(tick);
}

/* ==========================================================================
   15. Magnetic Buttons
   ========================================================================== */
function initMagnetic() {
  if (prefersReducedMotion || window.matchMedia('(hover: none)').matches) return;

  document.querySelectorAll('[data-magnetic]').forEach(el => {
    const strength = parseFloat(el.dataset.magnetic) || 0.3;
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      el.style.transform = `translate(${(x * strength).toFixed(1)}px, ${(y * strength).toFixed(1)}px)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = '';
    });
  });
}
