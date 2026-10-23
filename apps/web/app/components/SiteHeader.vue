<script setup lang="ts">
defineProps<{ appHref?: string }>();
</script>

<template>
  <header class="header">
    <NuxtLink to="/" class="logo">7Trip</NuxtLink>
    <a v-if="appHref" :href="appHref" class="open">Ouvrir dans l’app</a>
  </header>
</template>

<style scoped>
.header {
  height: 56px;
  padding: 0 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--chip);
  background: var(--surface);
}
.logo { font-size: 22px; font-weight: 800; font-style: italic; letter-spacing: -0.03em; }
.open { font-size: 14px; font-weight: 700; color: var(--accent); }
</style>
