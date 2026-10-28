import {
  ApiErrorCode,
  authorName,
  formatDayMonth,
  localIsoDate,
  pollFollowUp,
  pollFollowUpLabel,
  pollLeaders,
  votesLabel,
  type Poll,
  type PollOption,
} from '@7trip/shared';
import { colors, fontFamily, spacing } from '@7trip/ui-tokens';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { ApiError, errorMessage } from '@/lib/api';
import { haptics } from '@/lib/haptics';
import { Chip, VoteBar, deadlineLabel } from '@/polls/poll-visuals';
import { useApplyPoll, useClosePoll, useDeletePoll, usePoll, useVote } from '@/polls/polls-api';
import { useTrip } from '@/trips/trips-api';
import { useTripId } from '@/trips/use-trip-id';

export default function SondageScreen() {
  const tripId = useTripId();
  const { pollId, partager } = useLocalSearchParams<{ pollId: string; partager?: string }>();
  const poll = usePoll(tripId, pollId);

  // Opened right after publishing it: the share sheet comes up once.
  const shared = useRef(false);
  useEffect(() => {
    if (partager && poll.data && !shared.current) {
      shared.current = true;
      router.push(`/voyage/${tripId}/sondage/${pollId}/partager` as Href);
    }
  }, [partager, poll.data, tripId, pollId]);

  const notFound = poll.error instanceof ApiError && poll.error.status === 404;
  if (poll.data && !notFound) return <SondageDetail tripId={tripId} poll={poll.data} refreshing={poll.isRefetching} refetch={() => void poll.refetch()} />;

  return (
    <>
      <ScreenHeader />
      <View style={styles.center}>
        {poll.isPending ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <>
            <AppText variant="heading">{notFound ? 'Sondage introuvable' : 'Impossible de charger le sondage'}</AppText>
            <AppText tone="secondary" style={styles.centerText}>
              {notFound ? 'Il a peut-être été supprimé.' : poll.error?.message}
            </AppText>
            {notFound ? null : <Button title="Réessayer" variant="soft" onPress={() => void poll.refetch()} />}
          </>
        )}
      </View>
    </>
  );
}

function SondageDetail({ tripId, poll, refreshing, refetch }: { tripId: string; poll: Poll; refreshing: boolean; refetch: () => void }) {
  const insets = useSafeAreaInsets();
  const trip = useTrip(tripId);
  const vote = useVote(tripId, poll.id);
  const close = useClosePoll(tripId, poll.id);
  const remove = useDeletePoll(tripId, poll.id);
  const mine = poll.options.filter((o) => o.mine).map((o) => o.id);
  const [picked, setPicked] = useState<string[]>(mine);
  // A vote saved here (or a refresh) resets the selection to what the server has.
  const savedKey = mine.join(',');
  const [shownKey, setShownKey] = useState(savedKey);
  if (shownKey !== savedKey) {
    setShownKey(savedKey);
    setPicked(mine);
  }
  const changed = picked.toSorted().join(',') !== mine.toSorted().join(',');

  const toggle = (id: string) => {
    haptics.tick();
    setPicked((current) => (current.includes(id) ? current.filter((x) => x !== id) : poll.multiple ? [...current, id] : [id]));
  };

  const save = () =>
    vote.mutate(picked, {
      onSuccess: () => haptics.success(),
      onError: (error) =>
        Alert.alert(
          error instanceof ApiError && error.code === ApiErrorCode.PollClosed ? 'Sondage clos' : 'Vote impossible',
          errorMessage(error),
        ),
    });

  const confirmClose = () =>
    Alert.alert('Clore le sondage ?', 'Plus personne ne pourra voter ni changer son vote. Les résultats restent visibles.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Clore',
        onPress: () => close.mutate(undefined, { onError: (error) => Alert.alert('Clôture impossible', errorMessage(error)) }),
      },
    ]);

  const confirmDelete = () => {
    haptics.warning();
    Alert.alert(`Supprimer « ${poll.question} » ?`, 'Le sondage et ses votes disparaîtront pour tout le groupe.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () =>
          remove.mutate(undefined, {
            onSuccess: () => router.back(),
            onError: (error) => Alert.alert('Suppression impossible', errorMessage(error)),
          }),
      },
    ]);
  };

  const share = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Partager le sondage"
      onPress={() => router.push(`/voyage/${tripId}/sondage/${poll.id}/partager` as Href)}
      style={styles.headerButton}
    >
      <Icon name="share" />
    </Pressable>
  );

  const closedLine = poll.closedBy
    ? `Clos par ${authorName(poll.closedBy)}`
    : poll.closedAt
      ? `Clos le ${formatDayMonth(localIsoDate(new Date(poll.closedAt)))}`
      : 'Clos';

  return (
    <View style={styles.screen}>
      <ScreenHeader title={trip.data?.title} right={poll.closed ? null : share} />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={colors.accent} />}
      >
        <View>
          <View style={styles.chips}>
            {poll.closed ? (
              <Chip label={`${closedLine} · ${poll.voterCount} sur ${poll.eligibleCount}`} fg={colors.inkTertiary} />
            ) : (
              <>
                <Chip label={poll.multiple ? 'Plusieurs choix' : 'Un seul choix'} bg="#E4E6F7" fg="#2F3680" />
                {poll.closesAt ? <Chip label={`Clôture ${deadlineLabel(poll.closesAt)}`} /> : null}
              </>
            )}
          </View>
          <Text style={styles.question} accessibilityRole="header">
            {poll.question}
          </Text>
          <AppText variant="caption" tone="secondary">
            Proposé par {authorName(poll.author)}
          </AppText>
        </View>

        {poll.closed ? (
          <Results tripId={tripId} poll={poll} canApply={trip.data?.myRole === 'ORGANIZER'} />
        ) : (
          <View style={styles.options}>
            {poll.options.map((option) => (
              <OptionButton
                key={option.id}
                option={option}
                poll={poll}
                selected={picked.includes(option.id)}
                onPress={() => toggle(option.id)}
              />
            ))}
          </View>
        )}

        <Participation poll={poll} />

        {poll.canClose ? <Button title="Clore le sondage" variant="soft" loading={close.isPending} onPress={confirmClose} /> : null}
        {poll.canDelete ? (
          <Pressable accessibilityRole="button" onPress={confirmDelete} disabled={remove.isPending} style={styles.delete}>
            <Icon name="trash" color={colors.danger} size={20} />
            <AppText variant="bodyStrong" style={{ color: colors.danger }}>
              Supprimer le sondage
            </AppText>
          </Pressable>
        ) : null}
      </ScrollView>

      {poll.closed ? null : (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <AppText variant="caption" tone="secondary" style={styles.footerNote}>
            Tu peux changer ton vote tant que le sondage est ouvert.
          </AppText>
          <Button
            title={poll.hasVoted && picked.length === 0 ? 'Retirer mon vote' : poll.hasVoted ? 'Modifier mon vote' : 'Enregistrer mon vote'}
            loading={vote.isPending}
            disabled={!changed}
            onPress={save}
          />
        </View>
      )}
    </View>
  );
}

function OptionButton({ option, poll, selected, onPress }: { option: PollOption; poll: Poll; selected: boolean; onPress: () => void }) {
  const voters = option.voters;
  return (
    <Pressable
      accessibilityRole={poll.multiple ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.option, selected && styles.optionSelected]}
    >
      <View style={styles.flex}>
        <View style={styles.optionTop}>
          <Text style={styles.optionLabel}>{option.label}</Text>
          {option.votes !== null ? <Text style={styles.optionCount}>{votesLabel(option.votes)}</Text> : null}
        </View>
        {option.votes !== null ? (
          <>
            <VoteBar ratio={poll.eligibleCount ? option.votes / poll.eligibleCount : 0} color={option.mine ? colors.accent : '#B5AEA1'} />
            {voters?.length ? (
              <AppText variant="caption" tone="secondary" numberOfLines={2}>
                {voters.map(authorName).join(', ')}
              </AppText>
            ) : null}
          </>
        ) : null}
      </View>
      <View style={[styles.box, poll.multiple ? styles.boxSquare : styles.boxRound, selected && styles.boxSelected]}>
        {selected ? <Icon name="check" color={colors.surface} size={16} /> : null}
      </View>
    </Pressable>
  );
}

/** Once closed: the leaders first, then the rest; the organizer confirms what follows (CDC §6). */
function Results({ tripId, poll, canApply }: { tripId: string; poll: Poll; canApply: boolean }) {
  const apply = useApplyPoll(tripId, poll.id);
  const [later, setLater] = useState(false);
  const today = localIsoDate();
  const leaders = pollLeaders(poll.options);
  const sorted = poll.options.toSorted((a, b) => (b.votes ?? 0) - (a.votes ?? 0));
  const top = leaders.length === 1 ? leaders[0]! : null;
  const rest = top ? sorted.filter((o) => o.id !== top.id) : sorted;
  const applied = poll.options.find((o) => o.id === poll.appliedOptionId) ?? null;
  // On a tie, each leader can be applied: the organizer chooses (docs/decisions.md).
  const offers = leaders.flatMap((o) => {
    const followUp = pollFollowUp(poll.kind, o);
    return followUp ? [{ option: o, label: pollFollowUpLabel(followUp, o, today) }] : [];
  });

  const confirm = (option: PollOption) =>
    apply.mutate(option.id, {
      onSuccess: () => haptics.success(),
      onError: (error) => Alert.alert('Impossible d’appliquer', errorMessage(error)),
    });

  return (
    <>
      {top ? (
        <View style={styles.leader}>
          <View style={styles.leaderBadge}>
            <Text style={styles.leaderBadgeText}>En tête</Text>
          </View>
          <View style={styles.optionTop}>
            <Text style={styles.leaderLabel}>{top.label}</Text>
            <Text style={styles.leaderCount}>{votesLabel(top.votes ?? 0)}</Text>
          </View>
          <VoteBar ratio={poll.eligibleCount ? (top.votes ?? 0) / poll.eligibleCount : 0} color={colors.accent} height={8} />
          {top.voters?.length ? (
            <AppText variant="caption" tone="secondary">
              {top.voters.map(authorName).join(', ')}
            </AppText>
          ) : null}
        </View>
      ) : leaders.length > 1 ? (
        <View style={styles.tie}>
          <Icon name="alert" color={colors.infoInk} size={18} />
          <Text style={styles.tieText}>Égalité entre {leaders.map((o) => o.label).join(' et ')}. À toi de trancher, ou relance un sondage entre eux.</Text>
        </View>
      ) : (
        <AppText tone="secondary">Personne n’a voté.</AppText>
      )}

      {rest.length ? (
        <View style={styles.restCard}>
          {rest.map((o) => (
            <View key={o.id}>
              <View style={styles.optionTop}>
                <Text style={styles.restLabel}>{o.label}</Text>
                <Text style={styles.optionCount}>{votesLabel(o.votes ?? 0)}</Text>
              </View>
              <VoteBar ratio={poll.eligibleCount ? (o.votes ?? 0) / poll.eligibleCount : 0} color={leaders.includes(o) ? colors.accent : '#9C958A'} />
            </View>
          ))}
        </View>
      ) : null}

      {applied ? (
        <AppliedCard tripId={tripId} poll={poll} option={applied} />
      ) : canApply && offers.length && !later ? (
        <View style={styles.next}>
          <View>
            <Text style={styles.nextTitle}>Et maintenant ?</Text>
            <Text style={styles.nextText}>Rien n’est appliqué automatiquement : c’est toi, en tant qu’organisateur, qui décides.</Text>
          </View>
          {offers.map(({ option, label }) => (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              disabled={apply.isPending}
              onPress={() => confirm(option)}
              style={({ pressed }) => [styles.nextButton, pressed && styles.pressed]}
            >
              {apply.isPending && apply.variables === option.id ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.nextButtonText}>{label}</Text>}
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" onPress={() => setLater(true)} style={styles.laterButton}>
            <Text style={styles.laterText}>Plus tard</Text>
          </Pressable>
        </View>
      ) : null}
    </>
  );
}

function AppliedCard({ tripId, poll, option }: { tripId: string; poll: Poll; option: PollOption }) {
  const followUp = pollFollowUp(poll.kind, option);
  const title =
    followUp === 'destination'
      ? `Destination : ${option.label}`
      : followUp === 'dates'
        ? `Dates : ${option.label}`
        : `« ${option.label} » retenue`;
  const text =
    followUp === 'destination'
      ? 'Le voyage a sa destination. Prochaine étape : les dates ?'
      : followUp === 'dates'
        ? 'Les dates du voyage sont fixées.'
        : 'L’idée est retenue dans la boîte à idées.';
  return (
    <View style={styles.applied}>
      <View style={styles.appliedRow}>
        <View style={styles.appliedIcon}>
          <Icon name="check" color={colors.surface} size={20} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.appliedTitle}>{title}</Text>
          <Text style={styles.appliedText}>{text}</Text>
        </View>
      </View>
      {followUp === 'keepIdea' && option.ideaId ? (
        <Button
          title="Ajouter au planning"
          variant="soft"
          onPress={() => router.push(`/voyage/${tripId}/idee/${option.ideaId}/planifier` as Href)}
        />
      ) : null}
    </View>
  );
}

/** Who voted is always visible, what they voted only once you voted (docs/decisions.md). */
function Participation({ poll }: { poll: Poll }) {
  return (
    <View style={styles.participation}>
      <View style={styles.participationIcon}>
        <Icon name="users" color={colors.accentInk} size={20} />
      </View>
      <View style={styles.flex}>
        <AppText variant="bodyStrong">
          {poll.voterCount} sur {poll.eligibleCount} {poll.voterCount > 1 ? 'ont voté' : 'a voté'}
        </AppText>
        {poll.waiting.length && !poll.closed ? (
          <AppText variant="caption" tone="secondary" numberOfLines={2}>
            En attente : {poll.waiting.map(authorName).join(', ')}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1, minWidth: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl, backgroundColor: colors.background },
  centerText: { textAlign: 'center' },
  headerButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl, gap: spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  question: { marginTop: 10, marginBottom: 4, fontFamily: fontFamily.extrabold, fontSize: 26, letterSpacing: -0.5, color: colors.ink },
  options: { gap: 10 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: { borderColor: colors.accent },
  optionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm, marginBottom: 6 },
  optionLabel: { flexShrink: 1, fontFamily: fontFamily.bold, fontSize: 16, color: colors.ink },
  optionCount: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.inkSecondary },
  box: { width: 26, height: 26, borderWidth: 2, borderColor: '#C9C2B4', alignItems: 'center', justifyContent: 'center' },
  boxSquare: { borderRadius: 8 },
  boxRound: { borderRadius: 13 },
  boxSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  leader: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: spacing.lg,
    gap: 2,
    shadowColor: colors.ink,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  leaderBadge: { alignSelf: 'flex-start', backgroundColor: colors.accentTint, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 },
  leaderBadgeText: { fontFamily: fontFamily.bold, fontSize: 12, color: colors.accentInk },
  leaderLabel: { flexShrink: 1, fontFamily: fontFamily.extrabold, fontSize: 18, color: colors.ink },
  leaderCount: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.ink },
  tie: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: colors.infoTint, borderRadius: 14, padding: spacing.md },
  tieText: { flex: 1, fontFamily: fontFamily.medium, fontSize: 13, lineHeight: 19, color: colors.infoInk },
  restCard: { backgroundColor: colors.surface, borderRadius: 18, padding: 14, gap: spacing.md },
  restLabel: { flexShrink: 1, fontFamily: fontFamily.bold, fontSize: 15, color: colors.ink },
  next: { backgroundColor: colors.ink, borderRadius: 22, padding: spacing.lg, gap: spacing.md },
  nextTitle: { fontFamily: fontFamily.extrabold, fontSize: 16, color: colors.surface },
  nextText: { marginTop: 4, fontFamily: fontFamily.medium, fontSize: 13, lineHeight: 19, color: '#C9CED6' },
  nextButton: { minHeight: 48, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  nextButtonText: { fontFamily: fontFamily.bold, fontSize: 15, color: colors.ink, textAlign: 'center' },
  laterButton: { minHeight: 44, borderRadius: 14, borderWidth: 1.5, borderColor: colors.inkTertiary, alignItems: 'center', justifyContent: 'center' },
  laterText: { fontFamily: fontFamily.semibold, fontSize: 14, color: colors.surface },
  pressed: { opacity: 0.8 },
  applied: { backgroundColor: colors.accentTint, borderRadius: 22, padding: spacing.lg, gap: spacing.md },
  appliedRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  appliedIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  appliedTitle: { fontFamily: fontFamily.bold, fontSize: 15, color: '#1B4A36' },
  appliedText: { fontFamily: fontFamily.medium, fontSize: 13, color: colors.accentInk },
  participation: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: 18, padding: 14 },
  participationIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center' },
  delete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.dangerTint,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.chip,
    backgroundColor: colors.background,
  },
  footerNote: { textAlign: 'center' },
});
