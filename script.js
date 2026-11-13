/* =========================================================================
   CobWebZ — site behaviour (vanilla JS, no build step)
   ========================================================================= */

/* -------------------------------------------------------------------------
   CONFIGURATION — edit these values before going live.
   Empty values are hidden on the page, so nothing fake is ever shown.
   ------------------------------------------------------------------------- */
const CUBE_CONFIG = {
  availability: 'Available for new projects',

  contact: {
    email: 'cobwebzsl@gmail.com',
    phone: '+94 71 907 0320', // shown as typed; must match the Google Business Profile and the structured data in index.html
    whatsapp: '94719070320', // 071 907 0320, international format, digits only. Enquiries go here.
    // How quickly you reply, finishing the sentence "We reply …", e.g. 'within one working day'.
    // Shown in the contact section once set. Only promise what you can keep.
    responseTime: ''
  },

  /* The founder card in "The minds behind the web". Hidden until a name is set, so nobody is
     invented. photo: a path such as 'assets/founder.webp' (square-ish, about 800px), or leave
     it empty for a monogram. link: a full profile URL (LinkedIn, GitHub…) and its label. */
  founder: {
    name: '',
    role: 'Founder & lead developer',
    bio: '',
    photo: '',
    link: '',
    linkLabel: 'LinkedIn'
  },

  /* Client testimonials. The section stays hidden while this list is empty. Only add words a
     client actually wrote and agreed to share, for example:
       { quote: 'They rebuilt our site in…', name: 'Nimal Perera', role: 'Owner',
         company: 'Example Café', source: 'Google review', url: 'https://…' }
     role, company, source and url are optional. */
  testimonials: [],

  social: {
    instagram: 'https://www.instagram.com/cobwebz_sl/', // full URLs only
    facebook: 'https://www.facebook.com/profile.php?id=61596432720722',
    linkedin: '',
    github: ''
  },

  /* Enquiry delivery. With contact.whatsapp set, the form opens WhatsApp with the
     enquiry, plan, add-ons and estimate written out, ready for the visitor to send.
     Clear contact.whatsapp to use a form service instead. Configure ONE of these:
       - web3formsKey: free access key from https://web3forms.com
       - formspreeEndpoint: e.g. 'https://formspree.io/f/abcdwxyz'
     With neither set, the form falls back to opening the visitor's email app
     (if contact.email is set) — it never claims an enquiry was delivered. */
  form: {
    web3formsKey: '',
    formspreeEndpoint: '',
    subject: 'New project enquiry — CobWebZ website'
  }
};

(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  /* ---------- Config → DOM ---------- */
  function getConfig(path) {
    return path.split('.').reduce((obj, key) => (obj ? obj[key] : ''), CUBE_CONFIG) || '';
  }

  function hrefFor(path, value) {
    if (path === 'contact.email') return `mailto:${value}`;
    if (path === 'contact.phone') return `tel:${value.replace(/[^\d+]/g, '')}`;
    if (path === 'contact.whatsapp') return `https://wa.me/${value.replace(/\D/g, '')}`;
    return /^https?:\/\//i.test(value) ? value : ''; // social profiles: web addresses only
  }

  // How a value reads on the page: the WhatsApp number is shown like the phone number when
  // they're the same line, otherwise as +digits
  function displayFor(path, value) {
    if (path !== 'contact.whatsapp') return value;
    const digits = value.replace(/\D/g, '');
    const phone = getConfig('contact.phone');
    return phone && phone.replace(/\D/g, '') === digits ? phone : `+${digits}`;
  }

  // An item holding a link shows when its value makes a working address; an item holding
  // only text (e.g. the reply time) shows when its value is set
  function applyConfig() {
    $$('[data-config-item]').forEach((item) => {
      const path = item.dataset.configItem;
      const value = getConfig(path).trim();
      const links = $$(`[data-config-link="${path}"]`, item);
      const href = value && links.length ? hrefFor(path, value) : '';
      item.hidden = links.length ? !href : !value;
      if (!href) return;
      links.forEach((link) => {
        link.href = href;
        if (!link.textContent.trim()) link.textContent = displayFor(path, value);
      });
    });

    // Columns and groups built from config values hide when none of their values are set
    $$('[data-config-block]').forEach((block) => {
      block.hidden = !$$('[data-config-item]', block).some((li) => !li.hidden);
    });

    $$('[data-config-text]').forEach((el) => {
      const value = getConfig(el.dataset.configText);
      if (value) el.textContent = value;
    });
    $$('[data-config-value]').forEach((el) => {
      const path = el.dataset.configValue;
      const value = getConfig(path).trim();
      if (value) el.textContent = displayFor(path, value);
    });

    $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
  }

  /* ---------- Copy buttons: [data-copy="contact.email"] copies that config value ---------- */
  function initCopy() {
    $$('[data-copy]').forEach((btn) => {
      const value = getConfig(btn.dataset.copy).trim();
      if (!value || !navigator.clipboard) { btn.hidden = true; return; }
      const label = btn.textContent;
      let timer = 0;
      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(value);
          btn.textContent = 'Copied';
          btn.classList.add('is-done');
        } catch (e) {
          btn.textContent = 'Not copied';
        }
        clearTimeout(timer);
        timer = setTimeout(() => { btn.textContent = label; btn.classList.remove('is-done'); }, 1800);
      });
    });
  }

  /* ---------- Active nav link ---------- */
  function initActiveNav() {
    const links = $$('[data-nav]');
    const linked = new Set(links.map((a) => (a.getAttribute('href') || '').split('#')[1]));
    // Only sections a link points to, so passing one without a link keeps the last one lit;
    // plus the hero, so being back at the top lights none
    const sections = $$('main > section[id]').filter((s) => linked.has(s.id) || s.id === 'overview');
    if (!links.length || !sections.length) return;

    // The header's dot slides under the lit link (wide screens, where the links show)
    const nav = $('.site-nav');
    const dot = $('[data-nav-dot]');
    let placed = false;
    // Measured from the link's <li>: its offsets are relative to the nav and ignore the slide
    // and blur the links get while folded (which would otherwise make each <li> the link's
    // offset parent and throw the numbers off)
    const placeDot = () => {
      if (!nav || !dot) return;
      const link = $('.site-nav__link.is-active', nav);
      nav.classList.toggle('has-active', Boolean(link));
      const item = link && link.parentElement;
      if (!item || !item.offsetWidth) return;
      if (!placed) nav.classList.add('is-placing'); // first time: appear in place, no slide
      dot.style.setProperty('--x', `${(item.offsetLeft + item.offsetWidth / 2 - 2).toFixed(1)}px`);
      dot.style.setProperty('--y', `${(item.offsetTop + item.offsetHeight + 4).toFixed(1)}px`);
      if (!placed) requestAnimationFrame(() => requestAnimationFrame(() => nav.classList.remove('is-placing')));
      placed = true;
    };

    const setActive = (id) => {
      links.forEach((a) => {
        const href = a.getAttribute('href') || '';
        const targetId = href.includes('#') ? href.split('#')[1] : href;
        const active = targetId === id;
        a.classList.toggle('is-active', active);
        if (active) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
      placeDot();
    };
    window.addEventListener('resize', placeDot);
    document.fonts?.ready.then(placeDot); // link widths change once Geist has loaded

    setActive('overview');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) setActive(entry.target.id); });
    }, { rootMargin: '-30% 0px -50% 0px' });
    sections.forEach((s) => observer.observe(s));
  }

  /* ---------- Header: tightens up once the page scrolls ---------- */
  // On wide screens .is-folded tucks the links into the menu button (style.css): scrolling
  // down folds them away, scrolling back up brings them back on a pill. --i / --n stagger
  // the links as they go and come back.
  function initHeaderScroll() {
    const header = $('[data-header]') || $('.site-header');
    if (!header) return;
    const items = $$('.site-nav__list > li', header);
    items.forEach((li, i) => li.style.setProperty('--i', i));
    header.style.setProperty('--n', items.length);
    const darks = $$('[data-dark]'); // sections the ink-coloured brand would vanish against
    let queued = false;
    let lastY = window.scrollY; // where the scroll last moved far enough to count
    let folded = lastY > 30;
    const update = () => {
      queued = false;
      const y = window.scrollY;
      const scrolled = y > 30;
      header.classList.toggle('is-scrolled', scrolled);
      // A few pixels of give, so small jitters and momentum bounces don't flick them about
      if (!scrolled) folded = false;
      else if (y > lastY + 8) folded = true;
      else if (y < lastY - 8) folded = false;
      if (!scrolled || Math.abs(y - lastY) > 8) lastY = y;
      header.classList.toggle('is-folded', folded);
      const h = header.offsetHeight;
      header.classList.toggle('is-on-dark', darks.some((el) => {
        const r = el.getBoundingClientRect();
        return r.top < h && r.bottom > h / 2;
      }));
    };
    window.addEventListener('scroll', () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    }, { passive: true });
    update();
  }

  /* ---------- Theme toggle (Light / Dark mode) ---------- */
  // Storage can be blocked (private browsing, strict cookie settings) and then throws; the
  // toggle still works, the choice just isn't remembered
  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* not remembered */ } }
  };

  // Text from a visitor, made safe to pass on: control characters and the invisible
  // direction-override marks that can disguise text are removed, and the length is capped.
  // (It's only ever written into the page with textContent, never as HTML.)
  const clean = (value, max = 200) => String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g, '')
    .trim()
    .slice(0, max);

  // Two toggles: the sun/moon button in the header, and the switch in the menu that stands
  // in for it on phones. Until a visitor picks one, the theme follows their device's
  // light/dark setting, live (the inline script in <head> does the same before first paint).
  function initTheme() {
    const toggles = $$('[data-theme-toggle]');
    const meta = $('meta[name="theme-color"]');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
    const preferred = () => storage.get('theme') || (systemDark.matches ? 'dark' : 'light');
    if (!toggles.length) {
      document.documentElement.dataset.theme = preferred();
      return;
    }

    function apply(t) {
      document.documentElement.dataset.theme = t;
      toggles.forEach((toggle) => {
        const sunIcon = $('.theme-icon-sun', toggle);
        const moonIcon = $('.theme-icon-moon', toggle);
        if (sunIcon && moonIcon) {
          sunIcon.hidden = t === 'dark';
          moonIcon.hidden = t !== 'dark';
        }
        if (toggle.getAttribute('role') === 'switch') toggle.setAttribute('aria-checked', String(t === 'dark'));
      });
      if (meta) meta.setAttribute('content', t === 'dark' ? '#0c0d10' : '#f0f1f3'); // browser UI colour
    }

    apply(preferred());

    toggles.forEach((toggle) => toggle.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      apply(next);
      storage.set('theme', next);
    }));
    systemDark.addEventListener('change', () => { if (!storage.get('theme')) apply(preferred()); });
  }

  /* ---------- Hero: the name, brought into focus letter by letter ---------- */
  // Focus Reveal, adapted from Originkit: each letter sharpens from a soft blur once, on
  // load, then sits still (no loop, no pointer tracking). The heading's own "CobWebZ" text
  // stays put (transparent) so it's read and indexed once. The visible letters are an
  // aria-hidden layer whose text comes from CSS (data-c), so it isn't part of the page's text.
  function initHeroBrand() {
    const brand = $('[data-hero-brand]');
    if (!brand) return;
    const text = brand.textContent.trim();
    const fx = document.createElement('span');
    fx.className = 'hero__brand-fx';
    fx.setAttribute('aria-hidden', 'true');
    const chars = [...text].map((c, i) => {
      const span = document.createElement('span');
      span.className = 'char';
      span.dataset.c = c;
      span.style.setProperty('--i', i);
      fx.append(span);
      return span;
    });
    brand.append(fx);
    brand.classList.add('has-fx');
    // Once every letter is sharp, drop the will-change hints so nothing stays on its own layer
    chars.at(-1)?.addEventListener('transitionend', () => {
      chars.forEach((c) => { c.style.willChange = 'auto'; });
    }, { once: true });
  }

  /* ---------- Menu (dropdown under the Menu pill) ---------- */
  function initMenu() {
    const toggle = $('[data-menu-toggle]');
    const panel = $('[data-menu]');
    if (!toggle || !panel) return;
    const root = toggle.parentElement;

    let closeTimer;
    const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';

    function open() {
      clearTimeout(closeTimer);
      panel.hidden = false;
      void panel.offsetWidth; // commit the hidden→visible change before animating
      panel.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
    }

    function close({ restoreFocus = false } = {}) {
      if (!isOpen()) return;
      panel.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      closeTimer = setTimeout(() => { panel.hidden = true; }, reduceMotion.matches ? 0 : 250);
      if (restoreFocus) toggle.focus({ preventScroll: true });
    }

    toggle.addEventListener('click', () => (isOpen() ? close() : open()));
    $$('a', panel).forEach((link) => link.addEventListener('click', () => close()));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen()) close({ restoreFocus: true });
    });
    // Close on a click outside, or once keyboard focus leaves the menu
    document.addEventListener('click', (e) => { if (!root.contains(e.target)) close(); });
    root.addEventListener('focusout', (e) => {
      if (e.relatedTarget && !root.contains(e.relatedTarget)) close();
    });
    // On wide screens the button folds away when the links come back (back at the top, or
    // on scrolling up); the menu goes with it
    const header = toggle.closest('.site-header');
    const wide = window.matchMedia('(min-width: 1100px)'); // the links bar breakpoint in style.css
    if (header) {
      new MutationObserver(() => {
        if (wide.matches && !header.classList.contains('is-folded')) close();
      }).observe(header, { attributes: true, attributeFilter: ['class'] });
    }
  }

  /* ---------- Split text into words or letters ---------- */
  // Wraps each word (unit 'word') or letter (unit 'char') in a span with --i = its position,
  // keeping inner elements such as .accent, and sets --n = the count on the element.
  // 'both' does the two at once, for text whose letters move on their own: the words are
  // still the spans the lines break between, so a word can never be broken apart, and the
  // letters sit inside them. The letters then carry the running count (--i, and --n on the
  // element) and the words their own (--w, and --words).
  function splitText(root, unit) {
    let i = 0;
    let w = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE) { walk(child); return; }
        if (child.nodeType !== Node.TEXT_NODE) return;
        const frag = document.createDocumentFragment();
        const parts = unit === 'char' ? [...child.textContent] : child.textContent.split(/(\s+)/);
        parts.forEach((part) => {
          if (!part) return;
          if (!part.trim()) { frag.append(part); return; }
          const span = document.createElement('span');
          span.className = unit === 'both' ? 'word' : unit;
          if (unit === 'both') {
            span.style.setProperty('--w', w++);
            [...part].forEach((letter) => {
              const ch = document.createElement('span');
              ch.className = 'char';
              ch.style.setProperty('--i', i++);
              ch.textContent = letter;
              span.append(ch);
            });
          } else {
            span.style.setProperty('--i', i++);
            span.textContent = part;
          }
          frag.append(span);
        });
        child.replaceWith(frag);
      });
    };
    walk(root);
    root.style.setProperty('--n', i);
    if (unit === 'both') root.style.setProperty('--words', w);
  }

  // Gives every letter of a [data-scrub-letters] paragraph the place it flies in from: a
  // point of its own somewhere out across the whole section it sits in. The points are taken
  // from the R2 sequence rather than Math.random(), which spreads them evenly over the area
  // instead of leaving clumps and gaps, and makes a letter come in the same way every time.
  // Each letter's trip is that point less where the letter belongs, which is measured with
  // the line held in its places (.is-measuring), so what's measured is its seat in the line
  // and not wherever it has flown to. style.css carries them home as the section scrolls
  // past (--p). It's worked out again when the line is re-laid, which is only when the page
  // is resized or a late font changes the measurements.
  function scatterLetters(el) {
    const chars = $$('.char', el);
    const section = el.closest('.section');
    if (!chars.length || !section) return;
    const rnd = (k) => {
      const x = Math.sin(k * 127.1 + 311.7) * 43758.545;
      return x - Math.floor(x);
    };
    const INSET = 0.05; // kept just inside the section, so no letter starts on its edge
    const place = () => {
      el.classList.add('is-measuring');
      const box = section.getBoundingClientRect();
      const homes = chars.map((ch) => ch.getBoundingClientRect()); // read together: one layout
      el.classList.remove('is-measuring');
      const span = 1 - 2 * INSET;
      chars.forEach((ch, k) => {
        const fromX = box.left + box.width * (INSET + span * (((k + 1) * 0.7548776662) % 1));
        const fromY = box.top + box.height * (INSET + span * (((k + 1) * 0.5698402909) % 1));
        const home = homes[k];
        ch.style.setProperty('--dx', `${(fromX - (home.left + home.width / 2)).toFixed(1)}px`);
        ch.style.setProperty('--dy', `${(fromY - (home.top + home.height / 2)).toFixed(1)}px`);
        ch.style.setProperty('--r', (rnd(k + 17) * 2 - 1).toFixed(3));
      });
    };
    place();
    document.fonts?.ready.then(place); // the line can shift once the real font is in
    if ('ResizeObserver' in window) {
      // Nothing here changes the section's size, so watching it can't set itself off again
      new ResizeObserver(place).observe(section);
    } else {
      window.addEventListener('resize', place);
    }
  }

  function initSplitText() {
    $$('[data-split-words]').forEach((el) => splitText(el, 'word'));
    $$('[data-scrub-letters]').forEach((el) => {
      splitText(el, 'both');
      scatterLetters(el);
    });
    $$('[data-split-letters]').forEach((el) => {
      splitText(el, 'char');
      el.classList.add('is-split');
    });
  }

  /* ---------- Motion: hero entrance, reveals ---------- */
  function initMotion() {
    $$('[data-hero-step]').forEach((el, i) => el.style.setProperty('--i', i));
    // Children of [data-stagger] reveal one after another
    $$('[data-stagger]').forEach((group) => [...group.children].forEach((el, i) => el.style.setProperty('--i', i)));
    requestAnimationFrame(() => document.body.classList.add('is-loaded'));

    const reveals = $$('.reveal');
    reveals.forEach((el) => {
      const siblings = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
      el.style.setProperty('--delay', `${(siblings.indexOf(el) % 4) * 80}ms`);
    });
    // [data-reveal] gets the same is-visible trigger without the default fade-up
    const extras = $$('[data-reveal]');

    if (!('IntersectionObserver' in window)) {
      [...reveals, ...extras].forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const revealOn = (elements, options) => {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      }, options);
      elements.forEach((el) => observer.observe(el));
    };
    revealOn(reveals, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    // The footer word sits flush with the bottom of the page, so any visible sliver counts
    revealOn(extras, { threshold: 0 });
  }

  /* ---------- Hero field: the drifting layer the hero and About scroll over ---------- */
  // The spheres are CSS alone (style.css, "Hero field"); this is only the network of dots
  // that join up as they drift, drawn by tsParticles into #hero-particles. Everything here
  // is decoration, so it gives up easily: no element, no library (the CDN blocked, offline,
  // or the integrity check refused the file), or reduced motion asked for, and the page is
  // simply itself without it.
  // It is kept cheap: the canvas is the only thing on the page running a frame loop, so it
  // runs only while one of the two sections it belongs to is on screen, the count is cut on
  // small screens, and the pointer is only followed where there is a real one to follow.
  // Pointer events are read from the window rather than the canvas, so the canvas can stay
  // pointer-events: none and everything underneath it stays clickable.
  let heroNet = null; // the running network, which initHeroScroll stops and starts with it
  function initHeroField() {
    const box = $('#hero-particles');
    const layer = $('.hero-field');
    if (!box || !layer) return;
    // The layer belongs to the whole page now, so it is simply up for all of it. Asking for
    // reduced motion stops below: the spheres stay where style.css puts them and the network
    // is never started, but the five of them are still there to look at, still.
    layer.classList.add('is-live');
    if (reduceMotion.matches) return;

    const narrow = window.matchMedia('(max-width: 760px)');
    // The dots take their tone from the page's own ink, so they suit either theme
    const tone = () => {
      const ink = getComputedStyle(document.documentElement).getPropertyValue('--color-ink').trim();
      return ink || '#8a8d93';
    };
    const options = () => ({
      fpsLimit: 60,
      detectRetina: true,
      fullScreen: { enable: false }, // it lives in the hero, not over the whole page
      background: { color: 'transparent' },
      particles: {
        // A flat count, not a density: spread over an area, a phone's canvas works out at
        // barely a handful of dots, which is no network at all
        number: { value: narrow.matches ? 26 : 64, density: { enable: false } },
        color: { value: tone() },
        shape: { type: 'circle' },
        opacity: { value: narrow.matches ? 0.34 : 0.45 },
        size: { value: { min: 1, max: 2.2 } },
        links: { enable: true, color: tone(), distance: 132, opacity: 0.3, width: 1 },
        move: { enable: true, speed: 0.45, direction: 'none', straight: false, random: false, outModes: { default: 'out' } }
      },
      interactivity: {
        detectsOn: 'window', // so the canvas itself can stay out of the way of the buttons
        events: {
          onHover: { enable: finePointer.matches, mode: 'grab' },
          resize: { enable: true }
        },
        modes: { grab: { distance: 150, links: { opacity: 0.55 } } }
      }
    });

    const start = () => {
      // The bundle hands over its parts in a loader rather than fitting them to the engine
      // itself: without this call the engine still makes particles, but nothing registered
      // to move or draw them, and options like the links go unread. (It is loadSlim in the
      // slim bundle and loadAll in the full one; either will do.)
      const register = window.loadSlim || window.loadAll;
      if (heroNet || !window.tsParticles || !register) return;
      Promise.resolve(register(tsParticles))
        .then(() => tsParticles.load({ element: box, options: options() }))
        .then((container) => { heroNet = container; })
        .catch(() => {}); // decoration: if it will not start, it stays away
    };


    // Deferred, so the library usually lands after this runs; either way it is caught
    const tag = $('#tsparticles-lib');
    if (window.tsParticles) start();
    else if (tag) tag.addEventListener('load', start, { once: true });

    // The theme switch repaints the dots in the new ink
    new MutationObserver(() => {
      if (!heroNet) return;
      const ink = tone();
      heroNet.options.particles.color.value = ink;
      heroNet.options.particles.links.color.value = ink;
      heroNet.refresh();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  /* ---------- Hero → About: the field stays, the name lifts away, the statement arrives ---------- */
  // Three beats, all tied to the scroll itself (GSAP ScrollTrigger, scrubbed) rather than
  // played on a timer, so they follow the scroll exactly, forwards and back:
  //   1. the field stays. It is fixed (style.css), so it simply does not move while the
  //      sections travel over it; nothing animates it here until it is no longer wanted.
  //   2. the hero's text lifts and fades out over the first stretch of the hero, leaving the
  //      spheres and the network on an otherwise empty screen. autoAlpha, not opacity, so
  //      once it has gone it is visibility: hidden too and cannot take keyboard focus.
  //   3. the About statement arrives into that: its letters fly to their places on --p
  //      (initScrollEffects), which is already running by then, so the two overlap by
  //      design rather than waiting on one another.
  // Then, once About has gone with it, the field itself fades and its loop is stopped.
  // Everything is inside gsap.matchMedia, so asking for reduced motion gets the plain page
  // and ScrollTrigger cleans itself up. If GSAP never arrives, the sections just scroll:
  // the layer still appears and goes with the IntersectionObserver above.
  function initHeroScroll() {
    const hero = $('.hero--home');
    if (!hero) return;

    // ---- The roam ----
    // The spheres don't sit in one place and drift: they cross the whole page. Every section
    // is a stop on one scrubbed timeline, and at each stop the five of them travel to a fresh
    // arrangement, so scrolling the site pulls them through a continuous re-forming rather
    // than a loop that repeats. Scroll back up and they retrace it exactly.
    // Where each one goes is worked out, not written down: a number derived from the
    // section's and the sphere's own position (so it is the same arrangement on every visit,
    // and the page can gain or lose sections without anything here needing a new entry)
    // mapped into a band down one side or the other, alternating so the page always carries
    // weight on both edges and the middle, where the words are, is left alone. Sizes vary
    // with it, and none grows past its starting size, so nothing swells over the text.
    // The arrangement is given as a position on screen and turned into an offset from where
    // the sphere's own layout puts it; offsetLeft/offsetTop are read for that because, unlike
    // a bounding rect, they ignore both the CSS drift and this timeline's own transform. Each
    // is a function so invalidateOnRefresh can work them out again at a new window size.
    // It all rides on transform, while the spheres' own wander (style.css, orb-drift-*) rides
    // on translate: two separate properties the browser adds together, so the wander carries
    // on underneath the journey instead of being overwritten by it.
    function roam() {
      const orbs = $$('.hero-field__orb');
      const sections = $$('main > section');
      if (!orbs.length || !sections.length) return;
      const { mapRange } = gsap.utils;
      // A repeatable number from a pair of whole numbers, standing in for a seeded random
      const pick = (a, b) => {
        const x = Math.sin(a * 127.1 + b * 311.7 + 74.7) * 43758.545;
        return x - Math.floor(x);
      };
      const home = (el) => ({ x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop + el.offsetHeight / 2 });
      const spot = (s, k) => {
        const inset = mapRange(0, 1, 0.02, 0.2, pick(s + 1, k + 1)); // how far in from its edge
        // Which edge. A sphere keeps a side for two steps at a time and the spheres are
        // offset against each other, so at any moment most are settling along an edge and
        // only one or two are crossing. Were they all to swap at once they would meet in
        // the middle of the screen every step, right over the column the words are set in.
        const side = (k + Math.floor(s / 2)) % 2 === 0 ? inset : 1 - inset;
        return {
          x: window.innerWidth * side,
          y: window.innerHeight * mapRange(0, 1, 0.08, 0.92, pick(s + 7, k + 3)),
          scale: mapRange(0, 1, 0.55, 1, pick(s + 11, k + 5))
        };
      };

      // One timeline for the whole journey: a step per section, every sphere moving within
      // each step, so the page's scroll drives one animation rather than dozens of triggers.
      const tl = gsap.timeline({
        defaults: { ease: 'none', duration: 1 },
        scrollTrigger: {
          trigger: document.documentElement,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1, // a second of catching up, so the journey glides rather than jerks
          invalidateOnRefresh: true
        }
      });
      sections.forEach((sec, s) => {
        orbs.forEach((orb, k) => {
          // Each sphere sets off a little after the one before it, so a step is a loose
          // procession rather than five things moving in lockstep. The sideways part of the
          // trip is the short one: a sphere that is changing edges gets across quickly and
          // then takes the rest of the step drifting up or down, which keeps the crossing
          // brief and the middle of the screen clear.
          const at = s + k * 0.1;
          tl.to(orb, { x: () => spot(s, k).x - home(orb).x, duration: 0.55 }, at);
          tl.to(orb, {
            y: () => spot(s, k).y - home(orb).y,
            scale: () => spot(s, k).scale
          }, at);
        });
      });
    }

    const start = () => {
      if (!window.gsap || !window.ScrollTrigger) return;
      gsap.registerPlugin(ScrollTrigger);
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // Created down the page, so they refresh in the order they appear on it
        gsap.to($('.hero__inner', hero), {
          y: () => -window.innerHeight * 0.16,
          autoAlpha: 0,
          ease: 'none',
          scrollTrigger: { trigger: hero, start: 'top top', end: '45% top', scrub: true }
        });
        // The hint has done its job as soon as the page moves
        gsap.to($('.scroll-cue', hero), {
          autoAlpha: 0,
          ease: 'none',
          scrollTrigger: { trigger: hero, start: 'top top', end: '12% top', scrub: true }
        });
        roam();
      });
      // The About statement is split and measured after the fonts land, which can move
      // everything below it; ScrollTrigger needs telling once that has settled
      document.fonts?.ready.then(() => ScrollTrigger.refresh());
    };

    const tag = $('#gsap-scrolltrigger'); // deferred, and loaded after gsap itself
    if (window.gsap && window.ScrollTrigger) start();
    else if (tag) tag.addEventListener('load', start, { once: true });
  }

  /* ---------- Scroll-linked: [data-scrub] ---------- */
  // Each [data-scrub] element gets --p from 0 (its top approaches the screen bottom) to
  // 1 (comfortably centered in view); CSS turns that into the effect. Once --p has run all
  // the way through, the element is also marked .is-settled, which is what style.css waits
  // on to play anything that belongs after the scrub has finished.
  function initScrollEffects() {
    const scrubs = $$('[data-scrub]');
    if (!scrubs.length) return;
    let queued = false;

    function update() {
      queued = false;
      const vh = window.innerHeight;
      scrubs.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -vh || r.top > vh * 2) return; // far off screen: nothing to update
        const p = Math.min(1, Math.max(0, (vh * 1.05 - r.top) / (vh * 0.32 + r.height)));
        el.style.setProperty('--p', p.toFixed(3));
        // Dropped again well short of the end, so scrolling back up and down plays it afresh
        // without it flickering on and off while you sit at the boundary
        if (p >= 1) el.classList.add('is-settled');
        else if (p < 0.9) el.classList.remove('is-settled');
      });
    }
    const queue = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    };
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    update();
  }

  /* ---------- About: the spider mark you can pull on its web ---------- */
  // CSS spins the mark in from --p. Once it has landed (--p > .72) the spider leans toward
  // the pointer, can be dragged (it springs back on release) and hops when tapped. Its
  // back legs are the W's inner threads, so their ends are re-plotted to stay attached.
  // The W's outer threads bow with the pull and ring when struck: swept across, tapped, or
  // snapped back by a hard release, which also sends a tremor through the statement.
  // A fast swipe right past startles it, and left alone it fidgets.
  function initSpiderMark() {
    const root = $('[data-spider]');
    if (!root) return;
    const svg = $('svg', root);
    const bug = $('.spider__bug', root);
    const arms = $$('.spider__arm', root);
    const legs = $$('.spider__leg', root);
    const hint = $('.about__hint', root);
    const scrub = root.closest('[data-scrub]');
    const statement = scrub && $('[data-scrub-letters]', scrub);
    const C = { x: 387.5, y: 281 }; // body centre, in viewBox units
    const nums = (s) => s.match(/-?\d+(?:\.\d+)?/g).map(Number);
    // M x y C x y x y x y C x y x y x y → 14 numbers per arm
    const base = arms.map((arm) => nums(arm.getAttribute('d')));
    const REACH = 170; // how far the spider can be pulled before the thread resists
    // The outer threads are M … C … A L B C …; only the straight run A→B moves, re-plotted
    // as a curve whose control point sits off its middle along the normal n
    const threads = $$('.spider__thread:not(.spider__arm)', root).map((el) => {
      const d = el.getAttribute('d');
      const [head, tail] = d.split('L');
      const [ax, ay] = nums(head).slice(-2);
      const [bx, by] = nums(tail);
      const len = Math.hypot(bx - ax, by - ay);
      return { el, d, head, tail, ax, ay, bx, by, len, nx: (ay - by) / len, ny: (bx - ax) / len, a: 0, v: 0, shown: 0 };
    });

    let x = 0, y = 0, vx = 0, vy = 0, angle = 0; // current pose
    let tx = 0, ty = 0;                          // where it wants to be
    let lean = { x: 0, y: 0 };                   // where watching the pointer puts it
    let frame = 0;
    let drag = null;
    let hovering = false;
    let onScreen = !('IntersectionObserver' in window);
    let startled = 0, calmAt = 0; // flinch timer; no new startle before calmAt
    let idle = 0, fidgetEnd = 0;  // fidget timers

    const live = () => root.classList.contains('is-live');
    const toSvg = (e) => new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());

    function render() {
      bug.style.transform = `translate(${x}px, ${y}px) rotate(${angle}deg)`;
      const rad = (angle * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      // A point on the body, after the body has moved and turned
      const pin = (px, py) => [
        C.x + x + (px - C.x) * cos - (py - C.y) * sin,
        C.y + y + (px - C.x) * sin + (py - C.y) * cos
      ];
      // The thread stays anchored at the bottom of the W. Its middle (the join and the two
      // handles either side of it) moves half as far as the spider, all together so the
      // curve stays smooth; its last handle and end ride on the body.
      const r = (n) => n.toFixed(1);
      const mid = (px, py) => `${r(px + x * 0.5)} ${r(py + y * 0.5)}`;
      arms.forEach((arm, i) => {
        const b = base[i];
        const [c2x, c2y] = pin(b[10], b[11]);
        const [ex, ey] = pin(b[12], b[13]);
        arm.setAttribute('d', `M${b[0]} ${b[1]} C${r(b[2] + x * 0.15)} ${r(b[3] + y * 0.15)} ` +
          `${mid(b[4], b[5])} ${mid(b[6], b[7])} C${mid(b[8], b[9])} ${r(c2x)} ${r(c2y)} ${r(ex)} ${r(ey)}`);
      });
    }

    // The springs were tuned per 60 Hz frame. Stepping them at exactly that rate, however fast
    // the screen refreshes, keeps the motion the same on 60, 120 and 144 Hz displays.
    const STEP = 1000 / 60;
    let lastTime = 0;
    let carry = 0;
    let ta = 0;
    function step() {
      if (drag) {
        const px = x;
        const py = y;
        x += (tx - x) * 0.35;
        y += (ty - y) * 0.35;
        vx = x - px;
        vy = y - py;
      } else {
        // Springy for everyone else; settles without wobbling for reduced motion
        const damping = reduceMotion.matches ? 0.55 : 0.86;
        vx = (vx + (tx - x) * 0.09) * damping;
        vy = (vy + (ty - y) * 0.09) * damping;
        x += vx;
        y += vy;
      }
      // Leans into the direction it's being pulled, and swings with its momentum
      ta = Math.max(-20, Math.min(20, x * 0.18 + vx * 1.6));
      angle += (ta - angle) * 0.2;
      return swing();
    }
    function tick(now) {
      carry += lastTime ? Math.min(100, now - lastTime) : STEP;
      lastTime = now;
      let ringing = false;
      let steps = 0;
      while (carry >= STEP && steps < 6) {
        ringing = step() || ringing;
        carry -= STEP;
        steps++;
      }
      if (steps === 6) carry = 0; // after a stall, don't try to catch up
      root.classList.toggle('is-scuttling', Math.hypot(vx, vy) > 0.5);
      render();
      drawThreads();

      const settled = steps && !drag && !ringing && Math.abs(tx - x) + Math.abs(ty - y) < 0.05 &&
        Math.abs(vx) + Math.abs(vy) < 0.05 && Math.abs(ta - angle) < 0.05;
      frame = settled ? 0 : requestAnimationFrame(tick);
      if (!frame) lastTime = carry = 0;
    }
    const wake = () => { if (!frame) frame = requestAnimationFrame(tick); };

    // The outer threads bow a little with the pull (rest) and ring around it when struck;
    // true while any is still moving
    function swing() {
      let ringing = false;
      const damping = reduceMotion.matches ? 0.4 : 0.9;
      threads.forEach((t) => {
        const rest = (x * t.nx + y * t.ny) * 0.1;
        t.v = (t.v + (rest - t.a) * 0.3) * damping;
        t.a += t.v;
        if (Math.abs(rest - t.a) + Math.abs(t.v) < 0.05) { t.a = rest; t.v = 0; } else ringing = true;
      });
      return ringing;
    }
    function drawThreads() {
      threads.forEach((t) => {
        const a = Math.abs(t.a) < 0.05 ? 0 : Math.round(t.a * 10) / 10;
        if (a === t.shown) return;
        t.shown = a;
        // A quadratic's middle sits halfway to its control point, so 2a bows it by a
        const qx = (t.ax + t.bx) / 2 + t.nx * a * 2;
        const qy = (t.ay + t.by) / 2 + t.ny * a * 2;
        t.el.setAttribute('d', a ? `${t.head}Q${qx.toFixed(1)} ${qy.toFixed(1)} ${t.tail}` : t.d);
      });
    }

    // Strikes thread t at w (0 at A … 1 at B) with a kick along its normal
    function ring(t, kick, w = 0.5) {
      if (reduceMotion.matches) return;
      t.v += kick * Math.sin(Math.PI * Math.min(0.9, Math.max(0.1, w)));
      wake();
    }
    // Plucked by hand: the spider feels it through the web and gives a start
    function pluck(t, kick, w) {
      if (reduceMotion.matches) return;
      ring(t, kick, w);
      vx += t.nx * kick * 0.15;
      vy += t.ny * kick * 0.15 + Math.abs(kick) * 0.1;
      learn('pluck');
    }
    // How far point p is off thread t (+ along n), and how far along it (0 at A … 1 at B)
    const side = (t, p) => (p.x - t.ax) * t.nx + (p.y - t.ay) * t.ny;
    const along = (t, p) => ((p.x - t.ax) * (t.bx - t.ax) + (p.y - t.ay) * (t.by - t.ay)) / (t.len * t.len);

    // A pointer moving from → to strums any thread it crosses, harder the faster it goes
    function strum(from, to) {
      threads.forEach((t) => {
        const s1 = side(t, from);
        const s2 = side(t, to);
        if (s1 * s2 >= 0) return;
        const u = s1 / (s1 - s2);
        const w = along(t, { x: from.x + (to.x - from.x) * u, y: from.y + (to.y - from.y) * u });
        if (w > 0 && w < 1) pluck(t, Math.sign(s2) * Math.min(16, Math.max(4, Math.abs(s2 - s1) * 0.35)), w);
      });
    }

    // How close the segment a→b passes to point c
    function passBy(a, b, c) {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const u = Math.min(1, Math.max(0, ((c.x - a.x) * dx + (c.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
      return Math.hypot(a.x + dx * u - c.x, a.y + dy * u - c.y);
    }

    // A fast swipe close by makes it duck away and pull its legs in (style.css: .is-startled)
    function startle(p) {
      const dx = C.x + x - p.x;
      const dy = C.y + y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      tx = (dx / d) * 32;
      ty = (dy / d) * 32;
      root.classList.add('is-startled');
      clearTimeout(startled);
      startled = setTimeout(calm, 520);
      calmAt = performance.now() + 1600;
      wake();
    }
    function calm() {
      clearTimeout(startled);
      startled = 0;
      root.classList.remove('is-startled');
      if (drag) return;
      tx = lean.x;
      ty = lean.y;
      wake();
    }

    // A hard snap-back shakes the words too (style.css: .is-trembling); --tremor is how far
    function tremor(strength) {
      if (!statement || reduceMotion.matches) return;
      statement.style.setProperty('--tremor', `${(1.5 + strength * 2.5).toFixed(1)}px`);
      statement.classList.remove('is-trembling');
      void statement.offsetWidth; // restart it if it's still going
      statement.classList.add('is-trembling');
    }

    // Left alone (on screen, no pointer over the section) it fidgets every few seconds:
    // waves a front leg, looks about, or tugs on its web
    function scheduleFidget() {
      clearTimeout(idle);
      if (onScreen && !reduceMotion.matches) idle = setTimeout(fidget, 2500 + Math.random() * 3500);
    }
    function fidget() {
      if (live() && !drag && !hovering && !startled && !document.hidden) {
        const pick = Math.random();
        const leg = legs[Math.round(Math.random())]; // one of the front pair
        if (pick < 0.4 && leg && leg.animate) {
          const s = (parseFloat(leg.style.getPropertyValue('--s')) || 9) * -1.6;
          leg.animate({ rotate: ['0deg', `${s}deg`, '0deg', `${s}deg`, '0deg'] },
            { duration: 560, easing: 'ease-in-out' });
        } else if (pick < 0.75) {
          tx = (Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * 8);
          ty = Math.random() * 8 - 5;
          settleAfter(900 + Math.random() * 700);
        } else {
          ty = 14;
          threads.forEach((t) => ring(t, 3));
          settleAfter(220);
        }
        wake();
      }
      scheduleFidget();
    }
    function settleAfter(ms) {
      clearTimeout(fidgetEnd);
      fidgetEnd = setTimeout(() => {
        if (drag || hovering) return;
        tx = ty = 0;
        wake();
      }, ms);
    }

    // The hint teaches one move at a time, then gets out of the way
    const lessons = { drag: 'Drag the spider' };
    if (!reduceMotion.matches) lessons.pluck = 'Pluck the web';
    let hintTimer = 0;
    function learn(move) {
      if (!(move in lessons)) return;
      delete lessons[move];
      const next = Object.values(lessons)[0];
      if (!hint || next === hint.textContent) return;
      root.classList.add('is-hint-off');
      clearTimeout(hintTimer);
      if (next) {
        hintTimer = setTimeout(() => {
          hint.textContent = next;
          root.classList.remove('is-hint-off');
        }, 1400);
      }
    }

    // Live only once the scroll animation has finished drawing it
    function syncLive() {
      const p = reduceMotion.matches ? 1 : parseFloat(scrub?.style.getPropertyValue('--p') || '1');
      const on = p > 0.72;
      if (on === live()) return;
      root.classList.toggle('is-live', on);
      if (!on && !drag) { tx = ty = 0; wake(); }
    }
    // Once a frame, after initScrollEffects has written that frame's --p
    let syncQueued = false;
    window.addEventListener('scroll', () => {
      if (syncQueued) return;
      syncQueued = true;
      requestAnimationFrame(() => {
        syncQueued = false;
        syncLive();
      });
    }, { passive: true });
    syncLive();

    // Mouse: it watches the pointer, leaning a little toward it; sweeping across the W
    // strums it, and a fast swipe right past the spider startles it
    if (finePointer.matches && scrub) {
      let last = null; // the previous pointer sample
      scrub.addEventListener('pointerenter', () => { hovering = true; last = null; });
      scrub.addEventListener('pointermove', (e) => {
        hovering = true;
        if (drag || !live() || reduceMotion.matches) { last = null; return; }
        const p = toSvg(e);
        const now = performance.now();
        if (last) {
          strum(last.p, p);
          const speed = Math.hypot(e.clientX - last.cx, e.clientY - last.cy) / Math.max(4, now - last.t);
          if (speed > 2 && now > calmAt && passBy(last.p, p, { x: C.x + x, y: C.y + y }) < 130) startle(p);
        }
        last = { p, cx: e.clientX, cy: e.clientY, t: now };
        const dx = p.x - C.x;
        const dy = p.y - C.y;
        const d = Math.hypot(dx, dy) || 1;
        const reach = Math.min(26, d * 0.07);
        lean = { x: (dx / d) * reach, y: (dy / d) * reach };
        if (!startled) {
          tx = lean.x;
          ty = lean.y;
        }
        wake();
      });
      scrub.addEventListener('pointerleave', () => {
        hovering = false;
        last = null;
        lean = { x: 0, y: 0 };
        if (drag || startled) return;
        tx = ty = 0;
        wake();
      });
    }

    // A tap on (or near) one of the W's outer threads plucks it
    svg.addEventListener('pointerdown', (e) => {
      if (!live() || e.button > 0 || e.target.closest('.spider__bug')) return;
      const p = toSvg(e);
      let hit = null;
      let gap = 60; // how near a thread counts, in viewBox units
      threads.forEach((t) => {
        const off = Math.abs(side(t, p));
        const w = along(t, p);
        if (w > 0 && w < 1 && off < gap) { hit = t; gap = off; }
      });
      if (hit) pluck(hit, side(hit, p) > 0 ? -12 : 12, along(hit, p));
    });

    bug.addEventListener('pointerdown', (e) => {
      if (!live() || e.button > 0) return;
      e.preventDefault();
      bug.setPointerCapture(e.pointerId);
      if (startled) calm();
      clearTimeout(fidgetEnd);
      const p = toSvg(e);
      drag = { id: e.pointerId, gx: p.x - x, gy: p.y - y, sx: p.x, sy: p.y, moved: false };
      root.classList.add('is-dragging');
      learn('drag');
      wake();
    });
    bug.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const p = toSvg(e);
      const nx = p.x - drag.gx;
      const ny = p.y - drag.gy;
      // The further it's pulled, the harder the thread pulls back
      const d = Math.hypot(nx, ny);
      const k = d ? (REACH * Math.tanh(d / REACH)) / d : 0;
      tx = nx * k;
      ty = ny * k;
      if (Math.hypot(p.x - drag.sx, p.y - drag.sy) > 6) drag.moved = true;
      wake();
    });
    const release = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.moved && !reduceMotion.matches) vy -= 16; // a tap makes it hop
      // Let go from far out, it snaps back: the W twangs and the statement shivers
      const pulled = Math.hypot(x, y);
      if (drag.moved && pulled > 60) {
        threads.forEach((t) => ring(t, -Math.sign(x * t.nx + y * t.ny) * pulled * 0.06));
        tremor(pulled / REACH);
      }
      drag = null;
      tx = lean.x;
      ty = lean.y;
      root.classList.remove('is-dragging');
      wake();
    };
    bug.addEventListener('pointerup', release);
    bug.addEventListener('pointercancel', release);

    // Fidgets only while it's on screen
    if (onScreen) scheduleFidget();
    else {
      new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting;
        if (onScreen) scheduleFidget();
        else clearTimeout(idle);
      }).observe(root);
    }
  }

  /* ---------- Our Services: the spider walks a web with depth ---------- */
  // The web is a shallow bowl in three dimensions, drawn into [data-services-silk] (viewBox
  // -300…300, hub at 0 0): 12 spokes that curve down from the rim to the hub, which sits
  // DEPTH behind it, and 8 rings that step back with them and dip between the spokes. There
  // is no canvas and no 3D library: each thread is one SVG path whose few points project()
  // turns and gives perspective, and the paths are only rewritten while the view is
  // changing, so a web that's sitting still costs nothing.
  // The bowl always leans toward wherever the spider is, which brings the service it's on
  // nearest; with a mouse it also gives a little under the pointer. The service points, the
  // number in the hub and the spider are ordinary elements, moved to where their spot on
  // the bowl lands on the page, so their text stays flat-on and sharp.
  // Each service point sits on the ring of radius PATH_R at its angle --a (CSS places the
  // buttons from the same angle, flat; redraw() moves them from there). Scrolling through
  // the section moves from one service to the next; each change walks the spider round that
  // ring to it, laying a thread behind it, rolls the number in the hub and shows its panel.
  // The spider rides a critically damped spring, timed in seconds rather than frames, so it
  // eases into and out of every move at any frame rate; it turns round instead of flipping,
  // its legs step with the ground it covers, and it's placed with a transform, so it glides
  // between pixels instead of jumping from one to the next.
  function initServices() {
    const root = $('[data-services]');
    if (!root) return;
    const web = $('.services__web', root);
    const silk = $('[data-services-silk]', root);
    const spider = $('[data-services-spider]', root);
    const count = $('[data-services-count]', root);
    const panelBox = $('.services__panels', root);
    const tabs = $$('[data-service-tab]', root);
    const panels = tabs.map((tab) => document.getElementById(tab.getAttribute('aria-controls')));
    if (!web || !silk || !spider || !tabs.length) return;

    const SPOKES = 12;
    const HUB_R = 58;
    const RIM_R = 296; // where the spokes end
    const PATH_R = 195;
    const RINGS = [84, 112, 140, 168, PATH_R, 224, 254, 284];
    const SAG = 0.955; // how far each span between two spokes dips toward the hub
    // The bowl, in the web's own units: x to the right, y down, z toward the viewer
    const DEPTH = 190; // how far behind the rim its middle sits
    const CAMERA = 720; // the viewer's distance: nearer means stronger perspective
    const LEAN = 0.34; // how far it leans toward the spider, in radians (about 19°)
    const TILT = 0.13; // how far it gives under the pointer, edge to middle (about 7°)
    const FIT = 0.9; // drawn a little smaller, so the leaning rim stays inside its box
    const depth = (r) => -DEPTH * (1 - (r / RIM_R) ** 2); // a dish: level at the rim, deepest at the hub
    const PIVOT = depth(PATH_R); // it turns about the level of the ring the spider walks
    const f = (n) => n.toFixed(1);
    const at = (r, deg) => [r * Math.cos((deg * Math.PI) / 180), r * Math.sin((deg * Math.PI) / 180)];

    // The view: the direction the bowl leans in (leanX, leanY; that side comes toward the
    // viewer) and how far, set by aimView(). project() turns a point of the bowl about PIVOT
    // and gives it perspective. It leaves its answer in px, py (web units on the flat page)
    // and pk (how big things are drawn there) rather than making an array for every point.
    let leanX = 1;
    let leanY = 0;
    let sinL = 0;
    let cosL = 1;
    let px = 0;
    let py = 0;
    let pk = 1;
    const project = (x, y, z) => {
      const along = x * leanX + y * leanY; // across the bowl, toward the leaning side
      const across = y * leanX - x * leanY; // at right angles to that, which the lean leaves alone
      const deep = z - PIVOT;
      const turned = along * cosL - deep * sinL;
      pk = (FIT * CAMERA) / (CAMERA - (along * sinL + deep * cosL));
      px = (turned * leanX - across * leanY) * pk;
      py = (turned * leanY + across * leanX) * pk;
    };

    // Every thread is one path of curves. Its points are kept as x, y, z triples (a start,
    // then control-and-end pairs) and redraw() projects them into the path's d.
    const NS = 'http://www.w3.org/2000/svg';
    const threads = [];
    const thread = (cls, pts, i) => {
      const el = document.createElementNS(NS, 'path');
      el.setAttribute('class', cls);
      el.setAttribute('pathLength', '1');
      if (i !== undefined) el.style.setProperty('--i', i);
      silk.append(el);
      if (pts) {
        el.style.stroke = 'url(#services-depth)'; // set here, not in style.css, where "#…" would point into the stylesheet
        threads.push({ el, pts });
      }
      return el;
    };
    const on = (r, deg) => [...at(r, deg), depth(r)]; // a point on the bowl
    // A ring: its corners on the spokes and, between each pair, a control point bow of the
    // way out, so a bow under 1 dips every span toward the hub
    const ringPts = (r, bow) => {
      const pts = on(r, 0);
      for (let k = 1; k <= SPOKES; k++) pts.push(...on(r * bow, ((k - 0.5) * 360) / SPOKES), ...on(r, (k * 360) / SPOKES));
      return pts;
    };
    // Two things make the threads read as near or far. Those further down the bowl are
    // drawn a little fainter (shade), and every thread is stroked with one gradient that
    // runs across the web the way it leans, full strength on the near side and fading
    // toward the far one; draw() only has to re-aim that gradient.
    const shade = (r) => (0.55 + 0.45 * ((r - HUB_R) / (RIM_R - HUB_R))).toFixed(2);
    silk.textContent = '';
    const fade = document.createElementNS(NS, 'linearGradient');
    fade.id = 'services-depth';
    fade.setAttribute('gradientUnits', 'userSpaceOnUse');
    const farStop = document.createElementNS(NS, 'stop');
    const nearStop = document.createElementNS(NS, 'stop');
    nearStop.setAttribute('offset', 1);
    [farStop, nearStop].forEach((stop) => stop.setAttribute('stop-color', 'currentColor'));
    fade.append(farStop, nearStop);
    silk.append(fade);

    thread('s-hub', ringPts(HUB_R, 1 / Math.cos(Math.PI / SPOKES))); // bowed out instead: a round hub
    for (let k = 0; k < SPOKES; k++) {
      const deg = (k * 360) / SPOKES;
      // The dish's slope is a parabola, which a single curve draws exactly: its control
      // point is halfway out, at the depth where the slopes at the two ends meet
      thread('s-spoke', [...on(HUB_R, deg), ...at((HUB_R + RIM_R) / 2, deg), -DEPTH * (1 - HUB_R / RIM_R), ...on(RIM_R, deg)], k);
    }
    RINGS.forEach((r, i) => {
      thread(`s-ring${r === PATH_R ? ' s-path' : ''}`, ringPts(r, SAG), i).setAttribute('stroke-opacity', r === PATH_R ? 1 : shade(r));
    });
    const trail = thread('services__trail');
    const drop = document.createElementNS(NS, 'line');
    drop.setAttribute('class', 'services__drop is-gone');
    ['x1', 'x2'].forEach((name) => drop.setAttribute(name, 0));
    ['y1', 'y2'].forEach((name) => drop.setAttribute(name, -300));
    silk.append(drop);

    // The logo's spider: three left legs [path, pivot x, pivot y], mirrored for the right
    const legs = [
      ['M352 254C322 240 308 205 316 170C320 155 326 145 332 138', 352, 254],
      ['M346 280C315 272 285 255 278 228C274 212 271 200 270 188', 346, 280],
      ['M352 318C335 328 326 345 327 368C328 388 334 400 342 410', 352, 318]
    ];
    const mirror = (d) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (m, x, y) => `${775 - x} ${y}`);
    spider.innerHTML = '<svg viewBox="255 125 265 300">' +
      legs.map(([d, x, y], i) => {
        const swing = i % 2 ? -9 : 9;
        return `<path class="services__leg" style="--o: ${x}px ${y}px; --s: ${swing}deg" d="${d}"/>` +
          `<path class="services__leg" style="--o: ${775 - x}px ${y}px; --s: ${-swing}deg" d="${mirror(d)}"/>`;
      }).join('') +
      '<path class="services__body" fill-rule="evenodd" d="M347 244A40 40 0 0 1 427 244L427 318A40 40 0 0 1 347 318Z' +
      'M373 249A14 20 0 1 0 401 249A14 20 0 1 0 373 249ZM374 318A13 15 0 1 0 400 318A13 15 0 1 0 374 318Z"/></svg>';

    // A point on the walked ring, p = 0…1 of the way round from angle 0 (clockwise on screen),
    // as it looks now: like project(), it leaves where that is in px, py and its size in pk.
    // It follows the same curves as the drawn ring, so the spider stays on the thread.
    const BOW_DEEP = depth(PATH_R * SAG) - PIVOT; // how much deeper the middle of a span dips
    const ringPoint = (p) => {
      const u = (((p % 1) + 1) % 1) * SPOKES;
      const k = Math.floor(u);
      const t = u - k;
      const [x0, y0] = at(PATH_R, (k * 360) / SPOKES);
      const [x1, y1] = at(PATH_R, ((k + 1) * 360) / SPOKES);
      const [cx, cy] = at(PATH_R * SAG, ((k + 0.5) * 360) / SPOKES);
      const s = 1 - t;
      project(s * s * x0 + 2 * s * t * cx + t * t * x1, s * s * y0 + 2 * s * t * cy + t * t * y1, PIVOT + 2 * s * t * BOW_DEEP);
    };
    // Which way the spider faces when heading round the ring in direction dir (±1), as the
    // ring looks now; 0 = up
    const facing = (p, dir) => {
      ringPoint(p);
      const x0 = px;
      const y0 = py;
      ringPoint(p + dir * 0.002);
      return (Math.atan2(px - x0, -(py - y0)) * 180) / Math.PI;
    };
    const stops = tabs.map((tab) => (((parseFloat(tab.style.getPropertyValue('--a')) || 0) % 360) + 360) % 360 / 360);
    const spots = stops.map((p) => at(PATH_R, p * 360)); // where the CSS puts each service point, flat
    const hub = count?.parentElement; // the number's box, which follows the hub
    // Placed with a transform, in pixels of the web's current size, so moving it never
    // re-lays out the page and it can sit between pixels; k is its size at that depth
    let size = web.clientWidth || 560;
    const place = (x, y, h, k) => {
      spider.style.transform = `translate3d(${((0.5 + x / 600) * size).toFixed(2)}px, ${((0.5 + y / 600) * size).toFixed(2)}px, 0) translate(-50%, -52%) rotate(${h.toFixed(2)}deg) scale(${k.toFixed(3)})`;
    };

    let current = 0;
    let landed = false; // until the spider has dropped onto the web
    let dropping = false; // while it's on its way down

    // Its motion. pos (0…1 round the ring) chases aim on a critically damped spring. Walking
    // to a service, aim itself travels to goal at a steady CRUISE (laps a second), so a long
    // walk has a cruising pace; scrubbed by the scroll, aim is simply the goal. from is where
    // the thread it's laying starts.
    const K = 70;
    const C = 2 * Math.sqrt(K);
    const CRUISE = 0.35;
    const wrap = (d) => d - Math.round(d); // the shorter way round, -0.5…0.5
    let pos = stops[0];
    let vel = 0;
    let goal = pos;
    let aim = pos;
    let from = pos;
    let cruising = false;
    let heading = 1; // +1 clockwise, -1 anticlockwise
    let phase = 0; // where its legs are in their stride
    let stride = 0; // 0 standing still … 1 walking
    let frame = 0;
    let last = 0;
    // The pointer's tilt, in radians each way; tick() eases it toward its goal
    let tiltX = 0;
    let tiltY = 0;
    let tiltGoalX = 0;
    let tiltGoalY = 0;
    // The thread last laid: where it starts and how far round it runs (it's kept while it fades)
    let trailFrom = pos;
    let trailLen = 0;

    // Points the view: the bowl leans toward the spider, plus whatever the pointer adds
    function aimView() {
      const a = pos * 2 * Math.PI;
      const vx = LEAN * Math.cos(a) + tiltX;
      const vy = LEAN * Math.sin(a) + tiltY;
      const lean = Math.hypot(vx, vy);
      leanX = lean > 1e-6 ? vx / lean : 1;
      leanY = lean > 1e-6 ? vy / lean : 0;
      sinL = Math.sin(lean);
      cosL = Math.cos(lean);
    }
    aimView();
    let angle = facing(pos, 1); // the way it's drawn facing, which turns toward heading

    // Plots everything as the view now has it: every thread, the service points, the number
    // in the hub, and (once it has landed) the spider and the thread it's laying
    function draw() {
      aimView();
      // the gradient runs from the far side to the near one, and fades more the more it leans
      const reach = RIM_R * FIT;
      fade.setAttribute('x1', f(-leanX * reach));
      fade.setAttribute('y1', f(-leanY * reach));
      fade.setAttribute('x2', f(leanX * reach));
      fade.setAttribute('y2', f(leanY * reach));
      const farOp = Math.max(0.3, 1 - 1.9 * sinL);
      farStop.setAttribute('stop-opacity', farOp.toFixed(2));
      for (const { el, pts } of threads) {
        project(pts[0], pts[1], pts[2]);
        let d = `M${f(px)} ${f(py)}`;
        for (let j = 3; j < pts.length; j += 6) {
          project(pts[j], pts[j + 1], pts[j + 2]);
          d += `Q${f(px)} ${f(py)}`;
          project(pts[j + 3], pts[j + 4], pts[j + 5]);
          d += ` ${f(px)} ${f(py)}`;
        }
        el.setAttribute('d', d);
      }
      // The service points keep their flat 44px target, and are only moved from their flat
      // places with translate, so nothing is laid out again. How far round the bowl each one
      // has gone is passed to style.css instead: --k is how big that spot is drawn at its
      // depth, which sizes the point and its name, and --f how much of the silk's tone
      // reaches it, which the dot takes, so the near points come forward and the far ones
      // sit back into the web. The names keep their full strength, whatever their depth.
      const unit = size / 600;
      const dim = Math.max(0.55, farOp); // they never go as faint as the far silk
      spots.forEach(([x, y], i) => {
        project(x, y, PIVOT);
        const tab = tabs[i];
        tab.style.translate = `calc(-50% + ${((px - x) * unit).toFixed(2)}px) calc(-50% + ${((py - y) * unit).toFixed(2)}px)`;
        tab.style.setProperty('--k', (pk / FIT).toFixed(3));
        const near = (x * leanX + y * leanY) / PATH_R; // -1 right away … 1 nearest
        tab.style.setProperty('--f', (dim + (1 - dim) * (0.5 + 0.5 * near)).toFixed(3));
      });
      if (hub) {
        project(0, 0, depth(0));
        hub.style.translate = `${(px * unit).toFixed(2)}px ${(py * unit).toFixed(2)}px`;
        hub.style.scale = (pk * cosL).toFixed(3);
      }
      if (!landed) return; // still to drop in: until then the intro places it

      ringPoint(pos);
      place(px, py, angle, pk);
      spider.style.setProperty('--g', (Math.sin(phase) * stride).toFixed(3));
      const len = wrap(pos - from);
      const laying = Math.abs(len) > 0.003;
      trail.classList.toggle('is-on', laying); // off, the last thread fades
      if (laying) {
        trailFrom = from;
        trailLen = len;
      }
      // Its thread is plotted afresh as well (a point every 5° round the ring), so it stays
      // on the ring while the view turns, even the last one as it fades
      if (trailLen) {
        const steps = Math.max(2, Math.ceil(Math.abs(trailLen) * 72));
        let d = '';
        for (let j = 0; j <= steps; j++) {
          ringPoint(trailFrom + (trailLen * j) / steps);
          d += `${j ? 'L' : 'M'}${f(px)} ${f(py)}`;
        }
        trail.setAttribute('d', d);
      }
    }

    function tick(now) {
      frame = 0;
      const dt = last ? Math.min(1 / 30, (now - last) / 1000) : 1 / 60;
      last = now;
      if (cruising) {
        const d = wrap(goal - aim);
        const step = CRUISE * dt;
        aim = Math.abs(d) <= step ? goal : aim + Math.sign(d) * step;
      } else {
        aim = goal;
      }
      const disp = wrap(aim - pos);
      vel += (K * disp - C * vel) * dt;
      const move = vel * dt;
      pos += move;
      const speed = Math.abs(vel);
      if (speed > 0.004) heading = vel < 0 ? -1 : 1;
      // the pointer's tilt eases in and out
      const ease = 1 - Math.exp(-dt * 6);
      tiltX += (tiltGoalX - tiltX) * ease;
      tiltY += (tiltGoalY - tiltY) * ease;
      const level = Math.abs(tiltGoalX - tiltX) + Math.abs(tiltGoalY - tiltY) < 4e-4;
      aimView(); // before asking which way it faces: that depends on the view
      // turn toward the way it's going, the short way round, rather than flipping at once
      const turn = ((facing(pos, heading) - angle + 540) % 360) - 180;
      angle += turn * (1 - Math.exp(-dt * 14));
      // the legs step with the ground covered, and swing as wide as the pace calls for
      phase += Math.abs(move) * 230;
      stride += (Math.min(1, speed / 0.05) - stride) * (1 - Math.exp(-dt * 10));
      const done = level && aim === goal && Math.abs(disp) < 2e-5 && speed < 5e-4 && Math.abs(turn) < 0.2 && stride < 0.01;
      if (done) {
        pos = aim;
        vel = 0;
        stride = 0;
        tiltX = tiltGoalX;
        tiltY = tiltGoalY;
        if (cruising) {
          cruising = false;
          from = pos; // arrived: the thread it laid fades
        }
      }
      draw();
      if (done) last = 0;
      else frame = requestAnimationFrame(tick);
    }
    const wake = () => { if (!frame) frame = requestAnimationFrame(tick); };

    // With reduced motion it doesn't walk: it's simply at the service
    function jump(to) {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      pos = aim = goal = from = to;
      vel = 0;
      stride = 0;
      cruising = false;
      aimView();
      angle = facing(pos, heading);
      draw();
    }

    function walkTo(target) {
      if (reduceMotion.matches) { jump(target); return; }
      from = pos;
      goal = target;
      cruising = true;
      wake();
    }

    // Before the spider has landed, choosing a service still turns the web to it, so the
    // spider drops onto a web that's already facing the right way
    function turnTo(target) {
      if (dropping) return; // it's on its way down to a spot: leave the web as it is
      if (reduceMotion.matches) { jump(target); return; }
      goal = target;
      cruising = false;
      wake();
    }

    // The number in the hub rolls the way the scroll is going (--dir); a newer number always
    // replaces one still on its way, so quick scrolling can't leave the wrong one showing
    let rollTimer = 0;
    function rollCount(text, dir) {
      if (!count) return;
      clearTimeout(rollTimer);
      if (reduceMotion.matches) { count.textContent = text; return; }
      count.style.setProperty('--dir', dir);
      count.classList.remove('is-in');
      count.classList.add('is-out');
      rollTimer = setTimeout(() => {
        count.textContent = text;
        count.classList.replace('is-out', 'is-in');
        void count.offsetWidth; // start the roll in from the other side
        count.classList.remove('is-in');
      }, 200);
    }

    function select(i) {
      if (i < 0 || i === current) return;
      const dir = i > current ? 1 : -1;
      current = i;
      panelBox?.style.setProperty('--dir', dir); // which way the panels slide (style.css)
      tabs.forEach((tab, j) => {
        const on = j === i;
        tab.classList.toggle('is-active', on);
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
      });
      panels.forEach((panel, j) => {
        if (!panel) return;
        panel.classList.toggle('is-active', j === i);
        if (pinned()) panel.inert = j !== i; // stacked panels all stay readable
      });
      rollCount(String(i + 1).padStart(2, '0'), dir);
      // Before it lands, the web turns and it drops onto the right one; pinned, the scroll
      // walks it (scrubTo)
      if (!landed) turnTo(stops[i]);
      else if (!pinned()) walkTo(stops[i]);
    }

    // Pinned, the spider is walked by the scroll itself, so even a short scroll visibly moves
    // it: it rests on each service for HOLD of the scroll either side, then heads for the
    // next, and is exactly halfway there when the panel changes. The spring eases it after
    // the point the scroll sets, laying a thread from the service it left.
    const HOLD = 0.2;
    function scrubTo(p) {
      if (!landed || tabs.length < 2) return;
      if (reduceMotion.matches) { jump(stops[current]); return; }
      const v = Math.min(tabs.length - 1, Math.max(0, p * tabs.length - 0.5));
      const i = Math.min(tabs.length - 2, Math.floor(v));
      const k = Math.min(1, Math.max(0, (v - i - HOLD) / (1 - 2 * HOLD)));
      from = stops[i];
      goal = from + wrap(stops[i + 1] - from) * k * k * (3 - 2 * k);
      cruising = false;
      wake();
    }

    // Scrolling picks the service. Wide, tall screens pin the section (.is-pinned, style.css)
    // and share its scroll out evenly between the services; narrower ones stack the panels
    // under a sticky web, and the panel passing the lower part of the screen is the one.
    const section = root.closest('.services') || root;
    const roomy = window.matchMedia('(min-width: 960px) and (min-height: 620px)');
    const pinned = () => section.classList.contains('is-pinned');
    section.style.setProperty('--steps', tabs.length);

    let queued = false;
    function fromScroll() {
      queued = false;
      if (!pinned()) return;
      const r = section.getBoundingClientRect();
      const range = r.height - window.innerHeight;
      if (range <= 0) return;
      const p = Math.min(0.9999, Math.max(0, -r.top / range));
      select(Math.floor(p * tabs.length));
      scrubTo(p);
    }
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(fromScroll);
    };
    function setMode() {
      section.classList.toggle('is-pinned', roomy.matches);
      panels.forEach((panel, j) => { if (panel) panel.inert = pinned() && j !== current; });
      onScroll();
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    roomy.addEventListener('change', setMode);
    if ('IntersectionObserver' in window) {
      const band = new IntersectionObserver((entries) => entries.forEach((entry) => {
        if (!pinned() && entry.isIntersecting) select(panels.indexOf(entry.target));
      }), { rootMargin: '-62% 0px -36% 0px' });
      panels.forEach((panel) => panel && band.observe(panel));
    }
    setMode();

    // Choosing a service scrolls to its place, so the page and the web always agree; the
    // spider walks there as the page goes by
    function go(i) {
      const behavior = reduceMotion.matches ? 'auto' : 'smooth';
      if (pinned()) {
        const r = section.getBoundingClientRect();
        const range = r.height - window.innerHeight;
        window.scrollTo({ top: window.scrollY + r.top + ((i + 0.5) / tabs.length) * range, behavior });
      } else {
        panels[i]?.scrollIntoView({ block: 'center', behavior });
      }
    }
    tabs.forEach((tab, i) => tab.addEventListener('click', () => go(i)));
    $('.services__nodes', root)?.addEventListener('keydown', (e) => {
      const steps = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      let next = null;
      if (e.key in steps) next = (current + steps[e.key] + tabs.length) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      if (next === null) return;
      e.preventDefault();
      go(next);
      tabs[next].focus({ preventScroll: true });
    });

    // The web gives under the pointer (the side it's over sinks back a little, on top of the
    // lean toward the spider), and shivers when a point is touched
    if (finePointer.matches) {
      web.addEventListener('pointermove', (e) => {
        if (reduceMotion.matches) return;
        const r = web.getBoundingClientRect();
        tiltGoalX = ((e.clientX - r.left) / r.width - 0.5) * -2 * TILT;
        tiltGoalY = ((e.clientY - r.top) / r.height - 0.5) * -2 * TILT;
        wake();
      });
      web.addEventListener('pointerleave', () => {
        tiltGoalX = 0;
        tiltGoalY = 0;
        if (!reduceMotion.matches) wake();
      });
    }
    tabs.forEach((tab) => tab.addEventListener('pointerenter', () => {
      if (reduceMotion.matches || web.getAnimations().some((a) => a.id === 'shiver')) return;
      web.animate([{ scale: '1' }, { scale: '1.012 0.988' }, { scale: '0.994 1.006' }, { scale: '1' }],
        { duration: 700, easing: 'ease-out', id: 'shiver' });
    }));

    // Threads stay about a pixel wide whatever size the web is drawn at, and everything is
    // plotted again for the new size (this first call is also what draws the web)
    const fit = () => {
      size = web.clientWidth || size;
      silk.style.setProperty('--sw', (600 / (silk.clientWidth || 600)).toFixed(3));
      draw();
    };
    fit();
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(web);
    else window.addEventListener('resize', fit);

    // The first time it's on screen: the web spins (CSS), then the spider drops onto the
    // service the scroll has reached on a thread, bounces and turns to face along the web
    let introduced = false;
    function land(spot) {
      landed = true;
      dropping = false;
      pos = aim = goal = from = spot;
      vel = 0;
      heading = 1;
      angle = 0; // it came down facing up; the spring turns it to face along the thread
      spider.classList.add('is-ready');
      if (reduceMotion.matches) {
        aimView();
        angle = facing(pos, heading);
      }
      draw();
      if (pinned()) onScroll(); // the scroll takes over from here
      else if (stops[current] !== spot) walkTo(stops[current]); // scrolled on while it was dropping
      if (!reduceMotion.matches) wake();
    }
    function intro() {
      introduced = true;
      if (reduceMotion.matches) {
        land(stops[current]);
        return;
      }
      setTimeout(() => {
        const spot = stops[current];
        // The web finishes turning to that spot while the spider is on its way down to it
        dropping = true;
        goal = spot;
        cruising = false;
        wake();
        const top = -300; // the web's top edge
        const t0 = performance.now();
        drop.classList.remove('is-gone');
        spider.classList.add('is-ready');
        const step = (now) => {
          const t = Math.min(1, (now - t0) / 1100);
          const e = 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2; // overshoots a touch, then settles
          aimView();
          ringPoint(spot); // where it will land, as the web looks at this moment
          const cy = top + (py - top) * e;
          place(px, cy, 0, pk);
          drop.setAttribute('x1', f(px));
          drop.setAttribute('x2', f(px));
          drop.setAttribute('y2', f(cy));
          if (t < 1) {
            requestAnimationFrame(step);
            return;
          }
          drop.classList.add('is-gone');
          land(spot);
        };
        requestAnimationFrame(step);
      }, 1500);
    }
    if ('IntersectionObserver' in window) {
      const seen = new IntersectionObserver((entries) => {
        if (!introduced && entries.some((entry) => entry.isIntersecting)) {
          seen.disconnect();
          intro();
        }
      }, { threshold: 0.3 });
      seen.observe(root);
    } else {
      intro();
    }
  }

  /* ---------- Tech stack rows: drift, follow the scroll, slow under the pointer ---------- */
  function initMarquees() {
    const rows = $$('[data-marquee]').map((row) => ({
      row,
      track: $('.marquee__track', row),
      dir: row.dataset.marquee === 'reverse' ? -1 : 1,
      x: 0,
      loop: 0,
      hover: 0,
      hovered: false
    }));
    if (!rows.length) return;

    // Repeat the items until one copy spans the screen, then double that, so shifting the
    // track by half its width loops seamlessly. Copies are hidden from screen readers.
    rows.forEach((r) => {
      const items = [...r.track.children];
      const append = (nodes) => nodes.forEach((li) => {
        const copy = li.cloneNode(true);
        copy.classList.add('is-clone');
        copy.setAttribute('aria-hidden', 'true');
        r.track.append(copy);
      });
      // One measurement of a single set says how many copies fill the screen (measuring
      // after every copy would force a fresh layout of the whole page each time)
      const minWidth = Math.max(window.innerWidth, screen.width || 0);
      const copies = Math.min(8, Math.max(0, Math.ceil(minWidth / (r.track.scrollWidth || minWidth)) - 1));
      for (let n = 0; n < copies; n++) append(items);
      append([...r.track.children]);
      new ResizeObserver(() => { r.loop = r.track.scrollWidth / 2; }).observe(r.track);
      r.row.addEventListener('pointerenter', () => { r.hovered = true; });
      r.row.addEventListener('pointerleave', () => { r.hovered = false; });
    });

    const BASE_SPEED = 36; // px per second at rest
    let visible = false;
    let frame = 0;
    let last = 0;
    let lastY = 0;
    let velocity = 0; // smoothed scroll speed, px per second

    function tick(now) {
      frame = 0;
      if (!visible || reduceMotion.matches) return;
      const dt = Math.min(now - (last || now), 64) / 1000;
      last = now;
      velocity += ((dt ? (window.scrollY - lastY) / dt : 0) - velocity) * 0.12;
      lastY = window.scrollY;
      rows.forEach((r) => {
        if (!r.loop) return;
        r.hover += ((r.hovered ? 1 : 0) - r.hover) * 0.08;
        // Scrolling down speeds the rows up; scrolling up pushes them back the other way
        const speed = (BASE_SPEED + velocity * 0.35) * r.dir * (1 - 0.8 * r.hover);
        r.x = (((r.x + speed * dt) % r.loop) + r.loop) % r.loop;
        r.track.style.transform = `translate3d(${-r.x}px, 0, 0)`;
      });
      frame = requestAnimationFrame(tick);
    }
    function start() {
      if (frame || !visible || reduceMotion.matches) return;
      last = 0;
      lastY = window.scrollY;
      frame = requestAnimationFrame(tick);
    }

    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      start();
    }).observe(rows[0].row.parentElement);
    reduceMotion.addEventListener('change', () => {
      if (reduceMotion.matches) rows.forEach((r) => { r.track.style.transform = ''; });
      else start();
    });
  }

  /* ---------- "View" bubble that trails the pointer over [data-cursor] ---------- */
  function initCursorBadge() {
    const targets = $$('[data-cursor]');
    if (!targets.length || !finePointer.matches || reduceMotion.matches) return;

    const badge = document.createElement('div');
    badge.className = 'cursor-badge';
    badge.setAttribute('aria-hidden', 'true');
    document.body.append(badge);
    document.documentElement.classList.add('has-cursor-badge');

    let x = 0;
    let y = 0;
    let tx = 0;
    let ty = 0;
    let frame = 0;
    let shown = false;
    const follow = () => {
      x += (tx - x) * 0.22;
      y += (ty - y) * 0.22;
      badge.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      frame = Math.abs(tx - x) + Math.abs(ty - y) > 0.2 ? requestAnimationFrame(follow) : 0;
    };

    targets.forEach((el) => {
      el.addEventListener('pointerenter', (e) => {
        // ↗ for a site that opens in a new tab, → for a page on this site
        badge.textContent = `${el.dataset.cursor} ${el.target === '_blank' ? '↗' : '→'}`;
        if (!shown) { // appear under the pointer rather than flying in from the last spot
          x = tx = e.clientX;
          y = ty = e.clientY;
          follow();
        }
        shown = true;
        badge.classList.add('is-active');
      });
      el.addEventListener('pointermove', (e) => {
        tx = e.clientX;
        ty = e.clientY;
        if (!frame) frame = requestAnimationFrame(follow);
      });
      el.addEventListener('pointerleave', () => {
        shown = false;
        badge.classList.remove('is-active');
      });
    });
  }

  /* ---------- Magnetic buttons: lean toward the pointer ---------- */
  function initMagnetic() {
    if (!finePointer.matches) return;
    $$('[data-magnetic]').forEach((el) => {
      let rect = null;
      el.addEventListener('pointerenter', () => { rect = el.getBoundingClientRect(); });
      el.addEventListener('pointermove', (e) => {
        if (!rect || reduceMotion.matches) return;
        const dx = e.clientX - (rect.left + rect.width / 2);
        const dy = e.clientY - (rect.top + rect.height / 2);
        el.style.translate = `${dx * 0.25}px ${dy * 0.35}px`;
      });
      el.addEventListener('pointerleave', () => {
        rect = null;
        el.style.translate = '';
      });
    });
  }

  /* ---------- Our Work: scroll-down previews ---------- */
  // Marks each preview frame is-inview while it's on screen; style.css scrolls the home
  // cards' screenshots then (and the work page's on touch screens), restarting from the
  // top each time you come back to them.
  function initWorkPreviews() {
    const frames = $$('[data-preview]');
    if (!frames.length || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle('is-inview', entry.isIntersecting));
    }, { threshold: 0.4 });
    frames.forEach((frame) => observer.observe(frame));
  }

  /* ---------- Enquiry selections: the plan dropdown ---------- */
  const form = $('[data-enquiry-form]');
  const packageSelect = $('[data-package-select]');

  function buildFormOptions() {
    $$('[data-package]').forEach((card) => {
      const name = card.dataset.package;
      const price = $('.price__price', card)?.textContent.replace(/\s+/g, ' ').trim() || '';
      packageSelect.add(new Option(price ? `${name} — ${price}` : name, name));
    });
  }

  function flash(el) {
    const target = el.closest('.field') || el;
    target.classList.remove('is-flash');
    void target.offsetWidth;
    target.classList.add('is-flash');
    setTimeout(() => target.classList.remove('is-flash'), 1300);
  }

  function setSelect(select, value, { quiet = false } = {}) {
    if (!select || ![...select.options].some((o) => o.value === value)) return false;
    if (select.value === value) return true;
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    if (!quiet) flash(select);
    return true;
  }

  function syncSelectedCards() {
    const value = packageSelect ? packageSelect.value : '';
    $$('[data-package]').forEach((c) => c.classList.toggle('is-selected', c.dataset.package === value));
  }

  /* ---------- Estimator ---------- */
  // Every price is read from the text on the page (see the comment above the estimator in
  // index.html), so the HTML stays the only place to edit them. "/ mo" makes a price
  // monthly; "Starting at" or "+" makes it a starting price; text with no number at all
  // ("Included", "Quoted") adds nothing to the total but still shows in the breakdown and
  // travels with the enquiry.
  const flatText = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
  const lkr = (text) => {
    const m = text.match(/\d[\d,]*/);
    return m ? Number(m[0].replace(/,/g, '')) : null;
  };
  const fmtLKR = (n) => `LKR ${n.toLocaleString('en-US')}`;
  const MAX_PAGES = 40;
  const est = {
    root: $('[data-estimator]'),
    types: [],
    options: [],
    hosting: [],
    domain: null,
    pages: null,
    pagePrice: 0,
    lastTotal: ''
  };

  function readOption(input) {
    const label = input.closest('label');
    const priceText = flatText($('.est-option__price, .est-choice__price', label));
    return {
      input,
      label,
      name: flatText($('.est-option__name, .est-choice__name', label)),
      priceText,
      price: lkr(priceText), // null when the price is words, not a number
      monthly: /\/\s*mo\b/i.test(priceText),
      from: /starting|from|\+/i.test(priceText)
    };
  }

  function getEstimate() {
    const type = est.types.find((t) => t.input.checked) || null;
    const custom = Boolean(type) && type.price === null; // the retainer: quoted, not priced
    const included = type ? Number(type.input.dataset.pages) || 0 : 0;
    const pages = est.pages ? Math.max(1, Math.min(MAX_PAGES, parseInt(est.pages.value, 10) || 1)) : 0;
    const extraPages = included ? Math.max(0, pages - included) : 0;
    const pagesCost = extraPages * est.pagePrice;
    const picked = est.options.filter((o) => o.input.checked && !o.input.disabled);
    const hosting = est.hosting.find((h) => h.input.checked && !h.input.disabled) || null;
    const domain = est.domain && est.domain.input.checked ? est.domain : null;
    const sum = (list) => list.reduce((total, o) => total + (o.price || 0), 0);
    return {
      type,
      custom,
      included,
      pages,
      extraPages,
      pagesCost,
      picked,
      hosting,
      domain,
      once: (type && !custom ? type.price : 0) + pagesCost + sum(picked.filter((o) => !o.monthly)),
      monthly: sum(picked.filter((o) => o.monthly)),
      from: Boolean(type && type.from) || picked.some((o) => o.from),
      any: Boolean(type || picked.length || hosting || domain)
    };
  }

  // [label, price] rows: the breakdown, the form's copy and the enquiry message
  function estimateLines(e) {
    const rows = [];
    if (e.type) rows.push([e.type.name, e.type.priceText]);
    if (e.type && e.included) {
      rows.push([`${e.pages} page${e.pages === 1 ? '' : 's'} (${e.included} included)`,
        e.extraPages ? `${e.extraPages} × ${fmtLKR(est.pagePrice)}` : 'Included']);
    } else if (e.custom) {
      rows.push([`${e.pages} page${e.pages === 1 ? '' : 's'}`, 'Scoped on a call']);
    }
    e.picked.forEach((o) => rows.push([o.name, o.priceText]));
    if (e.hosting) rows.push([`Hosting: ${e.hosting.name}`, e.hosting.priceText]);
    if (e.domain) rows.push([e.domain.name, e.domain.priceText]);
    return rows;
  }

  // One line for the total, e.g. "LKR 55,000+ one-time + LKR 5,000 / mo"
  function estimateText(e) {
    const parts = [];
    if (e.custom) parts.push('Custom retainer (quoted after a discovery call)');
    if (e.once) parts.push(`${fmtLKR(e.once)}${e.from ? '+' : ''} one-time`);
    if (e.monthly) parts.push(`${fmtLKR(e.monthly)} / mo`);
    return parts.join(' + ');
  }

  const listRows = (ul, rows) => ul.replaceChildren(...rows.map(([name, price]) => {
    const li = document.createElement('li');
    const n = document.createElement('span');
    const p = document.createElement('span');
    n.textContent = name;
    p.textContent = price;
    li.append(n, p);
    return li;
  }));

  let announceTimer = 0;
  function updateEstimate() {
    if (!est.root) return;
    const e = getEstimate();
    const typeValue = e.type ? e.type.input.value : '';

    // Choices that depend on the website type: free hosting only for static sites, and the
    // retainer already covers basic maintenance
    est.hosting.forEach((h) => {
      const only = h.input.dataset.only;
      h.input.disabled = Boolean(only && typeValue && only !== typeValue);
      if (h.input.disabled) h.input.checked = false;
    });
    const isRetainer = e.custom;
    est.options.filter((o) => o.input.hasAttribute('data-est-care')).forEach((o) => {
      o.input.disabled = isRetainer;
      if (isRetainer) o.input.checked = false;
    });
    const careHint = $('[data-est-care-hint]', est.root);
    if (careHint) careHint.hidden = !isRetainer;

    // The pages note says what this type includes
    const note = $('[data-est-pages-note]', est.root);
    if (note) {
      const price = fmtLKR(est.pagePrice);
      if (!e.type) {
        note.innerHTML = 'Static sites include up to 5 pages and web apps 5 to 7 core layouts. Each extra page is <b></b>.';
        $('b', note).textContent = `${price} / page`;
      } else if (e.custom) {
        note.textContent = 'Retainers are scoped on a call, so pages aren\'t priced here. We\'ll still note how many you have.';
      } else {
        note.innerHTML = '';
        const lead = `${e.type.name} includes ${e.included} page${e.included === 1 ? '' : 's'}. `;
        const b = document.createElement('b');
        b.textContent = e.extraPages ? `${e.extraPages} extra × ${price} = ${fmtLKR(e.pagesCost)}` : `Extra pages are ${price} each`;
        note.append(lead, b, '.');
      }
    }

    // The summary card
    let total = '—';
    let sub = 'Choose a website type to start';
    if (e.custom) {
      total = e.once ? `Custom + ${fmtLKR(e.once)}${e.from ? '+' : ''}` : 'Custom';
      sub = e.once ? 'retainer quoted on a call, plus one-time work' : 'retainer, quoted after a call';
    } else if (e.once) {
      total = `${fmtLKR(e.once)}${e.from ? '+' : ''}`;
      sub = e.from ? 'one-time, starting at' : 'one-time';
    } else if (e.monthly) {
      total = fmtLKR(e.monthly);
      sub = 'per month';
    } else if (e.any) {
      sub = 'no priced items yet';
    }
    const totalEl = $('[data-estimate-total]', est.root);
    const shown = totalEl && (totalEl.dataset.value ?? totalEl.textContent);
    if (totalEl && shown !== total) {
      // Digits roll like an odometer once originkit.js has loaded (CobwebzKit.roll)
      if (window.CobwebzKit) window.CobwebzKit.roll(totalEl, total);
      else totalEl.textContent = total;
      if (!reduceMotion.matches) {
        totalEl.classList.remove('is-bump');
        void totalEl.offsetWidth;
        totalEl.classList.add('is-bump');
      }
    }
    const subEl = $('[data-estimate-note]', est.root);
    if (subEl) subEl.textContent = sub;
    const monthlyEl = $('[data-estimate-monthly]', est.root);
    if (monthlyEl) {
      monthlyEl.hidden = !(e.monthly && (e.once || e.custom));
      monthlyEl.textContent = `plus ${fmtLKR(e.monthly)} / month`;
    }
    const rows = estimateLines(e);
    const lines = $('[data-estimate-lines]', est.root);
    if (lines) {
      if (rows.length) listRows(lines, rows);
      else lines.innerHTML = '<li class="is-empty"><span>Nothing chosen yet</span><span></span></li>';
    }
    // Screen readers hear the new total once the visitor pauses
    const status = $('[data-estimate-status]', est.root);
    const said = estimateText(e);
    if (status && said !== est.lastTotal) {
      clearTimeout(announceTimer);
      announceTimer = setTimeout(() => { status.textContent = said ? `Estimate: ${said}` : ''; }, 700);
      est.lastTotal = said;
    }

    // The enquiry form's copy of it
    syncSelectedCards();
    const field = $('[data-estimate-field]');
    if (field) {
      field.hidden = !e.any;
      const formLines = $('[data-estimate-form-lines]', field);
      if (formLines) listRows(formLines, rows);
      const sumEl = $('[data-estimate-sum]', field);
      if (sumEl) sumEl.textContent = said || 'Quoted after a call';
    }
  }

  function setType(value) {
    est.types.forEach((t) => { t.input.checked = t.input.value === value; });
    updateEstimate();
  }

  function resetEstimate() {
    est.types.forEach((t) => { t.input.checked = false; });
    [...est.options, ...est.hosting].forEach((o) => { o.input.checked = false; });
    if (est.domain) est.domain.input.checked = false;
    if (est.pages) est.pages.value = '5';
    setSelect(packageSelect, '', { quiet: true });
    updateEstimate();
  }

  function initEstimator() {
    if (!est.root) return;
    est.types = $$('[data-est-type]', est.root).map(readOption);
    est.options = $$('[data-est-option]', est.root).map(readOption);
    est.hosting = $$('[data-est-hosting]', est.root).map(readOption);
    const domain = $('[data-est-domain]', est.root);
    est.domain = domain ? readOption(domain) : null;
    est.pages = $('[data-est-pages]', est.root);
    est.pagePrice = lkr(flatText($('[data-est-page-price]', est.root))) || 0;

    est.root.addEventListener('change', (e) => {
      if (e.target.matches('[data-est-type]')) setSelect(packageSelect, e.target.value, { quiet: true });
      if (e.target === est.pages) est.pages.value = String(getEstimate().pages); // tidy into 1…40
      updateEstimate();
    });
    est.pages?.addEventListener('input', updateEstimate);
    $$('[data-est-pages-step]', est.root).forEach((btn) => btn.addEventListener('click', () => {
      const next = (parseInt(est.pages.value, 10) || 1) + Number(btn.dataset.estPagesStep);
      est.pages.value = String(Math.max(1, Math.min(MAX_PAGES, next)));
      updateEstimate();
    }));
    $('[data-estimate-reset]', est.root)?.addEventListener('click', resetEstimate);

    // Narrow screens: the breakdown opens and closes under the total
    const summary = $('[data-estimate]', est.root);
    const toggle = $('[data-estimate-toggle]', est.root);
    toggle?.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'Hide' : 'Details';
      summary.classList.toggle('is-expanded', open);
    });

    // "Send with my enquiry" scrolls to the form (its own href) and points out the estimate
    $('[data-estimate-add]', est.root)?.addEventListener('click', () => {
      const field = $('[data-estimate-field]');
      if (field && !field.hidden) setTimeout(() => flash($('.estimate-box', field)), 450);
    });
    updateEstimate();
  }

  function initSelections() {
    if (!form || !packageSelect) return;
    buildFormOptions();
    initEstimator();

    // A package card's "Get started" picks that type in the estimator (its href scrolls there)
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-select-package]');
      if (!trigger) return;
      setSelect(packageSelect, trigger.dataset.selectPackage, { quiet: true });
    });

    packageSelect.addEventListener('change', () => {
      if (est.types.length) setType(packageSelect.value);
      else syncSelectedCards();
    });

    // Deep links, e.g. ?package=Dynamic%20Applications#contact
    const params = new URLSearchParams(window.location.search);
    if (params.get('package')) setSelect(packageSelect, params.get('package'));
  }

  /* ---------- Enquiry form: validation + submission ---------- */
  function initForm() {
    if (!form) return;
    const status = $('[data-form-status]', form);
    const submitBtn = $('[data-submit]', form);
    const submitLabel = $('[data-submit-label]', form);
    const message = $('#f-message', form);
    const counter = $('[data-char-count]', form);
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const waNumber = CUBE_CONFIG.contact.whatsapp.replace(/\D/g, '');
    const defaultLabel = waNumber ? 'Send on WhatsApp' : 'Send enquiry';
    submitLabel.textContent = defaultLabel;

    const rules = {
      name: (v) => (v.trim().length < 2 ? 'Please enter your name.' : ''),
      email: (v) => (!v.trim() ? 'Please enter your email address.' : !EMAIL_RE.test(v.trim()) ? 'Please enter a valid email address, e.g. name@example.com.' : '')
    };

    function validateField(field) {
      const rule = rules[field.name];
      if (!rule) return true;
      const error = rule(field.value);
      const errorEl = document.getElementById(`${field.id}-err`);
      if (errorEl) errorEl.textContent = error;
      field.setAttribute('aria-invalid', error ? 'true' : 'false');
      return !error;
    }

    Object.keys(rules).forEach((name) => {
      const field = form.elements[name];
      field.addEventListener('blur', () => { if (field.value) validateField(field); });
      field.addEventListener('input', () => { if (field.getAttribute('aria-invalid') === 'true') validateField(field); });
      field.addEventListener('change', () => { if (field.getAttribute('aria-invalid') === 'true') validateField(field); });
    });

    const updateCount = () => { counter.textContent = message.value.length; };
    message.addEventListener('input', updateCount);

    // Where enquiries go decides what the privacy line under the button says
    const { web3formsKey: w3fKey, formspreeEndpoint: fsEndpoint } = CUBE_CONFIG.form;
    const privacy = $('[data-privacy-note]', form);
    if (privacy && !waNumber) {
      const service = w3fKey.trim() ? 'Web3Forms' : fsEndpoint.trim() ? 'Formspree' : '';
      privacy.textContent = service
        ? `We use your details only to reply to this enquiry. It is delivered to our inbox by ${service}, a form-delivery service; this website itself stores nothing.`
        : 'We use your details only to reply to this enquiry. Pressing send opens your email app with your message filled in; nothing is sent until you press Send there.';
    }

    // Spam: a hidden field bots fill in (botcheck), and a time check. People take a few
    // seconds to fill in a form; a submit faster than that gets one polite "please check"
    // instead of being sent, and goes through when pressed again.
    let startedAt = 0;
    form.addEventListener('focusin', () => { startedAt ||= performance.now(); });
    let warnedFast = false;

    function showStatus(type, heading, body = '') {
      status.className = `form-status form-status--${type}`;
      status.innerHTML = `<div><strong></strong>${body ? '<p></p>' : ''}</div>`;
      $('strong', status).textContent = heading;
      if (body) {
        const p = $('p', status);
        if (typeof body === 'string') p.textContent = body;
        else p.append(...body);
      }
      status.hidden = false;
      status.focus({ preventScroll: true });
      status.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'nearest' });
    }

    function emailFallbackNodes(prefix) {
      const email = CUBE_CONFIG.contact.email.trim();
      if (!email) return ['Please try again in a moment.'];
      const link = document.createElement('a');
      link.href = `mailto:${email}`;
      link.textContent = email;
      return [`${prefix} `, link, '.'];
    }

    // The form's fields (cleaned) and the itemised estimate
    function collect() {
      const limits = { name: 100, email: 150, business: 120, message: 3000 };
      const data = {};
      new FormData(form).forEach((value, key) => {
        if (key !== 'botcheck') data[key] = clean(value, limits[key] || 200);
      });
      const e = getEstimate();
      if (e.type) data.package = `${e.type.input.value} — ${e.type.priceText}`;
      const rows = estimateLines(e);
      if (rows.length) data.estimate_items = rows.map(([name, price]) => `${name} — ${price}`).join('\n');
      if (e.any) data.estimate = estimateText(e) || 'Quoted after a call';
      return data;
    }

    function summary(data) {
      return [
        `Name: ${data.name}`,
        `Email: ${data.email}`,
        `Business: ${data.business || '—'}`,
        `Plan: ${data.package || 'Not sure yet'}`,
        ...(data.estimate_items ? ['Estimate details:', ...data.estimate_items.split('\n').map((line) => `• ${line}`)] : []),
        ...(data.estimate ? [`Estimated total: ${data.estimate} (an estimate, not a quote)`] : []),
        `Budget (LKR): ${data.budget || 'Prefer not to say'}`,
        `Timeline: ${data.timeline || 'No fixed date'}`,
        ...(data.message ? ['', data.message] : [])
      ].join('\n');
    }

    async function send(data) {
      const { web3formsKey, formspreeEndpoint, subject } = CUBE_CONFIG.form;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        let res;
        if (web3formsKey.trim()) {
          res = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ ...data, access_key: web3formsKey.trim(), subject, from_name: 'CobWebZ website', replyto: data.email }),
            signal: controller.signal
          });
        } else {
          res = await fetch(formspreeEndpoint.trim(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ ...data, _subject: subject, _replyto: data.email }),
            signal: controller.signal
          });
        }
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.success === false) throw new Error(json.message || `HTTP ${res.status}`);
      } finally {
        clearTimeout(timeout);
      }
    }

    function resetForm() {
      form.reset();
      resetEstimate();
      updateCount();
      startedAt = 0;
      warnedFast = false;
      $$('[aria-invalid]', form).forEach((f) => f.removeAttribute('aria-invalid'));
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const fields = Object.keys(rules).map((name) => form.elements[name]);
      const invalid = fields.filter((f) => !validateField(f));
      if (invalid.length) {
        showStatus('error', `Please check ${invalid.length === 1 ? '1 field' : `${invalid.length} fields`} highlighted above.`);
        invalid[0].focus();
        return;
      }

      // Bots fill the hidden field; quietly drop the submission
      if (form.elements.botcheck.value) { resetForm(); return; }

      // Filled in faster than a person types? Ask once; a real visitor just presses again
      if (!warnedFast && (!startedAt || performance.now() - startedAt < 2500)) {
        warnedFast = true;
        showStatus('info', 'Quick check before we send', 'Please make sure your name and email are right, then press the button again.');
        return;
      }

      const data = collect();
      const { web3formsKey, formspreeEndpoint } = CUBE_CONFIG.form;

      // WhatsApp: open a chat with the enquiry written out. Nothing is sent until the visitor
      // presses Send there, so the form keeps its contents in case they need to try again.
      if (waNumber) {
        const text = `*${CUBE_CONFIG.form.subject}*\n\n${summary(data)}`;
        const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank', 'noopener');
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = 'Open WhatsApp';
        showStatus('info', 'WhatsApp should now open with your enquiry filled in.',
          ['It has not been sent yet — press Send in WhatsApp to deliver it. Nothing opened? ', link, '.']);
        return;
      }

      if (!web3formsKey.trim() && !formspreeEndpoint.trim()) {
        const email = CUBE_CONFIG.contact.email.trim();
        if (email) {
          const subject = encodeURIComponent(CUBE_CONFIG.form.subject);
          window.location.href = `mailto:${email}?subject=${subject}&body=${encodeURIComponent(summary(data))}`;
          showStatus('info', 'Your email app should now open with your enquiry filled in.',
            'It has not been sent yet — please press Send in your email app to deliver it.');
        } else {
          console.warn('[CobWebZ] Enquiry form is not connected. Set CUBE_CONFIG.form.web3formsKey or formspreeEndpoint in script.js.');
          showStatus('error', 'Online enquiries are not connected yet.',
            CUBE_CONFIG.contact.phone.trim() || CUBE_CONFIG.contact.whatsapp.trim()
              ? 'Your message was not sent. Please contact us directly using the details on this page.'
              : 'Your message was not sent. Please try again later.');
        }
        return;
      }

      submitBtn.disabled = true;
      submitLabel.textContent = 'Sending…';
      try {
        await send(data);
        showStatus('success', `Thanks, ${data.name.split(' ')[0]} — your enquiry has been sent.`,
          `We'll reply to ${data.email} as soon as possible.`);
        resetForm();
      } catch (err) {
        console.error('[CobWebZ] Enquiry failed:', err);
        showStatus('error', 'Sorry, your enquiry could not be sent.',
          emailFallbackNodes('Please try again in a moment, or email us directly at'));
      } finally {
        submitBtn.disabled = false;
        submitLabel.textContent = defaultLabel;
      }
    });
  }

  /* ---------- How we work: one line climbs through the five steps ---------- */
  // Wide screens: the intro sits top left and the steps rise from bottom left to top right.
  // One line runs through their markers: in from the left edge of the screen, dipping into
  // step 1, then an S-curve up to each step after it (flat at every marker, like a stair),
  // and out at the right edge. Narrow screens stack the steps and the line snakes down past
  // them. The path is built from the markers' real positions, so it always runs through
  // them. As you scroll it draws itself in, with a soft glow under it and a bright tip at its
  // end, and each step lights up as the line reaches it. How the scroll drives it:
  //  - pin (wide and tall enough): the section holds still (CSS sticky) while scrolling
  //    draws the line, then lets go a little after it's done
  //  - read (stacked): the tip follows a reading line 70% of the way down the screen
  //  - play (wide but too short to hold still): it draws itself in once it's in view
  //  - still (reduced motion): drawn in full from the start
  // The drawn amount eases toward its goal, so the line glides instead of stepping with the
  // wheel. --p (0…1, how much is drawn) on the section and each step's --at (where the line
  // reaches its marker, on the same scale) drive the rest in style.css.
  function initProcess() {
    const stage = $('[data-process]');
    const pin = stage?.closest('.process__pin');
    const section = stage?.closest('.section');
    if (!stage || !pin || !section) return;
    const steps = $$('.process__step', stage);
    const nodes = steps.map((s) => $('.process__node', s));
    const ink = $('.process__ink', pin);
    const glow = $('.process__glow', pin);
    const guide = $('.process__guide', pin);
    const tip = $('.process__tip', pin);
    const grad = $('#process-grad', pin);
    if (!steps.length || nodes.some((n) => !n) || !ink || !tip) return;
    const svgs = $$('svg.process__line', pin);
    const wide = window.matchMedia('(min-width: 1100px)');
    const clamp01 = (v) => Math.min(1, Math.max(0, v));
    // Where an element sits inside the pinned box, ignoring transforms
    const offsetIn = (el) => {
      let x = 0;
      let y = 0;
      for (let n = el; n && n !== pin; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; }
      return { x, y };
    };

    let mode = 'read';
    let line = null; // samples along the path: x, y and the length up to each
    let at = []; // the length at which the line reaches each marker
    let shown = 0;
    let played = 0; // play mode's goal, which holds until the steps leave the screen
    let drawn = -1;

    // Finds where v falls in a rising list: the two samples either side and how far between
    const search = (arr, v) => {
      let lo = 0;
      let hi = arr.length - 1;
      if (v <= arr[lo]) return [lo, lo, 0];
      if (v >= arr[hi]) return [hi, hi, 0];
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (arr[mid] < v) lo = mid; else hi = mid;
      }
      return [lo, hi, (v - arr[lo]) / (arr[hi] - arr[lo] || 1)];
    };
    const pointAt = (l) => {
      const [i, j, f] = search(line.ls, l);
      return [line.xs[i] + (line.xs[j] - line.xs[i]) * f, line.ys[i] + (line.ys[j] - line.ys[i]) * f];
    };
    const lengthAtY = (y) => {
      const [i, j, f] = search(line.ys, y);
      return line.ls[i] + (line.ls[j] - line.ls[i]) * f;
    };

    function measure() {
      const W = pin.clientWidth;
      const H = pin.clientHeight;
      if (!W || !H) return;
      mode = reduceMotion.matches ? 'still'
        : getComputedStyle(pin).position === 'sticky' ? 'pin'
          : wide.matches ? 'play' : 'read';
      svgs.forEach((svg) => svg.setAttribute('viewBox', `0 0 ${W} ${H}`));
      const pts = nodes.map((n) => {
        const o = offsetIn(n);
        return [o.x + n.offsetWidth / 2, o.y + n.offsetHeight / 2];
      });

      // Each stretch is a cubic Bézier, as [x0, y0, cx1, cy1, cx2, cy2, x1, y1]
      const segs = [];
      if (wide.matches) {
        // flat at every marker, so each climb between them is an S
        const route = [[0, pts[0][1] - 90], ...pts, [W, pts[pts.length - 1][1] - 36]];
        for (let i = 1; i < route.length; i++) {
          const [ax, ay] = route[i - 1];
          const [bx, by] = route[i];
          const k = (bx - ax) / 2;
          segs.push([ax, ay, ax + k, ay, bx - k, by, bx, by]);
        }
      } else {
        // down past the markers, each stretch bowing out to the other side from the last
        const x = pts[0][0];
        const lastStep = steps[steps.length - 1];
        const end = offsetIn(lastStep).y + lastStep.offsetHeight;
        const route = [[x, pts[0][1] - 64], ...pts, [x, Math.max(end, pts[pts.length - 1][1] + 64)]];
        for (let i = 1; i < route.length; i++) {
          const [ax, ay] = route[i - 1];
          const [bx, by] = route[i];
          const bow = i % 2 ? 15 : -15;
          const k = (by - ay) * 0.36;
          segs.push([ax, ay, ax + bow, ay + k, bx + bow, by - k, bx, by]);
        }
      }

      // The path, plus samples along it to place the tip and find where each marker falls
      const r = (n) => Math.round(n * 10) / 10;
      let d = `M${r(segs[0][0])} ${r(segs[0][1])}`;
      const xs = [];
      const ys = [];
      const ls = [];
      let len = 0;
      at = [];
      segs.forEach((s, si) => {
        d += `C${s.slice(2).map(r).join(' ')}`;
        for (let j = si ? 1 : 0; j <= 40; j++) {
          const t = j / 40;
          const u = 1 - t;
          const a = u * u * u;
          const b = 3 * u * u * t;
          const c = 3 * u * t * t;
          const e = t * t * t;
          const x = a * s[0] + b * s[2] + c * s[4] + e * s[6];
          const y = a * s[1] + b * s[3] + c * s[5] + e * s[7];
          if (xs.length) len += Math.hypot(x - xs[xs.length - 1], y - ys[ys.length - 1]);
          xs.push(x);
          ys.push(y);
          ls.push(len);
        }
        if (si < nodes.length) at.push(len); // stretch si ends at marker si
      });
      line = { xs, ys, ls, len: len || 1 };
      [ink, glow, guide].forEach((p) => p?.setAttribute('d', d));
      if (grad) {
        // the colour runs along the line: left to right, or top to bottom when stacked
        const [x1, y1, x2, y2] = wide.matches ? [0, 0, W, 0] : [0, ys[0], 0, ys[ys.length - 1]];
        grad.setAttribute('x1', x1);
        grad.setAttribute('y1', y1);
        grad.setAttribute('x2', x2);
        grad.setAttribute('y2', y2);
      }
      steps.forEach((step, i) => step.style.setProperty('--at', (at[i] / line.len).toFixed(4)));
      drawn = -1;
      wake();
    }

    // How much of the line the scroll position asks for
    function goal() {
      if (mode === 'still') return 1;
      const vh = window.innerHeight;
      if (mode === 'pin') {
        // from just before the section sticks to most of the way through its hold
        const box = section.getBoundingClientRect();
        const run = Math.max(1, box.height - vh);
        return clamp01((vh * 0.2 - box.top) / (vh * 0.2 + run * 0.85));
      }
      if (mode === 'play') {
        const box = stage.getBoundingClientRect();
        if (box.top > vh) played = 0; // back below the screen: ready to play again
        else if (box.top < vh * 0.5) played = 1;
        return played;
      }
      // read: the tip sits where the line crosses 70% of the way down the screen
      return lengthAtY(vh * 0.7 - pin.getBoundingClientRect().top) / line.len;
    }

    function render() {
      const v = Math.round(shown * 10000) / 10000;
      if (v === drawn) return;
      drawn = v;
      const off = (1 - v).toFixed(4);
      ink.style.strokeDashoffset = off;
      if (glow) glow.style.strokeDashoffset = off;
      section.style.setProperty('--p', v.toFixed(4));
      const l = v * line.len;
      const [x, y] = pointAt(l);
      tip.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      tip.classList.toggle('is-on', v > 0.002 && v < 0.998);
      steps.forEach((step, i) => step.classList.toggle('is-reached', l >= at[i] - 1));
    }

    let frame = 0;
    let last = 0;
    function tick(now) {
      frame = 0;
      if (!line) return;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      const target = goal();
      if (mode === 'play') {
        // drawn at an even pace, about two and a half seconds end to end
        const step = dt / 2.4;
        shown = Math.abs(target - shown) <= step ? target : shown + Math.sign(target - shown) * step;
      } else {
        shown += (target - shown) * (1 - Math.exp(-dt * 7));
        if (mode === 'still' || Math.abs(target - shown) < 0.0005) shown = target;
      }
      render();
      if (shown !== target) frame = requestAnimationFrame(tick);
      else last = 0;
    }
    function wake() { if (!frame) frame = requestAnimationFrame(tick); }

    measure();
    window.addEventListener('scroll', wake, { passive: true });
    new ResizeObserver(measure).observe(pin);
    wide.addEventListener('change', measure);
    reduceMotion.addEventListener('change', measure);
    document.fonts?.ready.then(measure);
  }

  /* ---------- The studio: the founder card, from CUBE_CONFIG.founder ---------- */
  function initFounder() {
    const card = $('[data-founder]');
    const f = CUBE_CONFIG.founder || {};
    const name = (f.name || '').trim();
    if (!card || !name) return;
    $('[data-founder-name]', card).textContent = name;
    $('[data-founder-role]', card).textContent = (f.role || '').trim();
    $('[data-founder-bio]', card).textContent = (f.bio || '').trim();
    const photo = $('[data-founder-photo]', card);
    if (f.photo && /^[\w./-]+\.(webp|jpe?g|png|avif)$/i.test(f.photo)) {
      const img = document.createElement('img');
      img.src = f.photo;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      photo.append(img);
    } else {
      const mono = document.createElement('span');
      mono.className = 'founder__monogram';
      mono.textContent = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
      photo.append(mono);
    }
    const link = $('[data-founder-link]', card);
    if (link && /^https:\/\//i.test(f.link || '')) {
      link.href = f.link;
      $('[data-founder-link-label]', link).textContent = f.linkLabel || 'Profile';
      link.hidden = false;
    }
    card.hidden = false;
  }

  /* ---------- The studio: the story lights up as it scrolls past ---------- */
  // On wide screens the heading and chapter index stay put (CSS sticky) while the story
  // scrolls beside them. On each scroll frame, while the section is near the screen:
  //  - the active chapter is the last one whose top has risen past 45% of the way down the
  //    screen (is-active, and aria-current on its index link); a chapter gets is-seen once
  //    its top comes up past 85%, which draws its icon
  //  - --sp: how far that 45% line is through the chapters, for the index rail
  //  - --m: each marked phrase of the opening statement, 0 at 85% down the screen to 1 at 55%
  //  - --pp: where the principle row's middle is, -1 (a screen below the middle) to 1 (above)
  // The numbers ease toward those goals, so they glide instead of stepping with the wheel.
  // With reduced motion they're set straight to their goals, and the phrases show done.
  function initStudio() {
    const root = $('[data-studio]');
    if (!root) return;
    const chapters = $$('[data-chapter]', root);
    const links = $$('[data-chapter-link]', root);
    const index = $('[data-studio-index]', root);
    const marks = $$('[data-mark]', root);
    const row = $('[data-principles]', root);
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const now = { sp: 0, pp: 0, m: marks.map(() => 0) };
    let active = -2;
    let near = false;
    let frame = 0;
    let last = 0;

    function setActive(i) {
      if (i === active) return;
      active = i;
      chapters.forEach((c, j) => c.classList.toggle('is-active', j === i));
      links.forEach((a, j) => {
        if (j === i) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }

    function tick(t) {
      frame = 0;
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 1 / 60;
      last = t;
      const vh = window.innerHeight;
      const focus = vh * 0.45;
      const still = reduceMotion.matches;
      // Read everything first, then write, so the browser lays the page out once per frame
      const boxes = chapters.map((c) => c.getBoundingClientRect());
      const tops = marks.map((m) => m.getBoundingClientRect().top);
      const band = row?.getBoundingClientRect();
      let i = -1;
      boxes.forEach((b, j) => { if (b.top <= focus) i = j; });
      const goal = {
        sp: boxes.length ? clamp((focus - boxes[0].top) / Math.max(1, boxes[boxes.length - 1].bottom - boxes[0].top), 0, 1) : 0,
        pp: band ? clamp((vh / 2 - (band.top + band.height / 2)) / vh, -1, 1) : 0,
        m: tops.map((top) => (still ? 1 : clamp((vh * 0.85 - top) / (vh * 0.3), 0, 1)))
      };
      const k = still ? 1 : 1 - Math.exp(-dt * 8);
      let moving = false;
      const ease = (from, to) => {
        const v = from + (to - from) * k;
        if (Math.abs(to - v) < 0.0005) return to;
        moving = true;
        return v;
      };
      now.sp = ease(now.sp, goal.sp);
      now.pp = ease(now.pp, goal.pp);
      now.m = now.m.map((v, j) => ease(v, goal.m[j]));

      setActive(i);
      boxes.forEach((b, j) => { if (b.top < vh * 0.85) chapters[j].classList.add('is-seen'); });
      index?.style.setProperty('--sp', now.sp.toFixed(4));
      row?.style.setProperty('--pp', now.pp.toFixed(4));
      marks.forEach((m, j) => m.style.setProperty('--m', now.m[j].toFixed(3)));
      if (moving) frame = requestAnimationFrame(tick);
      else last = 0;
    }
    const wake = () => { if (near && !frame) frame = requestAnimationFrame(tick); };

    // Only works while the section is within half a screen of being visible
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { near = entry.isIntersecting; wake(); }, { rootMargin: '50% 0px' }).observe(root);
    } else {
      near = true;
    }
    window.addEventListener('scroll', wake, { passive: true });
    window.addEventListener('resize', wake);
    reduceMotion.addEventListener('change', wake);
    wake();
  }

  /* ---------- Testimonials: real ones only, from CUBE_CONFIG.testimonials ---------- */
  function initTestimonials() {
    const section = $('[data-testimonials]');
    const list = $('[data-testimonials-list]');
    if (!section || !list) return;
    const items = (CUBE_CONFIG.testimonials || []).filter((t) => t && t.quote && t.name);
    if (!items.length) return;
    list.replaceChildren(...items.map((t, i) => {
      const fig = document.createElement('figure');
      fig.className = 'testimonial reveal';
      fig.style.setProperty('--delay', `${(i % 3) * 90}ms`);
      const quote = document.createElement('blockquote');
      const p = document.createElement('p');
      p.textContent = String(t.quote).trim();
      quote.append(p);
      const cap = document.createElement('figcaption');
      const avatar = document.createElement('span');
      avatar.className = 'testimonial__avatar';
      avatar.setAttribute('aria-hidden', 'true');
      avatar.textContent = String(t.name).trim()[0].toUpperCase();
      const who = document.createElement('span');
      const name = document.createElement('span');
      name.className = 'testimonial__name';
      name.textContent = String(t.name).trim();
      who.append(name, [t.role, t.company].filter(Boolean).join(', '));
      cap.append(avatar, who);
      if (t.source) {
        const src = document.createElement('span');
        src.className = 'testimonial__source';
        if (/^https:\/\//i.test(t.url || '')) {
          const a = document.createElement('a');
          a.href = t.url;
          a.target = '_blank';
          a.rel = 'noopener';
          a.textContent = t.source;
          src.append(a);
        } else src.textContent = t.source;
        cap.append(src);
      }
      fig.append(quote, cap);
      return fig;
    }));
    section.hidden = false;
  }

  // First, only what the first screen needs, so the hero starts animating (and paints) as
  // soon as possible.
  applyConfig();
  initTheme();
  initFounder();
  initTestimonials(); // before initSplitText and initMotion, so a filled section animates in like the rest
  initHeroBrand();
  initSplitText(); // before initMotion, so the words exist when the hero starts animating
  initActiveNav();
  initHeaderScroll();
  initMenu();
  initMotion();

  // Then everything further down the page, a few at a time in short separate tasks, so the
  // browser can paint and respond in between (one long start-up task would block both).
  const later = [
    initHeroField, initHeroScroll, initScrollEffects, initSpiderMark, initServices, initWorkPreviews, initMarquees,
    initCursorBadge, initMagnetic, initProcess, initStudio, initSelections, initForm, initCopy
  ];
  const nextTask = (fn) => (window.scheduler?.postTask ? scheduler.postTask(fn, { priority: 'user-visible' }) : setTimeout(fn, 0));
  const runLater = () => {
    const start = performance.now();
    while (later.length && performance.now() - start < 12) later.shift()();
    if (later.length) nextTask(runLater);
  };
  nextTask(runLater);
})();
