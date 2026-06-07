import type { ReactNode } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { getPatientHomePath, getPatientId, isPatientSession } from '../lib/patientSession';

export function StaffRouteGuard({ children }: { children: ReactNode }) {
  if (isPatientSession()) {
    const home = getPatientHomePath();
    if (home) return <Navigate to={home} replace />;
    return <Navigate to="/patient/login" replace />;
  }
  return children;
}

export function PatientRecordGuard({ children }: { children: ReactNode }) {
  const params = useParams();
  const ownId = getPatientId();
  const routePatientId = params.id ?? params.patientId;

  if (isPatientSession() && ownId && routePatientId) {
    const requested = parseInt(routePatientId, 10);
    if (!Number.isFinite(requested) || requested !== ownId) {
      return <Navigate to={`/patients/${ownId}`} replace />;
    }
  }

  return children;
}

export function PatientAuthRedirect({ children }: { children: ReactNode }) {
  if (isPatientSession()) {
    const home = getPatientHomePath();
    if (home) return <Navigate to={home} replace />;
  }
  return children;
}
