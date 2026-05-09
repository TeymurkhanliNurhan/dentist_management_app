import type { FinanceOverviewResponse } from '../services/api';

export type FinanceExpenseGroup = {
  key: string;
  expenseName: string;
  expenseId: number | null;
  totalCost: number;
  paymentDetails: NonNullable<FinanceOverviewResponse['otherPaymentDetails']>['items'];
};

/**
 * Groups payment details by clinic expense, and adds a synthetic "Medicine purchases" group
 * for stock purchases (payment rows with no expense but linked purchase lines).
 */
export function buildFinanceExpenseGroups(
  financeOverview: FinanceOverviewResponse | null,
): FinanceExpenseGroup[] {
  const items = financeOverview?.otherPaymentDetails?.items ?? [];
  const base = (financeOverview?.otherPaymentDetails?.byCategory ?? []).map((category) => ({
    key: `${category.expenseId}-${category.name}`,
    expenseName: category.name,
    expenseId: category.expenseId,
    totalCost: Number(category.totalCost ?? 0),
    paymentDetails: items.filter((item) => item.expenseId === category.expenseId),
  }));

  const medicinePaymentDetails = items.filter(
    (item) => item.expenseId == null && (item.purchaseMedicines?.length ?? 0) > 0,
  );
  if (medicinePaymentDetails.length === 0) {
    return base;
  }

  const medicineTotal = medicinePaymentDetails.reduce(
    (acc, row) => acc + Number(row.cost ?? 0),
    0,
  );

  return [
    ...base,
    {
      key: 'medicine-stock-purchases',
      expenseName: 'Medicine purchases',
      expenseId: null,
      totalCost: medicineTotal,
      paymentDetails: medicinePaymentDetails,
    },
  ];
}
