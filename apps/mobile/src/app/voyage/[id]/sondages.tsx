import { POLL_KIND_LABELS, type Poll } from '@7trip/shared';
import { colors, spacing } from '@7trip/ui-tokens';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { PollKindTile, PollStatusChip, deadlineLabel } from '@/polls/poll-visuals';
import { usePolls } from '@/polls/polls-api';
import { useTripId } from '@/trips/use-trip-id';

/** Open polls first, those still to vote on at the top; then the closed ones. */
const order = (poll: Poll) => (poll.closed ? 2 : poll.hasVoted ? 1 : 0);

export default function SondagesScreen() {
  const tripId = useTripId();
  const polls = usePolls(tripId);
  const { refetch } = polls;
  // Others vote meanwhile: fetched again on each visit.
  useFocusEffect(
    useCallback(() => {
      void refetch({ cancelRefetch: false });
    }, [refetch]),
  );
  const all = [...(polls.data ?? [])].sort((a, b) => order(a) - order(b));
  const create = () => router.push(`/voyage/${tripId}/sondage/nouveau` as Href);

  return (
    <>
      <ScreenHeader title="Sondages" />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={polls.isRefetching} onRefresh={() => void refetch()} tintColor={colors.accent} />}
      >
        {polls.isPending ? (
          <ActivityIndicator color={colors.accent} style={styles.loading} />
        ) : polls.isError && !polls.data ? (
          <View style={styles.empty}>
            <AppText variant="heading">Impossible de charger les sondages</AppText>
            <AppText tone="secondary">{polls.error.message}</AppText>
            <Button title="Réessayer" variant="soft" onPress={() => void refetch()} />
          </View>
        ) : all.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Icon name="poll" color={colors.accentInk} size={26} />
            </View>
            <AppText variant="heading">Aucun sondage pour l’instant</AppText>
            <AppText tone="secondary">La destination, les dates, le resto du soir… Pose la question au groupe : chacun vote, et tu décides ensuite.</AppText>
          </View>
        ) : (
          <View style={styles.list}>
            {all.map((poll) => (
              <PollRow key={poll.id} poll={poll} onPress={() => router.push(`/voyage/${tripId}/sondage/${poll.id}` as Href)} />
            ))}
          </View>
        )}
        <Button title="Nouveau sondage" onPress={create} icon={<Icon name="plus" color={colors.surface} size={20} />} />
      </ScrollView>
    </>
  );
}

function PollRow({ poll, onPress }: { poll: Poll; onPress: () => void }) {
  const meta = [
    POLL_KIND_LABELS[poll.kind],
    `${poll.voterCount} sur ${poll.eligibleCount} ont voté`,
    !poll.closed && poll.closesAt ? `jusqu’au ${deadlineLabel(poll.closesAt)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <PollKindTile kind={poll.kind} />
      <View style={styles.flex}>
        <AppText variant="bodyStrong" numberOfLines={2}>
          {poll.question}
        </AppText>
        <AppText variant="caption" tone="secondary" numberOfLines={1} style={styles.meta}>
          {meta}
        </AppText>
        <View style={styles.status}>
          <PollStatusChip poll={poll} />
        </View>
      </View>
      <Icon name="chevronRight" color={colors.inkSecondary} size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  flex: { flex: 1, minWidth: 0 },
  loading: { marginTop: spacing.xxl },
  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: spacing.md,
    shadowColor: colors.ink,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  pressed: { opacity: 0.7 },
  meta: { marginTop: 2 },
  status: { marginTop: 6 },
  empty: { backgroundColor: colors.surface, borderRadius: 22, padding: spacing.xl, gap: spacing.sm },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
});
