import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api, { dentistService, salaryService, type DentistProfile, type SalaryRecord } from '../services/api';
import LogoutConfirmModal, { performLogout } from './LogoutConfirmModal';
import { ClinicPortalShell } from './ClinicPortalShell';
import { DIRECTOR_PORTAL_MENU } from '../lib/clinicPortalNav';

type SalaryMode = 'fixed' | 'percentage';

const ClinicStaffDirectory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const role = useMemo(() => localStorage.getItem('role')?.toLowerCase() ?? '', []);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [dentists, setDentists] = useState<DentistProfile[]>([]);
  const [salariesByStaffId, setSalariesByStaffId] = useState<Record<number, SalaryRecord>>({});
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<number>>(new Set());
  const [salaryMode, setSalaryMode] = useState<SalaryMode>('fixed');
  const [salaryValue, setSalaryValue] = useState('');
  const [salaryDay, setSalaryDay] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    if (role !== 'director') {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate, role]);

  useEffect(() => {
    const loadSelf = async () => {
      const staffIdRaw = localStorage.getItem('staffId');
      const staffId = Number(staffIdRaw);
      if (!Number.isFinite(staffId) || staffId <= 0) return;
      try {
        const response = await api.get(`/staff?id=${staffId}`);
        const staff = Array.isArray(response.data) ? response.data[0] : response.data;
        setDisplayName(`${staff?.name ?? ''} ${staff?.surname ?? ''}`.trim());
      } catch {
        setDisplayName('');
      }
    };
    if (role === 'director') void loadSelf();
  }, [role]);

  useEffect(() => {
    const load = async () => {
      if (role !== 'director') return;
      setLoading(true);
      setError('');
      setSuccessMessage('');
      try {
        const [dentistRows, salaryRows] = await Promise.all([
          dentistService.getAll(),
          salaryService.getAll(),
        ]);

        const sortedDentists = [...dentistRows].sort((a, b) =>
          `${a.staff?.surname ?? ''} ${a.staff?.name ?? ''}`.localeCompare(
            `${b.staff?.surname ?? ''} ${b.staff?.name ?? ''}`,
          ),
        );
        setDentists(sortedDentists);

        const nextSalaryMap: Record<number, SalaryRecord> = {};
        for (const salary of salaryRows) {
          nextSalaryMap[salary.staffId] = salary;
        }
        setSalariesByStaffId(nextSalaryMap);
        setSelectedStaffIds(new Set(sortedDentists.map((row) => row.staffId)));
      } catch (err: unknown) {
        console.error('Failed to load dentist salary data:', err);
        const message =
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : undefined;
        setError(message || 'Failed to load dentists');
        setDentists([]);
        setSalariesByStaffId({});
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [role]);

  const allSelected = dentists.length > 0 && selectedStaffIds.size === dentists.length;

  const toggleStaffSelection = (staffId: number) => {
    setSelectedStaffIds((prev) => {
      const next = new Set(prev);
      if (next.has(staffId)) next.delete(staffId);
      else next.add(staffId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedStaffIds((prev) => {
      if (prev.size === dentists.length) return new Set();
      return new Set(dentists.map((row) => row.staffId));
    });
  };

  const formatSalaryPart = (staffId: number) => {
    const salary = salariesByStaffId[staffId];
    if (!salary) return 'Not set';
    if (salary.salary != null) {
      const dayText = salary.salaryDay != null ? ` (day ${salary.salaryDay})` : '';
      return `$${Number(salary.salary).toFixed(2)}${dayText}`;
    }
    if (salary.treatmentPercentage != null) {
      return `${Number(salary.treatmentPercentage).toFixed(2)}% per treatment`;
    }
    return 'Not set';
  };

  const applySalaryToSelection = async () => {
    const selected = dentists.filter((d) => selectedStaffIds.has(d.staffId));
    if (selected.length === 0) {
      setError('Select at least one dentist.');
      return;
    }
    const parsedValue = Number(salaryValue);
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      setError('Enter a valid non-negative value.');
      return;
    }
    const parsedSalaryDay =
      salaryMode === 'fixed' && salaryDay.trim() ? Number(salaryDay.trim()) : null;
    if (
      salaryMode === 'fixed' &&
      parsedSalaryDay != null &&
      (!Number.isInteger(parsedSalaryDay) || parsedSalaryDay < 1 || parsedSalaryDay > 31)
    ) {
      setError('Salary day must be between 1 and 31.');
      return;
    }

    setError('');
    setSuccessMessage('');
    setIsSaving(true);
    try {
      await Promise.all(
        selected.map(async (dentist) => {
          const staffId = dentist.staffId;
          const existing = salariesByStaffId[staffId];
          const payload =
            salaryMode === 'fixed'
              ? {
                  salary: parsedValue,
                  salaryDay: parsedSalaryDay,
                  treatmentPercentage: null,
                }
              : {
                  salary: null,
                  salaryDay: null,
                  treatmentPercentage: parsedValue,
                };

          if (existing) {
            return await salaryService.update(staffId, payload);
          }
          return await salaryService.create({
            staffId,
            salary: payload.salary == null ? undefined : payload.salary,
            salaryDay: payload.salaryDay == null ? undefined : payload.salaryDay,
            treatmentPercentage:
              payload.treatmentPercentage == null ? undefined : payload.treatmentPercentage,
          });
        }),
      );

      const freshSalaryRows = await salaryService.getAll();
      const nextSalaryMap: Record<number, SalaryRecord> = {};
      for (const row of freshSalaryRows) nextSalaryMap[row.staffId] = row;
      setSalariesByStaffId(nextSalaryMap);
      setSuccessMessage(`Updated salary settings for ${selected.length} dentist(s).`);
    } catch (err: unknown) {
      console.error('Failed to update salaries:', err);
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(message || 'Failed to update salary settings.');
    } finally {
      setIsSaving(false);
    }
  };

  if (role !== 'director') {
    return null;
  }

  return (
    <>
      <div className="min-h-screen bg-[#f4f6f8] text-slate-700">
        <ClinicPortalShell
          brandTitle="Precision Dental"
          portalBadge="Admin Portal"
          userDisplayName={displayName}
          userSubtitle="Clinic Director"
          menuItems={DIRECTOR_PORTAL_MENU}
          pathname={location.pathname}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          navigate={navigate}
          onLogoutClick={() => setShowLogoutConfirm(true)}
        >
          <main className="h-[calc(100vh-4rem)] flex-1 overflow-auto bg-[#f9fafb] px-6 py-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-slate-900">Dentist salary management</h1>
              <p className="mt-2 text-sm text-slate-500">
                Set fixed salary or treatment percentage for multiple dentists at once.
              </p>
            </div>

            {error ? (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            ) : null}
            {successMessage ? (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </div>
            ) : null}

            <div className="mb-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <div className="mb-4 flex flex-wrap items-center gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="salaryMode"
                    value="fixed"
                    checked={salaryMode === 'fixed'}
                    onChange={() => setSalaryMode('fixed')}
                  />
                  Fixed salary
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="salaryMode"
                    value="percentage"
                    checked={salaryMode === 'percentage'}
                    onChange={() => setSalaryMode('percentage')}
                  />
                  Treatment percentage
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={salaryValue}
                  onChange={(e) => setSalaryValue(e.target.value)}
                  placeholder={salaryMode === 'fixed' ? 'Salary amount' : 'Percentage value'}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  min={1}
                  max={31}
                  disabled={salaryMode !== 'fixed'}
                  value={salaryDay}
                  onChange={(e) => setSalaryDay(e.target.value)}
                  placeholder="Salary day (optional)"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                />
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void applySalaryToSelection()}
                  className="rounded-lg bg-[#0066A6] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#00588f] disabled:opacity-50"
                >
                  {isSaving ? 'Applying...' : `Apply to selected (${selectedStaffIds.size})`}
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label="Select all dentists"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th className="px-4 py-3">Full name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Salary part</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                          Loading…
                        </td>
                      </tr>
                    ) : dentists.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                          No dentists found.
                        </td>
                      </tr>
                    ) : (
                      dentists.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/80">
                          <td className="whitespace-nowrap px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedStaffIds.has(row.staffId)}
                              onChange={() => toggleStaffSelection(row.staffId)}
                              aria-label={`Select ${row.staff?.name ?? ''} ${row.staff?.surname ?? ''}`}
                            />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                            {row.staff?.name} {row.staff?.surname}
                          </td>
                          <td className="max-w-[260px] truncate px-4 py-3 text-slate-600">{row.staff?.gmail ?? '—'}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                            {formatSalaryPart(row.staffId)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        </ClinicPortalShell>
      </div>
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

export default ClinicStaffDirectory;
