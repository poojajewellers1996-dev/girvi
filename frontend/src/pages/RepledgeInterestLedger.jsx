import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { 
  IndianRupee, Search, Calendar, Download, Landmark, 
  RotateCcw, ArrowUpDown, ArrowUp, ArrowDown, Filter, 
  ChevronLeft, ChevronRight, Loader2, Trash2, Repeat, CheckCircle2, Receipt
} from 'lucide-react';
import { formatDate } from '../utils/dateUtils';
import { exportRepledgeInterestLedger } from '../utils/exportUtils';

export default function RepledgeInterestLedger() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [bankFilter, setBankFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [datePreset, setDatePreset] = useState('ALL');

  // Sorting State
  const [sortField, setSortField] = useState('payment_date'); // 'payment_date' | 'amount' | 'loan_number' | 'bank_name'
  const [sortOrder, setSortOrder] = useState('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const navigate = useNavigate();

  useEffect(() => {
    fetchLedger();
  }, []);

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const data = await api.getRepledgeInterestLedger();
      setItems(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch Repledge Interest Ledger');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (transactionId, loanNumber, amount) => {
    if (!window.confirm(`Are you sure you want to delete interest payment of ₹${amount.toLocaleString('en-IN')} for Bank Loan #${loanNumber}?`)) {
      return;
    }
    try {
      setActionLoading(true);
      await api.deleteRepledgeTransaction(transactionId);
      await fetchLedger();
    } catch (err) {
      alert(err.message || 'Failed to delete interest transaction');
    } finally {
      setActionLoading(false);
    }
  };

  // Unique bank options for dropdown filter
  const uniqueBanks = useMemo(() => {
    const banks = new Set();
    items.forEach(i => {
      if (i.bank_name) banks.add(i.bank_name);
    });
    return Array.from(banks).sort();
  }, [items]);

  // Date Preset Handler
  const handleSetPreset = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'ALL') {
      setFromDate('');
      setToDate('');
    } else if (preset === 'TODAY') {
      const todayStr = now.toISOString().split('T')[0];
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const todayStr = now.toISOString().split('T')[0];
      setFromDate(firstDay);
      setToDate(todayStr);
    } else if (preset === 'LAST_MONTH') {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      setFromDate(firstDayLastMonth);
      setToDate(lastDayLastMonth);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setBankFilter('ALL');
    setFromDate('');
    setToDate('');
    setDatePreset('ALL');
    setSortField('payment_date');
    setSortOrder('desc');
  };

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // 1. Search text filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const mLoan = item.loan_number && item.loan_number.toLowerCase().includes(term);
        const mBank = item.bank_name && item.bank_name.toLowerCase().includes(term);
        const mRepledger = item.repledger_name && item.repledger_name.toLowerCase().includes(term);
        const mRemarks = item.remarks && item.remarks.toLowerCase().includes(term);
        const mGirvi = item.girvis && item.girvis.some(g => (g.pledge_no && g.pledge_no.toLowerCase().includes(term)) || (g.customer_name && g.customer_name.toLowerCase().includes(term)));
        if (!mLoan && !mBank && !mRepledger && !mRemarks && !mGirvi) return false;
      }

      // 2. Bank Filter
      if (bankFilter !== 'ALL' && item.bank_name !== bankFilter) {
        return false;
      }

      // 3. Date Range Filter
      if (fromDate) {
        const targetDate = new Date(item.payment_date);
        const fDate = new Date(fromDate);
        if (targetDate < fDate) return false;
      }
      if (toDate) {
        const targetDate = new Date(item.payment_date);
        const tDate = new Date(toDate);
        tDate.setHours(23, 59, 59, 999);
        if (targetDate > tDate) return false;
      }

      return true;
    });
  }, [items, searchTerm, bankFilter, fromDate, toDate]);

  // Sorted Items
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'payment_date') {
        valA = new Date(a.payment_date || 0).getTime();
        valB = new Date(b.payment_date || 0).getTime();
      } else if (sortField === 'amount') {
        valA = Number(a.amount) || 0;
        valB = Number(b.amount) || 0;
      } else if (typeof valA === 'string') {
        valA = (valA || '').toLowerCase();
        valB = (valB || '').toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredItems, sortField, sortOrder]);

  // Pagination Logic
  const totalPages = pageSize === 'ALL' ? 1 : Math.ceil(sortedItems.length / pageSize) || 1;
  const effectivePageSize = pageSize === 'ALL' ? sortedItems.length : Number(pageSize);
  
  const paginatedItems = useMemo(() => {
    if (pageSize === 'ALL') return sortedItems;
    const start = (currentPage - 1) * effectivePageSize;
    return sortedItems.slice(start, start + effectivePageSize);
  }, [sortedItems, currentPage, effectivePageSize, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, bankFilter, fromDate, toDate, pageSize]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalPaid = filteredItems.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const txCount = filteredItems.length;
    const uniqueLoansCount = new Set(filteredItems.map(i => i.loan_number)).size;
    const avgAmount = txCount > 0 ? Math.round(totalPaid / txCount) : 0;
    return { totalPaid, txCount, uniqueLoansCount, avgAmount };
  }, [filteredItems]);

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
        style={{ padding: '1rem', fontWeight: '600', textAlign: align, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
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
            <Receipt size={32} color="#10b981" /> Repledge Interest Ledger
          </h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Complete audit trail of interest payments paid to banks against repledged loans.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => navigate('/re-pledge')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.875rem' }}
          >
            <Repeat size={18} /> Manage Bank Repledges
          </button>
          
          <button 
            className="btn btn-secondary" 
            onClick={() => exportRepledgeInterestLedger(filteredItems)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}
            title="Export to Excel / CSV"
          >
            <Download size={18} color="#10b981" /> Export Excel
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
        
        {/* Total Interest Paid */}
        <div className="card" style={{ padding: '1.25rem', borderRadius: '12px', borderLeft: '4px solid #10b981', background: 'var(--bg-surface)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Bank Interest Paid</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
            ₹{metrics.totalPaid.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Across {metrics.txCount} transaction{metrics.txCount !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Total Payments Recorded */}
        <div className="card" style={{ padding: '1.25rem', borderRadius: '12px', borderLeft: '4px solid #8b5cf6', background: 'var(--bg-surface)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payments Count</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#8b5cf6', marginTop: '4px' }}>
            {metrics.txCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Interest payment receipts
          </div>
        </div>

        {/* Bank Loans Covered */}
        <div className="card" style={{ padding: '1.25rem', borderRadius: '12px', borderLeft: '4px solid #3b82f6', background: 'var(--bg-surface)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bank Loans Covered</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#3b82f6', marginTop: '4px' }}>
            {metrics.uniqueLoansCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Unique bank loan numbers
          </div>
        </div>

        {/* Average Payment */}
        <div className="card" style={{ padding: '1.25rem', borderRadius: '12px', borderLeft: '4px solid #f59e0b', background: 'var(--bg-surface)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Interest Payment</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
            ₹{metrics.avgAmount.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Per payment transaction
          </div>
        </div>

      </div>

      {/* Filter Controls Bar */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', background: 'var(--bg-surface)' }}>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
          
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <Search size={16} />
            </div>
            <input
              id="repledge_ledger_search"
              name="repledge_ledger_search"
              type="text"
              placeholder="Search loan #, bank, repledger, pledge #..."
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

          {/* Date Presets */}
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            <button
              className={`btn ${datePreset === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.45rem 0.75rem', fontSize: '0.78rem' }}
              onClick={() => handleSetPreset('ALL')}
            >
              All Time
            </button>
            <button
              className={`btn ${datePreset === 'TODAY' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.45rem 0.75rem', fontSize: '0.78rem' }}
              onClick={() => handleSetPreset('TODAY')}
            >
              Today
            </button>
            <button
              className={`btn ${datePreset === 'THIS_MONTH' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.45rem 0.75rem', fontSize: '0.78rem' }}
              onClick={() => handleSetPreset('THIS_MONTH')}
            >
              This Month
            </button>
            <button
              className={`btn ${datePreset === 'LAST_MONTH' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.45rem 0.75rem', fontSize: '0.78rem' }}
              onClick={() => handleSetPreset('LAST_MONTH')}
            >
              Last Month
            </button>
          </div>

        </div>

        {/* Date Range Row */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <Calendar size={16} /> <strong>Payment Date Range:</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              id="from_date"
              name="from_date"
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setDatePreset('CUSTOM'); }}
              className="input-field"
              style={{ margin: 0, padding: '0.4rem 0.6rem', fontSize: '0.8rem', width: 'auto' }}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>to</span>
            <input
              id="to_date"
              name="to_date"
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setDatePreset('CUSTOM'); }}
              className="input-field"
              style={{ margin: 0, padding: '0.4rem 0.6rem', fontSize: '0.8rem', width: 'auto' }}
            />
          </div>

          {(searchTerm || bankFilter !== 'ALL' || fromDate || toDate) && (
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
                {renderSortHeader('Bank Loan No.', 'loan_number')}
                {renderSortHeader('Bank Name & Repledger', 'bank_name')}
                <th style={{ padding: '1rem', fontWeight: 600 }}>Linked Customer Girvis</th>
                {renderSortHeader('Payment Date', 'payment_date')}
                {renderSortHeader('Amount Paid', 'amount', 'right')}
                <th style={{ padding: '1rem', fontWeight: 600 }}>Remarks / Notes</th>
                <th style={{ padding: '1rem', fontWeight: 600, textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Receipt size={40} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem auto', display: 'block', opacity: 0.4 }} />
                    <p style={{ margin: '0 0 4px 0', fontWeight: 700, fontSize: '1rem' }}>No Interest Payments Found</p>
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>
                      {(searchTerm || bankFilter !== 'ALL' || fromDate || toDate)
                        ? 'No payment records match your search or date filters.'
                        : 'When interest is paid on Bank Repledges, transactions will be recorded here.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, index) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}>
                    
                    {/* S.No */}
                    <td style={{ padding: '1rem', fontWeight: 600, textAlign: 'center', color: 'var(--text-muted)' }}>
                      {(pageSize === 'ALL' ? 0 : (currentPage - 1) * effectivePageSize) + index + 1}
                    </td>

                    {/* Loan Number */}
                    <td style={{ padding: '1rem', fontWeight: 700 }}>
                      <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>#{item.loan_number}</div>
                      <span style={{ fontSize: '0.72rem', padding: '1px 6px', borderRadius: '4px', background: item.status === 'Released' ? 'rgba(139,92,246,0.15)' : 'rgba(16,185,129,0.15)', color: item.status === 'Released' ? '#8b5cf6' : '#10b981', fontWeight: 700 }}>
                        {item.status || 'Active'}
                      </span>
                    </td>

                    {/* Bank Name & Repledger */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Landmark size={14} color="var(--brand-primary)" /> {item.bank_name}
                      </div>
                      {item.repledger_name && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Repledger: <strong>{item.repledger_name}</strong>
                        </div>
                      )}
                    </td>

                    {/* Linked Customer Girvis */}
                    <td style={{ padding: '1rem' }}>
                      {item.girvis && item.girvis.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                          {item.girvis.map(g => (
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
                              title={`Customer: ${g.customer_name} | Loan: ₹${g.loan_amount}`}
                            >
                              #{g.pledge_no} ({g.customer_name})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>-</span>
                      )}
                    </td>

                    {/* Payment Date ("when i paid") */}
                    <td style={{ padding: '1rem', whiteSpace: 'nowrap', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {item.payment_date ? formatDate(item.payment_date) : '-'}
                    </td>

                    {/* Amount Paid ("how much i paid") */}
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 800, color: '#10b981', fontSize: '1rem', whiteSpace: 'nowrap' }}>
                      + ₹{Number(item.amount || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Remarks */}
                    <td style={{ padding: '1rem', fontSize: '0.825rem', color: 'var(--text-muted)', maxWidth: '200px' }}>
                      {item.remarks || 'Bank Interest Payment'}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.45rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', backgroundColor: 'rgba(239,68,68,0.05)' }}
                        title="Delete Interest Payment Transaction"
                        onClick={() => handleDeleteTransaction(item.id, item.loan_number, item.amount)}
                        disabled={actionLoading}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {sortedItems.length > 0 && (
          <div style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', fontSize: '0.875rem' }}>
            <div style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
              Showing <strong>{pageSize === 'ALL' ? 1 : (currentPage - 1) * effectivePageSize + 1}</strong> to <strong>{pageSize === 'ALL' ? sortedItems.length : Math.min(currentPage * effectivePageSize, sortedItems.length)}</strong> of <strong>{sortedItems.length}</strong> Payment Records
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
