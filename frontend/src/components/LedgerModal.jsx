import React, { useState, useEffect } from 'react';
import { X, NotebookTabs, Trash2, Loader2 } from 'lucide-react';
import { api } from '../api/client';

export default function LedgerModal({ girvi, onClose, onUpdate }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Form state
  const [txType, setTxType] = useState('PRINCIPAL_PAYMENT');
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, [girvi.id]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await api.getTransactions(girvi.id);
      setTransactions(data);
    } catch (err) {
      setError('Failed to load transaction history.');
    } finally {
      setLoading(false);
    }
  };

  const calculateBalance = (txList) => {
    let balance = girvi.loan_amount;
    txList.forEach(t => {
      if (t.transaction_type === 'PRINCIPAL_PAYMENT') balance -= t.amount;
      if (t.transaction_type === 'TOPUP') balance += t.amount;
    });
    return balance;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    try {
      setSubmitting(true);
      await api.addTransaction(girvi.id, {
        transaction_type: txType,
        amount: parseFloat(amount),
        remarks: remarks || null
      });
      await fetchTransactions();
      setAmount('');
      setRemarks('');
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err.message || 'Failed to add transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (txId) => {
    if (!window.confirm('Are you sure you want to delete this transaction? This cannot be undone.')) return;
    try {
      setDeletingId(txId);
      await api.deleteTransaction(txId);
      await fetchTransactions();
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err.message || 'Failed to delete transaction');
    } finally {
      setDeletingId(null);
    }
  };

  const getTxTypeLabel = (type) => {
    switch(type) {
      case 'PRINCIPAL_PAYMENT': return 'Principal Paid';
      case 'INTEREST_PAID': return 'Interest Paid';
      case 'TOPUP': return 'Topup';
      default: return type;
    }
  };

  const getTxColor = (type) => {
    switch(type) {
      case 'TOPUP': return { color: '#ef4444', bg: '#fef2f2' };
      case 'PRINCIPAL_PAYMENT': return { color: '#10b981', bg: '#ecfdf5' };
      case 'INTEREST_PAID': return { color: '#f59e0b', bg: '#fffbeb' };
      default: return { color: '#64748b', bg: '#f1f5f9' };
    }
  };

  const currentBalance = calculateBalance(transactions);

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        zIndex: 9999,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        padding: '1rem'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        backgroundColor: 'var(--surface)',
        borderRadius: 'var(--radius-xl)',
        width: '100%', maxWidth: '620px',
        maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>

        {/* ── Sticky Header ── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          backgroundColor: 'var(--surface)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              backgroundColor: 'var(--primary-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <NotebookTabs size={20} color="var(--primary)" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '700' }}>
                Ledger Book — {girvi.pledge_no}
              </h3>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                {girvi.customer_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--surface-hover)', border: '1px solid var(--border)',
              borderRadius: '8px', cursor: 'pointer', color: 'var(--text-muted)',
              width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 150ms ease', flexShrink: 0
            }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Balance Bar ── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1rem 1.5rem',
          backgroundColor: 'var(--surface-hover)',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Original Loan</div>
            <div style={{ fontSize: '1.125rem', fontWeight: '700' }}>₹{(girvi.loan_amount || 0).toLocaleString('en-IN')}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Balance</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary)' }}>
              ₹{currentBalance.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div style={{ overflowY: 'auto', padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* New Transaction Form */}
          <div style={{
            backgroundColor: 'var(--surface-hover)', borderRadius: '12px',
            padding: '1.25rem', border: '1px solid var(--border)'
          }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9375rem', fontWeight: '600' }}>Record New Transaction</h4>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="input-group">
                  <label className="input-label">Transaction Type</label>
                  <select
                    value={txType}
                    onChange={(e) => setTxType(e.target.value)}
                    className="input-field"
                    required
                  >
                    <option value="PRINCIPAL_PAYMENT">Principal Part Payment</option>
                    <option value="INTEREST_PAID">Interest Paid</option>
                    <option value="TOPUP">Topup (Add to Loan)</option>
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label">Amount (₹)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input-field"
                    placeholder="Enter amount"
                    min="1"
                    required
                  />
                </div>

                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="input-label">Remarks (Optional)</label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="input-field"
                    placeholder="E.g. Cash paid by son"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Recording...</> : 'Record Transaction'}
                </button>
              </div>
            </form>
          </div>

          {/* Transaction History */}
          <div>
            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9375rem', fontWeight: '600' }}>Transaction History</h4>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : error ? (
              <div style={{ color: 'red', padding: '1rem' }}>{error}</div>
            ) : transactions.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '2rem',
                backgroundColor: 'var(--surface-hover)', borderRadius: '8px',
                color: 'var(--text-muted)', border: '1px solid var(--border)'
              }}>
                No transactions recorded yet.
              </div>
            ) : (
              <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                    <tr>
                      <th style={{ padding: '0.625rem 1rem', fontWeight: '600', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '0.625rem 1rem', fontWeight: '600', textAlign: 'left' }}>Type</th>
                      <th style={{ padding: '0.625rem 1rem', fontWeight: '600', textAlign: 'left' }}>Remarks</th>
                      <th style={{ padding: '0.625rem 1rem', fontWeight: '600', textAlign: 'right' }}>Amount</th>
                      <th style={{ padding: '0.625rem 0.75rem', fontWeight: '600', textAlign: 'center' }}>Del</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t) => {
                      const c = getTxColor(t.transaction_type);
                      return (
                        <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                            {new Date(t.transaction_date).toLocaleDateString('en-GB')}
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{
                              color: c.color, backgroundColor: c.bg,
                              padding: '2px 8px', borderRadius: '4px',
                              fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap'
                            }}>
                              {getTxTypeLabel(t.transaction_type)}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{t.remarks || '—'}</td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '700' }}>
                            ₹{t.amount.toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>
                            <button
                              onClick={() => handleDelete(t.id)}
                              disabled={deletingId === t.id}
                              style={{
                                background: 'none', border: '1px solid #fca5a5',
                                borderRadius: '6px', cursor: 'pointer',
                                color: '#ef4444', width: '30px', height: '30px',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 150ms ease'
                              }}
                              title="Delete this transaction"
                            >
                              {deletingId === t.id
                                ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                                : <Trash2 size={13} />
                              }
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Sticky Footer ── */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'flex-end',
          flexShrink: 0, backgroundColor: 'var(--surface)'
        }}>
          <button onClick={onClose} className="btn btn-secondary">
            Close Ledger
          </button>
        </div>
      </div>
    </div>
  );
}
