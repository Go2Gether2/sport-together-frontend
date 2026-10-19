<script setup lang="ts">
import { useId } from 'vue'

withDefaults(
  defineProps<{
    label: string
    placeholder?: string
    hint?: string
    error?: string
    rows?: number
    maxlength?: number
  }>(),
  { placeholder: undefined, hint: undefined, error: undefined, rows: 4, maxlength: undefined },
)

const model = defineModel<string>({ default: '' })
const id = useId()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="id" class="font-medium">{{ label }}</label>
    <textarea
      :id="id"
      v-model="model"
      :rows="rows"
      :maxlength="maxlength"
      :placeholder="placeholder"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error || hint ? `${id}-desc` : undefined"
      class="resize-y rounded-field border-2 bg-card px-3.5 py-2.5 text-ink placeholder:text-ink-2"
      :class="error ? 'border-dashed border-cobalt' : 'border-ink'"
    />
    <p v-if="error" :id="`${id}-desc`" class="text-sm font-medium text-cobalt" role="alert">
      ✕ {{ error }}
    </p>
    <p v-else-if="hint" :id="`${id}-desc`" class="text-sm text-ink-2">{{ hint }}</p>
  </div>
</template>
