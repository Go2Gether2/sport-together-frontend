<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { eventsApi, usersApi, type EventSummary, type MyParticipation } from '@/api'
import EventListCard from '@/components/events/EventListCard.vue'
import { UiButton } from '@/components/ui'
import { popular, recommend } from '@/features/events/recommendations'
import { useSessionStore } from '@/stores/session'
import { localDate } from '@/utils/datetime'

const LIMIT = 4

const session = useSessionStore()
const events = ref<EventSummary[]>([])
const participations = ref<MyParticipation[]>([])
const state = ref<'loading' | 'ready' | 'error'>('loading')

const emptyProfile = computed(() => !session.user?.sport_ids.length)

const cards = computed(() => {
  const user = session.user
  if (!user) return []
  const profile = {
    userId: user.id,
    sportIds: user.sport_ids,
    level: user.level ?? null,
    city: user.city ?? null,
    organizationIds: session.organizations.map((o) => o.id),
  }
  if (emptyProfile.value)
    return popular(events.value, profile, participations.value)
      .slice(0, LIMIT)
      .map((event) => ({ event, reasons: [] as string[] }))
  return recommend(events.value, profile, participations.value).slice(0, LIMIT)
})

async function load() {
  state.value = 'loading'
  const now = new Date()
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30)
  try {
    const [page, mine] = await Promise.all([
      eventsApi.list({ date_from: localDate(now), date_to: localDate(to), size: 100 }),
      usersApi.myParticipations(),
    ])
    events.value = page.items
    participations.value = mine
    state.value = 'ready'
  } catch {
    state.value = 'error'
  }
}

onMounted(load)
</script>

<template>
  <section class="flex flex-col gap-3" aria-labelledby="for-you-title" aria-live="polite">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <h2 id="for-you-title" class="text-2xl font-bold">
        {{ emptyProfile ? $t('forYou.popular') : $t('forYou.title') }}
      </h2>
      <RouterLink
        :to="{ name: 'events' }"
        class="inline-flex min-h-8 items-center font-semibold underline underline-offset-4"
      >
        {{ $t('forYou.all') }}
      </RouterLink>
    </div>

    <RouterLink
      v-if="emptyProfile"
      :to="{ name: 'profile' }"
      class="flex items-center justify-between gap-3 rounded-card bg-lilac p-4 font-semibold text-ink no-underline"
    >
      {{ $t('forYou.fillProfile') }}
      <span aria-hidden="true">→</span>
    </RouterLink>

    <ul
      v-if="state === 'loading'"
      class="grid gap-3 md:grid-cols-2"
      :aria-label="$t('common.loading')"
    >
      <li v-for="i in 2" :key="i" class="h-28 animate-pulse rounded-card bg-card" />
    </ul>
    <div
      v-else-if="state === 'error'"
      class="flex flex-col items-start gap-2 rounded-card bg-card p-4"
      role="alert"
    >
      <p class="font-semibold">{{ $t('forYou.error') }}</p>
      <UiButton variant="ghost" class="!w-auto" @click="load">{{ $t('common.retry') }}</UiButton>
    </div>
    <p v-else-if="!cards.length" class="rounded-card bg-card p-4 text-ink-2">
      {{ $t('forYou.empty') }}
      <RouterLink
        :to="{ name: 'event-create' }"
        class="font-semibold text-ink underline underline-offset-4"
      >
        {{ $t('forYou.create') }}</RouterLink
      >.
    </p>
    <ul v-else class="grid gap-3 md:grid-cols-2">
      <li v-for="{ event, reasons } in cards" :key="event.id" class="flex min-w-0 flex-col gap-1.5">
        <EventListCard :event="event" />
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
  </section>
</template>
