<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { recommendationsApi, type Id, type Recommendation } from '@/api'
import EventListCard from '@/components/events/EventListCard.vue'
import { reasonLabels } from '@/features/events/recommendations'

const props = defineProps<{ eventId: Id }>()

const items = ref<Recommendation[]>([])

// Блок вспомогательный: ошибку не показываем, просто прячем — карточка мероприятия важнее.
watch(
  () => props.eventId,
  async (id) => {
    items.value = []
    try {
      items.value = await recommendationsApi.similar(id, 4)
    } catch {
      items.value = []
    }
  },
  { immediate: true },
)

const cards = computed(() =>
  items.value.map((r) => ({ event: r.event, reasons: reasonLabels(r.reasons, 'similar') })),
)
</script>

<template>
  <section v-if="cards.length" class="flex flex-col gap-3" aria-labelledby="similar-title">
    <h2 id="similar-title" class="text-xl font-bold">{{ $t('event.similar') }}</h2>
    <ul class="grid gap-3 md:grid-cols-2">
      <li v-for="{ event, reasons } in cards" :key="event.id" class="flex min-w-0 flex-col gap-1.5">
        <EventListCard :event="event" />
        <p v-if="reasons.length" class="flex flex-wrap gap-1.5 px-2 text-sm">
          <span
            v-for="r in reasons"
            :key="r"
            class="rounded-full bg-accent-soft px-2.5 py-0.5 font-semibold text-accent-ink"
          >
            {{ r }}
          </span>
        </p>
      </li>
    </ul>
  </section>
</template>
