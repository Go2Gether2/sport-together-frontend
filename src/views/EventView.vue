<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ApiError, eventsApi, type EventDetails } from '@/api'
import EventComments from '@/components/comments/EventComments.vue'
import EventJoinPanel from '@/components/events/EventJoinPanel.vue'
import EventsMap from '@/components/map/EventsMap.vue'
import { organizerLink, organizerName } from '@/components/events/organizer'
import SportIcon from '@/components/illustrations/SportIcon.vue'
import { sportIconName } from '@/components/illustrations/sportIcon'
import { StatusBadge, UiAvatarStack, UiBadge, UiButton, UiSeats } from '@/components/ui'
import { JOIN_MODE_LABELS, LEVEL_LABELS } from '@/features/events/filters'
import { formatEventWhen } from '@/utils/datetime'
import { toPoints, twoGisLink } from '@/features/map/geo'
import { APP_NAME } from '@/router/access'

const route = useRoute()
const id = computed(() => Number(route.params.id))

const event = ref<EventDetails | null>(null)
const state = ref<'loading' | 'ready' | 'gone' | 'not-found' | 'error'>('loading')
const message = ref('')

async function load({ quiet = false } = {}) {
  if (!quiet) state.value = 'loading'
  try {
    const details = await eventsApi.get(id.value)
    event.value = details
    state.value = 'ready'
    document.title = `${details.title} — ${APP_NAME}`
  } catch (e) {
    event.value = null
    message.value = e instanceof ApiError ? e.message : 'Не получилось загрузить мероприятие.'
    state.value =
      !Number.isInteger(id.value) || (e instanceof ApiError && e.status === 404)
        ? 'not-found'
        : e instanceof ApiError && e.isGone
          ? 'gone'
          : 'error'
  }
}

watch(id, () => load(), { immediate: true })

const when = computed(() =>
  event.value ? formatEventWhen(event.value.starts_at, event.value.ends_at) : '',
)
const participants = computed(() => event.value?.participants ?? [])
const mapPoints = computed(() => (event.value ? toPoints([event.value]) : []))
</script>

<template>
  <div aria-live="polite" :aria-busy="state === 'loading'">
    <div v-if="state === 'loading'" class="flex flex-col gap-4" aria-label="Загрузка">
      <div class="h-10 w-2/3 animate-pulse rounded-field bg-mute" />
      <div class="h-56 animate-pulse rounded-card bg-card" />
    </div>

    <section
      v-else-if="state === 'gone'"
      class="mx-auto flex max-w-xl flex-col gap-3 rounded-card bg-card p-5"
    >
      <UiBadge tone="off">Запись закрыта</UiBadge>
      <h1 class="font-display text-2xl font-bold">Мероприятие недоступно</h1>
      <p role="alert">{{ message }}</p>
      <p class="text-ink-2">
        Записаться на него нельзя. Если вы были записаны, запись сохранена в истории.
      </p>
      <RouterLink
        :to="{ name: 'events' }"
        class="font-bold text-accent-ink underline underline-offset-4"
      >
        Найти другие мероприятия
      </RouterLink>
    </section>

    <section
      v-else-if="state === 'not-found'"
      class="mx-auto flex max-w-md flex-col gap-3 py-8 text-center"
    >
      <h1 class="font-display text-2xl font-bold">Мероприятие не найдено</h1>
      <p class="text-ink-2">Возможно, ссылка с ошибкой.</p>
      <RouterLink
        :to="{ name: 'events' }"
        class="font-bold text-accent-ink underline underline-offset-4"
      >
        К мероприятиям
      </RouterLink>
    </section>

    <section
      v-else-if="state === 'error'"
      class="mx-auto flex max-w-md flex-col items-center gap-3 rounded-card p-6 text-center"
      role="alert"
    >
      <p class="text-lg font-bold">Не получилось загрузить мероприятие</p>
      <p class="text-ink-2">{{ message }}</p>
      <UiButton variant="ghost" class="!w-auto" @click="load()">Повторить</UiButton>
    </section>

    <article v-else-if="event" class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div class="flex min-w-0 flex-col gap-5">
        <div
          v-if="event.status !== 'published'"
          class="flex flex-col gap-1 rounded-card bg-mute p-4"
          role="alert"
        >
          <StatusBadge :of="{ kind: 'event', status: event.status }" />
          <p class="font-medium">
            Мероприятие недоступно<template v-if="event.unavailable_reason"
              >: {{ event.unavailable_reason }}</template
            >.
          </p>
          <p class="text-ink-2">
            Записаться на него нельзя. Вы видите страницу, потому что связаны с этим мероприятием.
          </p>
        </div>

        <header class="flex flex-col gap-3 rounded-card bg-accent p-6">
          <p class="flex items-center gap-3 font-semibold">
            <span class="grid size-12 place-items-center rounded-full bg-card">
              <SportIcon :name="sportIconName(event.sport)" :size="34" />
            </span>
            {{ event.sport.name }}
          </p>
          <p class="text-xl font-bold text-accent-ink">{{ when }}</p>
          <h1 class="text-2xl leading-tight font-bold md:text-3xl">
            {{ event.title }}
          </h1>
          <UiBadge class="!bg-card !text-ink">
            {{ JOIN_MODE_LABELS[event.join_mode] }}
          </UiBadge>
        </header>

        <p v-if="event.description" class="text-lg whitespace-pre-line">{{ event.description }}</p>

        <dl class="grid gap-3 rounded-card bg-card p-4 sm:grid-cols-[auto_1fr] sm:gap-x-6">
          <dt class="font-bold">Организатор</dt>
          <dd>
            <RouterLink
              :to="organizerLink(event.organizer)"
              class="text-accent-ink underline underline-offset-4"
            >
              {{ organizerName(event.organizer) }}
            </RouterLink>
            <span v-if="event.organizer.type === 'organization'" class="text-ink-2">
              · организация</span
            >
          </dd>

          <template v-if="event.organizer_contacts">
            <dt class="font-bold">Контакты</dt>
            <dd>{{ event.organizer_contacts }}</dd>
          </template>

          <dt class="font-bold">Место</dt>
          <dd>
            {{ event.address }}
            <span v-if="event.location_note" class="block text-ink-2">{{
              event.location_note
            }}</span>
          </dd>

          <dt class="font-bold">Уровень</dt>
          <dd>{{ event.level ? LEVEL_LABELS[event.level] : 'Любой' }}</dd>

          <template v-if="event.requirements">
            <dt class="font-bold">Требования</dt>
            <dd>{{ event.requirements }}</dd>
          </template>

          <template v-if="event.equipment">
            <dt class="font-bold">Инвентарь</dt>
            <dd>{{ event.equipment }}</dd>
          </template>
        </dl>

        <section v-if="mapPoints[0]" aria-labelledby="map-title" class="flex flex-col gap-2">
          <h2 id="map-title" class="text-lg font-bold">Место на карте</h2>
          <EventsMap
            class="h-64"
            :points="mapPoints"
            :zoom="15"
            :label="`Место проведения: ${event.address}`"
          />
          <a
            :href="twoGisLink(mapPoints[0].coordinates)"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex min-h-8 w-fit items-center font-semibold text-accent-ink underline underline-offset-4"
          >
            Открыть в 2ГИС и построить маршрут
          </a>
        </section>

        <section aria-labelledby="people-title" class="flex flex-col gap-2">
          <h2 id="people-title" class="text-lg font-bold">Участники</h2>
          <UiSeats :taken="event.confirmed_count" :capacity="event.capacity">
            <UiAvatarStack v-if="participants.length" :users="participants" :max="5" />
            <span v-else class="text-ink-2">Пока никого — будьте первым</span>
          </UiSeats>
          <p v-if="participants.length" class="text-ink-2">
            {{ participants.map((p) => p.name).join(', ') }}
          </p>
        </section>
      </div>

      <aside class="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
        <EventJoinPanel :event="event" @changed="load({ quiet: true })" />
      </aside>

      <EventComments :event="event" class="lg:col-start-1" />
    </article>
  </div>
</template>
