<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { eventsApi, sportsApi, type EventSummary } from '@/api'
import EventListCard from '@/components/events/EventListCard.vue'
import NearbyMap from '@/components/map/NearbyMap.vue'
import { UiButton, UiChip, UiSelect, plural, type UiOption } from '@/components/ui'
import { geocode } from '@/features/map/geocode'
import { DEFAULT_CENTER, type LngLat, type MapPoint } from '@/features/map/geo'
import { mapKey } from '@/features/map/mapgl'
import { formatDistance, visibleNearby, type Bounds } from '@/features/map/nearby'
import { useEventCoords } from '@/features/map/useEventCoords'
import { useSessionStore } from '@/stores/session'
import { localDate, quickDateRange, type QuickDate } from '@/utils/datetime'

const session = useSessionStore()
const hasMap = !!mapKey()

const events = ref<EventSummary[]>([])
const state = ref<'loading' | 'ready' | 'error'>('loading')
const sport = ref('')
const when = ref<QuickDate | null>(null)
const sportOptions = ref<UiOption[]>([])

const center = ref<LngLat>(DEFAULT_CENTER)
const me = ref<LngLat | null>(null)
const locating = ref(false)
const locateNotice = ref('')
const bounds = ref<Bounds | null>(null)
const selectedId = ref<number | null>(null)

const QUICK: { kind: QuickDate; label: string }[] = [
  { kind: 'today', label: 'Сегодня' },
  { kind: 'tomorrow', label: 'Завтра' },
  { kind: 'weekend', label: 'На выходных' },
]

async function load() {
  state.value = 'loading'
  const now = new Date()
  const range = when.value
    ? quickDateRange(when.value, now)
    : {
        from: localDate(now),
        to: localDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30)),
      }
  try {
    const page = await eventsApi.list({
      sport: sport.value ? Number(sport.value) : undefined,
      date_from: range.from,
      date_to: range.to,
      size: 100,
    })
    events.value = page.items
    state.value = 'ready'
  } catch {
    state.value = 'error'
  }
}

watch([sport, when], load)

// В списке мероприятий у бэка нет координат — берём из карточек (useEventCoords кэширует).
const { coords, loading: coordsLoading } = useEventCoords(events, ref(hasMap))

const points = computed<MapPoint[]>(() =>
  events.value.flatMap((e) => {
    const c = coords.value.get(e.id)
    return c ? [{ id: e.id, title: e.title, coordinates: c }] : []
  }),
)

const visible = computed(() => {
  const byId = new Map(events.value.map((e) => [e.id, e]))
  return visibleNearby(points.value, bounds.value, me.value ?? center.value).flatMap((p) => {
    const event = byId.get(p.id)
    return event ? [{ event, distance: p.distance }] : []
  })
})

function locate() {
  locateNotice.value = ''
  if (!navigator.geolocation) {
    locateNotice.value = 'Браузер не умеет определять место — показываем ваш город'
    return
  }
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      me.value = [pos.coords.longitude, pos.coords.latitude]
      center.value = me.value
      locating.value = false
    },
    () => {
      locating.value = false
      locateNotice.value = 'Не получилось узнать, где вы, — показываем ваш город'
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
  )
}

function select(id: number) {
  selectedId.value = id
  document.getElementById(`nearby-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

onMounted(async () => {
  load()
  sportsApi
    .list()
    .then((s) => (sportOptions.value = s.map((x) => ({ value: String(x.id), label: x.name }))))
    .catch(() => {})
  // Пока человек не разрешил геолокацию — центр по городу из профиля.
  const city = session.user?.city?.trim()
  if (hasMap && city) {
    const found = await geocode(city, '').catch(() => null)
    if (found && !me.value) center.value = [found.lng, found.lat]
  }
})
</script>

<template>
  <section class="flex flex-col gap-4">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">Рядом со мной</h1>
        <p v-if="hasMap && state === 'ready'" class="text-ink-2" role="status">
          На карте {{ visible.length }}
          {{ plural(visible.length, ['мероприятие', 'мероприятия', 'мероприятий']) }}
        </p>
      </div>
      <RouterLink
        :to="{ name: 'events' }"
        class="inline-flex min-h-8 items-center font-semibold underline underline-offset-4"
      >
        Все мероприятия списком
      </RouterLink>
    </header>

    <p v-if="!hasMap" class="rounded-card bg-card p-6 text-ink-2">
      Карта не подключена в этой сборке. Мероприятия доступны
      <RouterLink :to="{ name: 'events' }" class="font-semibold text-ink underline"
        >списком</RouterLink
      >.
    </p>

    <template v-else>
      <div class="flex flex-col gap-3 rounded-card bg-card p-4 md:flex-row md:items-end">
        <UiSelect
          v-model="sport"
          label="Направление"
          hide-label
          :options="sportOptions"
          placeholder="Все направления"
          class="md:w-64"
        />
        <div class="flex flex-wrap items-center gap-2 md:flex-1">
          <div class="flex gap-2 overflow-x-auto" role="group" aria-label="Когда">
            <UiChip
              v-for="q in QUICK"
              :key="q.kind"
              :pressed="when === q.kind"
              class="shrink-0"
              @click="when = when === q.kind ? null : q.kind"
            >
              {{ q.label }}
            </UiChip>
          </div>
          <UiButton
            variant="ghost"
            class="!w-auto shrink-0 md:ml-auto"
            :loading="locating"
            @click="locate"
          >
            ◎ Где я
          </UiButton>
        </div>
      </div>
      <p v-if="locateNotice" class="text-sm text-ink-2" role="status">{{ locateNotice }}</p>

      <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <NearbyMap
          class="h-[55vh] min-h-72 xl:h-[calc(100vh-15rem)]"
          :points="points"
          :center="center"
          :me="me"
          :selected-id="selectedId"
          @select="select"
          @bounds="bounds = $event"
        />

        <div
          class="flex min-w-0 flex-col gap-3 xl:h-[calc(100vh-15rem)] xl:overflow-y-auto xl:pr-1"
          aria-live="polite"
        >
          <h2 class="sr-only">Мероприятия на карте</h2>
          <div v-if="state === 'loading' || coordsLoading" class="flex flex-col gap-3">
            <div v-for="i in 3" :key="i" class="h-24 animate-pulse rounded-card bg-card" />
          </div>
          <div
            v-else-if="state === 'error'"
            class="flex flex-col items-start gap-2 rounded-card bg-card p-4"
            role="alert"
          >
            <p class="font-semibold">Не получилось загрузить мероприятия.</p>
            <UiButton variant="ghost" class="!w-auto" @click="load">Повторить</UiButton>
          </div>
          <p v-else-if="!visible.length" class="rounded-card bg-card p-4 text-ink-2">
            В этой части карты мероприятий нет — отдалите карту или смените фильтры.
          </p>
          <ul v-else class="flex flex-col gap-3">
            <li
              v-for="{ event, distance } in visible"
              :id="`nearby-${event.id}`"
              :key="event.id"
              class="flex min-w-0 scroll-mt-4 flex-col gap-1 rounded-card"
              :class="selectedId === event.id ? 'outline-3 outline-accent-strong' : ''"
            >
              <EventListCard :event="event" />
              <p class="px-3 text-sm font-semibold text-ink-2">
                {{ formatDistance(distance) }} {{ me ? 'от вас' : 'от центра города' }}
              </p>
            </li>
          </ul>
        </div>
      </div>
    </template>
  </section>
</template>
