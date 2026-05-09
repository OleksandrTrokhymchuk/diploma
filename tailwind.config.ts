import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{vue,js,ts}',
    './pages/**/*.{vue,js,ts}',
    './widgets/**/*.{vue,js,ts}',
    './features/**/*.{vue,js,ts}',
    './entities/**/*.{vue,js,ts}',
    './shared/**/*.{vue,js,ts}',
    './layouts/**/*.{vue,js,ts}',
    './components/**/*.{vue,js,ts}',
  ],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config
