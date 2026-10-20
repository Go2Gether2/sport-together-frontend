<script setup lang="ts">
import { RouterLink } from 'vue-router'
import ForYou from '@/components/events/ForYou.vue'
import HomeCarousel from '@/components/home/HomeCarousel.vue'
import StoriesRow from '@/components/home/StoriesRow.vue'
import SportIcon from '@/components/illustrations/SportIcon.vue'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()

// Поиск по русскому корню, как в баннерах: названия видов спорта в данных — по-русски.
const sports = [
  { icon: 'football', bg: 'bg-orange', q: 'футбол' },
  { icon: 'tennis', bg: 'bg-lilac', q: 'теннис' },
  { icon: 'running', bg: 'bg-accent-soft', q: 'бег' },
  { icon: 'chess', bg: 'bg-card', q: 'шахмат' },
]
</script>

<template>
  <section class="flex flex-col gap-[22px] py-2">
    <StoriesRow />

    <HomeCarousel />

    <ForYou v-if="session.user && !session.isAdmin" />

    <ul class="grid grid-cols-2 gap-3.5 sm:grid-cols-4" :aria-label="$t('home.popularSports')">
      <li v-for="s in sports" :key="s.icon">
        <RouterLink
          :to="{ name: 'events', query: { q: s.q } }"
          class="flex h-full min-h-[120px] flex-col justify-between gap-[22px] rounded-xl p-4 text-ink no-underline transition hover:brightness-95 motion-reduce:transition-none"
          :class="s.bg"
        >
          <span class="grid size-[46px] place-items-center rounded-full bg-ink">
            <SportIcon :name="s.icon" :size="34" class="invert" />
          </span>
          <b class="font-display text-xl">{{ $t(`home.sports.${s.icon}`) }}</b>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>
