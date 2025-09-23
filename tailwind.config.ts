import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Keep existing accent for compatibility; map visually to primary
        accent: { DEFAULT: '#727cf5' },
        // Hyper-inspired core
        primary: '#727cf5',
        success: '#0acf97',
        info: '#39afd1',
        warning: '#ffbc00',
        danger: '#fa5c7c',
        purple: '#6b5eae',
        // UI surfaces
        bg: {
          DEFAULT: '#0f1221',
          card: '#1b2135',
          inset: '#151a2c',
        },
        fg: {
          DEFAULT: '#e6e9f5',
          muted: '#a9b0c7',
          subtle: '#7e86a3',
          inverse: '#0f1221',
        },
        border: '#2a3050',
        // utility tints
        amber: '#ffbc00',
        indigo: '#727cf5',
        cyan: '#39afd1',
        green: '#0acf97',
        rose: '#fa5c7c',
      },
      boxShadow: {
        card: '0 6px 20px rgba(0,0,0,0.25)',
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
      },
    },
  },
  plugins: [],
};

export default config;
