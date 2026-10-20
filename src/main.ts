import '@fontsource/onest/400.css'
import '@fontsource/onest/500.css'
import '@fontsource/onest/600.css'
import '@fontsource/onest/700.css'
import '@fontsource/caveat/600.css'
import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { initTheme } from './features/theme/theme'
import { i18n, initLocale } from './i18n'

initTheme()
initLocale()

async function enableMocks() {
  if (import.meta.env.VITE_API_MOCK !== 'true') return
  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true })
}

await enableMocks()

const app = createApp(App)

app.use(createPinia())
app.use(i18n)
app.use(router)

app.mount('#app')
