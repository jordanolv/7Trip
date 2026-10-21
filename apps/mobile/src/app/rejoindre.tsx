import { parseInvitationCode } from '@7trip/shared';
import { colors, fontFamily, spacing } from '@7trip/ui-tokens';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Sheet } from '@/components/sheet';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { TextField } from '@/components/ui/text-field';

/** Paste an invitation link or type its code. */
export default function RejoindreScreen() {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string>();

  const go = (input: string) => {
    const code = parseInvitationCode(input);
    if (!code) {
      setError('Colle le lien reçu, ou ses 10 derniers caractères.');
      return;
    }
    router.replace({ pathname: '/j/[code]', params: { code } });
  };
  // A pasted link is complete: no need to also tap "Continuer".
  const paste = (text: string) => {
    setValue(text);
    setError(undefined);
    if (parseInvitationCode(text)) go(text);
  };

  return (
    <Sheet title="Rejoindre un voyage">
      <PasteButton onPaste={paste} />
      <TextField
        label="Ou saisis le code"
        value={value}
        onChangeText={(text) => {
          setValue(text);
          setError(undefined);
        }}
        placeholder="k7mz2qpx4r"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="go"
        onSubmitEditing={() => go(value)}
        error={error}
      />
      <Button title="Continuer" variant="soft" onPress={() => go(value)} />
    </Sheet>
  );
}

/**
 * iOS: the system paste button, which reads the clipboard without the "Allow paste?" prompt.
 * Elsewhere, reading the clipboard on tap asks nothing.
 */
function PasteButton({ onPaste }: { onPaste: (text: string) => void }) {
  if (Clipboard.isPasteButtonAvailable) {
    return (
      <View style={styles.native}>
        <Clipboard.ClipboardPasteButton
          acceptedContentTypes={['plain-text']}
          onPress={(data) => data.type === 'text' && onPaste(data.text)}
          backgroundColor={colors.accent}
          foregroundColor={colors.surface}
          cornerStyle="large"
          style={styles.nativeButton}
        />
      </View>
    );
  }
  return (
    <Pressable accessibilityRole="button" onPress={() => void Clipboard.getStringAsync().then(onPaste)} style={styles.fallback}>
      <Icon name="copy" color={colors.surface} size={20} />
      <Text style={styles.fallbackText}>Coller le lien</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  native: { alignItems: 'stretch' },
  nativeButton: { height: 52, width: '100%' },
  fallback: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.accent,
  },
  fallbackText: { fontFamily: fontFamily.bold, fontSize: 16, color: colors.surface },
});
