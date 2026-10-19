<script setup lang="ts">
import { computed } from 'vue'
import { toneIcon, type StatusTone } from './status'

const props = withDefaults(defineProps<{ tone?: StatusTone | 'outline' | 'accent' }>(), {
  tone: 'outline',
})

const classes: Record<NonNullable<typeof props.tone>, string> = {
  ok: 'bg-cobalt text-white border-cobalt',
  wait: 'bg-card text-cobalt border-cobalt border-dashed',
  no: 'bg-mute text-ink border-ink',
  off: 'bg-card text-ink-2 border-ink-2 line-through',
  outline: 'bg-card text-ink border-ink',
  accent: 'bg-cobalt text-white border-cobalt',
}

const icon = computed(() => (props.tone in toneIcon ? toneIcon[props.tone as StatusTone] : ''))
</script>

<template>
  <span
    class="inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] px-2.5 py-0.5 text-sm font-bold"
    :class="classes[tone]"
  >
    <span v-if="icon" aria-hidden="true">{{ icon }}</span>
    <slot />
  </span>
</template>
