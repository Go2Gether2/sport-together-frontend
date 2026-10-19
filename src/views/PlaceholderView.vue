<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <section class="flex flex-col gap-3">
    <h1 class="font-display text-2xl font-bold">{{ route.meta.title }}</h1>
    <p class="rounded-card border-2 border-dashed border-cobalt p-4 text-ink-2">
      Этот раздел ещё в работе.
    </p>
  </section>
</template>
