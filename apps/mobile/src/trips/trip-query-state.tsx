import type { TripDetail } from '@7trip/shared';
import { colors, spacing } from '@7trip/ui-tokens';
import type { UseQueryResult } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';

/** Loading and error states shared by every trip screen. */
export function TripQueryState({
  query,
  children,
}: {
  query: UseQueryResult<TripDetail>;
  children: (trip: TripDetail) => ReactNode;
}) {
  if (query.data) return <>{children(query.data)}</>;

  if (query.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const notFound = query.error instanceof ApiError && query.error.status === 404;
  return (
    <View style={styles.center}>
      <AppText variant="heading" style={styles.text}>
        {notFound ? 'Voyage introuvable' : 'Impossible de charger le voyage'}
      </AppText>
      <AppText tone="secondary" style={styles.text}>
        {notFound ? 'Il a peut-être été supprimé, ou tu n’en fais plus partie.' : query.error?.message}
      </AppText>
      {notFound ? (
        <Button title="Retour à mes voyages" variant="soft" onPress={() => router.dismissTo('/')} />
      ) : (
        <Button title="Réessayer" variant="soft" onPress={() => void query.refetch()} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  text: { textAlign: 'center' },
});
