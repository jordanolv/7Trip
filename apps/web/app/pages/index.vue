<script setup lang="ts">
const route = useRoute();
const left = computed(() => route.query.parti === '1');
useHead({ title: '7Trip · Vos voyages en groupe' });
</script>

<template>
  <div class="page">
    <SiteHeader />
    <TopoBanner />
    <section class="card lift">
      <p v-if="left" class="notice" role="status">Tu as quitté le voyage.</p>
      <h1 class="display">Des idées aujourd’hui, des souvenirs demain</h1>
      <p class="muted">
        Idées, sondages, planning, dépenses et documents : tout votre voyage de groupe au même endroit. L’app arrive bientôt sur
        iPhone et Android.
      </p>
    </section>
    <div class="stack">
      <CheckNote>Invité par un ami ? Ouvre simplement son lien : tu rejoins le voyage sans créer de compte.</CheckNote>
    </div>
  </div>
</template>

<style scoped>
.notice { margin: 0; font-weight: 600; color: var(--accent-ink); }
</style>
