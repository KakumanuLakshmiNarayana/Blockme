import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#ef4444', dark: '#b91c1c', light: '#fca5a5' },
      },
    },
  },
} satisfies Config;
