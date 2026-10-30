import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  budgetDaysLeft,
  currencyLabel,
  formatMoney,
  localIsoDate,
  type PersonalBudgetView,
  type TripDetail,
} from '@7trip/shared';
import { colors, fontFamily, spacing } from '@7trip/ui-tokens';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';

import { ExpenseCategoryIcon } from './expense-visuals';

/**
 * "Mon budget" (CDC §8.3): only the caller's share of each expense counts, and what they still owe
 * or are owed is shown apart. Seen by nobody else.
 */
export function BudgetView({ trip, budget }: { trip: TripDetail; budget: PersonalBudgetView }) {
  const money = (minor: number) => formatMoney(minor, budget.currency, { whole: true });
  const edit = () => router.push(`/voyage/${trip.id}/budget` as Href);
  const total = budget.budget?.totalMinor ?? null;
  const caps = budget.budget?.perCategory ?? {};
  const categories = EXPENSE_CATEGORIES.filter((category) => budget.spentByCategory[category] || caps[category]);
  const daysLeft = budgetDaysLeft(trip, localIsoDate());

  const remaining = () => {
    if (total === null) return null;
    const left = total - budget.spentMinor;
    if (left < 0) return `Tu as dépassé ton budget de ${money(-left)}.`;
    if (daysLeft && daysLeft > 1) return `Il te reste ${money(left)} pour ${daysLeft} jours, soit ${money(Math.floor(left / daysLeft))} par jour.`;
    return `Il te reste ${money(left)}.`;
  };

  return (
    <View style={styles.wrapper}>
      {budget.staleCurrency ? (
        <View style={styles.note}>
          <Icon name="refresh" color={colors.inkSecondary} size={18} />
          <AppText variant="caption" tone="secondary" style={styles.flex}>
            Ton budget était en {currencyLabel(budget.staleCurrency).toLowerCase()} : le voyage est passé en {currencyLabel(budget.currency).toLowerCase()},
            fixe-le à nouveau.
          </AppText>
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <AppText variant="label" tone="secondary" style={styles.flex}>
            Dépensé pour moi
          </AppText>
          {budget.budget ? (
            <Pressable accessibilityRole="button" hitSlop={8} onPress={edit}>
              <AppText variant="label" tone="accent">
                Modifier le budget
              </AppText>
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.spent}>
          {money(budget.spentMinor)}
          {total !== null ? <Text style={styles.of}> sur {money(total)}</Text> : null}
        </Text>
        {total !== null ? (
          <>
            <Bar spent={budget.spentMinor} cap={total} height={10} />
            <AppText variant="caption" tone={budget.spentMinor > total ? 'danger' : 'secondary'}>
              {remaining()}
            </AppText>
          </>
        ) : null}
        {!budget.budget ? <Button title="Fixer un budget" variant="soft" onPress={edit} /> : null}
      </View>

      {categories.length || budget.uncategorizedMinor ? (
        <View style={styles.section}>
          <AppText variant="label" tone="secondary">
            Par catégorie
          </AppText>
          <View style={styles.card}>
            {categories.map((category) => {
              const spent = budget.spentByCategory[category] ?? 0;
              const cap = caps[category];
              return (
                <View key={category} style={styles.category}>
                  <View style={styles.categoryRow}>
                    <ExpenseCategoryIcon category={category} size={16} />
                    <AppText variant="bodyStrong" style={styles.flex}>
                      {EXPENSE_CATEGORY_LABELS[category]}
                    </AppText>
                    <Text style={[styles.categoryAmount, cap !== undefined && spent > cap && styles.over]}>
                      {money(spent)}
                      {cap !== undefined ? <Text style={styles.cap}> / {money(cap)}</Text> : null}
                    </Text>
                  </View>
                  {cap !== undefined ? <Bar spent={spent} cap={cap} height={6} /> : null}
                </View>
              );
            })}
            {budget.uncategorizedMinor ? (
              <View style={[styles.categoryRow, styles.category]}>
                <ExpenseCategoryIcon category={null} size={16} />
                <AppText variant="bodyStrong" style={styles.flex}>
                  Sans catégorie
                </AppText>
                <Text style={styles.categoryAmount}>{money(budget.uncategorizedMinor)}</Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={styles.note}>
        <Icon name="coins" color={colors.inkSecondary} size={18} />
        <AppText variant="caption" tone="secondary" style={styles.flex}>
          Seule ta part compte. Quand tu avances une dépense pour le groupe, le reste te sera remboursé : il n’entre pas dans ton budget.
        </AppText>
      </View>

      <View style={styles.tiles}>
        <View style={[styles.tile, styles.repay]}>
          <AppText variant="caption" tone="secondary">
            À rembourser
          </AppText>
          <Text style={[styles.tileAmount, styles.repayText]}>{formatMoney(budget.toRepayMinor, budget.currency)}</Text>
        </View>
        <View style={[styles.tile, styles.receive]}>
          <AppText variant="caption" tone="secondary">
            À recevoir
          </AppText>
          <Text style={[styles.tileAmount, styles.receiveText]}>{formatMoney(budget.toReceiveMinor, budget.currency)}</Text>
        </View>
      </View>
    </View>
  );
}

/** Filled up to what was spent; red past the cap. */
function Bar({ spent, cap, height }: { spent: number; cap: number; height: number }) {
  const ratio = Math.min(spent / cap, 1);
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <View style={[styles.fill, { width: `${ratio * 100}%`, borderRadius: height / 2 }, spent > cap && styles.fillOver]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.lg },
  flex: { flex: 1, minWidth: 0 },
  section: { gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  spent: {
    fontFamily: fontFamily.extrabold,
    fontSize: 30,
    letterSpacing: -0.5,
    color: colors.ink,
  },
  of: {
    fontFamily: fontFamily.semibold,
    fontSize: 18,
    color: colors.inkSecondary,
    letterSpacing: 0,
  },
  track: { backgroundColor: colors.chip, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.accent },
  fillOver: { backgroundColor: colors.danger },
  category: { gap: 6, paddingVertical: 4 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  categoryAmount: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.ink,
  },
  cap: { fontFamily: fontFamily.medium, color: colors.inkSecondary },
  over: { color: colors.danger },
  note: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: colors.accentTint,
    borderRadius: 14,
    padding: spacing.md,
  },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  tile: { flex: 1, borderRadius: 16, padding: spacing.md, gap: 4 },
  tileAmount: { fontFamily: fontFamily.extrabold, fontSize: 18 },
  repay: { backgroundColor: colors.surface },
  repayText: { color: colors.danger },
  receive: { backgroundColor: colors.surface },
  receiveText: { color: colors.accentInk },
});
