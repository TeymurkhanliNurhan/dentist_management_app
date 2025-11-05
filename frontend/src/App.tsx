import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import SignUp from './components/SignUp';
import Dashboard from './components/Dashboard';
import MainBoard from './components/MainBoard';
import Patients from './components/Patients';
import Medicines from './components/Medicines';
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
        <Route path="/patients" element={<Patients />} />
        <Route path="/medicines" element={<Medicines />} />
        
      </Routes>
    </Router>
  );
}

export default App;
