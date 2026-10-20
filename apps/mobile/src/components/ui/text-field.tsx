import { colors, fontFamily, radii } from '@7trip/ui-tokens';
import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { AppText } from './app-text';

export interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string | null;
  hint?: string;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, hint, secureTextEntry, style, onFocus, onBlur, ...props },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.accent : colors.border;

  return (
    <View style={styles.wrapper}>
      <AppText variant="label">{label}</AppText>
      <View style={[styles.field, { borderColor }]}>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={colors.inkSecondary}
          secureTextEntry={secureTextEntry && !revealed}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[styles.input, style]}
          {...props}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            onPress={() => setRevealed((value) => !value)}
            style={styles.reveal}
          >
            <Text style={styles.revealText}>{revealed ? 'Masquer' : 'Afficher'}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="secondary">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  field: {
    minHeight: 52,
    borderRadius: radii.button,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    color: colors.ink,
  },
  reveal: { paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' },
  revealText: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.accent },
});
