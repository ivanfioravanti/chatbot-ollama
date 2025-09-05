/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Modern Primary Palette
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        // Modern Gray Scale
        gray: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        // Modern Dark Theme
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        // Modern Accent Colors
        accent: {
          blue: '#3b82f6',
          purple: '#8b5cf6',
          pink: '#ec4899',
          green: '#10b981',
          yellow: '#f59e0b',
          orange: '#f97316',
          red: '#ef4444',
        },
        // Modern Message Colors
        message: {
          user: {
            light: '#f0f9ff',
            dark: '#1e3a8a',
          },
          assistant: {
            light: '#f8fafc',
            dark: '#1e293b',
          },
        },
        // Modern Status Colors
        status: {
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6',
        },
      },
      fontFamily: {
        // Modern Font Stack
        sans: [
          'Inter',
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
          'Apple Color Emoji',
          'Segoe UI Emoji',
          'Segoe UI Symbol',
          'Noto Color Emoji',
        ],
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
      },
      fontSize: {
        // Modern Typography Scale
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1.16' }],
      },
      spacing: {
        // Modern Spacing Scale
        18: '4.5rem',
        88: '22rem',
        128: '32rem',
      },
      boxShadow: {
        // Modern Shadow System
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'DEFAULT': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        'inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
        'none': 'none',
        // Custom Shadows for Modern Look
        'message': '0 2px 8px -1px rgb(0 0 0 / 0.08), 0 1px 4px -2px rgb(0 0 0 / 0.04)',
        'card': '0 4px 12px -2px rgb(0 0 0 / 0.08), 0 2px 8px -4px rgb(0 0 0 / 0.04)',
        'hover': '0 8px 24px -4px rgb(0 0 0 / 0.12), 0 4px 12px -6px rgb(0 0 0 / 0.08)',
        'glass': '0 8px 32px -8px rgb(0 0 0 / 0.2), 0 4px 16px -4px rgb(0 0 0 / 0.12)',
      },
      borderRadius: {
        // Modern Border Radius
        '4xl': '2rem',
        '5xl': '2.5rem',
        'full': '9999px',
      },
      animation: {
        // Modern Animations
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 1.5s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      backdropBlur: {
        // Modern Backdrop Blur
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '16px',
        xl: '24px',
      },
      transitionDuration: {
        // Modern Transitions
        '2000': '2000ms',
        '3000': '3000ms',
      },
      transitionTimingFunction: {
        // Modern Easing
        'in-out-quad': 'cubic-bezier(0.45, 0, 0.55, 1)',
        'in-out-cubic': 'cubic-bezier(0.65, 0, 0.35, 1)',
        'out-quad': 'cubic-bezier(0, 0, 0.58, 1)',
        'out-cubic': 'cubic-bezier(0.33, 1, 0.68, 1)',
      },
    },
  },
  variants: {
    extend: {
      visibility: ['group-hover'],
      scale: ['group-hover'],
      rotate: ['group-hover'],
      translate: ['group-hover'],
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
