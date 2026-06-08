import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import SignUp from './components/SignUp';
import PatientLogin from './components/PatientLogin';
import PatientSignUp from './components/PatientSignUp';
import Dashboard from './components/Dashboard';
import MainBoard from './components/MainBoard';
import Finance from './components/Finance';
import { CourseOfTreatmentsDetailRoute, CourseOfTreatmentsRoute } from './components/CourseOfTreatmentsRoutes';
import AppointmentDetail from './components/AppointmentDetail';
import Patients from './components/Patients';
import PatientDetail from './components/PatientDetail';
import ToothDetail from './components/ToothDetail';
import Medicines from './components/Medicines';
import { TreatmentsRoute } from './components/TreatmentsRoute';
import { ScheduleRoute } from './components/ScheduleRoute';
import Contact from './components/Contact';
import Settings from './components/Settings';
import ClinicStaffDirectory from './components/ClinicStaffDirectory';
import { PatientAuthRedirect, PatientRecordGuard, StaffRouteGuard } from './components/RouteGuards';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route
          path="/patient/login"
          element={
            <PatientAuthRedirect>
              <PatientLogin />
            </PatientAuthRedirect>
          }
        />
        <Route
          path="/patient/signup"
          element={
            <PatientAuthRedirect>
              <PatientSignUp />
            </PatientAuthRedirect>
          }
        />
        <Route
          path="/dashboard"
          element={
            <StaffRouteGuard>
              <Dashboard />
            </StaffRouteGuard>
          }
        />
        <Route
          path="/main"
          element={
            <StaffRouteGuard>
              <MainBoard />
            </StaffRouteGuard>
          }
        />
        <Route
          path="/finance"
          element={
            <StaffRouteGuard>
              <Finance />
            </StaffRouteGuard>
          }
        />
        <Route path="/course-of-treatments" element={<CourseOfTreatmentsRoute />} />
        <Route path="/course-of-treatments/:id" element={<CourseOfTreatmentsDetailRoute />} />
        <Route
          path="/appointments/:id"
          element={
            <StaffRouteGuard>
              <AppointmentDetail />
            </StaffRouteGuard>
          }
        />
        <Route
          path="/patients"
          element={
            <StaffRouteGuard>
              <Patients />
            </StaffRouteGuard>
          }
        />
        <Route
          path="/patients/:id"
          element={
            <PatientRecordGuard>
              <PatientDetail />
            </PatientRecordGuard>
          }
        />
        <Route
          path="/patients/:patientId/teeth/:toothId"
          element={
            <PatientRecordGuard>
              <ToothDetail />
            </PatientRecordGuard>
          }
        />
        <Route
          path="/medicines"
          element={
            <StaffRouteGuard>
              <Medicines />
            </StaffRouteGuard>
          }
        />
        <Route path="/treatments" element={<TreatmentsRoute />} />
        <Route path="/schedule" element={<ScheduleRoute />} />
        <Route
          path="/contact"
          element={
            <StaffRouteGuard>
              <Contact />
            </StaffRouteGuard>
          }
        />
        <Route
          path="/staff"
          element={
            <StaffRouteGuard>
              <ClinicStaffDirectory />
            </StaffRouteGuard>
          }
        />
        <Route
          path="/settings"
          element={
            <StaffRouteGuard>
              <Settings />
            </StaffRouteGuard>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
