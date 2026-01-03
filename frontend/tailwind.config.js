/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-in': 'slideIn 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'shake': 'shake 0.5s ease-in-out',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        light: {
          "primary": "#0066cc",
          "secondary": "#00a3a3",
          "accent": "#ff6b6b",
          "neutral": "#3d4451",
          "base-100": "#ffffff",
          "base-200": "#f7f7f7",
          "base-300": "#e5e6e6",
          "info": "#3abff8",
          "success": "#36d399",
          "warning": "#fbbd23",
          "error": "#f87272",
        },
        cupcake: {
          "primary": "#65c3c8",
          "secondary": "#ef9fbc",
          "accent": "#eeaf3a",
          "neutral": "#291334",
          "base-100": "#faf7f5",
          "base-200": "#efeae6",
          "base-300": "#e7d8d3",
          "info": "#c0e4e6",
          "success": "#d0e2d4",
          "warning": "#f4e4a6",
          "error": "#f2a6a0",
        },
        dark: {
          "primary": "#0066cc",
          "secondary": "#00a3a3",
          "accent": "#ff6b6b",
          "neutral": "#1a1a1a",
          "base-100": "#1d232a",
          "base-200": "#191e24",
          "base-300": "#15191e",
          "info": "#3abff8",
          "success": "#36d399",
          "warning": "#fbbd23",
          "error": "#f87272",
        },
      },
    ],
    darkTheme: "light",
    base: true,
    styled: true,
    utils: true,
    prefix: "",
    logs: true,
    themeRoot: ":root",
  },
}
