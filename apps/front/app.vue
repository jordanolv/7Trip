<template>
  <div class="relative w-full h-screen overflow-hidden">
    <!-- Background image -->
    <img
      src="/bg.png"
      alt="Travel background"
      class="absolute inset-0 w-full h-full object-cover"
    />

    <!-- Overlay -->
    <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" />

    <!-- Centered content -->
    <div class="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
      <h1 class="text-5xl sm:text-6xl font-bold drop-shadow-lg">7Trip.co</h1>
      <p class="mt-4 text-2xl sm:text-3xl font-light drop-shadow-md">Coming soon</p>
    </div>
  </div>
</template>

<style>
html,
body {
  margin: 0;
  padding: 0;
}
</style>
