<script setup lang="ts">
import type { NuxtError } from '#app';

const props = defineProps<{ error: NuxtError }>();
</script>

<template>
  <div class="page">
    <SiteHeader />
    <TopoBanner />
    <section class="card lift">
      <h1 class="title">{{ props.error.statusCode === 404 ? 'Page introuvable' : 'Une erreur est survenue' }}</h1>
      <p class="muted">{{ props.error.statusCode === 404 ? 'Ce lien ne mène nulle part.' : 'Réessaie dans un instant.' }}</p>
      <NuxtLink to="/" class="button soft">Accueil</NuxtLink>
    </section>
  </div>
</template>
