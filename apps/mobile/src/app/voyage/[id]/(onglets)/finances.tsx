import { colors, spacing } from '@7trip/ui-tokens';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Segmented } from '@/components/ui/segmented';
import { BalancesView } from '@/finances/balances-view';
import { BudgetView } from '@/finances/budget-view';
import { myParticipantId } from '@/finances/expense-people';
import { ExpenseList, FinanceSummary } from '@/finances/expense-list';
import { useBalances, useBudget, useExpenses } from '@/finances/finances-api';
import { useTrip } from '@/trips/trips-api';
import { useTripId } from '@/trips/use-trip-id';

type Section = 'expenses' | 'balances' | 'budget';

/** One Finances module: expenses, balances and reimbursements, and the personal budget (CDC §8). */
export default function FinancesScreen() {
  const tripId = useTripId();
  const insets = useSafeAreaInsets();
  const trip = useTrip(tripId);
  const expenses = useExpenses(tripId);
  const balances = useBalances(tripId);
  const budget = useBudget(tripId);
  // `?section=balances|budget`: opened from a dashboard card on that section.
  const { section: asked } = useLocalSearchParams<{ section?: Section }>();
  const [section, setSection] = useState<Section>('expenses');
  // A new card tapped: its section, set while rendering (React's "adjusting state" pattern).
  const [lastAsked, setLastAsked] = useState<string | undefined>(undefined);
  if (asked !== lastAsked) {
    setLastAsked(asked);
    if (asked === 'balances' || asked === 'budget' || asked === 'expenses') setSection(asked);
  }

  // Others add expenses meanwhile: fetched again on each visit.
  const refetchExpenses = expenses.refetch;
  const refetchBalances = balances.refetch;
  const refetchBudget = budget.refetch;
  const refresh = useCallback(() => {
    void refetchExpenses({ cancelRefetch: false });
    void refetchBalances({ cancelRefetch: false });
    void refetchBudget({ cancelRefetch: false });
  }, [refetchExpenses, refetchBalances, refetchBudget]);
  useFocusEffect(refresh);

  const add = () => router.push(`/voyage/${tripId}/depense/nouvelle` as Href);
  const meId = trip.data ? myParticipantId(trip.data) : null;
  const loading = expenses.isPending || balances.isPending || !meId;
  const failed = (expenses.isError && !expenses.data) || (balances.isError && !balances.data);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm }]}
      refreshControl={<RefreshControl refreshing={expenses.isRefetching || balances.isRefetching || budget.isRefetching} onRefresh={refresh} tintColor={colors.accent} />}
    >
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="title">Finances</AppText>
          {trip.data ? (
            <AppText variant="caption" tone="secondary" numberOfLines={1}>
              {trip.data.title}
            </AppText>
          ) : null}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Ajouter une dépense" onPress={add} style={styles.add}>
          <Icon name="plus" color={colors.surface} size={24} />
        </Pressable>
      </View>

      <Segmented
        options={[
          { value: 'expenses', label: 'Dépenses' },
          { value: 'balances', label: 'Soldes' },
          { value: 'budget', label: 'Mon budget' },
        ]}
        value={section}
        onChange={setSection}
      />

      {failed ? (
        <View style={styles.empty}>
          <AppText variant="heading">Impossible de charger les finances</AppText>
          <AppText tone="secondary">{(expenses.error ?? balances.error)?.message}</AppText>
          <Button title="Réessayer" variant="soft" onPress={refresh} />
        </View>
      ) : loading || !balances.data || !expenses.data ? (
        <ActivityIndicator color={colors.accent} style={styles.loading} />
      ) : section === 'budget' ? (
        budget.data && trip.data ? (
          <BudgetView trip={trip.data} budget={budget.data} />
        ) : budget.isError ? (
          <View style={styles.empty}>
            <AppText variant="heading">Impossible de charger ton budget</AppText>
            <AppText tone="secondary">{budget.error.message}</AppText>
            <Button title="Réessayer" variant="soft" onPress={refresh} />
          </View>
        ) : (
          <ActivityIndicator color={colors.accent} style={styles.loading} />
        )
      ) : section === 'balances' ? (
        <BalancesView tripId={tripId} balances={balances.data} meId={meId} organizer={trip.data?.myRole === 'ORGANIZER'} />
      ) : expenses.data.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Icon name="coins" color={colors.accentInk} size={26} />
          </View>
          <AppText variant="heading">Aucune dépense pour l’instant</AppText>
          <AppText tone="secondary">
            Le resto, l’essence, les billets… Note qui a payé et pour qui : 7Trip calcule qui doit combien à qui.
          </AppText>
          <Button title="Ajouter une dépense" onPress={add} icon={<Icon name="plus" color={colors.surface} size={20} />} />
        </View>
      ) : (
        <>
          <FinanceSummary balances={balances.data} />
          <ExpenseList expenses={expenses.data} meId={meId} onOpen={(expense) => router.push(`/voyage/${tripId}/depense/${expense.id}` as Href)} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  flex: { flex: 1, minWidth: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  add: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  loading: { marginTop: spacing.xxl },
  empty: { backgroundColor: colors.surface, borderRadius: 22, padding: spacing.xl, gap: spacing.sm },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
});
