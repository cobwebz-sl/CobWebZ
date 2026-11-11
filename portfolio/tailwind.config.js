/* Tailwind settings for this page (Tailwind CSS v3). tailwind.css is generated from it:
   after changing classes in index.html or script.js, rebuild it from this folder with
     npx tailwindcss@3.4.17 -c tailwind.config.js -o tailwind.css --minify */
module.exports = {
  content: ['./index.html', './script.js'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#0b0808', 2: '#100c0c', 3: '#171111' },
        wine: {
          950: '#16070a',
          900: '#22090e',
          800: '#3a0f18',
          700: '#541624',
          600: '#6f1e2e',
          500: '#8c2a3b',
          400: '#a94456',
        },
        sand: { DEFAULT: '#d9b9a5', light: '#e9d5c6' },
        cream: '#efe5dc',
        mute: '#9b8d86',
        blush: '#d59c96',
        line: 'rgba(236,220,208,0.11)',
      },
      fontFamily: {
        display: ['Imbue', 'Bodoni Moda', 'Didot', 'serif'],
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
        script: ['Mrs Saint Delafield', 'cursive'],
      },
    },
  },
};
