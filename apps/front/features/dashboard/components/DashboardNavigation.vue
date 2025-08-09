<template>
  <nav class="bg-white shadow-sm border-b">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex items-center">
          <h1 class="text-2xl font-bold text-gray-900">7Trip.co</h1>
        </div>
        <div class="flex items-center space-x-4">
          <UserProfile :user="user" />
          <BaseButton variant="secondary" size="sm" @click="handleLogout">
            Déconnexion
          </BaseButton>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import type { User } from '~/features/shared/types/auth'

interface Props {
  user: User
}

defineProps<Props>()

const emit = defineEmits<{
  logout: []
}>()

const handleLogout = () => {
  emit('logout')
}
</script>