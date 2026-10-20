<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ApiError, eventsApi, sportsApi, usersApi, type Sport } from '@/api'
import EventListCard from '@/components/events/EventListCard.vue'
import AppLogo from '@/components/layout/AppLogo.vue'
import SportIcon, { type SportIconName } from '@/components/illustrations/SportIcon.vue'
import { UiAvatar, UiButton, UiChip, UiTextField, plural } from '@/components/ui'
import { recommend, type Recommendation } from '@/features/events/recommendations'
import { LEVEL_LABELS } from '@/features/events/filters'
import {
  AGE_PRESETS,
  MAX_SPORTS,
  STEPS,
  TIME_SLOTS,
  agePresetOf,
  answersFrom,
  loadLocalPrefs,
  saveLocalPrefs,
  toLocalPrefs,
  toProfileUpdate,
  toggleSport,
  validateAbout,
  validateAge,
  type OnboardingErrors,
  type TimeSlot,
} from '@/features/onboarding/onboarding'
import { AVATAR_PRESETS, presetAvatarUrl } from '@/features/profile/avatar'
import { safeRedirect } from '@/router/redirect'
import { useSessionStore } from '@/stores/session'
import { localDate } from '@/utils/datetime'
import type { Level } from '@/api'

const session = useSessionStore()
const route = useRoute()
const router = useRouter()

// Шаг живёт в адресе: перезагрузка страницы не сбрасывает человека на начало.
const step = computed<number | 'done'>(() => {
  if (route.query.step === 'done') return 'done'
  const n = Number(route.query.step)
  return Number.isInteger(n) && n >= 1 && n <= STEPS ? n : 1
})

const user = session.user!
const answers = ref(answersFrom(user, loadLocalPrefs(user.id)))
const errors = ref<OnboardingErrors>({})
const saving = ref(false)
const saveError = ref('')
const heading = ref<HTMLElement | null>(null)

const sports = ref<Sport[]>([])
const sportQuery = ref('')
const levels = Object.entries(LEVEL_LABELS) as [Level, string][]

const STEP_ART: { phrase: string; icon: SportIconName; bg: string }[] = [
  { phrase: 'лицо команды — это вы', icon: 'custom', bg: 'bg-accent-soft' },
  { phrase: 'бегать вдвоём — уже компания', icon: 'running', bg: 'bg-accent' },
  { phrase: 'у каждого свой темп — и своя компания', icon: 'tennis', bg: 'bg-lilac' },
  { phrase: 'лучшая тренировка — та, до которой близко', icon: 'bike', bg: 'bg-orange' },
  { phrase: 'в своей компании и тренироваться веселее', icon: 'football', bg: 'bg-accent-soft' },
]
const art = computed(() => STEP_ART[(step.value === 'done' ? 1 : step.value) - 1]!)

function go(next: number | 'done') {
  saveLocalPrefs(user.id, toLocalPrefs(answers.value))
  router.replace({ query: { ...route.query, step: String(next) } })
}

watch(step, async () => {
  errors.value = {}
  await nextTick()
  heading.value?.focus()
  window.scrollTo({ top: 0 })
})

function next() {
  if (step.value === 2) {
    errors.value = validateAbout(answers.value)
    if (Object.keys(errors.value).length) return
  }
  if (step.value === STEPS) return finish()
  go((step.value as number) + 1)
}

function back() {
  if (typeof step.value === 'number' && step.value > 1) go(step.value - 1)
}

/** Сохранить ответы: в профиль — то, что есть в API, остальное — в этом браузере. */
async function finish() {
  errors.value = { ...validateAbout(answers.value), ...validateAge(answers.value) }
  if (errors.value.name || errors.value.birthYear) return go(2)
  if (Object.keys(errors.value).length) return
  saving.value = true
  saveError.value = ''
  try {
    await usersApi.updateMe(toProfileUpdate(answers.value))
    await session.refresh()
    go('done')
  } catch (e) {
    saveError.value =
      e instanceof ApiError ? e.message : 'Не получилось сохранить. Попробуйте ещё раз.'
  } finally {
    saving.value = false
  }
}

const filteredSports = computed(() => {
  const q = sportQuery.value.trim().toLowerCase()
  return q ? sports.value.filter((s) => s.name.toLowerCase().includes(q)) : sports.value
})
const chosenSports = computed(() => sports.value.filter((s) => s.id in answers.value.sports))
const chosenCount = computed(() => Object.keys(answers.value.sports).length)

function toggleTime(id: TimeSlot) {
  const t = answers.value.times
  answers.value.times = t.includes(id) ? t.filter((x) => x !== id) : [...t, id]
}
const agePreset = computed(() => agePresetOf(answers.value))
function setAgePreset(id: string) {
  const p = AGE_PRESETS.find((x) => x.id === id)!
  answers.value.ageFrom = p.from
  answers.value.ageTo = p.to
}

// Итог: та же подборка, что «Для вас», с учётом уровней по видам и удобного времени.
const picked = ref<Recommendation[]>([])
const pickedState = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
async function loadPicked() {
  pickedState.value = 'loading'
  const now = new Date()
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30)
  try {
    const [page, mine] = await Promise.all([
      eventsApi.list({ date_from: localDate(now), date_to: localDate(to), size: 100 }),
      usersApi.myParticipations(),
    ])
    const u = session.user ?? user
    picked.value = recommend(
      page.items,
      {
        userId: u.id,
        sportIds: u.sport_ids,
        level: u.level ?? null,
        city: u.city ?? null,
        organizationIds: session.organizations.map((o) => o.id),
        sportLevels: answers.value.sports,
        times: answers.value.times,
      },
      mine,
    )
    pickedState.value = 'ready'
  } catch {
    pickedState.value = 'error'
  }
}
watch(
  step,
  (s) => {
    if (s === 'done') loadPicked()
  },
  { immediate: true },
)
const pickedTitle = computed(() => {
  const n = picked.value.length
  return `${n} ${plural(n, ['событие', 'события', 'событий'])}`
})
const afterwards = computed(() => safeRedirect(route.query.redirect))

onMounted(async () => {
  try {
    sports.value = await sportsApi.list()
  } catch {
    sports.value = []
  }
})
</script>

<template>
  <!-- Онбординг перекрывает меню приложения: на эти минуты человеку нужен только он. -->
  <div class="fixed inset-0 z-50 overflow-y-auto bg-page">
    <div class="mx-auto flex min-h-full max-w-6xl flex-col gap-4 p-4">
      <header
        class="flex flex-wrap items-center justify-between gap-x-2 gap-y-3 rounded-card bg-card p-3"
      >
        <AppLogo />
        <div
          v-if="step !== 'done'"
          class="order-last flex w-full min-w-0 items-center gap-3 md:order-none md:w-auto md:max-w-md md:flex-[1_1_220px]"
        >
          <span class="text-sm font-semibold whitespace-nowrap text-ink-2">
            Шаг {{ step }} из {{ STEPS }}
          </span>
          <div
            class="flex flex-1 gap-1.5"
            role="progressbar"
            :aria-valuemin="1"
            :aria-valuemax="STEPS"
            :aria-valuenow="step"
            :aria-label="`Шаг ${step} из ${STEPS}`"
          >
            <span
              v-for="i in STEPS"
              :key="i"
              class="h-2 flex-1 rounded-full"
              :class="i <= (step as number) ? 'bg-ink' : 'bg-mute'"
            />
          </div>
        </div>
        <div class="flex items-center gap-1">
          <template v-if="step !== 'done'">
            <button
              type="button"
              class="inline-flex min-h-11 items-center rounded-full px-2.5 text-[15px] font-semibold text-ink-2 hover:text-ink"
              @click="step === STEPS ? finish() : go((step as number) + 1)"
            >
              Пропустить
            </button>
            <button
              type="button"
              aria-label="Закончить настройку сейчас"
              class="grid size-11 place-items-center rounded-full bg-field hover:bg-mute"
              @click="finish"
            >
              ✕
            </button>
          </template>
          <button
            v-else
            type="button"
            class="inline-flex min-h-11 items-center rounded-full px-4 font-semibold underline underline-offset-4"
            @click="go(1)"
          >
            Настроить подбор
          </button>
        </div>
      </header>

      <div class="flex flex-1 flex-col gap-4 lg:flex-row">
        <section
          class="relative flex min-w-0 flex-col justify-between gap-4 overflow-hidden rounded-[32px] p-4 lg:flex-[1_1_400px] lg:p-8"
          :class="art.bg"
          aria-hidden="true"
        >
          <p
            class="max-w-xs -rotate-3 self-start rounded-xl bg-card px-3.5 py-1 font-hand text-2xl leading-tight font-bold text-ink"
          >
            {{ step === 'done' ? 'готово, ' + answers.name + '!' : art.phrase }}
          </p>
          <span class="hidden self-end lg:block">
            <SportIcon :name="art.icon" :size="180" />
          </span>
        </section>

        <section
          class="flex min-w-0 flex-col gap-5 rounded-[32px] bg-card p-6 lg:flex-[1.25_1_480px] lg:p-9"
          :aria-labelledby="`onb-title`"
        >
          <!-- 1. Фото -->
          <template v-if="step === 1">
            <div class="flex flex-col gap-2">
              <h1
                id="onb-title"
                ref="heading"
                tabindex="-1"
                class="text-3xl font-bold outline-none lg:text-4xl"
              >
                Добавьте фото
              </h1>
              <p class="text-lg text-ink-2">
                Так организатор и компания узнают вас при встрече. Можно пропустить — поставим
                аватар за вас.
              </p>
            </div>
            <div class="flex items-center gap-4">
              <UiAvatar :name="answers.name" :url="answers.avatar" size="xl" />
              <p class="text-sm text-ink-2">
                Загрузка своего фото появится позже — пока выберите рисунок.
              </p>
            </div>
            <fieldset class="flex flex-col gap-2">
              <legend class="mb-2 font-bold">Выберите аватар</legend>
              <div class="flex flex-wrap gap-3">
                <label
                  v-for="p in AVATAR_PRESETS"
                  :key="p.id"
                  class="cursor-pointer rounded-full p-1 has-checked:ring-3 has-checked:ring-ink has-focus-visible:outline-3 has-focus-visible:outline-accent-strong"
                >
                  <input
                    v-model="answers.avatar"
                    type="radio"
                    name="avatar"
                    :value="presetAvatarUrl(p.id)"
                    class="sr-only"
                  />
                  <span class="sr-only">{{ p.label }}</span>
                  <span class="grid size-16 place-items-center rounded-full" :class="p.bg">
                    <SportIcon :name="p.id" :size="44" />
                  </span>
                </label>
              </div>
            </fieldset>
          </template>

          <!-- 2. О себе -->
          <template v-else-if="step === 2">
            <div class="flex flex-col gap-2">
              <h1
                id="onb-title"
                ref="heading"
                tabindex="-1"
                class="text-3xl font-bold outline-none lg:text-4xl"
              >
                Расскажите о себе
              </h1>
              <p class="text-lg text-ink-2">Пара деталей — и подбор станет точнее.</p>
            </div>
            <div class="flex max-w-xl flex-col gap-4">
              <UiTextField v-model="answers.name" label="Имя" required :error="errors.name" />
              <UiTextField
                v-model="answers.birthYear"
                label="Год рождения · необязательно"
                type="number"
                placeholder="Например, 1996"
                hint="Нужен, чтобы подбирать компанию близкого возраста. Другие его не видят."
                :error="errors.birthYear"
              />
              <UiTextField
                v-model="answers.city"
                label="Город или район · необязательно"
                placeholder="Красноярск"
                hint="Точный адрес не нужен — по городу покажем, что рядом."
              />
            </div>
          </template>

          <!-- 3. Интересы -->
          <template v-else-if="step === 3">
            <div class="flex flex-col gap-2">
              <h1
                id="onb-title"
                ref="heading"
                tabindex="-1"
                class="text-3xl font-bold outline-none lg:text-4xl"
              >
                Чем любите заниматься?
              </h1>
              <p class="text-lg text-ink-2">
                Выберите до {{ MAX_SPORTS }} видов и для каждого — уровень. Эти занятия покажем в
                ленте первыми.
              </p>
            </div>
            <UiTextField
              v-model="sportQuery"
              label="Найти вид спорта"
              hide-label
              type="search"
              placeholder="Найти вид спорта"
            />
            <div class="flex flex-wrap gap-2" role="group" aria-label="Виды спорта">
              <UiChip
                v-for="s in filteredSports"
                :key="s.id"
                :pressed="s.id in answers.sports"
                :disabled="!(s.id in answers.sports) && chosenCount >= MAX_SPORTS"
                @click="answers.sports = toggleSport(answers.sports, s.id)"
              >
                {{ s.name }}
              </UiChip>
            </div>
            <div v-if="chosenSports.length" class="flex flex-col gap-3 rounded-field bg-field p-4">
              <div class="flex items-baseline justify-between gap-2">
                <h2 class="font-bold">Ваш уровень</h2>
                <span class="text-sm text-ink-2"
                  >Выбрано {{ chosenCount }} из {{ MAX_SPORTS }}</span
                >
              </div>
              <div
                v-for="s in chosenSports"
                :key="s.id"
                class="flex flex-wrap items-center gap-2"
                role="group"
                :aria-label="`Уровень: ${s.name}`"
              >
                <span class="w-full font-semibold">{{ s.name }}</span>
                <UiChip
                  v-for="[lv, label] in levels"
                  :key="lv"
                  :pressed="answers.sports[s.id] === lv"
                  @click="answers.sports = { ...answers.sports, [s.id]: lv }"
                >
                  {{ label }}
                </UiChip>
              </div>
            </div>
          </template>

          <!-- 4. Где и когда -->
          <template v-else-if="step === 4">
            <div class="flex flex-col gap-2">
              <h1
                id="onb-title"
                ref="heading"
                tabindex="-1"
                class="text-3xl font-bold outline-none lg:text-4xl"
              >
                Где и когда удобно?
              </h1>
              <p class="text-lg text-ink-2">Покажем занятия поблизости и в ваше свободное время.</p>
            </div>
            <div class="flex flex-col gap-2">
              <label for="onb-radius" class="flex items-baseline justify-between font-bold">
                Насколько далеко готовы ехать
                <span class="text-xl">{{ answers.radiusKm }} км</span>
              </label>
              <input
                id="onb-radius"
                v-model.number="answers.radiusKm"
                type="range"
                min="1"
                max="50"
                class="w-full accent-ink"
              />
              <div class="flex justify-between text-sm text-ink-2">
                <span>1 км</span><span>Считаем от вашего города</span><span>50 км</span>
              </div>
            </div>
            <fieldset class="flex flex-col gap-2">
              <legend class="mb-2 font-bold">Когда удобно</legend>
              <div class="grid gap-2 sm:grid-cols-2">
                <button
                  v-for="t in TIME_SLOTS"
                  :key="t.id"
                  type="button"
                  class="flex min-h-16 flex-col items-start justify-center rounded-field px-4 py-2 text-left"
                  :class="
                    answers.times.includes(t.id) ? 'bg-ink text-white' : 'bg-field hover:bg-mute'
                  "
                  :aria-pressed="answers.times.includes(t.id)"
                  @click="toggleTime(t.id)"
                >
                  <b>{{ t.label }}</b>
                  <span class="text-sm opacity-80">{{ t.hint }}</span>
                </button>
              </div>
              <p class="text-sm text-ink-2">Можно выбрать несколько вариантов.</p>
            </fieldset>
          </template>

          <!-- 5. С кем комфортно -->
          <template v-else-if="step === 5">
            <div class="flex flex-col gap-2">
              <h1
                id="onb-title"
                ref="heading"
                tabindex="-1"
                class="text-3xl font-bold outline-none lg:text-4xl"
              >
                С кем комфортно?
              </h1>
              <p class="text-lg text-ink-2">
                Подскажите, с кем по возрасту вам проще найти общий язык. Если не важно — просто
                нажмите «Готово».
              </p>
            </div>
            <fieldset class="flex flex-col gap-3">
              <legend class="mb-2 font-bold">Возраст компании · необязательно</legend>
              <div class="flex flex-wrap gap-2">
                <UiChip
                  v-for="p in AGE_PRESETS"
                  :key="p.id"
                  :pressed="agePreset === p.id"
                  @click="setAgePreset(p.id)"
                >
                  {{ p.label }}
                </UiChip>
              </div>
              <div class="grid max-w-sm grid-cols-2 gap-3">
                <UiTextField
                  v-model="answers.ageFrom"
                  label="От, лет"
                  type="number"
                  :error="errors.ageFrom"
                />
                <UiTextField
                  v-model="answers.ageTo"
                  label="До, лет"
                  type="number"
                  :error="errors.ageTo"
                />
              </div>
              <p class="text-sm text-ink-2">
                От 10 до 99 лет. Это пожелание — остальные мероприятия тоже останутся в ленте.
              </p>
            </fieldset>
          </template>

          <!-- Итог -->
          <template v-else>
            <div class="flex flex-col gap-2">
              <h1
                id="onb-title"
                ref="heading"
                tabindex="-1"
                class="text-3xl font-bold outline-none lg:text-4xl"
              >
                Подобрали
                <span v-if="pickedState === 'ready'" class="text-accent-strong">{{
                  pickedTitle
                }}</span>
                для вас
              </h1>
              <p class="text-lg text-ink-2">
                Это ваша лента «Для вас». На каждой карточке — почему мы предложили это мероприятие.
              </p>
            </div>
            <div v-if="pickedState === 'loading'" class="flex flex-col gap-3">
              <div v-for="i in 3" :key="i" class="h-24 animate-pulse rounded-card bg-field" />
            </div>
            <p v-else-if="pickedState === 'error'" class="rounded-field bg-field p-4" role="alert">
              Не получилось подобрать мероприятия — они ждут вас в ленте.
            </p>
            <p v-else-if="!picked.length" class="rounded-field bg-field p-4 text-ink-2">
              В ближайший месяц подходящих мероприятий нет — загляните в ленту или создайте своё.
            </p>
            <ul v-else class="flex flex-col gap-3">
              <li
                v-for="{ event, reasons } in picked.slice(0, 3)"
                :key="event.id"
                class="flex min-w-0 flex-col gap-1.5"
              >
                <EventListCard :event="event" class="!bg-field" />
                <p v-if="reasons.length" class="flex flex-wrap gap-1.5 px-2 text-sm">
                  <span
                    v-for="r in reasons"
                    :key="r"
                    class="rounded-full bg-accent-soft px-2.5 py-0.5 font-semibold text-accent-ink"
                  >
                    {{ r }}
                  </span>
                </p>
              </li>
            </ul>
            <RouterLink
              :to="afterwards"
              class="mt-auto inline-flex min-h-13 items-center justify-center rounded-full bg-ink px-6 font-bold text-white no-underline"
            >
              Открыть ленту «Для вас» →
            </RouterLink>
          </template>

          <p v-if="saveError" class="font-semibold text-orange-ink" role="alert">
            ✕ {{ saveError }}
          </p>

          <div v-if="step !== 'done'" class="mt-auto flex items-center justify-between gap-3 pt-2">
            <UiButton v-if="step > 1" variant="ghost" class="!w-auto" @click="back">
              ← Назад
            </UiButton>
            <span v-else />
            <UiButton class="!w-auto !px-8" :loading="saving" @click="next">
              {{ step === STEPS ? 'Готово' : 'Далее →' }}
            </UiButton>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
