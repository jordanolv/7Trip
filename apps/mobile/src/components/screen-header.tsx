import { colors, spacing } from '@7trip/ui-tokens';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from './ui/app-text';
import { Icon } from './ui/icon';

/** Compact header for stacked screens: back (or close) button, an optional centred title and an optional action on the right. */
export function ScreenHeader({ title, mode = 'back', right }: { title?: string; mode?: 'back' | 'close'; right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  // "close" is the header of modals: on iOS the sheet already starts below the status bar.
  const top = mode === 'close' && Platform.OS === 'ios' ? 0 : insets.top;
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <View style={[styles.header, { paddingTop: top + spacing.sm }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={mode === 'back' ? 'Retour' : 'Fermer'}
        onPress={leave}
        style={styles.button}
      >
        <Icon name={mode === 'back' ? 'back' : 'close'} />
      </Pressable>
      {title ? (
        <AppText variant="bodyStrong" style={styles.title}>
          {title}
        </AppText>
      ) : null}
      <View style={styles.button}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
  },
  button: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center' },
});
