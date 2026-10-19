<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ApiError, authApi, type DemoAccount } from '@/api'
import { useSessionStore } from '@/stores/session'
import { safeRedirect } from '@/router/redirect'
import { UiButton, UiCard, UiTextField } from '@/components/ui'

const session = useSessionStore()
const route = useRoute()
const router = useRouter()

const accounts = ref<DemoAccount[]>([])
const accountsState = ref<'loading' | 'ready' | 'error'>('loading')
const pendingDemo = ref<number | null>(null)
const demoError = ref('')

const email = ref('')
const password = ref('')
const formError = ref('')
const submitting = ref(false)

async function loadAccounts() {
  accountsState.value = 'loading'
  try {
    accounts.value = await authApi.demoAccounts()
    accountsState.value = 'ready'
  } catch {
    accountsState.value = 'error'
  }
}

async function goNext() {
  await router.replace(safeRedirect(route.query.redirect))
}

async function enterDemo(id: number) {
  pendingDemo.value = id
  demoError.value = ''
  try {
    await session.loginDemo(id)
    await goNext()
  } catch (error) {
    demoError.value = error instanceof ApiError ? error.message : 'Не получилось войти.'
  } finally {
    pendingDemo.value = null
  }
}

async function submit() {
  formError.value = ''
  if (!email.value.trim() || !password.value) {
    formError.value = 'Введите почту и пароль.'
    return
  }
  submitting.value = true
  try {
    await session.loginWithEmail(email.value.trim(), password.value)
    await goNext()
  } catch (error) {
    formError.value =
      error instanceof ApiError && error.status === 401
        ? 'Неверная почта или пароль.'
        : error instanceof ApiError
          ? error.message
          : 'Не получилось войти.'
  } finally {
    submitting.value = false
  }
}

onMounted(loadAccounts)
</script>

<template>
  <section class="mx-auto flex max-w-md flex-col gap-6">
    <header class="flex flex-col gap-1 rounded-card bg-accent p-6">
      <p class="font-hand text-2xl text-accent-ink">спорт — это когда вместе</p>
      <h1 class="text-3xl font-bold">
        {{ session.user ? 'Сменить роль' : 'Вход' }}
      </h1>
      <p v-if="session.user" class="text-accent-ink">Сейчас: {{ session.user.name }}</p>
    </header>

    <section aria-labelledby="demo-title" class="flex flex-col gap-3">
      <h2 id="demo-title" class="text-lg font-bold">Быстрый вход</h2>

      <p v-if="accountsState === 'loading'" class="text-ink-2" role="status">
        Загружаем демо-аккаунты…
      </p>
      <div v-else-if="accountsState === 'error'" class="flex flex-col gap-2" role="alert">
        <p class="text-ink-2">Не получилось загрузить демо-аккаунты.</p>
        <UiButton variant="ghost" @click="loadAccounts">Повторить</UiButton>
      </div>
      <ul v-else class="flex flex-col gap-2.5">
        <li v-for="account in accounts" :key="account.id">
          <UiCard class="!flex-row items-center gap-3 !py-3 !pr-3 !pl-5">
            <div class="min-w-0 flex-1">
              <p class="font-bold">{{ account.name }}</p>
              <p class="text-sm text-ink-2">{{ account.description }}</p>
            </div>
            <UiButton
              class="!w-auto !min-h-11 shrink-0"
              :loading="pendingDemo === account.id"
              :disabled="pendingDemo !== null"
              :aria-label="`Войти: ${account.name}`"
              @click="enterDemo(account.id)"
            >
              Войти
            </UiButton>
          </UiCard>
        </li>
      </ul>
      <p v-if="demoError" class="font-semibold text-orange-ink" role="alert">✕ {{ demoError }}</p>
    </section>

    <form
      v-if="!session.user"
      class="flex flex-col gap-4 rounded-card bg-card p-5"
      novalidate
      aria-labelledby="email-title"
      @submit.prevent="submit"
    >
      <h2 id="email-title" class="text-lg font-bold">или по почте</h2>
      <UiTextField v-model="email" label="Почта" type="email" placeholder="anna@example.ru" />
      <UiTextField v-model="password" label="Пароль" type="password" :error="formError" />
      <UiButton type="submit" :loading="submitting">Войти</UiButton>
      <p class="text-center">
        Нет аккаунта?
        <RouterLink
          :to="{ name: 'register' }"
          class="font-bold text-accent-ink underline underline-offset-4"
        >
          Зарегистрироваться
        </RouterLink>
      </p>
    </form>
  </section>
</template>
