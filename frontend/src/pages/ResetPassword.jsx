import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { KeyRound, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: request OTP, 2: verify OTP
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.requestPasswordReset({ phone, code: '' });
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.verifyOtp({ phone, code }, newPassword);
      setStep(3); // success
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--background)' }}>
      <div className="card animate-fade-in" style={{ maxWidth: '400px', width: '100%', margin: '1rem' }}>
        
        <div className="text-center mb-6">
          <div style={{ display: 'inline-flex', padding: '1rem', backgroundColor: 'var(--primary-light)', borderRadius: '50%', marginBottom: '1rem' }}>
            <KeyRound color="var(--primary)" size={32} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Reset Password</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {step === 1 ? "Enter your mobile to receive an OTP" : step === 2 ? "Enter the OTP sent to your mobile" : "Password Reset Successfully"}
          </p>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleRequestOtp}>
            <div className="input-group">
              <label className="input-label">Mobile Number</label>
              <input type="text" className="input-field" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" />
            </div>
            <button type="submit" className="btn btn-primary btn-full mt-4" disabled={loading}>
              {loading ? 'Sending...' : 'Send OTP via WhatsApp'} <ArrowRight size={18} />
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp}>
            <div className="input-group">
              <label className="input-label">OTP Code</label>
              <input type="text" className="input-field" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
            </div>
            <div className="input-group">
              <label className="input-label">New Password</label>
              <input type="password" className="input-field" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <button type="submit" className="btn btn-primary btn-full mt-4" disabled={loading}>
              {loading ? 'Verifying...' : 'Reset Password'} <ArrowRight size={18} />
            </button>
          </form>
        )}

        {step === 3 && (
          <div className="text-center animate-fade-in">
            <CheckCircle2 color="var(--secondary)" size={48} style={{ margin: '0 auto 1rem' }} />
            <p className="mb-6">Your password has been reset successfully. You can now login with your new password.</p>
            <button className="btn btn-primary btn-full" onClick={() => navigate('/login')}>
              Go to Login
            </button>
          </div>
        )}

        {step !== 3 && (
          <div className="mt-6 text-center" style={{ fontSize: '0.875rem' }}>
            <Link to="/login" style={{ fontWeight: '600' }}>Back to Login</Link>
          </div>
        )}

      </div>
    </div>
  );
}
