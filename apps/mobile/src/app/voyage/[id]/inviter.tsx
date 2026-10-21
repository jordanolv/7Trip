import { canDo, type TripDetail } from '@7trip/shared';
import { colors, spacing } from '@7trip/ui-tokens';
import { ScrollView, StyleSheet } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { AppText } from '@/components/ui/app-text';
import { InvitationCard } from '@/trips/invitation-card';
import { TripQueryState } from '@/trips/trip-query-state';
import { useTrip } from '@/trips/trips-api';
import { useTripId } from '@/trips/use-trip-id';

export default function InviteScreen() {
  const query = useTrip(useTripId());
  return <TripQueryState query={query}>{(trip) => <Invite trip={trip} />}</TripQueryState>;
}

function Invite({ trip }: { trip: TripDetail }) {
  return (
    <>
      <ScreenHeader mode="close" title="Inviter des amis" />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {canDo('invite', trip.myRole, trip) ? (
          <>
            <InvitationCard trip={trip} />
            <AppText variant="caption" tone="secondary">
              Envoie ce lien à tes amis : en l’ouvrant, ils rejoignent « {trip.title} ». Tu peux aussi leur donner le code, à saisir dans « J’ai un
              lien d’invitation ».
            </AppText>
          </>
        ) : (
          <AppText tone="secondary">Dans ce voyage, seuls les organisateurs peuvent inviter.</AppText>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
});
