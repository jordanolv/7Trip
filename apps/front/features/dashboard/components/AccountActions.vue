<template>
  <div class="bg-white overflow-hidden shadow rounded-lg">
    <div class="px-4 py-5 sm:p-6">
      <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
        Actions du compte
      </h3>
      <div class="space-y-4">
        <PasswordManager 
          v-if="user.provider === 'google'" 
          @password-changed="handlePasswordChanged"
        />
        <GoogleLinker 
          v-if="user.provider === 'local'" 
          :user="user"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { User } from '~/features/shared/types/auth'

interface Props {
  user: User
}

defineProps<Props>()

const emit = defineEmits<{
  passwordChanged: []
}>()

const handlePasswordChanged = () => {
  emit('passwordChanged')
}
</script>