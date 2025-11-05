import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import SignUp from './components/SignUp';
import Dashboard from './components/Dashboard';
import MainBoard from './components/MainBoard';
import Patients from './components/Patients';
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
        
      </Routes>
    </Router>
  );
}

export default App;
