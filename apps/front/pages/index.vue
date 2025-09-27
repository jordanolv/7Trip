<template>
  <div class="min-h-screen bg-neutral-50">
    <!-- Navigation -->
    <nav class="bg-white/95 backdrop-blur-md border-b border-neutral-200 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center">
            <NuxtLink to="/" class="flex items-center space-x-2">
              <div class="w-8 h-8 bg-gradient-to-r from-primary-600 to-secondary-600 rounded-lg flex items-center justify-center">
                <span class="text-white font-bold text-lg">7</span>
              </div>
              <span class="text-xl font-bold text-neutral-900">Trip.co</span>
            </NuxtLink>
          </div>

          <div v-if="!isAuthenticated" class="flex items-center space-x-3">
            <Button variant="ghost" to="/login" size="sm">
              Se connecter
            </Button>
            <Button variant="primary" to="/register" size="sm">
              S'inscrire
            </Button>
          </div>

          <div v-else class="flex items-center space-x-4">
            <Button variant="gradient" to="/trips/create" size="sm" icon="plus">
              Nouveau voyage
            </Button>
            <UserMenu :user="user" @logout="handleLogout" />
          </div>
        </div>
      </div>
    </nav>

    <!-- Hero Section -->
    <div v-if="!isAuthenticated" class="relative overflow-hidden">
      <!-- Modern gradient background -->
      <div class="absolute inset-0 bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-500"></div>
      <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>

      <!-- Floating elements -->
      <div class="absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl"></div>
      <div class="absolute bottom-20 right-10 w-96 h-96 bg-secondary-400/10 rounded-full blur-3xl"></div>

      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div class="text-center space-y-8">
          <div class="space-y-4">
            <h1 class="heading-xl text-white leading-tight">
              Planifiez vos
              <span class="text-gradient bg-gradient-to-r from-secondary-300 to-white bg-clip-text text-transparent">
                aventures
              </span>
              <br />
              en toute simplicité
            </h1>
            <p class="body-lg text-white/90 max-w-2xl mx-auto">
              Créez, organisez et partagez vos voyages avec une plateforme moderne
              pensée pour les explorateurs d'aujourd'hui.
            </p>
          </div>

          <div class="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Button variant="secondary" size="lg" to="/register" class="shadow-xl">
              Commencer gratuitement
            </Button>
            <Button variant="outline" size="lg" to="/login" class="border-white/30 text-white hover:bg-white/10">
              Se connecter
            </Button>
          </div>

          <!-- Stats -->
          <div class="grid grid-cols-3 gap-8 max-w-lg mx-auto pt-8">
            <div class="text-center">
              <div class="text-2xl font-bold text-white">2.5K+</div>
              <div class="text-sm text-white/70">Voyages créés</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-white">150+</div>
              <div class="text-sm text-white/70">Destinations</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-white">4.9★</div>
              <div class="text-sm text-white/70">Note moyenne</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Dashboard Section for Authenticated Users -->
    <div v-if="isAuthenticated" class="py-12">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <!-- Welcome Header -->
        <div class="mb-12">
          <h1 class="heading-lg text-neutral-900 mb-2">
            Bon retour, {{ user?.firstName }} ! 👋
          </h1>
          <p class="body-md text-neutral-600">
            Découvrez les dernières aventures de la communauté ou créez votre prochain voyage.
          </p>
        </div>

        <!-- Quick Actions -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card variant="elevated" hover clickable class="group">
            <template #image>
              <div class="h-32 bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
              </div>
            </template>
            <div class="p-6">
              <h3 class="text-lg font-semibold text-neutral-900 mb-2">Nouveau voyage</h3>
              <p class="text-neutral-600 text-sm">Planifiez votre prochaine aventure</p>
            </div>
          </Card>

          <Card variant="elevated" hover clickable class="group">
            <template #image>
              <div class="h-32 bg-gradient-to-br from-secondary-500 to-secondary-600 flex items-center justify-center">
                <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
              </div>
            </template>
            <div class="p-6">
              <h3 class="text-lg font-semibold text-neutral-900 mb-2">Mes voyages</h3>
              <p class="text-neutral-600 text-sm">Gérez vos voyages existants</p>
            </div>
          </Card>

          <Card variant="elevated" hover clickable class="group">
            <template #image>
              <div class="h-32 bg-gradient-to-br from-success-500 to-success-600 flex items-center justify-center">
                <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                  </svg>
                </div>
              </div>
            </template>
            <div class="p-6">
              <h3 class="text-lg font-semibold text-neutral-900 mb-2">Explorer</h3>
              <p class="text-neutral-600 text-sm">Découvrez de nouvelles destinations</p>
            </div>
          </Card>
        </div>

        <!-- Recent Community Trips -->
        <div>
          <div class="flex items-center justify-between mb-8">
            <div>
              <h2 class="heading-md text-neutral-900 mb-2">Voyages de la communauté</h2>
              <p class="text-neutral-600">Inspirez-vous des dernières aventures partagées</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card v-for="trip in publicTrips" :key="trip.id" variant="travel" hover clickable class="group">
              <template #image>
                <div class="relative h-48 overflow-hidden">
                  <img
                    v-if="trip.coverImage"
                    :src="trip.coverImage"
                    :alt="trip.title"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  >
                  <div v-else class="w-full h-full bg-gradient-to-br from-primary-400 to-secondary-500"></div>
                  <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

                  <!-- Status Badge -->
                  <div class="absolute top-4 left-4">
                    <span class="px-2 py-1 rounded-full text-xs font-medium bg-white/90 text-neutral-800">
                      {{ getStatusLabel(trip.status) }}
                    </span>
                  </div>

                  <!-- Creator -->
                  <div class="absolute bottom-4 left-4 right-4">
                    <p class="text-white/90 text-sm">par {{ trip.creator?.firstName }}</p>
                  </div>
                </div>
              </template>

              <div class="p-6">
                <h3 class="text-lg font-semibold text-neutral-900 mb-2 line-clamp-1">{{ trip.title }}</h3>
                <p class="text-neutral-600 text-sm mb-4 line-clamp-2">{{ trip.description }}</p>
                <div class="flex items-center text-xs text-neutral-500">
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {{ formatDateRange(trip.startDate, trip.endDate) }}
                </div>
              </div>
            </Card>

            <!-- Empty state -->
            <div v-if="publicTrips.length === 0" class="col-span-full">
              <Card padding="lg" class="text-center">
                <div class="py-12">
                  <div class="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h3 class="text-lg font-medium text-neutral-900 mb-2">Aucun voyage public</h3>
                  <p class="text-neutral-600 mb-6">Soyez le premier à partager votre aventure avec la communauté !</p>
                  <Button variant="primary" to="/trips/create">
                    Créer mon premier voyage
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>


    <!-- Features Section (only for non-authenticated) -->
    <div v-if="!isAuthenticated" class="py-20 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="heading-lg text-neutral-900 mb-4">
            Une expérience voyage complète
          </h2>
          <p class="body-lg text-neutral-600 max-w-2xl mx-auto">
            Découvrez une plateforme pensée pour simplifier chaque étape de vos aventures,
            de la planification au partage de souvenirs.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card variant="elevated" hover class="text-center group">
            <div class="p-8">
              <div class="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
              <h3 class="text-xl font-semibold text-neutral-900 mb-3">Destinations inspirantes</h3>
              <p class="text-neutral-600 leading-relaxed">
                Explorez des destinations soigneusement sélectionnées et laissez-vous inspirer
                par les récits d'autres voyageurs.
              </p>
            </div>
          </Card>

          <Card variant="elevated" hover class="text-center group">
            <div class="p-8">
              <div class="w-16 h-16 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h2m0-8V9m0 0h2m-2 0v6m6-6h2a2 2 0 012 2v6a2 2 0 01-2 2h-2m0-8V9m0 0v6"/>
                </svg>
              </div>
              <h3 class="text-xl font-semibold text-neutral-900 mb-3">Planification intuitive</h3>
              <p class="text-neutral-600 leading-relaxed">
                Organisez facilement vos itinéraires avec nos outils modernes.
                Ajoutez des activités, gérez votre budget et collaborez avec vos compagnons.
              </p>
            </div>
          </Card>

          <Card variant="elevated" hover class="text-center group">
            <div class="p-8">
              <div class="w-16 h-16 bg-gradient-to-br from-success-500 to-success-600 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
              </div>
              <h3 class="text-xl font-semibold text-neutral-900 mb-3">Communauté active</h3>
              <p class="text-neutral-600 leading-relaxed">
                Rejoignez une communauté de voyageurs passionnés. Partagez vos expériences
                et découvrez les conseils d'experts locaux.
              </p>
            </div>
          </Card>
        </div>

        <!-- CTA Section -->
        <div class="text-center mt-16">
          <Card variant="elevated" class="max-w-4xl mx-auto">
            <div class="p-12 bg-gradient-to-r from-primary-50 to-secondary-50">
              <h3 class="heading-md text-neutral-900 mb-4">
                Prêt pour votre prochaine aventure ?
              </h3>
              <p class="body-md text-neutral-600 mb-8 max-w-2xl mx-auto">
                Rejoignez des milliers de voyageurs qui utilisent déjà 7Trip.co
                pour planifier leurs escapades inoubliables.
              </p>
              <div class="flex flex-col sm:flex-row justify-center items-center gap-4">
                <Button variant="gradient" size="lg" to="/register">
                  Créer mon compte gratuitement
                </Button>
                <Button variant="outline" size="lg" to="/login">
                  J'ai déjà un compte
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const authStore = useAuthStore()

const isAuthenticated = computed(() => authStore.isAuthenticated)
const user = computed(() => {
  const authUser = authStore.user
  if (!authUser) return null
  return {
    ...authUser,
    fullName: `${authUser.firstName} ${authUser.lastName || ''}`.trim()
  }
})

// Public trips
interface Trip {
  id: number
  title: string
  description: string
  startDate: string
  endDate: string
  status: string
  coverImage?: string
  creator?: {
    firstName: string
  }
}

const publicTrips = ref<Trip[]>([])

// Methods
const getStatusLabel = (status: string) => {
  const labels = {
    draft: 'Brouillon',
    planned: 'Planifié',
    ongoing: 'En cours',
    completed: 'Terminé'
  }
  return labels[status] || status
}

const formatDateRange = (startDate: string, endDate: string) => {
  const start = new Date(startDate).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short'
  })
  const end = new Date(endDate).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short'
  })
  return `${start} - ${end}`
}

const handleLogout = async () => {
  await authStore.logout()
}

// Load public trips on mount
onMounted(async () => {
  if (isAuthenticated.value) {
    try {
      // TODO: Fetch public trips from API
      console.log('Loading public trips...')
    } catch (error) {
      console.error('Error loading trips:', error)
    }
  }
})
</script>