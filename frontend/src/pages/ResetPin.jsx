import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { KeySquare, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function ResetPin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    new_pin: ''
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.resetPin(formData.username, formData.new_pin, formData.password);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to reset PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--background)' }}>
      <div className="card animate-fade-in" style={{ maxWidth: '400px', width: '100%', margin: '1rem' }}>
        
        <div className="text-center mb-6">
          <div style={{ display: 'inline-flex', padding: '1rem', backgroundColor: 'var(--primary-light)', borderRadius: '50%', marginBottom: '1rem' }}>
            <KeySquare color="var(--primary)" size={32} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Reset PIN</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {success ? "PIN Reset Successfully" : "Enter your mobile and current password to set a new PIN"}
          </p>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {!success ? (
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label">Mobile Number</label>
              <input type="text" name="username" className="input-field" required value={formData.username} onChange={handleChange} placeholder="9876543210" />
            </div>
            
            <div className="input-group">
              <label className="input-label">Current Password</label>
              <input type="password" name="password" className="input-field" required value={formData.password} onChange={handleChange} placeholder="••••••••" />
            </div>

            <div className="input-group">
              <label className="input-label">New PIN (4-6 digits)</label>
              <input 
                type="password" 
                name="new_pin" 
                inputMode="numeric" 
                pattern="[0-9]{4,6}" 
                className="input-field" 
                required 
                value={formData.new_pin} 
                onChange={handleChange} 
                placeholder="••••"
                style={{ letterSpacing: '0.5rem', fontSize: '1.25rem' }} 
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full mt-4" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset PIN'} <ArrowRight size={18} />
            </button>
          </form>
        ) : (
          <div className="text-center animate-fade-in">
            <CheckCircle2 color="var(--secondary)" size={48} style={{ margin: '0 auto 1rem' }} />
            <p className="mb-6">Your PIN has been reset successfully. You can now login with your new PIN.</p>
            <button className="btn btn-primary btn-full" onClick={() => navigate('/login')}>
              Go to Login
            </button>
          </div>
        )}

        {!success && (
          <div className="mt-6 text-center" style={{ fontSize: '0.875rem' }}>
            <Link to="/login" style={{ fontWeight: '600' }}>Back to Login</Link>
          </div>
        )}

      </div>
    </div>
  );
}
