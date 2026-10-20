<script setup lang="ts">
import ForYou from '@/components/events/ForYou.vue'
import HomeCarousel from '@/components/home/HomeCarousel.vue'
import StoriesRow from '@/components/home/StoriesRow.vue'
import SportIcon from '@/components/illustrations/SportIcon.vue'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()

const sports = [
  { icon: 'football', bg: 'bg-orange' },
  { icon: 'tennis', bg: 'bg-lilac' },
  { icon: 'running', bg: 'bg-accent-soft' },
  { icon: 'chess', bg: 'bg-card' },
]
</script>

<template>
  <section class="flex flex-col gap-4 py-2">
    <StoriesRow />

    <HomeCarousel />

    <ForYou v-if="session.user && !session.isAdmin" />

    <ul class="grid grid-cols-2 gap-3 sm:grid-cols-4" :aria-label="$t('home.popularSports')">
      <li
        v-for="s in sports"
        :key="s.icon"
        class="flex flex-col gap-6 rounded-card p-4"
        :class="s.bg"
      >
        <span class="grid size-12 place-items-center rounded-full bg-ink">
          <SportIcon :name="s.icon" :size="36" class="invert" />
        </span>
        <b class="text-lg">{{ $t(`home.sports.${s.icon}`) }}</b>
      </li>
    </ul>
  </section>
</template>
