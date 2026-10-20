import { colors, spacing } from '@7trip/ui-tokens';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from './ui/app-text';
import { Icon, type IconName } from './ui/icon';

/** Placeholder for trip modules that are not built yet (docs/roadmap.md). */
export function ComingSoon({ title, icon, description }: { title: string; icon: IconName; description: string }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}>
      <AppText variant="title">{title}</AppText>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Icon name={icon} color={colors.accentInk} size={26} />
        </View>
        <AppText variant="heading">Bientôt dans 7Trip</AppText>
        <AppText tone="secondary">{description}</AppText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, gap: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: 22, padding: spacing.xl, gap: spacing.sm },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
});
