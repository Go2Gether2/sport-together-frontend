import { ref, type Ref } from 'vue'
import { ApiError, eventsApi, type EventFilters, type EventSummary } from '@/api'

export type ListState = 'loading' | 'ready' | 'error'

export function useEventList(filters: Ref<EventFilters>) {
  const items = ref<EventSummary[]>([])
  const total = ref(0)
  const page = ref(1)
  const state = ref<ListState>('loading')
  const loadingMore = ref(false)
  const error = ref('')
  let requestId = 0

  async function load() {
    const id = ++requestId
    state.value = 'loading'
    error.value = ''
    try {
      const result = await eventsApi.list({ ...filters.value, page: 1 })
      if (id !== requestId) return
      items.value = result.items
      total.value = result.total
      page.value = result.page
      state.value = 'ready'
    } catch (e) {
      if (id !== requestId) return
      error.value = e instanceof ApiError ? e.message : 'Не получилось загрузить мероприятия.'
      state.value = 'error'
    }
  }

  async function loadMore() {
    if (loadingMore.value || items.value.length >= total.value) return
    const id = requestId
    loadingMore.value = true
    try {
      const result = await eventsApi.list({ ...filters.value, page: page.value + 1 })
      if (id !== requestId) return
      items.value = [...items.value, ...result.items]
      page.value = result.page
      total.value = result.total
    } catch (e) {
      error.value = e instanceof ApiError ? e.message : 'Не получилось загрузить ещё.'
    } finally {
      loadingMore.value = false
    }
  }

  return { items, total, state, error, loadingMore, load, loadMore }
}
