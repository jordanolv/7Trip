import { authorName, formatTimeRange, placeMapsUrl, type TripEvent } from '@7trip/shared';
import { colors, fontFamily, spacing } from '@7trip/ui-tokens';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { ScreenHeader } from '@/components/screen-header';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { useDeleteEvent, useEvent } from '@/events/events-api';
import { EventCategoryChip, EventIcon, eventDays, eventStyle } from '@/events/event-visuals';
import { ApiError, errorMessage } from '@/lib/api';
import { haptics } from '@/lib/haptics';
import { useTripId } from '@/trips/use-trip-id';
import { AuthorName } from '@/trips/author-name';

export default function EvenementScreen() {
  const tripId = useTripId();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const event = useEvent(tripId, eventId);

  // A 404 wins over cached data: the event was removed by someone else since it was loaded.
  const notFound = event.error instanceof ApiError && event.error.status === 404;
  if (event.data && !notFound) return <EvenementDetail tripId={tripId} event={event.data} />;

  return (
    <>
      <ScreenHeader />
      <View style={styles.center}>
        {event.isPending ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <>
            <AppText variant="heading">{notFound ? 'Événement introuvable' : 'Impossible de charger l’événement'}</AppText>
            <AppText tone="secondary" style={styles.centerText}>
              {notFound ? 'Il a peut-être été retiré du planning.' : event.error?.message}
            </AppText>
            {notFound ? null : <Button title="Réessayer" variant="soft" onPress={() => void event.refetch()} />}
          </>
        )}
      </View>
    </>
  );
}

function EvenementDetail({ tripId, event }: { tripId: string; event: TripEvent }) {
  const insets = useSafeAreaInsets();
  const remove = useDeleteEvent(tripId, event.id);
  const { tint, ink } = eventStyle(event.category);
  const back = () => (router.canGoBack() ? router.back() : router.replace(`/voyage/${tripId}/planning` as Href));
  const mapsUrl = placeMapsUrl(event);
  const time = formatTimeRange(event);

  const unplan = () => {
    haptics.warning();
    Alert.alert('Retirer du planning ?', 'L’idée reste dans la boîte à idées, avec sa fiche.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer',
        style: 'destructive',
        onPress: () =>
          remove.mutate(undefined, {
            onSuccess: back,
            onError: (error) => Alert.alert('Impossible de retirer l’événement', errorMessage(error)),
          }),
      },
    ]);
  };

  const rows: { icon: IconName; label: string; detail?: string; action?: { label: string; onPress: () => void } }[] = [
    { icon: 'calendar', label: [eventDays(event), time].filter(Boolean).join(' · ') },
  ];
  if (event.place) {
    const place = event.place;
    rows.push({ icon: 'pin', label: place, action: mapsUrl ? { label: 'Itinéraire', onPress: () => void Linking.openURL(mapsUrl) } : undefined });
  } else if (mapsUrl) {
    rows.push({ icon: 'pin', label: 'Lieu sur Google Maps', action: { label: 'Ouvrir', onPress: () => void Linking.openURL(mapsUrl) } });
  }
  if (event.url && event.url !== mapsUrl) {
    const url = event.url;
    rows.push({ icon: 'link', label: hostname(url), action: { label: 'Ouvrir', onPress: () => void Linking.openURL(url) } });
  }
  if (event.bookingRef) rows.push({ icon: 'ticket', label: `Réf. ${event.bookingRef}`, detail: 'Réservation' });

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}>
        <View style={[styles.hero, { backgroundColor: tint, paddingTop: insets.top + spacing.sm }]}>
          <View style={styles.heroBar}>
            <Pressable accessibilityRole="button" accessibilityLabel="Retour au planning" onPress={back} style={styles.roundButton}>
              <Icon name="back" />
            </Pressable>
            {event.canEdit ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(`/voyage/${tripId}/evenement/${event.id}/modifier` as Href)}
                style={styles.pillButton}
              >
                <Text style={styles.pillText}>Modifier</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.heroIcon}>
            <EventIcon category={event.category} size={56} color={ink} />
          </View>
        </View>

        <View style={styles.body}>
          <View>
            <EventCategoryChip category={event.category} />
            <AppText variant="title" style={styles.title}>
              {event.title}
            </AppText>
            {event.idea ? (
              <Pressable accessibilityRole="link" onPress={() => router.push(`/voyage/${tripId}/idee/${event.idea!.id}` as Href)}>
                <AppText variant="caption" tone="secondary" style={styles.byline}>
                  Idée proposée par {authorName(event.idea.author)} · <Text style={styles.bylineLink}>voir l’idée</Text>
                </AppText>
              </Pressable>
            ) : (
              <AppText variant="caption" tone="secondary" style={styles.byline}>
                Ajouté par <AuthorName tripId={tripId} author={event.author} />
              </AppText>
            )}
          </View>

          <View style={styles.card}>
            {rows.map((row, index) => (
              <View key={`${row.icon}-${index}`}>
                {index > 0 ? <View style={styles.separator} /> : null}
                <View style={styles.row}>
                  <Icon name={row.icon} color={colors.accentInk} size={20} />
                  <View style={styles.flex}>
                    <AppText variant="bodyStrong" numberOfLines={2}>
                      {row.label}
                    </AppText>
                    {row.detail ? (
                      <AppText variant="caption" tone="secondary">
                        {row.detail}
                      </AppText>
                    ) : null}
                  </View>
                  {row.action ? (
                    <Pressable accessibilityRole="link" onPress={row.action.onPress} style={styles.action}>
                      <Text style={styles.actionText}>{row.action.label}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
            <View style={styles.separator} />
            <View style={styles.row}>
              <Icon name="users" color={colors.accentInk} size={20} />
              <AppText variant="bodyStrong" style={styles.flex} numberOfLines={2}>
                {event.participants.length ? event.participants.map(authorName).join(', ') : 'Tout le groupe'}
              </AppText>
              {event.participants.length ? (
                <View style={styles.avatars}>
                  {event.participants.slice(0, 3).map((p, i) => (
                    <View key={p.id} style={[styles.avatar, i > 0 && styles.avatarOverlap]}>
                      <Avatar name={p.displayName} color={p.avatarColor} size={28} />
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          </View>

          {event.description ? <AppText style={styles.description}>{event.description}</AppText> : null}

          {event.idea && event.canEdit ? (
            <Pressable
              accessibilityRole="button"
              onPress={unplan}
              disabled={remove.isPending}
              style={({ pressed }) => [styles.unplan, pressed && styles.pressed]}
            >
              <Icon name="undo" color={colors.inkTertiary} size={18} />
              <Text style={styles.unplanText}>Retirer du planning (l’idée est conservée)</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

/** "alcazarsevilla.org" for https://www.alcazarsevilla.org/visite. */
function hostname(url: string): string {
  const match = /^https?:\/\/(?:www\.)?([^/?#]+)/i.exec(url);
  return match?.[1] ?? url;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl, backgroundColor: colors.background },
  centerText: { textAlign: 'center' },
  hero: { height: 220, paddingHorizontal: 14 },
  heroBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroIcon: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: spacing.xl },
  roundButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  pillButton: { minHeight: 44, paddingHorizontal: spacing.lg, borderRadius: 22, backgroundColor: colors.surface, justifyContent: 'center' },
  pillText: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.ink },
  body: {
    marginTop: -24,
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: spacing.xl,
    gap: 14,
  },
  title: { marginTop: 10 },
  byline: { marginTop: 4 },
  bylineLink: { color: colors.accent, fontFamily: fontFamily.semibold },
  card: { backgroundColor: colors.surface, borderRadius: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 52, paddingVertical: spacing.md, paddingHorizontal: 14 },
  separator: { height: 1, backgroundColor: colors.separator, marginLeft: 46 },
  action: { minHeight: 36, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: 999, backgroundColor: colors.accentTint },
  actionText: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.accent },
  avatars: { flexDirection: 'row' },
  avatar: { borderRadius: 16, borderWidth: 2, borderColor: colors.surface },
  avatarOverlap: { marginLeft: -8 },
  description: { color: '#2C3443', lineHeight: 23 },
  unplan: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  unplanText: { fontFamily: fontFamily.semibold, fontSize: 14, color: colors.inkTertiary },
  pressed: { opacity: 0.6 },
});
