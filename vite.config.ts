import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves under /kahoot-clone/
export default defineConfig({
  plugins: [react()],
  base: '/kahoot-clone/',
})
