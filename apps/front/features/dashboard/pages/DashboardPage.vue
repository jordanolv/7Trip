<template>
  <div class="min-h-screen bg-gray-50">
    <DashboardNavigation :user="user" @logout="handleLogout" />

    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div class="px-4 py-6 sm:px-0">
        <StatusMessage 
          v-if="statusMessage.text"
          :message="statusMessage.text"
          :type="statusMessage.type"
        />
        
        <WelcomeCard :user="user" />
        <AccountInfo :user="user" />
        <AccountActions :user="user" @password-changed="handlePasswordChanged" />
      </div>
    </main>
  </div>
  
  <AuthLoader v-if="authGuard.isLoading.value" />
</template>

<script setup lang="ts">
definePageMeta({
  layout: false
})

const authGuard = useAuthGuard()
const authStore = useAuthStore()
const router = useRouter()

const user = computed(() => authStore.user!)

const statusMessage = reactive({
  text: '',
  type: 'success' as 'success' | 'error'
})

const handleLogout = async () => {
  await authStore.logout()
}

const handlePasswordChanged = async () => {
  await authStore.fetchProfile()
  showStatusMessage('Mot de passe défini avec succès !', 'success')
}

const showStatusMessage = (text: string, type: 'success' | 'error') => {
  statusMessage.text = text
  statusMessage.type = type
  setTimeout(() => {
    statusMessage.text = ''
  }, 3000)
}

onMounted(() => {
  const route = useRoute()
  const linkStatus = route.query.link
  
  if (linkStatus === 'success') {
    showStatusMessage('Compte Google lié avec succès !', 'success')
    router.replace({ query: {} })
  } else if (linkStatus === 'email_mismatch') {
    showStatusMessage('L\'email de votre compte Google doit correspondre à l\'email de votre compte local', 'error')
    router.replace({ query: {} })
  } else if (linkStatus === 'error') {
    showStatusMessage('Erreur lors de la liaison du compte Google', 'error')
    router.replace({ query: {} })
  }
})
</script>