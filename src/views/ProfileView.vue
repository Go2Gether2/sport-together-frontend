<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { ApiError, sportsApi, usersApi, type Sport } from '@/api'
import NavIcon from '@/components/layout/NavIcon.vue'
import type { NavIconName } from '@/components/layout/nav'
import {
  UiAvatar,
  UiButton,
  UiChip,
  UiModal,
  UiSelect,
  UiTextArea,
  UiTextField,
} from '@/components/ui'
import { LEVEL_LABELS } from '@/features/events/filters'
import { AVATAR_PRESETS, presetAvatarUrl } from '@/features/profile/avatar'
import {
  BIO_MAX,
  profileFormFrom,
  toProfileInput,
  toggleSport,
  validateProfileForm,
  type ProfileFormErrors,
  type ProfileFormState,
} from '@/features/profile/profileForm'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()
const router = useRouter()

const sports = ref<Sport[]>([])
const sportsFailed = ref(false)
const editing = ref(false)
const form = ref<ProfileFormState | null>(null)
const errors = ref<ProfileFormErrors>({})
const formError = ref('')
const busy = ref(false)
const saved = ref(false)

const user = computed(() => session.user)
const mySports = computed(() => sports.value.filter((s) => user.value?.sport_ids.includes(s.id)))
const avatarOptions = [
  { value: '', label: 'Инициалы' },
  ...AVATAR_PRESETS.map((p) => ({ value: presetAvatarUrl(p.id), label: p.label })),
]
const levels = Object.entries(LEVEL_LABELS).map(([value, label]) => ({ value, label }))

const links: { label: string; to: { name: string }; icon: NavIconName }[] = [
  { label: 'Мои записи', to: { name: 'my-participations' }, icon: 'calendar' },
  { label: 'Мои мероприятия', to: { name: 'my-events' }, icon: 'flag' },
  { label: 'Моя организация', to: { name: 'my-organization' }, icon: 'building' },
]

async function loadSports() {
  sportsFailed.value = false
  try {
    sports.value = await sportsApi.list()
  } catch {
    sports.value = []
    sportsFailed.value = true
  }
}

onMounted(loadSports)

function startEdit() {
  if (!user.value) return
  form.value = profileFormFrom(user.value)
  errors.value = {}
  formError.value = ''
  saved.value = false
  editing.value = true
}

async function save() {
  if (!form.value) return
  errors.value = validateProfileForm(form.value)
  formError.value = ''
  if (Object.keys(errors.value).length) {
    await nextTick()
    document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    return
  }
  busy.value = true
  try {
    await usersApi.updateMe(toProfileInput(form.value))
    await session.refresh()
    editing.value = false
    saved.value = true
  } catch (e) {
    if (e instanceof ApiError && e.fields.name) errors.value = { name: e.fields.name }
    formError.value = e instanceof ApiError ? e.message : 'Не получилось сохранить.'
  } finally {
    busy.value = false
  }
}

const deleteOpen = ref(false)
const deleting = ref(false)
const deleteError = ref('')
const deletePassword = ref('')

function openDelete() {
  deleteError.value = ''
  deletePassword.value = ''
  deleteOpen.value = true
}

async function deleteAccount() {
  if (!deletePassword.value) {
    deleteError.value = 'Введите пароль, чтобы подтвердить удаление.'
    return
  }
  deleting.value = true
  deleteError.value = ''
  try {
    await usersApi.deleteMe(deletePassword.value)
    session.clear()
    deleteOpen.value = false
    await router.push({ name: 'home' })
  } catch (e) {
    // Демо-аккаунты бэк защищает от удаления — объясняем это без технических слов.
    deleteError.value =
      e instanceof ApiError && /демо/i.test(e.message)
        ? 'Демо-аккаунт удалить нельзя — он нужен для проверки. Зарегистрируйте свой, чтобы попробовать удаление.'
        : e instanceof ApiError
          ? e.message
          : 'Не получилось удалить аккаунт.'
  } finally {
    deleting.value = false
  }
}

async function logout() {
  await session.logout()
  await router.push({ name: 'home' })
}
</script>

<template>
  <section v-if="user" class="mx-auto flex max-w-3xl flex-col gap-4">
    <header class="flex flex-col gap-4 rounded-card bg-accent p-6 sm:flex-row sm:items-center">
      <UiAvatar :name="user.name" :url="user.avatar_url" size="xl" />
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <h1 class="text-3xl leading-tight font-bold">{{ user.name }}</h1>
        <p class="text-accent-ink">
          {{ user.city || 'Город не указан' }}
          <template v-if="user.level"> · {{ LEVEL_LABELS[user.level] }}</template>
        </p>
      </div>
      <UiButton v-if="!editing" class="!w-auto self-start sm:self-center" @click="startEdit">
        Изменить
      </UiButton>
    </header>

    <p v-if="saved" class="rounded-card bg-accent-soft p-4 font-semibold" role="status">
      ✓ Профиль сохранён
    </p>

    <form
      v-if="editing && form"
      class="flex flex-col gap-4 rounded-card bg-card p-5"
      novalidate
      @submit.prevent="save"
    >
      <UiTextField v-model="form.name" label="Имя" required :error="errors.name" />
      <fieldset class="flex flex-col gap-2">
        <legend class="mb-1.5 ml-1 text-[15px] font-semibold">Аватарка</legend>
        <div class="flex flex-wrap gap-2">
          <label
            v-for="option in avatarOptions"
            :key="option.value"
            class="flex cursor-pointer flex-col items-center gap-1 rounded-2xl p-1.5 ring-accent-strong has-checked:ring-3 has-focus-visible:outline-3 has-focus-visible:outline-accent-ink"
          >
            <input
              v-model="form.avatar"
              type="radio"
              name="avatar"
              :value="option.value"
              class="sr-only"
            />
            <UiAvatar :name="form.name || user.name" :url="option.value" size="lg" />
            <span class="text-xs font-medium">{{ option.label }}</span>
          </label>
        </div>
      </fieldset>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <UiTextField v-model="form.city" label="Город" placeholder="Красноярск" />
        <UiSelect v-model="form.level" label="Уровень" :options="levels" placeholder="Не указан" />
      </div>
      <fieldset class="flex flex-col gap-2">
        <legend class="mb-1.5 ml-1 text-[15px] font-semibold">Интересы</legend>
        <div class="flex flex-wrap gap-2">
          <UiChip
            v-for="s in sports"
            :key="s.id"
            :pressed="form.sportIds.includes(s.id)"
            @click="form.sportIds = toggleSport(form.sportIds, s.id)"
          >
            {{ s.name }}
          </UiChip>
        </div>
      </fieldset>
      <UiTextArea
        v-model="form.bio"
        label="О себе"
        :rows="3"
        :maxlength="BIO_MAX"
        placeholder="Чем занимаетесь, с кем хотите тренироваться"
        :error="errors.bio"
      />
      <p v-if="formError" class="font-semibold text-orange-ink" role="alert">✕ {{ formError }}</p>
      <div class="flex flex-col-reverse gap-2 sm:flex-row">
        <UiButton variant="ghost" @click="editing = false">Отмена</UiButton>
        <UiButton type="submit" :loading="busy">Сохранить</UiButton>
      </div>
    </form>

    <template v-else>
      <section class="flex flex-col gap-3 rounded-card bg-card p-5">
        <p v-if="user.bio" class="whitespace-pre-line">{{ user.bio }}</p>
        <p v-else class="text-ink-2">Расскажите о себе — организаторам проще знакомиться.</p>
        <div class="flex flex-col gap-2">
          <h2 class="font-bold">Интересы</h2>
          <div v-if="mySports.length" class="flex flex-wrap gap-2">
            <span
              v-for="s in mySports"
              :key="s.id"
              class="rounded-full bg-field px-4 py-2 font-semibold"
            >
              {{ s.name }}
            </span>
          </div>
          <p v-else-if="sportsFailed && user.sport_ids.length" class="text-ink-2" role="alert">
            Не получилось загрузить интересы.
            <button
              type="button"
              class="inline-flex min-h-8 items-center font-semibold text-ink underline underline-offset-4"
              @click="loadSports"
            >
              Повторить
            </button>
          </p>
          <p v-else class="text-ink-2">Не выбраны</p>
        </div>
        <RouterLink
          :to="{ name: 'user', params: { id: user.id } }"
          class="inline-flex min-h-8 items-center w-fit text-sm font-semibold text-accent-ink underline underline-offset-4"
        >
          Как меня видят другие
        </RouterLink>
      </section>

      <nav aria-label="Мои разделы" class="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <RouterLink
          v-for="l in links"
          :key="l.label"
          :to="l.to"
          class="flex items-center gap-3 rounded-card bg-card p-4 font-semibold text-ink no-underline hover:bg-accent-soft"
        >
          <NavIcon :name="l.icon" />
          {{ l.label }}
        </RouterLink>
      </nav>

      <div class="flex flex-wrap gap-2">
        <RouterLink
          :to="{ name: 'login' }"
          class="rounded-full bg-field px-5 py-3 font-semibold text-ink no-underline hover:bg-mute"
        >
          Сменить роль
        </RouterLink>
        <button
          type="button"
          class="rounded-full bg-field px-5 py-3 font-semibold hover:bg-mute"
          @click="logout"
        >
          Выйти
        </button>
      </div>
      <button
        type="button"
        class="inline-flex min-h-8 items-center w-fit px-1 text-sm font-semibold text-ink-2 underline underline-offset-4 hover:text-ink"
        @click="openDelete"
      >
        Удалить аккаунт и данные
      </button>
    </template>

    <UiModal
      v-model:open="deleteOpen"
      title="Удалить аккаунт?"
      description="Удалим имя, почту, город, интересы и «о себе», отменим ваши записи и мероприятия. В обсуждениях останется «Удалённый пользователь». Вернуть нельзя."
    >
      <UiTextField
        v-model="deletePassword"
        label="Пароль от аккаунта"
        type="password"
        hint="Чтобы никто, кроме вас, не удалил аккаунт."
      />
      <p
        v-if="deleteError"
        class="rounded-field bg-orange p-4 font-semibold text-orange-ink"
        role="alert"
      >
        {{ deleteError }}
      </p>
      <template #actions>
        <UiButton variant="ghost" @click="deleteOpen = false">Отмена</UiButton>
        <UiButton :loading="deleting" @click="deleteAccount">Удалить навсегда</UiButton>
      </template>
    </UiModal>
  </section>
</template>
