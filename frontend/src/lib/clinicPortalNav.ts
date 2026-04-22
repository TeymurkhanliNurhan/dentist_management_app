import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  CalendarDays,
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
};

export const DIRECTOR_PORTAL_MENU: ClinicPortalMenuItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Patients', icon: UserRound, path: '/patients' },
  { label: 'Schedule', icon: CalendarDays, path: '/schedule' },
  { label: 'Treatments', icon: Activity, path: '/treatments' },
  { label: 'Inventory', icon: Package, path: '/medicines' },
  { label: 'Staff', icon: Users, path: '/staff' },
  { label: 'Finance', icon: Wallet, path: '/finance' },
];

export function isDirectorPortalNavActive(itemPath: string, pathname: string): boolean {
  if (itemPath === '/dashboard') return pathname === '/dashboard';
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}
