<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { APP_NAME } from '@/router/access'
</script>

<template>
  <footer class="bg-page">
    <div
      class="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-4 text-sm text-ink-2"
    >
      <span>«{{ APP_NAME }}» — учебный прототип</span>
      <RouterLink :to="{ name: 'privacy' }" class="text-ink underline underline-offset-4">
        Политика обработки персональных данных
      </RouterLink>
      <span aria-label="Возрастное ограничение 12 плюс" class="ml-auto font-bold text-ink"
        >12+</span
      >
    </div>
  </footer>
</template>
