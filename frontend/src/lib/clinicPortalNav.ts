import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  Package,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';

export type ClinicPortalMenuItem = {
  label: string;
  icon: LucideIcon;
  path: string;
  notificationCount?: number;
};

export const DIRECTOR_PORTAL_MENU: ClinicPortalMenuItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Patients', icon: UserRound, path: '/patients' },
  { label: 'Schedule', icon: CalendarDays, path: '/schedule' },
  { label: 'Treatments', icon: Activity, path: '/treatments' },
  { label: 'Course of Treatments', icon: ClipboardList, path: '/course-of-treatments' },
  { label: 'Inventory', icon: Package, path: '/medicines' },
  { label: 'Staff', icon: Users, path: '/staff' },
  { label: 'Finance', icon: Wallet, path: '/finance' },
];

/** Dentist portal: same clinic shell as director, without admin-only areas. */
export const DENTIST_PORTAL_MENU: ClinicPortalMenuItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Patients', icon: UserRound, path: '/patients' },
  { label: 'Schedule', icon: CalendarDays, path: '/schedule' },
  { label: 'Treatments', icon: Activity, path: '/treatments' },
  { label: 'Course of Treatments', icon: ClipboardList, path: '/course-of-treatments' },
  { label: 'Inventory', icon: Package, path: '/medicines' },
];

export function isDirectorPortalNavActive(itemPath: string, pathname: string): boolean {
  if (itemPath === '/dashboard') return pathname === '/dashboard';
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}
