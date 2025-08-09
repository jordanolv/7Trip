export const useAuthGuard = () => {
  const authStore = useAuthStore()
  const router = useRouter()
  const isLoading = ref(true)

  const checkAuth = async () => {
    if (!authStore.isInitialized) {
      await authStore.initAuth()
    }
    
    isLoading.value = false
    
    if (!authStore.isAuthenticated) {
      await router.push('/login')
    }
  }

  onMounted(async () => {
    await checkAuth()
  })

  return {
    isLoading: readonly(isLoading),
    isAuthenticated: computed(() => authStore.isAuthenticated),
    user: computed(() => authStore.user)
  }
}