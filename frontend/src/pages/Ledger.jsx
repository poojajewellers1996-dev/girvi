import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Loader2, Calendar, Trash2, Edit, Unlock, NotebookTabs, X, Search, IndianRupee, Percent, TrendingUp, AlertCircle } from 'lucide-react';
import LedgerModal from '../components/LedgerModal';

/* ─── Interest Calculation Helpers ─────────────────────────── */

/**
 * Returns the number of elapsed "billing months" using ceiling logic:
 * - 0 days elapsed → 0 months (but we treat as 1 if any partial month)
 * - 1 day – 31 days → 1 month
 * - pledge_date to same date next month → 1 month
 * - One day past that → 2 months, etc.
 *
 * Rule: ceil the number of months. Even 1 day into a new month = full month charged.
 */
function calcMonthsCeiling(pledgeDate) {
  const start = new Date(pledgeDate);
  const now = new Date();

  // Difference in total months (integer part)
  let months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());

  // Check if same-date-next-month anniversary has passed
  const anniversary = new Date(start);
  anniversary.setMonth(anniversary.getMonth() + months);

  if (now < anniversary) {
    // Haven't yet reached the anniversary → still in that previous month
    months = Math.max(months, 0);
  } else if (now > anniversary) {
    // Past the anniversary → one more partial month started → ceil
    months = months + 1;
  }
  // now === anniversary → exactly on the date, no extra month

  return Math.max(months, 1); // always charge at least 1 month
}

/**
 * Detect the dominant metal from article names.
 * Returns 'silver' if any article name contains 'silver', else 'gold'.
 */
function detectMetal(articles = []) {
  const names = articles.map(a => (a.name || '').toLowerCase()).join(' ');
  return names.includes('silver') ? 'silver' : 'gold';
}

/* ─── Release Modal ─────────────────────────────────────────── */
function ReleaseModal({ girvi, onClose, onConfirm, loading }) {
  const metal = detectMetal(girvi.articles);
  const defaultRate = metal === 'silver' ? 10 : 3;

  const [ratePercent, setRatePercent] = useState(defaultRate);
  const [metalType, setMetalType] = useState(metal);

  const months = calcMonthsCeiling(girvi.pledge_date);
  const principal = Number(girvi.loan_amount) || 0;

  // Editable interest & total — seeded from auto-calculation
  const calcInterest = (rate) => +(principal * (Number(rate) / 100) * months).toFixed(2);
  const [interestVal, setInterestVal] = useState(() => calcInterest(defaultRate));
  const [totalVal, setTotalVal] = useState(() => +(principal + calcInterest(defaultRate)).toFixed(2));

  const pledgeDateFmt = new Date(girvi.pledge_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const todayFmt = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  // When rate changes → recalculate both
  function handleRateChange(val) {
    setRatePercent(val);
    const newInt = calcInterest(val);
    setInterestVal(newInt);
    setTotalVal(+(principal + newInt).toFixed(2));
  }

  // When metal toggle changes → reset rate and recalculate
  function handleMetalChange(m) {
    setMetalType(m);
    const newRate = m === 'silver' ? 10 : 3;
    setRatePercent(newRate);
    const newInt = calcInterest(newRate);
    setInterestVal(newInt);
    setTotalVal(+(principal + newInt).toFixed(2));
  }

  // User edits INTEREST → sync total
  function handleInterestChange(val) {
    setInterestVal(val);
    const i = Number(val) || 0;
    setTotalVal(+(principal + i).toFixed(2));
  }

  // User edits TOTAL → sync interest
  function handleTotalChange(val) {
    setTotalVal(val);
    const t = Number(val) || 0;
    setInterestVal(+(t - principal).toFixed(2));
  }

  // Reset to auto-calculated values
  function handleReset() {
    const newInt = calcInterest(ratePercent);
    setInterestVal(newInt);
    setTotalVal(+(principal + newInt).toFixed(2));
  }

  const interest = Number(interestVal) || 0;
  const total = Number(totalVal) || 0;
  const isModified = Math.abs(interest - calcInterest(ratePercent)) > 0.01;

  const inputRowStyle = {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', padding: '0.1rem 0.75rem',
  };
  const inputStyle = {
    flex: 1, background: 'transparent', border: 'none', outline: 'none',
    color: 'var(--text-primary)', fontFamily: 'var(--font-sans)',
    fontSize: '0.95rem', fontWeight: 600, padding: '0.55rem 0',
  };
  const labelStyle = {
    fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '0.4rem',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
      animation: 'fadeIn 0.2s ease-out',
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-xl)',
        width: '100%',
        maxWidth: '460px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(99,102,241,0.15)',
        overflow: 'hidden',
        animation: 'fadeInUp 0.25s cubic-bezier(0.16,1,0.3,1)',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          padding: '1.1rem 1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Unlock size={18} color="#fff" />
            <span style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>Release Girvi</span>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', borderRadius: '6px', padding: '4px 6px', color: '#fff', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Customer Info */}
          <div style={{ background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{girvi.customer_name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Pledge #{girvi.pledge_no}</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <div>{pledgeDateFmt} → {todayFmt}</div>
              <div style={{ color: '#f59e0b', fontWeight: 600, marginTop: '2px' }}>{months} month{months !== 1 ? 's' : ''} elapsed</div>
            </div>
          </div>

          {/* Metal Type + Rate row */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {/* Metal selector */}
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Metal Type</label>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {['gold', 'silver'].map(m => (
                  <button key={m} onClick={() => handleMetalChange(m)} style={{
                    flex: 1, padding: '0.45rem 0', borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${metalType === m ? (m === 'gold' ? '#f59e0b' : '#94a3b8') : 'var(--border)'}`,
                    background: metalType === m ? (m === 'gold' ? 'rgba(245,158,11,0.12)' : 'rgba(148,163,184,0.12)') : 'var(--bg-surface-2)',
                    color: metalType === m ? (m === 'gold' ? '#f59e0b' : '#94a3b8') : 'var(--text-secondary)',
                    fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.15s', textTransform: 'capitalize',
                  }}>
                    {m === 'gold' ? '🥇' : '🥈'} {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Rate % */}
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Rate % / month</label>
              <div style={inputRowStyle}>
                <Percent size={13} color="var(--text-muted)" />
                <input type="number" min="0" step="0.1" value={ratePercent}
                  onChange={e => handleRateChange(e.target.value)}
                  style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid var(--border)', margin: '0 -0.25rem' }} />

          {/* Three fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

            {/* Loan Amount — locked */}
            <div>
              <label style={labelStyle}>
                <span>Loan Amount (Principal)</span>
                <span style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1', borderRadius: '4px', padding: '1px 6px', fontSize: '0.65rem', fontWeight: 700 }}>LOCKED</span>
              </label>
              <div style={{ ...inputRowStyle, opacity: 0.6, cursor: 'not-allowed' }}>
                <IndianRupee size={13} color="var(--text-muted)" />
                <input type="number" value={principal} readOnly
                  style={{ ...inputStyle, cursor: 'not-allowed' }} />
              </div>
            </div>

            {/* Interest — editable */}
            <div>
              <label style={labelStyle}>
                <span>Interest ({ratePercent}% × {months} mo)</span>
                {isModified && (
                  <button onClick={handleReset} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#f59e0b', fontSize: '0.65rem', fontWeight: 700, padding: '1px 4px',
                    display: 'flex', alignItems: 'center', gap: '3px',
                  }}>↺ Reset</button>
                )}
              </label>
              <div style={{ ...inputRowStyle, borderColor: isModified ? 'rgba(245,158,11,0.5)' : 'var(--border)' }}>
                <IndianRupee size={13} color={isModified ? '#f59e0b' : 'var(--text-muted)'} />
                <input type="number" min="0" step="1" value={interestVal}
                  onChange={e => handleInterestChange(e.target.value)}
                  style={{ ...inputStyle, color: isModified ? '#f59e0b' : 'var(--text-primary)' }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>editable</span>
              </div>
            </div>

            {/* Total — editable, highlighted */}
            <div>
              <label style={labelStyle}>
                <span>Total to Collect</span>
                <span style={{ background: 'rgba(99,102,241,0.12)', color: '#8b5cf6', borderRadius: '4px', padding: '1px 6px', fontSize: '0.65rem', fontWeight: 700 }}>= PRINCIPAL + INTEREST</span>
              </label>
              <div style={{ ...inputRowStyle, border: '2px solid rgba(99,102,241,0.5)', background: 'rgba(99,102,241,0.06)' }}>
                <IndianRupee size={14} color="#6366f1" />
                <input type="number" min="0" step="1" value={totalVal}
                  onChange={e => handleTotalChange(e.target.value)}
                  style={{ ...inputStyle, fontSize: '1.1rem', color: '#8b5cf6' }} />
              </div>
            </div>
          </div>

          {/* Info note */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem' }}>
            <AlertCircle size={13} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Interest &amp; total are editable — adjust if the customer pays more or less. Editing either field syncs the other automatically.
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }} disabled={loading}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => onConfirm({ rate: ratePercent, months, interest, total })}
              style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              disabled={loading}
            >
              {loading ? <Loader2 size={16} className="spin" /> : <Unlock size={16} />}
              {loading ? 'Releasing…' : `Confirm — ₹${Number(total).toLocaleString('en-IN')}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}




/* ─── Ledger Page ────────────────────────────────────────────── */
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
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => { fetchGirvis(); }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return '#10b981';
      case 'Released': return '#8b5cf6';
      default: return 'var(--text-muted)';
    }
  };

  const filteredGirvis = girvis.filter(g => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const articleNames = g.articles?.map(a => a.name.toLowerCase()).join(' ') || '';
    return (
      (g.pledge_no && g.pledge_no.toLowerCase().includes(term)) ||
      (g.customer_name && g.customer_name.toLowerCase().includes(term)) ||
      (g.relation_name && g.relation_name.toLowerCase().includes(term)) ||
      (g.mobile_number && g.mobile_number.includes(term)) ||
      (g.pledge_date && g.pledge_date.includes(term)) ||
      articleNames.includes(term)
    );
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>Girvi Ledger</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: '250px' }}>
            <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Search by name, number, date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '40px', margin: 0 }}
            />
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/girvi/new')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={20} /> New Girvi
          </button>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

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
                    {searchTerm ? 'No records match your search.' : 'No records found. Click "New Girvi" to create one.'}
                  </td>
                </tr>
              ) : (
                filteredGirvis.map((girvi) => (
                  <tr key={girvi.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '1rem', fontWeight: '600' }}>{girvi.pledge_no}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{girvi.customer_name}</div>
                      {(girvi.relation_type || girvi.relation_name) && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {girvi.relation_type} {girvi.relation_name}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: '500', whiteSpace: 'nowrap' }}>
                      {girvi.mobile_number ? girvi.mobile_number.replace('+91', '') : '-'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {girvi.articles && girvi.articles.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {girvi.articles.map((art, idx) => (
                            <div key={idx} style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                              {art.name} {art.quantity > 1 ? `(${art.quantity})` : ''}
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

      {/* Ledger Transactions Modal */}
      {showLedgerModal && activeGirvi && (
        <LedgerModal
          girvi={activeGirvi}
          onClose={() => setShowLedgerModal(false)}
          onUpdate={fetchGirvis}
        />
      )}

      {/* Release Modal */}
      {releaseGirvi && (
        <ReleaseModal
          girvi={releaseGirvi}
          loading={releaseLoading}
          onClose={() => setReleaseGirvi(null)}
          onConfirm={handleReleaseConfirm}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes fadeInUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}

