import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = Number.parseInt(env.VITE_PORT || '5173', 10)
  const apiTarget = env.VITE_LOCAL_API_TARGET || `http://localhost:${env.PORT || env.SERVER_PORT || '3001'}`

  return {
    server: {
      port,
      strictPort: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/health': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
