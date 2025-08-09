<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
    <div class="text-center text-white">
      <div class="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-full mb-4">
        <svg v-if="isLoading" class="animate-spin w-8 h-8 text-white" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        <svg v-else-if="error" class="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
        <svg v-else class="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      
      <h2 class="text-2xl font-bold mb-2">
        {{ isLoading ? 'Connexion en cours...' : error ? 'Erreur de connexion' : 'Connexion réussie !' }}
      </h2>
      
      <p class="text-white/70 mb-6">
        {{ isLoading ? 'Veuillez patienter' : error ? error : 'Redirection vers votre tableau de bord...' }}
      </p>

      <div v-if="error" class="flex justify-center space-x-4">
        <NuxtLink 
          to="/login" 
          class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Retour à la connexion
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false
})

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const isLoading = ref(true)
const error = ref('')

onMounted(async () => {
  const { access_token, refresh_token } = route.query

  if (!access_token || !refresh_token) {
    error.value = 'Tokens manquants'
    isLoading.value = false
    return
  }

  try {
    authStore.setTokens(access_token as string, refresh_token as string)
    
    await authStore.fetchProfile()
    
    if (process.client) {
      localStorage.setItem('accessToken', access_token as string)
      localStorage.setItem('refreshToken', refresh_token as string)
    }

    setTimeout(() => {
      router.push('/dashboard')
    }, 1500)

  } catch (err: any) {
    console.error('OAuth callback error:', err)
    error.value = 'Erreur lors de l\'authentification'
    isLoading.value = false
  }
})
</script>