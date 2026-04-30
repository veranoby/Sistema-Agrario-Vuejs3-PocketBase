/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter var',
          'SF Pro Display',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif'
        ]
      },
      colors: {
        priority: {
          baja: '#4caf50',
          media: '#ff9800',
          alta: '#f44336',
          critica: '#b71c1c'
        },
        season: {
          primavera: '#81c784',
          verano: '#ffb74d',
          otono: '#ff8a65',
          invierno: '#64b5f6'
        },
        agri: {
          primary: '#2e7d32',
          success: '#4caf50',
          warning: '#ff9800',
          error: '#f44336',
          info: '#2196f3',
          earth: '#5d4037',
          soil: '#3e2723',
          sky: '#1976d2',
          surface: '#f8f9fa'
        }
      }
    }
  },
  plugins: [],
  important: true
}
