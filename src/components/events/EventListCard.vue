<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { EventSummary } from '@/api'
import SportIcon from '@/components/illustrations/SportIcon.vue'
import { UiBadge, UiSeats } from '@/components/ui'
import { formatEventWhen } from '@/utils/datetime'
import { JOIN_MODE_LABELS, LEVEL_LABELS } from '@/features/events/filters'
import { organizerName } from './organizer'

const props = defineProps<{ event: EventSummary }>()

const when = computed(() => formatEventWhen(props.event.starts_at, props.event.ends_at))
const level = computed(() =>
  props.event.level ? LEVEL_LABELS[props.event.level] : 'любой уровень',
)
</script>

<template>
  <article
    class="relative flex flex-col gap-2.5 rounded-card border-2 border-ink bg-card p-4 focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-cobalt hover:bg-cobalt-tint/40"
  >
    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="font-display text-lg font-bold text-cobalt">{{ when }}</p>
      <UiBadge :tone="event.join_mode === 'approval' ? 'outline' : 'accent'">
        {{ JOIN_MODE_LABELS[event.join_mode] }}
      </UiBadge>
    </div>

    <div class="flex items-start gap-3">
      <SportIcon :name="event.sport.icon" :size="44" class="shrink-0" />
      <div class="min-w-0 flex-1">
        <h3 class="text-lg leading-snug font-bold">
          <RouterLink
            :to="{ name: 'event', params: { id: event.id } }"
            class="text-ink no-underline outline-none after:absolute after:inset-0 after:content-['']"
          >
            {{ event.title }}
          </RouterLink>
        </h3>
        <p class="text-ink-2">{{ event.sport.name }} · {{ level }}</p>
        <p class="truncate text-ink-2">{{ event.address }}</p>
      </div>
    </div>

    <UiSeats :taken="event.participants_count" :capacity="event.capacity">
      <span class="truncate">{{ organizerName(event.organizer) }}</span>
    </UiSeats>
  </article>
</template>
