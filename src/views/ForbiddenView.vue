<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="mx-auto flex max-w-md flex-col items-center gap-3 py-10 text-center">
    <h1 class="font-display text-2xl font-bold">Нет доступа</h1>
    <p class="text-ink-2">Этот раздел доступен только администратору.</p>
    <RouterLink
      :to="{ name: 'home' }"
      class="font-bold text-accent-ink underline underline-offset-4"
    >
      На главную
    </RouterLink>
  </section>
</template>
