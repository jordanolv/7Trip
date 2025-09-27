<template>
  <component
    :is="tag"
    :to="to"
    :href="href"
    :disabled="disabled"
    :class="buttonClasses"
    @click="handleClick"
  >
    <Icon v-if="icon" :name="icon" class="w-5 h-5" />
    <span v-if="loading" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
    <slot />
  </component>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  disabled?: boolean
  loading?: boolean
  icon?: string
  to?: string
  href?: string
  fullWidth?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  fullWidth: false
})

const emit = defineEmits<{
  click: [event: Event]
}>()

const tag = computed(() => {
  if (props.to) return 'NuxtLink'
  if (props.href) return 'a'
  return 'button'
})

const buttonClasses = computed(() => [
  // Base styles
  'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',

  // Variants
  {
    'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 text-white shadow-sm hover:shadow-md': props.variant === 'primary',
    'bg-secondary-600 hover:bg-secondary-700 focus:ring-secondary-500 text-white shadow-sm hover:shadow-md': props.variant === 'secondary',
    'border-2 border-primary-600 text-primary-600 hover:bg-primary-600 hover:text-white focus:ring-primary-500': props.variant === 'outline',
    'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 focus:ring-neutral-500': props.variant === 'ghost',
    'bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white shadow-md hover:shadow-lg': props.variant === 'gradient'
  },

  // Sizes
  {
    'px-3 py-1.5 text-sm rounded-md': props.size === 'sm',
    'px-4 py-2 text-base rounded-lg': props.size === 'md',
    'px-6 py-3 text-lg rounded-lg': props.size === 'lg',
    'px-8 py-4 text-xl rounded-xl': props.size === 'xl'
  },

  // Full width
  {
    'w-full': props.fullWidth
  },

  // States
  {
    'opacity-75 cursor-not-allowed': props.disabled || props.loading
  }
])

const handleClick = (event: Event) => {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}
</script>