import type { TripColorKey, TripDetail, TripIconKey } from '@7trip/shared';
import { colors, fontFamily, radii, spacing, tripColors } from '@7trip/ui-tokens';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';

import { formatDayMonth } from './format';
import { TripStatusChip } from './status-chip';
import { TripCover, TripIconTile } from './trip-visuals';

const NOTCH = 18;

/** Boarding-pass preview of a trip: stub in the trip colour, route, departure/return, travellers. */
export function TripTicket({ trip, color, icon, today }: { trip: TripDetail; color: TripColorKey; icon: TripIconKey; today: string }) {
  const stops = trip.destinations.length <= 3 ? trip.destinations : trip.destinations.slice(0, 2);
  const extra = trip.destinations.length - stops.length;

  return (
    <View style={styles.ticket}>
      <TripCover color={color} style={styles.stub}>
        <TripIconTile color={color} icon={icon} size={52} />
      </TripCover>
      <View style={styles.perforation}>
        <View style={[styles.notch, { top: -NOTCH / 2 - 1 }]} />
        <View style={styles.dashes} />
        <View style={[styles.notch, { bottom: -NOTCH / 2 - 1 }]} />
      </View>
      <View style={styles.body}>
        <View style={styles.header}>
          <View style={styles.flex}>
            <AppText style={styles.label}>VOYAGE</AppText>
            <AppText variant="bodyStrong" numberOfLines={1}>
              {trip.title}
            </AppText>
          </View>
          <TripStatusChip trip={trip} today={today} />
        </View>

        {stops.length > 0 ? (
          <View style={styles.route}>
            {stops.map((name, index) => (
              <View key={`${index}-${name}`} style={styles.stop}>
                {index > 0 ? <Icon name="arrowRight" size={16} color={tripColors[color]} strokeWidth={2.4} /> : null}
                <AppText style={styles.stopName} numberOfLines={1}>
                  {name}
                </AppText>
              </View>
            ))}
            {extra > 0 ? (
              <AppText variant="caption" tone="secondary">
                + {extra} étapes
              </AppText>
            ) : null}
          </View>
        ) : (
          <AppText variant="bodyStrong" tone="secondary">
            Destination à décider
          </AppText>
        )}

        <View style={styles.meta}>
          <Field label="DÉPART" value={trip.startDate ? formatDayMonth(trip.startDate) : 'À décider'} />
          <Field label="RETOUR" value={trip.endDate ? formatDayMonth(trip.endDate) : trip.startDate ? formatDayMonth(trip.startDate) : 'À décider'} />
          <Field label="VOYAGEURS" value={String(trip.participantCount)} />
        </View>
      </View>
    </View>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <AppText style={styles.label}>{label}</AppText>
      <AppText variant="label">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  ticket: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radii.card },
  stub: {
    width: 92,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: radii.card,
    borderBottomLeftRadius: radii.card,
  },
  perforation: { width: 2, alignItems: 'center' },
  dashes: {
    flex: 1,
    marginVertical: spacing.md + 2,
    borderLeftWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.separator,
  },
  // Half-circles cut into the ticket edges, painted in the screen background.
  notch: { position: 'absolute', width: NOTCH, height: NOTCH, borderRadius: NOTCH / 2, backgroundColor: colors.background },
  body: { flex: 1, padding: spacing.lg, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  flex: { flex: 1 },
  label: { fontFamily: fontFamily.bold, fontSize: 10, letterSpacing: 0.9, color: colors.inkSecondary },
  route: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: spacing.sm, rowGap: 2 },
  stop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  stopName: { fontFamily: fontFamily.extrabold, fontSize: 18, color: colors.ink, flexShrink: 1 },
  meta: { flexDirection: 'row', gap: spacing.lg + 4 },
  field: { gap: 2 },
});
