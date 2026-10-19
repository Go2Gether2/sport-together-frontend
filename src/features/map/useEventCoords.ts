import { ref, watch, type Ref } from 'vue'
import { eventsApi, type EventSummary } from '@/api'
import type { LngLat } from './geo'

// В ответе списка (EventShortResponse) у бэка нет координат — берём их из карточек, с кэшем.
// Когда бэк добавит lat/lng в список, этот шаг станет не нужен.
const cache = new Map<number, LngLat | null>()

export function useEventCoords(events: Ref<EventSummary[]>, enabled: Ref<boolean>) {
  const coords = ref(new Map<number, LngLat | null>())
  const loading = ref(false)

  async function fill() {
    if (!enabled.value) return
    const missing = events.value.filter((e) => !cache.has(e.id))
    if (missing.length) {
      loading.value = true
      await Promise.all(
        missing.map(async (e) => {
          try {
            const d = await eventsApi.get(e.id)
            cache.set(e.id, d.lat !== null && d.lng !== null ? [d.lng, d.lat] : null)
          } catch {
            cache.set(e.id, null)
          }
        }),
      )
      loading.value = false
    }
    coords.value = new Map(events.value.map((e) => [e.id, cache.get(e.id) ?? null]))
  }

  watch([events, enabled], fill, { immediate: true })
  return { coords, loading }
}

export function clearCoordsCache() {
  cache.clear()
}
