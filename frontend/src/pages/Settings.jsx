import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Loader2, Save, Store, MapPin, Phone, Lock, CheckCircle2 } from 'lucide-react';

export default function Settings() {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    pin_code: '',
    mobile: '',
    password: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchCompanyDetails();
  }, []);

  const fetchCompanyDetails = async () => {
    try {
      setLoading(true);
      const data = await api.getCompany();
      setFormData({
        name: data.name || '',
        address: data.address || '',
        pin_code: data.pin_code || '',
        mobile: data.mobile || '',
        password: '' // Don't pre-fill password
      });
    } catch (err) {
      setError(err.message || 'Failed to load shop settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear success message when user starts typing again
    if (success) setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      
      const payload = { ...formData };
      if (!payload.password) {
        delete payload.password; // Don't send empty password
      }
      
      await api.updateCompany(payload);
      setSuccess(true);
      setFormData(prev => ({ ...prev, password: '' })); // Clear password field
      
    } catch (err) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Loader2 className="spin" size={48} style={{ color: 'var(--primary-color)' }} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem' }}>Shop Settings</h2>

      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={20} />
          Settings saved successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Shop Profile Section */}
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Store size={20} />
            Shop Profile
          </h3>
          <div className="grid">
            <div className="form-group">
              <label>Shop Name</label>
              <input 
                type="text" 
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input-field" 
                required
                placeholder="Enter shop name"
              />
            </div>
            <div className="form-group">
              <label>Mobile Number (For Login & Bills)</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                  <Phone size={18} />
                </div>
                <input 
                  type="text" 
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  className="input-field" 
                  required
                  placeholder="e.g. 9876543210"
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Full Address</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: '12px', left: '12px', color: 'var(--text-muted)' }}>
                  <MapPin size={18} />
                </div>
                <textarea 
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="input-field" 
                  rows="3"
                  required
                  placeholder="Enter shop full address"
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </div>
            <div className="form-group">
              <label>PIN Code</label>
              <input 
                type="text" 
                name="pin_code"
                value={formData.pin_code}
                onChange={handleChange}
                className="input-field" 
                required
                placeholder="e.g. 400001"
              />
            </div>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

        {/* Security Section */}
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lock size={20} />
            Security & Login
          </h3>
          <div className="grid">
            <div className="form-group">
              <label>Change Admin Password</label>
              <input 
                type="password" 
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="input-field" 
                placeholder="Leave blank to keep current password"
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Only enter a password if you want to change it. Minimum 6 characters.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem' }}
          >
            {saving ? <Loader2 className="spin" size={20} /> : <Save size={20} />}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

      </form>
    </div>
  );
}
