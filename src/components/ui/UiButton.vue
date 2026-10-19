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
  primary: 'bg-ink text-paper border-ink hover:bg-ink/85',
  accent: 'bg-cobalt text-white border-cobalt hover:bg-cobalt/90',
  ghost: 'bg-transparent text-ink border-ink hover:bg-cobalt-tint',
}
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
    class="inline-flex min-h-13 w-full items-center justify-center gap-2.5 rounded-full border-2 px-5 font-bold transition-colors disabled:cursor-not-allowed disabled:border-mute disabled:bg-mute disabled:text-ink-2"
    :class="variants[variant]"
  >
    <span v-if="sparks" aria-hidden="true" class="text-sm">✦</span>
    <span>{{ loading ? 'Подождите…' : '' }}<slot v-if="!loading" /></span>
    <span v-if="sparks" aria-hidden="true" class="text-sm">✦</span>
  </button>
</template>
