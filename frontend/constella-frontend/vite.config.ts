import path from 'node:path'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Vite reads .env files only after evaluating this config, so load them here for the proxy.
  const env = loadEnv(mode, import.meta.dirname, '')
  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    // The Constella API (backend/). Override the target with VITE_API_PROXY (env or .env files).
    server: {
      proxy: {
        '/api': env.VITE_API_PROXY || 'http://localhost:8000',
      },
    },
  }
})
