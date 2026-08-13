import React, { useState, useEffect } from 'react';
import { X, Plus, Calendar, IndianRupee, NotebookTabs } from 'lucide-react';
import { api } from '../api/client';

export default function LedgerModal({ girvi, onClose, onUpdate }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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

  const calculateBalance = () => {
    let balance = girvi.loan_amount;
    transactions.forEach(t => {
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
      const newTx = {
        transaction_type: txType,
        amount: parseFloat(amount),
        remarks: remarks || null
      };

      await api.addTransaction(girvi.id, newTx);
      
      // Refresh transactions
      await fetchTransactions();
      
      // Reset form
      setAmount('');
      setRemarks('');
      
      // Notify parent to refresh if needed
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err.message || 'Failed to add transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const getTxTypeLabel = (type) => {
    switch(type) {
      case 'PRINCIPAL_PAYMENT': return 'Principal Paid';
      case 'INTEREST_PAID': return 'Interest Paid';
      case 'TOPUP': return 'Topup (Loan Added)';
      default: return type;
    }
  };

  const currentBalance = calculateBalance();

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 9999,
      display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '600px',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)'
      }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <NotebookTabs size={24} color="var(--primary)" />
              Ledger Book: {girvi.pledge_no}
            </h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Customer: {girvi.customer_name}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
          
          {/* Balance Overview */}
          <div style={{ padding: '1.5rem', backgroundColor: 'var(--surface-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '500' }}>Original Loan Amount</div>
              <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>₹{girvi.loan_amount.toLocaleString()}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '500' }}>Current Balance</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary)' }}>₹{currentBalance.toLocaleString()}</div>
            </div>
          </div>

          <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
            {/* Add Transaction Form */}
            <form onSubmit={handleSubmit} style={{ backgroundColor: 'var(--surface-hover)', padding: '1.25rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid var(--border)' }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '600' }}>Record New Transaction</h4>
              
              <div className="grid">
                <div className="form-group">
                  <label>Transaction Type</label>
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
                
                <div className="form-group">
                  <label>Amount (₹)</label>
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

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Remarks (Optional)</label>
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
                  {submitting ? 'Recording...' : 'Record Transaction'}
                </button>
              </div>
            </form>

            {/* Transaction History */}
            <div>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '600' }}>Transaction History</h4>
              
              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading history...</div>
              ) : error ? (
                <div style={{ color: 'red' }}>{error}</div>
              ) : transactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: 'var(--surface-hover)', borderRadius: '8px', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  No transactions recorded yet.
                </div>
              ) : (
                <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                    <thead style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                      <tr>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Date</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Type</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Remarks</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: '600', textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((t) => (
                        <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                            {new Date(t.transaction_date).toLocaleDateString('en-GB')}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: '500' }}>
                            <span style={{ 
                              color: t.transaction_type === 'TOPUP' ? '#ef4444' : 
                                     t.transaction_type === 'PRINCIPAL_PAYMENT' ? '#10b981' : '#f59e0b',
                              backgroundColor: t.transaction_type === 'TOPUP' ? '#fef2f2' : 
                                               t.transaction_type === 'PRINCIPAL_PAYMENT' ? '#ecfdf5' : '#fffbeb',
                              padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem'
                            }}>
                              {getTxTypeLabel(t.transaction_type)}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{t.remarks || '-'}</td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '600' }}>
                            ₹{t.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
