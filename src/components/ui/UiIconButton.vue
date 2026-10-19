<script setup lang="ts">
withDefaults(defineProps<{ label: string; round?: boolean; filled?: boolean }>(), {
  round: false,
  filled: false,
})
</script>

<template>
  <button
    type="button"
    :aria-label="label"
    :title="label"
    class="grid size-11 flex-none place-items-center border-2 border-ink transition-colors"
    :class="[
      round ? 'rounded-full' : 'rounded-xl',
      filled ? 'bg-ink text-paper' : 'bg-card text-ink hover:bg-cobalt-tint',
    ]"
  >
    <slot />
  </button>
</template>
