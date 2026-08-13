import { useNavigate } from 'react-router-dom';
import { setAuthToken } from '../api/client';
import { LogOut, Diamond } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    setAuthToken(null);
    navigate('/login');
  };

  return (
    <nav className="navbar animate-fade-in">
      <div className="container">
        <div className="brand">
          <Diamond color="var(--primary)" size={28} />
          GirviManager
        </div>
        <div>
          <button className="btn btn-secondary" onClick={handleLogout}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
