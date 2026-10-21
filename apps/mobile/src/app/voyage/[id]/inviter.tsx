import { canDo, type TripDetail } from '@7trip/shared';

import { Sheet } from '@/components/sheet';
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
    <Sheet title="Inviter des amis">
      {canDo('invite', trip.myRole, trip) ? (
        <>
          <InvitationCard trip={trip} />
          <AppText variant="caption" tone="secondary">
            En ouvrant ce lien, tes amis rejoignent « {trip.title} ». Ils peuvent aussi saisir le code dans « J’ai un lien d’invitation ».
          </AppText>
        </>
      ) : (
        <AppText tone="secondary">Dans ce voyage, seuls les organisateurs peuvent inviter.</AppText>
      )}
    </Sheet>
  );
}
