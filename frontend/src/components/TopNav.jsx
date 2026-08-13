import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, LogOut, UserCircle } from 'lucide-react';

export default function TopNav() {
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('girvi_token');
    navigate('/login');
  };

  return (
    <header className="topnav">
      <div className="search-container" style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-full)', padding: '0.5rem 1rem', width: '400px', border: '1px solid var(--border)' }}>
        <Search size={18} color="var(--text-muted)" style={{ marginRight: '0.5rem' }} />
        <input 
          type="text" 
          placeholder="Search by number, name or mobile..." 
          style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.875rem' }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontWeight: '600', fontSize: '0.875rem', color: 'var(--text-main)' }}>
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {time.toLocaleDateString([], { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '1px solid var(--border)', paddingLeft: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
            <UserCircle size={24} color="var(--primary)" />
            <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>Admin User</span>
          </div>
          <button 
            onClick={handleLogout}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--danger)', fontSize: '0.875rem', fontWeight: '500' }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
