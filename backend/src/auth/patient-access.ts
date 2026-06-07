import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { isPatientRole } from './role-guards';

export type StaffAuthContext = {
  kind: 'staff';
  dentistId: number;
  role: string;
};

export type PatientAuthContext = {
  kind: 'patient';
  patientId: number;
  clinicId: number;
  role: 'patient';
};

export type AuthContext = StaffAuthContext | PatientAuthContext;

export function resolveStaffDentistId(user: any): number {
  const raw = user?.userId ?? user?.sub ?? user?.dentistId;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return raw;
  }
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function resolveAuthContext(user: any): AuthContext {
  if (isPatientRole(user?.role)) {
    const patientId = Number(
      user?.patientId ?? user?.patient_id ?? user?.userId ?? user?.sub,
    );
    const clinicId = Number(user?.clinicId ?? user?.clinic_id);
    if (!Number.isFinite(patientId) || patientId <= 0) {
      throw new UnauthorizedException('Invalid patient context');
    }
    if (!Number.isFinite(clinicId) || clinicId <= 0) {
      throw new UnauthorizedException('Invalid patient clinic context');
    }
    return { kind: 'patient', patientId, clinicId, role: 'patient' };
  }

  const dentistId = resolveStaffDentistId(user);
  if (!dentistId) {
    throw new UnauthorizedException('Invalid dentist context');
  }
  const role = typeof user?.role === 'string' ? user.role : '';
  return { kind: 'staff', dentistId, role };
}

export function assertPatientMutationForbidden(role: unknown): void {
  if (isPatientRole(role)) {
    throw new ForbiddenException('Patients have read-only access');
  }
}

export function requireStaffContext(context: AuthContext): StaffAuthContext {
  if (context.kind !== 'staff') {
    throw new ForbiddenException('Patients have read-only access');
  }
  return context;
}

export function assertPatientOwnsPatientId(
  context: AuthContext,
  requestedPatientId: number | undefined,
): void {
  if (context.kind !== 'patient') {
    return;
  }
  if (
    requestedPatientId !== undefined &&
    requestedPatientId !== context.patientId
  ) {
    throw new ForbiddenException('Access denied');
  }
}

export async function assertPatientOwnsToothTreatment(
  context: AuthContext,
  toothTreatmentId: number | undefined,
  verifyOwnership: (
    patientId: number,
    clinicId: number,
    toothTreatmentId: number,
  ) => Promise<boolean>,
): Promise<void> {
  if (context.kind !== 'patient' || toothTreatmentId === undefined) {
    return;
  }
  const owned = await verifyOwnership(
    context.patientId,
    context.clinicId,
    toothTreatmentId,
  );
  if (!owned) {
    throw new ForbiddenException('Access denied');
  }
}
