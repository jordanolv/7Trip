import { formatDayMonth, formatMoney, weekday, type Expense, type TripBalances } from '@7trip/shared';
import { colors, fontFamily, spacing } from '@7trip/ui-tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon } from '@/components/ui/icon';

import { ExpenseCategoryTile } from './expense-visuals';

/** Group total and what it means for you: the three amounts that must not be mixed up (CDC §8). */
export function FinanceSummary({ balances }: { balances: TripBalances }) {
  const { currency, me } = balances;
  return (
    <View style={styles.summary}>
      <View style={styles.summaryHalf}>
        <Text style={styles.summaryLabel}>Total du groupe</Text>
        <Text style={styles.summaryAmount}>{formatMoney(balances.groupTotalMinor, currency, { whole: true })}</Text>
        <Text style={styles.summaryDetail}>
          {balances.sharedCount} dépense{balances.sharedCount > 1 ? 's' : ''} partagée{balances.sharedCount > 1 ? 's' : ''}
        </Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryHalf}>
        <Text style={styles.summaryLabel}>Mon coût réel</Text>
        <Text style={styles.summaryAmount}>{formatMoney(me.costMinor, currency, { whole: true })}</Text>
        <Text style={styles.summaryDetail}>J’ai avancé {formatMoney(me.paidMinor, currency)}</Text>
      </View>
    </View>
  );
}

/** By day, newest first; each line says who paid and what it costs you. */
export function ExpenseList({ expenses, meId, onOpen }: { expenses: Expense[]; meId: string; onOpen: (expense: Expense) => void }) {
  const days = [...new Set(expenses.map((e) => e.date))];
  return (
    <View style={styles.days}>
      {days.map((day) => (
        <View key={day} style={styles.day}>
          <AppText variant="label" tone="secondary">
            {weekday(day)} {formatDayMonth(day)}
          </AppText>
          <View style={styles.card}>
            {expenses
              .filter((e) => e.date === day)
              .map((expense, index) => (
                <ExpenseRow key={expense.id} expense={expense} meId={meId} first={index === 0} onPress={() => onOpen(expense)} />
              ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function ExpenseRow({ expense, meId, first, onPress }: { expense: Expense; meId: string; first: boolean; onPress: () => void }) {
  const detail = expense.personal
    ? 'Personnelle'
    : [
        expense.payer.id === meId ? 'Avancé par toi' : `Payé par ${expense.payer.displayName}`,
        expense.shares.length > 1 ? `partagé à ${expense.shares.length}` : `pour ${expense.shares[0]?.participant.id === meId ? 'toi' : expense.shares[0]?.participant.displayName}`,
      ].join(' · ');
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, !first && styles.rowBorder, pressed && styles.pressed]}>
      <ExpenseCategoryTile category={expense.category} size={40} />
      <View style={styles.flex}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {expense.label}
        </AppText>
        <View style={styles.detailLine}>
          {expense.personal ? <Icon name="lock" color={colors.inkSecondary} size={12} /> : null}
          <AppText variant="caption" tone="secondary" numberOfLines={1} style={styles.flex}>
            {detail}
          </AppText>
        </View>
      </View>
      <View style={styles.amounts}>
        <Text style={styles.amount}>{formatMoney(expense.amountMinor, expense.currency)}</Text>
        <Text style={[styles.myShare, !expense.myShareMinor && styles.noShare]}>
          {expense.myShareMinor ? `ta part ${formatMoney(expense.myShareMinor, expense.currency)}` : 'pas pour toi'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  summary: { flexDirection: 'row', backgroundColor: colors.ink, borderRadius: 22, padding: spacing.lg },
  summaryHalf: { flex: 1, gap: 2 },
  summaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: spacing.md },
  summaryLabel: { fontFamily: fontFamily.semibold, fontSize: 12, color: '#C9CED6' },
  summaryAmount: { fontFamily: fontFamily.extrabold, fontSize: 26, letterSpacing: -0.5, color: colors.surface },
  summaryDetail: { fontFamily: fontFamily.medium, fontSize: 12, color: '#C9CED6' },
  days: { gap: spacing.lg },
  day: { gap: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: 18, paddingHorizontal: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 10, minHeight: 60 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.separator },
  pressed: { opacity: 0.7 },
  detailLine: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  amounts: { alignItems: 'flex-end', gap: 2 },
  amount: { fontFamily: fontFamily.bold, fontSize: 15, color: colors.ink },
  myShare: { fontFamily: fontFamily.semibold, fontSize: 12, color: colors.accentInk },
  noShare: { color: colors.inkSecondary },
});
