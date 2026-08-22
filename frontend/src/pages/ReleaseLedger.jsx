import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, Search, Calendar, Download, Eye, 
  RotateCcw, Image as ImageIcon, ArrowUpDown, ArrowUp, ArrowDown, 
  Landmark, Filter, ChevronLeft, ChevronRight, Loader2, IndianRupee, Printer
} from 'lucide-react';
import ImageLightbox from '../components/ImageLightbox';

export default function ReleaseLedger() {
  const [releasedGirvis, setReleasedGirvis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [metalFilter, setMetalFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [datePreset, setDatePreset] = useState('ALL');

  // Sorting State
  const [sortField, setSortField] = useState('release_date'); // 'pledge_no' | 'release_date' | 'pledge_date' | 'loan_amount' | 'interest_collected' | 'total_collected'
  const [sortOrder, setSortOrder] = useState('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Image Lightbox State
  const [lightbox, setLightbox] = useState(null);

  const navigate = useNavigate();

  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchReleasedGirvis();
  }, []);

  const fetchReleasedGirvis = async () => {
    try {
      setLoading(true);
      const data = await api.getReleasedGirvis();
      setReleasedGirvis(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch released Girvi records');
    } finally {
      setLoading(false);
    }
  };

  const handleRevertRelease = async (girvi) => {
    if (!window.confirm(`Are you sure you want to revert release for Pledge #${girvi.pledge_no}?\n\nThis item will return to Active status in the Girvi Ledger.`)) {
      return;
    }
    try {
      setActionLoading(true);
      await api.revertReleaseGirvi(girvi.id);
      fetchReleasedGirvis();
    } catch (err) {
      alert(err.message || 'Failed to revert release');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetPreset = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'ALL') {
      setFromDate('');
      setToDate('');
    } else if (preset === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const todayStr = now.toISOString().split('T')[0];
      setFromDate(firstDay);
      setToDate(todayStr);
    } else if (preset === 'LAST_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      setFromDate(firstDay);
      setToDate(lastDay);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setMetalFilter('ALL');
    setFromDate('');
    setToDate('');
    setDatePreset('ALL');
    setSortField('release_date');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // 1. Filtered Released Girvis
  const filteredGirvis = useMemo(() => {
    return releasedGirvis.filter(g => {
      // Text Search Filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const pMatch = g.pledge_no && g.pledge_no.toLowerCase().includes(term);
        const cMatch = g.customer_name && g.customer_name.toLowerCase().includes(term);
        const mMatch = g.mobile_number && g.mobile_number.includes(term);
        const aMatch = g.articles && g.articles.some(a => a.name && a.name.toLowerCase().includes(term));
        if (!pMatch && !cMatch && !mMatch && !aMatch) return false;
      }

      // Metal Filter
      if (metalFilter !== 'ALL') {
        const articleNames = g.articles?.map(a => (a.name || '').toLowerCase()).join(' ') || '';
        const isSilver = articleNames.includes('silver');
        if (metalFilter === 'silver' && !isSilver) return false;
        if (metalFilter === 'gold' && isSilver) return false;
      }

      // Date Range Filter (By Release Date or Pledge Date)
      const rDateStr = g.release_date || g.pledge_date;
      if (fromDate) {
        const targetDate = new Date(rDateStr);
        const fDate = new Date(fromDate);
        if (targetDate < fDate) return false;
      }
      if (toDate) {
        const targetDate = new Date(rDateStr);
        const tDate = new Date(toDate);
        tDate.setHours(23, 59, 59, 999);
        if (targetDate > tDate) return false;
      }

      return true;
    });
  }, [releasedGirvis, searchTerm, metalFilter, fromDate, toDate]);

  // 2. Sorted Girvis
  const sortedGirvis = useMemo(() => {
    return [...filteredGirvis].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'release_date' || sortField === 'pledge_date') {
        valA = new Date(a[sortField] || 0).getTime();
        valB = new Date(b[sortField] || 0).getTime();
      } else if (sortField === 'loan_amount' || sortField === 'interest_collected' || sortField === 'total_collected') {
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
  }, [filteredGirvis, sortField, sortOrder]);

  // 3. Paginated Girvis
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, metalFilter, fromDate, toDate, sortField, sortOrder]);

  const effectivePageSize = pageSize === 'ALL' ? sortedGirvis.length || 1 : Number(pageSize) || 25;
  const totalPages = Math.max(1, Math.ceil(sortedGirvis.length / effectivePageSize));

  const paginatedGirvis = useMemo(() => {
    if (pageSize === 'ALL') return sortedGirvis;
    const startIndex = (currentPage - 1) * effectivePageSize;
    return sortedGirvis.slice(startIndex, startIndex + effectivePageSize);
  }, [sortedGirvis, currentPage, pageSize, effectivePageSize]);

  // Summary Statistics
  const totalPrincipal = useMemo(() => {
    return filteredGirvis.reduce((sum, g) => sum + (Number(g.loan_amount) || 0), 0);
  }, [filteredGirvis]);

  const totalInterest = useMemo(() => {
    return filteredGirvis.reduce((sum, g) => sum + (Number(g.interest_collected) || 0), 0);
  }, [filteredGirvis]);

  const totalCollected = useMemo(() => {
    return totalPrincipal + totalInterest;
  }, [totalPrincipal, totalInterest]);

  // Table Sort Header Renderer
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

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredGirvis.length === 0) return;
    const headers = ["S.No", "Pledge No", "Customer Name", "Mobile", "Pledge Date", "Release Date", "Articles", "Principal (₹)", "Interest (₹)", "Total Collected (₹)", "Remarks"];
    const rows = filteredGirvis.map((g, idx) => [
      idx + 1,
      g.pledge_no,
      `"${g.customer_name || ''}"`,
      g.mobile_number || '',
      g.pledge_date ? new Date(g.pledge_date).toLocaleDateString('en-GB') : '',
      g.release_date ? new Date(g.release_date).toLocaleDateString('en-GB') : '',
      `"${g.articles?.map(a => `${a.name} (${a.net_wt}g)`).join(', ') || ''}"`,
      g.loan_amount || 0,
      g.interest_collected || 0,
      g.total_collected || 0,
      `"${g.remarks || ''}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Release_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Loader2 className="spin" size={48} style={{ color: 'var(--primary-color)' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={fetchReleasedGirvis}>Retry Loading</button>
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
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={28} color="#8b5cf6" />
            Release Ledger
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.875rem' }}>
            Complete history of settled & released customer pawn pledges
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            type="button"
            className="btn btn-secondary" 
            onClick={handleExportCSV}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}
            disabled={filteredGirvis.length === 0}
          >
            <Download size={16} /> Export Excel / CSV
          </button>
          <button 
            type="button"
            className="btn btn-primary" 
            onClick={() => navigate('/ledger')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}
          >
            Back to Active Ledger
          </button>
        </div>
      </div>

      {/* Financial Summary Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        
        <div className="card" style={{ padding: '1rem 1.25rem', background: 'var(--bg-surface)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Released Pledges</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#8b5cf6', marginTop: '4px' }}>
            {filteredGirvis.length} Items
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem', background: 'var(--bg-surface)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Principal Recovered</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--brand-primary)', marginTop: '4px' }}>
            ₹{totalPrincipal.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem', background: 'var(--bg-surface)' }}>
          <span style={{ fontSize: '0.75rem', color: '#16a34a', textTransform: 'uppercase', fontWeight: 700 }}>Interest Earned</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>
            ₹{totalInterest.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem', background: 'var(--bg-surface)', borderLeft: '4px solid #10b981' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Recovery Collected</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
            ₹{totalCollected.toLocaleString('en-IN')}
          </div>
        </div>

      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.25rem', background: 'var(--bg-surface)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          
          {/* Search Box */}
          <div className="input-group" style={{ margin: 0 }}>
            <label className="input-label" style={{ fontSize: '0.78rem' }}>Search Released Records</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', top: '50%', left: '10px', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Pledge No, Customer, Mobile, Item..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '32px', margin: 0, fontSize: '0.875rem' }}
              />
            </div>
          </div>

          {/* Metal Filter */}
          <div className="input-group" style={{ margin: 0 }}>
            <label className="input-label" style={{ fontSize: '0.78rem' }}>Metal Type</label>
            <select
              className="input-field"
              value={metalFilter}
              onChange={(e) => setMetalFilter(e.target.value)}
              style={{ margin: 0, fontSize: '0.875rem' }}
            >
              <option value="ALL">All Metal Stock</option>
              <option value="gold">🥇 Gold Only</option>
              <option value="silver">🥈 Silver Only</option>
            </select>
          </div>

          {/* Date Presets */}
          <div className="input-group" style={{ margin: 0 }}>
            <label className="input-label" style={{ fontSize: '0.78rem' }}>Date Filter Presets</label>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button 
                type="button" 
                onClick={() => handleSetPreset('ALL')}
                style={{
                  flex: 1, padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border-color)',
                  fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600,
                  backgroundColor: datePreset === 'ALL' ? 'var(--brand-primary)' : 'var(--bg-secondary)',
                  color: datePreset === 'ALL' ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                All Time
              </button>
              <button 
                type="button" 
                onClick={() => handleSetPreset('THIS_MONTH')}
                style={{
                  flex: 1, padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border-color)',
                  fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600,
                  backgroundColor: datePreset === 'THIS_MONTH' ? 'var(--brand-primary)' : 'var(--bg-secondary)',
                  color: datePreset === 'THIS_MONTH' ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                This Month
              </button>
              <button 
                type="button" 
                onClick={() => handleSetPreset('LAST_MONTH')}
                style={{
                  flex: 1, padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border-color)',
                  fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600,
                  backgroundColor: datePreset === 'LAST_MONTH' ? 'var(--brand-primary)' : 'var(--bg-secondary)',
                  color: datePreset === 'LAST_MONTH' ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                Last Month
              </button>
            </div>
          </div>

          {/* Custom Date Range */}
          <div className="input-group" style={{ margin: 0 }}>
            <label className="input-label" style={{ fontSize: '0.78rem' }}>Release Date Range</label>
            <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setDatePreset('CUSTOM'); }}
                className="input-field"
                style={{ margin: 0, padding: '0.4rem', fontSize: '0.78rem' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setDatePreset('CUSTOM'); }}
                className="input-field"
                style={{ margin: 0, padding: '0.4rem', fontSize: '0.78rem' }}
              />
            </div>
          </div>

          {/* Reset Filters */}
          <div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleResetFilters}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', fontSize: '0.85rem' }}
            >
              <RotateCcw size={14} /> Reset Filters
            </button>
          </div>

        </div>
      </div>

      {/* Main Release Table Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                <th style={{ padding: '1rem', fontWeight: '600', textAlign: 'center' }}>S.No.</th>
                {renderSortHeader('Pledge No', 'pledge_no')}
                {renderSortHeader('Customer Name', 'customer_name')}
                <th style={{ padding: '1rem', fontWeight: '600' }}>Mobile</th>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Articles Description</th>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Weight</th>
                {renderSortHeader('Pledge Date', 'pledge_date')}
                {renderSortHeader('Release Date', 'release_date')}
                {renderSortHeader('Principal', 'loan_amount', 'right')}
                {renderSortHeader('Interest Paid', 'interest_collected', 'right')}
                {renderSortHeader('Total Collected', 'total_collected', 'right')}
                <th style={{ padding: '1rem', fontWeight: '600', textAlign: 'center' }}>Remarks</th>
                <th style={{ padding: '1rem', fontWeight: '600', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedGirvis.length === 0 ? (
                <tr>
                  <td colSpan="13" style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <CheckCircle2 size={40} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem auto', display: 'block', opacity: 0.4 }} />
                    <p style={{ margin: '0 0 4px 0', fontWeight: 700, fontSize: '1rem' }}>No Released Pledges Found</p>
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>
                      {(searchTerm || metalFilter !== 'ALL' || fromDate || toDate)
                        ? 'No released records match your search or date filters.'
                        : 'When you release active Girvis from the Ledger, they will appear here with interest & total details.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedGirvis.map((girvi, index) => (
                  <tr key={girvi.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}>
                    
                    {/* S.No. */}
                    <td style={{ padding: '1rem', fontWeight: '600', textAlign: 'center', color: 'var(--text-muted)' }}>
                      {(pageSize === 'ALL' ? 0 : (currentPage - 1) * effectivePageSize) + index + 1}
                    </td>

                    {/* Pledge No */}
                    <td style={{ padding: '1rem', fontWeight: '700' }}>
                      <div style={{ fontSize: '0.95rem' }}>#{girvi.pledge_no}</div>
                      <span style={{ fontSize: '0.72rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', fontWeight: 700 }}>
                        Released
                      </span>
                    </td>

                    {/* Customer Info */}
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

                    {/* Mobile */}
                    <td style={{ padding: '1rem', fontWeight: '500', whiteSpace: 'nowrap' }}>
                      {girvi.mobile_number ? girvi.mobile_number.replace('+91', '') : '-'}
                    </td>

                    {/* Articles Description */}
                    <td style={{ padding: '1rem' }}>
                      {girvi.articles && girvi.articles.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {girvi.articles.map((art, idx) => (
                            <div key={idx} style={{ fontSize: '0.85rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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
                      ) : '-'}
                    </td>

                    {/* Weight */}
                    <td style={{ padding: '1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
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

                    {/* Pledge Date */}
                    <td style={{ padding: '1rem', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                      {girvi.pledge_date ? new Date(girvi.pledge_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                    </td>

                    {/* Release Date */}
                    <td style={{ padding: '1rem', whiteSpace: 'nowrap', fontSize: '0.85rem', fontWeight: 600, color: '#8b5cf6' }}>
                      {girvi.release_date ? new Date(girvi.release_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                    </td>

                    {/* Principal Loan */}
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                      ₹{Number(girvi.loan_amount || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Interest Collected */}
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '800', color: '#16a34a', whiteSpace: 'nowrap' }}>
                      + ₹{Number(girvi.interest_collected || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Total Collected */}
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '800', color: '#10b981', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
                      ₹{Number(girvi.total_collected || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Remarks */}
                    <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: '160px' }}>
                      {girvi.remarks || 'Settled & Released'}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.45rem', color: 'var(--primary-color)' }}
                          title="Print / View Release Bill"
                          onClick={() => navigate(`/girvi/${girvi.id}/print`)}
                        >
                          <Printer size={16} />
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ 
                            padding: '0.45rem 0.65rem', 
                            color: '#e11d48', 
                            borderColor: '#fecdd3', 
                            backgroundColor: '#fff1f2', 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '0.35rem', 
                            fontSize: '0.78rem', 
                            fontWeight: 600 
                          }}
                          title="Revert Release (Move back to Girvi Ledger as Active)"
                          onClick={() => handleRevertRelease(girvi)}
                          disabled={actionLoading}
                        >
                          <RotateCcw size={14} /> Revert
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
              Showing <strong>{pageSize === 'ALL' ? 1 : (currentPage - 1) * effectivePageSize + 1}</strong> to <strong>{pageSize === 'ALL' ? sortedGirvis.length : Math.min(currentPage * effectivePageSize, sortedGirvis.length)}</strong> of <strong>{sortedGirvis.length}</strong> Released Girvis
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
    </div>
  );
}
