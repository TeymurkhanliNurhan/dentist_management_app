import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import SignUp from './components/SignUp';
import Dashboard from './components/Dashboard';
import MainBoard from './components/MainBoard';
import Finance from './components/Finance';
import CourseOfTreatments from './components/CourseOfTreatments';
import AppointmentDetail from './components/AppointmentDetail';
import Patients from './components/Patients';
import PatientDetail from './components/PatientDetail';
import ToothDetail from './components/ToothDetail';
import Medicines from './components/Medicines';
import Treatments from './components/Treatments';
import Schedule from './components/Schedule';
import Contact from './components/Contact';
import Settings from './components/Settings';
import ClinicStaffDirectory from './components/ClinicStaffDirectory';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/main" element={<MainBoard />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/course-of-treatments" element={<CourseOfTreatments />} />
        <Route path="/appointments/:id" element={<AppointmentDetail />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/patients/:id" element={<PatientDetail />} />
        <Route path="/patients/:patientId/teeth/:toothId" element={<ToothDetail />} />
        <Route path="/medicines" element={<Medicines />} />
        <Route path="/treatments" element={<Treatments />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/staff" element={<ClinicStaffDirectory />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Router>
  );
}

export default App;
