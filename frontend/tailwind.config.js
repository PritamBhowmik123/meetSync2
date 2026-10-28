/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        meet: {
          dark: '#202124',
          card: '#282a2d',
          surface: '#3c4043',
          border: '#4a4d51',
          accent: '#1a73e8',
          accentHover: '#1765cc',
          red: '#ea4335',
          redHover: '#d93025',
          green: '#34a853',
          yellow: '#fbbc04'
        }
      }
    },
  },
  plugins: [],
}

