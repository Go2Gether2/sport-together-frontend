<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { sportsApi, type EventFilters, type JoinMode, type Level } from '@/api'
import EventListCard from '@/components/events/EventListCard.vue'
import { UiButton, UiChip, UiSelect, UiTextField, plural, type UiOption } from '@/components/ui'
import {
  JOIN_MODE_LABELS,
  LEVEL_LABELS,
  activeQuickDate,
  countFilters,
  filtersFromQuery,
  filtersToQuery,
} from '@/features/events/filters'
import { useEventList } from '@/features/events/useEventList'
import { quickDateRange, type QuickDate } from '@/utils/datetime'

const route = useRoute()
const router = useRouter()

const filters = computed(() => filtersFromQuery(route.query))
const { items, total, state, error, loadingMore, load, loadMore } = useEventList(filters)

const sportOptions = ref<UiOption[]>([])
const levelOptions: UiOption[] = (Object.keys(LEVEL_LABELS) as Level[]).map((value) => ({
  value,
  label: LEVEL_LABELS[value],
}))
const QUICK: { kind: QuickDate; label: string }[] = [
  { kind: 'today', label: 'Сегодня' },
  { kind: 'tomorrow', label: 'Завтра' },
  { kind: 'weekend', label: 'На выходных' },
]

function update(patch: Partial<EventFilters>) {
  const next = { ...filters.value, ...patch, page: undefined }
  router.replace({ query: filtersToQuery(next) })
}

const search = ref(filters.value.q ?? '')
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => update({ q: value.trim() || undefined }), 350)
})
watch(
  () => filters.value.q,
  (q) => {
    if ((q ?? '') !== search.value.trim()) search.value = q ?? ''
  },
)

const sport = computed({
  get: () => (filters.value.sport ? String(filters.value.sport) : ''),
  set: (value: string) => update({ sport: value ? Number(value) : undefined }),
})
const level = computed({
  get: () => filters.value.level ?? '',
  set: (value: string) => update({ level: (value || undefined) as Level | undefined }),
})

const quick = computed(() => activeQuickDate(filters.value))
function toggleQuick(kind: QuickDate) {
  if (quick.value === kind) update({ date_from: undefined, date_to: undefined })
  else {
    const range = quickDateRange(kind)
    update({ date_from: range.from, date_to: range.to })
  }
}

function setJoinMode(mode: JoinMode | undefined) {
  update({ join_mode: mode })
}

const hasFilters = computed(() => countFilters(filters.value) > 0 || !!filters.value.q)
function reset() {
  search.value = ''
  router.replace({ query: {} })
}

const foundText = computed(
  () =>
    `Найдено ${total.value} ${plural(total.value, ['мероприятие', 'мероприятия', 'мероприятий'])}`,
)

watch(() => route.query, load, { immediate: true, deep: true })

onMounted(async () => {
  try {
    const sports = await sportsApi.list()
    sportOptions.value = sports.map((s) => ({ value: String(s.id), label: s.name }))
  } catch {
    sportOptions.value = []
  }
})
</script>

<template>
  <section class="flex flex-col gap-5">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="font-display text-2xl font-bold">Мероприятия</h1>
        <p v-if="state === 'ready'" class="text-ink-2" role="status">{{ foundText }}</p>
      </div>
      <RouterLink
        :to="{ name: 'event-create' }"
        class="hidden rounded-full px-4 py-1.5 font-bold text-ink no-underline hover:bg-accent-soft md:inline-block"
      >
        + Создать своё
      </RouterLink>
    </header>

    <div
      class="flex flex-col gap-4 lg:rounded-card lg:bg-card lg:p-5"
      role="search"
      aria-label="Поиск мероприятий"
    >
      <UiTextField
        v-model="search"
        label="Поиск"
        hide-label
        type="search"
        placeholder="Футбол, йога, шахматы…"
      />

      <fieldset class="flex flex-col gap-2">
        <legend class="mb-2 font-medium">Когда</legend>
        <div class="flex flex-wrap gap-2">
          <UiChip
            v-for="item in QUICK"
            :key="item.kind"
            :pressed="quick === item.kind"
            @click="toggleQuick(item.kind)"
          >
            {{ item.label }}
          </UiChip>
        </div>
      </fieldset>

      <div class="grid gap-4 sm:grid-cols-2">
        <UiSelect
          v-model="sport"
          label="Направление"
          :options="sportOptions"
          placeholder="Все направления"
        />
        <UiSelect
          v-model="level"
          label="Уровень"
          :options="levelOptions"
          placeholder="Любой уровень"
        />
      </div>

      <fieldset class="flex flex-col gap-2">
        <legend class="mb-2 font-medium">Запись</legend>
        <div class="flex flex-wrap gap-2">
          <UiChip :pressed="!filters.join_mode" @click="setJoinMode(undefined)">Любая</UiChip>
          <UiChip
            v-for="mode in ['open', 'approval'] as const"
            :key="mode"
            :pressed="filters.join_mode === mode"
            @click="setJoinMode(mode)"
          >
            {{ JOIN_MODE_LABELS[mode] }}
          </UiChip>
        </div>
      </fieldset>

      <button
        v-if="hasFilters"
        type="button"
        class="w-fit font-medium text-ink underline underline-offset-4 hover:text-accent-ink"
        @click="reset"
      >
        Сбросить фильтры
      </button>
    </div>

    <div aria-live="polite" :aria-busy="state === 'loading'">
      <ul
        v-if="state === 'loading'"
        class="grid grid-cols-1 gap-4 md:grid-cols-2"
        aria-label="Загрузка"
      >
        <li v-for="n in 4" :key="n" class="h-44 animate-pulse rounded-card bg-card" />
      </ul>

      <div
        v-else-if="state === 'error'"
        class="flex flex-col items-center gap-3 rounded-card p-6 text-center"
        role="alert"
      >
        <p class="text-lg font-bold">Не получилось загрузить мероприятия</p>
        <p class="text-ink-2">{{ error }}</p>
        <UiButton variant="ghost" class="!w-auto" @click="load">Повторить</UiButton>
      </div>

      <div
        v-else-if="items.length === 0"
        class="flex flex-col items-center gap-3 rounded-card bg-card p-6 text-center"
      >
        <p class="font-hand text-2xl text-accent-ink">пока пусто</p>
        <p class="text-lg font-bold">Пока никто не собирается</p>
        <p class="max-w-md text-ink-2">
          По этим условиям мероприятий нет. Создайте своё — к нему смогут присоединиться другие.
        </p>
        <div class="flex flex-wrap justify-center gap-3">
          <RouterLink
            :to="{ name: 'event-create' }"
            class="rounded-full bg-ink px-5 py-2.5 font-bold text-white no-underline"
          >
            + Создать мероприятие
          </RouterLink>
          <button
            v-if="hasFilters"
            type="button"
            class="rounded-full px-5 py-2.5 font-bold"
            @click="reset"
          >
            Сбросить фильтры
          </button>
        </div>
      </div>

      <template v-else>
        <ul class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <li v-for="event in items" :key="event.id">
            <EventListCard :event="event" />
          </li>
        </ul>
        <div v-if="items.length < total" class="mt-5 flex flex-col items-center gap-2">
          <UiButton variant="ghost" class="!w-auto" :loading="loadingMore" @click="loadMore">
            Показать ещё
          </UiButton>
          <p v-if="error" class="text-accent-ink" role="alert">✕ {{ error }}</p>
        </div>
      </template>
    </div>
  </section>
</template>
