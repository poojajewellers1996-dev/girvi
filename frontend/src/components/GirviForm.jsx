import { useState } from 'react';
import { api } from '../api/client';
import { X, Save } from 'lucide-react';

export default function GirviForm({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_mobile: '',
    item_description: '',
    principal_amount: '',
    interest_rate_monthly: '',
    metal_type: 'gold', // or silver, etc based on schema
    weight_grams: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Convert numeric fields
      const payload = {
        ...formData,
        principal_amount: parseFloat(formData.principal_amount),
        interest_rate_monthly: parseFloat(formData.interest_rate_monthly),
        weight_grams: parseFloat(formData.weight_grams)
      };
      
      await api.createGirvi(payload);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to create Girvi record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        
        <div className="flex justify-between items-center mb-6">
          <h2 style={{ margin: 0 }}>Create New Girvi</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={24} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="flex gap-4">
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Customer Name</label>
              <input type="text" name="customer_name" className="input-field" required value={formData.customer_name} onChange={handleChange} />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Mobile Number</label>
              <input type="text" name="customer_mobile" className="input-field" required value={formData.customer_mobile} onChange={handleChange} />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Item Description (e.g. Gold Ring, Chain)</label>
            <input type="text" name="item_description" className="input-field" required value={formData.item_description} onChange={handleChange} />
          </div>

          <div className="flex gap-4">
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Metal Type</label>
              <select name="metal_type" className="input-field" value={formData.metal_type} onChange={handleChange}>
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Weight (grams)</label>
              <input type="number" step="0.01" name="weight_grams" className="input-field" required value={formData.weight_grams} onChange={handleChange} />
            </div>
          </div>

          <div className="flex gap-4">
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Principal Amount (₹)</label>
              <input type="number" name="principal_amount" className="input-field" required value={formData.principal_amount} onChange={handleChange} />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Interest Rate (% per month)</label>
              <input type="number" step="0.01" name="interest_rate_monthly" className="input-field" required value={formData.interest_rate_monthly} onChange={handleChange} />
            </div>
          </div>

          <div className="flex justify-between mt-6 gap-4">
            <button type="button" className="btn btn-secondary btn-full" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              <Save size={18} />
              {loading ? 'Saving...' : 'Save Girvi'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
