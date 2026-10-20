<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { safetyApi, sportsApi } from '@/api'
import SportIcon from '@/components/illustrations/SportIcon.vue'
import { bannerToStory } from '@/features/safety/safety'
import {
  STORIES,
  readSeen,
  saveSeen,
  sortBySeen,
  type StoryPosition,
} from '@/features/home/stories'
import StoryViewer from './StoryViewer.vue'

const seen = ref(readSeen())
// Порядок фиксируем при открытии страницы: иначе просмотренная сторис уезжала бы в конец прямо во время показа.
const stories = ref(sortBySeen(STORIES, seen.value))
const position = ref<StoryPosition | null>(null)

// Памятки по безопасности с бэка — те же сторис, в конце ленты. Не загрузились — лента без них.
onMounted(async () => {
  try {
    const [banners, sports] = await Promise.all([safetyApi.list(), sportsApi.list()])
    const sportName = (id: number | null) => sports.find((s) => s.id === id)?.name
    const details = await Promise.allSettled(banners.map((b) => safetyApi.get(b.id)))
    const safety = details
      .flatMap((d) => (d.status === 'fulfilled' && d.value.slides.length ? [d.value] : []))
      .map((b) => bannerToStory(b, sportName(b.sport_id)))
    if (safety.length) stories.value = [...stories.value, ...sortBySeen(safety, seen.value)]
  } catch {
    // без памяток лента всё равно работает
  }
})

function onSeen(id: string) {
  if (seen.value.has(id)) return
  seen.value = new Set(seen.value).add(id)
  saveSeen(seen.value)
}
</script>

<template>
  <section :aria-label="$t('stories.title')">
    <ul class="-mx-4 flex gap-3 overflow-x-auto px-4 py-2 [scrollbar-width:none] lg:mx-0 lg:px-2">
      <li v-for="(s, i) in stories" :key="s.id" class="flex-none">
        <button
          type="button"
          class="relative flex size-32 flex-col justify-end overflow-hidden rounded-[22px] p-3 text-left ring-offset-2 ring-offset-page sm:size-36"
          :class="[s.bg, seen.has(s.id) ? '' : 'ring-3 ring-accent-strong']"
          :aria-label="seen.has(s.id) ? s.label : $t('stories.unseen', { name: s.label })"
          @click="position = { story: i, slide: 0 }"
        >
          <span aria-hidden="true" class="pointer-events-none absolute -top-2 -right-2 opacity-70">
            <SportIcon :name="s.icon" :size="72" />
          </span>
          <span
            v-if="s.badge"
            class="relative text-[11px] font-bold tracking-wider uppercase opacity-80"
            >{{ s.badge }}</span
          >
          <span class="relative text-base leading-tight font-bold">{{ s.label }}</span>
        </button>
      </li>
    </ul>
    <StoryViewer v-model:position="position" :stories="stories" @seen="onSeen" />
  </section>
</template>
