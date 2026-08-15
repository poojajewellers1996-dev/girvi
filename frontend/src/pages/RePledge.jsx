import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Loader2, ChevronDown, ChevronUp, ExternalLink, Calendar, Landmark, Search, Plus, Trash2, IndianRupee, Unlock, CheckCircle, Clock, Download, Edit, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { exportBankRePledges, exportInterestReport } from '../utils/exportUtils';

export default function RePledge() {
  const [repledges, setRepledges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

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

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Open Edit Modal with selected repledge data
  const handleOpenEditModal = (e, repledge) => {
    e.stopPropagation();
    setEditModalData(repledge);
    setEditForm({
      bank_name: repledge.bank_name || '',
      loan_number: repledge.loan_number || '',
      repledger_name: repledge.repledger_name || '',
      date_of_loan: repledge.date_of_loan ? new Date(repledge.date_of_loan).toISOString().split('T')[0] : '',
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
        date_of_loan: editForm.date_of_loan ? new Date(editForm.date_of_loan).toISOString() : null,
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
        payment_date: input.payment_date ? new Date(input.payment_date).toISOString() : new Date().toISOString(),
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

  const handleReleaseRepledge = async (e, id, loanNo) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to release / close Bank Loan #${loanNo}?`)) return;
    try {
      setActionLoading(true);
      await api.releaseRepledge(id);
      await fetchRepledges();
    } catch (err) {
      alert(err.message || 'Failed to release Bank Loan');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRepledges = repledges.filter(r => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (r.loan_number && r.loan_number.toLowerCase().includes(term)) ||
      (r.bank_name && r.bank_name.toLowerCase().includes(term)) ||
      (r.repledger_name && r.repledger_name.toLowerCase().includes(term)) ||
      (r.date_of_loan && r.date_of_loan.includes(term))
    );
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
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1rem',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="card" style={{
            width: '100%', maxWidth: '480px',
            padding: '1.5rem', borderRadius: '16px',
            background: 'var(--bg-surface)',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Edit size={20} color="var(--brand-primary)" /> Edit Bank Loan #{editModalData.loan_number}
              </h3>
              <button onClick={() => setEditModalData(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
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
                  style={{ flex: 1, background: 'var(--gradient-brand)' }}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="spin" size={18} /> : 'Save Changes'}
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
                <th style={{ padding: '1rem', fontWeight: '600' }}>Bank</th>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Loan No</th>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Name (Repledger)</th>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Date of Loan</th>
                <th style={{ padding: '1rem', fontWeight: '600', textAlign: 'right' }}>Loan Amount</th>
                <th style={{ padding: '1rem', fontWeight: '600', textAlign: 'right' }}>Total Interest Paid</th>
                <th style={{ padding: '1rem', fontWeight: '600', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '1rem', fontWeight: '600', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRepledges.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {searchTerm ? "No records match your search." : "No bank repledges found. Link girvis to bank loans when creating a new girvi."}
                  </td>
                </tr>
              ) : (
                filteredRepledges.map((repledge) => {
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
                                onClick={(e) => handleReleaseRepledge(e, repledge.id, repledge.loan_number)}
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
                          <td colSpan="8" style={{ padding: '0 1rem 1.5rem 1rem' }}>
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
                                        <th style={{ padding: '0.5rem 1rem', textAlign: 'left', fontWeight: '500' }}>Date of Payment</th>
                                        <th style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: '500' }}>Interest Paid</th>
                                        <th style={{ padding: '0.5rem 1rem', textAlign: 'left', fontWeight: '500' }}>Remarks</th>
                                        <th style={{ padding: '0.5rem 1rem', textAlign: 'center', fontWeight: '500' }}>Action</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {repledge.transactions.map(t => (
                                        <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
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
                                        <th style={{ padding: '0.5rem 1rem', textAlign: 'left', fontWeight: '500' }}>Pledge No</th>
                                        <th style={{ padding: '0.5rem 1rem', textAlign: 'left', fontWeight: '500' }}>Customer</th>
                                        <th style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: '500' }}>Girvi Value</th>
                                        <th style={{ padding: '0.5rem 1rem', textAlign: 'right', fontWeight: '500' }}>Girvi Loan</th>
                                        <th style={{ padding: '0.5rem 1rem', textAlign: 'center', fontWeight: '500' }}>Action</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {repledge.girvis.map(girvi => (
                                        <tr key={girvi.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
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
