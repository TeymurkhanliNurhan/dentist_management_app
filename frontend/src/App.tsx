import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import SignUp from './components/SignUp';
import Dashboard from './components/Dashboard';
import MainBoard from './components/MainBoard';
import Appointments from './components/Appointments';
import Patients from './components/Patients';
import PatientDetail from './components/PatientDetail';
import ToothDetail from './components/ToothDetail';
import Medicines from './components/Medicines';
import Treatments from './components/Treatments';
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
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/patients/:id" element={<PatientDetail />} />
        <Route path="/patients/:patientId/teeth/:toothId" element={<ToothDetail />} />
        <Route path="/medicines" element={<Medicines />} />
        <Route path="/treatments" element={<Treatments />} />
      </Routes>
    </Router>
  );
}

export default App;
