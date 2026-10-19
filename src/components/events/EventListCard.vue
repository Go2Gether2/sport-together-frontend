<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { EventSummary } from '@/api'
import SportIcon from '@/components/illustrations/SportIcon.vue'
import { sportIconName } from '@/components/illustrations/sportIcon'
import { UiBadge, seatsShort } from '@/components/ui'
import { formatEventWhen } from '@/utils/datetime'

const props = defineProps<{ event: EventSummary }>()

const when = computed(() => formatEventWhen(props.event.starts_at))
const seats = computed(() => seatsShort(props.event.confirmed_count, props.event.capacity))
</script>

<template>
  <article
    class="relative flex items-center gap-4 rounded-card bg-card p-4 focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-accent-ink hover:bg-accent-soft"
  >
    <span class="grid size-14 shrink-0 place-items-center rounded-full bg-accent">
      <SportIcon :name="sportIconName(event.sport)" :size="40" />
    </span>
    <div class="flex min-w-0 flex-1 flex-col gap-0.5">
      <p class="font-semibold text-accent-ink">{{ when }}</p>
      <h3 class="line-clamp-2 text-lg leading-snug font-bold">
        <RouterLink
          :to="{ name: 'event', params: { id: event.id } }"
          class="text-ink no-underline outline-none after:absolute after:inset-0 after:content-['']"
        >
          {{ event.title }}
        </RouterLink>
      </h3>
      <p class="truncate text-ink-2">{{ event.sport.name }} · {{ seats }}</p>
    </div>
    <UiBadge v-if="event.join_mode === 'approval'" class="self-start">По заявке</UiBadge>
  </article>
</template>
