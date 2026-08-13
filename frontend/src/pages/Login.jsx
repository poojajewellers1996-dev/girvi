import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, setAuthToken } from '../api/client';
import { Diamond, LogIn } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [loginMode, setLoginMode] = useState('password'); // 'password' or 'pin'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = { username };
      if (loginMode === 'password') {
        payload.password = password;
      } else {
        payload.pin = pin;
      }
      
      const res = await api.login(payload);
      if (res.access_token) {
        setAuthToken(res.access_token);
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--background)' }}>
      <div className="card animate-fade-in" style={{ maxWidth: '400px', width: '100%', margin: '1rem' }}>
        <div className="text-center mb-6">
          <div style={{ display: 'inline-flex', padding: '1rem', backgroundColor: 'var(--primary-light)', borderRadius: '50%', marginBottom: '1rem' }}>
            <Diamond color="var(--primary)" size={32} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Welcome Back</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Enter your credentials to manage girvis</p>
        </div>

        <div className="flex gap-2 mb-6 p-1" style={{ backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--radius-md)' }}>
          <button 
            type="button"
            className={`btn btn-full ${loginMode === 'password' ? 'btn-primary' : ''}`}
            style={loginMode !== 'password' ? { backgroundColor: 'transparent', boxShadow: 'none', color: 'var(--text-main)' } : {}}
            onClick={() => { setLoginMode('password'); setError(''); }}
          >
            Password
          </button>
          <button 
            type="button"
            className={`btn btn-full ${loginMode === 'pin' ? 'btn-primary' : ''}`}
            style={loginMode !== 'pin' ? { backgroundColor: 'transparent', boxShadow: 'none', color: 'var(--text-main)' } : {}}
            onClick={() => { setLoginMode('pin'); setError(''); }}
          >
            PIN
          </button>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label" htmlFor="username">Username / Mobile</label>
            <input
              id="username"
              type="text"
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your registered mobile"
              required
            />
          </div>

          {loginMode === 'password' ? (
            <div className="input-group mb-1">
              <label className="input-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
          ) : (
            <div className="input-group mb-1">
              <label className="input-label" htmlFor="pin">PIN</label>
              <input
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                className="input-field"
                style={{ letterSpacing: '0.5rem', textAlign: 'center', fontSize: '1.25rem' }}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                required
              />
            </div>
          )}

          <div className="flex justify-between items-center mb-6 px-1">
            <Link to={loginMode === 'password' ? "/reset-password" : "/reset-pin"} style={{ fontSize: '0.875rem' }}>
              Forgot {loginMode === 'password' ? 'Password' : 'PIN'}?
            </Link>
          </div>

          <button type="submit" className="btn btn-primary btn-full mt-2" disabled={loading}>
            <LogIn size={18} />
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center" style={{ fontSize: '0.875rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Don't have an account? </span>
          <Link to="/register" style={{ fontWeight: '600' }}>Register Company</Link>
        </div>

      </div>
    </div>
  );
}
