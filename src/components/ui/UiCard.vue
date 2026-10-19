<script setup lang="ts">
withDefaults(defineProps<{ as?: string }>(), { as: 'div' })
</script>

<template>
  <component :is="as" class="flex flex-col gap-2 rounded-card border-2 border-ink bg-card p-3.5">
    <slot />
  </component>
</template>
