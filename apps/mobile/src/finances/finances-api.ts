import type { CreateExpenseRequest, CreateSettlementRequest, Expense, Settlement, TripBalances, UpdateExpenseRequest } from '@7trip/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/auth/auth-context';

export const financeKeys = {
  expenses: (tripId: string) => ['expenses', tripId] as const,
  expense: (tripId: string, expenseId: string) => ['expenses', tripId, expenseId] as const,
  balances: (tripId: string) => ['balances', tripId] as const,
};

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

/** Any change to the money moves the balances: both are fetched again. */
function useRefreshFinances(tripId: string) {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: financeKeys.expenses(tripId) });
    void client.invalidateQueries({ queryKey: financeKeys.balances(tripId) });
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

export function useUnsettle(tripId: string) {
  const { tripRequest } = useAuth();
  const refresh = useRefreshFinances(tripId);
  return useMutation({
    mutationFn: (settlementId: string) => tripRequest<void>(tripId, `/trips/${tripId}/settlements/${settlementId}`, { method: 'DELETE' }),
    onSettled: refresh,
  });
}
