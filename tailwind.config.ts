import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
      },
      colors: {
        primary: 'var(--ui-primary)',
        black: 'var(--ui-black)',
        white: 'var(--ui-white)',
        trans: 'var(--ui-trans)',
      },
    },
  },
  plugins: [],
}

export default config
