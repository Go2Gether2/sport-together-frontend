<script setup lang="ts">
import { ref } from 'vue'
import SportIcon from '@/components/illustrations/SportIcon.vue'
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
const stories = sortBySeen(STORIES, seen.value)
const position = ref<StoryPosition | null>(null)

function onSeen(id: string) {
  if (seen.value.has(id)) return
  seen.value = new Set(seen.value).add(id)
  saveSeen(seen.value)
}
</script>

<template>
  <section aria-label="Сторис">
    <ul class="-mx-4 flex gap-3 overflow-x-auto px-4 py-2 [scrollbar-width:none] lg:mx-0 lg:px-2">
      <li v-for="(s, i) in stories" :key="s.id" class="flex-none">
        <button
          type="button"
          class="relative flex size-32 flex-col justify-end overflow-hidden rounded-[22px] p-3 text-left ring-offset-2 ring-offset-page sm:size-36"
          :class="[s.bg, seen.has(s.id) ? '' : 'ring-3 ring-accent-strong']"
          :aria-label="`${s.label}${seen.has(s.id) ? '' : ', новое'}`"
          @click="position = { story: i, slide: 0 }"
        >
          <span aria-hidden="true" class="pointer-events-none absolute -top-2 -right-2 opacity-70">
            <SportIcon :name="s.icon" :size="72" />
          </span>
          <span class="relative text-base leading-tight font-bold">{{ s.label }}</span>
        </button>
      </li>
    </ul>
    <StoryViewer v-model:position="position" :stories="stories" @seen="onSeen" />
  </section>
</template>
