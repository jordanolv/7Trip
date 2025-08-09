<template>
  <div class="flex items-center space-x-3">
    <img 
      v-if="user.profilePicture" 
      :src="user.profilePicture" 
      :alt="user.firstName"
      class="w-8 h-8 rounded-full"
    >
    <div v-else class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
      <span class="text-white text-sm font-medium">
        {{ user.firstName?.charAt(0) }}{{ user.lastName?.charAt(0) }}
      </span>
    </div>
    <span class="text-gray-700 font-medium">
      {{ user.firstName }} {{ user.lastName }}
    </span>
  </div>
</template>

<script setup lang="ts">
import type { User } from '~/features/shared/types/auth'

interface Props {
  user: User
}

defineProps<Props>()
</script>