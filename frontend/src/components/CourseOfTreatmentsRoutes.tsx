import type { ReactNode } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { isPatientSession } from '../lib/patientSession';
import AppointmentDetail from './AppointmentDetail';
import PatientCourseOfTreatments from './PatientCourseOfTreatments';
import CourseOfTreatments from './CourseOfTreatments';
import { StaffRouteGuard } from './RouteGuards';

export function CourseOfTreatmentsRoute() {
  if (isPatientSession()) {
    return <PatientCourseOfTreatments />;
  }
  return (
    <StaffRouteGuard>
      <CourseOfTreatments />
    </StaffRouteGuard>
  );
}

export function CourseOfTreatmentsDetailRoute() {
  if (isPatientSession()) {
    return <AppointmentDetail />;
  }
  return (
    <StaffRouteGuard>
      <StaffCourseDetailRedirect />
    </StaffRouteGuard>
  );
}

function StaffCourseDetailRedirect() {
  const { id } = useParams();
  if (id && /^\d+$/.test(id)) {
    return <Navigate to={`/appointments/${id}`} replace />;
  }
  return <Navigate to="/course-of-treatments" replace />;
}

export function PatientOnlyRoute({ children }: { children: ReactNode }) {
  if (!isPatientSession()) {
    return <Navigate to="/patient/login" replace />;
  }
  return children;
}
