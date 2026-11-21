/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "var(--color-surface)",
        "surface-container": "var(--color-surface-container)",
        "surface-card": "var(--color-surface-card)",
        primary: "var(--color-primary)",
        accent: "var(--color-accent)",
        secondary: "var(--color-secondary)",
        "text-primary": "var(--color-text-primary)",
        "text-secondary": "var(--color-text-secondary)",
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'presence-breathe': 'presence-breathe 4.5s ease-in-out infinite',
      },
      keyframes: {
        'presence-breathe': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.22)', opacity: '0.68' },
        }
      }
    },
  },
  plugins: [],
}
