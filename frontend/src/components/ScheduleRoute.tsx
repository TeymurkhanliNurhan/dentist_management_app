import { isPatientSession } from '../lib/patientSession';
import { StaffRouteGuard } from './RouteGuards';
import Schedule from './Schedule';
import PatientSchedule from './PatientSchedule';

export function ScheduleRoute() {
  if (isPatientSession()) {
    return <PatientSchedule />;
  }
  return (
    <StaffRouteGuard>
      <Schedule />
    </StaffRouteGuard>
  );
}
