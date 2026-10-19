<script setup lang="ts">
import { computed, ref } from 'vue'
import type { EventDetails } from '@/api'
import { UiButton } from '@/components/ui'
import { buildIcs, canAddToCalendar, eventPlace, icsFileName } from '@/features/events/share'
import { formatEventWhen } from '@/utils/datetime'

const props = defineProps<{ event: EventDetails }>()

const notice = ref('')
const url = computed(() => `${location.origin}/events/${props.event.id}`)
const shareable = computed(() => props.event.status === 'published' && !props.event.is_past)
const calendar = computed(() => canAddToCalendar(props.event))

async function share() {
  notice.value = ''
  const text = `${props.event.title} — ${formatEventWhen(props.event.starts_at)}, ${eventPlace(props.event)}`
  if (navigator.share) {
    try {
      await navigator.share({ title: props.event.title, text, url: url.value })
      return
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
    }
  }
  try {
    await navigator.clipboard.writeText(url.value)
    notice.value = 'Ссылка скопирована'
  } catch {
    notice.value = `Скопируйте ссылку: ${url.value}`
  }
}

function addToCalendar() {
  const blob = new Blob([buildIcs(props.event, url.value)], { type: 'text/calendar;charset=utf-8' })
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = icsFileName(props.event)
  a.click()
  URL.revokeObjectURL(href)
  notice.value = 'Файл для календаря скачан — откройте его'
}
</script>

<template>
  <section
    v-if="shareable"
    aria-label="Поделиться и календарь"
    class="flex flex-col gap-2 rounded-card bg-card p-4"
  >
    <div class="flex gap-2">
      <UiButton variant="ghost" class="flex-1" @click="share">Поделиться</UiButton>
      <UiButton v-if="calendar" variant="ghost" class="flex-1" @click="addToCalendar">
        В календарь
      </UiButton>
    </div>
    <p v-if="notice" class="text-center text-sm font-medium break-all text-ink-2" role="status">
      {{ notice }}
    </p>
  </section>
</template>
