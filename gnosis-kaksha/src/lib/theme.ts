/**
 * Theme Configuration & Color Constants
 * EdTech Color Palette - Navy/Blue scheme
 */

export const COLORS = {
  // Primary Brand Colors
  primary: {
    dark: '#2E5EAA',      // Navy blue - headings, navbar, footer
    default: '#1295D8',   // Medium blue - primary buttons, links
    light: '#50B4F2',     // Light blue - secondary accents, icons
    pale: '#CDE6F7',      // Pale blue - section backgrounds, badges
  },

  // Text Colors
  text: {
    heading: '#1A2B4A',   // Near-navy for all headings
    body: '#4A5568',      // Dark gray for body copy
    muted: '#718096',     // Muted gray for captions/dates
  },

  // Background Colors
  bg: {
    page: '#FFFFFF',
    sectionAlt: '#F7FAFC', // Very light gray-blue for alternating sections
  },

  // Semantic Colors
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
};

export const GRADIENTS = {
  hero: 'linear-gradient(135deg, #2E5EAA 0%, #1295D8 100%)',
  cta: 'linear-gradient(135deg, #1295D8 0%, #50B4F2 100%)',
};

export const TYPOGRAPHY = {
  fontSize: {
    xs: '13px',
    sm: '14px',
    base: '17px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '32px',
    '4xl': '40px',
    '5xl': '48px',
    '6xl': '56px',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
  lineHeight: {
    tight: 1.4,
    normal: 1.6,
    relaxed: 1.7,
  },
};

export const SPACING = {
  button: {
    borderRadius: '8px',
    paddingX: '24px',
    paddingY: '12px',
  },
  card: {
    borderRadius: '12px',
    padding: '24px',
  },
  input: {
    borderRadius: '8px',
    padding: '12px 14px',
  },
};

export const SHADOWS = {
  sm: '0 1px 4px rgba(0, 0, 0, 0.05)',
  md: '0 2px 8px rgba(0, 0, 0, 0.06)',
  lg: '0 4px 12px rgba(0, 0, 0, 0.06)',
};

/**
 * Utility function to get Tailwind classes for theme
 */
export const getThemeClasses = {
  // Buttons
  buttonPrimary: 'bg-gradient-to-r from-primary to-primary-light text-white hover:shadow-lg',
  buttonSecondary: 'bg-primary-pale text-primary border border-primary hover:bg-primary-light hover:text-white',
  buttonOutline: 'border border-primary text-primary hover:bg-primary-pale',

  // Text
  headingLarge: 'text-6xl font-bold text-text-heading',
  heading1: 'text-5xl font-bold text-text-heading',
  heading2: 'text-4xl font-bold text-text-heading',
  heading3: 'text-xl font-semibold text-text-heading',
  bodyText: 'text-base text-text-body',
  mutedText: 'text-sm text-text-muted',

  // Cards
  card: 'bg-white rounded-card border border-gray-200 shadow-sm p-6',
  cardHover: 'hover:shadow-md transition-shadow',

  // Sections
  sectionBg: 'bg-white',
  sectionBgAlt: 'bg-primary-pale',

  // Gradients
  gradientHero: 'bg-gradient-hero',
  gradientCta: 'bg-gradient-cta',
};
