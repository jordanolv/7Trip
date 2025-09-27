<template>
  <div class="input-wrapper">
    <label v-if="label" :for="inputId" class="input-label">
      {{ label }}
      <span v-if="required" class="text-error-500 ml-1">*</span>
    </label>

    <div class="relative">
      <div v-if="$slots.prefix || prefixIcon" class="input-prefix">
        <Icon v-if="prefixIcon" :name="prefixIcon" class="w-5 h-5 text-neutral-400" />
        <slot name="prefix" />
      </div>

      <input
        :id="inputId"
        v-model="inputValue"
        :type="type"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :class="inputClasses"
        @blur="emit('blur', $event)"
        @focus="emit('focus', $event)"
        @input="emit('input', $event)"
      />

      <div v-if="$slots.suffix || suffixIcon" class="input-suffix">
        <Icon v-if="suffixIcon" :name="suffixIcon" class="w-5 h-5 text-neutral-400" />
        <slot name="suffix" />
      </div>
    </div>

    <p v-if="error" class="input-error">{{ error }}</p>
    <p v-else-if="hint" class="input-hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue?: string | number
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'
  label?: string
  placeholder?: string
  error?: string
  hint?: string
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  size?: 'sm' | 'md' | 'lg'
  prefixIcon?: string
  suffixIcon?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  size: 'md',
  disabled: false,
  readonly: false,
  required: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  blur: [event: Event]
  focus: [event: Event]
  input: [event: Event]
}>()

const inputId = computed(() => `input-${Math.random().toString(36).substr(2, 9)}`)

const inputValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const inputClasses = computed(() => [
  'w-full border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0',

  // Sizes
  {
    'px-3 py-2 text-sm rounded-md': props.size === 'sm',
    'px-4 py-3 text-base rounded-lg': props.size === 'md',
    'px-5 py-4 text-lg rounded-lg': props.size === 'lg'
  },

  // States
  {
    'border-neutral-300 focus:border-primary-500 focus:ring-primary-500': !props.error,
    'border-error-500 focus:border-error-500 focus:ring-error-500': props.error,
    'bg-neutral-100 cursor-not-allowed': props.disabled,
    'bg-neutral-50': props.readonly
  },

  // Prefix/Suffix spacing
  {
    'pl-12': props.prefixIcon || $slots.prefix,
    'pr-12': props.suffixIcon || $slots.suffix
  }
])
</script>

<style scoped>
.input-wrapper {
  @apply space-y-2;
}

.input-label {
  @apply block text-sm font-medium text-neutral-700;
}

.input-prefix {
  @apply absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center;
}

.input-suffix {
  @apply absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center;
}

.input-error {
  @apply text-sm text-error-600;
}

.input-hint {
  @apply text-sm text-neutral-500;
}
</style>