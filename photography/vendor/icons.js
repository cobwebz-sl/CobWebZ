/* The twelve Lucide icons (lucide.dev) this page uses, with a lucide.createIcons() that works
   like the library's: each <i data-lucide="name"> becomes that icon's <svg>, keeping the <i>'s
   attributes and classes, and is hidden from screen readers unless it has its own label.
   Stands in for the full 470 KB library. To add an icon, copy its inner SVG markup from
   lucide.dev. Licence (ISC; some icons MIT, from Feather): LICENSE-lucide.txt */
(() => {
  'use strict';
  const ICONS = {
    'arrow-left': '<path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path>',
    'arrow-right': '<path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path>',
    'arrow-up': '<path d="m5 12 7-7 7 7"></path><path d="M12 19V5"></path>',
    'arrow-up-right': '<path d="M7 7h10v10"></path><path d="M7 17 17 7"></path>',
    'camera': '<path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z"></path><circle cx="12" cy="13" r="3"></circle>',
    'grid': '<rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M3 9h18"></path><path d="M3 15h18"></path><path d="M9 3v18"></path><path d="M15 3v18"></path>',
    'headphones': '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"></path>',
    'play': '<path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"></path>',
    'pause': '<rect x="14" y="3" width="5" height="18" rx="1"></rect><rect x="5" y="3" width="5" height="18" rx="1"></rect>',
    'volume-x': '<path d="M11 4.702a.7.7 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.7.7 0 0 0 11 19.298z"></path><path d="m16.5 14.5 5-5"></path><path d="m16.5 9.5 5 5"></path>',
    'volume-2': '<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"></path><path d="M16 9a5 5 0 0 1 0 6"></path><path d="M19.364 18.364a9 9 0 0 0 0-12.728"></path>',
    'x': '<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>',
  };
  const DEFAULTS = {
    xmlns: 'http://www.w3.org/2000/svg', width: '24', height: '24', viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
  };
  const labelled = (el) => [...el.attributes].some((a) => a.name.startsWith('aria-') || a.name === 'role' || a.name === 'title');

  function createIcons() {
    document.querySelectorAll('i[data-lucide]').forEach((el) => {
      const name = el.getAttribute('data-lucide');
      if (!Object.prototype.hasOwnProperty.call(ICONS, name)) return console.warn(`Icon "${name}" is not in vendor/icons.js`);
      const svg = document.createElementNS(DEFAULTS.xmlns, 'svg');
      Object.entries(DEFAULTS).forEach(([k, v]) => svg.setAttribute(k, v));
      svg.setAttribute('data-lucide', name);
      if (!labelled(el)) svg.setAttribute('aria-hidden', 'true');
      [...el.attributes].forEach((a) => { if (a.name !== 'class') svg.setAttribute(a.name, a.value); });
      svg.setAttribute('class', ['lucide', `lucide-${name}`, el.getAttribute('class')].filter(Boolean).join(' '));
      svg.innerHTML = ICONS[name];
      el.replaceWith(svg);
    });
  }

  window.lucide = { createIcons };
})();
