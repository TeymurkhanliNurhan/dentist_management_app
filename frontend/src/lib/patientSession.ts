const PATIENT_ROLE = 'patient';

function parseStoredId(key: string): number | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function getSessionRole(): string | null {
  return localStorage.getItem('role');
}

export function isPatientSession(): boolean {
  return (getSessionRole() ?? '').toLowerCase() === PATIENT_ROLE;
}

export function getPatientId(): number | null {
  return parseStoredId('patientId');
}

export function getClinicId(): number | null {
  return parseStoredId('clinicId');
}

export function isStaffSession(): boolean {
  const token = localStorage.getItem('access_token');
  if (!token) return false;
  return !isPatientSession();
}

export function getPatientHomePath(): string | null {
  const patientId = getPatientId();
  return patientId ? `/patients/${patientId}` : null;
}

export function patientOwnsRecordId(recordId: number | string | null | undefined): boolean {
  if (!isPatientSession()) return true;
  const ownId = getPatientId();
  if (!ownId || recordId == null) return false;
  const requested = typeof recordId === 'number' ? recordId : parseInt(String(recordId), 10);
  return Number.isFinite(requested) && requested === ownId;
}
