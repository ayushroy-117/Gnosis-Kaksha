import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // New brand color palette (EdTech - Navy/Blue)
        primary: {
          dark: '#2E5EAA',  // Navy blue - headings, navbar, footer
          DEFAULT: '#1295D8', // Medium blue - primary buttons, links
          light: '#50B4F2',  // Light blue - secondary accents, icons
          pale: '#CDE6F7',   // Pale blue - section backgrounds, badges
        },
        text: {
          heading: '#1A2B4A', // Near-navy for all headings
          body: '#4A5568',    // Dark gray for body copy
          muted: '#718096',   // Muted gray for captions/dates
        },
        bg: {
          section: {
            alt: '#F7FAFC', // Very light gray-blue for alternating sections
          },
        },
      },
      backgroundColor: {
        section: {
          alt: '#F7FAFC',
        },
      },
      backgroundImage: {
        'gradient-hero': 'linear-gradient(135deg, #2E5EAA 0%, #1295D8 100%)',
        'gradient-cta': 'linear-gradient(135deg, #1295D8 0%, #50B4F2 100%)',
      },
      gradientColorStops: {
        'primary-dark': '#2E5EAA',
        'primary-default': '#1295D8',
        'primary-light': '#50B4F2',
      },
      fontSize: {
        base: '17px', // Increased from 16px for better readability
      },
      lineHeight: {
        tight: '1.4',
        normal: '1.6',
        relaxed: '1.7',
      },
      borderRadius: {
        button: '8px',
        card: '12px',
      },
      boxShadow: {
        sm: '0 1px 4px rgba(0, 0, 0, 0.05)',
        md: '0 2px 8px rgba(0, 0, 0, 0.06)',
        lg: '0 4px 12px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
