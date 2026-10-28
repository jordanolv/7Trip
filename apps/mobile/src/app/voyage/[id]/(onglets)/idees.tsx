import { authorName, type Idea, type IdeaStatus } from '@7trip/shared';
import { colors, fontFamily, radii, spacing } from '@7trip/ui-tokens';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { CategoryTile, IdeaStatusChip, ideaMeta } from '@/ideas/idea-visuals';
import { useIdeas } from '@/ideas/ideas-api';
import { useTrip } from '@/trips/trips-api';
import { useTripId } from '@/trips/use-trip-id';

type Filter = 'all' | IdeaStatus;

/** The idea box: a simple list with filters, not a board (CDC §5). */
export default function IdeesScreen() {
  const tripId = useTripId();
  const insets = useSafeAreaInsets();
  const trip = useTrip(tripId);
  const ideas = useIdeas(tripId);
  const [filter, setFilter] = useState<Filter>('all');

  const all = ideas.data ?? [];
  const shown = filter === 'all' ? all : all.filter((idea) => idea.status === filter);
  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: all.length ? `Toutes · ${all.length}` : 'Toutes' },
    { key: 'PROPOSED', label: 'Proposées' },
    { key: 'KEPT', label: 'Retenues' },
  ];
  const propose = () => router.push(`/voyage/${tripId}/idee/nouvelle` as Href);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm }]}
      refreshControl={<RefreshControl refreshing={ideas.isRefetching} onRefresh={() => void ideas.refetch()} tintColor={colors.accent} />}
    >
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="title">Idées</AppText>
          {trip.data ? (
            <AppText variant="caption" tone="secondary" numberOfLines={1}>
              {trip.data.title}
            </AppText>
          ) : null}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Proposer une idée" onPress={propose} style={styles.add}>
          <Icon name="plus" color={colors.surface} size={24} />
        </Pressable>
      </View>

      {all.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {filters.map(({ key, label }) => {
            const active = key === filter;
            return (
              <Pressable
                key={key}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setFilter(key)}
                style={[styles.filter, active && styles.filterActive]}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {ideas.isPending ? (
        <ActivityIndicator color={colors.accent} style={styles.loading} />
      ) : ideas.isError && !ideas.data ? (
        <View style={styles.empty}>
          <AppText variant="heading">Impossible de charger les idées</AppText>
          <AppText tone="secondary">{ideas.error.message}</AppText>
          <Button title="Réessayer" variant="soft" onPress={() => void ideas.refetch()} />
        </View>
      ) : all.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Icon name="idea" color={colors.accentInk} size={26} />
          </View>
          <AppText variant="heading">Aucune idée pour l’instant</AppText>
          <AppText tone="secondary">
            Une activité, un resto, une plage… Note-la ici : le groupe la verra, et elle pourra rejoindre le planning.
          </AppText>
          <Button title="Proposer une idée" onPress={propose} icon={<Icon name="plus" color={colors.surface} size={20} />} />
        </View>
      ) : shown.length === 0 ? (
        <AppText tone="secondary" style={styles.none}>
          {filter === 'KEPT' ? 'Aucune idée retenue pour l’instant.' : 'Aucune idée en attente.'}
        </AppText>
      ) : (
        <View style={styles.list}>
          {shown.map((idea) => (
            <IdeaRow key={idea.id} idea={idea} onPress={() => router.push(`/voyage/${tripId}/idee/${idea.id}` as Href)} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function IdeaRow({ idea, onPress }: { idea: Idea; onPress: () => void }) {
  const meta = ideaMeta(idea);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <CategoryTile category={idea.category} />
      <View style={styles.flex}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {idea.title}
        </AppText>
        {meta ? (
          <AppText variant="caption" tone="secondary" numberOfLines={1} style={styles.meta}>
            {meta}
          </AppText>
        ) : null}
        <View style={styles.statusLine}>
          <IdeaStatusChip status={idea.status} />
          <Text style={styles.author} numberOfLines={1}>
            par {authorName(idea.author)}
          </Text>
        </View>
      </View>
      <Icon name="chevronRight" color={colors.inkSecondary} size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  flex: { flex: 1, minWidth: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  add: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  filters: { gap: spacing.sm },
  filter: { minHeight: 36, paddingHorizontal: 13, borderRadius: radii.chip, backgroundColor: colors.chip, justifyContent: 'center' },
  filterActive: { backgroundColor: colors.ink },
  filterText: { fontFamily: fontFamily.semibold, fontSize: 13, color: colors.inkTertiary },
  filterTextActive: { color: colors.surface },
  loading: { marginTop: spacing.xxl },
  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 10,
    paddingRight: spacing.md,
    shadowColor: colors.ink,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  pressed: { opacity: 0.7 },
  meta: { marginTop: 2 },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  author: { flexShrink: 1, fontFamily: fontFamily.medium, fontSize: 11, color: colors.inkSecondary },
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
  none: { textAlign: 'center', marginTop: spacing.lg },
});
