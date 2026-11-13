/* =========================================================================
   CobWebZ × Originkit — six effects adapted from Originkit components
   (originkit.dev): Spider Button, Glow Border, Scramble Text, Rolling
   Counter, Bouncing Dot Tabs and Tilt. The originals are React/Framer components; these
   are plain-JavaScript ports, recoloured to the CobWebZ palette, that need no
   libraries and load nothing from elsewhere (the site's security policy allows
   only its own files).

   Each one is switched on by an attribute in the HTML:
     [data-spider-button]  a button with cobwebs inside that webs the pointer
     [data-glow-border]    a comet of light running round an element's edge
     [data-scramble]       text that decodes itself when it scrolls into view
     [data-tilt]           a card that gives way under the pointer
     [data-dot-tabs]       a filter row whose dot jumps to the chosen tab
     window.CobwebzKit.roll(el, text)   digits that roll like an odometer
   With reduced motion they all sit still; on touch screens the pointer-led
   ones (spider, tilt) simply don't run.
   ========================================================================= */
(() => {
  'use strict';

  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const cssVar = (name, el = document.documentElement) => getComputedStyle(el).getPropertyValue(name).trim();

  // Turns any CSS colour into [r, g, b] (0–255), via a 1×1 canvas so every format works
  const toRgb = (() => {
    const c = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const cache = new Map();
    return (colour) => {
      if (cache.has(colour)) return cache.get(colour);
      c.clearRect(0, 0, 1, 1);
      c.fillStyle = '#000';
      c.fillStyle = colour;
      c.fillRect(0, 0, 1, 1);
      const [r, g, b] = c.getImageData(0, 0, 1, 1).data;
      cache.set(colour, [r, g, b]);
      return [r, g, b];
    };
  })();
  const rgba = ([r, g, b], a = 1) => `rgba(${r}, ${g}, ${b}, ${a})`;

  const themeListeners = [];
  new MutationObserver(() => themeListeners.forEach((fn) => fn()))
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  function whenVisible(el, fn, margin = '0px') {
    if (!('IntersectionObserver' in window)) { fn(true); return; }
    new IntersectionObserver(([e]) => fn(e.isIntersecting), { rootMargin: margin }).observe(el);
  }

  /* ---------- Spider Button ---------- */
  // Adapted from Originkit's Spider Button. Inside the button: a silk thread just inside the
  // edge and old cobwebs in its inner corners (drawn once, on a canvas behind the label).
  // Outside it, on one shared overlay: as the pointer comes within SENSE its spider sense
  // tingles (zigzags flicker from the side it's coming from); within REACH web lines shoot
  // from the nearest point of the edge, stick to the pointer and trail it, strung together
  // by cross threads, with a little splat where they land; pull past RELEASE and they snap
  // and reel back in. The lines are verlet ropes held nearly taut. The button stays an
  // ordinary link or button: the system cursor, clicks and keyboard are untouched.
  const SENSE = 170;
  const REACH = 78;
  const RELEASE = 150;
  const NP = 12; // points per rope
  const GRIPS = [[0, 0], [5, 7], [-4, 6], [8, 13], [-2, 12], [3, 3], [6, 18], [0, 16]];
  let overlay = null;
  let octx = null;
  const ensureOverlay = () => {
    if (overlay) return;
    overlay = document.createElement('canvas');
    overlay.className = 'ok-web-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.append(overlay);
    octx = overlay.getContext('2d');
  };
  const fitOverlay = () => {
    if (!overlay) return 1;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (overlay.width !== Math.round(w * dpr) || overlay.height !== Math.round(h * dpr)) {
      overlay.width = Math.round(w * dpr);
      overlay.height = Math.round(h * dpr);
    }
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return dpr;
  };
  const activeSpiders = new Set();
  let overlayFrame = 0;
  let overlayLast = 0;
  function overlayTick(now) {
    overlayFrame = 0;
    const dt = overlayLast ? Math.min(0.033, (now - overlayLast) / 1000) : 0;
    overlayLast = now;
    fitOverlay();
    octx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const s of activeSpiders) s.step(dt, now / 1000);
    if (activeSpiders.size) overlayFrame = requestAnimationFrame(overlayTick);
    else { overlayLast = 0; octx.clearRect(0, 0, window.innerWidth, window.innerHeight); }
  }
  const wakeOverlay = () => { if (!overlayFrame) overlayFrame = requestAnimationFrame(overlayTick); };

  function initSpider(btn) {
    // The cobwebs inside: a small canvas behind the label
    const inner = document.createElement('canvas');
    inner.className = 'ok-spider__inner';
    inner.setAttribute('aria-hidden', 'true');
    btn.prepend(inner);
    btn.classList.add('ok-spider');
    const ictx = inner.getContext('2d');
    const hash = (k, salt) => { const v = Math.sin((k + salt * 17.3) * 12.9898) * 43758.5453; return v - Math.floor(v); };

    // The pill, in viewport px, and walking round its edge (perimeter distance s from the top-left)
    const pill = { x: 0, y: 0, w: 0, h: 0, r: 0, ls: 0, P: 1 };
    const measure = () => {
      const r = btn.getBoundingClientRect();
      Object.assign(pill, { x: r.left, y: r.top, w: r.width, h: r.height, r: r.height / 2 });
      pill.ls = Math.max(0, pill.w - pill.h);
      pill.P = 2 * pill.ls + 2 * Math.PI * pill.r || 1;
    };
    const at = (s, p = pill) => {
      const { x, y, w, h, r, ls, P } = p;
      s = ((s % P) + P) % P;
      if (s < ls) return { x: x + r + s, y, nx: 0, ny: -1 };
      s -= ls;
      if (s < Math.PI * r) { const a = -Math.PI / 2 + s / r; return { x: x + w - r + Math.cos(a) * r, y: y + r + Math.sin(a) * r, nx: Math.cos(a), ny: Math.sin(a) }; }
      s -= Math.PI * r;
      if (s < ls) return { x: x + w - r - s, y: y + h, nx: 0, ny: 1 };
      s -= ls;
      const a = Math.PI / 2 + s / r;
      return { x: x + r + Math.cos(a) * r, y: y + r + Math.sin(a) * r, nx: Math.cos(a), ny: Math.sin(a) };
    };
    const nearest = (qx, qy) => {
      const { x, w, r, ls } = pill;
      const cy = pill.y + r;
      const cx = clamp(qx, x + r, x + w - r);
      const dist = Math.hypot(qx - cx, qy - cy) - r;
      let s;
      if (qx > x + w - r) s = ls + (Math.atan2(qy - cy, qx - cx) + Math.PI / 2) * r;
      else if (qx < x + r) {
        let a = Math.atan2(qy - cy, qx - cx);
        if (a < -Math.PI / 2) a += Math.PI * 2;
        s = 2 * ls + Math.PI * r + (a - Math.PI / 2) * r;
      } else s = qy < cy ? qx - (x + r) : ls + Math.PI * r + (x + w - r - qx);
      return { s, dist };
    };
    const loopDiff = (a, b) => { const P = pill.P; let d = (b - a) % P; if (d > P / 2) d -= P; if (d < -P / 2) d += P; return d; };

    // Draws the thread and the cobwebs inside the button, in its own coordinates
    function drawInner() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = btn.offsetWidth;
      const h = btn.offsetHeight;
      inner.width = Math.round(w * dpr);
      inner.height = Math.round(h * dpr);
      ictx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ictx.clearRect(0, 0, w, h);
      if (!w || !h) return; // hidden for now; the ResizeObserver redraws it once shown
      const p = { x: 0, y: 0, w, h, r: h / 2, ls: Math.max(0, w - h) };
      p.P = 2 * p.ls + 2 * Math.PI * p.r;
      const silk = toRgb(getComputedStyle(btn).color);
      ictx.lineCap = 'round';
      ictx.lineJoin = 'round';
      // the silk thread: two fine strands twisting round each other just inside the edge
      for (const [phase, alpha, width] of [[0, 0.5, 0.8], [Math.PI, 0.28, 0.55]]) {
        ictx.strokeStyle = rgba(silk, alpha);
        ictx.lineWidth = width;
        ictx.beginPath();
        const n = Math.max(24, Math.round(p.P / 5));
        for (let k = 0; k <= n; k++) {
          const sk = (k / n) * p.P;
          const q = at(sk, p);
          const inset = 3 + 0.7 * Math.sin(sk * 0.21 + phase) + 0.35 * Math.sin(sk * 0.053 + phase * 0.5);
          if (k) ictx.lineTo(q.x - q.nx * inset, q.y - q.ny * inset); else ictx.moveTo(q.x - q.nx * inset, q.y - q.ny * inset);
        }
        ictx.closePath();
        ictx.stroke();
      }
      // old cobwebs in two corners: fans of spokes from the edge, rings sagging back, a few torn
      const capS = (a) => {
        if (Math.cos(a) >= 0) return p.ls + (a + Math.PI / 2) * p.r;
        const b = a < Math.PI / 2 ? a + Math.PI * 2 : a;
        return 2 * p.ls + Math.PI * p.r + (b - Math.PI / 2) * p.r;
      };
      const size = Math.min(26, h * 0.62);
      ictx.save();
      ictx.beginPath();
      ictx.moveTo(p.r, 0); ictx.lineTo(w - p.r, 0); ictx.arc(w - p.r, p.r, p.r, -Math.PI / 2, Math.PI / 2);
      ictx.lineTo(p.r, h); ictx.arc(p.r, p.r, p.r, Math.PI / 2, Math.PI * 1.5); ictx.closePath();
      ictx.clip();
      ictx.strokeStyle = rgba(silk, 0.42);
      ictx.lineWidth = 0.7;
      [[capS(-Math.PI * 0.75), size, 0], [capS(Math.PI * 0.22), size * 0.85, 1]].forEach(([s, sz, salt]) => {
        const q = at(s, p);
        const na = Math.atan2(-q.ny, -q.nx);
        const hx = q.x - q.nx * 0.5;
        const hy = q.y - q.ny * 0.5;
        const m = 6;
        const spokes = [];
        ictx.beginPath();
        for (let k = 0; k < m; k++) {
          const a = na + ((k / (m - 1)) * 2 - 1) * 1.2 + (hash(k, salt) - 0.5) * 0.2;
          const L = sz * (0.7 + 0.45 * hash(k, salt + 3));
          spokes.push([Math.cos(a) * L, Math.sin(a) * L]);
          ictx.moveTo(hx, hy);
          ictx.lineTo(hx + Math.cos(a) * L, hy + Math.sin(a) * L);
        }
        [0.32, 0.55, 0.78].forEach((f, ri) => {
          for (let k = 0; k < m - 1; k++) {
            const ax = hx + spokes[k][0] * f, ay = hy + spokes[k][1] * f;
            const bx = hx + spokes[k + 1][0] * f, by = hy + spokes[k + 1][1] * f;
            if (hash(k * 5 + ri, salt + 11) < 0.15) {
              const len = sz * (0.1 + 0.12 * hash(k + ri, salt + 13));
              ictx.moveTo(ax, ay);
              ictx.quadraticCurveTo(ax + (bx - ax) * 0.2, ay + len * 0.6, ax + (bx - ax) * 0.1, ay + len);
              continue;
            }
            ictx.moveTo(ax, ay);
            ictx.quadraticCurveTo(hx + ((ax + bx) / 2 - hx) * 0.8, hy + ((ay + by) / 2 - hy) * 0.8, bx, by);
          }
        });
        ictx.stroke();
      });
      ictx.restore();
    }
    drawInner();
    new ResizeObserver(drawInner).observe(btn);
    themeListeners.push(drawInner);
    document.fonts?.ready.then(drawInner);

    if (!finePointer.matches) return;

    // The web outside, on the shared overlay
    let mode = 'idle'; // idle → seek → grow → hold → snap → idle
    let list = [];
    let cross = [];
    let grow = 0;
    let seekF = 0;
    let splat = 0;
    let fireS = 0;
    let hand = { x: -999, y: -999 };
    let present = false;
    let spokes = [];
    let onScreen = false;

    const spawn = () => {
      measure();
      const root = at(fireS);
      list = [];
      const total = 9; // 5 threads and 4 hairs between them
      for (let k = 0; k < total; k++) {
        const hair = k % 2 === 1;
        const mi = Math.floor(k / 2);
        const g = hair
          ? [(GRIPS[mi][0] + GRIPS[mi + 1][0]) / 2, (GRIPS[mi][1] + GRIPS[mi + 1][1]) / 2]
          : GRIPS[mi];
        list.push({
          x: new Float32Array(NP).fill(root.x), y: new Float32Array(NP).fill(root.y),
          px: new Float32Array(NP).fill(root.x), py: new Float32Array(NP).fill(root.y),
          spread: (k / (total - 1)) * 2 - 1 + (Math.random() - 0.5) * 0.15,
          s: fireS, slack: 1.02 + Math.random() * (hair ? 0.2 : 0.12), width: hair ? 0.45 : 0.8 + Math.random() * 0.4,
          grip: g, ex: root.x, ey: root.y, follow: 9 + Math.random() * 8, seg: 0, phase: Math.random() * 10, hair
        });
      }
      cross = [];
      for (let k = 0; k < list.length - 1; k++) {
        const count = 2 + Math.floor(Math.random() * 2);
        for (let c = 0; c < count; c++) {
          const i = 3 + Math.floor(Math.random() * (NP - 5));
          const j = clamp(i + Math.round((Math.random() - 0.5) * 3), 2, NP - 2);
          cross.push([k, k + 1, i, j, (Math.random() - 0.5) * 5]);
        }
      }
      spokes = Array.from({ length: 9 }, () => [(Math.random() - 0.5) * 0.35, 0.8 + Math.random() * 0.35]);
      grow = 0;
      mode = 'seek';
      activeSpiders.add(api);
      wakeOverlay();
    };

    const api = {
      step(dt, time) {
        measure();
        const ink = toRgb(cssVar('--color-ink'));
        const near = nearest(hand.x, hand.y);
        fireS = near.s;
        const D = Math.max(0, near.dist);
        if (!reduceMotion.matches) {
          if (mode === 'snap' && present && D < SENSE && list.length) mode = 'seek';
          else if (mode === 'seek' && (!present || D > SENSE + 25)) mode = 'snap';
          else if (mode === 'seek' && D < REACH) { mode = 'grow'; grow = 0; }
          else if ((mode === 'grow' || mode === 'hold') && (!present || D > RELEASE)) mode = 'snap';
        }
        const holding = mode === 'grow' || mode === 'hold';
        const seeking = mode === 'seek';
        const fT = seeking ? clamp((SENSE - D) / (SENSE - REACH), 0, 1) : holding ? 1 : 0;
        seekF += (fT - seekF) * Math.min(1, dt * 5);
        const stretch = holding ? Math.min(1, D / RELEASE) : 0;
        if (mode === 'grow') { grow = Math.min(1, grow + dt / 0.28); if (grow >= 1) mode = 'hold'; }
        splat = holding && mode === 'hold' ? Math.min(1, splat + dt / 0.6) : Math.max(0, splat - dt / 0.4);

        // simulate the ropes
        const spreadPx = Math.max(10, Math.min(pill.w * 0.3, D * 0.4 + 10)) * (seeking ? 0.65 : 1);
        let alive = 0;
        for (const st of list) {
          st.s += loopDiff(st.s, fireS + st.spread * spreadPx) * Math.min(1, dt * (mode === 'snap' ? 1.5 : 6));
          const root = at(st.s);
          const rx = root.x - root.nx * 3;
          const ry = root.y - root.ny * 3;
          const gx = hand.x + st.grip[0];
          const gy = hand.y + st.grip[1];
          let pin = false;
          const taut = 1 + (st.slack - 1) * 0.25;
          if (seeking) { st.ex = rx; st.ey = ry; pin = true; st.seg = 0.01; }
          else if (mode === 'grow') {
            const e = 1 - Math.pow(1 - grow, 3); // thwip: fast, then landing
            st.ex = rx + (gx - rx) * e; st.ey = ry + (gy - ry) * e; pin = true;
            st.seg = (Math.hypot(st.ex - rx, st.ey - ry) * taut) / (NP - 1);
          } else if (holding) {
            const k = 1 - Math.exp(-dt * st.follow * 1.4);
            st.ex += (gx - st.ex) * k; st.ey += (gy - st.ey) * k; pin = true;
            st.seg = (Math.hypot(st.ex - rx, st.ey - ry) * taut) / (NP - 1);
          } else {
            st.seg *= Math.exp(-dt * 5.5); // reel back in
            if (st.seg * (NP - 1) > 1.5) alive++;
          }
          const damp = mode === 'snap' ? 0.86 : 0.92;
          for (let i = 1; i < NP; i++) {
            const vx = (st.x[i] - st.px[i]) * damp;
            const vy = (st.y[i] - st.py[i]) * damp;
            st.px[i] = st.x[i]; st.py[i] = st.y[i];
            const mid = Math.sin((i / (NP - 1)) * Math.PI);
            st.x[i] += vx + Math.sin(time * 1.6 + st.phase + i * 0.55) * 5 * mid * dt * dt;
            st.y[i] += vy + (65 + Math.cos(time * 1.3 + st.phase + i * 0.45) * 5 * mid) * dt * dt;
          }
          st.x[0] = st.px[0] = rx; st.y[0] = st.py[0] = ry;
          if (pin) { st.x[NP - 1] = st.ex; st.y[NP - 1] = st.ey; }
          const len = Math.max(0.01, st.seg);
          for (let it = 0; it < 14; it++) {
            for (let i = 0; i < NP - 1; i++) {
              const dx = st.x[i + 1] - st.x[i];
              const dy = st.y[i + 1] - st.y[i];
              const d = Math.hypot(dx, dy) || 0.0001;
              const diff = (d - len) / d;
              const a = i === 0 ? 0 : 0.5;
              const b = pin && i + 1 === NP - 1 ? 0 : i === 0 ? 1 : 0.5;
              const m = a + b || 1;
              st.x[i] += dx * diff * (a / m); st.y[i] += dy * diff * (a / m);
              st.x[i + 1] -= dx * diff * (b / m); st.y[i + 1] -= dy * diff * (b / m);
            }
          }
          for (let pass = 0; pass < 2; pass++) {
            for (let i = 1; i < NP - 1; i++) {
              st.x[i] += ((st.x[i - 1] + st.x[i + 1]) / 2 - st.x[i]) * 0.22;
              st.y[i] += ((st.y[i - 1] + st.y[i + 1]) / 2 - st.y[i]) * 0.22;
            }
          }
          if (!Number.isFinite(st.x[NP - 1])) { st.x.fill(rx); st.y.fill(ry); st.px.fill(rx); st.py.fill(ry); }
        }
        if (mode === 'snap' && alive === 0) {
          mode = 'idle';
          list = [];
          cross = [];
          if (splat <= 0) activeSpiders.delete(api);
        }
        if (mode === 'idle' && splat <= 0) activeSpiders.delete(api);

        // draw: the tingle, the lines and their net, the splat
        const c = octx;
        c.lineCap = 'round';
        c.lineJoin = 'round';
        const tingle = seeking ? seekF : 0;
        if (tingle > 0.02) {
          const cx = pill.x + pill.w / 2;
          const cy = pill.y + pill.h / 2;
          const toward = Math.atan2(hand.y - cy, hand.x - cx);
          c.strokeStyle = rgba(ink, Math.min(0.8, 0.15 + 0.6 * tingle));
          c.lineWidth = 1.4;
          for (let k = 0; k < 7; k++) {
            const a = toward + ((k / 6) * 2 - 1) * 1.22;
            const ca = Math.cos(a), sa = Math.sin(a);
            const flick = 0.75 + 0.25 * Math.sin(time * 31 + k * 2.3);
            const len = (7 + 14 * tingle) * flick;
            const bx = cx + ca * (pill.w / 2 + 9), by = cy + sa * (pill.h / 2 + 9);
            c.beginPath();
            c.moveTo(bx, by);
            for (let z = 1; z <= 4; z++) {
              const t = (z / 4) * len, side = (z % 2 ? 1 : -1) * 2.6 * (z < 4 ? 1 : 0);
              c.lineTo(bx + ca * t - sa * side, by + sa * t + ca * side);
            }
            c.stroke();
          }
        }
        if (list.length && !seeking) {
          const thin = 1 - 0.5 * stretch;
          c.strokeStyle = rgba(ink, 0.85);
          for (const st of list) {
            c.lineWidth = (st.hair ? 0.6 : 1.3 * st.width) * thin;
            c.beginPath();
            c.moveTo(st.x[0], st.y[0]);
            for (let i = 1; i < NP - 1; i++) c.quadraticCurveTo(st.x[i], st.y[i], (st.x[i] + st.x[i + 1]) / 2, (st.y[i] + st.y[i + 1]) / 2);
            c.lineTo(st.x[NP - 1], st.y[NP - 1]);
            c.stroke();
          }
          if (holding) {
            c.strokeStyle = rgba(ink, 0.55);
            c.lineWidth = 0.55;
            for (const [a, b, i, j, kink] of cross) {
              const A = list[a], B = list[b];
              c.beginPath();
              c.moveTo(A.x[i], A.y[i]);
              c.quadraticCurveTo((A.x[i] + B.x[j]) / 2 + kink * 0.3, (A.y[i] + B.y[j]) / 2 + Math.abs(kink) * 0.8, B.x[j], B.y[j]);
              c.stroke();
            }
          }
        }
        if (splat > 0.01) {
          // a small web splat where the lines landed, spreading while they hold
          const e = splat * splat * (3 - 2 * splat);
          const mx = hand.x + 3, my = hand.y + 9;
          const R = 4 + e * 9;
          const pts = spokes.map(([j, l], k) => { const a = (k / spokes.length) * Math.PI * 2 + j; return [mx + Math.cos(a) * R * l, my + Math.sin(a) * R * l]; });
          c.strokeStyle = rgba(ink, 0.7 * e + 0.2);
          c.lineWidth = 0.6;
          c.beginPath();
          for (const [x, y] of pts) { c.moveTo(mx, my); c.lineTo(x, y); }
          for (const f of [0.4, 0.75, 1]) {
            if (f > 0.4 + e) continue;
            pts.forEach(([x, y], k) => {
              const [nx, ny] = pts[(k + 1) % pts.length];
              const ax = mx + (x - mx) * f, ay = my + (y - my) * f;
              const bx = mx + (nx - mx) * f, by = my + (ny - my) * f;
              c.moveTo(ax, ay);
              c.quadraticCurveTo(mx + ((ax + bx) / 2 - mx) * (0.82 + 0.1 * f), my + ((ay + by) / 2 - my) * (0.82 + 0.1 * f), bx, by);
            });
          }
          c.stroke();
        }
      }
    };

    whenVisible(btn, (on) => { onScreen = on; }, `${SENSE}px`);
    window.addEventListener('pointermove', (e) => {
      if (!onScreen || reduceMotion.matches || e.pointerType === 'touch') return;
      hand = { x: e.clientX, y: e.clientY };
      present = true;
      if (mode === 'idle') {
        // one web at a time: with buttons side by side, the first one in range takes the pointer
        if (activeSpiders.size) return;
        measure();
        if (!pill.w || !pill.h) return; // hidden
        if (nearest(hand.x, hand.y).dist < SENSE) { ensureOverlay(); spawn(); }
      } else wakeOverlay();
    }, { passive: true });
    // the pointer left the window: let go
    document.addEventListener('mouseout', (e) => {
      if (e.relatedTarget) return;
      present = false;
      if (mode !== 'idle') wakeOverlay();
    });
    window.addEventListener('blur', () => { present = false; });
  }

  /* ---------- Glow Border ---------- */
  // Adapted from Originkit's Glow Border: a conic gradient spinning behind the element, masked
  // down to a thin ring so only a comet of light travels the edge; it speeds up while the
  // pointer is over the element. The rotating layer is sized to the element's diagonal (plus a
  // margin), the smallest square that covers it at every angle.
  function initGlow(host) {
    const ring = document.createElement('span');
    ring.className = 'ok-glow';
    ring.setAttribute('aria-hidden', 'true');
    const layer = document.createElement('span');
    layer.className = 'ok-glow__layer';
    ring.append(layer);
    host.append(ring);
    host.classList.add('has-ok-glow');
    const size = () => {
      const s = Math.ceil(Math.hypot(host.offsetWidth, host.offsetHeight)) + 24;
      Object.assign(layer.style, { width: `${s}px`, height: `${s}px`, top: `calc(50% - ${s / 2}px)`, left: `calc(50% - ${s / 2}px)` });
    };
    size();
    new ResizeObserver(size).observe(host);
    if (reduceMotion.matches) return;
    let rotation = Math.random() * 360;
    let boost = 1;
    let target = 1;
    let frame = 0;
    let last = 0;
    const speed = Number(host.dataset.glowBorder) || 9; // as in the original: 24 ≈ 86°/s
    host.addEventListener('pointerenter', () => { target = 4; });
    host.addEventListener('pointerleave', () => { target = 1; });
    const tick = (now) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      boost += (target - boost) * (1 - Math.exp(-dt / 0.12));
      rotation = (rotation + speed * 3.6 * boost * dt) % 360;
      layer.style.transform = `rotate(${rotation.toFixed(2)}deg)`;
      frame = requestAnimationFrame(tick);
    };
    whenVisible(host, (on) => {
      if (on && !frame) { last = 0; frame = requestAnimationFrame(tick); }
      if (!on && frame) { cancelAnimationFrame(frame); frame = 0; }
    });
  }

  /* ---------- Scramble Text ---------- */
  // Adapted from Originkit's Scramble Text: when the text first scrolls into view, every
  // letter flickers through random glyphs and they lock into place left to right; with a
  // mouse, hovering plays it again. The box is held at its final width while it runs, so
  // nothing around it moves.
  const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const LOWER = 'abcdefghijklmnopqrstuvwxyz';
  function initScramble(el) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP) });
    let node = null;
    for (let n = walker.nextNode(); n; n = walker.nextNode()) node = n; // the last real text in it
    if (!node) return;
    let running = false;
    const play = () => {
      if (running || reduceMotion.matches) return;
      const final = node.textContent;
      running = true;
      el.style.width = `${el.getBoundingClientRect().width}px`;
      const chars = [...final];
      const settle = chars.map((ch, i) => 160 + i * (420 / Math.max(1, chars.length)) + Math.random() * 120);
      const t0 = performance.now();
      let lastSwap = 0;
      const step = (now) => {
        const t = now - t0;
        if (now - lastSwap > 45) {
          lastSwap = now;
          node.textContent = chars.map((ch, i) => {
            if (t >= settle[i] || !/[A-Za-z]/.test(ch)) return ch;
            const pool = ch === ch.toLowerCase() ? LOWER : UPPER;
            return pool[Math.floor(Math.random() * pool.length)];
          }).join('');
        }
        if (t < Math.max(...settle) + 20) { requestAnimationFrame(step); return; }
        node.textContent = final;
        el.style.width = '';
        running = false;
      };
      requestAnimationFrame(step);
    };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        setTimeout(play, 250);
      }, { threshold: 0.6 });
      io.observe(el);
    }
    if (finePointer.matches) el.addEventListener('pointerenter', play);
  }

  /* ---------- Tilt ---------- */
  // Adapted from Originkit's Tilt: the card gives way under the pointer instead of rising to
  // it. The point you're over sinks and the far side comes up, the dent darkens where it's
  // deepest and the opposite rim catches the light. One sprung pointer position (-1…1) drives
  // the rotation, the shading and the shadow, so they never disagree.
  function initTilt(card) {
    if (!finePointer.matches || reduceMotion.matches) return;
    card.classList.add('ok-tilt');
    const MAX = Number(card.dataset.tilt) || 7; // degrees at the very edge
    const pos = { x: 0, y: 0, vx: 0, vy: 0, lit: 0, vl: 0 };
    const goal = { x: 0, y: 0, lit: 0 };
    let frame = 0;
    const tick = () => {
      frame = 0;
      // spring (stiffness .14, damping .72 per frame), the original's middle setting
      for (const [k, v] of [['x', 'vx'], ['y', 'vy'], ['lit', 'vl']]) {
        pos[v] = (pos[v] + (goal[k] - pos[k]) * 0.14) * 0.72;
        pos[k] += pos[v];
      }
      // Positive rotateX sends the top back, positive rotateY the right: so the pointer at the
      // top (y = -1) sends the top back, and on the right (x = 1) the right
      const rx = (-pos.y * MAX).toFixed(3);
      const ry = (pos.x * MAX).toFixed(3);
      card.style.transform = `perspective(900px) translateZ(${(-10 * pos.lit).toFixed(2)}px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      card.style.setProperty('--tx', `${((pos.x + 1) * 50).toFixed(1)}%`);
      card.style.setProperty('--ty', `${((pos.y + 1) * 50).toFixed(1)}%`);
      card.style.setProperty('--tl', pos.lit.toFixed(3));
      const still = Math.abs(goal.x - pos.x) + Math.abs(goal.y - pos.y) + Math.abs(goal.lit - pos.lit) < 0.002 &&
        Math.abs(pos.vx) + Math.abs(pos.vy) + Math.abs(pos.vl) < 0.002;
      if (!still) frame = requestAnimationFrame(tick);
      else if (!goal.lit) card.style.transform = '';
    };
    const wake = () => { if (!frame) frame = requestAnimationFrame(tick); };
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      goal.x = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
      goal.y = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
      goal.lit = 1;
      wake();
    });
    card.addEventListener('pointerleave', () => { goal.x = goal.y = goal.lit = 0; wake(); });
  }

  /* ---------- Bouncing Dot Tabs ---------- */
  // Adapted from Originkit's Bouncing Dot Tabs: the dot beside the active tab is thrown to the
  // newly chosen one in a ballistic arc (straight across, gravity down, higher for longer
  // throws), stretching tall in the air and squashing as it takes off and lands. It follows
  // whichever tab has aria-pressed="true", however that changes.
  function initDotTabs(group) {
    const tabs = $$('[aria-pressed]', group);
    if (!tabs.length) return;
    group.classList.add('ok-dot-tabs');
    const dot = document.createElement('span');
    dot.className = 'ok-dot';
    dot.setAttribute('aria-hidden', 'true');
    group.append(dot);
    let current = null;
    const spot = (tab) => ({ x: tab.offsetLeft + 13, y: tab.offsetTop + tab.offsetHeight / 2 });
    const place = (p) => { dot.style.translate = `${p.x.toFixed(1)}px ${p.y.toFixed(1)}px`; };
    function go(tab, animate) {
      if (!tab) return;
      const to = spot(tab);
      const from = current ? spot(current) : to;
      current = tab;
      dot.getAnimations().forEach((a) => a.cancel());
      place(to);
      if (!animate || reduceMotion.matches || (from.x === to.x && from.y === to.y)) return;
      const dist = Math.hypot(to.x - from.x, to.y - from.y);
      const H = clamp(22 + dist * 0.16, 22, 70);
      const N = 16;
      const frames = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const x = from.x + (to.x - from.x) * t;
        const y = from.y + (to.y - from.y) * t - H * 4 * t * (1 - t);
        // squash at take-off and landing, stretch along the flight in between
        const air = Math.sin(t * Math.PI);
        const sy = i === 0 || i === N ? 1 : 1 + 0.3 * air;
        const sx = 1 / sy;
        frames.push({ translate: `${x.toFixed(1)}px ${y.toFixed(1)}px`, scale: `${sx.toFixed(3)} ${sy.toFixed(3)}`, offset: t });
      }
      dot.animate(frames, { duration: clamp(380 + dist * 0.6, 420, 640), easing: 'linear' }).finished.then(() => {
        dot.animate([{ scale: '1.25 0.75' }, { scale: '0.92 1.08' }, { scale: '1 1' }], { duration: 220, easing: 'ease-out' });
      }).catch(() => {});
    }
    const active = () => tabs.find((t) => t.getAttribute('aria-pressed') === 'true');
    go(active(), false);
    new MutationObserver(() => { const t = active(); if (t !== current) go(t, true); })
      .observe(group, { attributes: true, subtree: true, attributeFilter: ['aria-pressed'] });
    new ResizeObserver(() => { if (current) place(spot(current)); }).observe(group);
    document.fonts?.ready.then(() => { if (current) place(spot(current)); });
  }

  /* ---------- Rolling Counter ---------- */
  // Adapted from Originkit's Rolling Counter: every digit is a strip of 0–9 behind a window,
  // and a new number rolls each strip to its digit, the ones first and each column to the
  // left a beat later, so a change ripples across like an odometer. The real value sits in
  // the element as visually hidden text (for screen readers and copy-paste); the strips and
  // other characters are drawn with CSS-generated text, so they add nothing to the page text.
  function roll(el, text) {
    el.dataset.value = text;
    let sr = el.querySelector(':scope > .sr-only');
    let vis = el.querySelector(':scope > .ok-roll');
    if (!sr || !vis) {
      el.textContent = '';
      sr = document.createElement('span');
      sr.className = 'sr-only';
      vis = document.createElement('span');
      vis.className = 'ok-roll';
      vis.setAttribute('aria-hidden', 'true');
      el.append(sr, vis);
    }
    sr.textContent = text;
    const chars = [...text];
    const old = [...vis.children];
    // keep the cells lined up from the right, so the ones stay the ones
    const cells = chars.map((ch, i) => {
      const fromRight = chars.length - 1 - i;
      const prev = old[old.length - 1 - fromRight];
      const digit = /\d/.test(ch);
      if (prev && digit && prev.classList.contains('ok-roll__d')) return prev;
      const span = document.createElement('span');
      if (digit) {
        span.className = 'ok-roll__d';
        span.style.setProperty('--d', '0');
        span.append(document.createElement('i'));
      } else {
        span.className = 'ok-roll__c';
        span.dataset.c = ch;
      }
      return span;
    });
    vis.replaceChildren(...cells);
    cells.forEach((span, i) => {
      if (!span.classList.contains('ok-roll__d')) return;
      span.style.setProperty('--delay', `${(cells.length - 1 - i) * 45}ms`);
      const d = chars[i];
      if (span.style.getPropertyValue('--d') !== d) {
        void span.offsetWidth; // a new strip starts from 0 and rolls up to its digit
        span.style.setProperty('--d', d);
      }
    });
  }
  window.CobwebzKit = { roll };

  /* ---------- Switch on everything the page asks for ---------- */
  // Every button gets the cobwebs, and every badge and pricing card the glow border
  $$('[data-spider-button], .btn').forEach(initSpider);
  $$('[data-glow-border], .badge, .price').forEach(initGlow);
  $$('[data-scramble]').forEach(initScramble);
  $$('[data-tilt]').forEach(initTilt);
  $$('[data-dot-tabs]').forEach(initDotTabs);
  // An estimate already on screen before this file loaded gets its strips now
  const total = document.querySelector('[data-estimate-total]');
  if (total && total.dataset.value === undefined) roll(total, total.textContent.trim());
})();
