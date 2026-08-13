import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Loader2, Calendar } from 'lucide-react';

export default function ExistingGirvi() {
  const [girvis, setGirvis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchGirvis();
  }, []);

  const fetchGirvis = async () => {
    try {
      setLoading(true);
      const data = await api.getGirvis();
      setGirvis(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch Girvis');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Loader2 className="spin" size={48} style={{ color: 'var(--primary-color)' }} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>Existing Girvi</h2>
        <button 
          className="btn btn-primary" 
          onClick={() => navigate('/girvi/new')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={18} /> New Girvi
        </button>
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
              <tr>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Pledge No</th>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Customer</th>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Dates</th>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Total Value</th>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Loan Amount</th>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Items</th>
                <th style={{ padding: '1rem', fontWeight: '600', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {girvis.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No records found. Click "New Girvi" to create one.
                  </td>
                </tr>
              ) : (
                girvis.map((girvi) => (
                  <tr key={girvi.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '1rem', fontWeight: '500' }}>{girvi.pledge_no}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: '500' }}>{girvi.customer_name}</div>
                      {girvi.mobile_number && <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{girvi.mobile_number}</div>}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                        <Calendar size={14} color="var(--text-muted)" />
                        <span style={{ color: 'var(--text-muted)' }}>Pledge:</span> {formatDate(girvi.pledge_date)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        <Calendar size={14} color="rgb(239, 68, 68)" />
                        <span style={{ color: 'rgb(239, 68, 68)' }}>Due:</span> {formatDate(girvi.due_date)}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>₹{girvi.present_value?.toLocaleString('en-IN') || 0}</td>
                    <td style={{ padding: '1rem', fontWeight: '600', color: 'var(--primary-color)' }}>₹{girvi.loan_amount?.toLocaleString('en-IN') || 0}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ display: 'inline-block', padding: '0.25rem 0.5rem', backgroundColor: 'var(--bg-primary)', borderRadius: '4px', fontSize: '0.875rem' }}>
                        {girvi.articles?.length || 0} items
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.5rem' }} title="View Details">
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
