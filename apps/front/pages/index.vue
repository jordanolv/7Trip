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
      <!-- Hero Section for Authenticated Users -->
      <div class="relative pt-24 pb-16">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <!-- Welcome Header -->
          <div class="text-center mb-12">
            <h1 class="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Bon retour, {{ user?.firstName }} ! 👋
            </h1>
            <p class="text-xl text-gray-600 max-w-2xl mx-auto">
              Découvrez les dernières aventures de la communauté ou créez votre prochain voyage.
            </p>
          </div>

          <!-- Quick Actions -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <NuxtLink to="/trips/create" class="group">
              <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <div class="h-32 bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                </div>
                <div class="p-6">
                  <h3 class="text-xl font-bold text-gray-900 mb-2">Nouveau voyage</h3>
                  <p class="text-gray-600">Planifiez votre prochaine aventure</p>
                </div>
              </div>
            </NuxtLink>

            <NuxtLink to="/trips/my-trips" class="group">
              <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <div class="h-32 bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
                <div class="p-6">
                  <h3 class="text-xl font-bold text-gray-900 mb-2">Mes voyages</h3>
                  <p class="text-gray-600">Gérez vos voyages existants</p>
                </div>
              </div>
            </NuxtLink>

            <div class="group cursor-pointer">
              <div class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <div class="h-32 bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                    </svg>
                  </div>
                </div>
                <div class="p-6">
                  <h3 class="text-xl font-bold text-gray-900 mb-2">Explorer</h3>
                  <p class="text-gray-600">Découvrez de nouvelles destinations</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Community Trips -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div class="text-center mb-12">
          <h2 class="text-3xl font-bold text-gray-900 mb-4">Voyages de la communauté</h2>
          <p class="text-lg text-gray-600">Inspirez-vous des dernières aventures partagées</p>
        </div>

        <div v-if="publicTrips.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div v-for="trip in publicTrips" :key="trip.id" class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer">
            <div class="relative h-48 overflow-hidden">
              <img
                v-if="trip.coverImage"
                :src="trip.coverImage"
                :alt="trip.title"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              >
              <div v-else class="w-full h-full bg-gradient-to-br from-orange-400 to-blue-500"></div>
              <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

              <!-- Status Badge -->
              <div class="absolute top-4 left-4">
                <span class="px-3 py-1 rounded-full text-xs font-medium bg-white/90 text-gray-800">
                  {{ getStatusLabel(trip.status) }}
                </span>
              </div>

              <!-- Creator -->
              <div class="absolute bottom-4 left-4 right-4">
                <p class="text-white/90 text-sm font-medium">par {{ trip.creator?.firstName }}</p>
              </div>
            </div>

            <div class="p-6">
              <h3 class="text-xl font-bold text-gray-900 mb-2 truncate">{{ trip.title }}</h3>
              <p class="text-gray-600 mb-4 line-clamp-2">{{ trip.description }}</p>
              <div class="flex items-center text-sm text-gray-500">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {{ formatDateRange(trip.startDate, trip.endDate) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else class="text-center py-20">
          <div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-8">
            <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h3 class="text-2xl font-bold text-gray-900 mb-4">Aucun voyage public</h3>
          <p class="text-lg text-gray-600 mb-8 max-w-md mx-auto">Soyez le premier à partager votre aventure avec la communauté !</p>
          <NuxtLink
            to="/trips/create"
            class="inline-flex items-center bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Créer mon premier voyage
          </NuxtLink>
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