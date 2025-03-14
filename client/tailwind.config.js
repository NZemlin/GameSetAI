/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        initialization: {
          '0%': { width: '10%' },
          '10%': { width: '20%' },
          '20%': { width: '30%' },
          '30%': { width: '40%' },
          '40%': { width: '50%' },
          '50%': { width: '60%' },
          '60%': { width: '70%' },
          '70%': { width: '80%' },
          '80%': { width: '90%' },
          '90%': { width: '95%' },
          '100%': { width: '100%' }
        }
      },
      animation: {
        initialization: 'initialization 15s ease-in-out forwards'
      }
    },
  },
  plugins: [
    require('tailwind-scrollbar')({ nocompatible: true }),
    require('@tailwindcss/aspect-ratio'),
  ],
}; 