import { ApiErrorCode, IDEA_CATEGORY_LABELS, IDEA_STATUSES, IDEA_STATUS_LABELS, authorName, formatRelativeTime, type Idea, type IdeaStatus } from '@7trip/shared';
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
import { CategoryIcon, IdeaStatusChip, categoryStyle } from '@/ideas/idea-visuals';
import { useIdea, useUpdateIdea } from '@/ideas/ideas-api';
import { ApiError, errorMessage } from '@/lib/api';
import { haptics } from '@/lib/haptics';
import { useTripId } from '@/trips/use-trip-id';

export default function IdeeScreen() {
  const tripId = useTripId();
  const { ideaId } = useLocalSearchParams<{ ideaId: string }>();
  const idea = useIdea(tripId, ideaId);

  if (idea.data) return <IdeeDetail tripId={tripId} idea={idea.data} />;

  const notFound = idea.error instanceof ApiError && idea.error.status === 404;
  return (
    <>
      <ScreenHeader />
      <View style={styles.center}>
        {idea.isPending ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <>
            <AppText variant="heading">{notFound ? 'Idée introuvable' : 'Impossible de charger l’idée'}</AppText>
            <AppText tone="secondary" style={styles.centerText}>
              {notFound ? 'Elle a peut-être été supprimée.' : idea.error?.message}
            </AppText>
            {notFound ? null : <Button title="Réessayer" variant="soft" onPress={() => void idea.refetch()} />}
          </>
        )}
      </View>
    </>
  );
}

function IdeeDetail({ tripId, idea }: { tripId: string; idea: Idea }) {
  const insets = useSafeAreaInsets();
  const update = useUpdateIdea(tripId, idea.id);
  const { tint, ink } = categoryStyle(idea.category);
  const back = () => (router.canGoBack() ? router.back() : router.replace(`/voyage/${tripId}/idees` as Href));

  const setStatus = (status: IdeaStatus) => {
    if (status === idea.status || update.isPending) return;
    haptics.tick();
    update.mutate(
      { status, version: idea.version },
      {
        onError: (error) =>
          Alert.alert(
            error instanceof ApiError && error.code === ApiErrorCode.EditConflict ? 'Idée modifiée entre-temps' : 'Modification impossible',
            errorMessage(error),
          ),
      },
    );
  };

  const rows: { icon: IconName | null; label: string; detail?: string | null; onPress?: () => void }[] = [];
  if (idea.category || idea.cost) {
    rows.push({ icon: null, label: idea.category ? IDEA_CATEGORY_LABELS[idea.category] : 'Coût estimé', detail: idea.cost });
  }
  if (idea.place) {
    const place = idea.place;
    rows.push({ icon: 'pin', label: place });
    rows.push({
      icon: 'map',
      label: 'Voir sur Google Maps',
      onPress: () => void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`),
    });
  }
  if (idea.url) {
    const url = idea.url;
    rows.push({ icon: 'link', label: hostname(url), onPress: () => void Linking.openURL(url) });
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}>
        <View style={[styles.hero, { backgroundColor: tint, paddingTop: insets.top + spacing.sm }]}>
          <View style={styles.heroBar}>
            <Pressable accessibilityRole="button" accessibilityLabel="Retour aux idées" onPress={back} style={styles.roundButton}>
              <Icon name="back" />
            </Pressable>
            {idea.canEdit ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(`/voyage/${tripId}/idee/${idea.id}/modifier` as Href)}
                style={styles.pillButton}
              >
                <Text style={styles.pillText}>Modifier</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.heroIcon}>
            <CategoryIcon category={idea.category} size={56} color={ink} />
          </View>
        </View>

        <View style={styles.body}>
          <View>
            <AppText variant="title">{idea.title}</AppText>
            <View style={styles.byline}>
              <Avatar name={idea.author.displayName} size={24} />
              <AppText variant="caption" tone="secondary" style={styles.flex}>
                Proposée par {authorName(idea.author)} · {formatRelativeTime(idea.createdAt)}
              </AppText>
            </View>
          </View>

          {idea.canEdit ? (
            <View style={styles.statusTrack} accessibilityRole="radiogroup" accessibilityLabel="Statut de l’idée">
              {IDEA_STATUSES.map((status) => {
                const active = status === idea.status;
                return (
                  <Pressable
                    key={status}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active, busy: update.isPending }}
                    onPress={() => setStatus(status)}
                    style={[styles.statusSegment, active && styles.statusSegmentActive]}
                  >
                    <Text style={[styles.statusText, active && styles.statusTextActive]}>{IDEA_STATUS_LABELS[status]}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.statusChip}>
              <IdeaStatusChip status={idea.status} />
            </View>
          )}

          {idea.description ? <AppText style={styles.description}>{idea.description}</AppText> : null}

          {rows.length > 0 ? (
            <View style={styles.card}>
              {rows.map((row, index) => {
                const content = (
                  <>
                    {row.icon ? <Icon name={row.icon} color={colors.accentInk} size={20} /> : <CategoryIcon category={idea.category} size={20} color={colors.accentInk} />}
                    <AppText variant="bodyStrong" style={[styles.flex, row.onPress && { color: colors.accent }]} numberOfLines={2}>
                      {row.label}
                    </AppText>
                    {row.detail ? <Text style={styles.rowDetail}>{row.detail}</Text> : null}
                  </>
                );
                return (
                  <View key={`${row.label}-${index}`}>
                    {index > 0 ? <View style={styles.separator} /> : null}
                    {row.onPress ? (
                      <Pressable accessibilityRole="link" onPress={row.onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                        {content}
                      </Pressable>
                    ) : (
                      <View style={styles.row}>{content}</View>
                    )}
                  </View>
                );
              })}
            </View>
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
  hero: { height: 240, paddingHorizontal: 14 },
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
  byline: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  statusTrack: { flexDirection: 'row', backgroundColor: colors.chip, borderRadius: 14, padding: 4 },
  statusSegment: { flex: 1, minHeight: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  statusSegmentActive: {
    backgroundColor: colors.surface,
    shadowColor: colors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  statusText: { fontFamily: fontFamily.semibold, fontSize: 14, color: colors.inkSecondary },
  statusTextActive: { color: colors.ink },
  statusChip: { flexDirection: 'row' },
  description: { color: '#2C3443', lineHeight: 23 },
  card: { backgroundColor: colors.surface, borderRadius: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48, paddingVertical: spacing.md, paddingHorizontal: 14 },
  pressed: { opacity: 0.6 },
  rowDetail: { fontFamily: fontFamily.semibold, fontSize: 14, color: colors.accentInk },
  separator: { height: 1, backgroundColor: colors.separator, marginLeft: 46 },
});
