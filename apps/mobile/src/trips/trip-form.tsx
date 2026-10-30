import { currencyLabel, currencySymbol, type CurrencyCode, type TripKind } from '@7trip/shared';
import { colors, fontFamily, radii, spacing } from '@7trip/ui-tokens';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { DateField } from '@/components/ui/date-field';
import { Icon } from '@/components/ui/icon';
import { Segmented } from '@/components/ui/segmented';
import { CurrencyPicker } from '@/finances/currency-picker';

import { DestinationsEditor } from './destinations-editor';

export interface TripFormValues {
  title: string;
  destinations: string[];
  startDate: string | null;
  endDate: string | null;
  kind: TripKind;
  /** Balances and budgets are in it; each expense may be paid in another one. */
  baseCurrency: CurrencyCode;
}

/** Title + optional details (CDC §4: only the title is required). */
export function TripForm({
  values,
  onChange,
  errors,
  autoFocusTitle,
  currencyLocked = false,
}: {
  values: TripFormValues;
  onChange: (values: TripFormValues) => void;
  errors: Record<string, string | undefined>;
  autoFocusTitle?: boolean;
  /** The trip has expenses: its currency no longer changes. */
  currencyLocked?: boolean;
}) {
  const set = <K extends keyof TripFormValues>(key: K, value: TripFormValues[K]) => onChange({ ...values, [key]: value });
  const [picking, setPicking] = useState(false);

  return (
    <>
      <View style={styles.titleBlock}>
        <AppText variant="title" nativeID="trip-title-label">
          Comment s’appelle ce voyage ?
        </AppText>
        <TextInput
          accessibilityLabelledBy="trip-title-label"
          accessibilityLabel="Nom du voyage"
          value={values.title}
          onChangeText={(text) => set('title', text)}
          placeholder="Vacances d’été entre potes"
          placeholderTextColor={colors.inkSecondary}
          autoFocus={autoFocusTitle}
          maxLength={60}
          returnKeyType="done"
          style={[styles.titleInput, errors.title ? styles.inputError : null]}
        />
        {errors.title ? (
          <AppText variant="caption" tone="danger">
            {errors.title}
          </AppText>
        ) : (
          <AppText variant="caption" tone="secondary">
            C’est tout ce qu’il faut pour commencer. Le reste peut se décider plus tard, même par sondage avec ton groupe.
          </AppText>
        )}
      </View>

      <View style={styles.section}>
        <AppText variant="label" tone="secondary" style={styles.sectionTitle}>
          FACULTATIF
        </AppText>
        <View style={styles.card}>
          <View style={styles.rowPadding}>
            <DestinationsEditor
              value={values.destinations}
              onChange={(destinations) => set('destinations', destinations)}
              error={errors.destinations}
            />
          </View>
          <View style={styles.separator} />
          <View style={styles.rowPadding}>
            <DateField
              label="Du"
              value={values.startDate}
              onChange={(date) =>
                onChange({
                  ...values,
                  startDate: date,
                  // Keep the range valid: no end without a start, no end before the start.
                  endDate: !date ? null : values.endDate && values.endDate < date ? date : values.endDate,
                })
              }
            />
          </View>
          <View style={styles.separator} />
          <View style={styles.rowPadding}>
            <DateField label="Au" value={values.endDate} minimumDate={values.startDate} onChange={(date) => set('endDate', date)} />
          </View>
          {errors.endDate ? (
            <AppText variant="caption" tone="danger" style={styles.rowPadding}>
              {errors.endDate}
            </AppText>
          ) : null}
          <View style={styles.separator} />
          <View style={styles.row}>
            <AppText variant="bodyStrong">Voyage</AppText>
            <Segmented
              value={values.kind}
              onChange={(kind) => set('kind', kind)}
              options={[
                { value: 'SOLO', label: 'Solo' },
                { value: 'GROUP', label: 'En groupe' },
              ]}
            />
          </View>
          <View style={styles.separator} />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: currencyLocked }}
            disabled={currencyLocked}
            onPress={() => setPicking(true)}
            style={styles.row}
          >
            <AppText variant="bodyStrong">Devise</AppText>
            <View style={styles.currency}>
              <Text style={styles.currencyText}>
                {currencyLabel(values.baseCurrency)} · {currencySymbol(values.baseCurrency)}
              </Text>
              {currencyLocked ? <Icon name="lock" color={colors.inkSecondary} size={16} /> : <Icon name="chevronRight" color={colors.inkSecondary} size={18} />}
            </View>
          </Pressable>
          <AppText variant="caption" tone={errors.baseCurrency ? 'danger' : 'secondary'} style={styles.rowPadding}>
            {errors.baseCurrency ??
              (currencyLocked
                ? 'Les dépenses et remboursements sont comptés dans cette devise : elle ne change plus.'
                : 'Les soldes et les budgets sont dans cette devise. Chaque dépense peut être payée dans une autre.')}
          </AppText>
        </View>
      </View>
      <CurrencyPicker
        visible={picking}
        value={values.baseCurrency}
        first={values.baseCurrency}
        onSelect={(currency) => set('baseCurrency', currency)}
        onClose={() => setPicking(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  titleBlock: { gap: spacing.sm + 2 },
  titleInput: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
    paddingHorizontal: 18,
    fontFamily: fontFamily.semibold,
    fontSize: 18,
    color: colors.ink,
  },
  inputError: { borderColor: colors.danger },
  currency: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  currencyText: { fontFamily: fontFamily.semibold, fontSize: 15, color: colors.inkTertiary },
  section: { gap: spacing.sm + 2 },
  sectionTitle: { letterSpacing: 0.8 },
  card: { backgroundColor: colors.surface, borderRadius: radii.card, paddingVertical: spacing.xs },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  rowPadding: { paddingHorizontal: spacing.lg },
  separator: { height: 1, backgroundColor: colors.separator, marginLeft: spacing.lg },
});

/** Drops empty stops left by "Ajouter une étape" before sending the form. */
export function cleanDestinations(destinations: string[]): string[] {
  return destinations.map((name) => name.trim()).filter(Boolean);
}
