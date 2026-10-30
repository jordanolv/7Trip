import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  amountInputText,
  currencySymbol,
  parseAmount,
  type ExpenseCategory,
  type PersonalBudgetView,
} from "@7trip/shared";
import { colors, fontFamily, spacing } from "@7trip/ui-tokens";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { FormScreen } from "@/components/form-screen";
import { ScreenHeader } from "@/components/screen-header";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { ExpenseCategoryIcon } from "@/finances/expense-visuals";
import { useBudget, useSaveBudget } from "@/finances/finances-api";
import { haptics } from "@/lib/haptics";
import { useAction } from "@/lib/use-action";
import { useTripId } from "@/trips/use-trip-id";

export default function BudgetScreen() {
  const tripId = useTripId();
  const budget = useBudget(tripId);
  return (
    <>
      <ScreenHeader mode="close" title="Mon budget" />
      {budget.data ? (
        <BudgetForm tripId={tripId} budget={budget.data} />
      ) : (
        <View style={styles.center}>
          {budget.isPending ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <AppText tone="secondary">{budget.error?.message}</AppText>
          )}
        </View>
      )}
    </>
  );
}

/** A total, a cap for some categories, or both (CDC §8.3: "éventuellement réparti en catégories"). */
function BudgetForm({
  tripId,
  budget,
}: {
  tripId: string;
  budget: PersonalBudgetView;
}) {
  const save = useSaveBudget(tripId);
  const text = (minor: number | null | undefined) =>
    minor ? amountInputText(minor).replace(/,00$/, "") : "";
  const [total, setTotal] = useState(() => text(budget.budget?.totalMinor));
  const [caps, setCaps] = useState<Partial<Record<ExpenseCategory, string>>>(
    () =>
      Object.fromEntries(
        EXPENSE_CATEGORIES.map((category) => [
          category,
          text(budget.budget?.perCategory[category]),
        ]),
      ),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const symbol = currencySymbol(budget.currency);

  const submit = useAction(async () => {
    const found: Record<string, string> = {};
    const amount = (key: string, value: string | undefined) => {
      if (!value?.trim()) return null;
      const minor = parseAmount(value);
      if (!minor) found[key] = "Montant invalide";
      return minor;
    };
    const totalMinor = amount("total", total);
    const perCategory: Partial<Record<ExpenseCategory, number>> = {};
    for (const category of EXPENSE_CATEGORIES) {
      const minor = amount(category, caps[category]);
      if (minor) perCategory[category] = minor;
    }
    setErrors(found);
    if (Object.keys(found).length) return;
    await save.mutateAsync({ totalMinor, perCategory });
    haptics.success();
    router.back();
  });

  const field = (
    key: string,
    value: string,
    onChange: (text: string) => void,
    label: string,
  ) => (
    <View style={styles.inputRow}>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder="—"
        placeholderTextColor={colors.border}
        keyboardType="decimal-pad"
        maxLength={10}
        style={[styles.input, errors[key] ? styles.inputError : null]}
      />
      <Text style={styles.symbol}>{symbol}</Text>
    </View>
  );

  return (
    <FormScreen
      footer={
        <Button
          title="Enregistrer"
          loading={submit.loading}
          onPress={() => void submit.run()}
        />
      }
    >
      <AppText tone="secondary">
        Rien que pour toi : personne d’autre ne voit ton budget. Laisse vide ce
        que tu ne veux pas suivre.
      </AppText>

      <View style={styles.section}>
        <View style={styles.row}>
          <AppText variant="heading" style={styles.flex}>
            Budget total
          </AppText>
          {field("total", total, setTotal, "Budget total")}
        </View>
        {errors.total ? (
          <AppText variant="caption" tone="danger">
            {errors.total}
          </AppText>
        ) : null}
      </View>

      <View style={styles.section}>
        <AppText variant="label" tone="secondary">
          Par catégorie
        </AppText>
        <View style={styles.card}>
          {EXPENSE_CATEGORIES.map((category, index) => (
            <View
              key={category}
              style={[
                styles.row,
                styles.categoryRow,
                index > 0 && styles.rowBorder,
              ]}
            >
              <ExpenseCategoryIcon category={category} size={18} />
              <AppText variant="bodyStrong" style={styles.flex}>
                {EXPENSE_CATEGORY_LABELS[category]}
              </AppText>
              {field(
                category,
                caps[category] ?? "",
                (value) => setCaps({ ...caps, [category]: value }),
                `Budget ${EXPENSE_CATEGORY_LABELS[category]}`,
              )}
            </View>
          ))}
        </View>
        {EXPENSE_CATEGORIES.some((category) => errors[category]) ? (
          <AppText variant="caption" tone="danger">
            Un des montants est invalide.
          </AppText>
        ) : null}
      </View>

      {submit.error ? (
        <AppText variant="caption" tone="danger">
          {submit.error}
        </AppText>
      ) : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  flex: { flex: 1, minWidth: 0 },
  section: { gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingHorizontal: spacing.md,
  },
  categoryRow: { minHeight: 56 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.separator },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  input: {
    width: 104,
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 10,
    textAlign: "right",
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  inputError: { borderColor: colors.danger },
  symbol: {
    minWidth: 18,
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    color: colors.inkTertiary,
  },
});
