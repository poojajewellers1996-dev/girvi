import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client';
import { Loader2, Search, Plus, Eye, Edit, Trash2, Calendar, NotebookTabs, Unlock, Download, Filter, RotateCcw, Image as ImageIcon, ArrowUpDown, ArrowUp, ArrowDown, Landmark, PackageCheck, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LedgerModal from '../components/LedgerModal';
import ReleaseModal from '../components/ReleaseModal';
import ImageLightbox from '../components/ImageLightbox';
import { exportGirviLedger } from '../utils/exportUtils';
import { formatDate } from '../utils/dateUtils';

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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25); // 25, 50, 100, 'ALL'

  // Sorting State
  const [sortField, setSortField] = useState('pledge_no'); // 'pledge_no' | 'pledge_date' | 'loan_amount' | 'present_value' | 'customer_name'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'

  // Image Lightbox State
  const [lightbox, setLightbox] = useState(null);

  const navigate = useNavigate();

  useEffect(() => { fetchGirvis(); }, []);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

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
    setSortField('pledge_no');
    setSortOrder('desc');
  };

  // Filtered & Sorted Girvis
  const filteredGirvis = girvis.filter(g => {
    // 1. Search text filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchPledge = g.pledge_no && g.pledge_no.toLowerCase().includes(term);
      const matchName = g.customer_name && g.customer_name.toLowerCase().includes(term);
      const matchDate = g.pledge_date && g.pledge_date.includes(term);
      const matchArticle = g.articles && g.articles.some(a => a.name && a.name.toLowerCase().includes(term));
      const matchRepledge = g.repledges && g.repledges.some(r => (r.loan_number && r.loan_number.toLowerCase().includes(term)) || (r.bank_name && r.bank_name.toLowerCase().includes(term)));
      if (!matchPledge && !matchName && !matchDate && !matchArticle && !matchRepledge) return false;
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

  const sortedGirvis = [...filteredGirvis].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === 'pledge_date') {
      valA = new Date(a.pledge_date).getTime() || 0;
      valB = new Date(b.pledge_date).getTime() || 0;
    } else if (sortField === 'loan_amount' || sortField === 'present_value') {
      valA = Number(a[sortField]) || 0;
      valB = Number(b[sortField]) || 0;
    } else if (typeof valA === 'string') {
      valA = (valA || '').toLowerCase();
      valB = (valB || '').toLowerCase();
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Reset currentPage on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, metalFilter, fromDate, toDate, sortField, sortOrder]);

  const effectivePageSize = pageSize === 'ALL' ? sortedGirvis.length || 1 : Number(pageSize) || 25;
  const totalPages = Math.max(1, Math.ceil(sortedGirvis.length / effectivePageSize));

  const paginatedGirvis = useMemo(() => {
    if (pageSize === 'ALL') return sortedGirvis;
    const startIndex = (currentPage - 1) * effectivePageSize;
    return sortedGirvis.slice(startIndex, startIndex + effectivePageSize);
  }, [sortedGirvis, currentPage, pageSize, effectivePageSize]);

  const renderSortHeader = (label, field, align = 'left') => {
    const isCurrent = sortField === field;
    return (
      <th 
        onClick={() => handleSort(field)}
        style={{ padding: '1rem', fontWeight: '600', textAlign: align, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
        title={`Sort by ${label}`}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', justifyContent: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start' }}>
          {label}
          {isCurrent ? (
            sortOrder === 'asc' ? <ArrowUp size={14} color="var(--brand-primary)" /> : <ArrowDown size={14} color="var(--brand-primary)" />
          ) : (
            <ArrowUpDown size={14} color="var(--text-muted)" style={{ opacity: 0.6 }} />
          )}
        </div>
      </th>
    );
  };

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
      await api.releaseGirvi(releaseGirvi.id, {
        rate,
        months,
        interest_amount: interest,
        total_amount: total
      });
      setReleaseGirvi(null);
      fetchGirvis();
    } catch (err) {
      setError(err.message || 'Failed to release Girvi');
    } finally {
      setReleaseLoading(false);
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
            onClick={() => navigate('/release-ledger')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.875rem', borderColor: '#8b5cf6', color: '#8b5cf6', fontWeight: '600' }}
            title="View complete ledger of all settled & released pawn pledges"
          >
            <CheckCircle2 size={18} /> Release Ledger
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => navigate('/stock-check')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.875rem', borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)', fontWeight: '600' }}
            title="Audit and check physically present shop Girvi stock (excludes repledged bank loans)"
          >
            <PackageCheck size={18} /> Check Girvi Stock
          </button>
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
                <th style={{ padding: '1rem', fontWeight: '600', width: '50px', textAlign: 'center' }}>S.No.</th>
                {renderSortHeader('Pledge No', 'pledge_no')}
                {renderSortHeader('Customer', 'customer_name')}
                <th style={{ padding: '1rem', fontWeight: '600' }}>Mobile</th>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Item Description</th>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Weight</th>
                {renderSortHeader('Dates', 'pledge_date')}
                {renderSortHeader('Bank', 'bank_name')}
                {renderSortHeader('Total Value', 'present_value', 'right')}
                {renderSortHeader('Loan Amount', 'loan_amount', 'right')}
                <th style={{ padding: '1rem', fontWeight: '600', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '1rem', fontWeight: '600', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedGirvis.length === 0 ? (
                <tr>
                  <td colSpan="12" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {(searchTerm || statusFilter !== 'ALL' || metalFilter !== 'ALL' || fromDate || toDate) 
                      ? 'No records match your filters.' 
                      : 'No records found. Click "New Girvi" to create one.'}
                  </td>
                </tr>
              ) : (
                paginatedGirvis.map((girvi, index) => (

                  <tr key={girvi.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '1rem', fontWeight: '600', textAlign: 'center', color: 'var(--text-muted)' }}>
                      {(pageSize === 'ALL' ? 0 : (currentPage - 1) * effectivePageSize) + index + 1}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: '600' }}>
                      <div>{girvi.pledge_no}</div>
                      {girvi.repledges && girvi.repledges.length > 0 && (
                        <div style={{ fontSize: '0.75rem', fontWeight: '500', color: 'var(--brand-primary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <Landmark size={12} />
                          {girvi.repledges.map(r => r.loan_number).join(', ')}
                        </div>
                      )}
                    </td>
                    
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
                                  title="View Item Photo"
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

                    {/* Weight Details */}
                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                      {girvi.articles && girvi.articles.length > 0 ? (
                        <div>
                          <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                            Net: {girvi.articles.reduce((sum, a) => sum + (Number(a.net_wt) || 0), 0).toFixed(2)} g
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                            Gross: {girvi.articles.reduce((sum, a) => sum + (Number(a.gross_wt) || 0), 0).toFixed(2)} g
                          </div>
                        </div>
                      ) : '-'}
                    </td>

                    <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: '500' }}>
                        {new Date(girvi.pledge_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      {girvi.due_date && (
                        <div style={{ fontSize: '0.78rem', color: '#ef4444' }}>
                          Due: {new Date(girvi.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      )}
                    </td>

                    {/* Bank Link Column */}
                    <td style={{ padding: '1rem' }}>
                      {girvi.repledges && girvi.repledges.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {girvi.repledges.map((r, rIdx) => (
                            <span key={rIdx} style={{ fontSize: '0.78rem', fontWeight: '600', padding: '2px 6px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--brand-primary)', width: 'fit-content' }}>
                              {r.bank_name}: {r.loan_number}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Shop Safe</span>
                      )}
                    </td>

                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '500' }}>₹{girvi.present_value?.toLocaleString('en-IN') || 0}</td>

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

        {/* Pagination Footer */}
        {sortedGirvis.length > 0 && (
          <div style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', fontSize: '0.875rem' }}>
            <div style={{ color: 'var(--text-muted)', fontWeight: '500' }}>
              Showing <strong>{pageSize === 'ALL' ? 1 : (currentPage - 1) * effectivePageSize + 1}</strong> to <strong>{pageSize === 'ALL' ? sortedGirvis.length : Math.min(currentPage * effectivePageSize, sortedGirvis.length)}</strong> of <strong>{sortedGirvis.length}</strong> Girvis
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Rows per page:</span>
                <select 
                  className="input-field" 
                  value={pageSize} 
                  onChange={(e) => {
                    setPageSize(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{ margin: 0, padding: '0.25rem 0.5rem', fontSize: '0.85rem', width: 'auto' }}
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value="ALL">All ({sortedGirvis.length})</option>
                </select>
              </div>

              {pageSize !== 'ALL' && totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button 
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    style={{ padding: '0.35rem 0.5rem', display: 'flex', alignItems: 'center' }}
                    title="Previous Page"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <span style={{ fontWeight: '600', padding: '0 0.4rem', color: 'var(--text-primary)' }}>
                    Page {currentPage} of {totalPages}
                  </span>

                  <button 
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
                    style={{ padding: '0.35rem 0.5rem', display: 'flex', alignItems: 'center' }}
                    title="Next Page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
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
