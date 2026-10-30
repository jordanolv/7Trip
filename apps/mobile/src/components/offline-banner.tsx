import { formatDayMonth, localIsoDate } from '@7trip/shared';
import { colors, fontFamily, spacing } from '@7trip/ui-tokens';
import { useQueryClient } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { useIsOnline } from '@/lib/online';

/** "du jour à 09:12", "du 20 oct. à 09:12": when the newest data shown was fetched. */
function since(timestamp: number): string {
  const date = new Date(timestamp);
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  const day = localIsoDate(date);
  return `${day === localIsoDate() ? 'du jour' : `du ${formatDayMonth(day)}`} à ${time}`;
}

/**
 * Offline: what is shown is what was saved on the device, read-only (docs/architecture.md §8,
 * mockup G-HorsLigne). Nothing online.
 */
export function OfflineBanner() {
  const online = useIsOnline();
  const client = useQueryClient();
  if (online) return null;
  const last = Math.max(
    0,
    ...client
      .getQueryCache()
      .getAll()
      .map((query) => query.state.dataUpdatedAt),
  );
  return (
    <View accessibilityRole="alert" style={styles.banner}>
      <Icon name="alert" color="#8A3D12" size={18} />
      <View style={styles.flex}>
        <Text style={styles.title}>Hors ligne · lecture seule</Text>
        <Text style={styles.detail}>{last ? `Données ${since(last)}. ` : ''}Les modifications reviendront avec le réseau.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.lg, paddingVertical: 10, backgroundColor: '#FBEBDD' },
  title: { fontFamily: fontFamily.bold, fontSize: 13, color: '#8A3D12' },
  detail: { fontFamily: fontFamily.medium, fontSize: 12, color: '#8A3D12' },
});
