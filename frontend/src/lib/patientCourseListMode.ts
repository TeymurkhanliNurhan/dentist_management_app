export type PatientCourseListMode = 'open' | 'past' | 'all';

const STORAGE_KEY = 'patientCourseListMode';

export function getStoredPatientCourseListMode(): PatientCourseListMode {
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (stored === 'open' || stored === 'past' || stored === 'all') return stored;
  return 'all';
}

export function storePatientCourseListMode(mode: PatientCourseListMode): void {
  sessionStorage.setItem(STORAGE_KEY, mode);
}
