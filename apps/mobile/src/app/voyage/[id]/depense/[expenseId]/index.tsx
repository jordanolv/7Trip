import { EXPENSE_CATEGORY_LABELS, currencySymbol, formatDayMonth, formatMoney, rateInputText, weekday, type Expense } from '@7trip/shared';
import { colors, fontFamily, spacing } from '@7trip/ui-tokens';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Sheet } from '@/components/sheet';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { ExpenseCategoryTile } from '@/finances/expense-visuals';
import { useDeleteExpense, useExpense } from '@/finances/finances-api';
import { errorMessage } from '@/lib/api';
import { haptics } from '@/lib/haptics';
import { AuthorName, useIsMe } from '@/trips/author-name';
import { useTrip } from '@/trips/trips-api';
import { useTripId } from '@/trips/use-trip-id';

export default function DepenseScreen() {
  const tripId = useTripId();
  const { expenseId } = useLocalSearchParams<{ expenseId: string }>();
  const expense = useExpense(tripId, expenseId);

  if (!expense.data) {
    return (
      <Sheet title="Dépense">
        {expense.isPending ? <ActivityIndicator color={colors.accent} /> : <AppText tone="secondary">{expense.error?.message}</AppText>}
      </Sheet>
    );
  }
  return <Depense tripId={tripId} expense={expense.data} />;
}

/** Who advanced it and who it really costs (CDC §8.1): the two are not the same. */
function Depense({ tripId, expense }: { tripId: string; expense: Expense }) {
  const remove = useDeleteExpense(tripId, expense.id);
  const isMe = useIsMe(tripId);
  const baseCurrency = useTrip(tripId).data?.baseCurrency;
  // Paid in another currency: shown as paid, with what it makes in the trip's.
  const foreign = baseCurrency !== undefined && expense.currency !== baseCurrency;
  const meta = [`${weekday(expense.date)} ${formatDayMonth(expense.date)}`, expense.category ? EXPENSE_CATEGORY_LABELS[expense.category] : null]
    .filter(Boolean)
    .join(' · ');

  const confirmDelete = () => {
    haptics.warning();
    Alert.alert('Supprimer la dépense ?', 'Les soldes seront recalculés sans elle.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () =>
          remove.mutate(undefined, {
            onSuccess: () => router.back(),
            onError: (error) => Alert.alert('Impossible de supprimer', errorMessage(error)),
          }),
      },
    ]);
  };

  return (
    <Sheet title={expense.personal ? 'Dépense personnelle' : 'Dépense partagée'}>
      <View style={styles.top}>
        <ExpenseCategoryTile category={expense.category} size={52} />
        <View style={styles.flex}>
          <AppText variant="heading" numberOfLines={2}>
            {expense.label}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {meta}
          </AppText>
        </View>
        <Text style={styles.amount}>{formatMoney(expense.amountMinor, expense.currency)}</Text>
      </View>
      {foreign ? (
        <AppText variant="caption" tone="secondary">
          Soit {formatMoney(expense.baseAmountMinor, baseCurrency)}, au taux figé de 1 {expense.currency} = {rateInputText(expense.rateToBase)} {currencySymbol(baseCurrency)}.
        </AppText>
      ) : null}

      {expense.event ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push(`/voyage/${tripId}/evenement/${expense.event!.id}` as Href)}
          style={({ pressed }) => [styles.event, pressed && styles.pressed]}
        >
          <Icon name="calendar" color={colors.accentInk} size={18} />
          <AppText variant="bodyStrong" style={styles.flex} numberOfLines={1}>
            {expense.event.title}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {formatDayMonth(expense.event.startDate)}
          </AppText>
          <Icon name="chevronRight" color={colors.inkSecondary} size={16} />
        </Pressable>
      ) : null}

      {expense.personal ? (
        <AppText tone="secondary">Elle compte uniquement dans ton budget. Personne d’autre ne la voit.</AppText>
      ) : (
        <>
          <AppText tone="secondary">
            {isMe(expense.payer.id) ? 'Avancé par ' : 'Payé par '}
            <AuthorName tripId={tripId} author={expense.payer} />
            {expense.shares.length > 1 ? ` · partagé à ${expense.shares.length}` : ''}
            {expense.splitMode === 'CUSTOM' ? ', montants personnalisés' : ''}
          </AppText>
          <View style={styles.shares}>
            {expense.shares.map((share, index) => (
              <View key={share.participant.id} style={[styles.share, index > 0 && styles.shareBorder]}>
                <Avatar name={share.participant.displayName} color={share.participant.avatarColor} size={30} />
                <AppText variant="bodyStrong" style={styles.flex} numberOfLines={1}>
                  {share.participant.displayName}
                  {isMe(share.participant.id) ? ' (toi)' : share.participant.hasLeft ? ' (parti)' : ''}
                </AppText>
                <View style={styles.shareAmounts}>
                  <Text style={styles.shareAmount}>{formatMoney(share.originalMinor, expense.currency)}</Text>
                  {foreign ? <Text style={styles.shareBase}>{formatMoney(share.amountMinor, baseCurrency)}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {expense.canEdit ? (
        <View style={styles.actions}>
          <Button title="Modifier" variant="soft" onPress={() => router.push(`/voyage/${tripId}/depense/${expense.id}/modifier` as Href)} />
          <Button title="Supprimer" variant="ghost" loading={remove.isPending} onPress={confirmDelete} />
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  amount: { fontFamily: fontFamily.extrabold, fontSize: 20, color: colors.ink },
  shareAmounts: { alignItems: 'flex-end' },
  shareBase: { fontFamily: fontFamily.medium, fontSize: 12, color: colors.inkSecondary },
  shares: { backgroundColor: colors.surface, borderRadius: 18, paddingHorizontal: spacing.md },
  share: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 52 },
  shareBorder: { borderTopWidth: 1, borderTopColor: colors.separator },
  shareAmount: { fontFamily: fontFamily.bold, fontSize: 15, color: colors.ink },
  actions: { gap: spacing.sm },
  event: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: spacing.md, borderRadius: 14, backgroundColor: colors.accentTint },
  pressed: { opacity: 0.6 },
});
