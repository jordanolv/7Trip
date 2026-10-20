import { MAX_DESTINATIONS } from '@7trip/shared';
import { colors, fontFamily, spacing } from '@7trip/ui-tokens';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';

/**
 * Ordered list of stops ("Cracovie → Varsovie"). Reordering uses arrow buttons — the accessible
 * alternative to drag and drop required by CDC §12.
 */
export function DestinationsEditor({
  value,
  onChange,
  error,
}: {
  value: string[];
  onChange: (destinations: string[]) => void;
  error?: string;
}) {
  // Index of the stop that was just added, to focus its field.
  const [focusIndex, setFocusIndex] = useState<number | null>(null);

  const update = (index: number, name: string) => onChange(value.map((v, i) => (i === index ? name : v)));
  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));
  const moveUp = (index: number) => {
    const next = [...value];
    [next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
    onChange(next);
  };
  const add = () => {
    setFocusIndex(value.length);
    onChange([...value, '']);
  };

  return (
    <View>
      <View style={styles.header}>
        <AppText variant="bodyStrong">{value.length > 1 ? 'Destinations' : 'Destination'}</AppText>
        {value.length === 0 ? (
          <AppText variant="bodyStrong" tone="secondary">
            Pas encore décidée
          </AppText>
        ) : null}
      </View>

      {value.map((name, index) => (
        <View key={index} style={styles.stop}>
          <View style={styles.number}>
            <Text style={styles.numberText}>{index + 1}</Text>
          </View>
          <TextInput
            accessibilityLabel={`Étape ${index + 1}`}
            value={name}
            onChangeText={(text) => update(index, text)}
            placeholder={index === 0 ? 'Ville, région ou pays' : 'Étape suivante'}
            placeholderTextColor={colors.inkSecondary}
            autoFocus={focusIndex === index}
            maxLength={80}
            returnKeyType="done"
            style={styles.input}
          />
          {index > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Placer ${name || `l’étape ${index + 1}`} avant l’étape ${index}`}
              onPress={() => moveUp(index)}
              style={styles.iconButton}
            >
              <Icon name="arrowUp" size={18} color={colors.inkSecondary} />
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Retirer ${name || `l’étape ${index + 1}`}`}
            onPress={() => remove(index)}
            style={styles.iconButton}
          >
            <Icon name="close" size={16} color={colors.inkSecondary} strokeWidth={2.4} />
          </Pressable>
        </View>
      ))}

      {value.length < MAX_DESTINATIONS ? (
        <Pressable accessibilityRole="button" onPress={add} style={styles.add}>
          <Icon name="plus" size={18} color={colors.accent} strokeWidth={2.4} />
          <AppText variant="bodyStrong" tone="accent">
            {value.length === 0 ? 'Ajouter une destination' : 'Ajouter une étape'}
          </AppText>
        </Pressable>
      ) : null}

      {error ? (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48 },
  number: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: { fontFamily: fontFamily.bold, fontSize: 12, color: colors.accentInk },
  input: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    color: colors.ink,
  },
  iconButton: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  add: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48 },
});
