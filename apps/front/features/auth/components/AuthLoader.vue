<template>
  <div class="fixed inset-0 z-50 bg-white/20 backdrop-blur-sm flex items-center justify-center">
    <div class="bg-white rounded-lg shadow-lg p-6 flex items-center space-x-3">
      <svg class="animate-spin w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
      <span class="text-gray-700 font-medium">Chargement...</span>
    </div>
  </div>
</template>