<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'accent' | 'ghost'
    type?: 'button' | 'submit'
    disabled?: boolean
    loading?: boolean
    sparks?: boolean
  }>(),
  { variant: 'primary', type: 'button', disabled: false, loading: false, sparks: false },
)

const variants = {
  primary: 'bg-ink text-white hover:bg-ink/85',
  accent: 'bg-accent text-ink hover:bg-accent-soft',
  ghost: 'bg-field text-ink hover:bg-mute',
}
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
    class="inline-flex min-h-13 w-full items-center justify-center gap-2.5 rounded-full px-6 font-bold tracking-wide transition-colors disabled:cursor-not-allowed disabled:bg-mute disabled:text-ink-2"
    :class="variants[variant]"
  >
    <span v-if="sparks" aria-hidden="true" class="text-sm">✦</span>
    <span>{{ loading ? 'Подождите…' : '' }}<slot v-if="!loading" /></span>
    <span v-if="sparks" aria-hidden="true" class="text-sm">✦</span>
  </button>
</template>
