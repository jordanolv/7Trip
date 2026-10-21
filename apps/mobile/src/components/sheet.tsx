import { colors, spacing } from '@7trip/ui-tokens';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from './ui/app-text';
import { Icon } from './ui/icon';

/** Stack options for a quick action: a sheet from the bottom, as tall as its content. */
export const sheetOptions = {
  presentation: 'formSheet',
  sheetAllowedDetents: 'fitToContents',
  sheetGrabberVisible: true,
  sheetCornerRadius: 28,
} as const;

/** Layout of a sheet screen: title and close button on top, then the content. Never flex: the sheet sizes to it. */
export function Sheet({ title, children }: { title: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
      <View style={styles.header}>
        <AppText variant="heading" style={styles.title}>
          {title}
        </AppText>
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={close} style={styles.close}>
          <Icon name="close" size={20} />
        </Pressable>
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: colors.background, paddingTop: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingLeft: spacing.lg, paddingRight: spacing.md },
  title: { flex: 1 },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.chip, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, gap: spacing.lg },
});
