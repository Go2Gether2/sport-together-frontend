<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError, eventsApi, sportsApi } from '@/api'
import { UiButton, UiCombobox, UiSelect, UiTextField, type UiOption } from '@/components/ui'
import UiTextArea from '@/components/ui/UiTextArea.vue'
import { LEVEL_LABELS } from '@/features/events/filters'
import { useSessionStore } from '@/stores/session'
import {
  authorOptions,
  emptyEventForm,
  mapServerErrors,
  newSportValue,
  toEventInput,
  validateEventForm,
  type EventFormErrors,
} from '@/utils/eventForm'

const router = useRouter()
const session = useSessionStore()

const form = reactive(emptyEventForm())
const errors = ref<EventFormErrors>({})
const formError = ref('')
const submitting = ref(false)

const sportOptions = ref<UiOption[]>([])
const sportsFailed = ref(false)

const levels: UiOption[] = Object.entries(LEVEL_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const joinModes = [
  {
    value: 'open' as const,
    title: 'Свободно',
    text: 'Сразу участник',
  },
  {
    value: 'approval' as const,
    title: 'По заявке',
    text: 'Вы решаете, кого принять',
  },
]

const authors = computed(() => authorOptions(session.approvedOrganizations))
const isNewSport = computed(() => form.sport?.startsWith('new:') ?? false)
const now = new Date()
const today = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, '0'),
  String(now.getDate()).padStart(2, '0'),
].join('-')

onMounted(async () => {
  try {
    const sports = await sportsApi.list()
    sportOptions.value = sports.map((s) => ({ value: String(s.id), label: s.name }))
  } catch {
    sportsFailed.value = true
  }
})

function addSport(label: string) {
  const value = newSportValue(label)
  sportOptions.value = [
    ...sportOptions.value.filter((o) => !o.value.startsWith('new:')),
    { value, label },
  ]
  form.sport = value
}

async function focusFirstError() {
  await nextTick()
  document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
}

async function submit() {
  formError.value = ''
  errors.value = validateEventForm(form)
  if (Object.keys(errors.value).length) return focusFirstError()

  submitting.value = true
  try {
    const { id } = await eventsApi.create(toEventInput(form))
    await router.push({ name: 'event', params: { id } })
  } catch (e) {
    if (e instanceof ApiError && e.status === 422 && Object.keys(e.fields).length) {
      const mapped = mapServerErrors(e.fields)
      errors.value = mapped.errors
      formError.value = mapped.rest.join(' ') || e.message
      focusFirstError()
    } else {
      formError.value =
        e instanceof ApiError ? e.message : 'Не получилось опубликовать. Попробуйте ещё раз.'
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="mx-auto flex w-full max-w-2xl flex-col gap-6">
    <h1 class="text-3xl font-bold">Новое мероприятие</h1>

    <form class="flex flex-col gap-4" novalidate @submit.prevent="submit">
      <fieldset v-if="authors.length > 1">
        <legend class="mb-2 ml-1 text-[15px] font-semibold">От чьего имени</legend>
        <div class="flex flex-wrap gap-1.5 rounded-[28px] bg-card p-1.5">
          <label
            v-for="a in authors"
            :key="a.value ?? 'me'"
            class="min-w-0 flex-1 cursor-pointer truncate rounded-full px-4 py-3 text-center font-semibold whitespace-nowrap has-checked:bg-ink has-checked:text-white has-focus-visible:outline-3 has-focus-visible:-outline-offset-4 has-focus-visible:outline-accent-ink"
          >
            <input
              v-model="form.organizationId"
              type="radio"
              name="author"
              :value="a.value"
              class="sr-only"
            />
            {{ a.label }}
          </label>
        </div>
      </fieldset>

      <div class="flex flex-col gap-4 rounded-card bg-card p-5">
        <h2 class="text-xl font-bold">Что и когда</h2>
        <UiTextField
          v-model="form.title"
          label="Название"
          required
          placeholder="Теннис после работы"
          :error="errors.title"
        />
        <UiCombobox
          v-model="form.sport"
          label="Направление"
          required
          allow-create
          :options="sportOptions"
          placeholder="Футбол, йога, шахматы…"
          :hint="sportsFailed ? 'Список не загрузился — впишите своё' : undefined"
          :error="errors.sport"
          @create="addSport"
        />
        <p v-if="isNewSport" class="-mt-2 ml-1 text-sm font-semibold">✦ Новое направление</p>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <UiTextField
            v-model="form.date"
            type="date"
            label="Дата"
            required
            :min="today"
            :error="errors.date"
          />
          <UiTextField
            v-model="form.startTime"
            type="time"
            label="Начало"
            required
            :error="errors.startTime"
          />
          <UiTextField
            v-model="form.endTime"
            type="time"
            label="Окончание"
            :error="errors.endTime"
          />
        </div>
        <UiTextArea
          v-model="form.description"
          label="Описание"
          :maxlength="2000"
          placeholder="Что будем делать и для кого"
          :error="errors.description"
        />
      </div>

      <div class="flex flex-col gap-4 rounded-card bg-card p-5">
        <h2 class="text-xl font-bold">Где</h2>
        <UiTextField
          v-model="form.address"
          label="Адрес"
          required
          placeholder="Красноярск, стадион «Енисей»"
          :error="errors.address"
        />
        <UiTextField
          v-model="form.locationNote"
          label="Как найти"
          placeholder="Корт 3, вход со стороны парковки"
          :error="errors.locationNote"
        />
      </div>

      <div class="flex flex-col gap-4 rounded-card bg-card p-5">
        <h2 class="text-xl font-bold">Запись</h2>
        <fieldset
          class="flex flex-col gap-2"
          :aria-describedby="errors.joinMode ? 'join-err' : undefined"
        >
          <legend class="mb-1.5 ml-1 text-[15px] font-semibold">
            Как записываться<span aria-hidden="true" class="text-orange"> *</span>
          </legend>
          <label
            v-for="m in joinModes"
            :key="m.value"
            class="flex cursor-pointer items-center gap-3 rounded-field bg-field p-4 has-checked:bg-accent-soft has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent-ink"
            :class="errors.joinMode ? 'ring-2 ring-orange ring-inset' : ''"
          >
            <input
              v-model="form.joinMode"
              type="radio"
              name="join-mode"
              :value="m.value"
              :aria-invalid="errors.joinMode ? 'true' : undefined"
              class="size-5 flex-none accent-ink"
            />
            <span class="flex flex-col">
              <b>{{ m.title }}</b>
              <span class="text-sm text-ink-2">{{ m.text }}</span>
            </span>
          </label>
          <p
            v-if="errors.joinMode"
            id="join-err"
            class="ml-1 text-sm font-semibold text-orange-ink"
            role="alert"
          >
            ✕ {{ errors.joinMode }}
          </p>
        </fieldset>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UiSelect v-model="form.level" label="Уровень" :options="levels" placeholder="Любой" />
          <UiTextField
            v-model="form.capacity"
            type="number"
            label="Сколько мест"
            placeholder="Без ограничения"
            :error="errors.capacity"
          />
        </div>
        <UiTextField
          v-model="form.equipment"
          label="Что взять с собой"
          placeholder="Своя ракетка"
          :error="errors.equipment"
        />
        <UiTextField
          v-model="form.requirements"
          label="Требования"
          placeholder="С 16 лет"
          :error="errors.requirements"
        />
      </div>

      <p
        v-if="formError"
        role="alert"
        class="rounded-card bg-orange p-4 font-semibold text-orange-ink"
      >
        ✕ {{ formError }}
      </p>

      <div class="flex flex-col gap-2">
        <UiButton type="submit" :loading="submitting">Опубликовать</UiButton>
      </div>
    </form>
  </section>
</template>
