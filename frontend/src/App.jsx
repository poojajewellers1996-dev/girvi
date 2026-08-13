import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { getAuthToken } from './api/client';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import ResetPin from './pages/ResetPin';
import Dashboard from './pages/Dashboard';
import Navbar from './components/Navbar';

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
                <>
                  <Navbar />
                  <Dashboard />
                </>
              </PrivateRoute>
            } 
          />
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
