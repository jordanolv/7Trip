<template>
  <div class="min-h-screen bg-neutral-50">
    <!-- Navigation -->
    <nav class="bg-white/95 backdrop-blur-md border-b border-neutral-200 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-20">
          <NuxtLink to="/" class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <span class="text-xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">7</span>
            </div>
            <span class="text-xl font-bold text-gray-900">Trip.co</span>
          </NuxtLink>

          <div class="flex items-center space-x-4">
            <NuxtLink
              to="/trips/create"
              class="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-full font-medium transition-colors shadow-lg hover:shadow-xl"
            >
              <svg class="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Créer un voyage
            </NuxtLink>
            <UserMenu :user="user" @logout="handleLogout" />
          </div>
        </div>
      </div>
    </nav>

    <main class="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="text-center mb-12">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">Mes voyages</h1>
        <p class="text-xl text-gray-600 max-w-2xl mx-auto">
          Gérez et revivez tous vos voyages passés et futurs
        </p>
      </div>

      <!-- Quick Stats -->
      <div v-if="trips.length > 0" class="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
        <div class="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 text-center">
          <div class="text-3xl font-bold text-orange-500 mb-2">{{ trips.length }}</div>
          <div class="text-sm text-gray-600">Voyage{{ trips.length > 1 ? 's' : '' }} total</div>
        </div>
        <div class="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 text-center">
          <div class="text-3xl font-bold text-blue-500 mb-2">{{ plannedTrips }}</div>
          <div class="text-sm text-gray-600">Planifié{{ plannedTrips > 1 ? 's' : '' }}</div>
        </div>
        <div class="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 text-center">
          <div class="text-3xl font-bold text-green-500 mb-2">{{ completedTrips }}</div>
          <div class="text-sm text-gray-600">Terminé{{ completedTrips > 1 ? 's' : '' }}</div>
        </div>
        <div class="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 text-center">
          <div class="text-3xl font-bold text-gray-500 mb-2">{{ publicTrips }}</div>
          <div class="text-sm text-gray-600">Public{{ publicTrips > 1 ? 's' : '' }}</div>
        </div>
      </div>

      <!-- Filter Bar -->
      <div v-if="trips.length > 0" class="flex flex-col sm:flex-row gap-4 mb-12">
        <div class="flex-1 relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Rechercher un voyage..."
            class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
          >
        </div>
        <select
          v-model="statusFilter"
          class="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
        >
          <option value="">Tous les statuts</option>
          <option value="draft">Brouillons</option>
          <option value="planned">Planifiés</option>
          <option value="ongoing">En cours</option>
          <option value="completed">Terminés</option>
        </select>
      </div>

      <!-- Trips Grid -->
      <div v-if="filteredTrips.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div
          v-for="trip in filteredTrips"
          :key="trip.id"
          class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group"
        >
          <!-- Cover Image -->
          <div class="relative h-48 overflow-hidden">
            <div
              v-if="trip.coverImage"
              class="w-full h-full bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
              :style="{ backgroundImage: `url(${trip.coverImage})` }"
            ></div>
            <div
              v-else
              class="w-full h-full bg-gradient-to-br from-primary-400 via-primary-500 to-secondary-500 flex items-center justify-center"
            >
              <svg class="w-12 h-12 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>

            <!-- Status Badge -->
            <div class="absolute top-3 left-3">
              <span
                class="px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm"
                :class="getStatusBadge(trip.status)"
              >
                {{ getStatusIcon(trip.status) }} {{ getStatusLabel(trip.status) }}
              </span>
            </div>

            <!-- Privacy Badge -->
            <div class="absolute top-3 right-3">
              <div
                class="w-8 h-8 rounded-full backdrop-blur-sm flex items-center justify-center"
                :class="trip.isPublic ? 'bg-success-500/20 text-success-100' : 'bg-neutral-500/20 text-neutral-100'"
                :title="trip.isPublic ? 'Voyage public' : 'Voyage privé'"
              >
                <svg v-if="trip.isPublic" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
          </div>

          <!-- Content -->
          <div class="p-6">
            <h3 class="text-xl font-bold text-gray-900 mb-2 truncate">{{ trip.title }}</h3>
            <p class="text-gray-600 mb-4 line-clamp-2">
              {{ trip.description || 'Aucune description disponible.' }}
            </p>

            <!-- Date Range -->
            <div class="flex items-center space-x-2 text-sm text-gray-500 mb-4">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{{ formatDateRange(trip.startDate, trip.endDate) }}</span>
            </div>

            <!-- Actions -->
            <div class="flex items-center justify-between">
              <button class="flex-1 mr-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium">
                Voir les détails
              </button>
              <button class="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!isLoading && trips.length === 0" class="text-center py-20">
        <div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-8">
          <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h3 class="text-2xl font-bold text-gray-900 mb-4">Aucun voyage pour le moment</h3>
        <p class="text-lg text-gray-600 mb-8 max-w-md mx-auto">
          Commencez votre aventure en créant votre premier voyage. Planifiez, organisez et partagez vos expériences !
        </p>
        <NuxtLink
          to="/trips/create"
          class="inline-flex items-center bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Créer mon premier voyage
        </NuxtLink>
      </div>

      <!-- No Results -->
      <div v-else-if="!isLoading && trips.length > 0 && filteredTrips.length === 0" class="text-center py-20">
        <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h3 class="text-xl font-bold text-gray-900 mb-2">Aucun résultat</h3>
        <p class="text-gray-600">Essayez de modifier vos filtres de recherche.</p>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="text-center py-20">
        <div class="inline-flex items-center space-x-3">
          <svg class="animate-spin h-8 w-8 text-orange-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <span class="text-lg text-gray-600">Chargement de vos voyages...</span>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false
})

const authStore = useAuthStore()
const router = useRouter()

interface Trip {
  id: string
  title: string
  description?: string
  startDate: string
  endDate: string
  coverImage?: string
  status: string
  isPublic: boolean
}

const user = computed(() => authStore.user)
const trips = ref<Trip[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const statusFilter = ref('')

const handleLogout = async () => {
  await authStore.logout()
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    draft: 'Brouillon',
    planned: 'Planifié',
    ongoing: 'En cours',
    completed: 'Terminé'
  }
  return labels[status] || status
}

const getStatusIcon = (status: string) => {
  const icons: Record<string, string> = {
    draft: '🗒️',
    planned: '✈️',
    ongoing: '🚀',
    completed: '✅'
  }
  return icons[status] || '📍'
}

const getStatusBadge = (status: string) => {
  const badges: Record<string, string> = {
    draft: 'bg-neutral-100/80 text-neutral-700 border border-neutral-200/50',
    planned: 'bg-primary-100/80 text-primary-700 border border-primary-200/50',
    ongoing: 'bg-secondary-100/80 text-secondary-700 border border-secondary-200/50',
    completed: 'bg-success-100/80 text-success-700 border border-success-200/50'
  }
  return badges[status] || 'bg-neutral-100/80 text-neutral-700 border border-neutral-200/50'
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

// Computed stats
const plannedTrips = computed(() => {
  return trips.value.filter((trip) => trip.status === 'planned').length
})

const completedTrips = computed(() => {
  return trips.value.filter((trip) => trip.status === 'completed').length
})

const publicTrips = computed(() => {
  return trips.value.filter((trip) => trip.isPublic).length
})

// Filtered trips
const filteredTrips = computed(() => {
  let filtered = trips.value

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter((trip) =>
      trip.title.toLowerCase().includes(query) ||
      trip.description?.toLowerCase().includes(query)
    )
  }

  // Filter by status
  if (statusFilter.value) {
    filtered = filtered.filter((trip) => trip.status === statusFilter.value)
  }

  return filtered
})

// Load user trips
onMounted(async () => {
  try {
    const config = useRuntimeConfig()

    const data = await $fetch('/trips/my-trips', {
      baseURL: config.public.apiBase,
      headers: {
        'Authorization': `Bearer ${authStore.accessToken}`
      }
    })

    trips.value = data
  } catch (error) {
    console.error('Error loading trips:', error)
  } finally {
    isLoading.value = false
  }
})
</script>