import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { getAuthToken } from './api/client';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import ResetPin from './pages/ResetPin';
import Dashboard from './pages/Dashboard';
import Layout from './components/Layout';
import NewGirvi from './pages/NewGirvi';
import Ledger from './pages/Ledger';
import RePledge from './pages/RePledge';
import SystemLogs from './pages/SystemLogs';
import Settings from './pages/Settings';
import PrintBill from './pages/PrintBill';

const PrivateRoute = ({ children }) => {
  const token = getAuthToken();
  return token ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/reset-pin" element={<ResetPin />} />
          <Route 
            path="/" 
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="girvi/new" element={<NewGirvi />} />
            <Route path="ledger" element={<Ledger />} />
            <Route path="re-pledge" element={<RePledge />} />
            <Route path="logs" element={<SystemLogs />} />
            <Route path="settings" element={<Settings />} />
            <Route path="girvi/:id/print" element={<PrintBill />} />
          </Route>
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
