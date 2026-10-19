import '@fontsource-variable/inter'
import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

async function enableMocks() {
  if (import.meta.env.VITE_API_MOCK !== 'true') return
  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true })
}

await enableMocks()

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
