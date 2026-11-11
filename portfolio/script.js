/* Mariana Napolitani — portfolio interactions.
   Vanilla JS; Lenis (vendor/lenis.min.js) provides the smooth scrolling and is optional. */
(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const pad = (n) => String(n).padStart(2, '0');

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------------------------------------------------------
     Smooth scrolling
     --------------------------------------------------------- */
  let lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true });
    lenis.stop();
  }
  root.classList.add('is-locked'); // released when the preloader lifts

  const lock = () => { root.classList.add('is-locked'); if (lenis) lenis.stop(); };
  const unlock = () => { root.classList.remove('is-locked'); if (lenis) lenis.start(); };

  const scrollToEl = (el) => {
    if (!el) return;
    const offset = el.id === 'top' ? 0 : -64;
    if (lenis) lenis.scrollTo(el, { offset, duration: 1.5 });
    else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: reduce ? 'auto' : 'smooth' });
  };

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    const el = id.length > 1 ? $(id) : null;
    if (!el) return;
    e.preventDefault();
    scrollToEl(el);
  });

  /* ---------------------------------------------------------
     Hero title: fit the word to the container width
     --------------------------------------------------------- */
  const title = $('#heroTitle');
  const titleIn = title ? title.firstElementChild : null;

  function fitTitle() {
    if (!titleIn) return;
    const box = title.clientWidth;
    title.style.fontSize = '200px';
    const natural = titleIn.offsetWidth;
    if (natural > 0) title.style.fontSize = ((200 * box) / natural).toFixed(2) + 'px';
  }

  /* ---------------------------------------------------------
     Preloader, then the hero entrance
     --------------------------------------------------------- */
  const loaderCount = $('#loaderCount');
  const loaderBar = $('#loaderBar');
  const heroImg = $('.hero-figure img');

  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  const imgReady = heroImg && !heroImg.complete
    ? new Promise((r) => { heroImg.addEventListener('load', r, { once: true }); heroImg.addEventListener('error', r, { once: true }); })
    : Promise.resolve();
  const assets = Promise.race([Promise.all([fontsReady, imgReady]), wait(4000)]);

  // Show the signature in the loader only once its font is in, so it never flashes a fallback.
  const signFont = document.fonts && document.fonts.load ? document.fonts.load('1em "Mrs Saint Delafield"') : Promise.resolve();
  Promise.race([signFont, wait(1200)]).then(() => root.classList.add('fonts-in'), () => root.classList.add('fonts-in'));

  function runLoader() {
    const duration = reduce ? 0 : 1800;
    const t0 = performance.now();
    let assetsDone = false;
    assets.then(() => { assetsDone = true; });

    return new Promise((resolve) => {
      const step = (now) => {
        let p = duration ? clamp((now - t0) / duration, 0, 1) : 1;
        p = 1 - Math.pow(1 - p, 3);
        if (!assetsDone) p = Math.min(p, 0.92);
        if (loaderCount) loaderCount.textContent = Math.round(p * 100);
        if (loaderBar) loaderBar.style.transform = `scaleX(${p.toFixed(3)})`;
        if (p >= 1) resolve();
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  runLoader().then(async () => {
    fitTitle();
    measure();
    await wait(reduce ? 0 : 250);
    root.classList.add('is-loaded');
    unlock();
    await wait(reduce ? 0 : 450);
    root.classList.add('is-ready');
    await wait(3400);
    root.classList.add('intro-done');
  });

  /* ---------------------------------------------------------
     Per-frame scroll + pointer driven motion
     --------------------------------------------------------- */
  const hero = $('.hero');
  const heroFigure = $('#heroFigure');
  const progress = $('#progress');
  const dock = $('#dock');
  const dockPill = $('#dockPill');
  const navLinks = $$('[data-nav]');
  const sections = navLinks.map((a) => $(a.getAttribute('href'))).filter(Boolean);

  // Elements that drift with the pointer (data-depth, px) and/or with scroll (data-speed).
  const movers = $$('[data-depth], [data-speed]').map((el) => ({
    el,
    depth: parseFloat(el.dataset.depth) || 0,
    speed: parseFloat(el.dataset.speed) || 0,
    top: 0,
    height: 0,
    last: '',
  }));

  const docTop = (el) => {
    let y = 0;
    for (let n = el; n; n = n.offsetParent) y += n.offsetTop;
    return y;
  };

  let vh = innerHeight;
  let docH = 1;
  let heroH = vh;
  let sectionTops = [];

  function measure() {
    vh = innerHeight;
    docH = Math.max(1, root.scrollHeight - vh);
    heroH = hero ? hero.offsetHeight : vh;
    movers.forEach((m) => { m.top = docTop(m.el); m.height = m.el.offsetHeight; });
    sectionTops = sections.map(docTop);
  }

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  if (fine && !reduce) {
    addEventListener('pointermove', (e) => {
      pointer.tx = (e.clientX / innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });
  }

  let lastY = -1;
  let lastActive = -2;
  let frameHooks = [];

  function setActiveNav(i) {
    if (i === lastActive) return;
    lastActive = i;
    navLinks.forEach((a, k) => a.classList.toggle('is-active', k === i));
    if (!dockPill) return;
    const a = navLinks[i];
    if (!a) { dockPill.style.opacity = '0'; return; }
    dockPill.style.opacity = '1';
    dockPill.style.width = a.offsetWidth + 'px';
    dockPill.style.transform = `translateX(${a.offsetLeft}px)`;
  }

  function frame(time) {
    if (lenis) lenis.raf(time);

    const y = window.scrollY;
    const moved = y !== lastY;
    pointer.x = lerp(pointer.x, pointer.tx, 0.06);
    pointer.y = lerp(pointer.y, pointer.ty, 0.06);
    const drifting = Math.abs(pointer.x - pointer.tx) > 0.0005 || Math.abs(pointer.y - pointer.ty) > 0.0005;

    if (moved) {
      lastY = y;
      if (progress) progress.style.transform = `scaleX(${clamp(y / docH, 0, 1).toFixed(4)})`;
      if (dock) dock.classList.toggle('is-visible', y > heroH * 0.6);

      // hero depth: the word sinks behind the figure as you leave
      if (!reduce && y <= heroH) {
        const s = clamp(y / heroH, 0, 1);
        if (title) title.style.transform = `translate3d(0, ${(s * heroH * 0.2).toFixed(1)}px, 0)`;
        if (heroFigure) heroFigure.style.transform = `translate3d(0, ${(s * heroH * 0.06).toFixed(1)}px, 0) scale(${(1 + s * 0.05).toFixed(4)})`;
      }

      // Last section whose top has passed the reading line. Sections that sit side by side
      // (process and tools on desktop) share a top, so the first of them keeps the highlight.
      let active = -1;
      for (let i = 0; i < sectionTops.length; i++) {
        if (y + vh * 0.42 < sectionTops[i]) break;
        if (active < 0 || sectionTops[i] > sectionTops[active] + 8) active = i;
      }
      setActiveNav(active);
    }

    if (!reduce && (moved || drifting)) {
      for (const m of movers) {
        if (m.top + m.height < y - 300 || m.top > y + vh + 300) continue;
        const fromCentre = y + vh / 2 - (m.top + m.height / 2);
        const tx = pointer.x * m.depth;
        const ty = pointer.y * m.depth * 0.7 + fromCentre * m.speed;
        const t = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0)`;
        if (t !== m.last) { m.el.style.transform = t; m.last = t; }
      }
    }

    for (const hook of frameHooks) hook(time);
    requestAnimationFrame(frame);
  }

  let resizeTimer = 0;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { fitTitle(); measure(); lastY = -1; lastActive = -2; }, 120);
  });
  addEventListener('load', () => { fitTitle(); measure(); lastY = -1; });
  fontsReady.then(() => { fitTitle(); measure(); });

  fitTitle();
  measure();
  requestAnimationFrame(frame);

  /* ---------------------------------------------------------
     Scroll reveals
     --------------------------------------------------------- */
  const revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  /* ---------------------------------------------------------
     Custom cursor
     --------------------------------------------------------- */
  if (fine && !reduce) {
    const cursor = $('.cursor');
    const dot = $('#cursorDot');
    const ring = $('#cursorRing');
    const label = $('#cursorLabel');
    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y, shown = false;

    root.classList.add('has-cursor');
    cursor.classList.add('is-hidden');

    addEventListener('pointermove', (e) => {
      x = e.clientX; y = e.clientY;
      if (!shown) { shown = true; rx = x; ry = y; cursor.classList.remove('is-hidden'); }
      dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }, { passive: true });
    document.addEventListener('pointerleave', () => { shown = false; cursor.classList.add('is-hidden'); });
    addEventListener('pointerdown', () => cursor.classList.add('is-down'));
    addEventListener('pointerup', () => cursor.classList.remove('is-down'));

    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest('[data-cursor], a, button, .step');
      const kind = t ? (t.dataset.cursor || 'link') : '';
      cursor.classList.toggle('is-view', kind === 'view');
      cursor.classList.toggle('is-link', kind === 'link');
      label.textContent = kind === 'view' ? 'View' : '';
    });

    frameHooks.push(() => {
      rx = lerp(rx, x, 0.17);
      ry = lerp(ry, y, 0.17);
      ring.style.transform = `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0)`;
    });
  }

  /* ---------------------------------------------------------
     Magnetic buttons, tilt cards, tool spotlight
     --------------------------------------------------------- */
  if (fine && !reduce) {
    $$('[data-magnetic]').forEach((el) => {
      const strength = parseFloat(el.dataset.magnetic) || 0.25;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const mx = e.clientX - (r.left + r.width / 2);
        const my = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${(mx * strength).toFixed(1)}px, ${(my * strength * 1.4).toFixed(1)}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });

    $$('.tilt').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--rx', (-py * 7).toFixed(2) + 'deg');
        el.style.setProperty('--ry', (px * 9).toFixed(2) + 'deg');
        el.style.setProperty('--gx', ((px + 0.5) * 100).toFixed(1) + '%');
        el.style.setProperty('--gy', ((py + 0.5) * 100).toFixed(1) + '%');
      });
      el.addEventListener('pointerleave', () => {
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      });
    });

    const toolGrid = $('#toolGrid');
    if (toolGrid) {
      const tools = $$('.tool', toolGrid);
      toolGrid.addEventListener('pointermove', (e) => {
        for (const t of tools) {
          const r = t.getBoundingClientRect();
          t.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px');
          t.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px');
        }
      });
    }
  }

  /* ---------------------------------------------------------
     Process: steps cycle on their own; hover or focus takes over
     --------------------------------------------------------- */
  const steps = $$('.step');
  const arc = $('#orbitArc');
  const stepNum = $('#stepNum');
  const processEl = $('#process');

  if (steps.length && processEl) {
    let active = -1;
    let timer = 0;
    let inView = false;
    let held = false;

    const setStep = (i) => {
      if (i === active) return;
      active = i;
      steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
      if (arc) arc.style.strokeDashoffset = String(100 - ((i + 1) / steps.length) * 100);
      if (stepNum) stepNum.textContent = pad(i + 1);
    };
    const play = () => {
      clearInterval(timer);
      if (reduce || !inView || held) return;
      timer = setInterval(() => setStep((active + 1) % steps.length), 2600);
    };

    steps.forEach((s, i) => {
      s.addEventListener('pointerenter', () => { held = true; setStep(i); play(); });
      s.addEventListener('focus', () => { held = true; setStep(i); play(); });
      s.addEventListener('blur', () => { held = false; play(); });
      s.addEventListener('click', () => setStep(i));
    });
    processEl.addEventListener('pointerleave', () => { held = false; play(); });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        if (inView && active < 0) setStep(0);
        play();
      }, { threshold: 0.3 }).observe(processEl);
    } else {
      inView = true; setStep(0); play();
    }
  }

  /* ---------------------------------------------------------
     Case study overlay
     --------------------------------------------------------- */
  const caseEl = $('#case');
  const projects = $$('.project');

  if (caseEl && projects.length) {
    const panel = $('.case-panel', caseEl);
    const stage = $('#caseStage');
    const tagList = $('#caseTags');
    let index = 0;
    let lastFocus = null;
    let closeTimer = 0;

    const fill = (i) => {
      index = (i + projects.length) % projects.length;
      const p = projects[index];
      $('#caseNum').textContent = pad(index + 1);
      $('#caseTotal').textContent = pad(projects.length);
      $('#caseTitle').textContent = p.dataset.title || '';
      $('#caseCat').textContent = p.dataset.cat || '';
      $('#caseDesc').textContent = p.dataset.desc || '';
      $('#caseRole').textContent = p.dataset.role || '';
      $('#caseYear').textContent = p.dataset.year || '';
      stage.replaceChildren($('.mock', p).cloneNode(true));
      tagList.replaceChildren(...$$('.tags li', p).map((li) => li.cloneNode(true)));
    };

    const open = (i) => {
      clearTimeout(closeTimer);
      lastFocus = document.activeElement;
      fill(i);
      caseEl.hidden = false;
      lock();
      requestAnimationFrame(() => requestAnimationFrame(() => caseEl.classList.add('is-open')));
      $('.case-close', caseEl).focus({ preventScroll: true });
    };

    const close = () => {
      caseEl.classList.remove('is-open');
      unlock();
      closeTimer = setTimeout(() => { caseEl.hidden = true; stage.replaceChildren(); }, 520);
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    };

    const go = (dir) => {
      panel.classList.add('is-swapping');
      setTimeout(() => { fill(index + dir); panel.scrollTop = 0; panel.classList.remove('is-swapping'); }, reduce ? 0 : 270);
    };

    projects.forEach((p, i) => {
      const btn = $('[data-open]', p);
      if (btn) btn.addEventListener('click', () => open(i));
    });
    const viewAll = $('#viewAll');
    if (viewAll) viewAll.addEventListener('click', () => open(0));
    $$('[data-close]', caseEl).forEach((el) => el.addEventListener('click', close));
    $('#casePrev').addEventListener('click', () => go(-1));
    $('#caseNext').addEventListener('click', () => go(1));

    document.addEventListener('keydown', (e) => {
      if (caseEl.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Tab') {
        // keep focus inside the dialog
        const focusable = $$('button, a[href]', caseEl);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ---------------------------------------------------------
     Copy the email address
     --------------------------------------------------------- */
  const toast = $('#toast');
  let toastTimer = 0;
  const showToast = (msg) => {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-on'), 2200);
  };

  $$('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const text = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(text);
        showToast('Email copied to clipboard');
      } catch (err) {
        location.href = 'mailto:' + text;
      }
    });
  });

  /* ---------------------------------------------------------
     Hero dust: slow motes drifting up through the light
     --------------------------------------------------------- */
  const canvas = $('#dust');
  if (canvas && hero && !reduce) {
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, motes = [], visible = true;

    const spawn = (anywhere) => ({
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 10,
      r: 0.5 + Math.random() * 1.7,
      vx: (Math.random() - 0.5) * 0.14,
      vy: -(0.06 + Math.random() * 0.24),
      alpha: 0.12 + Math.random() * 0.45,
      phase: Math.random() * Math.PI * 2,
      twinkle: 0.006 + Math.random() * 0.02,
      rgb: Math.random() < 0.65 ? '217,185,165' : '190,72,92',
    });

    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(clamp(w / 22, 24, 70));
      motes = Array.from({ length: count }, () => spawn(true));
    };
    size();
    addEventListener('resize', size);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(hero);
    }

    frameHooks.push(() => {
      if (!visible) return;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        m.x += m.vx + pointer.x * 0.08;
        m.y += m.vy;
        m.phase += m.twinkle;
        if (m.y < -10 || m.x < -10 || m.x > w + 10) { motes[i] = spawn(false); continue; }
        const a = m.alpha * (0.55 + 0.45 * Math.sin(m.phase));
        ctx.beginPath();
        ctx.fillStyle = `rgba(${m.rgb},${a.toFixed(3)})`;
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  /* footer year */
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();
})();
