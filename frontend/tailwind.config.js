/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'rgb(var(--brand) / <alpha-value>)',
          dark: 'rgb(var(--brand-dark) / <alpha-value>)',
        },
        app: {
          DEFAULT: 'rgb(var(--app-bg) / <alpha-value>)',
          card: 'rgb(var(--app-card) / <alpha-value>)',
          secondary: 'rgb(var(--app-secondary) / <alpha-value>)',
          text: 'rgb(var(--app-text) / <alpha-value>)',
          muted: 'rgb(var(--app-muted) / <alpha-value>)',
          border: 'rgb(var(--app-border) / <alpha-value>)',
        },
        gold: {
          DEFAULT: '#FFD700',
          dark: '#DAA520',
        },
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        surface: {
          light: '#ffffff',
          'light-secondary': '#f8fafc',
          'light-tertiary': '#f1f5f9',
          dark: '#0f172a',
          'dark-secondary': '#1e293b',
          'dark-tertiary': '#334155',
        },
        'background-light': '#f8fafc',
        'background-dark': '#0f172a',
        'card-light': '#ffffff',
        'card-dark': '#1e293b',
      },
      fontFamily: {
        sans: ['"Manrope"', 'sans-serif'],
        display: ['"Space Grotesk"', 'sans-serif'],
      },
      backgroundColor: {
        'black-rich': '#121212',
      },
      boxShadow: {
        'soft': '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.06)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 2px 8px -2px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 12px -2px rgba(0, 0, 0, 0.12), 0 2px 6px -2px rgba(0, 0, 0, 0.08)',
        'elevated': '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
};
