import { isPatientSession } from '../lib/patientSession';
import PatientTreatments from './PatientTreatments';
import Treatments from './Treatments';
import { StaffRouteGuard } from './RouteGuards';

export function TreatmentsRoute() {
  if (isPatientSession()) {
    return <PatientTreatments />;
  }
  return (
    <StaffRouteGuard>
      <Treatments />
    </StaffRouteGuard>
  );
}
