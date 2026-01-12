/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {theme: {
  extend: {
    fontFamily: {
      montserrat: ['Montserrat', 'ui-sans-serif', 'system-ui'],
      opensans: ['"Open Sans"', 'ui-sans-serif', 'system-ui'],
    },
  },
},
},
  },
  plugins: [],
}
