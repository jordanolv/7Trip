<template>
  <div class="min-h-screen">
    <!-- Navigation -->
    <nav class="absolute top-0 left-0 right-0 z-50 bg-transparent">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-20">
          <NuxtLink to="/" class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <span class="text-xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">7</span>
            </div>
            <span class="text-xl font-bold text-white">Trip.co</span>
          </NuxtLink>

          <NuxtLink
            to="/login"
            class="text-white hover:text-orange-300 transition-colors font-medium"
          >
            Se connecter
          </NuxtLink>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <div class="flex min-h-screen">
      <!-- Left Side - Form -->
      <div class="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-20 relative">
        <!-- Background overlay for left side -->
        <div class="absolute inset-0 bg-white/90 backdrop-blur-sm lg:bg-white"></div>

        <div class="relative max-w-md w-full space-y-8">
          <div class="text-center">
            <h1 class="text-4xl font-bold text-gray-900 mb-4">Créer un compte</h1>
            <p class="text-lg text-gray-600">
              Rejoignez la communauté des voyageurs passionnés
            </p>
          </div>

          <div class="bg-white p-8 rounded-2xl shadow-2xl border border-gray-100">
            <form @submit.prevent="handleRegister" class="space-y-6">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    Prénom
                  </label>
                  <input
                    v-model="form.firstName"
                    type="text"
                    required
                    class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="John"
                  />
                </div>

                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">
                    Nom
                  </label>
                  <input
                    v-model="form.lastName"
                    type="text"
                    required
                    class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Adresse email
                </label>
                <input
                  v-model="form.email"
                  type="email"
                  required
                  class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  placeholder="votre@email.com"
                />
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Mot de passe
                </label>
                <input
                  v-model="form.password"
                  type="password"
                  required
                  class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
                <p class="text-xs text-gray-500 mt-1">Minimum 8 caractères</p>
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">
                  Confirmer le mot de passe
                </label>
                <input
                  v-model="form.confirmPassword"
                  type="password"
                  required
                  class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  :class="{ 'border-red-300 focus:ring-red-500': passwordMismatch }"
                  placeholder="••••••••"
                />
                <p v-if="passwordMismatch" class="text-xs text-red-500 mt-1">
                  Les mots de passe ne correspondent pas
                </p>
              </div>

              <div v-if="error" class="p-4 rounded-xl bg-red-50 border border-red-200">
                <p class="text-red-600 text-sm font-medium">{{ error }}</p>
              </div>

              <!-- Terms -->
              <div class="flex items-start space-x-3">
                <input
                  id="terms"
                  v-model="form.acceptTerms"
                  type="checkbox"
                  required
                  class="mt-1 h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-300 rounded"
                />
                <label for="terms" class="text-sm text-gray-600 leading-relaxed">
                  J'accepte les
                  <a href="#" class="text-orange-500 hover:text-orange-600 font-semibold">
                    conditions d'utilisation
                  </a>
                  et la
                  <a href="#" class="text-orange-500 hover:text-orange-600 font-semibold">
                    politique de confidentialité
                  </a>
                </label>
              </div>

              <button
                type="submit"
                :disabled="isLoading || !isFormValid"
                class="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 px-6 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                <span v-if="isLoading" class="inline-flex items-center">
                  <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Création...
                </span>
                <span v-else>Créer mon compte</span>
              </button>
            </form>

            <!-- Divider -->
            <div class="mt-8">
              <div class="relative">
                <div class="absolute inset-0 flex items-center">
                  <div class="w-full border-t border-gray-300"></div>
                </div>
                <div class="relative flex justify-center text-sm">
                  <span class="px-4 bg-white text-gray-500 font-medium">ou</span>
                </div>
              </div>
            </div>

            <!-- Google Registration -->
            <div class="mt-8">
              <a
                :href="`${$config.public.apiBase}/auth/google`"
                class="w-full inline-flex justify-center items-center px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-all duration-300 shadow-sm hover:shadow-md"
              >
                <svg class="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#fbbc04" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                S'inscrire avec Google
              </a>
            </div>
          </div>

          <!-- Footer Link -->
          <div class="text-center">
            <p class="text-gray-600">
              Déjà un compte ?
              <NuxtLink to="/login" class="text-orange-500 hover:text-orange-600 font-semibold transition-colors">
                Se connecter
              </NuxtLink>
            </p>
          </div>
        </div>
      </div>

      <!-- Right Side - Hero Image -->
      <div class="hidden lg:flex lg:flex-1 lg:relative">
        <div class="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
            alt="Adventure awaits"
            class="w-full h-full object-cover"
          />
          <div class="absolute inset-0 bg-gradient-to-l from-black/50 to-black/20"></div>
        </div>

        <!-- Content overlay -->
        <div class="relative h-full flex items-center justify-center p-12">
          <div class="text-center text-white max-w-lg">
            <h2 class="text-4xl font-bold mb-6">
              Commencez votre aventure
            </h2>
            <p class="text-xl opacity-90 mb-8">
              Rejoignez des milliers de voyageurs qui planifient déjà
              leurs prochaines escapades avec 7Trip.co.
            </p>

            <!-- Stats -->
            <div class="grid grid-cols-2 gap-8 mb-8">
              <div class="text-center">
                <div class="text-3xl font-bold text-orange-400">2.5K+</div>
                <div class="text-lg opacity-90">Membres actifs</div>
              </div>
              <div class="text-center">
                <div class="text-3xl font-bold text-orange-400">150+</div>
                <div class="text-lg opacity-90">Destinations</div>
              </div>
            </div>

            <!-- Benefits -->
            <div class="space-y-4">
              <div class="flex items-center space-x-3 text-left">
                <div class="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span class="text-lg">Inscription gratuite</span>
              </div>
              <div class="flex items-center space-x-3 text-left">
                <div class="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span class="text-lg">Outils de planification</span>
              </div>
              <div class="flex items-center space-x-3 text-left">
                <div class="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span class="text-lg">Communauté active</span>
              </div>
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
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  acceptTerms: false
})

const error = ref('')
const isLoading = computed(() => authStore.isLoading)

const passwordMismatch = computed(() => {
  return form.password && form.confirmPassword && form.password !== form.confirmPassword
})

const isFormValid = computed(() => {
  return form.firstName &&
         form.lastName &&
         form.email &&
         form.password &&
         form.confirmPassword &&
         form.password === form.confirmPassword &&
         form.acceptTerms &&
         form.password.length >= 8
})

const handleRegister = async () => {
  error.value = ''

  if (form.password !== form.confirmPassword) {
    error.value = 'Les mots de passe ne correspondent pas'
    return
  }

  if (form.password.length < 8) {
    error.value = 'Le mot de passe doit contenir au moins 8 caractères'
    return
  }

  try {
    await authStore.register({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      password: form.password
    })
    router.push('/')
  } catch (err: any) {
    console.error('Registration error:', err)
    error.value = err.data?.message || 'Erreur lors de la création du compte'
  }
}

onMounted(() => {
  if (authStore.isAuthenticated) {
    router.push('/')
  }
})
</script>