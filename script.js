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
    whatsapp: '94719070320' // 071 907 0320, international format, digits only. Enquiries go here.
  },

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

  function applyConfig() {
    $$('[data-config-item]').forEach((item) => {
      const path = item.dataset.configItem;
      const value = getConfig(path).trim();
      const href = value && hrefFor(path, value);
      item.hidden = !href;
      if (!href) return;
      $$(`[data-config-link="${path}"]`, item).forEach((link) => {
        link.href = href;
        if (!link.textContent.trim()) {
          link.textContent = path === 'contact.whatsapp' ? `+${value.replace(/\D/g, '')}` : value;
        }
      });
    });

    const contactList = $('[data-contact-list]');
    if (contactList) contactList.hidden = !$$('[data-config-item]', contactList).some((li) => !li.hidden);

    // Footer columns built from config values hide when none of their values are set
    $$('[data-config-block]').forEach((block) => {
      block.hidden = !$$('[data-config-item]', block).some((li) => !li.hidden);
    });

    $$('[data-config-text]').forEach((el) => {
      const value = getConfig(el.dataset.configText);
      if (value) el.textContent = value;
    });

    $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
  }

  /* ---------- Active nav link ---------- */
  function initActiveNav() {
    const links = $$('[data-nav]');
    const linked = new Set(links.map((a) => (a.getAttribute('href') || '').split('#')[1]));
    // Only sections a link points to, so passing one without a link keeps the last one lit
    const sections = $$('main > section[id]').filter((s) => linked.has(s.id));
    if (!links.length || !sections.length) return;

    const setActive = (id) => {
      links.forEach((a) => {
        const href = a.getAttribute('href') || '';
        const targetId = href.includes('#') ? href.split('#')[1] : href;
        const active = targetId === id;
        a.classList.toggle('is-active', active);
        if (active) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    };

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

  // Two toggles: the sun/moon button in the header, and the switch in the menu that stands
  // in for it on phones
  function initTheme() {
    const toggles = $$('[data-theme-toggle]');
    if (!toggles.length) return;
    const meta = $('meta[name="theme-color"]');

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

    apply(storage.get('theme') === 'dark' ? 'dark' : 'light');

    toggles.forEach((toggle) => toggle.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      apply(next);
      storage.set('theme', next);
    }));
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
  function splitText(root, unit) {
    let i = 0;
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
          span.className = unit;
          span.style.setProperty('--i', i++);
          span.textContent = part;
          frag.append(span);
        });
        child.replaceWith(frag);
      });
    };
    walk(root);
    root.style.setProperty('--n', i);
  }

  function initSplitText() {
    $$('[data-split-words], [data-scrub-words]').forEach((el) => splitText(el, 'word'));
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

  /* ---------- Scroll-linked: [data-scrub] ---------- */
  // Each [data-scrub] element gets --p from 0 (its top approaches the screen bottom) to
  // 1 (comfortably centered in view); CSS turns that into the effect.
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
        const p = (vh * 1.05 - r.top) / (vh * 0.32 + r.height);
        el.style.setProperty('--p', Math.min(1, Math.max(0, p)).toFixed(3));
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
    const statement = scrub && $('[data-scrub-words]', scrub);
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

    function tick() {
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
      const ta = Math.max(-20, Math.min(20, x * 0.18 + vx * 1.6));
      angle += (ta - angle) * 0.2;
      root.classList.toggle('is-scuttling', Math.hypot(vx, vy) > 0.5);
      render();
      const ringing = swing();

      const settled = !drag && !ringing && Math.abs(tx - x) + Math.abs(ty - y) < 0.05 &&
        Math.abs(vx) + Math.abs(vy) < 0.05 && Math.abs(ta - angle) < 0.05;
      frame = settled ? 0 : requestAnimationFrame(tick);
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
        const a = Math.abs(t.a) < 0.05 ? 0 : Math.round(t.a * 10) / 10;
        if (a === t.shown) return;
        t.shown = a;
        // A quadratic's middle sits halfway to its control point, so 2a bows it by a
        const qx = (t.ax + t.bx) / 2 + t.nx * a * 2;
        const qy = (t.ay + t.by) / 2 + t.ny * a * 2;
        t.el.setAttribute('d', a ? `${t.head}Q${qx.toFixed(1)} ${qy.toFixed(1)} ${t.tail}` : t.d);
      });
      return ringing;
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

  /* ---------- Our Services: the spider walks the web to each service ---------- */
  // Draws the web into [data-services-silk] (viewBox -300…300, hub at 0 0): 12 spokes and
  // 8 rings that dip between the spokes. Each service point sits on the ring of radius PATH_R
  // at its angle --a (CSS places the buttons from the same angle). Scrolling through the
  // section moves from one service to the next; each change walks the spider round that ring
  // to it, laying a thread behind it, rolls the number in the hub and shows its panel.
  function initServices() {
    const root = $('[data-services]');
    if (!root) return;
    const web = $('.services__web', root);
    const silk = $('[data-services-silk]', root);
    const spider = $('[data-services-spider]', root);
    const count = $('[data-services-count]', root);
    const tabs = $$('[data-service-tab]', root);
    const panels = tabs.map((tab) => document.getElementById(tab.getAttribute('aria-controls')));
    if (!web || !silk || !spider || !tabs.length) return;

    const SPOKES = 12;
    const PATH_R = 195;
    const RINGS = [84, 112, 140, 168, PATH_R, 224, 254, 284];
    const SAG = 0.955; // how far each span between two spokes dips toward the hub
    const f = (n) => n.toFixed(1);
    const at = (r, deg) => [r * Math.cos((deg * Math.PI) / 180), r * Math.sin((deg * Math.PI) / 180)];
    const ring = (r) => {
      let d = '';
      for (let k = 0; k <= SPOKES; k++) {
        const [x, y] = at(r, (k * 360) / SPOKES);
        if (!k) { d += `M${f(x)} ${f(y)}`; continue; }
        const [cx, cy] = at(r * SAG, ((k - 0.5) * 360) / SPOKES);
        d += `Q${f(cx)} ${f(cy)} ${f(x)} ${f(y)}`;
      }
      return d;
    };

    let svg = '<circle class="s-hub" r="58" pathLength="1"/>';
    for (let k = 0; k < SPOKES; k++) {
      const [x1, y1] = at(58, (k * 360) / SPOKES);
      const [x2, y2] = at(296, (k * 360) / SPOKES);
      svg += `<path class="s-spoke" pathLength="1" style="--i: ${k}" d="M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}"/>`;
    }
    RINGS.forEach((r, i) => {
      svg += `<path class="s-ring${r === PATH_R ? ' s-path' : ''}" pathLength="1" style="--i: ${i}" d="${ring(r)}"/>`;
    });
    svg += `<path class="services__trail" pathLength="1" d="${ring(PATH_R)}"/>` +
      '<line class="services__drop is-gone" x1="0" y1="-300" x2="0" y2="-300"/>';
    silk.innerHTML = svg;
    const trail = $('.services__trail', silk);
    const drop = $('.services__drop', silk);

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

    // A point on the walked ring, p = 0…1 of the way round from angle 0 (clockwise on screen);
    // it follows the same curves as the drawn ring, so the spider stays on the thread
    const ringPoint = (p) => {
      const u = (((p % 1) + 1) % 1) * SPOKES;
      const k = Math.floor(u);
      const t = u - k;
      const [x0, y0] = at(PATH_R, (k * 360) / SPOKES);
      const [x1, y1] = at(PATH_R, ((k + 1) * 360) / SPOKES);
      const [cx, cy] = at(PATH_R * SAG, ((k + 0.5) * 360) / SPOKES);
      const s = 1 - t;
      return [s * s * x0 + 2 * s * t * cx + t * t * x1, s * s * y0 + 2 * s * t * cy + t * t * y1];
    };
    // Which way the spider faces when heading round the ring in direction dir (±1); 0 = up
    const facing = (p, dir) => {
      const [x0, y0] = ringPoint(p);
      const [x1, y1] = ringPoint(p + dir * 0.002);
      return (Math.atan2(x1 - x0, -(y1 - y0)) * 180) / Math.PI;
    };
    const stops = tabs.map((tab) => (((parseFloat(tab.style.getPropertyValue('--a')) || 0) % 360) + 360) % 360 / 360);
    const place = (x, y, h) => {
      spider.style.left = `${50 + (x / 600) * 100}%`;
      spider.style.top = `${50 + (y / 600) * 100}%`;
      spider.style.setProperty('--h', `${h.toFixed(1)}deg`);
    };

    let current = 0;
    let pos = stops[0];
    let walk = 0;
    let chase = 0;
    let landed = false; // until the spider has dropped onto the web

    function walkTo(target, done) {
      cancelAnimationFrame(walk);
      cancelAnimationFrame(chase);
      chase = 0;
      let d = target - pos;
      if (d > 0.5) d -= 1;
      if (d <= -0.5) d += 1;
      const dir = d < 0 ? -1 : 1;
      if (reduceMotion.matches || Math.abs(d) < 1e-4) {
        pos = target;
        const [x, y] = ringPoint(pos);
        place(x, y, facing(pos, dir));
        done?.();
        return;
      }
      const from = pos;
      const ms = Math.max(600, Math.abs(d) * 3600); // a quarter of the way round takes 0.9s
      const t0 = performance.now();
      spider.classList.add('is-walking');
      trail.classList.add('is-on');
      const step = (now) => {
        const t = Math.min(1, (now - t0) / ms);
        const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
        pos = from + d * e;
        const [x, y] = ringPoint(pos);
        place(x, y, facing(pos, dir));
        // The thread it lays, from where it set off to where it is (dashes repeat every lap)
        const len = Math.abs(pos - from);
        trail.style.strokeDasharray = `${len.toFixed(4)} ${(1 - len).toFixed(4)}`;
        trail.style.strokeDashoffset = (-(dir > 0 ? from : pos)).toFixed(4);
        if (t < 1) {
          walk = requestAnimationFrame(step);
          return;
        }
        pos = ((target % 1) + 1) % 1;
        spider.classList.remove('is-walking');
        trail.classList.remove('is-on'); // the thread fades
        done?.();
      };
      walk = requestAnimationFrame(step);
    }

    function rollCount(text) {
      if (!count || count.textContent === text) return;
      if (reduceMotion.matches) { count.textContent = text; return; }
      count.classList.add('is-out');
      setTimeout(() => {
        count.textContent = text;
        count.classList.replace('is-out', 'is-in');
        void count.offsetWidth; // start the roll in from below
        count.classList.remove('is-in');
      }, 220);
    }

    function select(i) {
      if (i < 0 || i === current) return;
      current = i;
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
      rollCount(String(i + 1).padStart(2, '0'));
      // Before it lands, it simply drops onto the right one; pinned, the scroll walks it (scrubTo)
      if (landed && !pinned()) walkTo(stops[i]);
    }

    // Pinned, the spider is walked by the scroll itself, so even a short scroll visibly moves
    // it: it rests on each service for HOLD of the scroll either side, then heads for the
    // next, and is exactly halfway there when the panel changes. It eases after the point the
    // scroll sets (aim), laying a thread from the service it left (from).
    const HOLD = 0.2;
    const wrap = (d) => d - Math.round(d); // the shorter way round, -0.5…0.5
    let aim = pos;
    let from = pos;
    let heading = 1;
    function scrubTo(p) {
      if (!landed || tabs.length < 2) return;
      cancelAnimationFrame(walk);
      if (reduceMotion.matches) {
        pos = stops[current];
        const [x, y] = ringPoint(pos);
        place(x, y, facing(pos, 1));
        return;
      }
      const v = Math.min(tabs.length - 1, Math.max(0, p * tabs.length - 0.5));
      const i = Math.min(tabs.length - 2, Math.floor(v));
      const k = Math.min(1, Math.max(0, (v - i - HOLD) / (1 - 2 * HOLD)));
      from = stops[i];
      aim = from + wrap(stops[i + 1] - from) * k * k * (3 - 2 * k);
      if (!chase) chase = requestAnimationFrame(follow);
    }
    function follow() {
      const d = wrap(aim - pos);
      pos += Math.abs(d) < 1e-4 ? d : d * 0.16;
      if (Math.abs(d) > 1e-5) heading = d < 0 ? -1 : 1;
      const [x, y] = ringPoint(pos);
      place(x, y, facing(pos, heading));
      const len = wrap(pos - from);
      const on = Math.abs(len) > 0.003;
      trail.classList.toggle('is-on', on); // off, the last thread fades
      if (on) {
        trail.style.strokeDasharray = `${Math.abs(len).toFixed(4)} ${(1 - Math.abs(len)).toFixed(4)}`;
        trail.style.strokeDashoffset = (-(len > 0 ? from : from + len)).toFixed(4);
      }
      spider.classList.toggle('is-walking', Math.abs(d) > 0.0006);
      chase = Math.abs(d) < 1e-4 ? 0 : requestAnimationFrame(follow);
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

    // The web leans toward the pointer, and shivers when a point is touched
    if (finePointer.matches) {
      web.addEventListener('pointermove', (e) => {
        if (reduceMotion.matches) return;
        const r = web.getBoundingClientRect();
        web.style.setProperty('--rx', `${(((e.clientY - r.top) / r.height - 0.5) * -8).toFixed(2)}deg`);
        web.style.setProperty('--ry', `${(((e.clientX - r.left) / r.width - 0.5) * 8).toFixed(2)}deg`);
      });
      web.addEventListener('pointerleave', () => {
        web.style.removeProperty('--rx');
        web.style.removeProperty('--ry');
      });
    }
    tabs.forEach((tab) => tab.addEventListener('pointerenter', () => {
      if (reduceMotion.matches || web.getAnimations().some((a) => a.id === 'shiver')) return;
      web.animate([{ scale: '1' }, { scale: '1.012 0.988' }, { scale: '0.994 1.006' }, { scale: '1' }],
        { duration: 700, easing: 'ease-out', id: 'shiver' });
    }));

    // Threads stay about a pixel wide whatever size the web is drawn at
    const fit = () => silk.style.setProperty('--sw', (600 / (silk.clientWidth || 600)).toFixed(3));
    fit();
    window.addEventListener('resize', fit);

    // The first time it's on screen: the web spins (CSS), then the spider drops onto the
    // service the scroll has reached on a thread, bounces and turns to face along the web
    let introduced = false;
    function land(at) {
      landed = true;
      pos = at;
      const [x, y] = ringPoint(pos);
      place(x, y, facing(pos, 1));
      spider.classList.add('is-ready');
      if (pinned()) onScroll(); // the scroll takes over from here
      else if (stops[current] !== at) walkTo(stops[current]); // scrolled on while it was dropping
    }
    function intro() {
      introduced = true;
      if (reduceMotion.matches) {
        land(stops[current]);
        return;
      }
      setTimeout(() => {
        const at = stops[current];
        const [x, y] = ringPoint(at);
        const top = -300; // the web's top edge
        const t0 = performance.now();
        drop.setAttribute('x1', f(x));
        drop.setAttribute('x2', f(x));
        drop.classList.remove('is-gone');
        spider.classList.add('is-ready');
        const step = (now) => {
          const t = Math.min(1, (now - t0) / 1100);
          const e = 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2; // overshoots a touch, then settles
          const cy = top + (y - top) * e;
          place(x, cy, 0);
          drop.setAttribute('y2', f(cy));
          if (t < 1) {
            requestAnimationFrame(step);
            return;
          }
          drop.classList.add('is-gone');
          land(at);
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

  /* ---------- Cobwebs in the page corners ---------- */
  // Each [data-cobweb] gets a quarter web, drawn for the top-left corner (viewBox 0–100) and
  // mirrored into place by CSS. [data-reveal] marks it is-visible on screen, which spins it
  // in. data-cobweb="spider" also hangs the logo's spider, small, on a thread from it.
  function initCobwebs() {
    const webs = $$('[data-cobweb]');
    if (!webs.length) return;
    const r = (n) => Math.round(n * 10) / 10;

    // The logo's spider: three left legs [path, pivot x, pivot y], mirrored for the right
    const legs = [
      ['M352 254C322 240 308 205 316 170C320 155 326 145 332 138', 352, 254],
      ['M346 280C315 272 285 255 278 228C274 212 271 200 270 188', 346, 280],
      ['M352 318C335 328 326 345 327 368C328 388 334 400 342 410', 352, 318]
    ];
    const mirror = (d) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (m, x, y) => `${775 - x} ${y}`);
    const spider = '<svg class="cobweb__spider" viewBox="255 125 265 300">' +
      legs.map(([d, x, y], i) => {
        const swing = i % 2 ? -9 : 9;
        return `<path class="cobweb__leg" style="--o: ${x}px ${y}px; --s: ${swing}deg" d="${d}"/>` +
          `<path class="cobweb__leg" style="--o: ${775 - x}px ${y}px; --s: ${-swing}deg" d="${mirror(d)}"/>`;
      }).join('') +
      '<path class="cobweb__body" fill-rule="evenodd" d="M347 244A40 40 0 0 1 427 244L427 318A40 40 0 0 1 347 318Z' +
      'M373 249A14 20 0 1 0 401 249A14 20 0 1 0 373 249ZM374 318A13 15 0 1 0 400 318A13 15 0 1 0 374 318Z"/></svg>';

    webs.forEach((host, w) => {
      // Seeded jitter: every web is a little different, but the same on every visit
      let seed = 7 + w * 101;
      const wobble = (n) => {
        seed = (seed * 16807) % 2147483647;
        return (seed / 2147483647 - 0.5) * n;
      };
      const at = (radius, a) => [radius * Math.cos(a), radius * Math.sin(a)];
      const angles = [9, 27, 45, 63, 81].map((deg) => ((deg + wobble(7)) * Math.PI) / 180);

      const spokes = angles.map((a, i) => {
        const [x, y] = at(97 + wobble(6), a);
        return `<path class="cobweb__spoke" pathLength="1" style="--i: ${i}" d="M0 0L${r(x)} ${r(y)}"/>`;
      });
      // Each ring runs wall to wall through every spoke, each span sagging toward the corner
      const rings = [18, 33, 49, 65, 82].map((radius, i) => {
        const pts = [[radius + wobble(4), 0], ...angles.map((a) => at(radius + wobble(4), a)), [0, radius + wobble(4)]];
        const d = pts.map(([x, y], j) => {
          if (!j) return `M${r(x)} ${r(y)}`;
          const [px, py] = pts[j - 1];
          const sag = 0.84 + wobble(0.06);
          return `Q${r(((px + x) / 2) * sag)} ${r(((py + y) / 2) * sag)} ${r(x)} ${r(y)}`;
        }).join('');
        return `<path class="cobweb__ring" pathLength="1" style="--i: ${i}" d="${d}"/>`;
      });

      host.style.setProperty('--w', w);
      host.innerHTML = '<svg class="cobweb__web" viewBox="0 0 100 100">' +
        '<path class="cobweb__hit" d="M0 0H100A100 100 0 0 1 0 100Z"/>' +
        `<g class="cobweb__shake"><g class="cobweb__sway">${spokes.join('')}${rings.join('')}</g></g></svg>`;

      if (host.dataset.cobweb === 'spider') {
        // Hangs from the middle spoke, two thirds of the way out
        const [x, y] = at(64, angles[2]);
        const left = host.matches('.cobweb--tr, .cobweb--br') ? 100 - x : x;
        host.insertAdjacentHTML('beforeend', `<div class="cobweb__drop" style="left: ${r(left)}%; top: ${r(y)}%">` +
          `<span class="cobweb__silk"></span>${spider}</div>`);
      }

      // Brushing past a web makes it shiver
      const shake = $('.cobweb__shake', host);
      $('.cobweb__hit', host).addEventListener('pointerenter', () => {
        if (reduceMotion.matches || !host.classList.contains('is-visible') || shake.getAnimations().length) return;
        shake.animate([
          { transform: 'scale(1)' },
          { transform: 'scale(1.035, 0.97)' },
          { transform: 'scale(0.98, 1.02)' },
          { transform: 'scale(1.012, 0.99)' },
          { transform: 'scale(1)' }
        ], { duration: 1000, easing: 'ease-out' });
      });
    });

    // Threads stay about a pixel wide whatever size each web is drawn at
    const fit = () => webs.forEach((host) => host.style.setProperty('--sw', (100 / (host.offsetWidth || 100)).toFixed(3)));
    fit();
    window.addEventListener('resize', fit);

    // The sway and the spider's bob stop while a web is off screen (style.css: .is-offscreen)
    if ('IntersectionObserver' in window) {
      const onScreen = new IntersectionObserver((entries) => entries.forEach((entry) => {
        entry.target.classList.toggle('is-offscreen', !entry.isIntersecting);
      }));
      webs.forEach((host) => onScreen.observe(host));
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
      const minWidth = Math.max(window.innerWidth, screen.width || 0);
      for (let n = 0; n < 8 && r.track.scrollWidth < minWidth; n++) append(items);
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
        badge.textContent = `${el.dataset.cursor} ↗`;
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

  /* ---------- Particle ribbons (hero and the sections below it) ---------- */
  // Each [data-particles] canvas draws the set of ribbons it names. A ribbon is a smooth
  // curve through `path` (fractions of its section's width and height), filled with fine
  // strands of dots that drift along it. `width` is its thickness at the start, middle and
  // end, as a fraction of the section's shorter side; `colors` follow the same three stops.
  // `edges` (px) fades a set out toward the top and bottom of its section, so no ribbon stops
  // on a hard line where two sections meet (the hero's canvas has a CSS mask for that).
  // `narrow` is an optional path for below 900px, where most sections stack into one column.
  const GREY = ['#7c8089', '#a3a7ae', '#5f636b'];
  const PALE = ['#9a9ea6', '#b4b7bd', '#c3c6cb'];
  const RIBBONS = {
    hero: {
      ribbons: [
        {
          path: [[1.06, -0.04], [0.95, 0.36], [0.84, 0.66], [0.66, 0.9], [0.45, 0.98], [0.22, 0.97], [0.06, 0.86], [-0.06, 0.7]],
          width: [0.3, 0.12, 0.24],
          colors: GREY,
          strands: 60,
          alpha: 1
        },
        {
          path: [[1.06, 0.18], [0.97, 0.52], [0.86, 0.8], [0.7, 1.04]],
          width: [0.14, 0.08, 0.05],
          colors: PALE,
          strands: 28,
          alpha: 0.7
        }
      ]
    },
    // Under the statement from the left, rising past the spider mark to the right
    about: {
      edges: 64,
      ribbons: [{
        path: [[-0.06, 0.84], [0.18, 0.89], [0.44, 0.9], [0.66, 0.85], [0.84, 0.76], [1.06, 0.62]],
        width: [0.1, 0.08, 0.13],
        colors: GREY,
        strands: 44,
        alpha: 0.9
      }]
    },
    // Framing the stage like the hero's: down the right and under the panel, with a thin
    // one up the left beside the web. The canvas sticks to the screen (.particles-pin)
    services: {
      edges: 64,
      ribbons: [
        {
          path: [[1.06, 0.04], [0.97, 0.38], [0.9, 0.7], [0.76, 0.93], [0.56, 1.06]],
          width: [0.2, 0.1, 0.14],
          colors: GREY,
          strands: 48,
          alpha: 0.9
        },
        {
          path: [[-0.06, 0.3], [0.04, 0.56], [0.08, 0.8], [0.22, 1.06]],
          width: [0.06, 0.05, 0.08],
          colors: PALE,
          strands: 24,
          alpha: 0.7
        }
      ]
    },
    // Behind the cards, from the left margin down to the bottom right
    work: {
      edges: 64,
      ribbons: [{
        path: [[-0.06, 0.3], [0.18, 0.4], [0.46, 0.6], [0.74, 0.78], [1.06, 0.86]],
        width: [0.14, 0.12, 0.09],
        colors: GREY,
        strands: 44,
        alpha: 0.9
      }]
    },
    // A wave across the drifting rows
    stack: {
      edges: 64,
      ribbons: [{
        path: [[-0.06, 0.6], [0.2, 0.82], [0.46, 0.7], [0.72, 0.84], [1.06, 0.66]],
        width: [0.12, 0.16, 0.1],
        colors: GREY,
        strands: 40,
        alpha: 0.85
      }]
    },
    // Behind the cards the other way, from the right margin down to the bottom left
    pricing: {
      edges: 64,
      ribbons: [{
        path: [[1.06, 0.2], [0.84, 0.36], [0.52, 0.6], [0.22, 0.8], [-0.06, 0.9]],
        width: [0.12, 0.1, 0.13],
        colors: GREY,
        strands: 44,
        alpha: 0.9
      }]
    },
    // Either side of the form
    contact: {
      edges: 64,
      ribbons: [
        {
          path: [[-0.06, 0.16], [0.08, 0.36], [0.13, 0.58], [0.07, 0.8], [-0.06, 0.96]],
          width: [0.07, 0.1, 0.07],
          colors: GREY,
          strands: 36,
          alpha: 0.85
        },
        {
          path: [[1.06, 0.1], [0.92, 0.3], [0.87, 0.52], [0.93, 0.74], [1.06, 0.9]],
          width: [0.07, 0.1, 0.07],
          colors: PALE,
          strands: 36,
          alpha: 0.85
        }
      ]
    },
    // A silk line between the links and the copyright, dropping into the cobweb's corner;
    // stacked, it comes down the right edge instead, clear of the text
    footer: {
      edges: 64,
      ribbons: [{
        path: [[-0.06, 0.55], [0.24, 0.53], [0.5, 0.565], [0.74, 0.545], [0.9, 0.64], [1.04, 0.84]],
        narrow: [[1.06, -0.02], [0.93, 0.22], [0.9, 0.5], [0.93, 0.78], [1.06, 1.0]],
        width: [0.07, 0.07, 0.1],
        colors: GREY,
        strands: 36,
        alpha: 0.85
      }]
    }
  };

  function initParticles() {
    const canvases = $$('[data-particles]');
    if (!canvases.length) return;

    const SAMPLES = 1024; // points along each ribbon's centre line
    const SIN = new Float32Array(4096); // lookup table: tens of thousands of dots per frame
    for (let i = 0; i < SIN.length; i++) SIN[i] = Math.sin((i / SIN.length) * Math.PI * 2);
    const SIN_SCALE = SIN.length / (Math.PI * 2);
    const wide = window.matchMedia('(min-width: 900px)'); // the sections' two-column breakpoint
    const scenes = [];
    const sceneOf = new Map(); // canvas or section → its scene
    let time = 0;
    let last = 0;
    let scrollingUntil = 0;
    let frame = 0;

    const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    // Piecewise-linear value through three stops (start, middle, end)
    const stop3 = (stops, t) => (t < 0.5
      ? stops[0] + (stops[1] - stops[0]) * t * 2
      : stops[1] + (stops[2] - stops[1]) * (t - 0.5) * 2);

    // Catmull-Rom spline through the control points, t in 0…1
    function pointAt(pts, t) {
      const n = pts.length - 1;
      const f = Math.min(t * n, n - 1e-6);
      const i = Math.floor(f);
      const u = f - i;
      const p0 = pts[Math.max(i - 1, 0)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(i + 2, n)];
      const cr = (a, b, c, d) => 0.5 * (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (3 * b - a - 3 * c + d) * u * u * u);
      return [cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])];
    }

    function buildRibbon(spec, width, height) {
      const path = spec.narrow && !wide.matches ? spec.narrow : spec.path;
      const pts = path.map(([x, y]) => [x * width, y * height]);
      const side = Math.min(width, height);
      const colors = spec.colors.map(rgb);
      const sx = new Float32Array(SAMPLES);
      const sy = new Float32Array(SAMPLES);
      const nx = new Float32Array(SAMPLES);
      const ny = new Float32Array(SAMPLES);
      const half = new Float32Array(SAMPLES);
      const color = new Uint32Array(SAMPLES);
      const fade = new Float32Array(SAMPLES);

      for (let j = 0; j < SAMPLES; j++) [sx[j], sy[j]] = pointAt(pts, j / (SAMPLES - 1));

      let length = 0;
      for (let j = 0; j < SAMPLES; j++) {
        const t = j / (SAMPLES - 1);
        const a = Math.max(j - 1, 0);
        const b = Math.min(j + 1, SAMPLES - 1);
        const len = Math.hypot(sx[b] - sx[a], sy[b] - sy[a]) || 1;
        nx[j] = -(sy[b] - sy[a]) / len;
        ny[j] = (sx[b] - sx[a]) / len;
        if (j) length += Math.hypot(sx[j] - sx[j - 1], sy[j] - sy[j - 1]);
        half[j] = (stop3(spec.width, t) * side) / 2;
        const [cr, cg, cb] = [0, 1, 2].map((c) => Math.round(stop3(colors.map((col) => col[c]), t)));
        color[j] = (cb << 16) | (cg << 8) | cr; // RGBA bytes read as a little-endian uint32
        fade[j] = Math.min(1, t / 0.08, (1 - t) / 0.08);
      }

      // Fewer, sparser dots on small screens keep the frame cost down
      const spacing = width < 700 ? 5 : 4;
      const strands = Math.max(24, Math.round(spec.strands * Math.min(1, side / 900)));
      const perStrand = Math.max(40, Math.round(length / spacing));
      const count = perStrand * strands;
      const along = new Float32Array(count);  // 0…1 along the ribbon
      const across = new Float32Array(count); // -1…1 across it
      const alpha = new Float32Array(count);
      const phase = new Float32Array(strands);
      for (let s = 0; s < strands; s++) {
        phase[s] = Math.random() * Math.PI * 2;
        const lane = -1 + (2 * (s + 0.5)) / strands;
        for (let i = 0; i < perStrand; i++) {
          const k = s * perStrand + i;
          along[k] = (i + Math.random()) / perStrand;
          across[k] = lane + (Math.random() - 0.5) * (1.6 / strands);
          alpha[k] = spec.alpha * (0.45 + Math.random() * 0.55) * (1 - 0.45 * lane * lane);
        }
      }
      return { sx, sy, nx, ny, half, color, fade, along, across, alpha, phase, perStrand, strands };
    }

    // Dots near the pointer are pushed aside with a slight swirl, like a hand through smoke
    const PUSH_RADIUS = 150;
    const PUSH = 70;

    function draw(scene) {
      const { buf, width, height, edges, top, hostHeight } = scene;
      const drift = time * 0.008;
      const { x: px, y: py, power } = scene.pointer;
      const r2 = PUSH_RADIUS * PUSH_RADIUS;
      buf.fill(0);
      for (const rb of scene.ribbons) {
        const { sx, sy, nx, ny, half, color, fade, along, across, alpha, phase, perStrand } = rb;
        for (let s = 0; s < rb.strands; s++) {
          const ph = phase[s];
          for (let k = s * perStrand, end = k + perStrand; k < end; k++) {
            let t = along[k] + drift;
            t -= Math.floor(t);
            const f = t * (SAMPLES - 1);
            const j = f | 0;
            const u = f - j;
            const j2 = j < SAMPLES - 1 ? j + 1 : j;
            const wobble = SIN[((t * 16 + time * 0.5 + ph) * SIN_SCALE | 0) & 4095];
            const off = (across[k] + wobble * 0.07) * half[j];
            let x = sx[j] + (sx[j2] - sx[j]) * u + nx[j] * off;
            let y = sy[j] + (sy[j2] - sy[j]) * u + ny[j] * off;
            if (power > 0.01) {
              const dx = x - px;
              const dy = y - py;
              const d2 = dx * dx + dy * dy;
              if (d2 < r2 && d2 > 1) {
                const d = Math.sqrt(d2);
                const fall = 1 - d / PUSH_RADIUS;
                const k = (fall * fall * PUSH * power) / d;
                x += (dx - dy * 0.4) * k;
                y += (dy + dx * 0.4) * k;
              }
            }
            if (x < 0 || y < 0 || x >= width || y >= height) continue;
            let a = alpha[k] * fade[j];
            if (edges) {
              const hy = y + top; // in the section
              const m = (hy < hostHeight - hy ? hy : hostHeight - hy) / edges;
              if (m < 1) a *= m;
            }
            a = (a * 255) | 0;
            const idx = (y | 0) * width + (x | 0);
            if (a > buf[idx] >>> 24) buf[idx] = (a << 24) | color[j];
          }
        }
      }
      scene.ctx.putImageData(scene.image, 0, 0);
    }

    // The canvas covers just its ribbons (and the room the pointer can push them), not the
    // whole section: one canvas pixel per CSS pixel, so the dots read as fine grain
    function fit(scene) {
      const { canvas, host } = scene;
      const W = host.clientWidth;
      const H = host.clientHeight;
      if (!W || !H || (scene.ribbons && W === scene.hostWidth && H === scene.hostHeight)) return;
      const ribbons = scene.set.ribbons.map((spec) => buildRibbon(spec, W, H));
      let x0 = W, y0 = H, x1 = 0, y1 = 0;
      ribbons.forEach(({ sx, sy, half }) => {
        for (let j = 0; j < SAMPLES; j++) {
          const r = (half[j] + PUSH) * 1.1;
          x0 = Math.min(x0, sx[j] - r);
          x1 = Math.max(x1, sx[j] + r);
          y0 = Math.min(y0, sy[j] - r);
          y1 = Math.max(y1, sy[j] + r);
        }
      });
      x0 = Math.max(0, Math.floor(x0));
      y0 = Math.max(0, Math.floor(y0));
      x1 = Math.min(W, Math.ceil(x1));
      y1 = Math.min(H, Math.ceil(y1));
      if (x1 <= x0 || y1 <= y0) { release(scene); return; }
      ribbons.forEach(({ sx, sy }) => {
        for (let j = 0; j < SAMPLES; j++) {
          sx[j] -= x0;
          sy[j] -= y0;
        }
      });
      const width = x1 - x0;
      const height = y1 - y0;
      Object.assign(canvas.style, { left: `${x0}px`, top: `${y0}px`, width: `${width}px`, height: `${height}px` });
      canvas.width = width;
      canvas.height = height;
      scene.image = scene.ctx.createImageData(width, height);
      scene.buf = new Uint32Array(scene.image.data.buffer);
      Object.assign(scene, { ribbons, width, height, top: y0, hostWidth: W, hostHeight: H });
      draw(scene); // with reduced motion, this static frame is all that's drawn
    }
    // Far from the screen, a scene gives its pixels back; fit() makes them again
    function release(scene) {
      scene.ribbons = scene.image = scene.buf = null;
      scene.hostWidth = scene.hostHeight = 0;
      scene.canvas.width = scene.canvas.height = 0;
    }

    function tick(now) {
      frame = 0;
      const active = scenes.filter((sc) => sc.visible && sc.ribbons);
      if (!active.length || reduceMotion.matches) return;
      frame = requestAnimationFrame(tick);
      const dt = Math.min(now - (last || now), 100);
      last = now;
      // Hold still while the page scrolls, so scrolling never competes with drawing
      if (now < scrollingUntil) return;
      time += dt / 1000;
      active.forEach((sc) => {
        // The drift moves about a pixel per frame at ~15fps, so that's enough at rest;
        // full rate just after the pointer moves over it
        const stirring = now - sc.pointer.movedAt < 600;
        if (now - sc.drawnAt < (stirring ? 15 : 66)) return;
        sc.drawnAt = now;
        const p = sc.pointer;
        p.x += (p.tx - p.x) * 0.3;
        p.y += (p.ty - p.y) * 0.3;
        p.power += ((p.inside ? 1 : 0) - p.power) * 0.08;
        draw(sc);
      });
    }
    function start() {
      if (frame || reduceMotion.matches) return;
      last = 0;
      frame = requestAnimationFrame(tick);
    }

    // A scene has pixels while its section is within a screen of the viewport, and is
    // drawn while its canvas is on screen
    const nearby = new IntersectionObserver((entries) => entries.forEach((entry) => {
      const scene = sceneOf.get(entry.target);
      scene.near = entry.isIntersecting;
      if (!scene.near) { release(scene); return; }
      fit(scene);
      start();
    }), { rootMargin: '100% 0px' });
    const onScreen = new IntersectionObserver((entries) => entries.forEach((entry) => {
      const scene = sceneOf.get(entry.target);
      scene.visible = entry.isIntersecting;
      if (scene.visible) start();
    }));
    const resized = new ResizeObserver((entries) => entries.forEach((entry) => {
      const scene = sceneOf.get(entry.target);
      if (scene.near) fit(scene);
    }));

    canvases.forEach((canvas) => {
      const set = RIBBONS[canvas.dataset.particles];
      const ctx = canvas.getContext('2d');
      if (!set || !ctx) return;
      const host = canvas.parentElement; // what it's sized to: its section, or a pinned box in it
      const area = canvas.closest('section, footer') || host; // where the pointer stirs it
      const scene = {
        canvas, host, set, ctx, edges: set.edges || 0, near: false, visible: false, drawnAt: 0,
        ribbons: null, image: null, buf: null, width: 0, height: 0, top: 0, hostWidth: 0, hostHeight: 0,
        pointer: { x: 0, y: 0, tx: 0, ty: 0, power: 0, inside: false, movedAt: 0 }
      };
      scenes.push(scene);
      sceneOf.set(canvas, scene);
      sceneOf.set(host, scene);

      // The canvas ignores the pointer, so follow it over the canvas's section instead
      area.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        const r = canvas.getBoundingClientRect();
        const p = scene.pointer;
        p.tx = e.clientX - r.left;
        p.ty = e.clientY - r.top;
        if (!p.inside && p.power < 0.01) { // start where the pointer is, not where it left
          p.x = p.tx;
          p.y = p.ty;
        }
        p.inside = true;
        p.movedAt = performance.now();
        start();
      });
      area.addEventListener('pointerleave', () => { scene.pointer.inside = false; });

      nearby.observe(host);
      onScreen.observe(canvas);
      resized.observe(host);
    });

    window.addEventListener('scroll', () => { scrollingUntil = performance.now() + 150; }, { passive: true });
    reduceMotion.addEventListener('change', start);
  }

  /* ---------- Enquiry selections (plan) ---------- */
  const form = $('[data-enquiry-form]');
  const packageSelect = $('[data-package-select]');

  function buildFormOptions() {
    $$('[data-package]').forEach((card) => {
      const name = card.dataset.package;
      const price = $('.price__price', card)?.textContent.replace(/\s+/g, ' ').trim() || '';
      packageSelect.add(new Option(price ? `${name} — ${price}` : name, name));
    });
  }

  function flash(select) {
    const field = select.closest('.field');
    field.classList.remove('is-flash');
    void field.offsetWidth;
    field.classList.add('is-flash');
    setTimeout(() => field.classList.remove('is-flash'), 1300);
  }

  function setSelect(select, value) {
    if (!select || ![...select.options].some((o) => o.value === value)) return false;
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    flash(select);
    return true;
  }

  function syncSelectedCards() {
    $$('[data-package]').forEach((c) => c.classList.toggle('is-selected', c.dataset.package === packageSelect.value));
  }

  /* ---------- Add-ons and the running estimate ---------- */
  // Plan and add-on prices are read from the text on the page, so the HTML stays the only
  // place to edit them. The plan lives in the form's plan dropdown; the add-ons are tick
  // boxes added to each Optional Enhancements item. An item marked data-addon-qty (e.g.
  // Additional Pages) also gets a − / + number picker; its tick box follows the count.
  const flatText = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
  const lkr = (text) => {
    const m = text.match(/\d[\d,]*/);
    return m ? Number(m[0].replace(/,/g, '')) : null;
  };
  const fmtLKR = (n) => `LKR ${n.toLocaleString('en-US')}`;
  let addons = [];

  // How many of an add-on: the picker's value (0…max) for quantity items, otherwise 1
  const qtyOf = (a) => (a.qty ? Math.max(0, Math.min(a.max, parseInt(a.qty.value, 10) || 0)) : 1);

  function setQty(a, n) {
    a.qty.value = String(Math.max(0, Math.min(a.max, n)));
    a.input.checked = qtyOf(a) > 0;
  }

  function addQuantity(li, a) {
    const button = (text, label, step) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'qty__btn';
      b.textContent = text;
      b.setAttribute('aria-label', label);
      b.addEventListener('click', () => { setQty(a, qtyOf(a) + step); updateEstimate(); });
      return b;
    };
    a.qty = document.createElement('input');
    Object.assign(a.qty, { type: 'number', className: 'qty__input', min: '0', max: String(a.max), step: '1', value: '0' });
    a.qty.inputMode = 'numeric';
    a.qty.setAttribute('aria-label', `${a.name}, how many`);
    // While typing, follow the number; on leaving the field, tidy it into range
    a.qty.addEventListener('input', () => { a.input.checked = qtyOf(a) > 0; updateEstimate(); });
    a.qty.addEventListener('change', () => { setQty(a, qtyOf(a)); updateEstimate(); });

    const picker = document.createElement('div');
    picker.className = 'qty';
    picker.append(button('−', `One fewer: ${a.name}`, -1), a.qty, button('+', `One more: ${a.name}`, 1));
    li.classList.add('has-qty');
    li.append(picker);
  }

  function initAddons() {
    addons = $$('.addons__list li').map((li) => {
      const name = flatText($('.addons__item', li));
      const priceText = flatText($('.addons__price', li));
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.className = 'addon__check';
      input.value = name;
      const box = document.createElement('span');
      box.className = 'addon__box';
      box.setAttribute('aria-hidden', 'true');
      const label = document.createElement('label');
      label.className = 'addon';
      label.append(input, box, ...li.childNodes);
      li.append(label);
      const a = {
        name,
        priceText,
        price: lkr(priceText) || 0,
        monthly: /\/\s*mo\b/i.test(priceText),
        from: /starting|from|\+/i.test(priceText),
        input,
        qty: null,
        max: Number(li.dataset.addonMax) || 20
      };
      if (li.hasAttribute('data-addon-qty')) addQuantity(li, a);
      input.addEventListener('change', () => {
        // Ticking a quantity item starts it at 1; unticking sets it back to 0
        if (a.qty) setQty(a, input.checked ? Math.max(1, qtyOf(a)) : 0);
        updateEstimate();
      });
      return a;
    });

    const panel = $('[data-estimate]');
    if (panel) panel.hidden = false;
    // "Add to enquiry" scrolls to the form (its own href) and points out the estimate there
    $('[data-estimate-add]')?.addEventListener('click', () => {
      const field = $('[data-estimate-field]');
      if (!field || field.hidden) return;
      field.classList.remove('is-flash');
      void field.offsetWidth;
      field.classList.add('is-flash');
      setTimeout(() => field.classList.remove('is-flash'), 1300);
    });
    updateEstimate();
  }

  function getEstimate() {
    const card = $$('[data-package]').find((c) => c.dataset.package === packageSelect.value) || null;
    const planText = card ? flatText($('.price__price', card)) : '';
    const planPrice = card ? lkr(planText) : null;
    const picked = addons.filter((a) => a.input.checked);
    const sum = (list) => list.reduce((total, a) => total + a.price * qtyOf(a), 0);
    return {
      plan: card ? card.dataset.package : '',
      planText,                                // e.g. "LKR 40,000+" or "Custom"
      custom: Boolean(card) && planPrice === null,
      picked,
      once: (planPrice || 0) + sum(picked.filter((a) => !a.monthly)),
      monthly: sum(picked.filter((a) => a.monthly)),
      from: planText.includes('+') || picked.some((a) => a.from) // starting prices, so the total is too
    };
  }

  // [name, price] for one ticked add-on, e.g. ["Additional Pages × 3", "LKR 15,000"]
  function addonLine(a) {
    if (!a.qty) return [a.name, a.priceText];
    const n = qtyOf(a);
    return [`${a.name} × ${n}`, fmtLKR(a.price * n)];
  }

  // One line for the form and the message, e.g. "LKR 55,000+ one-time + LKR 5,000 / mo"
  function estimateText(e) {
    const parts = [];
    if (e.custom) parts.push('Custom retainer (quoted after a discovery call)');
    if (e.once) parts.push(`${fmtLKR(e.once)}${e.from ? '+' : ''} one-time`);
    if (e.monthly) parts.push(`${fmtLKR(e.monthly)} / mo`);
    return parts.join(' + ');
  }

  function updateEstimate() {
    if (!packageSelect) return;
    const e = getEstimate();
    const count = e.picked.length;
    const addonCount = `${count} add-on${count === 1 ? '' : 's'}`;
    const plus = e.from ? '+' : '';

    // Pricing: the add-ons intro and the pinned estimate panel
    const lead = $('[data-addons-lead]');
    if (lead) {
      lead.textContent = e.plan
        ? `Extras for your ${e.plan} plan. Tick any to add them to your estimate.`
        : 'Pick a plan above, then tick any extras to build an estimate.';
    }

    let total = '—';
    let note = '';
    if (e.custom) {
      total = e.once ? `Custom + ${fmtLKR(e.once)}${plus}` : 'Custom';
      note = 'retainer quoted after a call';
    } else if (e.once) {
      total = `${fmtLKR(e.once)}${plus}`;
      note = 'one-time';
    } else if (e.monthly) {
      total = fmtLKR(e.monthly);
      note = 'per month';
    }
    if (e.monthly && (e.custom || e.once)) note += ` · plus ${fmtLKR(e.monthly)} / mo`;

    const totalEl = $('[data-estimate-total]');
    if (totalEl) totalEl.textContent = total;
    const noteEl = $('[data-estimate-note]');
    if (noteEl) noteEl.textContent = note;
    const planEl = $('[data-estimate-plan]');
    if (planEl) {
      planEl.textContent = e.plan
        ? `${e.plan} · ${count ? addonCount : 'no add-ons yet'}`
        : count ? `No plan chosen yet · ${addonCount}` : 'Choose a plan above to start.';
    }

    // Enquiry form: the itemised estimate
    const field = $('[data-estimate-field]');
    if (!field) return;
    field.hidden = !e.plan && !count;
    const lines = $('[data-estimate-lines]', field);
    lines.replaceChildren(...[
      ...(e.plan ? [[`${e.plan} plan`, e.planText]] : []),
      ...e.picked.map(addonLine)
    ].map(([name, price]) => {
      const li = document.createElement('li');
      const n = document.createElement('span');
      const p = document.createElement('span');
      n.textContent = name;
      p.textContent = price;
      li.append(n, p);
      return li;
    }));
    $('[data-estimate-sum]', field).textContent = estimateText(e) || '—';
  }

  function initSelections() {
    if (!form) return;
    buildFormOptions();
    initAddons();

    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-select-package]');
      if (!trigger) return;
      setSelect(packageSelect, trigger.dataset.selectPackage);
      // The link's own href handles scrolling (#addons, so the add-ons come next)
    });

    packageSelect.addEventListener('change', () => {
      syncSelectedCards();
      updateEstimate();
    });

    // Support deep links, e.g. ?package=Dynamic%20Applications#contact
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

    // The plan's price, the ticked add-ons and the estimate travel with the form fields
    function collect() {
      const data = Object.fromEntries(new FormData(form).entries());
      delete data.botcheck;
      const est = getEstimate();
      if (est.plan) data.package = `${est.plan} — ${est.planText}`;
      if (est.picked.length) {
        data.addons = est.picked.map((a) => {
          const [name, price] = addonLine(a);
          return a.qty ? `${name} — ${price} (${a.priceText})` : `${name} — ${price}`;
        }).join('\n');
      }
      if (est.plan || est.picked.length) data.estimate = estimateText(est);
      return data;
    }

    function summary(data) {
      return [
        `Name: ${data.name}`,
        `Email: ${data.email}`,
        `Business: ${data.business || '—'}`,
        `Plan: ${data.package || 'Not sure yet'}`,
        ...(data.addons ? ['Add-ons:', ...data.addons.split('\n').map((line) => `• ${line}`)] : []),
        ...(data.estimate ? [`Estimate: ${data.estimate}`] : []),
        `Budget (LKR): ${data.budget || 'Prefer not to say'}`,
        ...(data.message.trim() ? ['', data.message.trim()] : [])
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
      addons.forEach((a) => {
        a.input.checked = false;
        if (a.qty) setQty(a, 0);
      });
      updateCount();
      syncSelectedCards();
      updateEstimate();
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

  /* ---------- Why Choose Us: the web the pointer lights up, and the card demos ---------- */
  // Draws one big web (viewBox -500…500, hub at 0 0) into both [data-why-web] layers; CSS
  // shows the first faintly and the second only round the pointer (--mx / --my on the
  // panel). Cards tilt toward the pointer (--rx / --ry) and light their edge nearest it
  // (--mouse-x / --mouse-y). Each card's demo starts the first time it comes into view.
  function initWhyChooseUs() {
    const root = $('[data-why]');
    if (!root) return;
    const cards = $$('[data-why-card]', root);
    const f = (n) => n.toFixed(1);
    const ease = (t) => 1 - (1 - t) ** 3;
    const onView = (el, fn, threshold) => {
      if (!el) return;
      if (!('IntersectionObserver' in window)) { fn(); return; }
      const seen = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        seen.disconnect();
        fn();
      }, { threshold });
      seen.observe(el);
    };

    // The web: 18 spokes, then 9 rings (inner to outer) that dip between the spokes
    const SPOKES = 18;
    const at = (r, deg) => [r * Math.cos((deg * Math.PI) / 180), r * Math.sin((deg * Math.PI) / 180)];
    let web = '';
    for (let k = 0; k < SPOKES; k++) {
      const [x1, y1] = at(24, (k * 360) / SPOKES);
      const [x2, y2] = at(500, (k * 360) / SPOKES);
      web += `<path pathLength="1" style="--i: ${k % 6}" d="M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}"/>`;
    }
    [48, 84, 124, 168, 216, 268, 324, 384, 448].forEach((r, i) => {
      let d = '';
      for (let k = 0; k <= SPOKES; k++) {
        const [x, y] = at(r, (k * 360) / SPOKES);
        if (!k) { d += `M${f(x)} ${f(y)}`; continue; }
        const [cx, cy] = at(r * 0.94, ((k - 0.5) * 360) / SPOKES);
        d += `Q${f(cx)} ${f(cy)} ${f(x)} ${f(y)}`;
      }
      web += `<path pathLength="1" style="--i: ${i + 4}" d="${d}"/>`;
    });
    const webs = $$('[data-why-web]', root);
    webs.forEach((svg) => { svg.innerHTML = web; });
    // Threads stay about a pixel wide whatever size the web is drawn at
    const fit = () => webs.forEach((svg) => svg.style.setProperty('--sw', (1000 / (svg.clientWidth || 1000)).toFixed(3)));
    fit();
    window.addEventListener('resize', fit);

    // The pointer: light, edge glow and tilt, worked out once a frame. The cards' untilted
    // boxes (so the tilt can't feed back into itself) are measured when the pointer comes in
    // and after a resize; reading them between style writes would force a layout per card.
    if (finePointer.matches) {
      let ev = null;
      let frame = 0;
      let boxes = null;
      const measure = () => {
        boxes = cards.map((card) => {
          let x = 0;
          let y = 0;
          for (let n = card; n && n !== root; n = n.offsetParent) {
            x += n.offsetLeft;
            y += n.offsetTop;
          }
          const max = card.classList.contains('why-card--wide') ? 3 : 6; // degrees
          return { card, x, y, w: card.offsetWidth, h: card.offsetHeight, max };
        });
      };
      const track = () => {
        frame = 0;
        const r = root.getBoundingClientRect();
        if (!boxes) measure();
        const mx = ev.clientX - r.left;
        const my = ev.clientY - r.top;
        root.style.setProperty('--mx', `${f(mx)}px`);
        root.style.setProperty('--my', `${f(my)}px`);
        boxes.forEach(({ card, x: left, y: top, w, h, max }) => {
          const x = mx - left;
          const y = my - top;
          card.style.setProperty('--mouse-x', `${f(x)}px`);
          card.style.setProperty('--mouse-y', `${f(y)}px`);
          if (!reduceMotion.matches && x >= 0 && y >= 0 && x <= w && y <= h) {
            card.style.setProperty('--rx', `${f((0.5 - y / h) * max * 2)}deg`);
            card.style.setProperty('--ry', `${f((x / w - 0.5) * max * 2)}deg`);
          } else {
            card.style.removeProperty('--rx');
            card.style.removeProperty('--ry');
          }
        });
      };
      root.addEventListener('pointerenter', () => { boxes = null; });
      window.addEventListener('resize', () => { boxes = null; });
      root.addEventListener('pointermove', (e) => {
        ev = e;
        root.classList.add('is-lit');
        if (!frame) frame = requestAnimationFrame(track);
      });
      root.addEventListener('pointerleave', () => {
        root.classList.remove('is-lit');
        cards.forEach((card) => {
          card.style.removeProperty('--rx');
          card.style.removeProperty('--ry');
        });
      });
    }

    // Stats count from data-from to the number written in the page
    const statsList = $('[data-why-stats]', root);
    const stats = $$('b[data-from]', root);
    if (stats.length && !reduceMotion.matches) {
      const runs = stats.map((b) => {
        const to = parseFloat(b.textContent);
        const from = parseFloat(b.dataset.from);
        const dec = parseInt(b.dataset.decimals || '0', 10);
        const suffix = b.dataset.suffix || '';
        const show = (v) => { b.textContent = v.toFixed(dec) + suffix; };
        show(from);
        return (t) => show(from + (to - from) * ease(t));
      });
      onView(statsList, () => {
        const t0 = performance.now();
        const step = (now) => {
          const t = Math.min(1, (now - t0) / 1800);
          runs.forEach((run) => run(t));
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }, 0.5);
    }

    // 01 — the pen tool. The middle anchor's two handles mirror each other through it; the
    // pointer pulls one, and left alone it drifts by itself. Runs only while on screen.
    const pen = $('[data-why-pen]', root);
    if (pen) {
      const svg = $('svg', pen);
      const curve = $('.pen__curve', pen);
      const fill = $('.pen__fill', pen);
      const handle = $('.pen__handle', pen);
      const knobs = $$('[data-pen-knob]', pen);
      const cursor = $('[data-pen-cursor]', pen);
      const code = $('[data-pen-code]', pen);
      const A = [300, 110];
      const cur = [220, 60];
      let goal = null; // where the pointer has the handle; null = drifting
      let frame = 0;

      const draw = ([hx, hy]) => {
        const rx = 2 * A[0] - hx;
        const ry = 2 * A[1] - hy;
        const d = `M40 170C140 40 ${f(hx)} ${f(hy)} ${A[0]} ${A[1]}S470 210 560 50`;
        curve.setAttribute('d', d);
        fill.setAttribute('d', `${d}L560 220L40 220Z`);
        handle.setAttribute('d', `M${f(hx)} ${f(hy)}L${f(rx)} ${f(ry)}`);
        knobs[0]?.setAttribute('cx', f(hx));
        knobs[0]?.setAttribute('cy', f(hy));
        knobs[1]?.setAttribute('cx', f(rx));
        knobs[1]?.setAttribute('cy', f(ry));
        cursor?.setAttribute('transform', `translate(${f(hx + 4)} ${f(hy + 4)})`);
        if (code) code.textContent = `M40 170 C140 40, ${Math.round(hx)} ${Math.round(hy)}, 300 110`;
      };
      const loop = (now) => {
        const t = now / 1000;
        const [gx, gy] = goal || [220 + Math.cos(t * 0.8) * 80, 60 + Math.sin(t * 1.25) * 48];
        cur[0] += (gx - cur[0]) * (goal ? 0.25 : 0.08);
        cur[1] += (gy - cur[1]) * (goal ? 0.25 : 0.08);
        draw(cur);
        frame = requestAnimationFrame(loop);
      };
      const start = () => { if (!frame && !reduceMotion.matches) frame = requestAnimationFrame(loop); };
      const stop = () => { cancelAnimationFrame(frame); frame = 0; };
      draw(cur);

      if ('IntersectionObserver' in window) {
        new IntersectionObserver((entries) => entries.forEach((entry) => {
          if (entry.isIntersecting) start(); else stop();
        })).observe(pen);
      }
      pen.addEventListener('pointermove', (e) => {
        const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
        goal = [Math.max(60, Math.min(540, p.x)), Math.max(8, Math.min(212, p.y))];
        if (reduceMotion.matches) { cur[0] = goal[0]; cur[1] = goal[1]; draw(cur); }
      });
      pen.addEventListener('pointerleave', () => { goal = null; });
    }

    // 02 — the speed gauge: runs once on view, and again from the button. The metrics
    // improve from data-bad to their real value as the score climbs.
    const gauge = $('[data-why-gauge]', root);
    if (gauge) {
      const ring = $('[data-gauge-ring]', gauge);
      const score = $('[data-gauge-score]', gauge);
      const btn = $('[data-gauge-run]', gauge);
      const label = $('[data-gauge-label]', gauge);
      const metrics = $$('[data-gauge-metric]', gauge).map((dd) => ({
        dd,
        good: parseFloat(dd.dataset.gaugeMetric),
        bad: parseFloat(dd.dataset.bad),
        dec: parseInt(dd.dataset.decimals || '0', 10),
        unit: dd.dataset.unit || ''
      }));
      const show = (t) => {
        ring.style.strokeDashoffset = f(100 - 100 * t);
        score.textContent = String(Math.round(100 * t));
        metrics.forEach((m) => { m.dd.textContent = (m.bad + (m.good - m.bad) * t).toFixed(m.dec) + m.unit; });
      };
      let running = false;
      const run = () => {
        if (running || reduceMotion.matches) return;
        running = true;
        btn.disabled = true;
        btn.classList.remove('is-done');
        label.textContent = 'Running…';
        const t0 = performance.now();
        const step = (now) => {
          const t = Math.min(1, (now - t0) / 1900);
          show(ease(t));
          if (t < 1) { requestAnimationFrame(step); return; }
          running = false;
          btn.disabled = false;
          btn.classList.add('is-done');
          label.textContent = 'Scored 100 · run again';
        };
        requestAnimationFrame(step);
      };
      if (!reduceMotion.matches) show(0);
      btn?.addEventListener('click', run);
      onView(gauge, run, 0.6);
    }

    // 03 — the search results: held at the start until in view, then yours climbs to #1;
    // hovering the card plays it again
    const serp = $('[data-why-serp]', root);
    if (serp && !reduceMotion.matches) {
      let busy = true;
      serp.classList.add('is-climbing', 'is-held');
      const you = $('.serp__row--you', serp);
      you?.addEventListener('animationend', () => { busy = false; });
      onView(serp, () => serp.classList.remove('is-held'), 0.6);
      serp.closest('[data-why-card]')?.addEventListener('pointerenter', () => {
        if (busy) return;
        busy = true;
        serp.classList.remove('is-climbing');
        void serp.offsetWidth; // restart the animations
        serp.classList.add('is-climbing');
      });
    }

    // 04 — the status page's bars, one per day
    const bars = $('[data-why-bars]', root);
    if (bars) bars.innerHTML = Array.from({ length: 36 }, (_, i) => `<i style="--i: ${i}"></i>`).join('');

    // Its looping animations (radar, heartbeat, status lights) rest while it's off screen
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => root.classList.toggle('is-offscreen', !entry.isIntersecting)).observe(root);
    }
  }

  applyConfig();
  initTheme();
  initSplitText(); // before initMotion, so the words exist when the hero starts animating
  initActiveNav();
  initHeaderScroll();
  initMenu();
  initCobwebs(); // before initMotion, so the webs exist before they're marked is-visible
  initMotion();
  initScrollEffects();
  initSpiderMark();
  initServices();
  initWorkPreviews();
  initParticles();
  initMarquees();
  initCursorBadge();
  initMagnetic();
  initSelections();
  initWhyChooseUs();
  initForm();
})();
