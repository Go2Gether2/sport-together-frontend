<script setup lang="ts">
import { computed } from 'vue'
import type { UserShort } from '@/api/types'

const props = withDefaults(defineProps<{ users: UserShort[]; max?: number }>(), { max: 3 })

const shown = computed(() => props.users.slice(0, props.max))
const rest = computed(() => props.users.length - shown.value.length)

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}
</script>

<template>
  <div class="flex items-center" :aria-label="`Участники: ${users.map((u) => u.name).join(', ')}`">
    <span
      v-for="(u, i) in shown"
      :key="u.id"
      class="grid size-8 place-items-center overflow-hidden rounded-full text-[11px] font-bold ring-2 ring-card"
      :class="[i > 0 ? '-ml-2.5' : '', ['bg-accent', 'bg-orange', 'bg-lilac'][i % 3]]"
      aria-hidden="true"
    >
      <img v-if="u.avatar_url" :src="u.avatar_url" alt="" class="size-full object-cover" />
      <template v-else>{{ initials(u.name) }}</template>
    </span>
    <span
      v-if="rest > 0"
      class="-ml-2.5 grid size-8 place-items-center rounded-full bg-field ring-2 ring-card text-[11px] font-bold"
      aria-hidden="true"
      >+{{ rest }}</span
    >
  </div>
</template>
