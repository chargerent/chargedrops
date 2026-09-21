import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ["firebase/app", "firebase/auth", "firebase/firestore"],
          maps: ["@react-google-maps/api", "react-icons/md"],
          react: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
})
