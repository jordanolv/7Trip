<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
    <!-- Navigation -->
    <nav class="relative z-10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center">
            <h1 class="text-2xl font-bold text-white">7Trip.co</h1>
          </div>
          <div v-if="!isAuthenticated" class="flex items-center space-x-4">
            <NuxtLink 
              to="/login"
              class="text-white hover:text-white/80 px-3 py-2 text-sm font-medium"
            >
              Se connecter
            </NuxtLink>
            <NuxtLink 
              to="/register"
              class="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
            >
              S'inscrire
            </NuxtLink>
          </div>
          <div v-else class="flex items-center space-x-4">
            <span class="text-white/90">Bonjour {{ user?.firstName }} !</span>
            <NuxtLink 
              to="/dashboard"
              class="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
            >
              Tableau de bord
            </NuxtLink>
          </div>
        </div>
      </div>
    </nav>

    <!-- Hero Section -->
    <div class="relative">
      <!-- Background overlay -->
      <div class="absolute inset-0 bg-black/20"></div>
      
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div class="text-center">
          <h1 class="text-4xl md:text-6xl font-bold text-white mb-6">
            Bienvenue sur
            <span class="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              7Trip.co
            </span>
          </h1>
          
          <p class="text-xl text-white/90 mb-8 max-w-3xl mx-auto">
            Votre plateforme de voyage ultime. Découvrez, planifiez et vivez des aventures inoubliables.
          </p>
          
          <div class="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <NuxtLink 
              v-if="!isAuthenticated"
              to="/register"
              class="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Commencer maintenant
            </NuxtLink>
            <NuxtLink 
              v-else
              to="/dashboard"
              class="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Accéder au tableau de bord
            </NuxtLink>
            <NuxtLink 
              v-if="!isAuthenticated"
              to="/login"
              class="w-full sm:w-auto bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 border border-white/20"
            >
              Se connecter
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <!-- Features Section -->
    <div class="relative py-16">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-3xl font-bold text-white mb-4">
            Pourquoi choisir 7Trip.co ?
          </h2>
          <p class="text-white/80 text-lg max-w-2xl mx-auto">
            Une plateforme complète pour tous vos besoins de voyage
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div class="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-white mb-2">Destinations uniques</h3>
            <p class="text-white/70">
              Découvrez des destinations extraordinaires sélectionnées par nos experts.
            </p>
          </div>

          <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div class="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h2m0-8V9m0 0h2m-2 0v6m6-6h2a2 2 0 012 2v6a2 2 0 01-2 2h-2m0-8V9m0 0v6"/>
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-white mb-2">Planification facile</h3>
            <p class="text-white/70">
              Organisez vos voyages en quelques clics avec nos outils intuitifs.
            </p>
          </div>

          <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div class="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-white mb-2">Prix transparents</h3>
            <p class="text-white/70">
              Aucun frais caché, des prix clairs et compétitifs pour tous vos voyages.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const authStore = useAuthStore()

const isAuthenticated = computed(() => authStore.isAuthenticated)
const user = computed(() => authStore.user)
</script>