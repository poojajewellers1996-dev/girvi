import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Loader2, Calendar, Trash2, Edit, Unlock, NotebookTabs, X, Search } from 'lucide-react';
import LedgerModal from '../components/LedgerModal';

export default function Ledger() {
  const [girvis, setGirvis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // New Ledger state
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [activeGirvi, setActiveGirvi] = useState(null);
  
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchGirvis();
  }, []);

  const getStatusColor = (status) => {
    switch(status) {
      case 'Active': return '#10b981';
      case 'Released': return '#8b5cf6';
      default: return 'var(--text-muted)';
    }
  };

  const filteredGirvis = girvis.filter(g => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (g.pledge_no && g.pledge_no.toLowerCase().includes(term)) ||
      (g.customer_name && g.customer_name.toLowerCase().includes(term)) ||
      (g.mobile_number && g.mobile_number.includes(term)) ||
      (g.pledge_date && g.pledge_date.includes(term))
    );
  });

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

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this Girvi?')) return;
    try {
      setActionLoading(true);
      await api.deleteGirvi(id);
      fetchGirvis();
    } catch (err) {
      setError(err.message || 'Failed to delete Girvi');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRelease = async (id) => {
    if (!window.confirm('Are you sure you want to mark this Girvi as Released?')) return;
    try {
      setActionLoading(true);
      await api.releaseGirvi(id);
      fetchGirvis();
    } catch (err) {
      setError(err.message || 'Failed to release Girvi');
    } finally {
      setActionLoading(false);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>Girvi Ledger</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: '250px' }}>
            <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <Search size={18} />
            </div>
            <input 
              type="text" 
              placeholder="Search by name, number, date..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '40px', margin: 0 }}
            />
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/girvi/new')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={20} /> New Girvi
          </button>
        </div>
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
              {filteredGirvis.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {searchTerm ? "No records match your search." : "No records found. Click \"New Girvi\" to create one."}
                  </td>
                </tr>
              ) : (
                filteredGirvis.map((girvi) => (
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
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.5rem', color: 'var(--primary-color)' }} 
                          title="Print/View"
                          onClick={() => navigate(`/girvi/${girvi.id}/print`)}
                          disabled={actionLoading}
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.5rem', color: '#f59e0b' }} 
                          title="Edit"
                          onClick={() => navigate(`/girvi/edit/${girvi.id}`)}
                          disabled={actionLoading}
                        >
                          <Edit size={18} />
                        </button>
                        {girvi.status === 'Active' && (
                          <>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.5rem', color: '#10b981' }} 
                              title="Ledger (Transactions)"
                              onClick={() => { setActiveGirvi(girvi); setShowLedgerModal(true); }}
                              disabled={actionLoading}
                            >
                              <NotebookTabs size={18} />
                            </button>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.5rem', color: '#8b5cf6' }} 
                              title="Release"
                              onClick={() => handleRelease(girvi.id)}
                              disabled={actionLoading}
                            >
                              <Unlock size={18} />
                            </button>
                          </>
                        )}
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.5rem', color: '#ef4444' }} 
                          title="Delete"
                          onClick={() => handleDelete(girvi.id)}
                          disabled={actionLoading}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ledger Modal */}
      {showLedgerModal && activeGirvi && (
        <LedgerModal 
          girvi={activeGirvi} 
          onClose={() => setShowLedgerModal(false)}
          onUpdate={fetchGirvis}
        />
      )}
    </div>
  );
}
