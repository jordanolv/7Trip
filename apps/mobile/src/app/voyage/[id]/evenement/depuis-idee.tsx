import { colors, spacing } from '@7trip/ui-tokens';
import { router, type Href } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/screen-header';
import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';
import { CategoryTile, ideaMeta } from '@/ideas/idea-visuals';
import { useIdeas } from '@/ideas/ideas-api';
import { useTripId } from '@/trips/use-trip-id';

/** "Partir d'une idée": the ideas not on the planning yet, retained ones first. */
export default function DepuisIdeeScreen() {
  const tripId = useTripId();
  const ideas = useIdeas(tripId);
  const unplanned = (ideas.data ?? [])
    .filter((idea) => !idea.plannedEvent)
    .sort((a, b) => Number(b.status === 'KEPT') - Number(a.status === 'KEPT'));

  return (
    <>
      <ScreenHeader mode="close" title="Partir d’une idée" />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {ideas.isPending ? (
          <ActivityIndicator color={colors.accent} />
        ) : unplanned.length === 0 ? (
          <AppText tone="secondary" style={styles.none}>
            Toutes les idées sont déjà au planning.
          </AppText>
        ) : (
          unplanned.map((idea) => (
            <Pressable
              key={idea.id}
              accessibilityRole="button"
              onPress={() => router.replace(`/voyage/${tripId}/idee/${idea.id}/planifier` as Href)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <CategoryTile category={idea.category} size={48} />
              <View style={styles.flex}>
                <AppText variant="bodyStrong" numberOfLines={1}>
                  {idea.title}
                </AppText>
                <AppText variant="caption" tone="secondary" numberOfLines={1}>
                  {[idea.status === 'KEPT' ? 'Retenue' : null, ideaMeta(idea)].filter(Boolean).join(' · ') || 'Proposée'}
                </AppText>
              </View>
              <Icon name="chevronRight" color={colors.inkSecondary} size={18} />
            </Pressable>
          ))
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: 10 },
  flex: { flex: 1, minWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: 18, padding: 10, paddingRight: spacing.md },
  pressed: { opacity: 0.7 },
  none: { textAlign: 'center', marginTop: spacing.xl },
});
