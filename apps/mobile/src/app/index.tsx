import { colors, fontFamily, radii, spacing } from '@7trip/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApiHealth } from '@/lib/use-api-health';

// Placeholder home for the foundation step: proves fonts, tokens and the API connection work.
// Replaced by "Mes voyages" in step 2 (docs/roadmap.md).
export default function HomeScreen() {
  const health = useApiHealth();
  const label =
    health === 'checking' ? 'Connexion à l’API…' : health === 'up' ? 'API connectée' : 'API injoignable';

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.logo}>7Trip</Text>
        <Text style={styles.title}>Tout ton voyage, au même endroit.</Text>
        <View style={[styles.pill, health === 'up' ? styles.pillUp : styles.pillOther]}>
          <Text style={[styles.pillText, health === 'up' ? styles.pillTextUp : styles.pillTextOther]}>
            {label}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  logo: {
    fontFamily: fontFamily.logo,
    fontSize: 44,
    letterSpacing: -1.2,
    color: colors.ink,
  },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: 17,
    color: colors.inkSecondary,
    textAlign: 'center',
  },
  pill: {
    borderRadius: radii.chip,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pillUp: { backgroundColor: colors.accentTint },
  pillOther: { backgroundColor: colors.chip },
  pillText: { fontFamily: fontFamily.bold, fontSize: 13 },
  pillTextUp: { color: colors.accentInk },
  pillTextOther: { color: colors.inkTertiary },
});
