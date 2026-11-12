/* =========================================================================
   CobWebZ Live Lab: four small, working experiments (index.html, #lab).
   Each one runs only while it's on screen, works with a mouse, a finger or
   the keyboard, and keeps still for visitors who prefer reduced motion
   (it still responds to them; it just doesn't move by itself).
   No libraries: canvas, SVG, container queries and a variable font.
   ========================================================================= */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  // Theme colours, read from the CSS tokens and refreshed when the theme flips
  let palette = {};
  const readPalette = () => {
    const cs = getComputedStyle(document.documentElement);
    const v = (name) => cs.getPropertyValue(name).trim();
    palette = { ink: v('--color-ink'), line: v('--color-line-strong'), blue: v('--color-dusty-blue-deep'), rose: v('--color-rose-gold'), body: v('--color-body') };
  };
  readPalette();
  const themeListeners = [];
  new MutationObserver(() => { readPalette(); themeListeners.forEach((fn) => fn()); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // Calls back with true/false as el comes on and off screen
  function visibility(el, fn) {
    if (!('IntersectionObserver' in window)) { fn(true); return; }
    new IntersectionObserver(([entry]) => fn(entry.isIntersecting), { rootMargin: '80px 0px' }).observe(el);
  }

  // Range inputs show their fill up to the thumb (style.css reads --fill)
  const fillRange = (input) => {
    const p = ((input.value - input.min) / (input.max - input.min)) * 100;
    input.style.setProperty('--fill', `${p.toFixed(1)}%`);
  };

  // Sizes a canvas to its box at the screen's pixel density; returns the CSS size
  function fitCanvas(canvas, ctx) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h };
  }

  /* ---------- EXP 01: layouts that adapt ---------- */
  // The frame's width is set here (from the slider or by dragging its edge); everything
  // inside it reflows with container queries in style.css. The breakpoints below match
  // those queries (the mini site's width is the frame's, less 28px of padding).
  function initFluid() {
    const card = $('[data-lab="fluid"]');
    if (!card) return;
    const stage = $('.lab-fluid', card);
    const frame = $('[data-fluid-frame]', card);
    const handle = $('[data-fluid-handle]', card);
    const range = $('[data-fluid-range]', card);
    const out = $('[data-fluid-out]', card);
    const MIN = 230;
    let pct = 100;

    const room = () => {
      const cs = getComputedStyle(stage);
      return stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    };
    function apply(p) {
      pct = clamp(p, 0, 100);
      const avail = Math.max(MIN, room());
      const w = Math.round(MIN + (avail - MIN) * (pct / 100));
      frame.style.setProperty('--w', `${w}px`);
      const inner = w - 28;
      const mode = inner <= 380 ? 'Phone' : inner <= 520 ? 'Tablet' : 'Desktop';
      range.value = String(Math.round(pct));
      fillRange(range);
      out.textContent = `${w}px · ${mode}`;
      range.setAttribute('aria-valuetext', `${w} pixels wide, ${mode.toLowerCase()} layout`);
    }
    range.addEventListener('input', () => apply(Number(range.value)));

    let drag = null;
    handle.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return;
      e.preventDefault();
      handle.setPointerCapture(e.pointerId);
      drag = { id: e.pointerId, left: frame.getBoundingClientRect().left };
      stage.classList.add('is-dragging');
    });
    handle.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const avail = Math.max(MIN + 1, room());
      apply(((e.clientX - drag.left - MIN) / (avail - MIN)) * 100);
    });
    const end = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null;
      stage.classList.remove('is-dragging');
    };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
    new ResizeObserver(() => apply(pct)).observe(stage);
    apply(100);
  }

  /* ---------- EXP 02: a web in three dimensions ---------- */
  // 160 points spread evenly over a sphere (a Fibonacci lattice), each tied to its nearest
  // neighbours, turned in 3D and projected with perspective onto a 2D canvas every frame.
  // Nearer threads are drawn darker; the point under the pointer lights up with its threads.
  function initGlobe() {
    const stage = $('[data-globe-stage]');
    const canvas = $('[data-globe]');
    if (!stage || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const N = 160;
    const golden = Math.PI * (3 - Math.sqrt(5));
    const pts = Array.from({ length: N }, (_, i) => {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      return [Math.cos(golden * i) * r, y, Math.sin(golden * i) * r];
    });
    const edges = new Set();
    pts.forEach((p, i) => {
      pts.map((q, j) => [j, (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2])
        .filter(([j]) => j !== i)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 3)
        .forEach(([j]) => edges.add(i < j ? `${i}-${j}` : `${j}-${i}`));
    });
    const links = [...edges].map((key) => key.split('-').map(Number));
    const proj = pts.map(() => ({ x: 0, y: 0, z: 0, s: 1 }));

    let yaw = 0.6;
    let pitch = -0.35;
    let vYaw = 0;
    let vPitch = 0;
    let drag = null;
    let hover = -1;
    let pointer = null;
    let visible = false;
    let frame = 0;
    let last = 0;
    const SPIN = 0.22; // radians per second when left alone

    function draw() {
      const { w, h } = fitCanvas(canvas, ctx);
      const R = Math.min(w, h) * 0.36;
      const cx = w / 2;
      const cy = h / 2;
      const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      pts.forEach(([x, y, z], i) => {
        const x1 = x * cyw + z * syw;
        const z1 = -x * syw + z * cyw;
        const y2 = y * cp - z1 * sp;
        const z2 = y * sp + z1 * cp;
        const s = 2.8 / (2.8 + z2); // perspective: nearer points sit larger and further out
        const o = proj[i];
        o.x = cx + x1 * R * s;
        o.y = cy + y2 * R * s;
        o.z = z2;
        o.s = s;
      });
      if (pointer && !drag) {
        let best = 22 * 22;
        hover = -1;
        proj.forEach((o, i) => {
          const d = (o.x - pointer.x) ** 2 + (o.y - pointer.y) ** 2;
          if (o.z < 0.2 && d < best) { best = d; hover = i; }
        });
      }
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = 'round';
      ctx.strokeStyle = palette.ink;
      links.forEach(([a, b]) => {
        const pa = proj[a];
        const pb = proj[b];
        const depth = 1 - ((pa.z + pb.z) / 2 + 1) / 2; // 1 near, 0 far
        const lit = hover === a || hover === b;
        ctx.globalAlpha = lit ? 0.95 : 0.06 + depth * 0.42;
        ctx.lineWidth = lit ? 1.6 : 0.5 + depth * 0.7;
        if (lit) ctx.strokeStyle = palette.blue;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
        if (lit) ctx.strokeStyle = palette.ink;
      });
      proj.forEach((o, i) => {
        const depth = 1 - (o.z + 1) / 2;
        ctx.globalAlpha = i === hover ? 1 : 0.15 + depth * 0.8;
        ctx.fillStyle = i === hover ? palette.rose : palette.ink;
        ctx.beginPath();
        ctx.arc(o.x, o.y, (i === hover ? 4.5 : 1 + depth * 1.6) * o.s, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    function tick(now) {
      frame = 0;
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      if (!drag) {
        // Let go, it coasts and slows; then drifts on by itself
        vYaw *= Math.pow(0.04, dt);
        vPitch *= Math.pow(0.04, dt);
        yaw += (vYaw + (reduceMotion.matches ? 0 : SPIN)) * dt;
        pitch = clamp(pitch + vPitch * dt, -1.2, 1.2);
      }
      draw();
      const moving = drag || !reduceMotion.matches || Math.abs(vYaw) + Math.abs(vPitch) > 0.01;
      if (visible && moving) frame = requestAnimationFrame(tick);
    }
    const wake = () => {
      if (frame) return;
      last = 0;
      frame = requestAnimationFrame(tick);
    };

    const local = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    stage.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return;
      stage.setPointerCapture(e.pointerId);
      drag = { id: e.pointerId, ...local(e), t: performance.now() };
      vYaw = vPitch = 0;
      stage.classList.add('is-dragging');
      wake();
    });
    stage.addEventListener('pointermove', (e) => {
      pointer = local(e);
      if (drag && e.pointerId === drag.id) {
        const now = performance.now();
        const dx = pointer.x - drag.x;
        const dy = pointer.y - drag.y;
        const dt = Math.max(0.008, (now - drag.t) / 1000);
        yaw += dx * 0.009;
        pitch = clamp(pitch + dy * 0.009, -1.2, 1.2);
        vYaw = (dx * 0.009) / dt;
        vPitch = (dy * 0.009) / dt;
        Object.assign(drag, pointer, { t: now });
      }
      wake();
    });
    const release = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (performance.now() - drag.t > 80) vYaw = vPitch = 0; // held still before letting go
      drag = null;
      stage.classList.remove('is-dragging');
      wake();
    };
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', release);
    stage.addEventListener('pointerleave', () => { pointer = null; hover = -1; wake(); });
    stage.addEventListener('keydown', (e) => {
      const turns = { ArrowLeft: [-0.18, 0], ArrowRight: [0.18, 0], ArrowUp: [0, -0.18], ArrowDown: [0, 0.18] };
      if (!(e.key in turns)) return;
      e.preventDefault();
      yaw += turns[e.key][0];
      pitch = clamp(pitch + turns[e.key][1], -1.2, 1.2);
      wake();
    });

    visibility(stage, (on) => {
      visible = on;
      if (on) wake();
    });
    new ResizeObserver(() => { if (!frame) draw(); }).observe(stage);
    themeListeners.push(() => { if (!frame) draw(); });
    reduceMotion.addEventListener('change', wake);
  }

  /* ---------- EXP 03: type that responds ---------- */
  // Each letter gets a fixed-width box, measured at the heaviest weight, so changing the
  // weight never moves the letters around it. The pointer (or a finger) sets each letter's
  // weight by how close it is; the slider sets them all, for keyboards and reduced motion.
  function initType() {
    const stage = $('[data-type-stage]');
    const word = $('[data-type-word]');
    if (!stage || !word) return;
    const readout = $('[data-type-readout]');
    const range = $('[data-type-range]');
    const out = $('[data-type-out]');
    const text = word.textContent.trim();
    word.textContent = '';
    const letters = [...text].map((c) => {
      const span = document.createElement('span');
      span.className = 'ch';
      span.textContent = c;
      word.append(span);
      return span;
    });
    const MIN = 300;
    const MAX = 700;
    // Boxes are sized at 600: snug at rest, and the few letters near the pointer that go
    // heavier than that simply spill a hair past their box (their neighbours don't move)
    const FIT = 600;
    let base = Number(range?.value || 400);

    const measure = () => {
      word.classList.add('is-measuring'); // no weight transition, so the width is read at FIT
      letters.forEach((l) => { l.style.width = ''; l.style.setProperty('--wg', FIT); });
      const widths = letters.map((l) => l.getBoundingClientRect().width);
      letters.forEach((l, i) => {
        l.style.width = `${widths[i].toFixed(2)}px`;
        l.style.setProperty('--wg', base);
      });
      void word.offsetWidth;
      word.classList.remove('is-measuring');
    };
    const show = (weights) => {
      letters.forEach((l, i) => l.style.setProperty('--wg', Math.round(weights[i])));
      if (readout) readout.textContent = Math.round(Math.max(...weights));
    };
    const rest = () => show(letters.map(() => base));

    stage.addEventListener('pointermove', (e) => {
      stage.classList.add('is-tracking');
      show(letters.map((l) => {
        const r = l.getBoundingClientRect();
        const d = (e.clientX - (r.left + r.width / 2)) / (r.width * 1.6);
        return MIN + (MAX - MIN) * Math.exp(-d * d);
      }));
    });
    stage.addEventListener('pointerleave', () => { stage.classList.remove('is-tracking'); rest(); });
    stage.addEventListener('pointercancel', () => { stage.classList.remove('is-tracking'); rest(); });
    if (range) {
      fillRange(range);
      range.addEventListener('input', () => {
        base = Number(range.value);
        fillRange(range);
        if (out) out.textContent = String(base);
        rest();
      });
    }
    // The boxes are measured once Geist itself has loaded (a fallback font has other widths)
    (document.fonts ? document.fonts.load(`700 80px Geist`).then(() => document.fonts.ready) : Promise.resolve())
      .then(measure, measure);
    let w = 0;
    new ResizeObserver(() => {
      if (Math.abs(stage.clientWidth - w) < 1) return;
      w = stage.clientWidth;
      measure();
    }).observe(stage);
    rest();
  }

  /* ---------- EXP 04: motion with real physics ---------- */
  // A node hangs on a spring below its anchor. Pull it and let go: each step adds the
  // spring's pull (stiffness × stretch) and the damping's drag (damping × speed), the way
  // a real spring behaves. The graph below traces its sideways swing over the last 3 s.
  function initSpring() {
    const card = $('[data-lab="spring"]');
    if (!card) return;
    const stage = $('.lab-spring', card);
    const svg = $('[data-spring-svg]', card);
    const node = $('[data-spring-node]', card);
    const thread = $('[data-spring-thread]', card);
    const plot = $('[data-spring-plot]', card);
    const pctx = plot.getContext('2d');
    const kInput = $('[data-spring-k]', card);
    const cInput = $('[data-spring-c]', card);
    const kOut = $('[data-spring-k-out]', card);
    const cOut = $('[data-spring-c-out]', card);
    const readout = $('[data-spring-readout]', card);
    const flick = $('[data-spring-flick]', card);
    if (!svg || !node || !pctx) return;

    const ANCHOR = { x: 300, y: 20 };
    const REST = { x: 300, y: 140 };
    const p = { ...REST };
    const v = { x: 0, y: 0 };
    let k = Number(kInput.value);
    let c = Number(cInput.value);
    let drag = null;
    let frame = 0;
    let last = 0;
    let visible = false;
    let simTime = 0; // seconds simulated since the last release (off-screen pauses don't count)
    let settledReported = true;
    const trace = []; // [time, sideways offset]

    const render = () => {
      node.setAttribute('transform', `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})`);
      const mx = (ANCHOR.x + p.x) / 2;
      const my = (ANCHOR.y + p.y) / 2;
      thread.setAttribute('d', `M${ANCHOR.x} ${ANCHOR.y}Q${(mx + (p.x - ANCHOR.x) * 0.08).toFixed(1)} ${(my + 6).toFixed(1)} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`);
    };
    const drawPlot = (now) => {
      const { w, h } = fitCanvas(plot, pctx);
      pctx.clearRect(0, 0, w, h);
      const mid = h / 2;
      pctx.globalAlpha = 1;
      pctx.strokeStyle = palette.line;
      pctx.lineWidth = 1;
      pctx.beginPath();
      pctx.moveTo(0, mid);
      pctx.lineTo(w, mid);
      pctx.stroke();
      const span = 3000;
      while (trace.length && now - trace[0][0] > span) trace.shift();
      if (trace.length < 2) return;
      const grad = pctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, palette.blue);
      grad.addColorStop(1, palette.rose);
      pctx.strokeStyle = grad;
      pctx.lineWidth = 2;
      pctx.lineJoin = 'round';
      pctx.beginPath();
      trace.forEach(([t, off], i) => {
        const x = w - ((now - t) / span) * w;
        const y = mid - clamp(off / 260, -1, 1) * (mid - 6);
        if (i) pctx.lineTo(x, y); else pctx.moveTo(x, y);
      });
      pctx.stroke();
    };

    function step(dt) {
      const ax = -k * (p.x - REST.x) - c * v.x;
      const ay = -k * (p.y - REST.y) - c * v.y;
      v.x += ax * dt;
      v.y += ay * dt;
      p.x += v.x * dt;
      p.y += v.y * dt;
    }
    function tick(now) {
      frame = 0;
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      if (!drag) {
        // Small fixed sub-steps keep stiff springs stable whatever the frame rate
        const n = Math.max(1, Math.ceil(dt / (1 / 240)));
        for (let i = 0; i < n; i++) step(dt / n);
        if (!settledReported) simTime += dt;
      }
      trace.push([now, p.x - REST.x]);
      render();
      drawPlot(now);
      const still = !drag && Math.hypot(p.x - REST.x, p.y - REST.y) < 0.4 && Math.hypot(v.x, v.y) < 2;
      if (still) {
        p.x = REST.x; p.y = REST.y; v.x = v.y = 0;
        render();
        if (!settledReported) {
          settledReported = true;
          readout.textContent = `Settled in ${simTime.toFixed(2)} s`;
        }
      }
      // Keep drawing until the trace has scrolled flat, then rest
      const flat = trace.length && trace.every(([, off]) => Math.abs(off) < 0.5);
      if (visible && (!still || !flat)) frame = requestAnimationFrame(tick);
    }
    const wake = () => {
      if (frame) return;
      last = 0;
      frame = requestAnimationFrame(tick);
    };

    const toSvg = (e) => new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    node.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return;
      e.preventDefault();
      node.setPointerCapture(e.pointerId);
      const q = toSvg(e);
      drag = { id: e.pointerId, ox: q.x - p.x, oy: q.y - p.y, t: performance.now(), px: p.x, py: p.y };
      v.x = v.y = 0;
      stage.classList.add('is-dragging');
      wake();
    });
    node.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const q = toSvg(e);
      const now = performance.now();
      const nx = clamp(q.x - drag.ox, 30, 570);
      const ny = clamp(q.y - drag.oy, 50, 245);
      const dt = Math.max(0.008, (now - drag.t) / 1000);
      v.x = (nx - p.x) / dt;
      v.y = (ny - p.y) / dt;
      p.x = nx;
      p.y = ny;
      drag.t = now;
      wake();
    });
    const release = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (performance.now() - drag.t > 80) v.x = v.y = 0;
      drag = null;
      stage.classList.remove('is-dragging');
      simTime = 0;
      settledReported = false;
      readout.textContent = 'Settling…';
      wake();
    };
    node.addEventListener('pointerup', release);
    node.addEventListener('pointercancel', release);

    const kick = (speed) => {
      v.x += speed;
      v.y -= Math.abs(speed) * 0.25;
      simTime = 0;
      settledReported = false;
      readout.textContent = 'Settling…';
      wake();
    };
    flick?.addEventListener('click', () => kick((Math.random() < 0.5 ? -1 : 1) * (700 + Math.random() * 300)));
    const syncInputs = () => {
      k = Number(kInput.value);
      c = Number(cInput.value);
      kOut.textContent = String(k);
      cOut.textContent = String(c);
      fillRange(kInput);
      fillRange(cInput);
    };
    kInput.addEventListener('input', syncInputs);
    cInput.addEventListener('input', syncInputs);
    syncInputs();
    render();

    let introduced = false;
    visibility(stage, (on) => {
      visible = on;
      if (!on) return;
      wake();
      // The first time it's seen, one small flick shows that it's alive
      if (!introduced && !reduceMotion.matches) {
        introduced = true;
        setTimeout(() => kick(520), 500);
      }
    });
    themeListeners.push(() => { if (!frame) drawPlot(performance.now()); });
    new ResizeObserver(() => { if (!frame) drawPlot(performance.now()); }).observe(plot);
  }

  // Each experiment sets itself up only as its card nears the screen, so none of this
  // costs anything while the page loads
  function whenNear(selector, init) {
    const el = $(selector);
    if (!el) return;
    if (!('IntersectionObserver' in window)) { init(); return; }
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      io.disconnect();
      init();
    }, { rootMargin: '600px 0px' });
    io.observe(el);
  }
  whenNear('[data-lab="fluid"]', initFluid);
  whenNear('[data-lab="globe"]', initGlobe);
  whenNear('[data-lab="type"]', initType);
  whenNear('[data-lab="spring"]', initSpring);
})();
