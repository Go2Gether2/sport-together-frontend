<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import {
  ApiError,
  adminApi,
  type AdminDashboard,
  type EventSummary,
  type ModerationLog,
} from '@/api'
import AdminNav from '@/components/admin/AdminNav.vue'
import StatBars from '@/components/admin/charts/StatBars.vue'
import StatDonut from '@/components/admin/charts/StatDonut.vue'
import WeekColumns from '@/components/admin/charts/WeekColumns.vue'
import { UiButton, UiCard } from '@/components/ui'
import { eventStatusSlices, eventsByWeek, moderationSlices, topBy } from '@/features/admin/stats'

// Разрезы считаем по последним мероприятиям и действиям: для прототипа этого хватает.
const SAMPLE = 200

const data = ref<AdminDashboard | null>(null)
const state = ref<'loading' | 'ready' | 'error'>('loading')
const message = ref('')

async function load() {
  state.value = 'loading'
  try {
    data.value = await adminApi.dashboard()
    state.value = 'ready'
  } catch (e) {
    message.value = e instanceof ApiError ? e.message : 'Не получилось загрузить сводку.'
    state.value = 'error'
  }
}

const events = ref<EventSummary[]>([])
const logs = ref<ModerationLog[]>([])
const chartsState = ref<'loading' | 'ready' | 'error'>('loading')

async function loadCharts() {
  chartsState.value = 'loading'
  try {
    const [e, l] = await Promise.all([
      adminApi.events({ size: SAMPLE }),
      adminApi.auditLog({ size: SAMPLE }),
    ])
    events.value = e.items.filter((x) => x.status !== 'deleted')
    logs.value = l.items
    chartsState.value = 'ready'
  } catch {
    chartsState.value = 'error'
  }
}

onMounted(() => {
  load()
  loadCharts()
})

const statuses = computed(() => (data.value ? eventStatusSlices(data.value) : []))
const sports = computed(() => topBy(events.value, (e) => e.sport?.name))
const cities = computed(() => topBy(events.value, (e) => e.city))
const weeks = computed(() => eventsByWeek(events.value, new Date()))
const moderation = computed(() => moderationSlices(logs.value))

interface Tile {
  label: string
  value: number
  bg: string
  to?: RouteLocationRaw
}

const tiles = computed<Tile[]>(() => {
  const d = data.value
  if (!d) return []
  return [
    {
      label: 'ждут допуска',
      value: d.pending_organizations,
      bg: d.pending_organizations ? 'bg-orange' : 'bg-card',
      to: { name: 'admin-organizations', query: { status: 'pending' } },
    },
    {
      label: 'организаций допущено',
      value: d.approved_organizations,
      bg: 'bg-card',
      to: { name: 'admin-organizations', query: { status: 'approved' } },
    },
    {
      label: 'опубликовано',
      value: d.published_events,
      bg: 'bg-accent',
      to: { name: 'admin-events' },
    },
    { label: 'снято с публикации', value: d.unpublished_events, bg: 'bg-card' },
    { label: 'удалено', value: d.deleted_events, bg: 'bg-card' },
    { label: 'скрыто сообщений', value: d.hidden_comments, bg: 'bg-card' },
    { label: 'пользователей', value: d.users, bg: 'bg-lilac' },
    { label: 'отменено организаторами', value: d.cancelled_events, bg: 'bg-card' },
  ]
})
</script>

<template>
  <section class="flex flex-col gap-5" aria-live="polite">
    <h1 class="text-3xl font-bold">Админка</h1>
    <AdminNav />

    <div v-if="state === 'loading'" class="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <div v-for="i in 8" :key="i" class="h-28 animate-pulse rounded-card bg-card" />
    </div>

    <div
      v-else-if="state === 'error'"
      class="flex flex-col items-center gap-3 rounded-card bg-card p-6"
      role="alert"
    >
      <p class="font-bold">{{ message }}</p>
      <UiButton variant="ghost" class="!w-auto" @click="load">Повторить</UiButton>
    </div>

    <ul v-else class="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <li v-for="t in tiles" :key="t.label">
        <component
          :is="t.to ? RouterLink : 'div'"
          :to="t.to"
          class="flex h-full flex-col gap-1 rounded-card p-5 text-ink no-underline"
          :class="[t.bg, t.to ? 'hover:brightness-95' : '']"
        >
          <b class="text-4xl font-bold tabular-nums">{{ t.value }}</b>
          <span class="font-medium">{{ t.label }}</span>
        </component>
      </li>
    </ul>

    <h2 class="mt-2 text-2xl font-bold">Статистика</h2>
    <div v-if="chartsState === 'loading'" class="grid gap-3 lg:grid-cols-2">
      <div v-for="i in 4" :key="i" class="h-56 animate-pulse rounded-card bg-card" />
    </div>
    <div
      v-else-if="chartsState === 'error'"
      class="flex flex-col items-center gap-3 rounded-card bg-card p-6"
      role="alert"
    >
      <p class="font-bold">Не получилось загрузить статистику.</p>
      <UiButton variant="ghost" class="!w-auto" @click="loadCharts">Повторить</UiButton>
    </div>
    <div v-else class="grid gap-3 lg:grid-cols-2">
      <UiCard as="section" class="gap-4 p-5 lg:col-span-2" aria-labelledby="st-weeks">
        <h3 id="st-weeks" class="text-lg font-bold">Мероприятия по неделям</h3>
        <WeekColumns :weeks="weeks" />
      </UiCard>
      <UiCard v-if="data" as="section" class="gap-4 p-5" aria-labelledby="st-status">
        <h3 id="st-status" class="text-lg font-bold">Мероприятия по статусам</h3>
        <StatDonut :items="statuses" caption="всего" />
      </UiCard>
      <UiCard as="section" class="gap-4 p-5" aria-labelledby="st-sports">
        <h3 id="st-sports" class="text-lg font-bold">Популярные виды спорта</h3>
        <StatBars v-if="sports.length" :items="sports" />
        <p v-else class="text-ink-2">Мероприятий пока нет.</p>
      </UiCard>
      <UiCard as="section" class="gap-4 p-5" aria-labelledby="st-cities">
        <h3 id="st-cities" class="text-lg font-bold">Города</h3>
        <StatBars v-if="cities.length" :items="cities" />
        <p v-else class="text-ink-2">Мероприятий пока нет.</p>
      </UiCard>
      <UiCard as="section" class="gap-4 p-5" aria-labelledby="st-moderation">
        <h3 id="st-moderation" class="text-lg font-bold">Решения модерации</h3>
        <StatBars v-if="moderation.length" :items="moderation" />
        <p v-else class="text-ink-2">Решений пока не было.</p>
      </UiCard>
    </div>
  </section>
</template>
