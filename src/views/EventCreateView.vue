<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError, eventsApi, sportsApi } from '@/api'
import { UiButton, UiCombobox, UiSelect, UiTextField, type UiOption } from '@/components/ui'
import UiTextArea from '@/components/ui/UiTextArea.vue'
import { LEVEL_LABELS } from '@/features/events/filters'
import { useSessionStore } from '@/stores/session'
import {
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
    text: 'Человек нажимает «Записаться» и сразу становится участником.',
  },
  {
    value: 'approval' as const,
    title: 'По заявке',
    text: 'Вы видите заявки и сами решаете, кого принять. Отказ — с причиной.',
  },
]

const organization = computed(() => session.approvedOrganizations[0] ?? null)
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
    <header>
      <p class="font-hand text-xl text-cobalt">соберите компанию</p>
      <h1 class="font-display text-2xl font-bold">Новое мероприятие</h1>
      <p class="mt-1 text-ink-2">
        Поля со звёздочкой обязательны. Остальное поможет людям решиться.
      </p>
    </header>

    <form class="flex flex-col gap-6" novalidate @submit.prevent="submit">
      <fieldset v-if="organization" class="flex flex-col gap-2">
        <legend class="mb-1.5 font-medium">От чьего имени</legend>
        <div class="grid grid-cols-2 overflow-hidden rounded-field border-2 border-ink">
          <label
            class="cursor-pointer px-3 py-2.5 text-center font-medium has-checked:bg-ink has-checked:text-paper has-focus-visible:outline-3 has-focus-visible:-outline-offset-4 has-focus-visible:outline-cobalt"
          >
            <input v-model="form.organizationId" type="radio" :value="null" class="sr-only" />
            От себя
          </label>
          <label
            class="cursor-pointer border-l-2 border-ink px-3 py-2.5 text-center font-medium has-checked:bg-ink has-checked:text-paper has-focus-visible:outline-3 has-focus-visible:-outline-offset-4 has-focus-visible:outline-cobalt"
          >
            <input
              v-model="form.organizationId"
              type="radio"
              :value="organization.id"
              class="sr-only"
            />
            {{ organization.name }}
          </label>
        </div>
      </fieldset>

      <div class="flex flex-col gap-4">
        <h2 class="font-display text-lg font-medium">Что и когда</h2>
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
          :hint="
            sportsFailed
              ? 'Не получилось загрузить список — впишите направление сами'
              : 'Нет в списке — впишите своё и выберите «Добавить»'
          "
          :error="errors.sport"
          @create="addSport"
        />
        <p v-if="isNewSport" class="-mt-2 text-sm text-cobalt">
          ✦ Новое направление появится в списке после публикации.
        </p>
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
          placeholder="Что будем делать, для кого подойдёт, как найти группу на месте"
          :error="errors.description"
        />
      </div>

      <div class="flex flex-col gap-4">
        <h2 class="font-display text-lg font-medium">Где</h2>
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

      <div class="flex flex-col gap-4">
        <h2 class="font-display text-lg font-medium">Кто и как записывается</h2>
        <fieldset
          class="flex flex-col gap-2"
          :aria-describedby="errors.joinMode ? 'join-err' : undefined"
        >
          <legend class="mb-1.5 font-medium">
            Как записываться<span aria-hidden="true" class="text-cobalt"> *</span>
          </legend>
          <label
            v-for="m in joinModes"
            :key="m.value"
            class="flex cursor-pointer gap-3 rounded-card border-2 bg-card p-3.5 has-checked:border-cobalt has-checked:bg-cobalt-tint has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-cobalt"
            :class="errors.joinMode ? 'border-dashed border-cobalt' : 'border-ink'"
          >
            <input
              v-model="form.joinMode"
              type="radio"
              name="join-mode"
              :value="m.value"
              :aria-invalid="errors.joinMode ? 'true' : undefined"
              class="mt-1 size-5 flex-none accent-cobalt"
            />
            <span class="flex flex-col">
              <b>{{ m.title }}</b>
              <span class="text-[15px] text-ink-2">{{ m.text }}</span>
            </span>
          </label>
          <p
            v-if="errors.joinMode"
            id="join-err"
            class="text-sm font-medium text-cobalt"
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
            hint="Оставьте пустым, если мест сколько угодно"
            :error="errors.capacity"
          />
        </div>
        <UiTextField
          v-model="form.equipment"
          label="Что взять с собой"
          placeholder="Своя ракетка, удобная обувь"
          :error="errors.equipment"
        />
        <UiTextField
          v-model="form.requirements"
          label="Требования к участникам"
          placeholder="С 16 лет, умеете держать ракетку"
          :error="errors.requirements"
        />
      </div>

      <p
        v-if="formError"
        role="alert"
        class="rounded-card border-2 border-dashed border-cobalt bg-card p-3.5 font-medium text-cobalt"
      >
        ✕ {{ formError }}
      </p>

      <div class="flex flex-col gap-2">
        <UiButton type="submit" variant="accent" sparks :loading="submitting">
          Опубликовать
        </UiButton>
        <p class="text-center text-sm text-ink-2">
          {{
            organization
              ? 'Организация допущена — публикуем сразу, без повторной проверки.'
              : 'Мероприятие появится в поиске сразу после публикации.'
          }}
        </p>
      </div>
    </form>
  </section>
</template>
