<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="mx-auto flex max-w-md flex-col items-center gap-3 py-10 text-center">
    <p class="font-hand text-2xl text-cobalt">ой, мимо</p>
    <h1 class="font-display text-2xl font-bold">Страница не найдена</h1>
    <p class="text-ink-2">Возможно, ссылка устарела. Найдите занятие в общем списке.</p>
    <RouterLink :to="{ name: 'events' }" class="font-bold text-cobalt underline underline-offset-4">
      К мероприятиям
    </RouterLink>
  </section>
</template>
