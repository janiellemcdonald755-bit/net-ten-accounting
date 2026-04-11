import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/net-ten-accounting/', // This ensures assets are linked correctly
})
