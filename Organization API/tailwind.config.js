// Path: /tailwind.config.js
module.exports = {
  content: [
    './views/**/*.ejs',
    './public/js/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
        // Main: Ruxchai Blue
        'ruxchai-blue': {
          DEFAULT: '#0090D3',
          50: '#E6F4FB',    // lightest
          100: '#CCE9F7',
          200: '#99D3EE',
          300: '#66BDE6',
          400: '#33A6DD',
          500: '#0090D3',   // main color
          600: '#0073A9',
          700: '#00567F',
          800: '#003A54',
          900: '#001D2A',   // darkest
          // Additional shades from CI
          'dark': '#047685',
          'medium': '#00B1EF',
          'light': '#4DD1FF'
        },
        // Secondary: Green
        'ruxchai-green': {
          DEFAULT: '#3AAA35',
          50: '#E8F5E7',    // lightest
          100: '#D1EBCF',
          200: '#A3D79F',
          300: '#75C36F',
          400: '#47AF3F',
          500: '#3AAA35',   // main color
          600: '#2E882A',
          700: '#22661F',
          800: '#164415',
          900: '#0B220A',   // darkest
          // Additional shades from CI
          'dark': '#258C1F',
          'medium': '#24C617',
          'light': '#56E04F'
        },
        // Secondary: Grey
        'ruxchai-grey': {
          DEFAULT: '#555452',
          50: '#F5F5F5',    // lightest
          100: '#E8E8E7',
          200: '#D1D1CF',
          300: '#B9B9B7',
          400: '#A2A29F',
          500: '#555452',   // main color
          600: '#444342',
          700: '#333231',
          800: '#222221',
          900: '#111110',   // darkest
          // Additional shades from CI
          'dark': '#161616',
          'medium': '#6B6B6B',
          'light': '#999999'
        },
        // Aliases for easier use
        'primary': {
          50: '#E6F4FB',
          100: '#CCE9F7',
          200: '#99D3EE',
          300: '#66BDE6',
          400: '#33A6DD',
          500: '#0090D3',
          600: '#0073A9',
          700: '#00567F',
          800: '#003A54',
          900: '#001D2A',
        },
        'success': {
          50: '#E8F5E7',
          100: '#D1EBCF',
          200: '#A3D79F',
          300: '#75C36F',
          400: '#47AF3F',
          500: '#3AAA35',
          600: '#2E882A',
          700: '#22661F',
          800: '#164415',
          900: '#0B220A',
        },
        'neutral': {
          50: '#F5F5F5',
          100: '#E8E8E7',
          200: '#D1D1CF',
          300: '#B9B9B7',
          400: '#A2A29F',
          500: '#555452',
          600: '#444342',
          700: '#333231',
          800: '#222221',
          900: '#111110',
        }
      },
      fontFamily: {
        'sans': ['Inter', 'Noto Sans Thai', 'ui-sans-serif', 'system-ui'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}