<template>
  <div class="border rounded-lg p-4">
    <h4 class="text-sm font-medium text-gray-900 mb-2">
      Compte Google
    </h4>
    
    <div v-if="user.googleId" class="flex items-center justify-between">
      <div>
        <p class="text-sm text-green-600 font-medium mb-1">
          ✓ Compte Google lié
        </p>
        <p class="text-sm text-gray-600">
          Vous pouvez vous connecter avec Google ou votre mot de passe.
        </p>
      </div>
      <div class="flex items-center">
        <svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
        </svg>
      </div>
    </div>
    
    <div v-else>
      <p class="text-sm text-gray-600 mb-3">
        Connectez votre compte Google pour une connexion plus rapide.
      </p>
      <BaseButton variant="secondary" size="sm" @click="handleLinkGoogle">
        <GoogleIcon class="w-4 h-4 mr-2" />
        Lier Google
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { User } from '~/features/shared/types/auth'

interface Props {
  user: User
}

defineProps<Props>()

const authStore = useAuthStore()
const config = useRuntimeConfig()
const router = useRouter()

const handleLinkGoogle = async () => {
  if (!authStore.isAuthenticated) {
    await authStore.initAuth()
  }
  
  const token = authStore.accessToken
  if (!token) {
    router.push('/login')
    return
  }
  
  window.location.href = `${config.public.apiBase}/auth/link-google?token=${token}`
}
</script>