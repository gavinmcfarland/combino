import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '<%= rebase('src') %>'),
      '@components': path.resolve(__dirname, '<%= rebase('src/components') %>'),
      '@utils': path.resolve(__dirname, '<%= rebase('src/utils') %>')
    }
  },
  build: {
    outDir: '<%= rebase('dist') %>',
    sourcemap: true
  }
})
