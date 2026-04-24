import Header from './Header';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DASHBOARD_TILE_IMAGES, type DashboardTileKey } from '../lib/dashboardTileImages';
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, DollarSign, MinusCircle, Settings, UserRound, Users } from 'lucide-react';
import api, { API_BASE_URL, dentistService } from '../services/api';
import LogoutConfirmModal, { performLogout } from './LogoutConfirmModal';
import { ClinicPortalShell } from './ClinicPortalShell';
import { DIRECTOR_PORTAL_MENU, DENTIST_PORTAL_MENU } from '../lib/clinicPortalNav';

const TILE_IMAGE_QUERY = '?v=2';

interface StaffSummary {
  name?: string;
  surname?: string;
}

type StaffStatus = 'on-site' | 'in-surgery' | 'off-clock' | 'resting';

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

function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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
}: {
  data: Array<{ dayLabel: string; ymd: string; income: number; outcome: number }>;
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
      aria-label="This week income and outcome by day"
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
  const { t } = useTranslation('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const role = useMemo(() => localStorage.getItem('role')?.toLowerCase(), []);
  const [directorStaff, setDirectorStaff] = useState<StaffSummary | null>(null);
  const [awaitingBlockingCount, setAwaitingBlockingCount] = useState(0);
  const [metrics, setMetrics] = useState<DirectorMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [activeDetailsPanel, setActiveDetailsPanel] = useState<
    'income' | 'outcome' | 'appointments' | 'requests' | null
  >(null);
  const [dentistPortalDisplayName, setDentistPortalDisplayName] = useState('');

  useEffect(() => {
    const fetchDirectorStaff = async () => {
      if (role !== 'director') {
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
  }, [role]);

  useEffect(() => {
    if (role !== 'dentist') {
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
        if (!cancelled) setDentistPortalDisplayName(label || `Dentist #${id}`);
      } catch {
        if (!cancelled) setDentistPortalDisplayName('');
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [role]);

  useEffect(() => {
    let cancelled = false;
    const fetchAwaitingCount = async (): Promise<number> => {
      if (role !== 'director') {
        setAwaitingBlockingCount(0);
        return 0;
      }
      const token = localStorage.getItem('access_token') || '';
      try {
        const res = await fetch(`${API_BASE_URL}/blocking-hours`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('failed');
        const data = await res.json();
        const count = Array.isArray(data)
          ? data.filter((x) => x?.approvalStatus === 'awaiting').length
          : 0;
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
  }, [location.pathname, role]);

  useEffect(() => {
    let disposed = false;
    const fetchDirectorDashboard = async () => {
      if (role !== 'director') {
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
        const [
          appointmentsResponse,
          paymentDetailsResponse,
          randevuesResponse,
          staffResponse,
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
        activeRandevuesNow.forEach(
          (r: {
            dentist?: { id?: number };
            nurse?: { id?: number };
            room?: { description?: string };
          }) => {
            if (typeof r?.dentist?.id === 'number') {
              activeByStaffId.set(r.dentist.id, { roomDescription: r.room?.description });
            }
            if (typeof r?.nurse?.id === 'number') {
              activeByStaffId.set(r.nurse.id, { roomDescription: r.room?.description });
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
              const isSurgery = (active.roomDescription ?? '').toLowerCase().includes('surgery');
              status = isSurgery ? 'in-surgery' : 'on-site';
            } else if (blockingByStaffId.has(staff.id)) {
              status = 'resting';
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
          const dayLabel = d.toLocaleDateString('en-GB', { weekday: 'short' });
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
                  ? (staffNameById.get(item.staffId) ?? `Staff #${item.staffId}`)
                  : 'Unknown',
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
            const source =
              item.expense?.name ||
              (item.salary?.staff
                ? `Salary: ${item.salary.staff.name ?? ''} ${item.salary.staff.surname ?? ''}`.trim()
                : Array.isArray(item.purchaseMedicineRecords) &&
                    item.purchaseMedicineRecords.length > 0
                  ? 'Medicine purchase'
                  : 'Other');
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

        const todayRandevues = randevues
          .slice()
          .sort(
            (a: { date: string }, b: { date: string }) =>
              new Date(a.date).getTime() - new Date(b.date).getTime(),
          )
          .slice(0, 8)
          .map(
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
  }, [role]);

  const directorDisplayName = `${directorStaff?.name ?? ''} ${directorStaff?.surname ?? ''}`.trim();

  const services: { nameKey: DashboardTileKey; image: string; path: string }[] = [
    {
      nameKey: 'appointments',
      path: '/appointments',
      image: `${DASHBOARD_TILE_IMAGES.appointments}${TILE_IMAGE_QUERY}`,
    },
    {
      nameKey: 'patients',
      path: '/patients',
      image: `${DASHBOARD_TILE_IMAGES.patients}${TILE_IMAGE_QUERY}`,
    },
    {
      nameKey: 'treatments',
      path: '/treatments',
      image: `${DASHBOARD_TILE_IMAGES.treatments}${TILE_IMAGE_QUERY}`,
    },
    {
      nameKey: 'medicines',
      path: '/medicines',
      image: `${DASHBOARD_TILE_IMAGES.medicines}${TILE_IMAGE_QUERY}`,
    },
    {
      nameKey: 'schedule',
      path: '/schedule',
      image: `${DASHBOARD_TILE_IMAGES.schedule}${TILE_IMAGE_QUERY}`,
    },
  ];

  if (role === 'director') {
    return (
      <>
      <div className="h-dvh overflow-hidden bg-[#f4f6f8] text-slate-700">
        <ClinicPortalShell
          brandTitle="Precision Dental"
          portalBadge="Admin Portal"
          userDisplayName={directorDisplayName}
          userSubtitle="Clinic Director"
          menuItems={DIRECTOR_PORTAL_MENU}
          pathname={location.pathname}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          navigate={navigate}
          onLogoutClick={() => setShowLogoutConfirm(true)}
          scheduleNotificationCount={awaitingBlockingCount}
          headerActions={
            <button
              type="button"
              onClick={() => navigate('/staff')}
              className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100"
              aria-label="Staff and doctors"
            >
              <Settings size={16} />
            </button>
          }
        >
          <main className="min-h-0 flex-1 overflow-y-auto bg-[#f9fafb] p-6">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
              <section>
                <h1 className="text-3xl font-semibold text-slate-800">Director&apos;s Overview</h1>
                <p className="text-sm text-slate-500">
                  Real-time and daily clinic performance snapshot.
                </p>
              </section>

              <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <button
                  type="button"
                  onClick={() => setActiveDetailsPanel('income')}
                  className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-emerald-300 hover:shadow-sm"
                >
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    Daily Income
                  </div>
                  <p className="text-2xl font-semibold text-slate-800">
                    ${Number(metrics?.dailyIncome ?? 0).toFixed(2)}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDetailsPanel('outcome')}
                  className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-rose-300 hover:shadow-sm"
                >
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <MinusCircle className="h-4 w-4 text-rose-600" />
                    Daily Outcome
                  </div>
                  <p className="text-2xl font-semibold text-slate-800">
                    ${Number(metrics?.dailyOutcome ?? 0).toFixed(2)}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDetailsPanel('appointments')}
                  className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-300 hover:shadow-sm"
                >
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <CalendarDays className="h-4 w-4 text-blue-600" />
                    Appointments Today
                  </div>
                  <p className="text-2xl font-semibold text-slate-800">{metrics?.dailyAppointments ?? 0}</p>
                </button>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Users className="h-4 w-4 text-indigo-600" />
                    Room Occupancy
                  </div>
                  <p className="text-2xl font-semibold text-slate-800">
                    {metrics?.occupiedRooms ?? 0} / {metrics?.totalRooms ?? 0}
                  </p>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800">
                      This week: income and outcome by day
                    </h2>
                    <p className="text-sm text-slate-500">Monday to Sunday, current calendar week</p>
                  </div>
                  <div className="flex gap-4 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                      Income
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm bg-rose-500" />
                      Outcome
                    </span>
                  </div>
                </div>
                <DirectorWeekIncomeOutcomeChart data={metrics?.weeklyChart ?? []} />
              </section>

              {activeDetailsPanel && (
                <section className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-800">
                      {activeDetailsPanel === 'income' && 'Daily Income Breakdown'}
                      {activeDetailsPanel === 'outcome' && 'Daily Outcome Breakdown'}
                      {activeDetailsPanel === 'appointments' && 'Today Appointments'}
                      {activeDetailsPanel === 'requests' && 'Awaiting Blocking Requests'}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveDetailsPanel(null)}
                      className="text-sm font-medium text-slate-500 hover:text-slate-700"
                    >
                      Close
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
                            {row.requestName || 'request'}
                          </span>
                        </div>
                      ))}
                  </div>
                </section>
              )}

              <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4 xl:col-span-2">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-800">Today&apos;s Randevues</h2>
                    <button
                      type="button"
                      onClick={() => navigate('/appointments')}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      View all
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                          <th className="py-2 pr-3">Patient</th>
                          <th className="py-2 pr-3">Dentist</th>
                          <th className="py-2 pr-3">Time</th>
                          <th className="py-2 pr-3">Status</th>
                          <th className="py-2">Link</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(metrics?.todayRandevues ?? []).map((row) => (
                          <tr key={row.id} className="border-b border-slate-100">
                            <td className="py-2 pr-3 font-medium text-slate-700">{row.patientName}</td>
                            <td className="py-2 pr-3 text-slate-600">{row.treatingDentist}</td>
                            <td className="py-2 pr-3 text-slate-600">{row.time}</td>
                            <td className="py-2 pr-3 capitalize text-slate-600">{row.status}</td>
                            <td className="py-2 text-slate-600">
                              {row.linkedToAppointment ? 'Randevue + Appointment' : 'Randevue only'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-slate-800">Staff Status</h2>
                      <button
                        type="button"
                        onClick={() => setActiveDetailsPanel('requests')}
                        className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        {metrics?.blockingRequestsCount ?? 0} requests
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
                            {staff.status.replace('-', ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                    <h2 className="mb-2 text-lg font-semibold text-rose-800">Medicines to Purchase</h2>
                    <div className="space-y-2">
                      {(metrics?.lowStockMedicines ?? []).length === 0 ? (
                        <p className="text-sm text-rose-700">No low-stock medicines right now.</p>
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
                </div>
              </section>

              {loadingMetrics && (
                <p className="text-sm text-slate-500">Refreshing dashboard data...</p>
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

  if (role === 'dentist') {
    return (
      <>
        <div className="h-dvh overflow-hidden bg-[#f4f6f8] text-slate-700">
          <ClinicPortalShell
            brandTitle="Clinic Management"
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
                  <h1 className="text-3xl font-semibold text-slate-800">{t('ourServices')}</h1>
                  <p className="mt-1 text-sm text-slate-500">Open any section from the sidebar or the shortcuts below.</p>
                </section>
                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {DENTIST_PORTAL_MENU.filter((item) => item.path !== '/dashboard').map((item) => (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => navigate(item.path)}
                      className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm ring-1 ring-slate-100 transition hover:border-[#0066A6]/30 hover:shadow-md"
                    >
                      <item.icon className="h-8 w-8 shrink-0 text-[#0066A6]" />
                      <span className="text-lg font-semibold text-slate-800">{item.label}</span>
                    </button>
                  ))}
                </section>
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
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-blue-50">
      <Header />
      
      <main className="min-h-0 flex-1 overflow-y-auto max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-800 mb-3">{t('ourServices')}</h1>
          <div className="w-20 h-1 bg-teal-500 mx-auto"></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-12 px-8">
          {services.map((service) => (
            <div
              key={service.nameKey}
              onClick={() => navigate(service.path)}
              className="flex flex-col items-center cursor-pointer group"
            >
              <div className="w-48 h-48 mb-6 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                <img
                  src={service.image}
                  alt={t(service.nameKey)}
                  className="w-full h-full object-contain"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    transform:
                      service.nameKey === 'treatments'
                        ? 'scale(1.3)'
                        : service.nameKey === 'patients'
                          ? 'scale(0.8)'
                          : 'scale(1)',
                  }}
                />
              </div>
              <h3 className="text-xl font-bold text-teal-700 uppercase tracking-wide">
                {t(service.nameKey)}
              </h3>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

