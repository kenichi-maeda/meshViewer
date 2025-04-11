import { defineConfig } from 'vite'

export default defineConfig({
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.glsl': 'text',
      },
    },
  },
})
