<script setup lang="ts">
import { useId } from 'vue'

withDefaults(
  defineProps<{
    label: string
    hideLabel?: boolean
    type?: 'text' | 'email' | 'search' | 'password' | 'date' | 'time' | 'number'
    placeholder?: string
    hint?: string
    error?: string
    required?: boolean
    min?: string
  }>(),
  {
    hideLabel: false,
    type: 'text',
    placeholder: undefined,
    hint: undefined,
    error: undefined,
    min: undefined,
  },
)

const model = defineModel<string>({ default: '' })
const id = useId()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="id" class="font-medium" :class="{ 'sr-only': hideLabel }">
      {{ label }}<span v-if="required" aria-hidden="true" class="text-cobalt"> *</span>
    </label>
    <div
      class="flex min-h-12.5 items-center gap-2.5 rounded-field border-2 bg-card px-3.5 focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-cobalt"
      :class="error ? 'border-cobalt border-dashed' : 'border-ink'"
    >
      <slot name="icon" />
      <input
        :id="id"
        v-model="model"
        :type="type"
        :placeholder="placeholder"
        :required="required"
        :min="min"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="error || hint ? `${id}-desc` : undefined"
        class="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-2"
      />
    </div>
    <p v-if="error" :id="`${id}-desc`" class="text-sm font-medium text-cobalt" role="alert">
      ✕ {{ error }}
    </p>
    <p v-else-if="hint" :id="`${id}-desc`" class="text-sm text-ink-2">{{ hint }}</p>
  </div>
</template>
