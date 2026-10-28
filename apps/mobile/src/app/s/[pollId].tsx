import { parseInvitationCode } from '@7trip/shared';
import { colors, spacing } from '@7trip/ui-tokens';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { Sheet } from '@/components/sheet';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { usePollLink } from '@/polls/polls-api';

/**
 * Opened from a shared poll link (…/s/<pollId>, with ?j=<code> when the sharer could invite).
 * Members go straight to the poll; others join the trip through the invitation first.
 */
export default function PollLinkScreen() {
  const { pollId, j } = useLocalSearchParams<{ pollId: string; j?: string }>();
  const poll = usePollLink(pollId ?? '');
  const code = parseInvitationCode(j ?? '');
  const found = poll.data;

  useEffect(() => {
    if (found) router.replace(`/voyage/${found.tripId}/sondage/${found.id}` as Href);
    else if (found === null && code) router.replace(`/j/${code}?sondage=${pollId}` as Href);
  }, [found, code, pollId]);

  if (poll.isError) {
    return (
      <Sheet title="Sondage">
        <AppText tone="secondary">{poll.error.message}</AppText>
        <Button title="Réessayer" onPress={() => void poll.refetch()} />
      </Sheet>
    );
  }
  if (found === null && !code) {
    return (
      <Sheet title="Sondage réservé au voyage">
        <AppText tone="secondary">Seuls les membres du voyage peuvent voir ce sondage. Demande le lien d’invitation à l’organisateur.</AppText>
        <Button title="Fermer" variant="soft" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      </Sheet>
    );
  }
  return (
    <Sheet title="Sondage">
      <ActivityIndicator color={colors.accent} style={styles.loading} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  loading: { marginVertical: spacing.xl },
});
