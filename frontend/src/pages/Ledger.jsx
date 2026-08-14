import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Loader2, Search, Plus, Eye, Edit, Trash2, Calendar, NotebookTabs, Unlock, Download, Filter, RotateCcw, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LedgerModal from '../components/LedgerModal';
import ReleaseModal from '../components/ReleaseModal';
import ImageLightbox from '../components/ImageLightbox';
import { exportGirviLedger } from '../utils/exportUtils';

export default function Ledger() {
  const [girvis, setGirvis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [activeGirvi, setActiveGirvi] = useState(null);

  // Release modal state
  const [releaseGirvi, setReleaseGirvi] = useState(null);
  const [releaseLoading, setReleaseLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);
  
  // Search & Advanced Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [metalFilter, setMetalFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Image Lightbox State
  const [lightbox, setLightbox] = useState(null);

  const navigate = useNavigate();

  useEffect(() => { fetchGirvis(); }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return '#10b981';
      case 'Released': return '#8b5cf6';
      default: return 'var(--text-muted)';
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setMetalFilter('ALL');
    setFromDate('');
    setToDate('');
  };

  const filteredGirvis = girvis.filter(g => {
    // 1. Search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const articleNames = g.articles?.map(a => (a.name || '').toLowerCase()).join(' ') || '';
      const matchSearch =
        (g.pledge_no && g.pledge_no.toLowerCase().includes(term)) ||
        (g.customer_name && g.customer_name.toLowerCase().includes(term)) ||
        (g.relation_name && g.relation_name.toLowerCase().includes(term)) ||
        (g.mobile_number && g.mobile_number.includes(term)) ||
        (g.pledge_date && g.pledge_date.includes(term)) ||
        articleNames.includes(term);
      if (!matchSearch) return false;
    }

    // 2. Status filter
    if (statusFilter !== 'ALL' && (g.status || 'Active') !== statusFilter) {
      return false;
    }

    // 3. Metal filter (Gold vs Silver)
    if (metalFilter !== 'ALL') {
      const articleNames = g.articles?.map(a => (a.name || '').toLowerCase()).join(' ') || '';
      const isSilver = articleNames.includes('silver');
      if (metalFilter === 'silver' && !isSilver) return false;
      if (metalFilter === 'gold' && isSilver) return false;
    }

    // 4. Date range filter
    if (fromDate) {
      const pDate = new Date(g.pledge_date);
      const fDate = new Date(fromDate);
      if (pDate < fDate) return false;
    }
    if (toDate) {
      const pDate = new Date(g.pledge_date);
      const tDate = new Date(toDate);
      tDate.setHours(23, 59, 59, 999);
      if (pDate > tDate) return false;
    }

    return true;
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

  const handleReleaseConfirm = async ({ rate, months, interest, total }) => {
    if (!releaseGirvi) return;
    try {
      setReleaseLoading(true);
      await api.releaseGirvi(releaseGirvi.id);
      setReleaseGirvi(null);
      fetchGirvis();
    } catch (err) {
      setError(err.message || 'Failed to release Girvi');
    } finally {
      setReleaseLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
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
      {/* Lightbox Modal */}
      {lightbox && (
        <ImageLightbox
          src={lightbox.src}
          title={lightbox.title}
          onClose={() => setLightbox(null)}
        />
      )}

      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>Girvi Ledger</h2>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.875rem' }}>Manage & track all customer pawn pledges</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => exportGirviLedger(filteredGirvis)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}
            title="Export filtered records to Excel / CSV"
          >
            <Download size={18} color="#10b981" /> Export Excel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => navigate('/girvi/new')} 
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}
          >
            <Plus size={20} /> New Girvi
          </button>
        </div>
      </div>

      {/* Advanced Filters Bar */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <Search size={16} />
            </div>
            <input
              id="ledger_search"
              name="ledger_search"
              type="text"
              placeholder="Search by name, number, date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '36px', margin: 0, fontSize: '0.85rem' }}
            />
          </div>

          {/* Status Filter */}
          <div style={{ flex: '0 1 140px' }}>
            <select
              id="status_filter"
              name="status_filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
              style={{ margin: 0, padding: '0.6rem 0.75rem', fontSize: '0.85rem' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">🟢 Active</option>
              <option value="Released">🟣 Released</option>
            </select>
          </div>

          {/* Metal Filter */}
          <div style={{ flex: '0 1 140px' }}>
            <select
              id="metal_filter"
              name="metal_filter"
              value={metalFilter}
              onChange={(e) => setMetalFilter(e.target.value)}
              className="input-field"
              style={{ margin: 0, padding: '0.6rem 0.75rem', fontSize: '0.85rem' }}
            >
              <option value="ALL">All Metals</option>
              <option value="gold">🥇 Gold Only</option>
              <option value="silver">🥈 Silver Only</option>
            </select>
          </div>

          {/* Date Range: From Date */}
          <div style={{ flex: '0 1 140px' }}>
            <input
              id="from_date"
              name="from_date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="input-field"
              style={{ margin: 0, padding: '0.55rem 0.6rem', fontSize: '0.85rem' }}
              title="From Pledge Date"
            />
          </div>

          {/* Date Range: To Date */}
          <div style={{ flex: '0 1 140px' }}>
            <input
              id="to_date"
              name="to_date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="input-field"
              style={{ margin: 0, padding: '0.55rem 0.6rem', fontSize: '0.85rem' }}
              title="To Pledge Date"
            />
          </div>


          {/* Reset Filters */}
          {(searchTerm || statusFilter !== 'ALL' || metalFilter !== 'ALL' || fromDate || toDate) && (
            <button
              className="btn btn-secondary"
              onClick={handleResetFilters}
              style={{ padding: '0.55rem 0.8rem', fontSize: '0.85rem', color: 'var(--brand-danger)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
              title="Reset all filters"
            >
              <RotateCcw size={14} /> Reset
            </button>
          )}

        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* Main Ledger Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
              <tr>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Pledge No</th>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Customer</th>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Mobile</th>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Item Description</th>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Weight</th>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Dates</th>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Total Value</th>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Loan Amount</th>
                <th style={{ padding: '1rem', fontWeight: '600', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '1rem', fontWeight: '600', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGirvis.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {(searchTerm || statusFilter !== 'ALL' || metalFilter !== 'ALL' || fromDate || toDate) 
                      ? 'No records match your filters.' 
                      : 'No records found. Click "New Girvi" to create one.'}
                  </td>
                </tr>
              ) : (
                filteredGirvis.map((girvi) => (
                  <tr key={girvi.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '1rem', fontWeight: '600' }}>{girvi.pledge_no}</td>
                    
                    {/* Customer Name & Photo Thumbnail */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        {girvi.customer_photo ? (
                          <img
                            src={girvi.customer_photo}
                            alt={girvi.customer_name}
                            style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)', cursor: 'pointer' }}
                            onClick={() => setLightbox({ src: girvi.customer_photo, title: `Customer: ${girvi.customer_name}` })}
                            title="Click to view full photo"
                          />
                        ) : null}
                        <div>
                          <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{girvi.customer_name}</div>
                          {(girvi.relation_type || girvi.relation_name) && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {girvi.relation_type} {girvi.relation_name}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '1rem', fontWeight: '500', whiteSpace: 'nowrap' }}>
                      {girvi.mobile_number ? girvi.mobile_number.replace('+91', '') : '-'}
                    </td>
                    
                    {/* Item Description with Photo Lightbox */}
                    <td style={{ padding: '1rem' }}>
                      {girvi.articles && girvi.articles.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {girvi.articles.map((art, idx) => (
                            <div key={idx} style={{ fontSize: '0.875rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span>{art.name} {art.quantity > 1 ? `(${art.quantity})` : ''}</span>
                              {art.photo_path && (
                                <button
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand-primary)', padding: 0, display: 'inline-flex' }}
                                  onClick={() => setLightbox({ src: art.photo_path, title: `Article: ${art.name}` })}
                                  title="View Article Photo"
                                >
                                  <ImageIcon size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>

                    <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                      {girvi.articles && girvi.articles.length > 0 ? (
                        <>
                          <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                            Net: {girvi.articles.reduce((s, a) => s + (Number(a.net_wt) || 0), 0).toFixed(2)}g
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                            Gross: {girvi.articles.reduce((s, a) => s + (Number(a.gross_wt) || 0), 0).toFixed(2)}g
                          </div>
                        </>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>

                    <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
                        <Calendar size={13} color="var(--text-muted)" />
                        <span style={{ color: 'var(--text-muted)' }}>Pledge:</span> {formatDate(girvi.pledge_date)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                        <Calendar size={13} color="rgb(239, 68, 68)" />
                        <span style={{ color: 'rgb(239, 68, 68)' }}>Due:</span> {formatDate(girvi.due_date)}
                      </div>
                    </td>
                    
                    <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>₹{girvi.present_value?.toLocaleString('en-IN') || 0}</td>
                    <td style={{ padding: '1rem', fontWeight: '700', color: 'var(--primary-color)', whiteSpace: 'nowrap' }}>₹{girvi.loan_amount?.toLocaleString('en-IN') || 0}</td>
                    
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: '99px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        backgroundColor: girvi.status === 'Released' ? 'rgba(139,92,246,0.15)' : 'rgba(16,185,129,0.15)',
                        color: getStatusColor(girvi.status)
                      }}>
                        {girvi.status || 'Active'}
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
                              onClick={() => setReleaseGirvi(girvi)}
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

      {/* Transaction Ledger Modal */}
      {showLedgerModal && activeGirvi && (
        <LedgerModal
          girvi={activeGirvi}
          onClose={() => { setShowLedgerModal(false); setActiveGirvi(null); }}
          onRefresh={fetchGirvis}
        />
      )}

      {/* Release Girvi Modal */}
      {releaseGirvi && (
        <ReleaseModal
          girvi={releaseGirvi}
          onClose={() => setReleaseGirvi(null)}
          onConfirm={handleReleaseConfirm}
          loading={releaseLoading}
        />
      )}
    </div>
  );
}
