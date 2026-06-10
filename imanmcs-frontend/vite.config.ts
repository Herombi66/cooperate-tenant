import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const buildSha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || '';
  return {
    plugins: [react()],
    define: {
      __BUILD_SHA__: JSON.stringify(buildSha),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
      environment: 'jsdom',
      testTimeout: 20000,
      hookTimeout: 20000,
      pool: 'threads',
      poolOptions: {
        threads: {
          singleThread: true,
        },
      },
    },
    server: {
      host: true,
      allowedHosts: true,
      port: 5174,
      open: true,
      proxy: {
        // Proxy local dev calls to backend
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
