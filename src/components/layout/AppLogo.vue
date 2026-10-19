<script setup lang="ts">
import { RouterLink } from 'vue-router'
import SportIcon from '@/components/illustrations/SportIcon.vue'
import { APP_NAME } from '@/router/access'
</script>

<template>
  <RouterLink
    :to="{ name: 'home' }"
    class="flex items-center gap-1.5 font-display text-xl font-bold text-ink no-underline"
  >
    <span class="grid size-10 place-items-center rounded-full bg-accent"
      ><SportIcon name="running" :size="28"
    /></span>
    <span>{{ APP_NAME }}</span>
  </RouterLink>
</template>
