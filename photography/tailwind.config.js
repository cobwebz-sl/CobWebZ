/* Tailwind settings for this page (Tailwind CSS v3). tailwind.css is generated from it:
   after changing classes in index.html or script.js, rebuild it from this folder with
     npx tailwindcss@3.4.17 -c tailwind.config.js -o tailwind.css --minify */
module.exports = {
  content: ['./index.html', './script.js'],
  theme: {
    extend: {
      colors: {
        black: {
          DEFAULT: '#070708',
          50: '#1b1b22',
          100: '#15151a',
          200: '#111115',
          300: '#0d0d10',
          900: '#050506',
        }
      },
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        space: ['Space Grotesk', 'sans-serif'],
        jakarta: ['Plus Jakarta Sans', 'sans-serif'],
        italiana: ['Italiana', 'serif'],
      }
    }
  }
};
