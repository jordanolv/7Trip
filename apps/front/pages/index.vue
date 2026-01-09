<template>
  <div class="min-h-screen">
    <!-- Navigation -->
    <nav :class="isAuthenticated ? 'bg-white/95 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50' : 'absolute top-0 left-0 right-0 z-50 bg-transparent'">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-20">
          <NuxtLink to="/" class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <span class="text-xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">7</span>
            </div>
            <span class="text-xl font-bold" :class="isAuthenticated ? 'text-gray-900' : 'text-white'">Trip.co</span>
          </NuxtLink>

          <div v-if="!isAuthenticated" class="flex items-center space-x-4">
            <NuxtLink
              to="/login"
              class="text-white hover:text-orange-300 transition-colors font-medium"
            >
              Se connecter
            </NuxtLink>
            <NuxtLink
              to="/register"
              class="bg-white text-gray-900 px-6 py-2 rounded-full font-medium hover:bg-gray-100 transition-colors"
            >
              S'inscrire
            </NuxtLink>
          </div>

          <div v-else class="flex items-center space-x-4">
            <NuxtLink
              to="/trips/create"
              class="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-full font-medium transition-colors shadow-lg hover:shadow-xl"
            >
              Nouveau voyage
            </NuxtLink>
            <UserMenu :user="user" @logout="handleLogout" />
          </div>
        </div>
      </div>
    </nav>

    <!-- Hero Section -->
    <div v-if="!isAuthenticated" class="relative min-h-screen flex items-center">
      <!-- Background Image -->
      <div class="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2126&q=80"
          alt="Beautiful mountain landscape"
          class="w-full h-full object-cover"
        />
        <div class="absolute inset-0 bg-black/40"></div>
        <div class="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent"></div>
      </div>

      <!-- Hero Content -->
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div class="max-w-3xl">
          <div class="space-y-8">
            <!-- Badge -->
            <div class="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-2 text-white border border-white/20">
              <span class="w-2 h-2 bg-orange-500 rounded-full"></span>
              <span class="text-sm font-medium">Voyages inoubliables</span>
            </div>

            <!-- Main Heading -->
            <div class="space-y-4">
              <h1 class="text-5xl md:text-7xl font-bold text-white leading-tight">
                Des voyages
                <span class="italic text-orange-400 font-light"> inoubliables</span>
              </h1>
              <h2 class="text-xl md:text-2xl text-gray-200 font-light max-w-2xl">
                Découvrez des destinations extraordinaires.
                Anytime, anywhere.
              </h2>
            </div>

            <!-- CTA Button -->
            <div class="pt-4">
              <NuxtLink
                to="/register"
                class="inline-flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-xl"
              >
                <span>Commencer gratuitement</span>
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </NuxtLink>
            </div>

            <!-- Social Proof -->
            <div class="pt-8 space-y-4">
              <p class="text-gray-300 text-sm font-medium">Rejoint par plus de 2500+ voyageurs</p>
              <div class="flex items-center space-x-6">
                <div class="text-center">
                  <div class="text-2xl font-bold text-white">2.5K+</div>
                  <div class="text-xs text-gray-400">Voyages créés</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-white">150+</div>
                  <div class="text-xs text-gray-400">Destinations</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-white">4.9★</div>
                  <div class="text-xs text-gray-400">Note moyenne</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Scroll Indicator -->
      <div class="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div class="animate-bounce">
          <svg class="w-6 h-6 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>
    </div>

    <!-- Features Section -->
    <div v-if="!isAuthenticated" class="py-20 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Section Header -->
        <div class="text-center mb-16">
          <h2 class="text-4xl font-bold text-gray-900 mb-4">
            Une expérience voyage complète
          </h2>
          <p class="text-xl text-gray-600 max-w-3xl mx-auto">
            Découvrez une plateforme pensée pour simplifier chaque étape de vos
            aventures, de la planification au partage de souvenirs.
          </p>
        </div>

        <!-- Features Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <!-- Feature 1 -->
          <div class="text-center p-8 rounded-2xl hover:shadow-xl transition-all duration-300 group">
            <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-4">Destinations inspirantes</h3>
            <p class="text-gray-600 leading-relaxed">
              Explorez des destinations soigneusement sélectionnées et laissez-vous inspirer par
              les récits d'autres voyageurs.
            </p>
          </div>

          <!-- Feature 2 -->
          <div class="text-center p-8 rounded-2xl hover:shadow-xl transition-all duration-300 group">
            <div class="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-4">Planification intuitive</h3>
            <p class="text-gray-600 leading-relaxed">
              Organisez facilement vos itinéraires avec nos outils modernes. Ajoutez des activités,
              gérez votre budget et collaborez avec vos compagnons.
            </p>
          </div>

          <!-- Feature 3 -->
          <div class="text-center p-8 rounded-2xl hover:shadow-xl transition-all duration-300 group">
            <div class="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-4">Communauté active</h3>
            <p class="text-gray-600 leading-relaxed">
              Rejoignez une communauté de voyageurs passionnés. Partagez vos expériences et
              découvrez les conseils d'experts locaux.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Travel Categories Section -->
    <div v-if="!isAuthenticated" class="py-20 bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Section Header -->
        <div class="text-center mb-16">
          <div class="inline-block text-orange-500 font-semibold text-sm bg-orange-50 px-4 py-2 rounded-full mb-4">
            Plan your trip
          </div>
          <h2 class="text-4xl font-bold text-gray-900 mb-4">
            Let us plan you a perfect Holiday
          </h2>
        </div>

        <!-- Categories Grid -->
        <div class="grid grid-cols-2 md:grid-cols-5 gap-6">
          <!-- City Tours -->
          <div class="group cursor-pointer">
            <div class="relative overflow-hidden rounded-3xl aspect-square">
              <img
                src="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
                alt="City Tours"
                class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div class="absolute bottom-4 left-4 right-4">
                <div class="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mb-3">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 class="text-white font-bold text-lg">City Tours</h3>
                <p class="text-white/80 text-sm">5 Tours - From $68</p>
              </div>
            </div>
          </div>

          <!-- Beach -->
          <div class="group cursor-pointer">
            <div class="relative overflow-hidden rounded-3xl aspect-square">
              <img
                src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
                alt="Beaches"
                class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div class="absolute bottom-4 left-4 right-4">
                <div class="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mb-3">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                </div>
                <h3 class="text-white font-bold text-lg">Beaches</h3>
                <p class="text-white/80 text-sm">10 Tours - From $89</p>
              </div>
            </div>
          </div>

          <!-- Hiking -->
          <div class="group cursor-pointer">
            <div class="relative overflow-hidden rounded-3xl aspect-square">
              <img
                src="https://images.unsplash.com/photo-1551632811-561732d1e306?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
                alt="Hiking"
                class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div class="absolute bottom-4 left-4 right-4">
                <div class="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mb-3">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <h3 class="text-white font-bold text-lg">Hiking</h3>
                <p class="text-white/80 text-sm">4 Tours - From $59</p>
              </div>
            </div>
          </div>

          <!-- Cruises -->
          <div class="group cursor-pointer">
            <div class="relative overflow-hidden rounded-3xl aspect-square">
              <img
                src="https://images.unsplash.com/photo-1540979388789-6cee28a1cdc9?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
                alt="Cruises"
                class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div class="absolute bottom-4 left-4 right-4">
                <div class="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mb-3">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7a4 4 0 108 0M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 4v10a1 1 0 001 1h4a1 1 0 001-1V11M8 11H6a2 2 0 00-2 2v6a2 2 0 002 2h2m12-6V9a2 2 0 00-2-2h-2a2 2 0 00-2 2v8a2 2 0 002 2h2a2 2 0 002-2z" />
                  </svg>
                </div>
                <h3 class="text-white font-bold text-lg">Cruises</h3>
                <p class="text-white/80 text-sm">8 Tours - From $89</p>
              </div>
            </div>
          </div>

          <!-- Museums -->
          <div class="group cursor-pointer">
            <div class="relative overflow-hidden rounded-3xl aspect-square">
              <img
                src="https://images.unsplash.com/photo-1544552866-d3ed42536cfd?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
                alt="Museums"
                class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div class="absolute bottom-4 left-4 right-4">
                <div class="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mb-3">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                  </svg>
                </div>
                <h3 class="text-white font-bold text-lg">Museums</h3>
                <p class="text-white/80 text-sm">5 Tours - From $39</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Browse Categories Button -->
        <div class="text-center mt-12">
          <button class="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-full font-semibold transition-colors">
            Browse Categories →
          </button>
        </div>
      </div>
    </div>

    <!-- CTA Section -->
    <div v-if="!isAuthenticated" class="relative py-20 overflow-hidden">
      <!-- Background -->
      <div class="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
          alt="Happy traveler"
          class="w-full h-full object-cover"
        />
        <div class="absolute inset-0 bg-blue-600/80"></div>
      </div>

      <!-- Content -->
      <div class="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div class="space-y-8">
          <div class="inline-block text-orange-300 font-semibold text-sm bg-white/10 px-4 py-2 rounded-full mb-4">
            Make it memorable
          </div>
          <h2 class="text-4xl md:text-5xl font-bold text-white mb-6">
            We create the trips you love
          </h2>
          <p class="text-xl text-blue-100 max-w-2xl mx-auto mb-8">
            We take the best of what we've learned over our 25 years of
            experience as luxury travel agents and bring it all together to
            create bespoke luxury travel experiences.
          </p>
          <NuxtLink
            to="/register"
            class="inline-flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 transform hover:scale-105"
          >
            <span>Explore Our Tours</span>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Dashboard Section for Authenticated Users -->
    <div v-if="isAuthenticated" class="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">

      <!-- Bloc d'accueil simple -->
      <div class="relative pt-24 pb-8">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 class="text-4xl md:text-5xl font-bold text-gray-900 mb-8">
            Salut {{ user?.firstName }} 👋
          </h1>
        </div>
      </div>

      <!-- 2 colonnes principales -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">

          <!-- Colonne gauche : Mes voyages + Voyages communautaires (2/3) -->
          <div class="space-y-8 lg:col-span-2">

            <!-- Mes voyages en cours -->
            <div>
              <h2 class="text-3xl font-bold text-gray-900 mb-6">Mes voyages en cours</h2>

              <div class="grid grid-cols-1 gap-4">
                <!-- Mini-cards pour voyages en cours -->
                <div v-for="trip in ongoingTrips" :key="trip.id" class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer">
                  <div class="flex">
                    <div class="relative w-32 h-24 flex-shrink-0">
                      <img v-if="trip.coverImage" :src="trip.coverImage" :alt="trip.title" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                      <div v-else class="w-full h-full bg-gradient-to-br from-orange-400 to-blue-500"></div>
                      <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    </div>
                    <div class="p-4 flex-1">
                      <h3 class="text-lg font-bold text-gray-900 mb-1">{{ trip.title }}</h3>
                      <p class="text-sm text-gray-600 mb-3">{{ formatDateRange(trip.startDate, trip.endDate) }}</p>
                      <NuxtLink
                        :to="`/trips/${trip.id}`"
                        class="inline-block bg-orange-500 hover:bg-orange-600 text-white text-sm px-4 py-2 rounded-full font-medium transition-colors"
                      >
                        Continuer
                      </NuxtLink>
                    </div>
                  </div>
                </div>

                <!-- Empty state -->
                <div v-if="ongoingTrips.length === 0" class="text-center py-12 bg-white rounded-2xl border border-gray-100">
                  <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <p class="text-gray-600 mb-2">Aucun voyage en cours</p>
                  <p class="text-gray-400 text-sm">Créez votre premier voyage !</p>
                </div>
              </div>
            </div>

            <!-- Voyages communautaires -->
            <div>
              <h2 class="text-3xl font-bold text-gray-900 mb-6">Les plus likés cette semaine</h2>

              <div v-if="publicTrips.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <!-- Trip Card -->
                <div v-for="trip in publicTrips.slice(0, 6)" :key="trip.id" class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer">
                  <div class="relative h-40 overflow-hidden">
                    <img v-if="trip.coverImage" :src="trip.coverImage" :alt="trip.title" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                    <div v-else class="w-full h-full bg-gradient-to-br from-orange-400 to-blue-500"></div>
                    <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    <div class="absolute top-3 left-3">
                      <span class="px-3 py-1 rounded-full text-xs font-medium bg-white/90 text-gray-800">
                        {{ getStatusLabel(trip.status) }}
                      </span>
                    </div>
                    <!-- Creator -->
                    <div class="absolute bottom-3 left-3 right-3">
                      <p class="text-white/90 text-sm font-medium">par {{ trip.creator?.firstName }}</p>
                    </div>
                  </div>
                  <div class="p-4">
                    <h3 class="font-bold text-gray-900 mb-1 text-sm truncate">{{ trip.title }}</h3>
                    <p class="text-gray-600 mb-2 line-clamp-2 text-xs">{{ trip.description }}</p>
                    <div class="flex items-center text-xs text-gray-500">
                      <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {{ formatDateRange(trip.startDate, trip.endDate) }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Empty state -->
              <div v-else class="text-center py-12 bg-white rounded-2xl border border-gray-100">
                <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 class="text-xl font-bold text-gray-900 mb-2">Aucun voyage communautaire</h3>
                <p class="text-gray-600 mb-4">Soyez le premier à partager !</p>
                <NuxtLink
                  to="/trips/create"
                  class="inline-flex items-center bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-full font-medium transition-colors"
                >
                  Créer mon premier voyage
                </NuxtLink>
              </div>
            </div>

          </div>

          <!-- Colonne droite : Destination surprise + Carte du monde -->
          <div class="space-y-8">

            <!-- Destination surprise -->
            <div>
              <h2 class="text-3xl font-bold text-gray-900 mb-6">Destination surprise 🎲</h2>

              <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div class="text-center mb-6">
                  <p class="text-gray-600 mb-6">Laisse-nous te proposer une destination surprise !</p>

                  <!-- Filtres -->
                  <div class="grid grid-cols-1 gap-4 mb-6">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Continent</label>
                      <select v-model="surpriseFilters.continent" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                        <option value="">Tous les continents</option>
                        <option value="europe">Europe</option>
                        <option value="asia">Asie</option>
                        <option value="africa">Afrique</option>
                        <option value="america">Amérique</option>
                        <option value="oceania">Océanie</option>
                      </select>
                    </div>

                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">Type</label>
                      <select v-model="surpriseFilters.type" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                        <option value="">Tous types</option>
                        <option value="adventure">Aventure</option>
                        <option value="culture">Culture</option>
                        <option value="relax">Détente</option>
                        <option value="nature">Nature</option>
                        <option value="city">Ville</option>
                      </select>
                    </div>
                  </div>

                  <!-- Bouton de tirage -->
                  <button
                    @click="generateSurpriseDestination"
                    :disabled="isGenerating"
                    class="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:opacity-50 text-white px-6 py-3 rounded-full font-semibold transition-all duration-300 transform hover:scale-105"
                  >
                    <span v-if="isGenerating" class="flex items-center space-x-2">
                      <svg class="animate-spin w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Recherche...</span>
                    </span>
                    <span v-else class="flex items-center space-x-2">
                      <span>🎲</span>
                      <span>Surprise-moi !</span>
                    </span>
                  </button>
                </div>

                <!-- Résultat de la destination surprise -->
                <div v-if="surpriseDestination" class="border-t border-gray-200 pt-6">
                  <div class="text-center mb-4">
                    <h3 class="text-xl font-bold text-gray-900 mb-1">🎉 Ta destination :</h3>
                    <h4 class="text-2xl font-bold text-orange-500">{{ surpriseDestination.name }}</h4>
                  </div>

                  <div class="space-y-4">
                    <!-- Image de la destination -->
                    <div class="relative h-48 rounded-xl overflow-hidden">
                      <img :src="surpriseDestination.image" :alt="surpriseDestination.name" class="w-full h-full object-cover">
                      <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                      <div class="absolute bottom-3 left-3">
                        <p class="text-white font-semibold">{{ surpriseDestination.continent }}</p>
                      </div>
                    </div>

                    <!-- Informations -->
                    <div class="space-y-3">
                      <p class="text-gray-600 text-sm leading-relaxed">{{ surpriseDestination.description }}</p>

                      <div>
                        <h5 class="font-semibold text-gray-900 mb-2">Activités phares :</h5>
                        <ul class="space-y-1">
                          <li v-for="activity in surpriseDestination.activities.slice(0, 3)" :key="activity" class="flex items-center space-x-2 text-sm">
                            <span class="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                            <span class="text-gray-600">{{ activity }}</span>
                          </li>
                        </ul>
                      </div>

                      <button class="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-full font-semibold transition-colors">
                        Créer un voyage vers {{ surpriseDestination.name }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Carte du monde interactive -->
            <div>
              <h2 class="text-3xl font-bold text-gray-900 mb-6">Carte du monde 🌍</h2>

              <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <!-- World Map Container -->
                <div class="relative w-full h-64 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl overflow-hidden mb-4">
                  <!-- SVG World Map (simplified version) -->
                  <svg viewBox="0 0 1000 500" class="w-full h-full">
                    <!-- Background -->
                    <rect width="1000" height="500" fill="#e0f2fe"/>

                    <!-- Simplified continents -->
                    <!-- Europe -->
                    <path d="M 480 120 L 520 110 L 540 130 L 525 150 L 490 140 Z" fill="#64748b" stroke="#475569" stroke-width="1"/>

                    <!-- Asia -->
                    <path d="M 520 110 L 700 100 L 720 140 L 680 160 L 540 130 Z" fill="#64748b" stroke="#475569" stroke-width="1"/>

                    <!-- Africa -->
                    <path d="M 480 150 L 540 140 L 560 250 L 500 270 L 470 200 Z" fill="#64748b" stroke="#475569" stroke-width="1"/>

                    <!-- North America -->
                    <path d="M 200 120 L 350 100 L 380 180 L 320 200 L 180 160 Z" fill="#64748b" stroke="#475569" stroke-width="1"/>

                    <!-- South America -->
                    <path d="M 280 250 L 350 240 L 370 350 L 300 380 L 260 320 Z" fill="#64748b" stroke="#475569" stroke-width="1"/>

                    <!-- Australia -->
                    <path d="M 720 320 L 800 315 L 810 340 L 740 345 Z" fill="#64748b" stroke="#475569" stroke-width="1"/>

                    <!-- Interactive destination points -->
                    <g v-for="destination in worldDestinations" :key="destination.id">
                      <!-- Point lumineux -->
                      <circle
                        :cx="destination.x"
                        :cy="destination.y"
                        :r="destination.size"
                        :fill="destination.color"
                        class="animate-pulse cursor-pointer transition-all duration-300"
                        @click="showDestinationInfo(destination)"
                        @mouseenter="highlightDestination(destination)"
                        @mouseleave="unhighlightDestination()"
                      />

                      <!-- Glow effect -->
                      <circle
                        :cx="destination.x"
                        :cy="destination.y"
                        :r="destination.size + 2"
                        :fill="destination.color"
                        opacity="0.3"
                        class="animate-ping"
                      />
                    </g>

                    <!-- Tooltip -->
                    <g v-if="hoveredDestination" class="pointer-events-none">
                      <rect
                        :x="hoveredDestination.x - 40"
                        :y="hoveredDestination.y - 35"
                        width="80"
                        height="25"
                        fill="white"
                        stroke="#e5e7eb"
                        stroke-width="1"
                        rx="4"
                        class="drop-shadow-lg"
                      />
                      <text
                        :x="hoveredDestination.x"
                        :y="hoveredDestination.y - 20"
                        text-anchor="middle"
                        class="text-xs font-medium fill-gray-900"
                      >
                        {{ hoveredDestination.name }}
                      </text>
                      <text
                        :x="hoveredDestination.x"
                        :y="hoveredDestination.y - 8"
                        text-anchor="middle"
                        class="text-xs fill-gray-600"
                      >
                        {{ hoveredDestination.tripCount }} voyages
                      </text>
                    </g>
                  </svg>
                </div>

                <!-- Legend -->
                <div class="flex items-center justify-center space-x-4 mb-4">
                  <div class="flex items-center space-x-1">
                    <div class="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span class="text-xs text-gray-600">1-10</span>
                  </div>
                  <div class="flex items-center space-x-1">
                    <div class="w-3 h-3 bg-orange-600 rounded-full"></div>
                    <span class="text-xs text-gray-600">11-20</span>
                  </div>
                  <div class="flex items-center space-x-1">
                    <div class="w-4 h-4 bg-orange-700 rounded-full"></div>
                    <span class="text-xs text-gray-600">21+</span>
                  </div>
                </div>

                <!-- Destination Info Modal -->
                <div v-if="selectedDestination" class="bg-gradient-to-r from-orange-50 to-blue-50 rounded-xl p-4 border border-orange-200">
                  <div class="flex items-start justify-between mb-3">
                    <div>
                      <h3 class="text-lg font-bold text-gray-900">{{ selectedDestination.name }}</h3>
                      <p class="text-sm text-gray-600">{{ selectedDestination.country }}</p>
                    </div>
                    <button @click="selectedDestination = null" class="text-gray-400 hover:text-gray-600 transition-colors">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <p class="text-sm text-gray-700 mb-3">{{ selectedDestination.description }}</p>

                  <div class="flex items-center space-x-4 text-xs text-gray-600 mb-3">
                    <span class="flex items-center space-x-1">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      <span>{{ selectedDestination.tripCount }} voyages</span>
                    </span>
                    <span class="flex items-center space-x-1">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      <span>{{ selectedDestination.likes }} likes</span>
                    </span>
                  </div>

                  <button class="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-full font-medium text-sm transition-colors">
                    Voir les voyages vers {{ selectedDestination.name }}
                  </button>
                </div>
              </div>
            </div>

          </div>
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
const ongoingTrips = ref<Trip[]>([])

// Destination surprise
interface SurpriseDestination {
  name: string
  continent: string
  description: string
  image: string
  activities: string[]
}

const surpriseFilters = ref({
  continent: '',
  type: ''
})

const surpriseDestination = ref<SurpriseDestination | null>(null)
const isGenerating = ref(false)

// Carte du monde interactive
interface WorldDestination {
  id: number
  name: string
  country: string
  x: number
  y: number
  size: number
  color: string
  tripCount: number
  likes: number
  description: string
}

const worldDestinations = ref<WorldDestination[]>([
  {
    id: 1,
    name: "Paris",
    country: "France",
    x: 490,
    y: 135,
    size: 8,
    color: "#f97316", // orange-500
    tripCount: 23,
    likes: 156,
    description: "La Ville Lumière, capitale de l'amour et de la gastronomie française."
  },
  {
    id: 2,
    name: "Tokyo",
    country: "Japon",
    x: 720,
    y: 150,
    size: 7,
    color: "#ea580c", // orange-600
    tripCount: 18,
    likes: 134,
    description: "Métropole futuriste où tradition et modernité se rencontrent."
  },
  {
    id: 3,
    name: "New York",
    country: "États-Unis",
    x: 280,
    y: 150,
    size: 9,
    color: "#c2410c", // orange-700
    tripCount: 31,
    likes: 203,
    description: "La Big Apple, ville qui ne dort jamais et centre mondial des affaires."
  },
  {
    id: 4,
    name: "Bali",
    country: "Indonésie",
    x: 680,
    y: 280,
    size: 6,
    color: "#f97316", // orange-500
    tripCount: 15,
    likes: 98,
    description: "L'île des dieux, paradis tropical aux temples mystiques."
  },
  {
    id: 5,
    name: "Londres",
    country: "Royaume-Uni",
    x: 480,
    y: 120,
    size: 7,
    color: "#ea580c", // orange-600
    tripCount: 19,
    likes: 142,
    description: "Capitale britannique riche en histoire et culture."
  },
  {
    id: 6,
    name: "Sydney",
    country: "Australie",
    x: 780,
    y: 330,
    size: 6,
    color: "#f97316", // orange-500
    tripCount: 12,
    likes: 87,
    description: "Ville portuaire emblématique avec son opéra mondialement connu."
  },
  {
    id: 7,
    name: "Le Cap",
    country: "Afrique du Sud",
    x: 520,
    y: 310,
    size: 5,
    color: "#f97316", // orange-500
    tripCount: 8,
    likes: 65,
    description: "Ville spectaculaire entre montagne et océan."
  }
])

const selectedDestination = ref<WorldDestination | null>(null)
const hoveredDestination = ref<WorldDestination | null>(null)

// Sample destinations data (later to be replaced with API)
const destinationsDatabase = [
  {
    name: "Kyoto",
    continent: "Asie",
    description: "Ancienne capitale du Japon, Kyoto enchante par ses temples millénaires, ses jardins zen et ses quartiers de geishas. Une destination parfaite pour s'immerger dans la culture japonaise authentique.",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    activities: ["Visite des temples dorés", "Promenade dans le quartier de Gion", "Cérémonie du thé", "Jardins de bambous d'Arashiyama"],
    tags: ["culture", "asia"]
  },
  {
    name: "Reykjavik",
    continent: "Europe",
    description: "Capitale la plus septentrionale du monde, Reykjavik offre des paysages à couper le souffle, des sources chaudes naturelles et la magie des aurores boréales en hiver.",
    image: "https://images.unsplash.com/photo-1539635278303-d4002c07eae3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    activities: ["Sources chaudes du Blue Lagoon", "Chasse aux aurores boréales", "Exploration des geysers", "Route du Cercle d'Or"],
    tags: ["nature", "adventure", "europe"]
  },
  {
    name: "Marrakech",
    continent: "Afrique",
    description: "La ville rouge du Maroc vous séduira par ses souks colorés, sa médina historique et l'hospitalité légendaire de ses habitants. Une explosion de couleurs et de saveurs.",
    image: "https://images.unsplash.com/photo-1539650116574-75c0c6d5da8f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    activities: ["Exploration de la médina", "Shopping dans les souks", "Spectacle sur la place Jemaa el-Fna", "Excursion dans le désert"],
    tags: ["culture", "adventure", "africa"]
  },
  {
    name: "Bali",
    continent: "Asie",
    description: "L'île des dieux offre un mélange parfait entre plages paradisiaques, temples hindous, rizières en terrasses et une culture spirituelle unique.",
    image: "https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    activities: ["Yoga et méditation", "Visite des rizières de Tegallalang", "Temples d'Uluwatu", "Plages de sable noir"],
    tags: ["relax", "nature", "asia"]
  },
  {
    name: "Prague",
    continent: "Europe",
    description: "La ville aux cent clochers charme par son architecture gothique et baroque, ses ponts romantiques et son ambiance bohème unique en Europe centrale.",
    image: "https://images.unsplash.com/photo-1541849546-216549ae216d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    activities: ["Château de Prague", "Pont Charles au coucher du soleil", "Quartier juif", "Dégustation de bière tchèque"],
    tags: ["culture", "city", "europe"]
  },
  {
    name: "Costa Rica",
    continent: "Amérique",
    description: "Un petit pays avec une biodiversité extraordinaire, parfait pour les amoureux de la nature. Entre volcans, plages et forêts tropicales.",
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    activities: ["Observation des paresseux", "Volcans actifs", "Tyrolienne dans la canopée", "Plages des Caraïbes"],
    tags: ["nature", "adventure", "america"]
  }
]

// Methods
const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
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

const generateSurpriseDestination = async () => {
  isGenerating.value = true

  try {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Filter destinations based on selected criteria
    let filteredDestinations = destinationsDatabase

    if (surpriseFilters.value.continent) {
      const continentMap: Record<string, string> = {
        'europe': 'europe',
        'asia': 'asia',
        'africa': 'africa',
        'america': 'america',
        'oceania': 'oceania'
      }
      const mappedContinent = continentMap[surpriseFilters.value.continent]
      filteredDestinations = filteredDestinations.filter(dest =>
        dest.tags.includes(mappedContinent)
      )
    }


    if (surpriseFilters.value.type) {
      filteredDestinations = filteredDestinations.filter(dest =>
        dest.tags.includes(surpriseFilters.value.type)
      )
    }

    // If no destinations match, use all destinations
    if (filteredDestinations.length === 0) {
      filteredDestinations = destinationsDatabase
    }

    // Pick random destination
    const randomIndex = Math.floor(Math.random() * filteredDestinations.length)
    const selected = filteredDestinations[randomIndex]

    surpriseDestination.value = {
      name: selected.name,
      continent: selected.continent,
      description: selected.description,
      image: selected.image,
      activities: selected.activities
    }

  } catch (error) {
    console.error('Error generating surprise destination:', error)
  } finally {
    isGenerating.value = false
  }
}

const triggerSurpriseDestination = () => {
  generateSurpriseDestination()
}

// Carte du monde - fonctions d'interactivité
const showDestinationInfo = (destination: WorldDestination) => {
  selectedDestination.value = destination
}

const highlightDestination = (destination: WorldDestination) => {
  hoveredDestination.value = destination
}

const unhighlightDestination = () => {
  hoveredDestination.value = null
}

// Load trips data
const loadTripsData = async () => {
  try {
    const config = useRuntimeConfig()

    // Fetch user's ongoing trips
    const myTrips = await $fetch<Trip[]>('/trips/my-trips', {
      baseURL: config.public.apiBase,
      headers: {
        Authorization: `Bearer ${authStore.accessToken}`
      }
    })

    // Filter for ongoing trips (PLANNED and ONGOING status)
    ongoingTrips.value = myTrips.filter((trip: Trip) =>
      trip.status === 'planned' || trip.status === 'ongoing'
    )

    // Fetch public trips for community section
    const communityTrips = await $fetch<Trip[]>('/trips/public', {
      baseURL: config.public.apiBase
    })
    publicTrips.value = communityTrips.slice(0, 8) // Limit to 8 for the grid

  } catch (error) {
    console.error('Error loading trips:', error)
  }
}

// Load trips on mount
onMounted(async () => {
  if (isAuthenticated.value) {
    await loadTripsData()
  }
})
</script>