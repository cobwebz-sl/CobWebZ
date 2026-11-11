/* ==========================================================================
   Forno Nero — site interactions
   Menu + cart, pizza builder, deal countdown, reviews, gallery, reservations.
   ========================================================================== */
(() => {
  'use strict';

  /* ---------- Helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const money = (n) => '$' + n.toFixed(2);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Private mode or blocked storage: the cart just won't persist between visits.
      }
    },
  };

  function restartAnimation(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth; // force a reflow so the animation replays
    el.classList.add(cls);
  }

  /* ---------- Toasts ---------- */
  const toastWrap = $('#toasts');

  function toast(message, { icon = 'check', action } = {}) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<span class="toast__icon"><svg class="ico" aria-hidden="true"><use href="#i-${icon}"/></svg></span><p></p>`;
    el.querySelector('p').textContent = message;

    let gone = false;
    const dismiss = () => {
      if (gone) return;
      gone = true;
      el.classList.add('is-leaving');
      setTimeout(() => el.remove(), 360);
    };

    if (action) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'toast__action';
      btn.textContent = action.label;
      btn.addEventListener('click', () => { action.onClick(); dismiss(); });
      el.appendChild(btn);
    }

    // the same message twice in a row (e.g. "+" tapped repeatedly) replaces the older toast
    $$('.toast p', toastWrap).forEach((p) => { if (p.textContent === message) p.parentElement.remove(); });
    toastWrap.appendChild(el);
    while (toastWrap.children.length > 3) toastWrap.firstElementChild.remove();
    setTimeout(dismiss, 3800);
  }

  /* ---------- Opening hours (0 = Sunday, values are 24h decimal hours) ---------- */
  const HOURS = { 0: [12, 21], 1: null, 2: [12, 22], 3: [12, 22], 4: [12, 22], 5: [12, 23.5], 6: [12, 23.5] };
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function fmtHour(h) {
    const hh = Math.floor(h) % 24;
    const mm = Math.round((h - Math.floor(h)) * 60);
    const suffix = hh < 12 ? 'am' : 'pm';
    const h12 = hh % 12 || 12;
    return mm ? `${h12}:${String(mm).padStart(2, '0')}${suffix}` : `${h12}${suffix}`;
  }

  function openState(now = new Date()) {
    const day = now.getDay();
    const h = now.getHours() + now.getMinutes() / 60;
    const today = HOURS[day];
    if (today && h >= today[0] && h < today[1]) {
      return { open: true, text: `Open now · until ${fmtHour(today[1])}` };
    }
    for (let i = 0; i < 8; i++) {
      const d = (day + i) % 7;
      const hrs = HOURS[d];
      if (!hrs || (i === 0 && h >= hrs[0])) continue;
      const when = i === 0 ? '' : i === 1 ? 'tomorrow ' : `${DAYS[d].slice(0, 3)} `;
      return { open: false, text: `Closed · opens ${when}${fmtHour(hrs[0])}` };
    }
    return { open: false, text: 'Closed' };
  }

  function renderHours() {
    const state = openState();
    $$('[data-open-status]').forEach((el) => {
      el.textContent = state.text;
      el.classList.toggle('is-open', state.open);
      el.classList.toggle('is-closed', !state.open);
    });

    const status = $('#openStatus');
    if (status) {
      status.textContent = state.open ? 'Open now' : 'Closed now';
      status.classList.toggle('is-open', state.open);
      status.classList.toggle('is-closed', !state.open);
    }

    const list = $('#hoursList');
    if (list) {
      const today = new Date().getDay();
      list.innerHTML = [1, 2, 3, 4, 5, 6, 0].map((d) => {
        const hrs = HOURS[d];
        return `<li class="${d === today ? 'is-today' : ''}"><span>${DAYS[d]}</span><span>${hrs ? `${fmtHour(hrs[0])} – ${fmtHour(hrs[1])}` : 'Closed'}</span></li>`;
      }).join('');
    }
  }

  renderHours();
  setInterval(renderHours, 60 * 1000);

  /* ==========================================================================
     Cart
     ========================================================================== */
  const cart = (() => {
    const KEY = 'fornonero-cart';
    const FREE_OVER = 30;
    const FEE = 2.99;
    const el = {
      drawer: $('#cart'),
      backdrop: $('#backdrop'),
      openBtn: $('#cartOpen'),
      closeBtn: $('#cartClose'),
      count: $('#cartCount'),
      items: $('#cartItems'),
      empty: $('#cartEmpty'),
      foot: $('#cartFoot'),
      progress: $('#cartProgress'),
      progressText: $('#cartProgressText'),
      progressBar: $('#cartProgressBar'),
      subtotal: $('#cartSubtotal'),
      delivery: $('#cartDelivery'),
      total: $('#cartTotal'),
      checkout: $('#checkoutBtn'),
    };

    const isLine = (l) => l && typeof l.key === 'string' && typeof l.name === 'string' && typeof l.img === 'string'
      && Number.isFinite(l.price) && Number.isInteger(l.qty) && l.qty > 0;
    const saved = store.get(KEY, []);
    let lines = Array.isArray(saved) ? saved.filter(isLine).slice(0, 40) : [];
    let justAdded = null;
    let lastFocus = null;

    const save = () => store.set(KEY, lines);

    function totals() {
      const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
      const delivery = subtotal === 0 || subtotal >= FREE_OVER ? 0 : FEE;
      return { subtotal, delivery, total: subtotal + delivery, count: lines.reduce((n, l) => n + l.qty, 0) };
    }

    function render() {
      const { subtotal, delivery, total, count } = totals();
      el.count.textContent = count;
      el.count.hidden = count === 0;
      el.openBtn.setAttribute('aria-label', count ? `Open your order (${count} item${count === 1 ? '' : 's'})` : 'Open your order');

      const empty = lines.length === 0;
      el.empty.hidden = !empty;
      el.items.hidden = empty;
      el.foot.hidden = empty;
      el.progress.hidden = empty;

      el.items.innerHTML = lines.map((l) => `
        <li class="line${l.key === justAdded ? ' is-new' : ''}" data-key="${esc(l.key)}">
          <img src="${esc(l.img)}" alt="" width="64" height="64">
          <div>
            <p class="line__name">${esc(l.name)}</p>
            ${l.meta ? `<p class="line__meta">${esc(l.meta)}</p>` : ''}
            <div class="qty">
              <button type="button" data-qty="-1" aria-label="One less ${esc(l.name)}"><svg class="ico" aria-hidden="true"><use href="#i-minus"/></svg></button>
              <span>${l.qty}</span>
              <button type="button" data-qty="1" aria-label="One more ${esc(l.name)}"><svg class="ico" aria-hidden="true"><use href="#i-plus"/></svg></button>
            </div>
          </div>
          <div class="line__end">
            <span class="line__price">${money(l.price * l.qty)}</span>
            <button class="line__remove" type="button" data-remove aria-label="Remove ${esc(l.name)}"><svg class="ico" aria-hidden="true"><use href="#i-trash"/></svg></button>
          </div>
        </li>`).join('');

      el.subtotal.textContent = money(subtotal);
      el.delivery.textContent = delivery ? money(delivery) : 'Free';
      el.total.textContent = money(total);
      const left = FREE_OVER - subtotal;
      el.progressText.innerHTML = left > 0
        ? `Add <b>${money(left)}</b> more for free delivery`
        : '<b>Nice!</b> You’ve unlocked free delivery.';
      el.progressBar.style.width = `${Math.min(100, (subtotal / FREE_OVER) * 100)}%`;
    }

    const bumpBadge = () => restartAnimation(el.count, 'bump');

    // Little "fly into the bag" animation from the dish photo to the cart button.
    function fly(from) {
      if (reduceMotion || !from || !from.src || !Element.prototype.animate) return bumpBadge();
      const r = from.rect;
      const size = Math.min(r.width, r.height, 200);
      if (!size) return bumpBadge();
      const target = el.openBtn.getBoundingClientRect();
      const x = r.left + r.width / 2 - size / 2;
      const y = r.top + r.height / 2 - size / 2;
      const dx = target.left + target.width / 2 - (x + size / 2);
      const dy = target.top + target.height / 2 - (y + size / 2);

      const img = new Image();
      img.src = from.src;
      img.alt = '';
      img.className = 'fly';
      Object.assign(img.style, { left: `${x}px`, top: `${y}px`, width: `${size}px`, height: `${size}px` });
      document.body.appendChild(img);

      img.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${dx * 0.55}px, ${dy * 0.55 - 70}px) scale(.55)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx}px, ${dy}px) scale(.12)`, opacity: 0.4 },
      ], { duration: 850, easing: 'cubic-bezier(.45, 0, .55, 1)' }).onfinish = () => {
        img.remove();
        bumpBadge();
      };
    }

    function add(item, from) {
      const line = lines.find((l) => l.key === item.key);
      if (line) line.qty += 1;
      else lines.push({ ...item, qty: 1 });
      justAdded = item.key;
      save();
      render();
      justAdded = null;
      fly(from);
      toast(`${item.name} added to your order`, { icon: 'bag', action: { label: 'View', onClick: open } });
    }

    function change(key, delta) {
      const line = lines.find((l) => l.key === key);
      if (!line) return;
      line.qty += delta;
      if (line.qty <= 0) lines = lines.filter((l) => l !== line);
      save();
      render();
    }

    function remove(key) {
      lines = lines.filter((l) => l.key !== key);
      save();
      render();
    }

    function open() {
      lastFocus = document.activeElement;
      el.drawer.classList.add('is-open');
      el.backdrop.classList.add('is-open');
      document.body.classList.add('no-scroll');
      el.openBtn.setAttribute('aria-expanded', 'true');
      setTimeout(() => el.closeBtn.focus(), 60);
    }

    function close({ restoreFocus = true } = {}) {
      if (!el.drawer.classList.contains('is-open')) return;
      el.drawer.classList.remove('is-open');
      el.backdrop.classList.remove('is-open');
      document.body.classList.remove('no-scroll');
      el.openBtn.setAttribute('aria-expanded', 'false');
      if (restoreFocus && lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
    }

    el.openBtn.setAttribute('aria-expanded', 'false');
    el.openBtn.addEventListener('click', open);
    el.closeBtn.addEventListener('click', () => close());
    el.backdrop.addEventListener('click', () => close());
    $$('[data-close-cart]').forEach((a) => a.addEventListener('click', () => close({ restoreFocus: false })));

    el.items.addEventListener('click', (e) => {
      const li = e.target.closest('.line');
      if (!li) return;
      const key = li.dataset.key;
      const qtyBtn = e.target.closest('[data-qty]');
      if (qtyBtn) {
        const delta = Number(qtyBtn.dataset.qty);
        change(key, delta);
        // keep keyboard focus on the same control after the list re-renders
        const again = el.items.querySelector(`.line[data-key="${CSS.escape(key)}"] [data-qty="${delta}"]`);
        (again || el.items.querySelector('[data-remove]') || el.closeBtn).focus();
      } else if (e.target.closest('[data-remove]')) {
        remove(key);
        (el.items.querySelector('[data-remove]') || el.closeBtn).focus();
      }
    });

    // keep Tab inside the open drawer
    el.drawer.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') return close();
      if (e.key !== 'Tab') return;
      const focusables = $$('button, a[href], input', el.drawer).filter((n) => n.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    // Demo checkout: hook this up to your ordering / payment provider.
    el.checkout.addEventListener('click', () => {
      if (!lines.length) return;
      const { total } = totals();
      const order = `FN-${Math.floor(1000 + Math.random() * 9000)}`;
      lines = [];
      save();
      render();
      close();
      toast(`Order ${order} placed (${money(total)}). It's heading into the oven!`, { icon: 'flame' });
    });

    render();
    return { add, open, close };
  })();

  /* ==========================================================================
     Menu
     ========================================================================== */
  const TAGS = {
    best: ['Bestseller', 'var(--cheese)'],
    hot: ['Spicy', 'var(--tomato)'],
    veg: ['Veggie', 'var(--basil)'],
    vegan: ['Vegan', 'var(--basil)'],
    new: ['New', 'var(--berry)'],
    chef: ["Chef's pick", 'var(--violet)'],
  };

  const CAT_META = {
    pizza: '12" wood-fired pizza',
    pasta: 'Fresh pasta',
    sides: 'Side',
    desserts: 'Dessert',
    drinks: 'Drink',
  };

  const MENU = [
    // Pizza
    { id: 'margherita', cat: 'pizza', name: 'Margherita D.O.P.', price: 12, img: 'margherita', tags: ['best', 'veg'], desc: 'San Marzano tomato, fior di latte, fresh basil and extra-virgin olive oil.' },
    { id: 'pepperoni', cat: 'pizza', name: 'Pepperoni Classic', price: 14, img: 'pepperoni', tags: ['best'], desc: 'Cup-and-char pepperoni, mozzarella, tomato and a pinch of oregano.' },
    { id: 'diavola', cat: 'pizza', name: 'Diavola', price: 15, img: 'diavola', tags: ['hot'], desc: 'Spicy salami, Calabrian chili, black olives, cherry tomatoes and basil.' },
    { id: 'funghi', cat: 'pizza', name: 'Funghi & Truffle', price: 16, img: 'funghi', tags: ['veg', 'chef'], desc: 'Roasted wild mushrooms, truffle oil, garlic, thyme and cherry tomatoes.' },
    { id: 'burrata-verde', cat: 'pizza', name: 'Burrata Verde', price: 17, img: 'burrata-verde', tags: ['new', 'veg'], desc: 'Creamy burrata, wilted spinach, rocket and a basil pesto drizzle.' },
    { id: 'bbq-chicken', cat: 'pizza', name: 'Smoky BBQ Chicken', price: 16, img: 'bbq-chicken', tags: [], desc: 'Grilled chicken, house BBQ sauce, red onion, mozzarella and coriander.' },
    { id: 'garden-veggie', cat: 'pizza', name: 'Garden Veggie', price: 14, img: 'garden-veggie', tags: ['vegan'], desc: 'Bell peppers, olives, sweetcorn, red onion and tomato on vegan mozzarella.' },
    { id: 'quattro-formaggi', cat: 'pizza', name: 'Quattro Formaggi', price: 16, img: 'quattro-formaggi', tags: ['veg'], desc: 'Mozzarella, gorgonzola, parmigiano and fontina with fresh rosemary.' },
    // Pasta
    { id: 'carbonara', cat: 'pasta', name: 'Spaghetti Carbonara', price: 15, img: 'carbonara', tags: ['best'], desc: 'Crispy guanciale, egg yolk, pecorino romano and cracked black pepper.' },
    { id: 'arrabbiata', cat: 'pasta', name: "Penne all'Arrabbiata", price: 13, img: 'arrabbiata', tags: ['hot', 'veg'], desc: 'Fiery tomato sauce with garlic, chili, parsley and parmigiano.' },
    { id: 'pesto', cat: 'pasta', name: 'Farfalle al Pesto', price: 14, img: 'pesto', tags: ['veg'], desc: 'Basil pesto, blistered cherry tomatoes, toasted pine nuts and rocket.' },
    { id: 'gamberi', cat: 'pasta', name: 'Linguine ai Gamberi', price: 19, img: 'gamberi', tags: ['chef'], desc: 'Tiger prawns, garlic, chili, cherry tomatoes and a splash of white wine.' },
    // Sides & salads
    { id: 'truffle-fries', cat: 'sides', name: 'Truffle Parmesan Fries', price: 7, img: 'truffle-fries', tags: ['veg'], desc: 'Skin-on fries tossed in truffle oil, parmigiano and parsley.' },
    { id: 'wings', cat: 'sides', name: 'Wood-fired Wings', price: 11, img: 'wings', tags: ['hot'], desc: 'Eight wings in a hot honey glaze with cool ranch for dipping.' },
    { id: 'caesar', cat: 'sides', name: 'Caesar Salad', price: 10, img: 'caesar', tags: [], desc: 'Crisp romaine, garlic croutons, parmigiano and our house dressing.' },
    { id: 'panzanella', cat: 'sides', name: 'Panzanella', price: 11, img: 'panzanella', tags: ['vegan'], desc: 'Heirloom tomatoes, toasted sourdough, red onion, basil and olive oil.' },
    // Desserts
    { id: 'tiramisu', cat: 'desserts', name: 'Classic Tiramisu', price: 8, img: 'tiramisu', tags: ['best'], desc: 'Espresso-soaked savoiardi, mascarpone cream and bitter cocoa.' },
    { id: 'brownie', cat: 'desserts', name: 'Fudge Brownie & Gelato', price: 8, img: 'brownie', tags: [], desc: 'Warm chocolate brownie with vanilla gelato and hot fudge.' },
    { id: 'panna-cotta', cat: 'desserts', name: 'Vanilla Panna Cotta', price: 7, img: 'panna-cotta', tags: [], desc: 'Silky vanilla bean cream with macerated strawberries.' },
    { id: 'gelato', cat: 'desserts', name: 'Salted Caramel Gelato', price: 6, img: 'gelato', tags: ['new'], desc: 'Two scoops, warm caramel drizzle and a crunchy wafer roll.' },
    // Drinks
    { id: 'lemonade', cat: 'drinks', name: 'Mint Lemonade', price: 5, img: 'lemonade', tags: ['vegan'], desc: 'Freshly squeezed lemons, crushed mint and sparkling water.' },
    { id: 'iced-tea', cat: 'drinks', name: 'House Iced Tea', price: 4.5, img: 'iced-tea', tags: [], desc: 'Black tea brewed every morning, served with lime and cane sugar.' },
    { id: 'cocktails', cat: 'drinks', name: 'Aperitivo Cocktails', price: 12, img: 'cocktails', tags: ['chef'], desc: "Spritz, Negroni and seasonal specials. Ask for today's list (21+)." },
    { id: 'freakshake', cat: 'drinks', name: 'Oreo Freakshake', price: 7.5, img: 'freakshake', tags: ['new'], desc: 'Chocolate shake piled high with whipped cream, cookies and fudge.' },
  ];

  const menuGrid = $('#menuGrid');
  const tabs = $$('.tab');

  function dishCard(item, i) {
    const tags = item.tags.map((t) => `<span class="tag" style="--tc:${TAGS[t][1]}">${TAGS[t][0]}</span>`).join('');
    return `
      <article class="dish" style="--i:${i}">
        <div class="dish__media">
          <img src="images/menu/${item.img}.webp" width="640" height="480" loading="lazy" decoding="async" alt="${esc(item.name)}">
          ${tags ? `<div class="dish__tags">${tags}</div>` : ''}
        </div>
        <div class="dish__body">
          <h3 class="dish__name">${esc(item.name)}</h3>
          <p class="dish__desc">${esc(item.desc)}</p>
          <div class="dish__foot">
            <span class="dish__price">${money(item.price)}</span>
            <button class="add-btn" type="button" data-add="${item.id}" aria-label="Add ${esc(item.name)} to your order">
              <svg class="ico" aria-hidden="true"><use href="#i-plus"/></svg>
            </button>
          </div>
        </div>
      </article>`;
  }

  function showCategory(cat, focusTab = false) {
    tabs.forEach((tab) => {
      const on = tab.dataset.cat === cat;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      if (on) {
        menuGrid.setAttribute('aria-labelledby', tab.id);
        if (focusTab) tab.focus();
      }
    });
    menuGrid.innerHTML = MENU.filter((m) => m.cat === cat).map(dishCard).join('');
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => showCategory(tab.dataset.cat));
    tab.addEventListener('keydown', (e) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      showCategory(tabs[(i + step + tabs.length) % tabs.length].dataset.cat, true);
    });
  });

  menuGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add]');
    if (!btn) return;
    const item = MENU.find((m) => m.id === btn.dataset.add);
    if (!item) return;
    const img = btn.closest('.dish').querySelector('img');
    cart.add(
      { key: item.id, name: item.name, meta: CAT_META[item.cat], price: item.price, img: `images/menu/${item.img}.webp` },
      { rect: img.getBoundingClientRect(), src: img.currentSrc || img.src },
    );
    restartAnimation(btn, 'is-added');
  });

  showCategory('pizza');

  /* ==========================================================================
     Build-your-own pizza (live SVG preview)
     ========================================================================== */
  (function builder() {
    const form = $('#builderForm');
    const svg = $('#pizzaSvg');
    if (!form || !svg) return;

    const SIZES = [
      { id: 's', label: 'Small', note: '10"', price: 9, scale: 0.8, dot: 20 },
      { id: 'm', label: 'Medium', note: '12"', price: 12, scale: 0.9, dot: 26 },
      { id: 'l', label: 'Large', note: '14"', price: 15, scale: 1, dot: 32 },
    ];
    const CRUSTS = [
      { id: 'classic', label: 'Classic Neapolitan', short: 'Classic', price: 0, sauceR: 140, colors: ['#f7d49a', '#d9984f', '#a8652a'] },
      { id: 'thin', label: 'Thin & crispy', short: 'Thin & crispy', price: 0, sauceR: 156, colors: ['#f2cd90', '#d29148', '#9e5c24'] },
      { id: 'wholewheat', label: 'Whole wheat', short: 'Whole wheat', price: 1, sauceR: 144, colors: ['#d6a065', '#b07438', '#7b4a1d'] },
      { id: 'gf', label: 'Gluten-free', short: 'Gluten-free', price: 2.5, sauceR: 146, colors: ['#fbe6bb', '#e8bf80', '#c08c48'] },
    ];
    const SAUCES = [
      { id: 'tomato', label: 'San Marzano', price: 0, color: '#d93a1f', edge: '#a92a15' },
      { id: 'white', label: 'Garlic cream', price: 0, color: '#f3e6cb', edge: '#d9c49b' },
      { id: 'pesto', label: 'Basil pesto', price: 1, color: '#5d9b34', edge: '#3c7420' },
      { id: 'bbq', label: 'Smoky BBQ', price: 0.5, color: '#7c2e12', edge: '#561d09' },
    ];
    const TOPPINGS = [
      { id: 'pepperoni', label: 'Pepperoni', price: 2, count: 10, gap: 36 },
      { id: 'mushroom', label: 'Mushrooms', price: 1.5, count: 9, gap: 32 },
      { id: 'olive', label: 'Black olives', price: 1.5, count: 12, gap: 24 },
      { id: 'onion', label: 'Red onion', price: 1, count: 9, gap: 28 },
      { id: 'pepper', label: 'Bell peppers', price: 1.5, count: 9, gap: 30 },
      { id: 'jalapeno', label: 'Jalapeños', price: 1.5, count: 10, gap: 26 },
      { id: 'ham', label: 'Ham', price: 2, count: 9, gap: 30 },
      { id: 'chicken', label: 'Grilled chicken', price: 2.5, count: 9, gap: 30 },
      { id: 'pineapple', label: 'Pineapple', price: 1.5, count: 9, gap: 28 },
      { id: 'corn', label: 'Sweetcorn', price: 1, count: 28, gap: 15 },
      { id: 'tomato', label: 'Cherry tomatoes', price: 1.5, count: 8, gap: 34 },
      { id: 'basil', label: 'Fresh basil', price: 1, count: 7, gap: 36 },
      { id: 'cheese', label: 'Extra cheese', price: 2, count: 14, gap: 28 },
    ];
    // paint order on the pizza, bottom to top
    const LAYERS = ['cheese', 'tomato', 'pepperoni', 'ham', 'chicken', 'mushroom', 'pepper', 'onion', 'pineapple', 'corn', 'olive', 'jalapeno', 'basil'];
    const ICON_SCALE = { corn: 2.2, olive: 1.5, jalapeno: 1.25, pineapple: 1.2, tomato: 1.1, ham: 1.1 };
    const DEFAULTS = { size: 'm', crust: 'classic', sauce: 'tomato', toppings: ['pepperoni', 'basil'] };

    // Each topping piece is drawn around (0, 0) at roughly 28px.
    const SHAPES = {
      pepperoni: '<circle r="14" fill="url(#pzPep)" stroke="#8a1c12" stroke-width="1.4"/><circle cx="-5" cy="-3" r="1.8" fill="#7a170e"/><circle cx="4.5" cy="4" r="2.1" fill="#7a170e"/><circle cx="5" cy="-6" r="1.3" fill="#7a170e"/><circle cx="-3" cy="7" r="1.5" fill="#7a170e"/><ellipse cx="-4" cy="-7" rx="5" ry="2.4" fill="#fff" opacity=".18"/>',
      mushroom: '<path d="M-14 3C-14-7-7-13 0-13S14-7 14 3c-4 1-7 1-9 0l1 10c-3 2-9 2-12 0l1-10c-2 1-5 1-9 0Z" fill="#efdfc2" stroke="#9c7b55" stroke-width="1.6" stroke-linejoin="round"/><path d="M-11 2c7-2 15-2 22 0" fill="none" stroke="#9c7b55" stroke-width="1.2"/>',
      olive: '<circle r="7.5" fill="none" stroke="#1d1a19" stroke-width="5"/><path d="M-4-5.5a6.5 6.5 0 0 1 7-1" fill="none" stroke="#6d625c" stroke-width="1.4" stroke-linecap="round"/>',
      onion: '<path d="M-13 5a13.5 13.5 0 0 1 26 0" fill="none" stroke="#a24a9c" stroke-width="3.6" stroke-linecap="round"/><path d="M-8.5 5a9 9 0 0 1 17 0" fill="none" stroke="#e3b9df" stroke-width="2" stroke-linecap="round"/>',
      pepper: '<path d="M-14-3C-7-10 7-10 14-3" fill="none" stroke="#2f9d3a" stroke-width="5.5" stroke-linecap="round"/><path d="M-11-5C-5-9 5-9 11-5" fill="none" stroke="#8be07c" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>',
      jalapeno: '<circle r="9.5" fill="#5aa832" stroke="#2f6e18" stroke-width="2"/><circle r="5.5" fill="#dcefa8"/><circle cx="-2" cy="-1.5" r="1.1" fill="#f8f4d8"/><circle cx="2.2" cy=".8" r="1.1" fill="#f8f4d8"/><circle cx="-.4" cy="2.8" r="1.1" fill="#f8f4d8"/>',
      ham: '<path d="M-11-8 9-9 11 7-9 9Z" fill="#f4a1a1" stroke="#d76f7a" stroke-width="1.5" stroke-linejoin="round"/><path d="M-6-3 5 3" stroke="#fff" stroke-opacity=".45" stroke-width="1.6" stroke-linecap="round"/>',
      chicken: '<path d="M-11-6Q-2-11 9-7Q13 0 8 8Q-2 11-10 6Q-13 0-11-6Z" fill="#d9a066" stroke="#a8713c" stroke-width="1.5"/><path d="M-6-4 4 6M-1-7 8 2" stroke="#7a4a22" stroke-width="2" stroke-linecap="round" opacity=".75"/>',
      pineapple: '<path d="M-9-8H9L6 9H-6Z" fill="#ffd54a" stroke="#e5a800" stroke-width="1.5" stroke-linejoin="round"/><path d="M-5-3H5M-4 3H4" stroke="#e8ad00" stroke-width="1.1" opacity=".8"/>',
      corn: '<ellipse rx="4" ry="4.8" fill="#ffd23f" stroke="#e3a500" stroke-width="1"/><ellipse cx="-1.2" cy="-1.6" rx="1.4" ry="1.6" fill="#fff4b8" opacity=".8"/>',
      tomato: '<circle r="12.5" fill="#d9301f"/><circle r="9.6" fill="#ff6b52"/><g fill="#ffd0b0"><ellipse cy="-4.6" rx="2.6" ry="3.4"/><ellipse cy="-4.6" rx="2.6" ry="3.4" transform="rotate(120)"/><ellipse cy="-4.6" rx="2.6" ry="3.4" transform="rotate(240)"/></g><circle r="1.8" fill="#ff8f75"/>',
      basil: '<path d="M-15 7C-13-6 0-13 15-11 13 2 2 11-15 7Z" fill="#2e8b3e"/><path d="M-13 6C-4 1 5-4 13-10" fill="none" stroke="#8be59a" stroke-width="1.2" opacity=".8"/>',
      cheese: '<path d="M-15-2C-14-10-5-14 2-11 10-13 16-6 14 1 13 8 4 11-2 8-10 10-17 5-15-2Z" fill="#fff1c4" opacity=".96"/><ellipse cx="3" cy="1" rx="4" ry="3" fill="#f2c062" opacity=".5"/>',
    };

    const TAU = Math.PI * 2;
    const f1 = (n) => n.toFixed(1);
    const byId = (list, id) => list.find((x) => x.id === id);

    // mulberry32 — tiny seeded PRNG so toppings always land in the same spots
    function rng(seed) {
      return () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    function scatter(seed, count, maxR, gap) {
      const rand = rng(seed);
      const pts = [];
      for (let tries = 0; pts.length < count && tries < count * 80; tries++) {
        const r = Math.sqrt(rand()) * maxR;
        const a = rand() * TAU;
        const x = 200 + r * Math.cos(a);
        const y = 200 + r * Math.sin(a);
        if (pts.every((p) => (p.x - x) ** 2 + (p.y - y) ** 2 >= gap * gap)) {
          pts.push({ x, y, rot: rand() * 360, s: 0.85 + rand() * 0.3 });
        }
      }
      return pts;
    }

    /* --- option controls --- */
    const group = (name) => $(`[data-group="${name}"]`, form);
    const extra = (price) => (price ? `+${money(price)}` : 'Included');

    group('size').innerHTML = SIZES.map((s) => `
      <label class="choice">
        <input type="radio" name="size" value="${s.id}"${s.id === DEFAULTS.size ? ' checked' : ''}>
        <span class="choice__box">
          <span class="size-dot" style="width:${s.dot}px;height:${s.dot}px" aria-hidden="true"></span>
          <span class="choice__text"><b>${s.label}</b><small>${s.note} · ${money(s.price)}</small></span>
        </span>
      </label>`).join('');

    group('crust').innerHTML = CRUSTS.map((c) => `
      <label class="choice">
        <input type="radio" name="crust" value="${c.id}"${c.id === DEFAULTS.crust ? ' checked' : ''}>
        <span class="choice__box">
          <span class="swatch" style="--sw:radial-gradient(circle, ${c.colors[0]} 0 40%, ${c.colors[1]} 68%, ${c.colors[2]})" aria-hidden="true"></span>
          <span class="choice__text"><b>${c.label}</b><small>${extra(c.price)}</small></span>
        </span>
      </label>`).join('');

    group('sauce').innerHTML = SAUCES.map((s) => `
      <label class="choice">
        <input type="radio" name="sauce" value="${s.id}"${s.id === DEFAULTS.sauce ? ' checked' : ''}>
        <span class="choice__box">
          <span class="swatch" style="--sw:${s.color}" aria-hidden="true"></span>
          <span class="choice__text"><b>${s.label}</b><small>${extra(s.price)}</small></span>
        </span>
      </label>`).join('');

    group('toppings').innerHTML = TOPPINGS.map((t) => `
      <label class="chip">
        <input type="checkbox" name="top" value="${t.id}"${DEFAULTS.toppings.includes(t.id) ? ' checked' : ''}>
        <span class="chip__box">
          <span class="chip__icon" aria-hidden="true"><svg viewBox="-17 -17 34 34"><g transform="scale(${ICON_SCALE[t.id] || 1})">${SHAPES[t.id]}</g></svg></span>
          ${t.label} <span class="chip__price">+${money(t.price)}</span>
        </span>
      </label>`).join('');

    /* --- the pizza itself --- */
    svg.innerHTML = `
      <defs>
        <radialGradient id="pzBoard" cx="50%" cy="40%" r="62%">
          <stop offset="0" stop-color="#3d2c24"/><stop offset=".8" stop-color="#231915"/><stop offset="1" stop-color="#160f0c"/>
        </radialGradient>
        <radialGradient id="pzCrust" cx="50%" cy="50%" r="50%">
          <stop offset="0"/><stop offset=".8"/><stop offset=".9"/><stop offset="1"/>
        </radialGradient>
        <radialGradient id="pzPep" cx="38%" cy="35%" r="70%">
          <stop offset="0" stop-color="#e8513a"/><stop offset="1" stop-color="#a3241b"/>
        </radialGradient>
        <filter id="pzRough" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="4"/>
          <feDisplacementMap in="SourceGraphic" scale="10" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
        <filter id="pzSoft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2"/></filter>
        <filter id="pzShadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="#000" flood-opacity=".55"/>
        </filter>
      </defs>
      <circle cx="200" cy="200" r="198" fill="url(#pzBoard)"/>
      <circle cx="200" cy="200" r="188" fill="none" stroke="#fff" stroke-opacity=".07" stroke-width="1.5" stroke-dasharray="2 7"/>
      <g id="pzBody" style="transform-origin:200px 200px">
        <g filter="url(#pzShadow)"><circle cx="200" cy="200" r="174" fill="url(#pzCrust)" filter="url(#pzRough)"/></g>
        <g id="pzChar" filter="url(#pzSoft)"></g>
        <g id="pzSauce" filter="url(#pzRough)"></g>
        <g id="pzCheese" filter="url(#pzRough)"></g>
        <g id="pzTops">${LAYERS.map((id) => `<g data-top="${id}"></g>`).join('')}</g>
      </g>`;

    const body = $('#pzBody', svg);
    const stops = $$('#pzCrust stop', svg);
    const charG = $('#pzChar', svg);
    const sauceG = $('#pzSauce', svg);
    const cheeseG = $('#pzCheese', svg);
    const layer = (id) => $(`[data-top="${id}"]`, svg);

    function drawCrust(crust) {
      const t = crust.sauceR / 174;
      const [light, mid, dark] = crust.colors;
      [[0, mid], [t, mid], [t + (1 - t) * 0.45, light], [1, dark]].forEach(([offset, color], i) => {
        stops[i].setAttribute('offset', offset.toFixed(3));
        stops[i].setAttribute('stop-color', color);
      });

      // leopard-spot char around the rim
      const rand = rng(11);
      let spots = '';
      for (let i = 0; i < 28; i++) {
        const a = rand() * TAU;
        const r = crust.sauceR + 6 + rand() * (166 - crust.sauceR - 6);
        const x = f1(200 + r * Math.cos(a));
        const y = f1(200 + r * Math.sin(a));
        spots += `<ellipse cx="${x}" cy="${y}" rx="${f1(2 + rand() * 5)}" ry="${f1(1.5 + rand() * 2.5)}" transform="rotate(${f1((a * 180) / Math.PI + 90)} ${x} ${y})" fill="#3a1b0a" opacity="${(0.25 + rand() * 0.4).toFixed(2)}"/>`;
      }
      charG.innerHTML = spots;
    }

    function drawSauce(sauce, crust) {
      const R = crust.sauceR;
      const rand = rng(23);
      let flecks = '';
      for (let i = 0; i < 26; i++) {
        const r = Math.sqrt(rand()) * (R - 12);
        const a = rand() * TAU;
        flecks += `<circle cx="${f1(200 + r * Math.cos(a))}" cy="${f1(200 + r * Math.sin(a))}" r="${f1(0.8 + rand() * 1.4)}" fill="#33461a" opacity=".7"/>`;
      }
      sauceG.innerHTML = `<circle cx="200" cy="200" r="${R}" fill="${sauce.color}"/><circle cx="200" cy="200" r="${R - 3}" fill="none" stroke="${sauce.edge}" stroke-width="7" opacity=".55"/>${flecks}`;
    }

    function drawCheese(crust) {
      const R = crust.sauceR;
      const rand = rng(99);
      let out = `<circle cx="200" cy="200" r="${R - 14}" fill="#ffd27a" opacity=".3"/>`;
      for (let i = 0; i < 30; i++) {
        const r = Math.sqrt(rand()) * (R - 30);
        const a = rand() * TAU;
        const x = f1(200 + r * Math.cos(a));
        const y = f1(200 + r * Math.sin(a));
        out += `<ellipse cx="${x}" cy="${y}" rx="${f1(13 + rand() * 15)}" ry="${f1(10 + rand() * 11)}" transform="rotate(${Math.round(rand() * 180)} ${x} ${y})" fill="#fff1c4" opacity=".92"/>`;
      }
      for (let i = 0; i < 16; i++) {
        const r = Math.sqrt(rand()) * (R - 34);
        const a = rand() * TAU;
        out += `<circle cx="${f1(200 + r * Math.cos(a))}" cy="${f1(200 + r * Math.sin(a))}" r="${f1(2.5 + rand() * 4)}" fill="#e3a043" opacity=".45"/>`;
      }
      cheeseG.innerHTML = out;
    }

    const leaving = new Map();
    function drawTopping(id, on, animate = !reduceMotion) {
      const g = layer(id);
      const t = byId(TOPPINGS, id);
      clearTimeout(leaving.get(id));
      if (on) {
        g.classList.remove('is-leaving');
        const pieces = scatter(1000 + TOPPINGS.indexOf(t) * 97, t.count, 118, t.gap);
        g.innerHTML = pieces.map((p, i) => `<g transform="translate(${f1(p.x)} ${f1(p.y)}) rotate(${Math.round(p.rot)}) scale(${p.s.toFixed(2)})"><g class="pc" style="${animate ? `animation-delay:${i * 40}ms` : 'animation:none'}">${SHAPES[id]}</g></g>`).join('');
      } else if (g.childElementCount) {
        g.classList.add('is-leaving');
        leaving.set(id, setTimeout(() => {
          g.innerHTML = '';
          g.classList.remove('is-leaving');
        }, 320));
      }
    }

    /* --- state, price, summary --- */
    const totalEl = $('#buildTotal');
    const summaryEl = $('#buildSummary');
    let lastPrice = null;

    function read() {
      const data = new FormData(form);
      return {
        size: byId(SIZES, data.get('size')),
        crust: byId(CRUSTS, data.get('crust')),
        sauce: byId(SAUCES, data.get('sauce')),
        toppings: data.getAll('top').map((id) => byId(TOPPINGS, id)),
      };
    }

    const priceOf = (s) => s.size.price + s.crust.price + s.sauce.price + s.toppings.reduce((sum, t) => sum + t.price, 0);
    const describe = (s, withSize = true) => [
      withSize ? `${s.size.label} ${s.size.note}` : s.size.note,
      s.crust.short,
      s.sauce.label,
      ...(s.toppings.length ? [s.toppings.map((t) => t.label).join(', ')] : []),
    ].join(' · ');

    let current = read();

    function updateSummary() {
      const price = priceOf(current);
      totalEl.textContent = money(price);
      if (lastPrice !== null && price !== lastPrice) restartAnimation(totalEl, 'bump');
      lastPrice = price;
      summaryEl.textContent = describe(current);
      body.style.transform = `scale(${current.size.scale})`;
    }

    // Toppings drop in the first time the pizza scrolls into view.
    let revealed = false;
    function revealToppings() {
      if (revealed) return;
      revealed = true;
      current.toppings.forEach((t) => drawTopping(t.id, true));
    }

    form.addEventListener('change', (e) => {
      current = read();
      const { name, value, checked } = e.target;
      if (name === 'crust') {
        drawCrust(current.crust);
        drawSauce(current.sauce, current.crust);
        drawCheese(current.crust);
      } else if (name === 'sauce') {
        drawSauce(current.sauce, current.crust);
      } else if (name === 'top') {
        if (revealed) drawTopping(value, checked);
        else revealToppings();
      }
      updateSummary();
    });
    form.addEventListener('submit', (e) => e.preventDefault());

    $('#clearToppings').addEventListener('click', () => {
      $$('input[name="top"]:checked', form).forEach((input) => {
        input.checked = false;
        drawTopping(input.value, false);
      });
      current = read();
      updateSummary();
    });

    // Serialise the live SVG so the cart line shows *your* pizza.
    function snapshot() {
      try {
        const clone = svg.cloneNode(true);
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        clone.setAttribute('width', '160');
        clone.setAttribute('height', '160');
        $$('.is-leaving', clone).forEach((g) => g.replaceChildren());
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
      } catch {
        return 'images/hero-pizza.webp';
      }
    }

    $('#buildAdd').addEventListener('click', () => {
      revealToppings();
      const s = current;
      const src = snapshot();
      cart.add({
        key: ['custom', s.size.id, s.crust.id, s.sauce.id, ...s.toppings.map((t) => t.id)].join('|'),
        name: `Custom ${s.size.label} Pizza`,
        meta: describe(s, false),
        price: priceOf(s),
        img: src,
      }, { rect: svg.getBoundingClientRect(), src });
    });

    drawCrust(current.crust);
    drawSauce(current.sauce, current.crust);
    drawCheese(current.crust);
    updateSummary();

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        if (entries.some((en) => en.isIntersecting)) {
          revealToppings();
          io.disconnect();
        }
      }, { threshold: 0.35 });
      io.observe(svg);

      // On phones the sticky price bar takes the back-to-top button's corner (see CSS).
      new IntersectionObserver(([en]) => document.body.classList.toggle('builder-in-view', en.isIntersecting))
        .observe(form.closest('.builder__grid'));
    } else {
      revealToppings();
    }
  })();

  /* ==========================================================================
     Deal + countdown to Sunday midnight
     ========================================================================== */
  $('#dealAdd')?.addEventListener('click', () => {
    const img = $('.deal__media img');
    cart.add(
      { key: 'family-feast', name: 'Family Feast Deal', meta: '2 large pizzas · garlic bread · salad · 1.5 L drink', price: 34.99, img: 'images/deal-slice.webp' },
      { rect: img.getBoundingClientRect(), src: img.currentSrc || img.src },
    );
  });

  (function countdown() {
    const root = $('#countdown');
    if (!root) return;
    const unit = (u) => $(`[data-unit="${u}"]`, root);
    const out = { d: unit('d'), h: unit('h'), m: unit('m'), s: unit('s') };
    const pad = (n) => String(n).padStart(2, '0');

    function endOfWeek() {
      const now = new Date();
      const end = new Date(now);
      end.setDate(now.getDate() + ((7 - now.getDay()) % 7));
      end.setHours(23, 59, 59, 999);
      if (end <= now) end.setDate(end.getDate() + 7);
      return end;
    }

    let target = endOfWeek();
    function tick() {
      let diff = target - Date.now();
      if (diff <= 0) {
        target = endOfWeek();
        diff = target - Date.now();
      }
      const s = Math.floor(diff / 1000);
      out.d.textContent = Math.floor(s / 86400);
      out.h.textContent = pad(Math.floor(s / 3600) % 24);
      out.m.textContent = pad(Math.floor(s / 60) % 60);
      out.s.textContent = pad(s % 60);
    }
    tick();
    setInterval(tick, 1000);
  })();

  /* ==========================================================================
     Scroll reveals + counters
     ========================================================================== */
  function animateCounter(el) {
    const target = parseFloat(el.dataset.count);
    const decimals = Number(el.dataset.decimals || 0);
    const suffix = el.dataset.suffix || '';
    const show = (v) => { el.textContent = v.toFixed(decimals) + suffix; };
    const start = performance.now();
    const duration = 1800;
    const frame = (now) => {
      const p = Math.min(1, (now - start) / duration);
      show(target * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  (function reveals() {
    const items = $$('.reveal');
    $$('.bento .reveal').forEach((el, i) => el.style.setProperty('--d', `${(i % 4) * 0.08}s`));

    if (!('IntersectionObserver' in window) || reduceMotion) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    $$('[data-count]').forEach((el) => {
      el.textContent = (0).toFixed(Number(el.dataset.decimals || 0)) + (el.dataset.suffix || '');
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-visible');
        $$('[data-count]', en.target).forEach(animateCounter);
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach((el) => io.observe(el));
  })();

  /* ==========================================================================
     Reviews slider
     ========================================================================== */
  (function reviews() {
    const track = $('#reviewsTrack');
    if (!track) return;

    const stepSize = () => {
      const card = $('.review', track);
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return card ? card.getBoundingClientRect().width + gap : track.clientWidth;
    };
    const atEnd = () => track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
    const go = (dir) => {
      if (dir > 0 && atEnd()) track.scrollTo({ left: 0 });
      else if (dir < 0 && track.scrollLeft <= 4) track.scrollTo({ left: track.scrollWidth });
      else track.scrollBy({ left: dir * stepSize() });
    };

    $('#revPrev').addEventListener('click', () => go(-1));
    $('#revNext').addEventListener('click', () => go(1));
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });

    if (reduceMotion || !('IntersectionObserver' in window)) return;
    let paused = false;
    let visible = false;
    track.addEventListener('pointerenter', () => { paused = true; });
    track.addEventListener('pointerleave', () => { paused = false; });
    track.addEventListener('focusin', () => { paused = true; });
    track.addEventListener('focusout', () => { paused = false; });
    track.addEventListener('touchstart', () => { paused = true; }, { passive: true });
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(track);
    setInterval(() => { if (visible && !paused && !document.hidden) go(1); }, 5500);
  })();

  /* ==========================================================================
     Gallery lightbox
     ========================================================================== */
  (function lightbox() {
    const dialog = $('#lightbox');
    const shots = $$('.bento [data-full]');
    if (!dialog || !shots.length) return;
    const img = $('#lightboxImg');
    const cap = $('#lightboxCap');
    let index = 0;

    function show(i) {
      index = (i + shots.length) % shots.length;
      const btn = shots[index];
      img.src = btn.dataset.full;
      img.alt = $('img', btn).alt;
      cap.textContent = btn.closest('figure').querySelector('figcaption').textContent;
    }

    shots.forEach((btn, i) => btn.addEventListener('click', () => {
      show(i);
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else window.open(btn.dataset.full, '_blank', 'noopener');
    }));
    $('#lightboxClose').addEventListener('click', () => dialog.close());
    $('#lightboxPrev').addEventListener('click', () => show(index - 1));
    $('#lightboxNext').addEventListener('click', () => show(index + 1));
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
    });
  })();

  /* ==========================================================================
     Reservations
     ========================================================================== */
  (function reservations() {
    const form = $('#reserveForm');
    if (!form) return;
    const { name, phone, date, time, guests } = form.elements;
    const pad = (n) => String(n).padStart(2, '0');
    const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    date.min = isoDate(new Date());
    for (let h = 12; h <= 21.5; h += 0.5) {
      const value = `${pad(Math.floor(h))}:${h % 1 ? '30' : '00'}`;
      const label = fmtHour(h).replace(/(am|pm)$/, ' $1').toUpperCase();
      time.add(new Option(label, value, value === '19:00', value === '19:00'));
    }

    function setError(field, message) {
      const wrap = field.closest('.field');
      wrap.classList.toggle('is-invalid', Boolean(message));
      $('.field__error', wrap).textContent = message;
      field.setAttribute('aria-invalid', String(Boolean(message)));
      return !message;
    }

    function checkDate() {
      if (!date.value) return setError(date, 'Please pick a date.');
      const picked = new Date(`${date.value}T00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (picked < today) return setError(date, 'That date has already passed.');
      if (!HOURS[picked.getDay()]) return setError(date, `Sorry, we're closed on ${DAYS[picked.getDay()]}s.`);
      return setError(date, '');
    }

    const checks = {
      name: () => setError(name, name.value.trim().length >= 2 ? '' : 'Please tell us your name.'),
      phone: () => setError(phone, phone.value.replace(/\D/g, '').length >= 7 ? '' : 'Please enter a valid phone number.'),
      date: checkDate,
    };

    Object.entries(checks).forEach(([key, check]) => {
      const field = form.elements[key];
      field.addEventListener('blur', () => { if (field.value) check(); });
      field.addEventListener('input', () => { if (field.closest('.field').classList.contains('is-invalid')) check(); });
    });

    // Demo submit: connect this to your booking system or a form backend.
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const ok = Object.values(checks).map((check) => check()).every(Boolean);
      if (!ok) {
        $('[aria-invalid="true"]', form).focus();
        return;
      }
      const when = new Date(`${date.value}T00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      const who = guests.options[guests.selectedIndex].text;
      const at = time.options[time.selectedIndex].text;
      toast(`Booked! ${who} on ${when} at ${at}. See you soon, ${name.value.trim().split(/\s+/)[0]}!`, { icon: 'check' });
      form.reset();
      Object.keys(checks).forEach((key) => setError(form.elements[key], ''));
    });
  })();

  /* ---------- Newsletter ---------- */
  (function newsletter() {
    const form = $('#newsForm');
    if (!form) return;
    const email = form.elements.email;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim());
      form.classList.toggle('is-invalid', !ok);
      email.setAttribute('aria-invalid', String(!ok));
      if (!ok) {
        email.focus();
        toast('Please enter a valid email address.', { icon: 'mail' });
        return;
      }
      form.reset();
      toast("You're in! Your free garlic bread code is on its way.", { icon: 'mail' });
    });
    email.addEventListener('input', () => form.classList.remove('is-invalid'));
  })();

  /* ==========================================================================
     Header, mobile nav, active links, back-to-top, hero parallax
     ========================================================================== */
  (function navigation() {
    const header = $('#header');
    const toTop = $('#toTop');
    const burger = $('#burger');
    const nav = $('#nav');

    let ticking = false;
    function onScroll() {
      const y = window.scrollY;
      header.classList.toggle('is-scrolled', y > 24);
      toTop.classList.toggle('is-visible', y > 900);
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(onScroll);
    }, { passive: true });
    onScroll();
    toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

    function setNav(open) {
      document.body.classList.toggle('nav-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    }
    burger.addEventListener('click', () => setNav(!document.body.classList.contains('nav-open')));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setNav(false); });
    window.matchMedia('(min-width: 1041px)').addEventListener('change', (mq) => { if (mq.matches) setNav(false); });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (document.body.classList.contains('nav-open')) {
        setNav(false);
        burger.focus();
      }
      cart.close();
    });

    // highlight the link of the section in the middle of the viewport
    const links = $$('a', nav);
    const targets = ['#home', ...links.map((a) => a.getAttribute('href'))].map((sel) => $(sel)).filter(Boolean);
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${en.target.id}`));
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      targets.forEach((t) => io.observe(t));
    }
  })();

  (function heroParallax() {
    const hero = $('.hero');
    const visual = $('#heroVisual');
    if (!hero || !visual || reduceMotion || !window.matchMedia('(pointer: fine)').matches) return;
    let frame = 0;
    hero.addEventListener('pointermove', (e) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = hero.getBoundingClientRect();
        visual.style.setProperty('--mx', (((e.clientX - r.left) / r.width - 0.5) * 26).toFixed(1));
        visual.style.setProperty('--my', (((e.clientY - r.top) / r.height - 0.5) * 26).toFixed(1));
      });
    });
    hero.addEventListener('pointerleave', () => {
      visual.style.setProperty('--mx', '0');
      visual.style.setProperty('--my', '0');
    });
  })();

  /* ---------- Misc ---------- */
  $$('[data-soon]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    toast(`Our ${a.dataset.soon} page is coming soon. Follow @forno.nero!`, { icon: 'spark' });
  }));

  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();
})();
