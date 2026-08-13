import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables from root directory
dotenv.config({ path: path.resolve(__dirname, '../.env') })

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: path.resolve(__dirname, '..'),
  resolve: {
    alias: {
      '@gamesetai/scoring': path.resolve(__dirname, '../packages/scoring/src/index.ts'),
    },
  },
  server: {
    port: 5173,
  },
})
