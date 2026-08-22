import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Loader2, ChevronDown, ChevronUp, ExternalLink, Calendar, Landmark, Search, Plus, Trash2, IndianRupee, Unlock, CheckCircle, Clock, Download, Edit, X, ArrowUpDown, ArrowUp, ArrowDown, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { exportBankRePledges, exportInterestReport } from '../utils/exportUtils';
import { formatDate, toInputDateString, toISOAtNoon } from '../utils/dateUtils';

export default function RePledge() {
  const [repledges, setRepledges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Sorting State
  const [sortField, setSortField] = useState('loan_number'); // 'bank_name' | 'loan_number' | 'repledger_name' | 'date_of_loan' | 'amount' | 'total_interest_paid' | 'status'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'

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


  // Edit Modal State
  const [editModalData, setEditModalData] = useState(null);
  const [editForm, setEditForm] = useState({
    bank_name: '',
    loan_number: '',
    repledger_name: '',
    date_of_loan: '',
    amount: '',
    status: 'Active'
  });

  // Interest Form state per expanded repledge
  const [interestInputs, setInterestInputs] = useState({});

  const navigate = useNavigate();

  useEffect(() => {
    fetchRepledges();
  }, []);

  const fetchRepledges = async () => {
    try {
      setLoading(true);
      const data = await api.getRepledges();
      setRepledges(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch Repledges');
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (id) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // Open Edit Modal with selected repledge data
  const handleOpenEditModal = (e, repledge) => {
    e.stopPropagation();
    setEditModalData(repledge);
    setEditForm({
      bank_name: repledge.bank_name || '',
      loan_number: repledge.loan_number || '',
      repledger_name: repledge.repledger_name || '',
      date_of_loan: toInputDateString(repledge.date_of_loan),
      amount: repledge.amount || '',
      status: repledge.status || 'Active'
    });
  };

  const handleEditFormSubmit = async (e) => {
    e.preventDefault();
    if (!editModalData) return;

    try {
      setActionLoading(true);
      await api.updateRepledge(editModalData.id, {
        bank_name: editForm.bank_name,
        loan_number: editForm.loan_number,
        repledger_name: editForm.repledger_name,
        date_of_loan: toISOAtNoon(editForm.date_of_loan),
        amount: parseFloat(editForm.amount),
        status: editForm.status
      });

      setEditModalData(null);
      await fetchRepledges();
    } catch (err) {
      alert(err.message || 'Failed to update Bank Loan');
    } finally {
      setActionLoading(false);
    }
  };


  const handleInterestInputChange = (repledgeId, field, value) => {
    setInterestInputs(prev => ({
      ...prev,
      [repledgeId]: {
        ...(prev[repledgeId] || {
          amount: '',
          payment_date: new Date().toISOString().split('T')[0],
          remarks: ''
        }),
        [field]: value
      }
    }));
  };

  const handleAddInterest = async (e, repledgeId) => {
    e.preventDefault();
    e.stopPropagation();
    const input = interestInputs[repledgeId] || {};
    if (!input.amount || isNaN(input.amount) || Number(input.amount) <= 0) {
      alert('Please enter a valid interest amount.');
      return;
    }

    try {
      setActionLoading(true);
      await api.addRepledgeTransaction(repledgeId, {
        amount: parseFloat(input.amount),
        payment_date: toISOAtNoon(input.payment_date || new Date().toISOString().split('T')[0]),
        remarks: input.remarks || null
      });


      // Clear input
      setInterestInputs(prev => ({
        ...prev,
        [repledgeId]: {
          amount: '',
          payment_date: new Date().toISOString().split('T')[0],
          remarks: ''
        }
      }));

      await fetchRepledges();
    } catch (err) {
      alert(err.message || 'Failed to add interest payment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteInterest = async (e, transactionId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this interest entry?')) return;
    try {
      setActionLoading(true);
      await api.deleteRepledgeTransaction(transactionId);
      await fetchRepledges();
    } catch (err) {
      alert(err.message || 'Failed to delete interest entry');
    } finally {
      setActionLoading(false);
    }
  };

  // Release Modal State
  const [releaseModalData, setReleaseModalData] = useState(null);
  const [releaseForm, setReleaseForm] = useState({
    release_date: new Date().toISOString().split('T')[0],
    final_interest_paid: 0,
    person_taking: 'Self / Owner',
    remarks: ''
  });

  const handleOpenReleaseModal = (e, repledge) => {
    e.stopPropagation();
    setReleaseModalData(repledge);
    setReleaseForm({
      release_date: new Date().toISOString().split('T')[0],
      final_interest_paid: 0,
      person_taking: 'Self / Owner',
      remarks: ''
    });
  };

  const handleReleaseSubmit = async (e) => {
    e.preventDefault();
    if (!releaseModalData) return;
    try {
      setActionLoading(true);
      await api.releaseRepledge(releaseModalData.id, {
        release_date: toISOAtNoon(releaseForm.release_date),
        final_interest_paid: parseFloat(releaseForm.final_interest_paid) || 0,
        person_taking: releaseForm.person_taking || 'Self / Owner',
        remarks: releaseForm.remarks || null
      });

      setReleaseModalData(null);
      await fetchRepledges();
    } catch (err) {
      alert(err.message || 'Failed to release Bank Loan');
    } finally {
      setActionLoading(false);
    }
  };


  const filteredRepledges = repledges.filter(r => {
    // Exclude Released bank loans from Active Re-Pledge Dashboard
    if ((r.status || 'Active') === 'Released') return false;

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (r.loan_number && r.loan_number.toLowerCase().includes(term)) ||
      (r.bank_name && r.bank_name.toLowerCase().includes(term)) ||
      (r.repledger_name && r.repledger_name.toLowerCase().includes(term)) ||
      (r.date_of_loan && r.date_of_loan.includes(term))
    );
  });

  const sortedRepledges = [...filteredRepledges].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === 'date_of_loan') {
      valA = new Date(a.date_of_loan).getTime() || 0;
      valB = new Date(b.date_of_loan).getTime() || 0;
    } else if (sortField === 'amount') {
      valA = Number(a.amount) || 0;
      valB = Number(b.amount) || 0;
    } else if (sortField === 'total_interest_paid') {
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


  // Calculate totals
  const totalBankLoans = filteredRepledges.length;
  const activeBankLoans = filteredRepledges.filter(r => r.status !== 'Released').length;
  const releasedBankLoans = filteredRepledges.filter(r => r.status === 'Released').length;
  const totalRepledgedAmount = filteredRepledges.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const totalLinkedGirvis = filteredRepledges.reduce((sum, r) => sum + (r.girvis?.length || 0), 0);
  const totalInterestPaidAll = filteredRepledges.reduce((sum, r) => {
    const repPaid = r.transactions?.reduce((tSum, t) => tSum + (Number(t.amount) || 0), 0) || 0;
    return sum + repPaid;
  }, 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Loader2 className="spin" size={48} style={{ color: 'var(--primary-color)' }} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      
      {/* Edit Bank Loan Modal */}
      {editModalData && (
        <div 
          onClick={() => setEditModalData(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justify: 'center',
            zIndex: 99999,
            padding: '1rem'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '480px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.5rem',
              borderRadius: '16px',
              background: '#ffffff',
              color: '#0f172a',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Edit size={20} color="var(--brand-primary)" /> Edit Bank Loan #{editModalData.loan_number}
              </h3>
              <button 
                type="button"
                onClick={() => setEditModalData(null)} 
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Bank Name */}
              <div className="input-group" style={{ margin: 0 }}>
                <label htmlFor="edit_bank_name" className="input-label">Bank Name</label>
                <input
                  id="edit_bank_name"
                  name="edit_bank_name"
                  type="text"
                  value={editForm.bank_name}
                  onChange={(e) => setEditForm({ ...editForm, bank_name: e.target.value })}
                  className="input-field"
                  placeholder="e.g. KS / BOB / SBI / MM"
                  required
                />
              </div>

              {/* Loan Number */}
              <div className="input-group" style={{ margin: 0 }}>
                <label htmlFor="edit_loan_number" className="input-label">Bank Loan Number</label>
                <input
                  id="edit_loan_number"
                  name="edit_loan_number"
                  type="text"
                  value={editForm.loan_number}
                  onChange={(e) => setEditForm({ ...editForm, loan_number: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              {/* Repledger Name */}
              <div className="input-group" style={{ margin: 0 }}>
                <label htmlFor="edit_repledger_name" className="input-label">Repledger Name</label>
                <input
                  id="edit_repledger_name"
                  name="edit_repledger_name"
                  type="text"
                  value={editForm.repledger_name}
                  onChange={(e) => setEditForm({ ...editForm, repledger_name: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              {/* Date of Loan */}
              <div className="input-group" style={{ margin: 0 }}>
                <label htmlFor="edit_date_of_loan" className="input-label">Date of Bank Loan</label>
                <input
                  id="edit_date_of_loan"
                  name="edit_date_of_loan"
                  type="date"
                  value={editForm.date_of_loan}
                  onChange={(e) => setEditForm({ ...editForm, date_of_loan: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              {/* Repledge Amount */}
              <div className="input-group" style={{ margin: 0 }}>
                <label htmlFor="edit_amount" className="input-label">Repledge Loan Amount (₹)</label>
                <input
                  id="edit_amount"
                  name="edit_amount"
                  type="number"
                  step="0.01"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  className="input-field"
                  style={{ fontWeight: 700, fontSize: '1rem', color: '#10b981' }}
                  required
                />
              </div>

              {/* Status */}
              <div className="input-group" style={{ margin: 0 }}>
                <label htmlFor="edit_status" className="input-label">Status</label>
                <select
                  id="edit_status"
                  name="edit_status"
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="Active">🟢 Active</option>
                  <option value="Released">🟣 Released</option>
                </select>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditModalData(null)}
                  style={{ flex: 1 }}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, background: 'var(--brand-primary)', color: '#ffffff' }}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="spin" size={18} /> : 'Save Changes'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}


      {/* Release Bank Loan Modal */}
      {releaseModalData && (
        <div 
          onClick={() => setReleaseModalData(null)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            width: '100vw', height: '100vh',
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 99999, padding: '1rem'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '500px',
              maxHeight: '90vh', overflowY: 'auto',
              padding: '1.5rem', borderRadius: '16px',
              background: '#ffffff', color: '#0f172a',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Unlock size={20} color="#8b5cf6" /> Release Bank Loan #{releaseModalData.loan_number}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Bank: <strong>{releaseModalData.bank_name}</strong> | Repledger: <strong>{releaseModalData.repledger_name}</strong></span>
              </div>
              <button 
                type="button"
                onClick={() => setReleaseModalData(null)} 
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Financial Summary Card */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '1rem', border: '1px solid #e2e8f0', marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div style={{ background: '#ecfdf5', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>Principal Loan</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>₹{releaseModalData.amount?.toLocaleString('en-IN')}</div>
              </div>
              <div style={{ background: '#fffbeb', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>Total Interest Paid</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#d97706', marginTop: '2px' }}>
                  ₹{(releaseModalData.transactions?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <form onSubmit={handleReleaseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Release Date */}
              <div className="input-group" style={{ margin: 0 }}>
                <label htmlFor="rel_date" className="input-label">Release / Settlement Date</label>
                <input
                  id="rel_date"
                  name="rel_date"
                  type="date"
                  value={releaseForm.release_date}
                  onChange={(e) => setReleaseForm({ ...releaseForm, release_date: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              {/* Final Interest / Settlement Paid */}
              <div className="input-group" style={{ margin: 0 }}>
                <label htmlFor="rel_final_interest" className="input-label" style={{ color: '#d97706' }}>Final Interest Amount Paid to Bank (₹)</label>
                <input
                  id="rel_final_interest"
                  name="rel_final_interest"
                  type="number"
                  step="1"
                  value={releaseForm.final_interest_paid}
                  onChange={(e) => setReleaseForm({ ...releaseForm, final_interest_paid: e.target.value })}
                  className="input-field"
                  placeholder="0 if no extra interest paid at release"
                  style={{ fontWeight: 700, fontSize: '1rem', color: '#d97706' }}
                />
              </div>

              {/* Person Taking Item / Released By */}
              <div className="input-group" style={{ margin: 0 }}>
                <label htmlFor="rel_person" className="input-label">Person Taking Item / Released By</label>
                <input
                  id="rel_person"
                  name="rel_person"
                  type="text"
                  value={releaseForm.person_taking}
                  onChange={(e) => setReleaseForm({ ...releaseForm, person_taking: e.target.value })}
                  className="input-field"
                  placeholder="e.g. Self / Owner / Ramesh (Agent)"
                  required
                />
              </div>

              {/* Remarks */}
              <div className="input-group" style={{ margin: 0 }}>
                <label htmlFor="rel_remarks" className="input-label">Release Remarks / Audit Note</label>
                <input
                  id="rel_remarks"
                  name="rel_remarks"
                  type="text"
                  value={releaseForm.remarks}
                  onChange={(e) => setReleaseForm({ ...releaseForm, remarks: e.target.value })}
                  className="input-field"
                  placeholder="e.g. Closed loan from bank, items retrieved safely"
                />
              </div>

              {/* Total Settlement Calculation Note */}
              <div style={{ padding: '0.75rem', borderRadius: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', fontSize: '0.825rem', color: '#475569' }}>
                💰 <strong>Total Final Cost to Release Bank Loan:</strong>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#8b5cf6', marginTop: '4px' }}>
                  ₹{((Number(releaseModalData.amount) || 0) + (Number(releaseForm.final_interest_paid) || 0)).toLocaleString('en-IN')}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setReleaseModalData(null)}
                  style={{ flex: 1 }}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, background: '#8b5cf6', color: '#ffffff' }}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="spin" size={18} /> : 'Confirm Bank Release'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>

        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>Bank Re-Pledge Dashboard</h2>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.875rem' }}>Track bank loans and interest payment logs</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => navigate('/repledge-release-ledger')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', borderColor: '#8b5cf6', color: '#8b5cf6', fontWeight: 600 }}
            title="View released bank loans and revert release"
          >
            <CheckCircle size={16} /> Bank Release Ledger
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => navigate('/repledge-interest-ledger')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', borderColor: '#10b981', color: '#10b981', fontWeight: 600 }}
            title="View date-wise interest ledger of all bank loans"
          >
            <Receipt size={16} /> Bank Interest Ledger
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => exportBankRePledges(filteredRepledges)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            title="Export full bank loan statement to Excel / CSV"
          >
            <Download size={16} color="#10b981" /> Export Bank Report
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => exportInterestReport(filteredRepledges)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            title="Export date-wise interest collection log to Excel / CSV"
          >
            <Download size={16} color="#f59e0b" /> Interest Log Report
          </button>

          <div style={{ position: 'relative', minWidth: '220px' }}>
            <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <Search size={16} />
            </div>
            <input 
              id="bank_search"
              name="bank_search"
              type="text" 
              placeholder="Search by loan no, bank, name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '38px', margin: 0, fontSize: '0.85rem' }}
            />
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.725rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Bank Loans</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '0.2rem' }}>{totalBankLoans}</div>
          </div>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
            <Landmark size={18} />
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.725rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Loans</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#10b981', marginTop: '0.2rem' }}>{activeBankLoans}</div>
          </div>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
            <Clock size={18} />
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.725rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Released Loans</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#8b5cf6', marginTop: '0.2rem' }}>{releasedBankLoans}</div>
          </div>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
            <CheckCircle size={18} />
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.725rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Repledge Amount</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#10b981', marginTop: '0.2rem' }}>₹{totalRepledgedAmount.toLocaleString('en-IN')}</div>
          </div>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
            <IndianRupee size={18} />
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.725rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Interest Paid</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#f59e0b', marginTop: '0.2rem' }}>₹{totalInterestPaidAll.toLocaleString('en-IN')}</div>
          </div>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
            <IndianRupee size={18} />
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.725rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Linked Girvis</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#8b5cf6', marginTop: '0.2rem' }}>{totalLinkedGirvis}</div>
          </div>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
            <ExternalLink size={18} />
          </div>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* Main Bank Loans Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
              <tr>
                <th style={{ padding: '1rem', width: '40px' }}></th>
                <th style={{ padding: '1rem', fontWeight: '600', width: '50px', textAlign: 'center' }}>S.No.</th>
                {renderSortHeader('Bank', 'bank_name')}
                {renderSortHeader('Loan No', 'loan_number')}
                {renderSortHeader('Name (Repledger)', 'repledger_name')}
                {renderSortHeader('Date of Loan', 'date_of_loan')}
                {renderSortHeader('Loan Amount', 'amount', 'right')}
                {renderSortHeader('Total Interest Paid', 'total_interest_paid', 'right')}
                {renderSortHeader('Status', 'status', 'center')}
                <th style={{ padding: '1rem', fontWeight: '600', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedRepledges.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {searchTerm ? "No records match your search." : "No bank repledges found. Link girvis to bank loans when creating a new girvi."}
                  </td>
                </tr>
              ) : (
                sortedRepledges.map((repledge, index) => {

                  const inputState = interestInputs[repledge.id] || {
                    amount: '',
                    payment_date: new Date().toISOString().split('T')[0],
                    remarks: ''
                  };
                  const totalPaid = repledge.transactions?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;

                  return (
                    <React.Fragment key={repledge.id}>
                      <tr 
                        style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', backgroundColor: expandedRows.has(repledge.id) ? 'var(--bg-secondary)' : 'transparent', transition: 'background-color 0.2s' }}
                        onClick={() => toggleRow(repledge.id)}
                      >
                        <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                          {expandedRows.has(repledge.id) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </td>
                        <td style={{ padding: '1rem', fontWeight: '600', textAlign: 'center', color: 'var(--text-muted)' }}>
                          {index + 1}
                        </td>
                        <td style={{ padding: '1rem', fontWeight: '600' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Landmark size={16} color="var(--primary-color)" />
                            {repledge.bank_name}
                          </div>
                        </td>
                        <td style={{ padding: '1rem', fontWeight: '500' }}>{repledge.loan_number}</td>
                        <td style={{ padding: '1rem' }}>{repledge.repledger_name}</td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                            <Calendar size={14} color="var(--text-muted)" />
                            {formatDate(repledge.date_of_loan)}
                          </div>
                        </td>
                        <td style={{ padding: '1rem', fontWeight: '700', textAlign: 'right', color: '#10b981' }}>
                          ₹{repledge.amount?.toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '1rem', fontWeight: '700', textAlign: 'right', color: '#f59e0b' }}>
                          ₹{totalPaid.toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <span style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: '99px',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            backgroundColor: repledge.status === 'Released' ? 'rgba(139,92,246,0.15)' : 'rgba(16,185,129,0.15)',
                            color: repledge.status === 'Released' ? '#8b5cf6' : '#10b981'
                          }}>
                            {repledge.status || 'Active'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem', color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                              onClick={(e) => handleOpenEditModal(e, repledge)}
                              disabled={actionLoading}
                              title="Edit Bank Loan details"
                            >
                              <Edit size={14} /> Edit
                            </button>

                            {repledge.status !== 'Released' && (
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem', color: '#8b5cf6', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                onClick={(e) => handleOpenReleaseModal(e, repledge)}
                                disabled={actionLoading}
                                title="Release / Close Bank Loan"
                              >
                                <Unlock size={14} /> Release
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      
                      {/* Expanded Row Content */}
                      {expandedRows.has(repledge.id) && (
                        <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                          <td></td>
                          <td colSpan="9" style={{ padding: '0 1rem 1.5rem 1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                              
                              {/* 1. Mini Ledger: Interest Payments Log */}
                              <div style={{ backgroundColor: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                                <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                  <div style={{ fontWeight: '600', fontSize: '0.875rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <IndianRupee size={16} /> Interest Payment Ledger — Loan #{repledge.loan_number} ({repledge.bank_name})
                                  </div>
                                  <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-primary)', background: 'var(--bg-surface)', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                                    Total Interest Paid: ₹{totalPaid.toLocaleString('en-IN')}
                                  </div>
                                </div>

                                {/* Add Interest Payment Form */}
                                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface-2)' }}>
                                  <form onSubmit={(e) => handleAddInterest(e, repledge.id)} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <div style={{ flex: '1 1 120px' }}>
                                      <input 
                                        id={`interest_amt_${repledge.id}`}
                                        name={`interest_amt_${repledge.id}`}
                                        type="number"
                                        step="0.01"
                                        placeholder="Interest Amt (₹)"
                                        value={inputState.amount}
                                        onChange={(e) => handleInterestInputChange(repledge.id, 'amount', e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="input-field"
                                        style={{ margin: 0, padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                                        required
                                      />
                                    </div>
                                    <div style={{ flex: '1 1 140px' }}>
                                      <input 
                                        id={`payment_date_${repledge.id}`}
                                        name={`payment_date_${repledge.id}`}
                                        type="date"
                                        value={inputState.payment_date}
                                        onChange={(e) => handleInterestInputChange(repledge.id, 'payment_date', e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="input-field"
                                        style={{ margin: 0, padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                                        required
                                      />
                                    </div>
                                    <div style={{ flex: '2 1 180px' }}>
                                      <input 
                                        id={`remarks_${repledge.id}`}
                                        name={`remarks_${repledge.id}`}
                                        type="text"
                                        placeholder="Remarks e.g. Aug Month Interest"
                                        value={inputState.remarks}
                                        onChange={(e) => handleInterestInputChange(repledge.id, 'remarks', e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="input-field"
                                        style={{ margin: 0, padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                                      />
                                    </div>
                                    <button 
                                      type="submit" 
                                      className="btn btn-primary"
                                      disabled={actionLoading}
                                      onClick={(e) => e.stopPropagation()}
                                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}
                                    >
                                      <Plus size={14} /> Add Interest
                                    </button>
                                  </form>
                                </div>

                                {/* Interest Payments List */}
                                {(!repledge.transactions || repledge.transactions.length === 0) ? (
                                  <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                    No interest payments recorded for this bank loan yet.
                                  </div>
                                ) : (
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                    <thead>
                                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                        <th style={{ padding: '0.5rem 1rem', textAlign: 'center', fontWeight: '500', width: '50px' }}>S.No.</th>
                                        <th style={{ padding: '0.5rem 1rem', textAlign: 'left', fontWeight: '500' }}>Date of Payment</th>
                                        <th style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: '500' }}>Interest Paid</th>
                                        <th style={{ padding: '0.5rem 1rem', textAlign: 'left', fontWeight: '500' }}>Remarks</th>
                                        <th style={{ padding: '0.5rem 1rem', textAlign: 'center', fontWeight: '500' }}>Action</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {repledge.transactions.map((t, tIdx) => (
                                        <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                          <td style={{ padding: '0.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>{tIdx + 1}</td>
                                          <td style={{ padding: '0.5rem 1rem', fontWeight: '500' }}>{formatDate(t.payment_date)}</td>
                                          <td style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: '700', color: '#f59e0b' }}>₹{t.amount?.toLocaleString('en-IN')}</td>
                                          <td style={{ padding: '0.5rem 1rem', color: 'var(--text-secondary)' }}>{t.remarks || '-'}</td>
                                          <td style={{ padding: '0.5rem 1rem', textAlign: 'center' }}>
                                            <button 
                                              className="btn btn-secondary" 
                                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                              onClick={(e) => handleDeleteInterest(e, t.id)}
                                              disabled={actionLoading}
                                              title="Delete interest entry if added wrong"
                                            >
                                              <Trash2 size={13} /> Delete
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>

                              {/* 2. Linked Customer Girvis */}
                              <div style={{ backgroundColor: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                                <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(99, 102, 241, 0.1)', borderBottom: '1px solid var(--border-color)', fontWeight: '600', fontSize: '0.875rem', color: 'var(--primary-color)' }}>
                                  Linked Customer Girvis ({repledge.girvis?.length || 0})
                                </div>
                                {(!repledge.girvis || repledge.girvis.length === 0) ? (
                                  <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                    No customer girvis linked to this bank loan.
                                  </div>
                                ) : (
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                    <thead>
                                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                        <th style={{ padding: '0.5rem 1rem', textAlign: 'center', fontWeight: '500', width: '50px' }}>S.No.</th>
                                        <th style={{ padding: '0.5rem 1rem', textAlign: 'left', fontWeight: '500' }}>Pledge No</th>
                                        <th style={{ padding: '0.5rem 1rem', textAlign: 'left', fontWeight: '500' }}>Customer</th>
                                        <th style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: '500' }}>Girvi Value</th>
                                        <th style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: '500' }}>Girvi Loan</th>
                                        <th style={{ padding: '0.5rem 1rem', textAlign: 'center', fontWeight: '500' }}>Action</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {repledge.girvis.map((girvi, gIdx) => (
                                        <tr key={girvi.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                          <td style={{ padding: '0.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>{gIdx + 1}</td>
                                          <td style={{ padding: '0.5rem 1rem', fontWeight: '600' }}>{girvi.pledge_no}</td>
                                          <td style={{ padding: '0.5rem 1rem' }}>{girvi.customer_name}</td>
                                          <td style={{ padding: '0.5rem 1rem', textAlign: 'right' }}>₹{girvi.present_value?.toLocaleString('en-IN') || 0}</td>
                                          <td style={{ padding: '0.5rem 1rem', textAlign: 'right', color: 'var(--primary-color)' }}>₹{girvi.loan_amount?.toLocaleString('en-IN') || 0}</td>
                                          <td style={{ padding: '0.5rem 1rem', textAlign: 'center' }}>
                                            <button 
                                              className="btn btn-secondary" 
                                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/girvi/edit/${girvi.id}`);
                                              }}
                                            >
                                              <ExternalLink size={12} /> View
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
