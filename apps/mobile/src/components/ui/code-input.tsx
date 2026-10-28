import { EMAIL_CODE_LENGTH } from '@7trip/shared';
import { colors, fontFamily, radii } from '@7trip/ui-tokens';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputInstance } from 'react-native';

/** Six boxes backed by one hidden input, so paste and SMS / email autofill work. */
export function CodeInput({
  value,
  onChange,
  hasError,
  autoFocus,
}: {
  value: string;
  onChange: (code: string) => void;
  hasError?: boolean;
  autoFocus?: boolean;
}) {
  const input = useRef<TextInputInstance>(null);
  const [focused, setFocused] = useState(false);
  const digits = value.padEnd(EMAIL_CODE_LENGTH, ' ').slice(0, EMAIL_CODE_LENGTH).split('');

  return (
    <Pressable onPress={() => input.current?.focus()} accessibilityRole="none">
      <View style={styles.row}>
        {digits.map((digit, index) => {
          const active = focused && index === Math.min(value.length, EMAIL_CODE_LENGTH - 1);
          return (
            <View
              key={index}
              style={[
                styles.box,
                active && styles.boxActive,
                hasError && styles.boxError,
              ]}
            >
              <Text style={styles.digit}>{digit.trim()}</Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={input}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, EMAIL_CODE_LENGTH))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        maxLength={EMAIL_CODE_LENGTH}
        accessibilityLabel={`Code à ${EMAIL_CODE_LENGTH} chiffres`}
        style={styles.hidden}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  box: {
    flex: 1,
    height: 60,
    borderRadius: radii.button - 2,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: { borderColor: colors.accent, borderWidth: 2 },
  boxError: { borderColor: colors.danger },
  digit: { fontFamily: fontFamily.extrabold, fontSize: 24, color: colors.ink },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
});
