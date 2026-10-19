import { fileURLToPath, URL } from 'node:url'

import { configDefaults, defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [vue(), tailwindcss()],
    // E2E всегда идут на моках, что бы ни стояло в локальном .env.local.
    define: mode === 'e2e' ? { 'import.meta.env.VITE_API_MOCK': JSON.stringify('true') } : {},
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: env.API_PROXY_TARGET || 'http://localhost:8080',
          changeOrigin: true,
          // Бэк ставит cookie входа с Secure, а локально мы на http — Safari и заход по IP её отбрасывают.
          // Только в dev-прокси снимаем Secure; на стенде с HTTPS cookie остаётся как у бэка.
          configure: (proxy) => {
            proxy.on('proxyRes', (res) => {
              const cookies = res.headers['set-cookie']
              if (cookies)
                res.headers['set-cookie'] = cookies.map((c) => c.replace(/;\s*Secure/gi, ''))
            })
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
    },
  }
})
