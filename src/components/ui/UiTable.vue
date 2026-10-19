<script setup lang="ts" generic="T">
export interface UiColumn {
  key: string
  label: string
  class?: string
}

const props = withDefaults(
  defineProps<{
    caption: string
    columns: UiColumn[]
    rows: T[]
    rowKey: (row: T) => string
    selectedKey?: string | null
    clickable?: boolean
    loading?: boolean
    emptyText?: string
  }>(),
  { selectedKey: null, clickable: false, loading: false, emptyText: 'Здесь пока пусто' },
)
const emit = defineEmits<{ select: [row: T] }>()

defineSlots<{
  [K: `cell-${string}`]: (p: { row: T }) => unknown
  empty?: () => unknown
}>()

function cell(row: T, key: string): unknown {
  return (row as Record<string, unknown>)[key]
}

function pick(row: T) {
  if (props.clickable) emit('select', row)
}
</script>

<template>
  <div class="overflow-x-auto">
    <table
      class="w-full min-w-[640px] border-separate border-spacing-y-1.5 text-[15px]"
      :aria-busy="loading || undefined"
    >
      <caption class="sr-only">
        {{
          caption
        }}
      </caption>
      <thead>
        <tr>
          <th
            v-for="c in columns"
            :key="c.key"
            scope="col"
            class="px-4 py-1.5 text-left text-xs font-bold tracking-wider text-ink-2 uppercase"
            :class="c.class"
          >
            {{ c.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <template v-if="loading">
          <tr v-for="i in 3" :key="i" aria-hidden="true">
            <td
              v-for="c in columns"
              :key="c.key"
              class="bg-field px-4 py-3.5 first:rounded-l-full last:rounded-r-full"
            >
              <div class="h-4 w-3/4 rounded-md bg-mute" />
            </td>
          </tr>
        </template>
        <tr v-else-if="rows.length === 0">
          <td
            :colspan="columns.length"
            class="rounded-card bg-field px-4 py-8 text-center text-ink-2"
          >
            <slot name="empty">{{ emptyText }}</slot>
          </td>
        </tr>
        <template v-else>
          <tr
            v-for="row in rows"
            :key="rowKey(row)"
            :tabindex="clickable ? 0 : undefined"
            :aria-current="rowKey(row) === selectedKey ? 'true' : undefined"
            class="group"
            :class="clickable ? 'cursor-pointer' : ''"
            @click="pick(row)"
            @keydown.enter="pick(row)"
          >
            <td
              v-for="c in columns"
              :key="c.key"
              class="px-4 py-3 align-middle first:rounded-l-full last:rounded-r-full"
              :class="[
                c.class,
                rowKey(row) === selectedKey ? 'bg-accent-soft' : 'bg-field',
                clickable ? 'group-hover:bg-mute' : '',
              ]"
            >
              <slot :name="`cell-${c.key}`" :row="row">{{ cell(row, c.key) }}</slot>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
