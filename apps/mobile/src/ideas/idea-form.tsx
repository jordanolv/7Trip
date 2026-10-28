import { IDEA_CATEGORIES, IDEA_CATEGORY_LABELS, type Idea, type IdeaCategory } from '@7trip/shared';
import { colors, fontFamily, radii, spacing } from '@7trip/ui-tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { TextField } from '@/components/ui/text-field';

import { CategoryIcon } from './idea-visuals';

export interface IdeaFormValues {
  title: string;
  category: IdeaCategory | null;
  place: string;
  url: string;
  cost: string;
  description: string;
}

export const emptyIdeaForm: IdeaFormValues = { title: '', category: null, place: '', url: '', cost: '', description: '' };

export const ideaFormValues = (idea: Idea): IdeaFormValues => ({
  title: idea.title,
  category: idea.category,
  place: idea.place ?? '',
  url: idea.url ?? '',
  cost: idea.cost ?? '',
  description: idea.description ?? '',
});

/** Title first, everything else optional (CDC §5). Blank fields are sent as "none" by the schema. */
export function IdeaForm({
  values,
  onChange,
  errors,
  autoFocusTitle,
}: {
  values: IdeaFormValues;
  onChange: (values: IdeaFormValues) => void;
  errors: Record<string, string | undefined>;
  autoFocusTitle?: boolean;
}) {
  const set = <K extends keyof IdeaFormValues>(key: K, value: IdeaFormValues[K]) => onChange({ ...values, [key]: value });

  return (
    <>
      <TextField
        label="Ton idée"
        value={values.title}
        onChangeText={(text) => set('title', text)}
        placeholder="Coucher de soleil à la Plaza de España"
        autoFocus={autoFocusTitle}
        maxLength={80}
        error={errors.title}
      />

      <View style={styles.section}>
        <AppText variant="label">Catégorie</AppText>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {IDEA_CATEGORIES.map((category) => {
            const active = values.category === category;
            return (
              <Pressable
                key={category}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                // Tapping the chosen category again clears it: the category is optional.
                onPress={() => set('category', active ? null : category)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <CategoryIcon category={category} size={16} color={active ? colors.surface : undefined} />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{IDEA_CATEGORY_LABELS[category]}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <TextField
        label="Lieu"
        value={values.place}
        onChangeText={(text) => set('place', text)}
        placeholder="Plaza de España, Séville"
        maxLength={120}
        error={errors.place}
      />
      <TextField
        label="Coût estimé"
        value={values.cost}
        onChangeText={(text) => set('cost', text)}
        placeholder="Gratuit, ~25 € / pers."
        maxLength={40}
        error={errors.cost}
      />
      <TextField
        label="Lien"
        value={values.url}
        onChangeText={(text) => set('url', text)}
        placeholder="Site, réservation, Google Maps…"
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={500}
        error={errors.url}
      />
      <TextField
        label="Description"
        value={values.description}
        onChangeText={(text) => set('description', text)}
        placeholder="Pourquoi ça vaut le coup, quand y aller…"
        multiline
        maxLength={1000}
        style={styles.multiline}
        error={errors.description}
      />
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 13,
    borderRadius: radii.chip,
    backgroundColor: colors.chip,
  },
  chipActive: { backgroundColor: colors.ink },
  chipText: { fontFamily: fontFamily.semibold, fontSize: 14, color: colors.inkTertiary },
  chipTextActive: { color: colors.surface },
  multiline: { minHeight: 110, textAlignVertical: 'top' },
});
