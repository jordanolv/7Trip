<script setup lang="ts">
import { formatDateRange, formatDestinations, localIsoDate } from '@7trip/shared';

const route = useRoute();
const tripId = String(route.params.tripId ?? '');
const { data, error } = await useFetch(`/api/trips/${tripId}`);
const today = localIsoDate();
const leaveError = computed(() => (typeof route.query.erreur === 'string' ? route.query.erreur : null));

const trip = computed(() => data.value?.trip ?? null);
const me = computed(() => trip.value?.participants.find((p) => p.isMe));
const subtitle = computed(() =>
  trip.value
    ? [formatDateRange(trip.value.startDate, trip.value.endDate, today) ?? 'Dates à décider', formatDestinations(trip.value.destinations)]
        .filter(Boolean)
        .join(' · ')
    : '',
);

useHead(() => ({ title: trip.value ? `${trip.value.title} · 7Trip` : 'Voyage · 7Trip' }));
</script>

<template>
  <div class="page">
    <SiteHeader :app-href="data?.appHandoff" />
    <TopoBanner />

    <template v-if="trip">
      <section class="card lift">
        <div class="row">
          <TripTile :color="trip.color" :icon="trip.icon" />
          <div>
            <h1 class="title">{{ trip.title }}</h1>
            <p class="muted">{{ subtitle }}</p>
          </div>
        </div>
        <p class="welcome">Tu as rejoint le voyage{{ me ? `, ${me.displayName}` : '' }}.</p>
      </section>

      <section class="card block">
        <h2 class="label">Participants · {{ trip.participantCount }}</h2>
        <ul class="people">
          <li v-for="p in trip.participants" :key="p.id" class="person">
            <span>{{ p.displayName }}{{ p.isMe ? ' (toi)' : '' }}</span>
            <span class="chip" :class="{ dark: p.role === 'ORGANIZER' }">
              {{ p.role === 'ORGANIZER' ? 'Organisateur' : p.isGuest ? 'Invité' : 'Participant' }}
            </span>
          </li>
        </ul>
      </section>

      <section class="card block">
        <h2 class="label">Sondages</h2>
        <p class="muted">Les votes du groupe arriveront ici : tu pourras voter depuis cette page, sans compte.</p>
      </section>

      <div class="stack">
        <a :href="data?.appHandoff" class="button">Continuer dans l’app</a>
        <CheckNote>Dans l’app, crée ton compte : tu retrouveras ce voyage et tout ce que tu y as fait.</CheckNote>
        <form method="post" :action="`/api/trips/${trip.id}/leave`" onsubmit="return confirm('Quitter ce voyage ? Tu n’y auras plus accès.')">
          <button type="submit" class="button danger">Quitter le voyage</button>
        </form>
        <p v-if="leaveError" class="error" role="alert">Impossible de quitter le voyage : {{ leaveError }}</p>
      </div>
    </template>

    <section v-else class="card lift">
      <h1 class="title">Voyage introuvable</h1>
      <p class="muted">{{ error?.message ?? 'Tu ne fais plus partie de ce voyage.' }} Pour le rejoindre à nouveau, demande un lien d’invitation.</p>
    </section>
  </div>
</template>

<style scoped>
.welcome { margin: 0; font-weight: 600; color: var(--accent-ink); }
.block { margin: 14px 16px 0; }
.people { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.person { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-weight: 600; }
.chip { border-radius: 999px; padding: 4px 9px; font-size: 11px; font-weight: 700; background: var(--chip); color: var(--ink-tertiary); }
.chip.dark { background: var(--ink); color: var(--surface); }
</style>
