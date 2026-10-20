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
    <ul
      class="-mx-4 flex gap-3 overflow-x-auto px-4 pt-1 pb-1 [scrollbar-width:none] lg:mx-0 lg:px-1"
    >
      <li v-for="(s, i) in stories" :key="s.id" class="flex-none">
        <button
          type="button"
          class="flex w-19 flex-col items-center gap-1.5 rounded-2xl p-0.5"
          :aria-label="`${s.label}${seen.has(s.id) ? '' : ', новое'}`"
          @click="position = { story: i, slide: 0 }"
        >
          <span
            class="grid size-16 place-items-center rounded-full ring-offset-2 ring-offset-page"
            :class="[s.bg, seen.has(s.id) ? 'ring-2 ring-mute' : 'ring-3 ring-accent-strong']"
          >
            <SportIcon :name="s.icon" :size="40" />
          </span>
          <span class="line-clamp-2 text-center text-xs leading-tight font-semibold">
            {{ s.label }}
          </span>
        </button>
      </li>
    </ul>
    <StoryViewer v-model:position="position" :stories="stories" @seen="onSeen" />
  </section>
</template>
