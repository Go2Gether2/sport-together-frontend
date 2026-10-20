<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import SportIcon from '@/components/illustrations/SportIcon.vue'
import { SLIDE_MS, stepStory, type Story, type StoryPosition } from '@/features/home/stories'

const props = defineProps<{ stories: Story[] }>()
const position = defineModel<StoryPosition | null>('position', { required: true })
const emit = defineEmits<{ seen: [id: string] }>()

const dialog = ref<HTMLDialogElement>()
const elapsed = ref(0)
const paused = ref(false)
// Автоперелистывание — движение без спроса: при «меньше движения» стартуем на паузе (ГОСТ Р 52872, 2.2.2).
const reduceMotion =
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

const story = computed(() => (position.value ? props.stories[position.value.story] : undefined))
const slide = computed(() => story.value?.slides[position.value?.slide ?? 0])

watch(position, async (p) => {
  await nextTick()
  const el = dialog.value
  if (!el) return
  if (p && story.value) {
    if (!el.open) {
      el.showModal?.()
      paused.value = reduceMotion
    }
    elapsed.value = 0
    emit('seen', story.value.id)
  } else if (el.open) {
    el.close()
  }
})

function go(direction: 1 | -1) {
  if (!position.value) return
  position.value = stepStory(props.stories, position.value, direction)
}

let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => {
    if (!position.value || paused.value) return
    elapsed.value += 100
    if (elapsed.value >= SLIDE_MS) go(1)
  }, 100)
})
onUnmounted(() => clearInterval(timer))

function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowRight') go(1)
  else if (e.key === 'ArrowLeft') go(-1)
}

function barWidth(i: number) {
  const at = position.value?.slide ?? 0
  if (i < at) return '100%'
  if (i > at) return '0%'
  return `${Math.min(100, (elapsed.value / SLIDE_MS) * 100)}%`
}
</script>

<template>
  <dialog
    ref="dialog"
    :aria-label="story ? $t('stories.viewer', { name: story.label }) : $t('stories.title')"
    class="m-auto h-dvh max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-black/80 sm:h-[min(760px,92dvh)] sm:w-[420px]"
    @close="position = null"
    @keydown="onKey"
  >
    <div
      v-if="story && slide && position"
      class="relative flex h-full flex-col gap-4 overflow-hidden p-5 text-ink sm:rounded-[32px]"
      :class="story.bg"
    >
      <div class="relative z-10 flex gap-1" aria-hidden="true">
        <span v-for="(_, i) in story.slides" :key="i" class="h-1 flex-1 rounded-full bg-ink/20">
          <span class="block h-full rounded-full bg-ink" :style="{ width: barWidth(i) }" />
        </span>
      </div>

      <div class="relative z-10 flex items-center gap-3">
        <span class="grid size-11 place-items-center rounded-full bg-card">
          <SportIcon :name="story.icon" :size="30" />
        </span>
        <b class="flex-1 truncate">{{ story.label }}</b>
        <button
          type="button"
          class="grid size-11 place-items-center rounded-full bg-card/70 font-bold hover:bg-card"
          :aria-label="paused ? $t('stories.resume') : $t('stories.pause')"
          @click="paused = !paused"
        >
          {{ paused ? '▶' : '❚❚' }}
        </button>
        <button
          type="button"
          class="grid size-11 place-items-center rounded-full bg-card/70 text-xl hover:bg-card"
          :aria-label="$t('common.close')"
          @click="position = null"
        >
          ✕
        </button>
      </div>

      <button
        type="button"
        class="absolute inset-y-0 left-0 w-1/3 cursor-w-resize"
        :aria-label="$t('stories.prev')"
        @click="go(-1)"
      />
      <button
        type="button"
        class="absolute inset-y-0 right-0 w-2/3 cursor-e-resize"
        :aria-label="$t('stories.next')"
        @click="go(1)"
      />

      <span
        aria-hidden="true"
        class="pointer-events-none absolute top-24 -right-6 opacity-60 short:hidden"
      >
        <SportIcon :name="story.icon" :size="220" />
      </span>

      <div
        class="pointer-events-none relative z-10 mt-auto flex flex-col gap-3"
        aria-live="polite"
        :aria-label="$t('stories.slide', { n: position.slide + 1, total: story.slides.length })"
        role="group"
      >
        <h2 class="text-3xl leading-tight font-bold">{{ slide.title }}</h2>
        <p class="text-lg">{{ slide.text }}</p>
        <RouterLink
          v-if="slide.cta"
          :to="slide.cta.to"
          class="pointer-events-auto mt-2 inline-flex min-h-13 w-fit items-center rounded-full bg-ink px-7 font-bold text-white no-underline hover:bg-ink/85"
          @click="position = null"
        >
          {{ slide.cta.label }}
        </RouterLink>
      </div>
    </div>
  </dialog>
</template>
