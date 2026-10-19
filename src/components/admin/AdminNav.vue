<script setup lang="ts">
import { RouterLink } from 'vue-router'

const items = [
  { label: 'Обзор', to: { name: 'admin' } },
  { label: 'Организации', to: { name: 'admin-organizations' } },
  { label: 'Мероприятия', to: { name: 'admin-events' } },
]
</script>

<template>
  <nav aria-label="Разделы админки" class="flex gap-2 overflow-x-auto">
    <RouterLink
      v-for="item in items"
      :key="item.label"
      :to="item.to"
      class="flex-none rounded-full bg-field px-4 py-2 font-semibold whitespace-nowrap text-ink no-underline hover:bg-mute"
      exact-active-class="!bg-ink !text-white"
    >
      {{ item.label }}
    </RouterLink>
  </nav>
</template>
