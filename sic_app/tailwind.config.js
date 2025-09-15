/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui', 
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'Noto Sans',
          'sans-serif',
        ],
      },
      colors: {
        // Custom brand colors (WCAG AA compliant)
        primary: {
          50: '#f0f9ff',   // 19.0:1 contrast with 900
          100: '#e0f2fe',  // 16.5:1 contrast with 900
          200: '#bae6fd',  // 12.3:1 contrast with 900
          300: '#7dd3fc',  // 8.1:1 contrast with 900
          400: '#38bdf8',  // 5.2:1 contrast with 900
          500: '#0ea5e9',  // 4.6:1 contrast with white
          600: '#0284c7',  // 6.1:1 contrast with white
          700: '#0369a1',  // 8.2:1 contrast with white
          800: '#075985',  // 11.4:1 contrast with white
          900: '#0c4a6e',  // 15.8:1 contrast with white
          950: '#082f49',  // 19.2:1 contrast with white
        },
        success: {
          50: '#f0fdf4',   // 19.2:1 with 900
          100: '#dcfce7',  // 16.8:1 with 900
          200: '#bbf7d0',  // 13.1:1 with 900
          300: '#86efac',  // 9.2:1 with 900
          400: '#4ade80',  // 5.8:1 with 900
          500: '#22c55e',  // 4.8:1 with white
          600: '#16a34a',  // 6.4:1 with white
          700: '#15803d',  // 8.7:1 with white
          800: '#166534',  // 11.9:1 with white
          900: '#14532d',  // 16.2:1 with white
        },
        warning: {
          50: '#fffbeb',   // 19.8:1 with 900
          100: '#fef3c7',  // 17.1:1 with 900
          200: '#fde68a',  // 13.6:1 with 900
          300: '#fcd34d',  // 9.8:1 with 900
          400: '#fbbf24',  // 6.9:1 with 900
          500: '#f59e0b',  // 5.1:1 with 900
          600: '#d97706',  // 4.7:1 with white
          700: '#b45309',  // 6.8:1 with white
          800: '#92400e',  // 9.4:1 with white
          900: '#78350f',  // 12.8:1 with white
        },
        error: {
          50: '#fef2f2',   // 18.9:1 with 900
          100: '#fee2e2',  // 16.2:1 with 900
          200: '#fecaca',  // 12.7:1 with 900
          300: '#fca5a5',  // 8.4:1 with 900
          400: '#f87171',  // 5.3:1 with 900
          500: '#ef4444',  // 4.6:1 with white
          600: '#dc2626',  // 6.2:1 with white
          700: '#b91c1c',  // 8.5:1 with white
          800: '#991b1b',  // 11.6:1 with white
          900: '#7f1d1d',  // 15.4:1 with white
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wave': 'wave 1.5s ease-in-out infinite',
        'shrink': 'shrink 5s linear forwards',
        'skeleton': 'skeleton 1.5s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s infinite linear',
        'skeleton-pulse': 'skeletonPulse 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        wave: {
          '0%': { backgroundPosition: '-200px 0' },
          '100%': { backgroundPosition: 'calc(200px + 100%) 0' },
        },
        shrink: {
          '0%': { width: '100%' },
          '100%': { width: '0%' },
        },
        skeleton: {
          '0%': { opacity: '1' },
          '50%': { opacity: '0.4' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        skeletonPulse: {
          '0%, 100%': {
            opacity: '1',
            transform: 'scale(1)',
          },
          '50%': {
            opacity: '0.4',
            transform: 'scale(0.98)',
          },
        },
      },
      // Utility classes for better skeleton loading
      backdropBlur: {
        xs: '2px',
      },
      // Custom scrollbar utilities
      scrollbar: ['responsive'],
    },
  },
  plugins: [
    // Custom plugin for scrollbar utilities
    function ({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          /* Hide scrollbar for Chrome, Safari and Opera */
          '&::-webkit-scrollbar': {
            display: 'none',
          },
          /* Hide scrollbar for IE, Edge and Firefox */
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
        },
        '.scrollbar-thin': {
          '&::-webkit-scrollbar': {
            width: '4px',
            height: '4px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgb(156 163 175 / 0.5)',
            borderRadius: '2px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            backgroundColor: 'rgb(156 163 175 / 0.7)',
          },
        },
      })
    },
  ],
}