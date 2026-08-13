import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Building2, UserPlus, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Send OTP to Admin, 2: Verify OTP, 3: Register Form
  const [adminMobile, setAdminMobile] = useState('');
  const [otpCode, setOtpCode] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    mobile: '', // Business Mobile
    password: '',
    pin: ''
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.sendRegistrationOtp(adminMobile);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to send OTP to admin');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.verifyRegistrationOtp(adminMobile, otpCode);
      setStep(3);
    } catch (err) {
      setError(err.message || 'Admin OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = { ...formData, pin_code: '000000' };
      await api.registerCompany(payload);
      navigate('/login?registered=true');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--background)', padding: '2rem' }}>
      <div className="card animate-fade-in" style={{ maxWidth: '500px', width: '100%' }}>
        <div className="text-center mb-6">
          <div style={{ display: 'inline-flex', padding: '1rem', backgroundColor: 'var(--primary-light)', borderRadius: '50%', marginBottom: '1rem' }}>
            {step < 3 ? <ShieldCheck color="var(--primary)" size={32} /> : <Building2 color="var(--primary)" size={32} />}
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>{step < 3 ? "Admin Verification" : "Register Company"}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {step === 1 && "Step 1: Enter the Super Admin's mobile number"}
            {step === 2 && "Step 2: Enter the OTP sent to the Admin"}
            {step === 3 && "Step 3: Enter the new Business details"}
          </p>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleSendOtp} className="animate-fade-in">
            <div className="input-group">
              <label className="input-label">Admin Mobile Number</label>
              <input type="text" className="input-field" required value={adminMobile} onChange={(e) => setAdminMobile(e.target.value)} placeholder="Enter admin mobile number" />
            </div>
            <button type="submit" className="btn btn-primary btn-full mt-4" disabled={loading}>
              {loading ? 'Sending...' : 'Request Admin Approval'} <ArrowRight size={18} />
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="animate-fade-in">
            <div className="input-group">
              <label className="input-label">Admin OTP Code</label>
              <input type="text" className="input-field" required value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="123456" />
            </div>
            <button type="submit" className="btn btn-primary btn-full mt-4" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify Admin OTP'} <CheckCircle2 size={18} />
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleRegister} className="animate-fade-in">
            <div className="input-group">
              <label className="input-label">Company Name</label>
              <input type="text" name="name" className="input-field" required value={formData.name} onChange={handleChange} placeholder="Pooja Jewellers" />
            </div>
            
            <div className="input-group">
              <label className="input-label">Address</label>
              <input type="text" name="address" className="input-field" required value={formData.address} onChange={handleChange} placeholder="123 Main St, City" />
            </div>

            <div className="input-group">
              <label className="input-label">Business Mobile Number (Username)</label>
              <input type="text" name="mobile" className="input-field" required value={formData.mobile} onChange={handleChange} placeholder="9876543210" />
            </div>

            <div className="flex gap-4">
              <div className="input-group" style={{ flex: 1 }}>
                <label className="input-label">Admin Password</label>
                <input type="password" name="password" className="input-field" required value={formData.password} onChange={handleChange} placeholder="••••••••" />
              </div>
              
              <div className="input-group" style={{ flex: 1 }}>
                <label className="input-label">Admin PIN (4-6 digits)</label>
                <input type="password" name="pin" inputMode="numeric" pattern="[0-9]{4,6}" className="input-field" required value={formData.pin} onChange={handleChange} placeholder="••••" />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-full mt-4" disabled={loading}>
              <UserPlus size={18} />
              {loading ? 'Registering...' : 'Create Account'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center" style={{ fontSize: '0.875rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Already have an account? </span>
          <Link to="/login" style={{ fontWeight: '600' }}>Sign In here</Link>
        </div>

      </div>
    </div>
  );
}
