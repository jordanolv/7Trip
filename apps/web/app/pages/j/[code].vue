<script setup lang="ts">
import { DISPLAY_NAME_MAX_LENGTH, formatDateRange, formatDestinations, localIsoDate } from '@7trip/shared';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const route = useRoute();
const code = String(route.params.code ?? '');
const { appLink } = useRuntimeConfig().public;
const { data: preview, error } = await useFetch(`/api/invitations/${code}`);
// Opened from a shared poll (/s/<id>?j=<code>): back to that poll once joined.
const pollId = typeof route.query.sondage === 'string' && UUID.test(route.query.sondage) ? route.query.sondage : null;

// Joined from this browser already: straight to the trip, or the poll.
if (preview.value?.joined) await navigateTo(pollId ? `/s/${pollId}` : `/v/${preview.value.tripId}`, { replace: true });

const errorMessage = computed(() => (typeof route.query.erreur === 'string' ? route.query.erreur : null));
const name = ref(typeof route.query.nom === 'string' ? route.query.nom : '');
const summary = computed(() => {
  if (!preview.value) return '';
  const p = preview.value;
  return [
    formatDestinations(p.destinations),
    formatDateRange(p.startDate, p.endDate, localIsoDate()),
    `${p.participantCount} participant${p.participantCount > 1 ? 's' : ''}`,
  ]
    .filter(Boolean)
    .join(' · ');
});

useHead(() => ({
  title: preview.value ? `${preview.value.organizers.join(', ')} t’invite · ${preview.value.title}` : 'Invitation · 7Trip',
}));
</script>

<template>
  <div class="page">
    <SiteHeader :app-href="`${appLink}j/${code}`" />
    <TopoBanner />

    <section v-if="preview" class="card lift">
      <div class="row">
        <TripTile :color="preview.color" :icon="preview.icon" />
        <div>
          <p class="muted">{{ preview.organizers.join(', ') }} t’invite à rejoindre</p>
          <h1 class="title">{{ preview.title }}</h1>
        </div>
      </div>
      <div class="row">
        <AvatarStack :names="preview.organizers" :total="preview.participantCount" />
        <span class="muted">{{ summary }}</span>
      </div>

      <form method="post" :action="`/api/invitations/${code}/join`" class="form">
        <label for="pseudo" class="label">Comment t’appelles-tu ?</label>
        <input
          id="pseudo"
          v-model="name"
          name="displayName"
          class="field"
          type="text"
          required
          :maxlength="DISPLAY_NAME_MAX_LENGTH"
          autocomplete="given-name"
          autocapitalize="words"
          :aria-invalid="!!errorMessage"
          aria-describedby="pseudo-hint"
        />
        <p id="pseudo-hint" class="muted">Prénom ou pseudo, visible par le groupe.</p>
        <input v-if="pollId" type="hidden" name="sondage" :value="pollId" />
        <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
        <button type="submit" class="button">{{ pollId ? 'Rejoindre et voter' : 'Rejoindre le voyage' }}</button>
      </form>
    </section>

    <section v-else class="card lift">
      <h1 class="title">Ce lien n’est plus valable</h1>
      <p class="muted">
        {{ error?.statusCode === 404 ? 'L’organisateur a peut-être renouvelé le lien d’invitation. Demande-lui le nouveau.' : error?.message }}
      </p>
    </section>

    <div v-if="preview" class="stack">
      <CheckNote>Pas besoin de compte ni de l’app. Si tu crées un compte plus tard, ce que tu as fait te suit.</CheckNote>
      <p class="muted center">
        Déjà un compte ? <a :href="`${appLink}j/${code}`" class="link">Ouvrir dans l’app</a>
      </p>
    </div>
  </div>
</template>

<style scoped>
.form { display: flex; flex-direction: column; gap: 6px; }
.form .button { margin-top: 8px; }
.center { text-align: center; }
.link { font-weight: 700; color: var(--ink); text-decoration: underline; }
</style>
