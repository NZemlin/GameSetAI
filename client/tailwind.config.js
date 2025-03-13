/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        initialization: {
          '0%': { width: '5%' },
          '10%': { width: '15%' },
          '20%': { width: '30%' },
          '30%': { width: '40%' },
          '40%': { width: '50%' },
          '50%': { width: '60%' },
          '60%': { width: '65%' },
          '70%': { width: '70%' },
          '80%': { width: '75%' },
          '90%': { width: '80%' },
          '100%': { width: '85%' }
        }
      },
      animation: {
        initialization: 'initialization 3.5s ease-out forwards'
      }
    },
  },
  plugins: [
    require('tailwind-scrollbar')({ nocompatible: true }),
    require('@tailwindcss/aspect-ratio'),
  ],
}; 