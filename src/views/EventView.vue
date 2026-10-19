<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ApiError, eventsApi, type EventDetails } from '@/api'
import type { Participant } from '@/api/events'
import EventJoinPanel from '@/components/events/EventJoinPanel.vue'
import { organizerName } from '@/components/events/organizer'
import SportIcon from '@/components/illustrations/SportIcon.vue'
import { UiAvatarStack, UiBadge, UiButton, UiSeats } from '@/components/ui'
import { JOIN_MODE_LABELS, LEVEL_LABELS } from '@/features/events/filters'
import { formatEventWhen } from '@/utils/datetime'
import { APP_NAME } from '@/router/access'

const route = useRoute()
const id = computed(() => String(route.params.id))

const event = ref<EventDetails | null>(null)
const participants = ref<Participant[]>([])
const state = ref<'loading' | 'ready' | 'gone' | 'not-found' | 'error'>('loading')
const message = ref('')

async function load({ quiet = false } = {}) {
  if (!quiet) state.value = 'loading'
  try {
    const [details, people] = await Promise.all([
      eventsApi.get(id.value),
      eventsApi.participants(id.value),
    ])
    event.value = details
    participants.value = people
    state.value = 'ready'
    document.title = `${details.title} — ${APP_NAME}`
  } catch (e) {
    event.value = null
    message.value = e instanceof ApiError ? e.message : 'Не получилось загрузить мероприятие.'
    state.value =
      e instanceof ApiError && e.isGone
        ? 'gone'
        : e instanceof ApiError && e.status === 404
          ? 'not-found'
          : 'error'
  }
}

watch(id, () => load(), { immediate: true })

const when = computed(() =>
  event.value ? formatEventWhen(event.value.starts_at, event.value.ends_at) : '',
)
const organizerLink = computed(() => {
  const o = event.value?.organizer
  if (!o) return null
  return o.type === 'user'
    ? { name: 'user', params: { id: o.user.id } }
    : { name: 'organization', params: { id: o.organization.id } }
})
</script>

<template>
  <div aria-live="polite" :aria-busy="state === 'loading'">
    <div v-if="state === 'loading'" class="flex flex-col gap-4" aria-label="Загрузка">
      <div class="h-10 w-2/3 animate-pulse rounded-field bg-mute" />
      <div class="h-56 animate-pulse rounded-card border-2 border-mute bg-card" />
    </div>

    <section
      v-else-if="state === 'gone'"
      class="mx-auto flex max-w-xl flex-col gap-3 rounded-card border-2 border-ink bg-card p-5"
    >
      <UiBadge tone="off">Запись закрыта</UiBadge>
      <h1 class="font-display text-2xl font-bold">Мероприятие недоступно</h1>
      <p role="alert">{{ message }}</p>
      <p class="text-ink-2">
        Записаться на него нельзя. Если вы были записаны, запись сохранена в истории.
      </p>
      <RouterLink
        :to="{ name: 'events' }"
        class="font-bold text-cobalt underline underline-offset-4"
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
        class="font-bold text-cobalt underline underline-offset-4"
      >
        К мероприятиям
      </RouterLink>
    </section>

    <section
      v-else-if="state === 'error'"
      class="mx-auto flex max-w-md flex-col items-center gap-3 rounded-card border-2 border-dashed border-cobalt p-6 text-center"
      role="alert"
    >
      <p class="text-lg font-bold">Не получилось загрузить мероприятие</p>
      <p class="text-ink-2">{{ message }}</p>
      <UiButton variant="ghost" class="!w-auto" @click="load()">Повторить</UiButton>
    </section>

    <article v-else-if="event" class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div class="flex min-w-0 flex-col gap-5">
        <header class="flex flex-col gap-2">
          <p class="flex items-center gap-2 font-medium">
            <SportIcon :name="event.sport.icon" :size="32" />
            {{ event.sport.name }}
          </p>
          <p class="font-display text-xl font-bold text-cobalt">{{ when }}</p>
          <h1 class="font-display text-2xl leading-tight font-bold md:text-3xl">
            {{ event.title }}
          </h1>
          <UiBadge :tone="event.join_mode === 'approval' ? 'outline' : 'accent'">
            {{ JOIN_MODE_LABELS[event.join_mode] }}
          </UiBadge>
        </header>

        <p v-if="event.description" class="text-lg whitespace-pre-line">{{ event.description }}</p>

        <dl
          class="grid gap-3 rounded-card border-2 border-ink bg-card p-4 sm:grid-cols-[auto_1fr] sm:gap-x-6"
        >
          <dt class="font-bold">Организатор</dt>
          <dd>
            <RouterLink
              v-if="organizerLink"
              :to="organizerLink"
              class="text-cobalt underline underline-offset-4"
            >
              {{ organizerName(event.organizer) }}
            </RouterLink>
            <span v-if="event.organizer.type === 'organization'" class="text-ink-2">
              · организация</span
            >
          </dd>

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

        <section aria-labelledby="people-title" class="flex flex-col gap-2">
          <h2 id="people-title" class="text-lg font-bold">Участники</h2>
          <UiSeats :taken="event.participants_count" :capacity="event.capacity">
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
    </article>
  </div>
</template>
