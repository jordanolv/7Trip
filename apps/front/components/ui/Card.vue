<template>
  <div :class="cardClasses">
    <div v-if="$slots.header || title" class="card-header">
      <slot name="header">
        <h3 v-if="title" class="text-lg font-semibold text-neutral-900">{{ title }}</h3>
      </slot>
    </div>

    <div v-if="$slots.image" class="card-image">
      <slot name="image" />
    </div>

    <div :class="bodyClasses">
      <slot />
    </div>

    <div v-if="$slots.footer" class="card-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'default' | 'elevated' | 'outlined' | 'travel'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  title?: string
  hover?: boolean
  clickable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  padding: 'md',
  hover: false,
  clickable: false
})

const cardClasses = computed(() => [
  'overflow-hidden transition-all duration-300',

  // Variants
  {
    'bg-white rounded-xl border border-neutral-200 shadow-sm': props.variant === 'default',
    'bg-white rounded-xl border border-neutral-200 shadow-lg hover:shadow-xl': props.variant === 'elevated',
    'bg-white rounded-xl border-2 border-neutral-300': props.variant === 'outlined',
    'bg-white rounded-xl border border-neutral-200 shadow-lg hover:shadow-travel': props.variant === 'travel'
  },

  // Hover effects
  {
    'hover:shadow-md': props.hover && props.variant === 'default',
    'hover:scale-[1.02]': props.hover && props.variant === 'travel'
  },

  // Clickable
  {
    'cursor-pointer': props.clickable
  }
])

const bodyClasses = computed(() => [
  // Padding
  {
    'p-0': props.padding === 'none',
    'p-3': props.padding === 'sm',
    'p-6': props.padding === 'md',
    'p-8': props.padding === 'lg'
  }
])
</script>

<style scoped>
.card-header {
  @apply px-6 py-4 border-b border-neutral-200;
}

.card-image {
  @apply relative overflow-hidden;
}

.card-footer {
  @apply px-6 py-4 border-t border-neutral-200 bg-neutral-50;
}
</style>