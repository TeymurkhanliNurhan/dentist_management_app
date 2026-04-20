import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import LogoutConfirmModal, { performLogout } from './LogoutConfirmModal';
import { ClinicPortalShell } from './ClinicPortalShell';
import { DIRECTOR_PORTAL_MENU } from '../lib/clinicPortalNav';

interface StaffRow {
  id: number;
  name: string;
  surname: string;
  gmail: string;
  active: boolean;
  startDate: string;
  role?: string | null;
}

/** Director team page (v1): dentists and general staff only — not reception/nurse/director rows. */
function includeInStaffDentistDirectory(row: StaffRow): boolean {
  const r = (row.role ?? '').trim().toLowerCase();
  if (!r) return true;
  if (r === 'director' || r === 'nurse' || r === 'receptionist') return false;
  return r === 'dentist' || r === 'staff';
}

const ClinicStaffDirectory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const role = useMemo(() => localStorage.getItem('role')?.toLowerCase() ?? '', []);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [rows, setRows] = useState<StaffRow[]>([]);
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
      try {
        const response = await api.get<StaffRow[]>('/staff');
        const data = Array.isArray(response.data) ? response.data : [];
        const filtered = data.filter(includeInStaffDentistDirectory);
        setRows(
          [...filtered].sort((a, b) => `${a.surname} ${a.name}`.localeCompare(`${b.surname} ${b.name}`)),
        );
      } catch (err: unknown) {
        console.error('Failed to load staff directory:', err);
        const message =
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : undefined;
        setError(message || 'Failed to load team members');
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [role]);

  const formatDate = (value: string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatRole = (value: string | null | undefined) => {
    const normalized = (value ?? '').trim().toLowerCase();
    if (!normalized) return 'Staff';
    if (normalized === 'dentist') return 'Dentist';
    if (normalized === 'staff') return 'Staff';
    return value ?? '—';
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
              <h1 className="text-3xl font-bold text-slate-900">Staff &amp; dentists</h1>
              <p className="mt-2 text-sm text-slate-500">
                Dentists and clinic staff ({rows.length.toLocaleString()})
              </p>
            </div>

            {error ? (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            ) : null}

            <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Start date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                          Loading…
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                          No dentists or staff records found.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/80">
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                            {row.name} {row.surname}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">{formatRole(row.role)}</td>
                          <td className="max-w-[220px] truncate px-4 py-3 text-slate-600">{row.gmail}</td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                row.active ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {row.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(row.startDate)}</td>
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
