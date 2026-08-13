import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { getAuthToken } from './api/client';
import Login from './pages/Login';
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
