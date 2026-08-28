/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
        },
        charcoal: {
          bg: '#0A0A0A',
          sidebar: '#111111',
          card: '#181818',
          'card-hover': '#202020',
          input: '#141414',
          border: '#2A2A2A',
          muted: '#A1A1AA',
          primary: '#FAFAFA',
          secondary: '#A1A1AA',
        },
      },
      boxShadow: {
        soft: '0 20px 45px -15px rgba(15, 23, 42, 0.15)',
        glow: '0 20px 60px -10px rgba(249, 115, 22, 0.25)',
      },
      backgroundImage: {
        'hero-radial':
          'radial-gradient(circle at top left, rgba(249,115,22,0.22), transparent 30%), radial-gradient(circle at top right, rgba(251,146,60,0.18), transparent 24%), radial-gradient(circle at center, rgba(249,115,22,0.10), transparent 45%)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.hide-scrollbar': {
          /* Chrome, Edge, and Safari */
          '-webkit-scrollbar-width': 'none',
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
            width: '0',
            height: '0',
          },
        },
      })
    },
  ],
}
