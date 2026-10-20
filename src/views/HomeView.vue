<script setup lang="ts">
import { RouterLink } from 'vue-router'
import ForYou from '@/components/events/ForYou.vue'
import SportIcon from '@/components/illustrations/SportIcon.vue'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()

const sports = [
  { icon: 'football', label: 'Футбол', bg: 'bg-orange' },
  { icon: 'tennis', label: 'Теннис', bg: 'bg-lilac' },
  { icon: 'running', label: 'Бег', bg: 'bg-accent-soft' },
  { icon: 'chess', label: 'Шахматы', bg: 'bg-card' },
]
</script>

<template>
  <section class="flex flex-col gap-4 py-2">
    <div class="relative flex flex-col gap-4 overflow-hidden rounded-card bg-accent p-6 sm:p-8">
      <p class="font-hand text-2xl text-accent-ink">спорт — это когда вместе</p>
      <h1 class="max-w-md text-3xl leading-tight font-bold sm:text-4xl">
        Найдите компанию для спорта
      </h1>
      <RouterLink
        :to="{ name: 'events' }"
        class="inline-flex min-h-13 w-fit items-center rounded-full bg-ink px-7 font-bold tracking-wide text-white no-underline hover:bg-ink/85"
      >
        Смотреть мероприятия
      </RouterLink>
      <span
        aria-hidden="true"
        class="pointer-events-none absolute -right-4 -bottom-6 hidden opacity-90 sm:block"
      >
        <SportIcon name="running" :size="180" />
      </span>
    </div>

    <ForYou v-if="session.user && !session.isAdmin" />

    <ul class="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Популярные направления">
      <li
        v-for="s in sports"
        :key="s.icon"
        class="flex flex-col gap-6 rounded-card p-4"
        :class="s.bg"
      >
        <span class="grid size-12 place-items-center rounded-full bg-ink">
          <SportIcon :name="s.icon" :size="36" class="invert" />
        </span>
        <b class="text-lg">{{ s.label }}</b>
      </li>
    </ul>
  </section>
</template>
