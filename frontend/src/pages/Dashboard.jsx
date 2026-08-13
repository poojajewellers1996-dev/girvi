import { useState, useEffect } from 'react';
import { api } from '../api/client';
import GirviForm from '../components/GirviForm';
import { Plus, Search, Loader, RefreshCw } from 'lucide-react';

export default function Dashboard() {
  const [girvis, setGirvis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');

  const fetchGirvis = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getGirvis();
      setGirvis(data || []);
    } catch (err) {
      setError('Failed to fetch Girvi records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGirvis();
  }, []);

  const handleSuccess = () => {
    setShowForm(false);
    fetchGirvis();
  };

  const filteredGirvis = girvis.filter(g => 
    (g.customer_name?.toLowerCase() || '').includes(search.toLowerCase()) || 
    (g.customer_mobile || '').includes(search)
  );

  return (
    <div className="container mt-6">
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2>Dashboard</h2>
          <p style={{ color: 'var(--text-muted)' }}>Manage your active girvi records</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={18} />
          New Girvi
        </button>
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-4 gap-4">
          <div className="input-group" style={{ margin: 0, flex: 1, maxWidth: '400px' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: '10px', left: '10px', color: 'var(--text-muted)' }}>
                <Search size={18} />
              </div>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Search by name or mobile..."
                style={{ paddingLeft: '2.5rem', width: '100%' }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          <button className="btn btn-secondary" onClick={fetchGirvis} disabled={loading}>
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>ID / Pledge #</th>
                <th>Customer Name</th>
                <th>Mobile</th>
                <th>Item</th>
                <th>Principal (₹)</th>
                <th>Interest Rate</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && girvis.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center" style={{ padding: '3rem' }}>
                    <Loader className="animate-spin" style={{ display: 'inline' }} />
                    <p className="mt-4" style={{ color: 'var(--text-muted)' }}>Loading records...</p>
                  </td>
                </tr>
              ) : filteredGirvis.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center" style={{ padding: '3rem' }}>
                    <p style={{ color: 'var(--text-muted)' }}>No records found</p>
                  </td>
                </tr>
              ) : (
                filteredGirvis.map(g => (
                  <tr key={g.id}>
                    <td>
                      <span className="counter" style={{ fontSize: '0.875rem' }}>#{g.pledge_no || g.id}</span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{g.customer_name}</td>
                    <td>{g.customer_mobile}</td>
                    <td>
                      <div>{g.item_description}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {g.weight_grams}g • {g.metal_type}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>₹{g.principal_amount}</td>
                    <td>{g.interest_rate_monthly}% /mo</td>
                    <td>{new Date(g.created_at).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${g.status === 'active' ? 'badge-active' : 'badge-closed'}`}>
                        {g.status?.toUpperCase() || 'ACTIVE'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <GirviForm onClose={() => setShowForm(false)} onSuccess={handleSuccess} />
      )}
      
    </div>
  );
}
