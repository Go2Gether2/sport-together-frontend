<script setup lang="ts">
import { nextTick, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ApiError } from '@/api'
import { UiButton, UiCheckbox, UiTextField } from '@/components/ui'
import {
  PASSWORD_MIN,
  emptyRegisterForm,
  mapRegisterServerErrors,
  toRegisterInput,
  validateRegisterForm,
  type RegisterFormErrors,
} from '@/features/auth/registerForm'
import { safeRedirect } from '@/router/redirect'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()
const router = useRouter()
const route = useRoute()

const form = reactive(emptyRegisterForm())
const errors = ref<RegisterFormErrors>({})
const formError = ref('')
const busy = ref(false)

async function submit() {
  errors.value = validateRegisterForm(form)
  formError.value = ''
  if (Object.keys(errors.value).length) {
    await nextTick()
    document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    return
  }
  busy.value = true
  try {
    await session.register(toRegisterInput(form))
    await router.replace(safeRedirect(route.query.redirect))
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) errors.value = { email: e.message }
    else if (e instanceof ApiError && Object.keys(e.fields).length)
      errors.value = mapRegisterServerErrors(e.fields)
    else formError.value = e instanceof ApiError ? e.message : 'Не получилось зарегистрироваться.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="mx-auto flex max-w-md flex-col gap-6">
    <header class="flex flex-col gap-1 rounded-card bg-accent p-6">
      <p class="font-hand text-2xl text-accent-ink">спорт — это когда вместе</p>
      <h1 class="text-3xl font-bold">Регистрация</h1>
      <p class="text-accent-ink">Только то, что нужно для записи на занятия.</p>
    </header>

    <form class="flex flex-col gap-4 rounded-card bg-card p-5" novalidate @submit.prevent="submit">
      <UiTextField
        v-model="form.name"
        label="Имя"
        required
        placeholder="Анна"
        :error="errors.name"
      />
      <UiTextField
        v-model="form.email"
        label="Почта"
        type="email"
        required
        placeholder="anna@mail.ru"
        :error="errors.email"
      />
      <UiTextField
        v-model="form.password"
        label="Пароль"
        type="password"
        required
        :hint="`Не короче ${PASSWORD_MIN} символов`"
        :error="errors.password"
      />

      <div class="flex flex-col gap-1">
        <UiCheckbox v-model="form.consent">
          Даю согласие на обработку персональных данных по
          <RouterLink :to="{ name: 'privacy' }" class="font-semibold underline underline-offset-4">
            политике
          </RouterLink>
        </UiCheckbox>
        <p v-if="errors.consent" class="ml-1 text-sm font-semibold text-orange-ink" role="alert">
          ✕ {{ errors.consent }}
        </p>
      </div>

      <p v-if="formError" class="font-semibold text-orange-ink" role="alert">✕ {{ formError }}</p>

      <UiButton type="submit" :disabled="!form.consent" :loading="busy"> Создать аккаунт </UiButton>
      <p v-if="!form.consent" class="-mt-2 text-center text-sm text-ink-2">
        Кнопка станет активной после согласия
      </p>

      <p class="text-center">
        Уже есть аккаунт?
        <RouterLink :to="{ name: 'login' }" class="font-bold underline underline-offset-4">
          Войти
        </RouterLink>
      </p>
    </form>
  </section>
</template>
