import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  amountInputText,
  authorName,
  createExpenseRequestSchema,
  expenseShares,
  formatMoney,
  localIsoDate,
  parseAmount,
  type ContentAuthor,
  type CreateExpenseRequest,
  type Expense,
  type ExpenseCategory,
} from '@7trip/shared';
import { colors, fontFamily, radii, spacing } from '@7trip/ui-tokens';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { AppText } from '@/components/ui/app-text';
import { DateField } from '@/components/ui/date-field';
import { Icon } from '@/components/ui/icon';
import { Segmented } from '@/components/ui/segmented';

import { ExpenseCategoryIcon } from './expense-visuals';

export interface ExpenseFormValues {
  amount: string;
  label: string;
  personal: boolean;
  payerId: string;
  /** Who shares it: every member by default (CDC §8.1). */
  included: string[];
  /** Amounts per person instead of equal parts. */
  custom: boolean;
  customAmounts: Record<string, string>;
  date: string;
  category: ExpenseCategory | null;
}

export function newExpenseForm(people: ContentAuthor[], meId: string): ExpenseFormValues {
  return {
    amount: '',
    label: '',
    personal: false,
    payerId: meId,
    included: people.filter((p) => !p.hasLeft).map((p) => p.id),
    custom: false,
    customAmounts: {},
    date: localIsoDate(),
    category: null,
  };
}

export function expenseFormValues(expense: Expense): ExpenseFormValues {
  return {
    amount: amountInputText(expense.amountMinor),
    label: expense.label,
    personal: expense.personal,
    payerId: expense.payer.id,
    included: expense.shares.map((s) => s.participant.id),
    custom: expense.splitMode === 'CUSTOM',
    customAmounts: Object.fromEntries(expense.shares.map((s) => [s.participant.id, amountInputText(s.amountMinor)])),
    date: expense.date,
    category: expense.category,
  };
}

/** The request for these values, as the API expects it (its schema checks the rest). */
export function expenseRequest(values: ExpenseFormValues): CreateExpenseRequest {
  return {
    label: values.label,
    amountMinor: parseAmount(values.amount) ?? Number.NaN,
    date: values.date,
    category: values.category,
    personal: values.personal,
    payerId: values.payerId,
    // A personal expense has no split: the hidden shared-expense choices must not block it.
    split: values.personal
      ? undefined
      : values.custom
        ? { mode: 'CUSTOM', shares: values.included.map((id) => ({ participantId: id, amountMinor: parseAmount(values.customAmounts[id] || '0') ?? Number.NaN })) }
        : { mode: 'EQUAL', participantIds: values.included },
  };
}

/** Errors by field, from the shared schema (amount, label, split…). */
export function expenseFormErrors(values: ExpenseFormValues): Record<string, string> {
  const parsed = createExpenseRequestSchema.safeParse(expenseRequest(values));
  const errors: Record<string, string> = {};
  if (!parsed.success) for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;
  if (parseAmount(values.amount) === null) errors.amountMinor = values.amount ? 'Montant invalide' : 'Indique le montant';
  return errors;
}

/**
 * Quick add first: amount, label, who paid, then personal or shared (CDC §8.1). Shared: everyone is
 * ticked, the parts show as they change; "Personnaliser" sets an amount per person.
 */
export function ExpenseForm({
  values,
  onChange,
  errors,
  people,
  meId,
  autoFocus,
}: {
  values: ExpenseFormValues;
  onChange: (values: ExpenseFormValues) => void;
  errors: Record<string, string | undefined>;
  /** Members first, in the order they joined; then anyone already on the expense who has left. */
  people: ContentAuthor[];
  meId: string;
  autoFocus?: boolean;
}) {
  const set = <K extends keyof ExpenseFormValues>(key: K, value: ExpenseFormValues[K]) => onChange({ ...values, [key]: value });
  const amountMinor = parseAmount(values.amount);
  const order = people.map((p) => p.id);
  const preview =
    amountMinor && !values.custom && values.included.length
      ? new Map(expenseShares({ amountMinor, personal: false, payerId: values.payerId, split: { mode: 'EQUAL', participantIds: values.included } }, order).map((s) => [s.participantId, s.amountMinor]))
      : null;
  const customTotal = values.included.reduce((sum, id) => sum + (parseAmount(values.customAmounts[id] || '0') ?? 0), 0);
  const name = (p: ContentAuthor) => (p.id === meId ? 'Toi' : authorName(p));
  // You first among the payers, like in the mockup.
  const payers = [...people.filter((p) => p.id === meId), ...people.filter((p) => p.id !== meId && !p.hasLeft)];

  const toggle = (id: string) =>
    set('included', values.included.includes(id) ? values.included.filter((other) => other !== id) : order.filter((other) => other === id || values.included.includes(other)));

  return (
    <>
      <View style={styles.amountBlock}>
        <View style={styles.amountRow}>
          <TextInput
            accessibilityLabel="Montant"
            value={values.amount}
            onChangeText={(text) => set('amount', text)}
            placeholder="0,00"
            placeholderTextColor={colors.border}
            keyboardType="decimal-pad"
            autoFocus={autoFocus}
            maxLength={12}
            style={styles.amount}
          />
          <Text style={styles.currency}>€</Text>
        </View>
        {errors.amountMinor ? (
          <AppText variant="caption" tone="danger">
            {errors.amountMinor}
          </AppText>
        ) : null}
        <TextInput
          accessibilityLabel="Libellé"
          value={values.label}
          onChangeText={(text) => set('label', text)}
          placeholder="Tapas à Triana"
          placeholderTextColor={colors.inkSecondary}
          maxLength={80}
          style={[styles.label, errors.label ? styles.labelError : null]}
        />
        {errors.label ? (
          <AppText variant="caption" tone="danger">
            {errors.label}
          </AppText>
        ) : null}
      </View>

      <Segmented
        options={[
          { value: 'personal', label: 'Personnelle' },
          { value: 'shared', label: 'Partagée' },
        ]}
        value={values.personal ? 'personal' : 'shared'}
        onChange={(mode) => onChange({ ...values, personal: mode === 'personal', payerId: mode === 'personal' ? meId : values.payerId })}
      />

      {values.personal ? (
        <View style={styles.note}>
          <Icon name="lock" color={colors.inkSecondary} size={18} />
          <AppText variant="caption" tone="secondary" style={styles.flex}>
            Dépense personnelle : elle compte uniquement dans ton budget et n’entre pas dans les remboursements. Personne d’autre ne la voit.
          </AppText>
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <AppText variant="label">Payé par</AppText>
            <View style={styles.chips} accessibilityRole="radiogroup">
              {payers.map((p) => {
                const active = values.payerId === p.id;
                return (
                  <Pressable
                    key={p.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    onPress={() => set('payerId', p.id)}
                    style={[styles.payer, active && styles.chipActive]}
                  >
                    <Avatar name={p.displayName} color={p.avatarColor} size={26} />
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{name(p)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <AppText variant="label">
                Pour qui ? <Text style={styles.mode}>· {values.custom ? 'montants personnalisés' : 'parts égales'}</Text>
              </AppText>
              <Pressable accessibilityRole="button" hitSlop={8} onPress={() => set('custom', !values.custom)}>
                <AppText variant="label" tone="accent">
                  {values.custom ? 'Parts égales' : 'Personnaliser'}
                </AppText>
              </Pressable>
            </View>
            <View style={styles.people}>
              {people.map((p, index) => {
                const on = values.included.includes(p.id);
                return (
                  <View key={p.id} style={[styles.person, index > 0 && styles.personBorder]}>
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={name(p)}
                      onPress={() => toggle(p.id)}
                      style={styles.personMain}
                    >
                      <View style={[styles.box, on && styles.boxOn]}>{on ? <Icon name="check" color={colors.surface} size={16} /> : null}</View>
                      <Avatar name={p.displayName} color={p.avatarColor} size={30} />
                      <Text style={[styles.personName, !on && styles.off]} numberOfLines={1}>
                        {name(p)}
                      </Text>
                    </Pressable>
                    {!on ? (
                      <Text style={styles.off}>exclu</Text>
                    ) : values.custom ? (
                      <TextInput
                        accessibilityLabel={`Part de ${name(p)}`}
                        value={values.customAmounts[p.id] ?? ''}
                        onChangeText={(text) => set('customAmounts', { ...values.customAmounts, [p.id]: text })}
                        placeholder="0,00"
                        placeholderTextColor={colors.border}
                        keyboardType="decimal-pad"
                        maxLength={12}
                        style={styles.share}
                      />
                    ) : (
                      <Text style={styles.shareText}>{preview?.has(p.id) ? formatMoney(preview.get(p.id)!) : '—'}</Text>
                    )}
                  </View>
                );
              })}
            </View>
            {values.custom && amountMinor ? (
              <AppText variant="caption" tone={customTotal === amountMinor ? 'secondary' : 'danger'}>
                {customTotal === amountMinor
                  ? 'Le compte est bon.'
                  : customTotal < amountMinor
                    ? `Reste ${formatMoney(amountMinor - customTotal)} à répartir`
                    : `Les parts dépassent de ${formatMoney(customTotal - amountMinor)}`}
              </AppText>
            ) : null}
            {errors.split ? (
              <AppText variant="caption" tone="danger">
                {errors.split}
              </AppText>
            ) : null}
          </View>
        </>
      )}

      <DateField label="Date" value={values.date} onChange={(iso) => iso && set('date', iso)} clearable={false} />

      <View style={styles.section}>
        <AppText variant="label">Catégorie</AppText>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {EXPENSE_CATEGORIES.map((category) => {
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
                <ExpenseCategoryIcon category={category} size={16} color={active ? colors.surface : undefined} />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{EXPENSE_CATEGORY_LABELS[category]}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  amountBlock: { alignItems: 'center', gap: spacing.sm },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  amount: { minWidth: 120, textAlign: 'center', fontFamily: fontFamily.extrabold, fontSize: 44, letterSpacing: -1, color: colors.ink },
  currency: { fontFamily: fontFamily.extrabold, fontSize: 32, color: colors.inkSecondary },
  label: {
    width: 260,
    height: 40,
    borderBottomWidth: 2,
    borderBottomColor: '#E3DCCF',
    textAlign: 'center',
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    color: colors.ink,
  },
  labelError: { borderBottomColor: colors.danger },
  note: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: colors.surface, borderRadius: 14, padding: spacing.md },
  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mode: { fontFamily: fontFamily.medium, color: colors.inkSecondary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 13, borderRadius: radii.chip, backgroundColor: colors.chip },
  payer: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, paddingLeft: 7, paddingRight: 14, borderRadius: radii.chip, backgroundColor: colors.chip },
  chipActive: { backgroundColor: colors.ink },
  chipText: { fontFamily: fontFamily.semibold, fontSize: 14, color: colors.inkTertiary },
  chipTextActive: { color: colors.surface },
  people: { backgroundColor: colors.surface, borderRadius: 18, paddingHorizontal: spacing.md },
  person: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56 },
  personBorder: { borderTopWidth: 1, borderTopColor: colors.separator },
  personMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56 },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: '#C9C2B4', alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  personName: { flex: 1, fontFamily: fontFamily.semibold, fontSize: 15, color: colors.ink },
  off: { fontFamily: fontFamily.medium, fontSize: 14, color: '#8C8A84' },
  shareText: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.ink },
  share: {
    width: 92,
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 10,
    textAlign: 'right',
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.ink,
  },
});
