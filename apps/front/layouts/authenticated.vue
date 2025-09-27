<template>
  <div>
    <slot />
  </div>
</template>

<script setup lang="ts">
// Middleware pour toutes les pages authenticated
definePageMeta({
  middleware: 'auth'
})
</script>