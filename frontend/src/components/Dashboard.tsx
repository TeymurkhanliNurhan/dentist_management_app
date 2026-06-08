import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { CalendarDays, DollarSign, MinusCircle, Settings, UserRound, Users } from 'lucide-react';
import api, {
  API_BASE_URL,
  dentistService,
  randevueService,
  type DentistDashboardOverview,
} from '../services/api';
import LogoutConfirmModal, { performLogout } from './LogoutConfirmModal';
import { ClinicPortalShell } from './ClinicPortalShell';
import { DIRECTOR_PORTAL_MENU, DENTIST_PORTAL_MENU, FRONTDESK_PORTAL_MENU } from '../lib/clinicPortalNav';
import { appLocaleTag } from '../lib/localeHelpers';
import i18next from '../i18n/config';

interface StaffSummary {
  name?: string;
  surname?: string;
}

type StaffStatus = 'on-site' | 'in-operation' | 'off-clock' | 'ooo';

interface DirectorMetrics {
  dailyIncome: number;
  dailyOutcome: number;
  dailyAppointments: number;
  occupiedRooms: number;
  totalRooms: number;
  staffStatuses: Array<{
    id: number;
    name: string;
    surname: string;
    role: string | null;
    status: StaffStatus;
  }>;
  blockingRequestsCount: number;
  lowStockMedicines: Array<{
    id: number;
    name: string;
    stock: number;
    stockLimit: number;
  }>;
  todayRandevues: Array<{
    id: number;
    patientName: string;
    treatingDentist: string;
    time: string;
    status: string;
    linkedToAppointment: boolean;
  }>;
  todayRandevuesTimeline: Array<{
    id: number;
    startTime: string;
    endTime: string;
    patientName: string;
  }>;
  dailyIncomeBreakdown: Array<{
    id: number;
    patientName: string;
    amount: number;
  }>;
  dailyOutcomeBreakdown: Array<{
    id: number;
    source: string;
    amount: number;
    date: string;
  }>;
  dailyAppointmentsBreakdown: Array<{
    id: number;
    patientName: string;
    startDate: string;
    chargedFee: number | null;
    calculatedFee: number;
  }>;
  awaitingBlockingRequests: Array<{
    id: number;
    staffName: string;
    startTime: string;
    endTime: string;
    requestName: string | null;
  }>;
  weeklyChart: Array<{
    dayLabel: string;
    ymd: string;
    income: number;
    outcome: number;
  }>;
}

interface DentistMetrics {
  commissionRate: number;
  todayTreatmentCount: number;
  todayRevenue: number;
  monthRevenue: number;
  todayTreatments: DentistDashboardOverview['todayTreatments'];
  todayRandevues: DentistDashboardOverview['todayRandevues'];
  todayBlockingHours: DentistDashboardOverview['todayBlockingHours'];
}

function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function localDayRangeIso(day: Date): { from: string; to: string } {
  const from = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

function startOfWeekMondayFromDate(d: Date): Date {
  const c = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = c.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  c.setDate(c.getDate() + diff);
  return c;
}

function ymdFromApiDate(value: string | Date | null | undefined, fallback: string): string {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    if (value.length >= 10) return value.slice(0, 10);
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return fallback;
    return toYmd(value);
  }
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return fallback;
  return toYmd(d);
}

function DirectorWeekIncomeOutcomeChart({
  data,
  ariaLabel,
}: {
  data: Array<{ dayLabel: string; ymd: string; income: number; outcome: number }>;
  ariaLabel: string;
}) {
  const w = 640;
  const h = 220;
  const padL = 58;
  const padR = 12;
  const padB = 32;
  const padT = 12;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const y0 = h - padB;

  const maxRaw =
    data.length > 0 ? Math.max(...data.flatMap((d) => [d.income, d.outcome])) : 0;
  const maxVal = Math.max(maxRaw, 1);

  const yForValue = (v: number) => y0 - (v / maxVal) * innerH;

  const tickSteps = 7;
  const ticks = Array.from({ length: tickSteps }, (_, i) => {
    const value = (maxVal * i) / (tickSteps - 1);
    return { value, y: yForValue(value) };
  });

  const xForIndex = (i: number) => {
    const n = data.length;
    if (n <= 1) return padL + innerW / 2;
    return padL + (i / (n - 1)) * innerW;
  };

  const formatY = (v: number) => Math.round(v).toLocaleString();

  const incomePoints = data.map((row, i) => `${xForIndex(i)},${yForValue(row.income)}`).join(' ');
  const outcomePoints = data.map((row, i) => `${xForIndex(i)},${yForValue(row.outcome)}`).join(' ');

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-52 w-full"
      role="img"
      aria-label={ariaLabel}
    >
      {ticks.map(({ value, y }) => (
        <line
          key={`grid-${value}`}
          x1={padL}
          y1={y}
          x2={w - padR}
          y2={y}
          className="stroke-slate-100"
          strokeWidth="1"
        />
      ))}
      <line
        x1={padL}
        y1={y0}
        x2={w - padR}
        y2={y0}
        className="stroke-slate-300"
        strokeWidth="1"
      />
      {ticks.map(({ value, y }) => (
        <text
          key={`tick-${value}`}
          x={padL - 6}
          y={y + 4}
          textAnchor="end"
          className="fill-slate-500"
          fontSize="10"
        >
          {formatY(value)}
        </text>
      ))}
      {data.length > 0 && (
        <>
          <polyline
            fill="none"
            stroke="currentColor"
            className="text-emerald-600"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={incomePoints}
          />
          <polyline
            fill="none"
            stroke="currentColor"
            className="text-rose-600"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={outcomePoints}
          />
          {data.map((row, i) => (
            <g key={row.ymd}>
              <circle
                cx={xForIndex(i)}
                cy={yForValue(row.income)}
                r={3.5}
                className="fill-emerald-500 stroke-white"
                strokeWidth="1.5"
              />
              <circle
                cx={xForIndex(i)}
                cy={yForValue(row.outcome)}
                r={3.5}
                className="fill-rose-500 stroke-white"
                strokeWidth="1.5"
              />
            </g>
          ))}
        </>
      )}
      {data.map((row, i) => (
        <text
          key={`x-${row.ymd}`}
          x={xForIndex(i)}
          y={h - 8}
          textAnchor="middle"
          className="fill-slate-600"
          fontSize="11"
        >
          {row.dayLabel}
        </text>
      ))}
    </svg>
  );
}

function DentistTodayTimeline({
  randevues,
  blockingHours,
  empty,
  randevuesTitle,
  blockingTitle,
  showBlockingColumn = true,
}: {
  randevues: DentistDashboardOverview['todayRandevues'];
  blockingHours: DentistDashboardOverview['todayBlockingHours'];
  empty: string;
  randevuesTitle: string;
  blockingTitle: string;
  showBlockingColumn?: boolean;
}) {
  return (
    <div className={`grid grid-cols-1 gap-4 ${showBlockingColumn ? 'lg:grid-cols-2' : ''}`}>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">{randevuesTitle}</h3>
        <div className="space-y-2">
          {randevues.length === 0 ? (
            <p className="text-sm text-slate-500">{empty}</p>
          ) : (
            randevues.map((item) => (
              <div key={item.id} className="rounded-md bg-white px-3 py-2 text-sm text-slate-700">
                <span className="font-semibold">{hmFromIso(item.startTime)} - {hmFromIso(item.endTime)}</span>{' '}
                <span>{item.patientName}</span>
              </div>
            ))
          )}
        </div>
      </div>
      {showBlockingColumn ? (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">{blockingTitle}</h3>
        <div className="space-y-2">
          {blockingHours.length === 0 ? (
            <p className="text-sm text-slate-500">{empty}</p>
          ) : (
            blockingHours.map((item) => (
              <div key={item.id} className="rounded-md bg-white px-3 py-2 text-sm text-slate-700">
                <span className="font-semibold">{hmFromIso(item.startTime)} - {hmFromIso(item.endTime)}</span>{' '}
                <span>{item.name}</span>
              </div>
            ))
          )}
        </div>
      </div>
      ) : null}
    </div>
  );
}

function hmFromIso(isoString: string): string {
  const d = new Date(isoString);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function secondsOfTime(value: string): number {
  const [hh = '0', mm = '0', ss = '0'] = value.split(':');
  return Number(hh) * 3600 + Number(mm) * 60 + Number(ss);
}

function getRandevueTimeStatus(
  startIso: string,
  endIso: string,
  now: Date,
): 'coming up' | 'ongoing' | 'completed' {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const nowMs = now.getTime();
  if (nowMs < start) return 'coming up';
  if (nowMs >= end) return 'completed';
  return 'ongoing';
}

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation('dashboard');
  const { t: tHeader } = useTranslation('header');
  const { t: tCommon } = useTranslation('common');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const role = useMemo(() => localStorage.getItem('role')?.toLowerCase(), []);
  const isSingleDentist = role === 'singledentist' || role === 'single dentist';
  const isDentistLike = role === 'dentist';
  const isDirector = role === 'director';
  const isReception = role === 'frontdesk';
  const isDirectorOrReception = isDirector || isReception;
  const usesDirectorDashboard = isDirectorOrReception || isSingleDentist;
  const [directorStaff, setDirectorStaff] = useState<StaffSummary | null>(null);
  const [awaitingBlockingCount, setAwaitingBlockingCount] = useState(0);
  const [metrics, setMetrics] = useState<DirectorMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [requestActionBusyId, setRequestActionBusyId] = useState<number | null>(null);
  const [requestActionError, setRequestActionError] = useState<string | null>(null);
  const [directorMetricsRefreshToken, setDirectorMetricsRefreshToken] = useState(0);
  const [activeDetailsPanel, setActiveDetailsPanel] = useState<
    'income' | 'outcome' | 'appointments' | 'requests' | null
  >(null);
  const [dentistPortalDisplayName, setDentistPortalDisplayName] = useState('');
  const [dentistMetrics, setDentistMetrics] = useState<DentistMetrics | null>(null);
  const [loadingDentistMetrics, setLoadingDentistMetrics] = useState(false);

  useEffect(() => {
    const fetchDirectorStaff = async () => {
      if (!usesDirectorDashboard) {
        setDirectorStaff(null);
        return;
      }

      const staffIdRaw = localStorage.getItem('staffId');
      if (!staffIdRaw) {
        setDirectorStaff(null);
        return;
      }

      const staffId = Number(staffIdRaw);
      if (!Number.isFinite(staffId) || staffId <= 0) {
        setDirectorStaff(null);
        return;
      }

      try {
        const response = await api.get(`/staff?id=${staffId}`);
        const staff = Array.isArray(response.data) ? response.data[0] : response.data;
        setDirectorStaff({
          name: staff?.name,
          surname: staff?.surname,
        });
      } catch (error) {
        console.error('Failed to fetch director staff info:', error);
        setDirectorStaff(null);
      }
    };

    void fetchDirectorStaff();
  }, [usesDirectorDashboard]);

  useEffect(() => {
    if (!isDentistLike) {
      setDentistPortalDisplayName('');
      return;
    }
    let cancelled = false;
    const load = async () => {
      const raw = localStorage.getItem('dentistId');
      const id = raw ? parseInt(raw, 10) : NaN;
      if (!Number.isFinite(id) || id <= 0) return;
      try {
        const profile = await dentistService.getById(id);
        const label = `${profile?.staff?.name ?? ''} ${profile?.staff?.surname ?? ''}`.trim();
        if (!cancelled) {
          const td = i18next.getFixedT(i18next.language, 'dashboard');
          setDentistPortalDisplayName(label || td('dentistFallback', { id }));
        }
      } catch {
        if (!cancelled) setDentistPortalDisplayName('');
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [isDentistLike, i18n.language]);

  useEffect(() => {
    let disposed = false;

    const loadDentistDashboard = async () => {
      if (!isDentistLike) {
        setDentistMetrics(null);
        return;
      }

      setLoadingDentistMetrics(true);
      try {
        const tdD = i18next.getFixedT(i18n.language, 'dashboard');
        const today = new Date();
        const todayRange = localDayRangeIso(today);
        const [overview, todayRandevues] = await Promise.all([
          dentistService.getDashboardOverview(),
          randevueService.getForRange(todayRange.from, todayRange.to),
        ]);

        const normalizedTodayRandevues = todayRandevues
          .map((item) => ({
            id: Number(item.id),
            startTime: item.date,
            endTime: item.endTime,
            patientName: `${item.patient?.name ?? ''} ${item.patient?.surname ?? ''}`.trim() || tdD('unknownPatient'),
          }))
          .sort(
            (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
          );

        if (!disposed) {
          setDentistMetrics({
            commissionRate: Number(overview.commissionRate ?? 0),
            todayTreatmentCount: Number(overview.todayTreatmentCount ?? 0),
            todayRevenue: Number(overview.todayRevenue ?? 0),
            monthRevenue: Number(overview.monthRevenue ?? 0),
            todayTreatments: Array.isArray(overview.todayTreatments) ? overview.todayTreatments : [],
            todayRandevues: normalizedTodayRandevues,
            todayBlockingHours: Array.isArray(overview.todayBlockingHours)
              ? overview.todayBlockingHours
              : [],
          });
        }
      } catch (error) {
        console.error('Failed to load dentist dashboard metrics', error);
        if (!disposed) setDentistMetrics(null);
      } finally {
        if (!disposed) setLoadingDentistMetrics(false);
      }
    };

    void loadDentistDashboard();
    const timer = window.setInterval(() => {
      void loadDentistDashboard();
    }, 30_000);

    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [isDentistLike, i18n.language]);

  useEffect(() => {
    let cancelled = false;
    const fetchAwaitingCount = async (): Promise<number> => {
      if (!usesDirectorDashboard) {
        setAwaitingBlockingCount(0);
        return 0;
      }
      const token = localStorage.getItem('access_token') || '';
      try {
        const from = new Date();
        from.setHours(0, 0, 0, 0);
        const to = new Date(from);
        to.setDate(to.getDate() + 60);
        const [blockingRes, randevueRows] = await Promise.all([
          fetch(`${API_BASE_URL}/blocking-hours`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          randevueService.getForRange(from.toISOString(), to.toISOString()),
        ]);
        if (!blockingRes.ok) throw new Error('failed');
        const blockingData = await blockingRes.json();
        const blockingCount = Array.isArray(blockingData)
          ? blockingData.filter((x) => x?.approvalStatus === 'awaiting').length
          : 0;
        const randevueCount = randevueRows.filter((r) => r.status === 'requested').length;
        const count = blockingCount + randevueCount;
        if (!cancelled) setAwaitingBlockingCount(count);
        return count;
      } catch {
        if (!cancelled) setAwaitingBlockingCount(0);
        return 0;
      }
    };

    void fetchAwaitingCount();
    const timer = window.setInterval(() => {
      void fetchAwaitingCount();
    }, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [usesDirectorDashboard, location.pathname]);

  useEffect(() => {
    let disposed = false;
    const fetchDirectorDashboard = async () => {
      if (!usesDirectorDashboard) {
        setMetrics(null);
        return;
      }
      setLoadingMetrics(true);
      const now = new Date();
      const todayYmd = toYmd(now);
      const weekStart = startOfWeekMondayFromDate(now);
      const weekEndD = new Date(weekStart);
      weekEndD.setDate(weekEndD.getDate() + 6);
      const monYmd = toYmd(weekStart);
      const sunYmd = toYmd(weekEndD);
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
      const apiDayOfWeek = now.getDay() === 0 ? 7 : now.getDay();

      try {
        const td = i18next.getFixedT(i18n.language, 'dashboard');
        const weekDayLocale = appLocaleTag(i18n.language);
        const [
          appointmentsResponse,
          paymentDetailsResponse,
          randevuesResponse,
          staffResponse,
          dentistsResponse,
          nursesResponse,
          workingHoursResponse,
          blockingHoursResponse,
          roomsResponse,
          medicinesResponse,
          blockingRequestsCount,
        ] = await Promise.all([
          api.get('/appointment', {
            params: { startDateFrom: monYmd, startDateTo: sunYmd, page: 1, limit: 2000 },
          }),
          api.get('/payment-details', { params: { dateFrom: monYmd, dateTo: sunYmd } }),
          api.get('/randevue', { params: { from: dayStart.toISOString(), to: dayEnd.toISOString() } }),
          api.get('/staff', { params: { active: true } }),
          api.get('/dentist'),
          api.get('/nurse'),
          api.get('/working-hours'),
          api.get('/blocking-hours'),
          api.get('/room'),
          api.get('/medicine'),
          (async () => {
            const res = await fetch(`${API_BASE_URL}/blocking-hours`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('access_token') || ''}` },
            });
            if (!res.ok) return 0;
            const data = await res.json();
            return Array.isArray(data)
              ? data.filter((x) => x?.approvalStatus === 'awaiting').length
              : 0;
          })(),
        ]);

        const allWeekAppointments = appointmentsResponse.data?.appointments ?? [];
        const allWeekPaymentDetails = Array.isArray(paymentDetailsResponse.data)
          ? paymentDetailsResponse.data
          : [];

        const appointments = allWeekAppointments.filter(
          (item: { startDate?: string | Date }) =>
            ymdFromApiDate(item.startDate, todayYmd) === todayYmd,
        );
        const paymentDetails = allWeekPaymentDetails.filter((item: { date?: string | Date | null }) =>
          ymdFromApiDate(item.date, todayYmd) === todayYmd,
        );
        const randevues = Array.isArray(randevuesResponse.data) ? randevuesResponse.data : [];
        const staffRows = Array.isArray(staffResponse.data) ? staffResponse.data : [];
        const dentists = Array.isArray(dentistsResponse.data) ? dentistsResponse.data : [];
        const nurses = Array.isArray(nursesResponse.data) ? nursesResponse.data : [];
        const workingHours = Array.isArray(workingHoursResponse.data) ? workingHoursResponse.data : [];
        const blockingHours = Array.isArray(blockingHoursResponse.data) ? blockingHoursResponse.data : [];
        const rooms = Array.isArray(roomsResponse.data) ? roomsResponse.data : [];
        const medicines = Array.isArray(medicinesResponse.data) ? medicinesResponse.data : [];

        const dailyIncome = appointments.reduce(
          (sum: number, item: { calculatedFee?: number }) => sum + Number(item?.calculatedFee ?? 0),
          0,
        );
        const dailyOutcome = paymentDetails.reduce(
          (sum: number, item: { cost?: number }) => sum + Number(item?.cost ?? 0),
          0,
        );

        const activeRandevuesNow = randevues.filter((r: { date: string; endTime: string }) => {
          const start = new Date(r.date).getTime();
          const end = new Date(r.endTime).getTime();
          const nowMs = now.getTime();
          return start <= nowMs && nowMs < end;
        });

        const occupiedRoomIds = new Set(
          activeRandevuesNow
            .map((r: { room?: { id?: number } }) => r.room?.id)
            .filter((id: number | undefined): id is number => typeof id === 'number'),
        );

        const activeByStaffId = new Map<number, { roomDescription?: string }>();
        const dentistStaffIdByDentistId = new Map<number, number>();
        dentists.forEach((dentist: { id?: number; staffId?: number; staff?: { id?: number } }) => {
          const dentistId = dentist.id;
          const staffId = dentist.staff?.id ?? dentist.staffId;
          if (typeof dentistId === 'number' && typeof staffId === 'number') {
            dentistStaffIdByDentistId.set(dentistId, staffId);
          }
        });
        const nurseStaffIdByNurseId = new Map<number, number>();
        nurses.forEach((nurse: { id?: number; staffId?: number; staff?: { id?: number } }) => {
          const nurseId = nurse.id;
          const staffId = nurse.staff?.id ?? nurse.staffId;
          if (typeof nurseId === 'number' && typeof staffId === 'number') {
            nurseStaffIdByNurseId.set(nurseId, staffId);
          }
        });
        activeRandevuesNow.forEach(
          (r: {
            dentist?: { id?: number };
            nurse?: { id?: number };
            room?: { description?: string };
          }) => {
            if (typeof r?.dentist?.id === 'number') {
              const staffId = dentistStaffIdByDentistId.get(r.dentist.id) ?? r.dentist.id;
              activeByStaffId.set(staffId, { roomDescription: r.room?.description });
            }
            if (typeof r?.nurse?.id === 'number') {
              const staffId = nurseStaffIdByNurseId.get(r.nurse.id) ?? r.nurse.id;
              activeByStaffId.set(staffId, { roomDescription: r.room?.description });
            }
          },
        );

        const blockingByStaffId = new Set<number>();
        blockingHours.forEach(
          (item: {
            staffId?: number;
            approvalStatus?: string;
            startTime?: string;
            endTime?: string;
          }) => {
            if (item.approvalStatus !== 'approved') return;
            if (typeof item.staffId !== 'number') return;
            const start = new Date(item.startTime ?? '').getTime();
            const end = new Date(item.endTime ?? '').getTime();
            const nowMs = now.getTime();
            if (Number.isFinite(start) && Number.isFinite(end) && start <= nowMs && nowMs < end) {
              blockingByStaffId.add(item.staffId);
            }
          },
        );

        const workingByStaffId = new Map<number, Array<{ startTime: string; endTime: string }>>();
        workingHours.forEach(
          (item: { staffId?: number; dayOfWeek?: number; startTime?: string; endTime?: string }) => {
            if (item.dayOfWeek !== apiDayOfWeek || typeof item.staffId !== 'number') return;
            const arr = workingByStaffId.get(item.staffId) ?? [];
            arr.push({
              startTime: item.startTime ?? '00:00:00',
              endTime: item.endTime ?? '00:00:00',
            });
            workingByStaffId.set(item.staffId, arr);
          },
        );

        const relevantStaff = staffRows.filter((s: { role?: string | null }) => {
          const roleName = (s.role ?? '').toLowerCase();
          return roleName === 'dentist' || roleName === 'nurse';
        });

        const staffStatuses = relevantStaff.map(
          (staff: { id: number; name: string; surname: string; role: string | null }) => {
            const windows = workingByStaffId.get(staff.id) ?? [];
            const inWorkingHours = windows.some(
              (w) =>
                secondsOfTime(w.startTime) <= nowSeconds &&
                nowSeconds < secondsOfTime(w.endTime),
            );

            let status: StaffStatus = 'off-clock';
            const active = activeByStaffId.get(staff.id);
            if (!inWorkingHours) {
              status = 'off-clock';
            } else if (active) {
              status = 'in-operation';
            } else if (blockingByStaffId.has(staff.id)) {
              status = 'ooo';
            } else {
              status = 'on-site';
            }
            return { ...staff, status };
          },
        );

        const lowStockMedicines = medicines
          .filter((m: { stock?: number; stockLimit?: number | null }) => {
            if (typeof m.stockLimit !== 'number') return false;
            return Number(m.stock ?? 0) <= m.stockLimit;
          })
          .map((m: { id: number; name: string; stock: number; stockLimit: number }) => ({
            id: m.id,
            name: m.name,
            stock: Number(m.stock ?? 0),
            stockLimit: Number(m.stockLimit ?? 0),
          }))
          .slice(0, 6);

        const ymdInWeek: string[] = [];
        for (let i = 0; i < 7; i += 1) {
          const cur = new Date(weekStart);
          cur.setDate(cur.getDate() + i);
          ymdInWeek.push(toYmd(cur));
        }
        const incomeByYmd: Record<string, number> = Object.fromEntries(ymdInWeek.map((y) => [y, 0]));
        const outcomeByYmd: Record<string, number> = Object.fromEntries(ymdInWeek.map((y) => [y, 0]));
        for (const item of allWeekAppointments) {
          const y = ymdFromApiDate(
            (item as { startDate?: string | Date | null })?.startDate,
            monYmd,
          );
          if (y in incomeByYmd) {
            incomeByYmd[y] += Number(
              (item as { calculatedFee?: number } | null)?.calculatedFee ?? 0,
            );
          }
        }
        for (const item of allWeekPaymentDetails) {
          const y = ymdFromApiDate(
            (item as { date?: string | Date | null })?.date,
            monYmd,
          );
          if (y in outcomeByYmd) {
            outcomeByYmd[y] += Number((item as { cost?: number })?.cost ?? 0);
          }
        }
        const weeklyChart = ymdInWeek.map((ymd) => {
          const d = new Date(ymd + 'T12:00:00');
          const dayLabel = d.toLocaleDateString(weekDayLocale, { weekday: 'short' });
          return {
            ymd,
            dayLabel,
            income: incomeByYmd[ymd] ?? 0,
            outcome: outcomeByYmd[ymd] ?? 0,
          };
        });

        const staffNameById = new Map<number, string>();
        staffRows.forEach((row: { id: number; name?: string; surname?: string }) => {
          const fullName = `${row.name ?? ''} ${row.surname ?? ''}`.trim() || '-';
          staffNameById.set(row.id, fullName);
        });

        const awaitingBlockingRequests = blockingHours
          .filter((item: { approvalStatus?: string }) => item.approvalStatus === 'awaiting')
          .slice()
          .sort(
            (
              a: { startTime?: string },
              b: { startTime?: string },
            ) => new Date(a.startTime ?? '').getTime() - new Date(b.startTime ?? '').getTime(),
          )
          .map(
            (item: {
              id: number;
              staffId?: number;
              startTime?: string;
              endTime?: string;
              name?: string | null;
            }) => ({
              id: item.id,
              staffName:
                typeof item.staffId === 'number'
                  ? (staffNameById.get(item.staffId) ?? td('staffNumber', { id: item.staffId }))
                  : td('unknownStaff'),
              startTime: item.startTime ?? '',
              endTime: item.endTime ?? '',
              requestName: item.name ?? null,
            }),
          );

        const dailyIncomeBreakdown = appointments.map(
          (item: {
            id: number;
            patient?: { name?: string; surname?: string };
            calculatedFee?: number;
          }) => ({
            id: item.id,
            patientName:
              `${item.patient?.name ?? ''} ${item.patient?.surname ?? ''}`.trim() || '-',
            amount: Number(item?.calculatedFee ?? 0),
          }),
        );

        const dailyOutcomeBreakdown = paymentDetails.map(
          (item: {
            id: number;
            cost?: number;
            date?: string;
            expense?: { name?: string } | null;
            salary?: { staff?: { name?: string; surname?: string } } | null;
            purchaseMedicineRecords?: unknown[];
          }) => {
            const salaryFull = item.salary?.staff
              ? `${item.salary.staff.name ?? ''} ${item.salary.staff.surname ?? ''}`.trim()
              : '';
            const source =
              item.expense?.name ||
              (item.salary?.staff
                ? td('outcomeSalaryPrefix', { name: salaryFull })
                : Array.isArray(item.purchaseMedicineRecords) &&
                    item.purchaseMedicineRecords.length > 0
                  ? td('outcomeMedicinePurchase')
                  : td('outcomeOther'));
            return {
              id: item.id,
              source,
              amount: Number(item.cost ?? 0),
              date: ymdFromApiDate(item.date, todayYmd),
            };
          },
        );

        const dailyAppointmentsBreakdown = appointments.map(
          (item: {
            id: number;
            startDate?: string;
            chargedFee?: number | null;
            calculatedFee?: number;
            patient?: { name?: string; surname?: string };
          }) => ({
            id: item.id,
            patientName:
              `${item.patient?.name ?? ''} ${item.patient?.surname ?? ''}`.trim() || '-',
            startDate: ymdFromApiDate(item.startDate, todayYmd),
            chargedFee: item.chargedFee ?? null,
            calculatedFee: Number(item.calculatedFee ?? 0),
          }),
        );

        const sortedTodayRandevues = randevues.slice().sort(
          (a: { date: string }, b: { date: string }) =>
            new Date(a.date).getTime() - new Date(b.date).getTime(),
        );
        const todayRandevuesTimeline = sortedTodayRandevues.map(
          (item: {
            id: number;
            date: string;
            endTime: string;
            patient?: { name?: string; surname?: string };
          }) => ({
            id: item.id,
            startTime: item.date,
            endTime: item.endTime,
            patientName:
              `${item.patient?.name ?? ''} ${item.patient?.surname ?? ''}`.trim() || td('unknownPatient'),
          }),
        );
        const todayRandevues = sortedTodayRandevues.slice(0, 8).map(
          (item: {
            id: number;
            date: string;
            endTime: string;
            status: string;
            patient?: { name?: string; surname?: string };
            dentist?: { name?: string; surname?: string } | null;
            appointment?: { id?: number } | null;
          }) => ({
            id: item.id,
            patientName:
              `${item.patient?.name ?? ''} ${item.patient?.surname ?? ''}`.trim() || '-',
            treatingDentist:
              `${item.dentist?.name ?? ''} ${item.dentist?.surname ?? ''}`.trim() || '-',
            time: hmFromIso(item.date),
            status: getRandevueTimeStatus(item.date, item.endTime, now),
            linkedToAppointment: !!item.appointment?.id,
          }),
        );

        if (!disposed) {
          setAwaitingBlockingCount(blockingRequestsCount);
          setMetrics({
            dailyIncome,
            dailyOutcome,
            dailyAppointments: appointments.length,
            occupiedRooms: occupiedRoomIds.size,
            totalRooms: rooms.length,
            staffStatuses,
            blockingRequestsCount,
            lowStockMedicines,
            todayRandevues,
            todayRandevuesTimeline,
            dailyIncomeBreakdown,
            dailyOutcomeBreakdown,
            dailyAppointmentsBreakdown,
            awaitingBlockingRequests,
            weeklyChart,
          });
        }
      } catch (error) {
        console.error('Failed to load director dashboard metrics', error);
        if (!disposed) setMetrics(null);
      } finally {
        if (!disposed) setLoadingMetrics(false);
      }
    };

    void fetchDirectorDashboard();
    const timer = window.setInterval(() => {
      void fetchDirectorDashboard();
    }, 30_000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [directorMetricsRefreshToken, usesDirectorDashboard, i18n.language]);

  const handleBlockingRequestAction = async (id: number, action: 'approve' | 'reject') => {
    if (!usesDirectorDashboard) return;
    setRequestActionError(null);
    setRequestActionBusyId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/blocking-hours/${id}/${action}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token') || ''}` },
      });
      if (!res.ok) throw new Error(`blocking ${action}`);
      setDirectorMetricsRefreshToken((x) => x + 1);
    } catch {
      setRequestActionError(t('blockingRequestUpdateError'));
    } finally {
      setRequestActionBusyId(null);
    }
  };

  const staffStatusLabel = useCallback(
    (status: StaffStatus) => {
      switch (status) {
        case 'on-site':
          return t('staffOnSite');
        case 'in-operation':
          return t('staffInOperation');
        case 'off-clock':
          return t('staffOffClock');
        case 'ooo':
          return t('staffOoo');
        default:
          return String(status).replaceAll('-', ' ');
      }
    },
    [t],
  );

  const randevueStatusLabel = useCallback(
    (status: string) => {
      if (status === 'coming up') return t('randevueComingUp');
      if (status === 'ongoing') return t('randevueOngoing');
      if (status === 'completed') return t('randevueCompleted');
      return status;
    },
    [t],
  );

  const directorDisplayName = `${directorStaff?.name ?? ''} ${directorStaff?.surname ?? ''}`.trim();
  const directorLikeMenuItems = isSingleDentist
    ? DIRECTOR_PORTAL_MENU.filter((item) => item.path !== '/staff')
    : DIRECTOR_PORTAL_MENU;

  const showDirectorFinanceAndChart = isDirector || isSingleDentist;
  const showRoomOccupancyCard = isDirectorOrReception && !isSingleDentist;

  if (usesDirectorDashboard) {
    return (
      <>
      <div className="h-dvh overflow-hidden bg-[#f4f6f8] text-slate-700">
        <ClinicPortalShell
          brandTitle={tHeader('brandPrecisionDental')}
          portalBadge={isDirector || isSingleDentist ? 'Admin Portal' : 'Reception Portal'}
          userDisplayName={directorDisplayName}
          userSubtitle={isDirector || isSingleDentist ? 'Clinic Director' : 'Receptionist'}
          menuItems={isDirector || isSingleDentist ? directorLikeMenuItems : FRONTDESK_PORTAL_MENU}
          pathname={location.pathname}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          navigate={navigate}
          onLogoutClick={() => setShowLogoutConfirm(true)}
          scheduleNotificationCount={awaitingBlockingCount}
          headerActions={
            isDirector ? (
            <button
              type="button"
              onClick={() => navigate('/staff')}
              className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100"
              aria-label={t('staffSettingsAria')}
            >
              <Settings size={16} />
            </button>
            ) : null
          }
        >
          <main className="min-h-0 flex-1 overflow-y-auto bg-[#f9fafb] p-6">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
              <section>
                <h1 className="text-3xl font-semibold text-slate-800">{t('directorTitle')}</h1>
                <p className="text-sm text-slate-500">
                  {t('directorSubtitle')}
                </p>
              </section>

              <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {showDirectorFinanceAndChart && (
                <button
                  type="button"
                  onClick={() => setActiveDetailsPanel('income')}
                  className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-emerald-300 hover:shadow-sm"
                >
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    {t('dailyIncome')}
                  </div>
                  <p className="text-2xl font-semibold text-slate-800">
                    ${Number(metrics?.dailyIncome ?? 0).toFixed(2)}
                  </p>
                </button>
                )}
                {showDirectorFinanceAndChart && (
                <button
                  type="button"
                  onClick={() => setActiveDetailsPanel('outcome')}
                  className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-rose-300 hover:shadow-sm"
                >
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <MinusCircle className="h-4 w-4 text-rose-600" />
                    {t('dailyOutcome')}
                  </div>
                  <p className="text-2xl font-semibold text-slate-800">
                    ${Number(metrics?.dailyOutcome ?? 0).toFixed(2)}
                  </p>
                </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveDetailsPanel('appointments')}
                  className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-300 hover:shadow-sm"
                >
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <CalendarDays className="h-4 w-4 text-blue-600" />
                    {t('appointmentsToday')}
                  </div>
                  <p className="text-2xl font-semibold text-slate-800">{metrics?.dailyAppointments ?? 0}</p>
                </button>
                {showRoomOccupancyCard ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Users className="h-4 w-4 text-indigo-600" />
                    {t('roomOccupancy')}
                  </div>
                  <p className="text-2xl font-semibold text-slate-800">
                    {metrics?.occupiedRooms ?? 0} / {metrics?.totalRooms ?? 0}
                  </p>
                </div>
                ) : null}
              </section>

              {showDirectorFinanceAndChart && (
              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800">
                      {t('weekChartTitle')}
                    </h2>
                    <p className="text-sm text-slate-500">{t('weekChartSubtitle')}</p>
                  </div>
                  <div className="flex gap-4 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                      {t('chartIncome')}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm bg-rose-500" />
                      {t('chartOutcome')}
                    </span>
                  </div>
                </div>
                <DirectorWeekIncomeOutcomeChart ariaLabel={t('weekChartAria')} data={metrics?.weeklyChart ?? []} />
              </section>
              )}

              {activeDetailsPanel && (
                <section className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-800">
                      {activeDetailsPanel === 'income' && t('panelIncomeBreakdown')}
                      {activeDetailsPanel === 'outcome' && t('panelOutcomeBreakdown')}
                      {activeDetailsPanel === 'appointments' && t('panelTodayAppointments')}
                      {activeDetailsPanel === 'requests' && t('panelAwaitingBlocking')}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveDetailsPanel(null)}
                      className="text-sm font-medium text-slate-500 hover:text-slate-700"
                    >
                      {t('close')}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {activeDetailsPanel === 'income' &&
                      (metrics?.dailyIncomeBreakdown ?? []).map((row) => (
                        <div key={row.id} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                          <span className="text-slate-700">{row.patientName}</span>
                          <span className="font-semibold text-emerald-700">${row.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    {activeDetailsPanel === 'outcome' &&
                      (metrics?.dailyOutcomeBreakdown ?? []).map((row) => (
                        <div key={row.id} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                          <div className="flex flex-col">
                            <span className="text-slate-700">{row.source}</span>
                            <span className="text-xs text-slate-500">{row.date}</span>
                          </div>
                          <span className="font-semibold text-rose-700">${row.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    {activeDetailsPanel === 'appointments' &&
                      (metrics?.dailyAppointmentsBreakdown ?? []).map((row) => (
                        <div key={row.id} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                          <div className="flex flex-col">
                            <span className="text-slate-700">{row.patientName}</span>
                            <span className="text-xs text-slate-500">{row.startDate}</span>
                          </div>
                          <span className="font-semibold text-blue-700">
                            ${Number(row.chargedFee ?? row.calculatedFee).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    {activeDetailsPanel === 'requests' &&
                      (metrics?.awaitingBlockingRequests ?? []).map((row) => (
                        <div key={row.id} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                          <div className="flex flex-col">
                            <span className="text-slate-700">{row.staffName}</span>
                            <span className="text-xs text-slate-500">
                              {hmFromIso(row.startTime)} - {hmFromIso(row.endTime)}
                            </span>
                          </div>
                          <span className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                            {row.requestName || t('requestFallback')}
                          </span>
                          <div className="ml-3 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void handleBlockingRequestAction(row.id, 'approve')}
                              disabled={requestActionBusyId === row.id}
                              className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {t('approve')}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleBlockingRequestAction(row.id, 'reject')}
                              disabled={requestActionBusyId === row.id}
                              className="rounded border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {t('reject')}
                            </button>
                          </div>
                        </div>
                      ))}
                    {activeDetailsPanel === 'requests' && requestActionError && (
                      <p className="text-sm text-rose-600">{requestActionError}</p>
                    )}
                  </div>
                </section>
              )}

              <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4 xl:col-span-2">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-800">{t('todaysRandevues')}</h2>
                    <button
                      type="button"
                      onClick={() => navigate('/schedule')}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      {t('openSchedule')}
                    </button>
                  </div>
                  {isSingleDentist ? (
                    <DentistTodayTimeline
                      randevues={metrics?.todayRandevuesTimeline ?? []}
                      blockingHours={[]}
                      empty={t('dentistScheduleEmpty')}
                      randevuesTitle={t('dentistTodayRandevues')}
                      blockingTitle=""
                      showBlockingColumn={false}
                    />
                  ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                          <th className="py-2 pr-3">{t('colPatient')}</th>
                          <th className="py-2 pr-3">{t('colDentist')}</th>
                          <th className="py-2 pr-3">{t('colTime')}</th>
                          <th className="py-2 pr-3">{t('colStatus')}</th>
                          <th className="py-2">{t('colLink')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(metrics?.todayRandevues ?? []).map((row) => (
                          <tr key={row.id} className="border-b border-slate-100">
                            <td className="py-2 pr-3 font-medium text-slate-700">{row.patientName}</td>
                            <td className="py-2 pr-3 text-slate-600">{row.treatingDentist}</td>
                            <td className="py-2 pr-3 text-slate-600">{row.time}</td>
                            <td className="py-2 pr-3 capitalize text-slate-600">{randevueStatusLabel(row.status)}</td>
                            <td className="py-2 text-slate-600">
                              {row.linkedToAppointment ? t('randevueLinkBoth') : t('randevueLinkOnly')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  )}
                </div>

                <div className="flex flex-col gap-4">
                  {!isSingleDentist ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-slate-800">{t('staffStatus')}</h2>
                      <button
                        type="button"
                        onClick={() => setActiveDetailsPanel('requests')}
                        className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        {t('blockingRequestsShort', { count: metrics?.blockingRequestsCount ?? 0 })}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(metrics?.staffStatuses ?? []).slice(0, 6).map((staff) => (
                        <div key={staff.id} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <UserRound className="h-4 w-4 text-slate-500" />
                            <span className="text-sm text-slate-700">
                              {staff.name} {staff.surname}
                            </span>
                          </div>
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                            {staffStatusLabel(staff.status)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  ) : null}

                  {(isDirectorOrReception || isSingleDentist) && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                    <h2 className="mb-2 text-lg font-semibold text-rose-800">{t('medicinesToPurchase')}</h2>
                    <div className="space-y-2">
                      {(metrics?.lowStockMedicines ?? []).length === 0 ? (
                        <p className="text-sm text-rose-700">{t('noLowStockMedicines')}</p>
                      ) : (
                        (metrics?.lowStockMedicines ?? []).map((medicine) => (
                          <div key={medicine.id} className="flex items-center justify-between rounded-md bg-white px-3 py-2">
                            <span className="text-sm font-medium text-slate-700">{medicine.name}</span>
                            <span className="text-xs font-semibold text-rose-700">
                              {medicine.stock} / {medicine.stockLimit}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  )}
                </div>
              </section>

              {loadingMetrics && (
                <p className="text-sm text-slate-500">{t('refreshingDashboard')}</p>
              )}
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
  }

  if (isDentistLike) {
    return (
      <>
        <div className="h-dvh overflow-hidden bg-[#f4f6f8] text-slate-700">
          <ClinicPortalShell
            brandTitle={tHeader('clinicManagementTitle')}
            portalBadge="Dentist Portal"
            userDisplayName={dentistPortalDisplayName}
            userSubtitle="Dentist"
            menuItems={DENTIST_PORTAL_MENU}
            pathname={location.pathname}
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            navigate={navigate}
            onLogoutClick={() => setShowLogoutConfirm(true)}
            showProfileStrip
          >
            <main className="min-h-0 flex-1 overflow-y-auto bg-[#f9fafb] p-6">
              <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
                <section>
                  <h1 className="text-3xl font-semibold text-slate-800">{t('todayTreatmentsHeading')}</h1>
                  <p className="mt-1 text-sm text-slate-500">{t('dentistDashboardSubtitle')}</p>
                </section>
                <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <CalendarDays className="h-4 w-4 text-blue-600" />
                      {t('dentistTodayTreatments')}
                    </div>
                    <p className="text-2xl font-semibold text-slate-800">
                      {dentistMetrics?.todayTreatmentCount ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <DollarSign className="h-4 w-4 text-emerald-600" />
                      {t('dentistTodayRevenue')}
                      <span className="font-normal normal-case text-slate-400">
                        ({dentistMetrics?.commissionRate ?? 0}%)
                      </span>
                    </div>
                    <p className="text-2xl font-semibold text-slate-800">
                      ${Number(dentistMetrics?.todayRevenue ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <MinusCircle className="h-4 w-4 text-indigo-600" />
                      {t('dentistMonthRevenue')}
                      <span className="font-normal normal-case text-slate-400">
                        ({dentistMetrics?.commissionRate ?? 0}%)
                      </span>
                    </div>
                    <p className="text-2xl font-semibold text-slate-800">
                      ${Number(dentistMetrics?.monthRevenue ?? 0).toFixed(2)}
                    </p>
                  </div>
                </section>
                {/* Today's Treatments and Benefits */}
                <section className="rounded-xl border border-slate-200 bg-white p-4">
                  <h2 className="mb-3 text-lg font-semibold text-slate-800">
                    {t('todayTreatmentsSection')}
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                          <th className="py-2 pr-3">{t('colPatient')}</th>
                          <th className="py-2 pr-3">{t('colTreatment')}</th>
                          <th className="py-2 pr-3">{t('colYourShare')}</th>
                          <th className="py-2 pr-3">{t('colDate')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(dentistMetrics?.todayTreatments ?? []).map((row, idx) => (
                          <tr
                            key={`${row.appointmentId}-${row.treatmentName}-${idx}`}
                            className="border-b border-slate-100"
                          >
                            <td className="py-2 pr-3 font-medium text-slate-700">{row.patientName}</td>
                            <td className="py-2 pr-3 text-slate-600">{row.treatmentName}</td>
                            <td className="py-2 pr-3 text-slate-600">${row.benefit.toFixed(2)}</td>
                            <td className="py-2 pr-3 text-slate-600">{ymdFromApiDate(row.date, t('notApplicable'))}</td>
                          </tr>
                        ))}
                        {(dentistMetrics?.todayTreatments?.length ?? 0) === 0 && (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-slate-500">{t('noTreatmentsToday')}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
                <section className="rounded-xl border border-slate-200 bg-white p-4">
                  <h2 className="mb-3 text-lg font-semibold text-slate-800">{t('dentistTodayScheduleTimeline')}</h2>
                  <DentistTodayTimeline
                    randevues={dentistMetrics?.todayRandevues ?? []}
                    blockingHours={dentistMetrics?.todayBlockingHours ?? []}
                    empty={t('dentistScheduleEmpty')}
                    randevuesTitle={t('dentistTodayRandevues')}
                    blockingTitle={t('dentistTodayBlockingHours')}
                  />
                </section>
                {loadingDentistMetrics && (
                  <p className="text-sm text-slate-500">{t('dentistDashboardRefreshing')}</p>
                )}
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
  }

  return (
    <div className="flex h-dvh items-center justify-center bg-[#f4f6f8] text-slate-700">
      <p className="text-lg">{tCommon('noPermissionPage')}</p>
    </div>
  );
};

export default Dashboard;

