import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        saffron: {
          DEFAULT: '#FF6B35',
          hover: '#E85A24',
          light: '#FFEFEA',
        },
        navy: {
          DEFAULT: '#1B1F3B',
          light: '#2D335E',
          dark: '#111427',
        },
        cream: {
          DEFAULT: '#FFF8F0',
          paper: '#FAF0E6',
        },
        brass: {
          DEFAULT: '#C9A94E',
          light: '#DFBF66',
        },
        slate: {
          DEFAULT: '#4A5568',
        },
        chalk: {
          DEFAULT: '#F7FAFC',
        },
        rust: {
          DEFAULT: '#9B2C2C',
        },
        forest: {
          DEFAULT: '#276749',
        },
        coal: {
          DEFAULT: '#1A202C',
        },
        ash: {
          DEFAULT: '#E2E8F0',
        },
        mist: {
          DEFAULT: '#EDF2F7',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
