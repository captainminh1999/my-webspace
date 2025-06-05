// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}', // If you use the pages directory
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}', // For the App router
  ],
  darkMode: 'class', // or 'media' if you prefer OS-level dark mode detection
  theme: {
    extend: {
      // You can extend your theme here
      // For example, custom colors, fonts, spacing, etc.
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: 'var(--primary)',
        secondary: 'var(--secondary)',
      },
      fontSize: {
        base: '1.125rem', // 18px
      },
      fontFamily: {
        // Example if you're using custom fonts loaded via Next/font
        // sans: ['var(--font-inter)', 'sans-serif'], // Assuming Inter from next/font
        // mono: ['var(--font-roboto-mono)', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      // You might want to define specific heights for RGL rows if needed,
      // or for specific widget aspect ratios, though RGL primarily uses rowHeight prop.
    },
  },
  plugins: [
    require('@tailwindcss/typography'), // Optional: for rich text styling if you render markdown/HTML
    require('@tailwindcss/forms'),      // Optional: for enhanced form styling
    require('@tailwindcss/aspect-ratio'),// Optional: for maintaining aspect ratios of elements
    require('@tailwindcss/line-clamp'), // Important for the ExpandableText component
  ],
};

export default config;
