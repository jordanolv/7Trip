import { colors, spacing } from '@7trip/ui-tokens';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TopoLines } from '@/components/topo-lines';
import { AppText } from '@/components/ui/app-text';

export default function PortfolioScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <TopoLines />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}>
        <AppText variant="display">Portfolio</AppText>
        <View style={styles.card}>
          <AppText variant="heading">Tes voyages terminés apparaîtront ici</AppText>
          <AppText tone="secondary">
            Destinations visitées, dates et souvenirs se rassemblent au fil de tes voyages, sans rien avoir à remplir.
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, gap: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: 22, padding: spacing.xl, gap: spacing.sm },
});
