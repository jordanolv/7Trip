import { colors, spacing } from '@7trip/ui-tokens';
import { StyleSheet, View } from 'react-native';

import { AppText } from './ui/app-text';

/**
 * Development only: the API does not send real emails yet, it returns the code instead.
 * Shown so the flow can be tested on a phone. Never rendered in production (no code is returned).
 */
export function DevCodeBanner({ code }: { code: string | null | undefined }) {
  if (!code) return null;
  return (
    <View style={styles.banner}>
      <AppText variant="caption" style={{ color: colors.infoInk }}>
        Mode test — aucun email n’est envoyé pour l’instant. Ton code :
      </AppText>
      <AppText variant="heading" selectable style={{ color: colors.infoInk, letterSpacing: 4 }}>
        {code}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: colors.infoTint, borderRadius: 16, padding: spacing.md + 2, gap: 2 },
});
