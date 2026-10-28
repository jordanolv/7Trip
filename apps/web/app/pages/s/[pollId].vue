<script setup lang="ts">
import { authorName, parseInvitationCode, pollLeaders, votesLabel } from '@7trip/shared';

const route = useRoute();
const pollId = String(route.params.pollId ?? '');
const { data, error } = await useFetch(`/api/polls/${pollId}`);

// Not in the trip from this browser yet: the link carries the invitation when the sharer could invite.
const code = typeof route.query.j === 'string' ? parseInvitationCode(route.query.j) : null;
if (!data.value && error.value?.statusCode === 404 && code) {
  await navigateTo(`/j/${code}?${new URLSearchParams({ sondage: pollId }).toString()}`, { replace: true });
}

const poll = computed(() => data.value?.poll ?? null);
const trip = computed(() => data.value?.trip ?? null);
const me = computed(() => trip.value?.participants.find((p) => p.isMe) ?? null);
const voteError = computed(() => (typeof route.query.erreur === 'string' ? route.query.erreur : null));
const editing = computed(() => !!poll.value && !poll.value.closed && (!poll.value.hasVoted || route.query.modifier === '1'));
const justVoted = computed(() => route.query.vote === '1');
const leaders = computed(() => (poll.value ? pollLeaders(poll.value.options) : []));
const applied = computed(() => poll.value?.options.find((o) => o.id === poll.value?.appliedOptionId) ?? null);

const details = computed(() => {
  const p = poll.value;
  if (!p) return '';
  const deadline = p.closed ? 'Clos' : p.closesAt ? `clôture ${deadlineLabel(p.closesAt)}` : null;
  return [p.multiple ? 'Plusieurs choix possibles' : 'Un seul choix', deadline].filter(Boolean).join(' · ');
});
const until = computed(() => (poll.value?.closesAt ? `jusqu’au ${deadlineLabel(poll.value.closesAt)}` : 'tant que le sondage est ouvert'));

useHead(() => ({ title: poll.value ? `${poll.value.question} · 7Trip` : 'Sondage · 7Trip' }));
</script>

<template>
  <div class="page">
    <SiteHeader :app-href="data?.appHandoff" />

    <main v-if="poll && trip" class="content">
      <div>
        <p class="muted">{{ trip.title }} · sondage de {{ authorName(poll.author) }}</p>
        <h1 class="display question">{{ poll.question }}</h1>
        <p class="muted">{{ details }}</p>
      </div>

      <form v-if="editing" method="post" :action="`/api/polls/${poll.id}/vote`" class="options">
        <label v-for="option in poll.options" :key="option.id" class="option">
          <input :type="poll.multiple ? 'checkbox' : 'radio'" name="o" :value="option.id" :checked="option.mine" class="input" />
          <span class="optionLabel">{{ option.label }}</span>
          <span class="box" :class="poll.multiple ? 'square' : 'round'" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10" /></svg>
          </span>
        </label>
        <p v-if="voteError" class="error" role="alert">{{ voteError }}</p>
        <button type="submit" class="button send">{{ poll.hasVoted ? 'Modifier mon vote' : 'Envoyer mon vote' }}</button>
        <NuxtLink v-if="poll.hasVoted" :to="`/s/${poll.id}`" class="cancel">Annuler</NuxtLink>
      </form>

      <section v-else-if="!poll.closed" class="card thanks">
        <span class="tick" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22553F" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10" /></svg>
        </span>
        <h2 class="title">{{ justVoted ? `Merci${me ? ` ${me.displayName}` : ''}, ton vote est pris en compte` : 'Tu as voté' }}</h2>
        <p class="text">Tu peux le modifier {{ until }} en revenant sur ce lien.</p>
        <NuxtLink :to="`/s/${poll.id}?modifier=1`" class="outline">Modifier mon vote</NuxtLink>
      </section>

      <p v-if="voteError && !editing" class="error" role="alert">{{ voteError }}</p>

      <section v-if="poll.resultsVisible && !editing" class="card">
        <h2 class="label">{{ poll.closed ? 'Résultats' : 'Résultats provisoires' }}</h2>
        <div v-for="option in poll.options" :key="option.id" class="result">
          <div class="resultTop">
            <span class="resultLabel">{{ option.label }}</span>
            <span class="count">{{ votesLabel(option.votes ?? 0) }}</span>
          </div>
          <div class="track">
            <div class="fill" :class="{ lead: leaders.includes(option) }" :style="{ width: `${poll.eligibleCount ? ((option.votes ?? 0) / poll.eligibleCount) * 100 : 0}%` }" />
          </div>
          <AvatarStack v-if="option.voters?.length" :names="option.voters.map((v) => v.displayName)"
            :colors="option.voters.map((v) => v.avatarColor)"
            :total="option.voters.length" />
        </div>
        <p v-if="applied" class="applied">Retenu par l’organisateur : {{ applied.label }}</p>
      </section>

      <p class="muted">
        {{ poll.voterCount }} sur {{ poll.eligibleCount }} {{ poll.voterCount > 1 ? 'ont voté' : 'a voté' }}<template v-if="!poll.resultsVisible"> · tu verras les résultats après ton vote</template>
      </p>

      <section class="promo">
        <h2 class="promoTitle">Suis tout le voyage dans l’app</h2>
        <p class="promoText">Planning, idées, dépenses… Crée un compte quand tu veux : ton vote sera conservé.</p>
        <div class="promoLinks">
          <a v-if="data?.appHandoff" :href="data.appHandoff" class="promoButton">Ouvrir dans l’app</a>
          <NuxtLink :to="`/v/${trip.id}`" class="promoLink">Voir le voyage</NuxtLink>
        </div>
      </section>
    </main>

    <section v-else class="card lone">
      <h1 class="title">Sondage réservé au voyage</h1>
      <p class="muted">
        {{ error?.statusCode === 404 ? 'Seuls les participants du voyage peuvent voir et voter. Demande un lien d’invitation à l’organisateur.' : error?.message }}
      </p>
    </section>
  </div>
</template>

<style scoped>
.content { padding: 18px 16px 0; display: flex; flex-direction: column; gap: 14px; }
.question { margin: 6px 0 4px; font-size: 26px; }
.options { display: flex; flex-direction: column; gap: 10px; }
.option {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  padding: 12px 12px 12px 16px;
  border-radius: 18px;
  background: var(--surface);
  border: 2px solid transparent;
  cursor: pointer;
}
.option:has(.input:checked) { border-color: var(--accent); }
.option:has(.input:focus-visible) { outline: 3px solid var(--accent-tint); outline-offset: 2px; }
.input { position: absolute; opacity: 0; pointer-events: none; }
.optionLabel { flex: 1; font-size: 16px; font-weight: 700; }
.box { width: 26px; height: 26px; flex: 0 0 auto; border: 2px solid #c9c2b4; display: flex; align-items: center; justify-content: center; }
.box svg { visibility: hidden; }
.square { border-radius: 8px; }
.round { border-radius: 13px; }
.option:has(.input:checked) .box { background: var(--accent); border-color: var(--accent); }
.option:has(.input:checked) .box svg { visibility: visible; }
.send { margin-top: 4px; height: 54px; border-radius: 16px; }
.cancel { align-self: center; font-size: 14px; font-weight: 700; color: var(--ink-secondary); padding: 6px; }
.thanks { gap: 10px; align-items: flex-start; }
.tick { width: 44px; height: 44px; border-radius: 22px; background: var(--accent-tint); display: flex; align-items: center; justify-content: center; }
.thanks .title { font-size: 18px; }
.text { margin: 0; font-size: 14px; line-height: 1.5; color: var(--ink-tertiary); }
.outline { height: 44px; padding: 0 14px; border-radius: 12px; border: 1.5px solid #d9d2c4; display: flex; align-items: center; font-size: 14px; font-weight: 700; }
.result { display: flex; flex-direction: column; gap: 6px; }
.resultTop { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.resultLabel { font-weight: 700; }
.count { font-size: 13px; font-weight: 700; color: var(--ink-secondary); white-space: nowrap; }
.track { height: 6px; border-radius: 3px; background: var(--chip-soft); overflow: hidden; }
.fill { height: 100%; border-radius: 3px; background: #9c958a; }
.fill.lead { background: var(--accent); }
.applied { margin: 0; font-size: 13px; font-weight: 700; color: var(--accent-ink); }
.promo { background: var(--ink); color: #fff; border-radius: 22px; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.promoTitle { margin: 0; font-size: 15px; font-weight: 700; }
.promoText { margin: 0; font-size: 13px; line-height: 1.45; color: #c9ced6; }
.promoLinks { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.promoButton { height: 40px; padding: 0 14px; border-radius: 12px; background: #fff; color: var(--ink); display: flex; align-items: center; font-size: 14px; font-weight: 700; }
.promoLink { font-size: 14px; font-weight: 700; text-decoration: underline; }
.lone { margin: 24px 16px 0; }
</style>
