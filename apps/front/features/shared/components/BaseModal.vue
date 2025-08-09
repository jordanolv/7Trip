<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center">
    <div 
      class="absolute inset-0 bg-white/20 backdrop-blur-sm"
      @click="$emit('update:modelValue', false)"
    ></div>

    <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 border">
      <div v-if="title" class="px-6 pt-6 pb-4">
        <h3 class="text-lg font-medium text-gray-900">{{ title }}</h3>
      </div>
      
      <div class="px-6 pb-4">
        <slot />
      </div>
      
      <div v-if="$slots.footer" class="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean
  title?: string
}

defineProps<Props>()

defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>