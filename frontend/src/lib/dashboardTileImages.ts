/**
 * Dashboard service-tile artwork. Files live in `frontend/public/images`
 * and are served at `/images/<filename>`.
 */
export const DASHBOARD_TILE_IMAGES = {
  appointments: '/images/appointment_logo-removebg-preview.png',
  patients: '/images/patient_logo-removebg-preview.png',
  treatments: '/images/treatment_logo-removebg-preview.png',
  medicines: '/images/medicine_logo-removebg-preview.png',
  schedule: '/images/schedule.png',
} as const;

export type DashboardTileKey = keyof typeof DASHBOARD_TILE_IMAGES;
