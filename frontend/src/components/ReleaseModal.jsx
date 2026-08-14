import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Calculator, IndianRupee, Loader2 } from 'lucide-react';

export default function ReleaseModal({ girvi, onClose, onConfirm, loading }) {
  if (!girvi) return null;

  // Detect metal type from articles
  const articleNames = girvi.articles?.map(a => (a.name || '').toLowerCase()).join(' ') || '';
  const isSilver = articleNames.includes('silver');
  const defaultRate = isSilver ? 10.0 : 3.0;

  const [rate, setRate] = useState(defaultRate);
  const [releaseDate, setReleaseDate] = useState(new Date().toISOString().split('T')[0]);

  // Calculate elapsed months (Month-ceiling logic: 1 day into next month counts as full month, min 1 month)
  const calculateMonths = (pDateStr, rDateStr) => {
    if (!pDateStr || !rDateStr) return 1;
    const pDate = new Date(pDateStr);
    const rDate = new Date(rDateStr);

    let mDiff = (rDate.getFullYear() - pDate.getFullYear()) * 12 + (rDate.getMonth() - pDate.getMonth());
    if (rDate.getDate() > pDate.getDate()) {
      mDiff += 1;
    }
    return Math.max(1, mDiff);
  };

  const months = calculateMonths(girvi.pledge_date, releaseDate);
  const loanAmount = Number(girvi.loan_amount) || 0;

  // Auto-calculated interest & total
  const initialInterest = Math.round((loanAmount * defaultRate * months) / 100);
  const [interestAmount, setInterestAmount] = useState(initialInterest);
  const [totalAmount, setTotalAmount] = useState(loanAmount + initialInterest);

  // Recalculate when rate or release date changes
  useEffect(() => {
    const calcMonths = calculateMonths(girvi.pledge_date, releaseDate);
    const newInterest = Math.round((loanAmount * Number(rate || 0) * calcMonths) / 100);
    setInterestAmount(newInterest);
    setTotalAmount(loanAmount + newInterest);
  }, [rate, releaseDate, girvi.pledge_date, loanAmount]);

  // Sync total when interest is edited
  const handleInterestChange = (val) => {
    const numInt = Number(val) || 0;
    setInterestAmount(val);
    setTotalAmount(loanAmount + numInt);
  };

  // Sync interest when total is edited
  const handleTotalChange = (val) => {
    const numTotal = Number(val) || 0;
    setTotalAmount(val);
    setInterestAmount(Math.max(0, numTotal - loanAmount));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({
      rate: Number(rate),
      months,
      interest: Number(interestAmount),
      total: Number(totalAmount)
    });
  };

  return (
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
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Calculator size={20} color="var(--brand-primary)" /> Release Girvi #{girvi.pledge_no}
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Customer: <strong>{girvi.customer_name}</strong></span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Metal Badge & Date Info */}
          <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Metal Type</div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: isSilver ? '#94a3b8' : '#d97706' }}>
                {isSilver ? '🥈 Silver (Default 10%)' : '🥇 Gold (Default 3%)'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Duration</div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--brand-primary)' }}>
                {months} Month{months > 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Release Date */}
          <div className="input-group" style={{ margin: 0 }}>
            <label htmlFor="release_date" className="input-label">Release Date</label>
            <input
              id="release_date"
              name="release_date"
              type="date"
              value={releaseDate}
              onChange={(e) => setReleaseDate(e.target.value)}
              className="input-field"
              required
            />
          </div>

          {/* Monthly Interest Rate */}
          <div className="input-group" style={{ margin: 0 }}>
            <label htmlFor="interest_rate" className="input-label">Interest Rate (% per month)</label>
            <input
              id="interest_rate"
              name="interest_rate"
              type="number"
              step="0.1"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="input-field"
              required
            />
          </div>

          {/* Principal Loan Amount (Non-Editable) */}
          <div className="input-group" style={{ margin: 0 }}>
            <label htmlFor="principal_loan_amount" className="input-label">Principal Loan Amount (Non-Editable)</label>
            <input
              id="principal_loan_amount"
              name="principal_loan_amount"
              type="text"
              value={`₹${loanAmount.toLocaleString('en-IN')}`}
              readOnly
              className="input-field"
              style={{ backgroundColor: 'var(--bg-surface-3)', opacity: 0.85, fontWeight: 700, cursor: 'not-allowed' }}
            />
          </div>

          {/* Interest Amount (Editable) */}
          <div className="input-group" style={{ margin: 0 }}>
            <label htmlFor="interest_amount" className="input-label" style={{ color: '#d97706' }}>Calculated Interest Amount (Editable ₹)</label>
            <input
              id="interest_amount"
              name="interest_amount"
              type="number"
              step="1"
              value={interestAmount}
              onChange={(e) => handleInterestChange(e.target.value)}
              className="input-field"
              style={{ borderColor: '#d97706', fontWeight: 700, fontSize: '1rem', color: '#d97706' }}
              required
            />
          </div>

          {/* Total Payable Amount (Editable) */}
          <div className="input-group" style={{ margin: 0 }}>
            <label htmlFor="total_collect_amount" className="input-label" style={{ color: '#059669' }}>Total Collect Amount (Editable ₹)</label>
            <input
              id="total_collect_amount"
              name="total_collect_amount"
              type="number"
              step="1"
              value={totalAmount}
              onChange={(e) => handleTotalChange(e.target.value)}
              className="input-field"
              style={{ borderColor: '#059669', fontWeight: 800, fontSize: '1.1rem', color: '#059669' }}
              required
            />
          </div>


          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ flex: 1 }}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1, background: 'var(--gradient-brand)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem' }}
              disabled={loading}
            >
              {loading ? <Loader2 className="spin" size={18} /> : <CheckCircle size={18} />}
              Confirm Release
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
