import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import SignUp from './components/SignUp';
import Dashboard from './components/Dashboard';
import MainBoard from './components/MainBoard';
import Appointments from './components/Appointments';
import AppointmentDetail from './components/AppointmentDetail';
import Patients from './components/Patients';
import PatientDetail from './components/PatientDetail';
import ToothDetail from './components/ToothDetail';
import Medicines from './components/Medicines';
import Treatments from './components/Treatments';
import Contact from './components/Contact';
import Settings from './components/Settings';
import ProtectedRoute from './components/ProtectedRoute';
import PaymentRequired from './components/PaymentRequired';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/main" element={<ProtectedRoute><MainBoard /></ProtectedRoute>} />
        <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
        <Route path="/appointments/:id" element={<ProtectedRoute><AppointmentDetail /></ProtectedRoute>} />
        <Route path="/patients" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
        <Route path="/patients/:id" element={<ProtectedRoute><PatientDetail /></ProtectedRoute>} />
        <Route path="/patients/:patientId/teeth/:toothId" element={<ProtectedRoute><ToothDetail /></ProtectedRoute>} />
        <Route path="/medicines" element={<ProtectedRoute><Medicines /></ProtectedRoute>} />
        <Route path="/treatments" element={<ProtectedRoute><Treatments /></ProtectedRoute>} />
        <Route path="/contact" element={<ProtectedRoute><Contact /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/payment" element={<ProtectedRoute><PaymentRequired /></ProtectedRoute>} />
        <Route path="/subscription/success" element={<ProtectedRoute><PaymentRequired /></ProtectedRoute>} />
        <Route path="/subscription/cancel" element={<ProtectedRoute><PaymentRequired /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
