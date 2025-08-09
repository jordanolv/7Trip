<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
    <div class="text-center text-white">
      <div class="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-full mb-4">
        <svg class="animate-spin w-8 h-8 text-white" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
      </div>
      <h2 class="text-2xl font-bold mb-2">Finalisation de la liaison...</h2>
      <p class="text-white/70">Veuillez patienter</p>
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

onMounted(async () => {
  const linkStatus = route.query.link
  
  await authStore.initAuth()
  
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  
  router.push(`/dashboard?link=${linkStatus}`)
})
</script>