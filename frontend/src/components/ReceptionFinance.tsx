import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import {
  expenseService,
  paymentDetailsService,
  type CreateExpenseDto,
  type CreatePaymentDetailsDto,
  type FinanceOverviewResponse,
} from '../services/api';
import { ClinicPortalShell } from './ClinicPortalShell';
import { FRONTDESK_PORTAL_MENU } from '../lib/clinicPortalNav';
import LogoutConfirmModal, { performLogout } from './LogoutConfirmModal';

function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function buildDefaultPaymentDate(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

const ReceptionFinance = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const role = useMemo(() => localStorage.getItem('role')?.toLowerCase() ?? '', []);
  const isReception = role === 'frontdesk';

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [financeOverview, setFinanceOverview] = useState<FinanceOverviewResponse | null>(null);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [financeError, setFinanceError] = useState<string | null>(null);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [selectedExpenseForPayment, setSelectedExpenseForPayment] = useState<{
    id: number | null;
    name: string;
  } | null>(null);
  const [isCreatingExpenseWithPayment, setIsCreatingExpenseWithPayment] = useState(false);
  const [financeSubmitError, setFinanceSubmitError] = useState<string | null>(null);
  const [newExpense, setNewExpense] = useState<CreateExpenseDto>({
    name: '',
    description: '',
    fixedCost: undefined,
    dayOfMonth: undefined,
  });
  const [newPaymentDetail, setNewPaymentDetail] = useState<CreatePaymentDetailsDto>({
    date: buildDefaultPaymentDate(new Date().getFullYear(), new Date().getMonth() + 1),
    cost: 0,
  });

  const fetchFinanceOverview = async (year = selectedYear, month = selectedMonth) => {
    setFinanceLoading(true);
    setFinanceError(null);
    try {
      const data = await paymentDetailsService.getFinanceOverview({ year, month });
      setFinanceOverview(data);
    } catch (err: any) {
      setFinanceError(err?.response?.data?.message ?? 'Failed to fetch finance overview');
    } finally {
      setFinanceLoading(false);
    }
  };

  const resetFinanceCreateState = () => {
    setNewExpense({
      name: '',
      description: '',
      fixedCost: undefined,
      dayOfMonth: undefined,
    });
    setNewPaymentDetail({
      date: buildDefaultPaymentDate(selectedYear, selectedMonth),
      cost: 0,
    });
    setFinanceSubmitError(null);
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFinanceSubmitError(null);

    if (!newExpense.name.trim()) {
      setFinanceSubmitError('Cost name is required.');
      return;
    }

    setIsCreatingExpenseWithPayment(true);
    try {
      await expenseService.create({
        name: newExpense.name.trim(),
        description: newExpense.description?.trim() || undefined,
        fixedCost: newExpense.fixedCost,
        dayOfMonth: newExpense.dayOfMonth,
      });

      setShowAddExpenseModal(false);
      resetFinanceCreateState();
      await fetchFinanceOverview(selectedYear, selectedMonth);
    } catch (err: any) {
      setFinanceSubmitError(
        err?.response?.data?.message ?? 'Failed to create expense.',
      );
    } finally {
      setIsCreatingExpenseWithPayment(false);
    }
  };

  const handleCreatePaymentForExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFinanceSubmitError(null);

    if (selectedExpenseForPayment?.id == null) {
      setFinanceSubmitError('Please select an expense before adding payment detail.');
      return;
    }
    if (!newPaymentDetail.date) {
      setFinanceSubmitError('Payment detail date is required.');
      return;
    }
    if (!Number.isFinite(newPaymentDetail.cost ?? NaN) || (newPaymentDetail.cost ?? 0) < 0) {
      setFinanceSubmitError('Payment detail amount must be a valid non-negative number.');
      return;
    }

    setIsCreatingExpenseWithPayment(true);
    try {
      await paymentDetailsService.create({
        date: newPaymentDetail.date,
        cost: Number(newPaymentDetail.cost),
        expenseId: selectedExpenseForPayment.id,
      });
      setShowAddPaymentModal(false);
      setSelectedExpenseForPayment(null);
      setFinanceSubmitError(null);
      setNewPaymentDetail({
        date: buildDefaultPaymentDate(selectedYear, selectedMonth),
        cost: 0,
      });
      await fetchFinanceOverview(selectedYear, selectedMonth);
    } catch (err: any) {
      setFinanceSubmitError(
        err?.response?.data?.message ?? 'Failed to add payment detail.',
      );
    } finally {
      setIsCreatingExpenseWithPayment(false);
    }
  };

  useEffect(() => {
    if (!isReception) {
      navigate('/dashboard');
      return;
    }
    void fetchFinanceOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReception, navigate]);

  useEffect(() => {
    if (!isReception) return;
    setNewPaymentDetail((prev) => ({
      ...prev,
      date: buildDefaultPaymentDate(selectedYear, selectedMonth),
    }));
  }, [isReception, selectedMonth, selectedYear]);

  const expenseGroups = (financeOverview?.otherPaymentDetails?.byCategory ?? []).map((category) => {
    const paymentDetails = (financeOverview?.otherPaymentDetails?.items ?? []).filter(
      (item) => item.expenseId === category.expenseId,
    );
    return {
      key: `${category.expenseId}-${category.name}`,
      expenseId: category.expenseId,
      expenseName: category.name,
      totalCost: Number(category.totalCost ?? 0),
      paymentDetails,
    };
  });

  return (
    <>
      <div className="h-dvh overflow-hidden bg-[#f4f6f8] text-slate-700">
        <ClinicPortalShell
          brandTitle="Clinic Management"
          portalBadge="Reception Portal"
          userDisplayName=""
          userSubtitle="Receptionist"
          menuItems={FRONTDESK_PORTAL_MENU}
          pathname={location.pathname}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          navigate={navigate}
          onLogoutClick={() => setShowLogoutConfirm(true)}
        >
          <main className="min-h-0 flex-1 bg-[#f9fafb] px-6 py-6">
            <div className="mx-auto max-w-5xl space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Costs</h1>
                  <p className="text-sm text-slate-500">Track monthly clinic costs</p>
                </div>
                <div className="flex items-end gap-2">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Year</label>
                    <input
                      type="number"
                      min={2000}
                      max={3000}
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="w-24 rounded-md border border-slate-300 px-2 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Month</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="w-20 rounded-md border border-slate-300 px-2 py-2 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void fetchFinanceOverview(selectedYear, selectedMonth)}
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {financeError ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {financeError}
                </div>
              ) : null}

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-slate-900">Cost Categories</h2>
                  <button
                    type="button"
                    onClick={() => {
                      resetFinanceCreateState();
                      setShowAddExpenseModal(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
                  >
                    <Plus size={14} />
                    Add Cost
                  </button>
                </div>

                {financeLoading ? <p className="text-sm text-slate-500">Loading costs...</p> : null}

                {!financeLoading ? (
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="font-medium text-slate-700">Total monthly costs</span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(financeOverview?.otherPaymentDetails?.total ?? 0)}
                      </span>
                    </div>
                    {expenseGroups.map((group) => (
                      <div key={group.key} className="rounded-md border border-slate-200 px-3 py-2">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-slate-800">{group.expenseName}</p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedExpenseForPayment({
                                  id: group.expenseId,
                                  name: group.expenseName,
                                });
                                setNewPaymentDetail({
                                  date: buildDefaultPaymentDate(selectedYear, selectedMonth),
                                  cost: 0,
                                });
                                setFinanceSubmitError(null);
                                setShowAddPaymentModal(true);
                              }}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                            >
                              <Plus size={12} />
                              Payment Detail
                            </button>
                            <span className="font-semibold text-slate-900">{formatCurrency(group.totalCost)}</span>
                          </div>
                        </div>
                        {group.paymentDetails.length > 0 ? (
                          <div className="mt-2 space-y-1 rounded-md bg-slate-50 p-2">
                            {group.paymentDetails.map((paymentDetail) => (
                              <div
                                key={paymentDetail.id}
                                className="flex items-center justify-between border-b border-slate-200 py-1 text-xs last:border-b-0"
                              >
                                <span className="text-slate-600">{paymentDetail.date}</span>
                                <span className="font-medium text-slate-800">
                                  {formatCurrency(Number(paymentDetail.cost ?? 0))}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                    {expenseGroups.length === 0 ? (
                      <p className="text-slate-500">No costs for this month.</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </main>
        </ClinicPortalShell>
      </div>

      {showAddExpenseModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Add Cost</h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddExpenseModal(false);
                  setFinanceSubmitError(null);
                }}
                className="text-slate-500 hover:text-slate-800"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateExpense} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-slate-600">Cost name</label>
                <input
                  type="text"
                  value={newExpense.name}
                  onChange={(e) => setNewExpense((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Description (optional)</label>
                <textarea
                  value={newExpense.description ?? ''}
                  onChange={(e) => setNewExpense((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-600">Fixed cost (optional)</label>
                  <input
                    type="number"
                    min={0}
                    value={newExpense.fixedCost ?? ''}
                    onChange={(e) =>
                      setNewExpense((prev) => ({
                        ...prev,
                        fixedCost: e.target.value === '' ? undefined : Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-600">Day of month (optional)</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={newExpense.dayOfMonth ?? ''}
                    onChange={(e) =>
                      setNewExpense((prev) => ({
                        ...prev,
                        dayOfMonth: e.target.value === '' ? undefined : Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              {financeSubmitError ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
                  {financeSubmitError}
                </p>
              ) : null}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingExpenseWithPayment}
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
                >
                  {isCreatingExpenseWithPayment ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {showAddPaymentModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                Add Payment Detail for {selectedExpenseForPayment?.name ?? 'Expense'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddPaymentModal(false);
                  setSelectedExpenseForPayment(null);
                  setFinanceSubmitError(null);
                }}
                className="text-slate-500 hover:text-slate-800"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreatePaymentForExpense} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-slate-600">Payment detail date</label>
                <input
                  type="date"
                  value={newPaymentDetail.date}
                  onChange={(e) =>
                    setNewPaymentDetail((prev) => ({ ...prev, date: e.target.value }))
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">Amount</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={newPaymentDetail.cost ?? ''}
                  onChange={(e) =>
                    setNewPaymentDetail((prev) => ({
                      ...prev,
                      cost: e.target.value === '' ? 0 : Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>
              {financeSubmitError ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
                  {financeSubmitError}
                </p>
              ) : null}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddPaymentModal(false);
                    setSelectedExpenseForPayment(null);
                    setFinanceSubmitError(null);
                  }}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingExpenseWithPayment}
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
                >
                  {isCreatingExpenseWithPayment ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <LogoutConfirmModal
        open={showLogoutConfirm}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          performLogout(navigate);
          setShowLogoutConfirm(false);
        }}
      />
    </>
  );
};

export default ReceptionFinance;
