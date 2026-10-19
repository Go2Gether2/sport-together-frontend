<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="flex flex-col gap-4 py-6">
    <p class="font-hand text-2xl text-cobalt">спорт — это когда вместе</p>
    <h1 class="font-display text-3xl font-bold">Найдите компанию для спорта</h1>
    <p class="max-w-xl text-lg text-ink-2">Совместные тренировки, игры и прогулки рядом с вами.</p>
    <RouterLink
      :to="{ name: 'events' }"
      class="inline-flex w-fit rounded-full border-2 border-ink bg-ink px-6 py-3 font-bold text-paper no-underline hover:bg-ink/85"
    >
      Смотреть мероприятия
    </RouterLink>
  </section>
</template>
