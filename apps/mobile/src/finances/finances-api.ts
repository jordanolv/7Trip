import type {
  ChooseTransferPlanRequest,
  CreateExpenseRequest,
  CreateSettlementRequest,
  Expense,
  PersonalBudgetRequest,
  PersonalBudgetView,
  Settlement,
  TripBalances,
  UpdateExpenseRequest,
} from '@7trip/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/auth/auth-context';

export const financeKeys = {
  expenses: (tripId: string) => ['expenses', tripId] as const,
  expense: (tripId: string, expenseId: string) => ['expenses', tripId, expenseId] as const,
  balances: (tripId: string) => ['balances', tripId] as const,
  budget: (tripId: string) => ['budget', tripId] as const,
  /** With the trip's currency: a rate fetched before it changed must not be used after. */
  rate: (tripId: string, currency: string, baseCurrency: string) => ['rates', tripId, currency, baseCurrency] as const,
};

export interface TodayRate {
  currency: string;
  baseCurrency: string;
  /** Null: the ECB does not publish it (or could not be reached), the rate is typed. */
  rate: { rate: number; date: string } | null;
}

/** Today's ECB rate into the trip's currency, to fill in an expense in another currency. */
export function useRate(tripId: string, currency: string, baseCurrency: string, enabled: boolean) {
  const { tripRequest } = useAuth();
  return useQuery({
    queryKey: financeKeys.rate(tripId, currency, baseCurrency),
    queryFn: () => tripRequest<TodayRate>(tripId, `/trips/${tripId}/rates/${currency}`),
    enabled,
    staleTime: 60 * 60 * 1000,
  });
}

export function useExpenses(tripId: string) {
  const { tripRequest } = useAuth();
  return useQuery({
    queryKey: financeKeys.expenses(tripId),
    queryFn: () => tripRequest<Expense[]>(tripId, `/trips/${tripId}/expenses`),
  });
}

/** Opens instantly from the list, then refreshes. */
export function useExpense(tripId: string, expenseId: string) {
  const { tripRequest } = useAuth();
  const client = useQueryClient();
  return useQuery({
    queryKey: financeKeys.expense(tripId, expenseId),
    queryFn: () => tripRequest<Expense>(tripId, `/trips/${tripId}/expenses/${expenseId}`),
    initialData: () => client.getQueryData<Expense[]>(financeKeys.expenses(tripId))?.find((expense) => expense.id === expenseId),
    initialDataUpdatedAt: () => client.getQueryState(financeKeys.expenses(tripId))?.dataUpdatedAt,
  });
}

export function useBalances(tripId: string) {
  const { tripRequest } = useAuth();
  return useQuery({
    queryKey: financeKeys.balances(tripId),
    queryFn: () => tripRequest<TripBalances>(tripId, `/trips/${tripId}/balances`),
  });
}

/** The caller's own budget, with what they spent against it. */
export function useBudget(tripId: string) {
  const { tripRequest } = useAuth();
  return useQuery({
    queryKey: financeKeys.budget(tripId),
    queryFn: () => tripRequest<PersonalBudgetView>(tripId, `/trips/${tripId}/budget`),
  });
}

export function useSaveBudget(tripId: string) {
  const { tripRequest } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: PersonalBudgetRequest) => tripRequest<PersonalBudgetView>(tripId, `/trips/${tripId}/budget`, { method: 'PUT', body }),
    onSuccess: (budget) => client.setQueryData(financeKeys.budget(tripId), budget),
  });
}

/** Any change to the money moves the balances and the budget: they are fetched again. */
function useRefreshFinances(tripId: string) {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: financeKeys.expenses(tripId) });
    void client.invalidateQueries({ queryKey: financeKeys.balances(tripId) });
    void client.invalidateQueries({ queryKey: financeKeys.budget(tripId) });
  };
}

/** Creates the expense, or replaces it when `expenseId` is given. */
export function useSaveExpense(tripId: string, expenseId?: string) {
  const { tripRequest } = useAuth();
  const client = useQueryClient();
  const refresh = useRefreshFinances(tripId);
  return useMutation({
    mutationFn: (body: CreateExpenseRequest | UpdateExpenseRequest) =>
      expenseId
        ? tripRequest<Expense>(tripId, `/trips/${tripId}/expenses/${expenseId}`, { method: 'PUT', body })
        : tripRequest<Expense>(tripId, `/trips/${tripId}/expenses`, { method: 'POST', body }),
    onSuccess: (expense) => {
      client.setQueryData(financeKeys.expense(tripId, expense.id), expense);
      refresh();
    },
    // Edited by someone else meanwhile (409): what is shown behind the form is fetched again.
    onError: () => {
      if (expenseId) void client.invalidateQueries({ queryKey: financeKeys.expense(tripId, expenseId) });
    },
  });
}

export function useDeleteExpense(tripId: string, expenseId: string) {
  const { tripRequest } = useAuth();
  const client = useQueryClient();
  const refresh = useRefreshFinances(tripId);
  return useMutation({
    mutationFn: () => tripRequest<void>(tripId, `/trips/${tripId}/expenses/${expenseId}`, { method: 'DELETE' }),
    onSuccess: () => {
      client.removeQueries({ queryKey: financeKeys.expense(tripId, expenseId) });
      refresh();
    },
  });
}

export function useSettle(tripId: string) {
  const { tripRequest } = useAuth();
  const refresh = useRefreshFinances(tripId);
  return useMutation({
    mutationFn: (body: CreateSettlementRequest) => tripRequest<Settlement>(tripId, `/trips/${tripId}/settlements`, { method: 'POST', body }),
    onSettled: refresh,
  });
}

/** "Autre répartition": the plan shown to the whole group. Balances moved meanwhile (409): fetched again. */
export function useChoosePlan(tripId: string) {
  const { tripRequest } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: ChooseTransferPlanRequest) => tripRequest<TripBalances>(tripId, `/trips/${tripId}/balances/plan`, { method: 'PUT', body }),
    onSuccess: (balances) => {
      client.setQueryData(financeKeys.balances(tripId), balances);
      void client.invalidateQueries({ queryKey: financeKeys.budget(tripId) });
    },
    onError: () => void client.invalidateQueries({ queryKey: financeKeys.balances(tripId) }),
  });
}

export function useUnsettle(tripId: string) {
  const { tripRequest } = useAuth();
  const refresh = useRefreshFinances(tripId);
  return useMutation({
    mutationFn: (settlementId: string) => tripRequest<void>(tripId, `/trips/${tripId}/settlements/${settlementId}`, { method: 'DELETE' }),
    onSettled: refresh,
  });
}
