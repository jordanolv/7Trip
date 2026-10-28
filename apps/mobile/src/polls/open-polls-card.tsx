import type { Poll } from "@7trip/shared";
import { colors, radii, spacing } from "@7trip/ui-tokens";
import { router, useFocusEffect, type Href } from "expo-router";
import { useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { PollKindTile, deadlineLabel } from "@/polls/poll-visuals";
import { usePolls } from "@/polls/polls-api";

/** Open polls, the ones still waiting for your vote first. Nothing at all when none is open (CDC §3.2). */
export function OpenPollsCard({ tripId }: { tripId: string }) {
  const polls = usePolls(tripId);
  const { refetch } = polls;
  // Others vote meanwhile: fetched again each time the dashboard shows.
  useFocusEffect(
    useCallback(() => {
      void refetch({ cancelRefetch: false });
    }, [refetch]),
  );
  const open = (polls.data ?? []).filter((poll) => !poll.closed);
  if (open.length === 0) return null;
  const sorted = [...open].sort(
    (a, b) => Number(a.hasVoted) - Number(b.hasVoted),
  );
  const shown = sorted.slice(0, 2);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <AppText variant="heading">
          {open.length > 1 ? "Sondages en cours" : "Sondage en cours"}
        </AppText>
        {open.length > shown.length ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/voyage/${tripId}/sondages` as Href)}
            hitSlop={8}
          >
            <AppText variant="bodyStrong" style={styles.seeAll}>
              Tout voir
            </AppText>
          </Pressable>
        ) : null}
      </View>
      {shown.map((poll) => (
        <PollLine
          key={poll.id}
          poll={poll}
          onPress={() =>
            router.push(`/voyage/${tripId}/sondage/${poll.id}` as Href)
          }
        />
      ))}
    </View>
  );
}

function PollLine({ poll, onPress }: { poll: Poll; onPress: () => void }) {
  const detail = [
    `${poll.voterCount} vote${poll.voterCount > 1 ? "s" : ""} sur ${poll.eligibleCount}`,
    poll.hasVoted ? "tu as voté" : "à toi",
    poll.closesAt ? `jusqu’au ${deadlineLabel(poll.closesAt)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.line}>
      <PollKindTile kind={poll.kind} size={40} />
      <View style={styles.flex}>
        <AppText variant="bodyStrong" numberOfLines={2}>
          {poll.question}
        </AppText>
        <AppText
          variant="caption"
          tone={poll.hasVoted ? "secondary" : undefined}
          style={!poll.hasVoted && styles.toVote}
        >
          {detail}
        </AppText>
      </View>
      <Icon name="chevronRight" color={colors.inkSecondary} size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card + 2,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  seeAll: { color: colors.accent },
  line: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 48,
  },
  toVote: { color: colors.warningInk },
});
