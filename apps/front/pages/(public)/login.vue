<template>
  <div class="min-h-screen bg-neutral-50">
    <!-- Navigation -->
    <nav class="bg-white/95 backdrop-blur-md border-b border-neutral-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <NuxtLink to="/" class="flex items-center space-x-2">
            <div class="w-8 h-8 bg-gradient-to-r from-primary-600 to-secondary-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-lg">7</span>
            </div>
            <span class="text-xl font-bold text-neutral-900">Trip.co</span>
          </NuxtLink>

          <Button variant="ghost" to="/register" size="sm">
            Pas de compte ? S'inscrire
          </Button>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <div class="flex min-h-[calc(100vh-64px)]">
      <!-- Left Side - Form -->
      <div class="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div class="max-w-md w-full space-y-8">
          <div class="text-center">
            <h1 class="heading-lg text-neutral-900 mb-2">Bon retour !</h1>
            <p class="body-md text-neutral-600">
              Connectez-vous pour accéder à vos voyages
            </p>
          </div>

          <Card variant="elevated" padding="lg">
            <form @submit.prevent="handleLogin" class="space-y-6">
              <Input
                v-model="form.email"
                type="email"
                label="Adresse email"
                placeholder="votre@email.com"
                required
                size="lg"
              />

              <Input
                v-model="form.password"
                type="password"
                label="Mot de passe"
                placeholder="••••••••"
                required
                size="lg"
              />

              <div v-if="error" class="p-4 rounded-lg bg-error-50 border border-error-200">
                <p class="text-error-600 text-sm">{{ error }}</p>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                :loading="isLoading"
                full-width
              >
                Se connecter
              </Button>
            </form>

            <!-- Divider -->
            <div class="mt-6">
              <div class="relative">
                <div class="absolute inset-0 flex items-center">
                  <div class="w-full border-t border-neutral-200"></div>
                </div>
                <div class="relative flex justify-center text-sm">
                  <span class="px-2 bg-white text-neutral-500">ou</span>
                </div>
              </div>
            </div>

            <!-- Google Login -->
            <div class="mt-6">
              <a
                :href="`${$config.public.apiBase}/auth/google`"
                class="w-full inline-flex justify-center items-center px-4 py-3 border border-neutral-300 rounded-lg bg-white text-neutral-700 font-medium hover:bg-neutral-50 transition-colors shadow-sm"
              >
                <svg class="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#fbbc04" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuer avec Google
              </a>
            </div>
          </Card>

          <!-- Footer Link -->
          <div class="text-center">
            <p class="text-neutral-600">
              Pas encore de compte ?
              <NuxtLink to="/register" class="text-primary-600 hover:text-primary-700 font-medium">
                Créer un compte gratuitement
              </NuxtLink>
            </p>
          </div>
        </div>
      </div>

      <!-- Right Side - Hero Image -->
      <div class="hidden lg:flex lg:flex-1 lg:relative">
        <div class="absolute inset-0 bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-500">
          <!-- Travel themed background -->
          <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>

          <!-- Floating elements -->
          <div class="absolute top-1/4 left-1/4 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
          <div class="absolute bottom-1/3 right-1/4 w-48 h-48 bg-secondary-400/20 rounded-full blur-2xl"></div>

          <!-- Content overlay -->
          <div class="relative h-full flex items-center justify-center p-12">
            <div class="text-center text-white">
              <h2 class="text-3xl font-bold mb-4">
                Vos aventures vous attendent
              </h2>
              <p class="text-lg opacity-90 max-w-md">
                Accédez à tous vos voyages, découvrez de nouvelles destinations
                et partagez vos expériences avec la communauté.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false
})

const authStore = useAuthStore()
const router = useRouter()

const form = reactive({
  email: '',
  password: ''
})

const error = ref('')
const isLoading = computed(() => authStore.isLoading)

const handleLogin = async () => {
  error.value = ''

  try {
    await authStore.login(form)
    router.push('/')
  } catch (err: any) {
    console.error('Login error:', err)
    error.value = err.data?.message || 'Erreur de connexion'
  }
}

onMounted(() => {
  if (authStore.isAuthenticated) {
    router.push('/')
  }
})
</script>