import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, Search, Calendar, Download, Landmark, 
  RotateCcw, ArrowUpDown, ArrowUp, ArrowDown, Filter, 
  ChevronLeft, ChevronRight, Loader2, IndianRupee, Repeat, CheckCircle2
} from 'lucide-react';
import { formatDate } from '../utils/dateUtils';
import { exportBankRePledges } from '../utils/exportUtils';

export default function RepledgeReleaseLedger() {
  const [releasedRepledges, setReleasedRepledges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [bankFilter, setBankFilter] = useState('ALL');

  // Sorting State
  const [sortField, setSortField] = useState('id');
  const [sortOrder, setSortOrder] = useState('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState('ALL'); // Default to showing entire ledger

  const navigate = useNavigate();

  useEffect(() => {
    fetchReleasedRepledges();
  }, []);

  const fetchReleasedRepledges = async () => {
    try {
      setLoading(true);
      const data = await api.getReleasedRepledges();
      setReleasedRepledges(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch released bank loans');
    } finally {
      setLoading(false);
    }
  };

  const handleRevertRelease = async (repledge) => {
    if (!window.confirm(`Are you sure you want to revert release for Bank Loan #${repledge.loan_number} (${repledge.bank_name})?\n\nThis item will return to Active status in the Bank Repledge Dashboard.`)) {
      return;
    }
    try {
      setActionLoading(true);
      await api.revertReleaseRepledge(repledge.id);
      fetchReleasedRepledges();
    } catch (err) {
      alert(err.message || 'Failed to revert release for Bank Loan');
    } finally {
      setActionLoading(false);
    }
  };

  // Unique banks for filter dropdown
  const uniqueBanks = useMemo(() => {
    const banks = new Set();
    releasedRepledges.forEach(r => {
      if (r.bank_name) banks.add(r.bank_name);
    });
    return Array.from(banks).sort();
  }, [releasedRepledges]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setBankFilter('ALL');
    setSortField('id');
    setSortOrder('desc');
  };

  // Filtered Repledges
  const filteredRepledges = useMemo(() => {
    return releasedRepledges.filter(r => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const mLoan = r.loan_number && r.loan_number.toLowerCase().includes(term);
        const mBank = r.bank_name && r.bank_name.toLowerCase().includes(term);
        const mRepledger = r.repledger_name && r.repledger_name.toLowerCase().includes(term);
        const mGirvi = r.girvis && r.girvis.some(g => (g.pledge_no && g.pledge_no.toLowerCase().includes(term)) || (g.customer_name && g.customer_name.toLowerCase().includes(term)));
        if (!mLoan && !mBank && !mRepledger && !mGirvi) return false;
      }

      if (bankFilter !== 'ALL' && r.bank_name !== bankFilter) {
        return false;
      }

      return true;
    });
  }, [releasedRepledges, searchTerm, bankFilter]);

  // Sorted Repledges
  const sortedRepledges = useMemo(() => {
    return [...filteredRepledges].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'date_of_loan') {
        valA = new Date(a.date_of_loan || 0).getTime();
        valB = new Date(b.date_of_loan || 0).getTime();
      } else if (sortField === 'amount') {
        valA = Number(a.amount) || 0;
        valB = Number(b.amount) || 0;
      } else if (sortField === 'total_interest') {
        valA = a.transactions?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;
        valB = b.transactions?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;
      } else if (typeof valA === 'string') {
        valA = (valA || '').toLowerCase();
        valB = (valB || '').toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredRepledges, sortField, sortOrder]);

  // Pagination Logic
  const totalPages = pageSize === 'ALL' ? 1 : Math.ceil(sortedRepledges.length / pageSize) || 1;
  const effectivePageSize = pageSize === 'ALL' ? sortedRepledges.length : Number(pageSize);
  
  const paginatedRepledges = useMemo(() => {
    if (pageSize === 'ALL') return sortedRepledges;
    const start = (currentPage - 1) * effectivePageSize;
    return sortedRepledges.slice(start, start + effectivePageSize);
  }, [sortedRepledges, currentPage, effectivePageSize, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, bankFilter, pageSize]);

  // Summary KPI Metrics
  const metrics = useMemo(() => {
    const count = filteredRepledges.length;
    const totalAmount = filteredRepledges.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const totalInterest = filteredRepledges.reduce((sum, r) => {
      const repPaid = r.transactions?.reduce((tSum, t) => tSum + (Number(t.amount) || 0), 0) || 0;
      return sum + repPaid;
    }, 0);
    const totalGirvisCount = filteredRepledges.reduce((sum, r) => sum + (r.girvis?.length || 0), 0);
    return { count, totalAmount, totalInterest, totalGirvisCount };
  }, [filteredRepledges]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const renderSortHeader = (label, field, align = 'left') => {
    const isCurrent = sortField === field;
    return (
      <th 
        onClick={() => handleSort(field)}
        style={{ padding: '1rem', fontWeight: 600, textAlign: align, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
        title={`Sort by ${label}`}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Loader2 className="spin" size={48} style={{ color: 'var(--brand-primary)' }} />
      </div>
    );
  }

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '3rem' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CheckCircle size={32} color="#8b5cf6" /> Bank Repledge Release Ledger
          </h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Archive of settled and released bank loans. Revert release to restore back to active status.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => navigate('/re-pledge')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.875rem' }}
          >
            <Repeat size={18} /> Active Bank Repledges
          </button>
          
          <button 
            className="btn btn-secondary" 
            onClick={() => exportBankRePledges(filteredRepledges)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}
            title="Export Released Bank Loans to Excel / CSV"
          >
            <Download size={18} color="#8b5cf6" /> Export Excel
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', marginBottom: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        
        {/* Total Released Loans */}
        <div className="card" style={{ padding: '1.25rem', borderRadius: '12px', borderLeft: '4px solid #8b5cf6', background: 'var(--bg-surface)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Released Bank Loans</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#8b5cf6', marginTop: '4px' }}>
            {metrics.count}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Fully settled bank loans
          </div>
        </div>

        {/* Total Released Loan Amount */}
        <div className="card" style={{ padding: '1.25rem', borderRadius: '12px', borderLeft: '4px solid #3b82f6', background: 'var(--bg-surface)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Released Principal Total</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#3b82f6', marginTop: '4px' }}>
            ₹{metrics.totalAmount.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Principal loan value settled
          </div>
        </div>

        {/* Total Interest Settled */}
        <div className="card" style={{ padding: '1.25rem', borderRadius: '12px', borderLeft: '4px solid #10b981', background: 'var(--bg-surface)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Interest Settled</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
            ₹{metrics.totalInterest.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Interest paid upon settlement
          </div>
        </div>

        {/* Total Customer Girvis Unlocked */}
        <div className="card" style={{ padding: '1.25rem', borderRadius: '12px', borderLeft: '4px solid #f59e0b', background: 'var(--bg-surface)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Girvis Unlocked</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
            {metrics.totalGirvisCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Linked customer pledge items
          </div>
        </div>

      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <Search size={16} />
            </div>
            <input
              id="released_bank_search"
              name="released_bank_search"
              type="text"
              placeholder="Search by loan #, bank, repledger, pledge #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '36px', margin: 0, fontSize: '0.85rem' }}
            />
          </div>

          {/* Bank Filter */}
          <div style={{ flex: '0 1 180px' }}>
            <select
              id="bank_filter"
              name="bank_filter"
              value={bankFilter}
              onChange={(e) => setBankFilter(e.target.value)}
              className="input-field"
              style={{ margin: 0, padding: '0.6rem 0.75rem', fontSize: '0.85rem' }}
            >
              <option value="ALL">🏛️ All Banks</option>
              {uniqueBanks.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {(searchTerm || bankFilter !== 'ALL') && (
            <button
              className="btn btn-secondary"
              onClick={handleResetFilters}
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', marginLeft: 'auto' }}
            >
              <RotateCcw size={14} /> Clear Filters
            </button>
          )}

        </div>
      </div>

      {/* Main Table Card */}
      <div className="card" style={{ padding: 0, borderRadius: '12px', overflow: 'hidden', background: 'var(--bg-surface)' }}>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                <th style={{ padding: '1rem', fontWeight: 600, textAlign: 'center' }}>S.No.</th>
                {renderSortHeader('Bank Name', 'bank_name')}
                {renderSortHeader('Loan Number', 'loan_number')}
                {renderSortHeader('Repledger Name', 'repledger_name')}
                {renderSortHeader('Date of Loan', 'date_of_loan')}
                {renderSortHeader('Bank Loan Amount', 'amount', 'right')}
                {renderSortHeader('Total Interest Paid', 'total_interest', 'right')}
                <th style={{ padding: '1rem', fontWeight: 600 }}>Linked Girvis</th>
                <th style={{ padding: '1rem', fontWeight: 600, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedRepledges.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <CheckCircle2 size={40} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem auto', display: 'block', opacity: 0.4 }} />
                    <p style={{ margin: '0 0 4px 0', fontWeight: 700, fontSize: '1rem' }}>No Released Bank Loans Found</p>
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>
                      {(searchTerm || bankFilter !== 'ALL')
                        ? 'No released bank loan records match your search filters.'
                        : 'When you release bank loans from the active dashboard, they will appear here.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedRepledges.map((repledge, index) => {
                  const interestPaid = repledge.transactions?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;
                  return (
                    <tr key={repledge.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}>
                      
                      {/* S.No */}
                      <td style={{ padding: '1rem', fontWeight: 600, textAlign: 'center', color: 'var(--text-muted)' }}>
                        {(pageSize === 'ALL' ? 0 : (currentPage - 1) * effectivePageSize) + index + 1}
                      </td>

                      {/* Bank Name */}
                      <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Landmark size={15} color="var(--brand-primary)" /> {repledge.bank_name}
                        </div>
                      </td>

                      {/* Loan Number */}
                      <td style={{ padding: '1rem', fontWeight: 700 }}>
                        <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>#{repledge.loan_number}</div>
                        <span style={{ fontSize: '0.72rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', fontWeight: 700 }}>
                          Released
                        </span>
                      </td>

                      {/* Repledger Name */}
                      <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {repledge.repledger_name || '-'}
                      </td>

                      {/* Date of Loan */}
                      <td style={{ padding: '1rem', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                        {repledge.date_of_loan ? formatDate(repledge.date_of_loan) : '-'}
                      </td>

                      {/* Loan Amount */}
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                        ₹{Number(repledge.amount || 0).toLocaleString('en-IN')}
                      </td>

                      {/* Total Interest Paid */}
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 800, color: '#10b981', whiteSpace: 'nowrap' }}>
                        ₹{interestPaid.toLocaleString('en-IN')}
                      </td>

                      {/* Linked Customer Girvis */}
                      <td style={{ padding: '1rem' }}>
                        {repledge.girvis && repledge.girvis.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                            {repledge.girvis.map(g => (
                              <span 
                                key={g.id} 
                                style={{ 
                                  fontSize: '0.75rem', 
                                  padding: '2px 7px', 
                                  borderRadius: '6px', 
                                  background: 'var(--bg-secondary)', 
                                  border: '1px solid var(--border-color)', 
                                  fontWeight: 600 
                                }}
                                title={`Customer: ${g.customer_name}`}
                              >
                                #{g.pledge_no} ({g.customer_name})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>-</span>
                        )}
                      </td>

                      {/* Actions: Revert Release */}
                      <td style={{ padding: '1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
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
                          title="Revert Release (Move back to Active Bank Loans)"
                          onClick={() => handleRevertRelease(repledge)}
                          disabled={actionLoading}
                        >
                          <RotateCcw size={14} /> Revert
                        </button>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {sortedRepledges.length > 0 && (
          <div style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', fontSize: '0.875rem' }}>
            <div style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
              Showing <strong>{pageSize === 'ALL' ? 1 : (currentPage - 1) * effectivePageSize + 1}</strong> to <strong>{pageSize === 'ALL' ? sortedRepledges.length : Math.min(currentPage * effectivePageSize, sortedRepledges.length)}</strong> of <strong>{sortedRepledges.length}</strong> Released Bank Loans
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Rows per page:</span>
                <select
                  id="page_size_select"
                  name="page_size_select"
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                  className="input-field"
                  style={{ width: 'auto', padding: '0.25rem 0.5rem', margin: 0, fontSize: '0.8rem' }}
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value="ALL">All</option>
                </select>
              </div>

              {pageSize !== 'ALL' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.3rem 0.6rem' }}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', padding: '0 0.25rem' }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.3rem 0.6rem' }}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
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
