import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { 
  PackageCheck, ArrowLeft, Search, CheckCircle, RotateCcw, 
  ArrowRight, Printer, ShieldAlert, Award, Layers, Loader2,
  Clock, Calendar, Filter, Sparkles
} from 'lucide-react';

export default function StockCheck() {
  const navigate = useNavigate();
  const [girvis, setGirvis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [metalType, setMetalType] = useState('gold'); // 'gold' | 'silver'
  const [searchTerm, setSearchTerm] = useState('');
  const [checkedMap, setCheckedMap] = useState({}); // { [girviId]: true }
  const [scanMessage, setScanMessage] = useState(null);
  const [justCheckedId, setJustCheckedId] = useState(null);
  const [lastAuditTime, setLastAuditTime] = useState('');

  // Date Range Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [datePreset, setDatePreset] = useState('ALL');

  // Web Audio API Beep Synthesizer
  const playCheckBeep = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      // Pleasant high-pitch double chime
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  };

  // Fetch all Girvis on mount
  useEffect(() => {
    fetchGirvis();
  }, []);

  const fetchGirvis = async () => {
    try {
      setLoading(true);
      const data = await api.getGirvis();
      setGirvis(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch Girvi records');
    } finally {
      setLoading(false);
    }
  };

  // Load saved audit progress & last audit timestamp from localStorage
  useEffect(() => {
    try {
      const savedMap = localStorage.getItem('girvi_stock_checked_ids');
      if (savedMap) {
        setCheckedMap(JSON.parse(savedMap));
      }
      const savedTime = localStorage.getItem('girvi_stock_last_audit_time');
      if (savedTime) {
        setLastAuditTime(savedTime);
      }
    } catch (e) {
      console.error('Failed to load saved stock audit state', e);
    }
  }, []);

  // Save progress to localStorage
  const updateCheckedMap = (newMap) => {
    setCheckedMap(newMap);
    try {
      localStorage.setItem('girvi_stock_checked_ids', JSON.stringify(newMap));
    } catch (e) {
      console.error('Failed to save stock audit state', e);
    }
  };

  // Update Last Audit Timestamp
  const updateAuditTimestamp = () => {
    const formatted = new Date().toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
    setLastAuditTime(formatted);
    try {
      localStorage.setItem('girvi_stock_last_audit_time', formatted);
    } catch (e) {}
  };

  // Date Preset Handler
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

  // Helper to determine if a Girvi is silver vs gold
  const isGirviSilver = (g) => {
    const names = g.articles?.map(a => (a.name || '').toLowerCase()).join(' ') || '';
    return names.includes('silver');
  };

  // 1. Filter ONLY Non-repledged Active Girvis
  const nonRepledgedGirvis = useMemo(() => {
    return girvis.filter(g => {
      const isActive = (g.status || 'Active') === 'Active';
      const isNotRepledged = !g.repledges || g.repledges.length === 0;
      return isActive && isNotRepledged;
    });
  }, [girvis]);

  // 2. Filter by selected Metal Type (Gold vs Silver)
  const currentMetalGirvis = useMemo(() => {
    return nonRepledgedGirvis.filter(g => {
      const isSilv = isGirviSilver(g);
      return metalType === 'silver' ? isSilv : !isSilv;
    });
  }, [nonRepledgedGirvis, metalType]);

  // 3. Separate into Unchecked (Left side) and Checked (Right side)
  const { pendingItems, checkedItems } = useMemo(() => {
    const pending = [];
    const checked = [];

    currentMetalGirvis.forEach(g => {
      if (checkedMap[g.id]) {
        checked.push(g);
      } else {
        pending.push(g);
      }
    });

    return { pendingItems: pending, checkedItems: checked };
  }, [currentMetalGirvis, checkedMap]);

  // 4. Filter Pending Items by Search Term & Date Range
  const filteredPendingItems = useMemo(() => {
    return pendingItems.filter(g => {
      // Search text match
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const pMatch = g.pledge_no && g.pledge_no.toLowerCase().includes(term);
        const cMatch = g.customer_name && g.customer_name.toLowerCase().includes(term);
        const aMatch = g.articles && g.articles.some(a => a.name && a.name.toLowerCase().includes(term));
        if (!pMatch && !cMatch && !aMatch) return false;
      }

      // Date Range Match
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
  }, [pendingItems, searchTerm, fromDate, toDate]);

  // Total weight calculations for stats
  const calculateTotalWeight = (items) => {
    return items.reduce((sum, g) => {
      const itemWeight = g.articles?.reduce((artSum, a) => artSum + (Number(a.net_wt) || 0), 0) || 0;
      return sum + itemWeight;
    }, 0);
  };

  const totalMetalItemsCount = currentMetalGirvis.length;
  const totalMetalWeight = calculateTotalWeight(currentMetalGirvis);
  const checkedWeight = calculateTotalWeight(checkedItems);
  const pendingWeight = calculateTotalWeight(pendingItems);
  const progressPercent = totalMetalItemsCount > 0 ? Math.round((checkedItems.length / totalMetalItemsCount) * 100) : 0;

  // Handlers with Audio Beep & Flash Effect
  const handleCheck = (girviId) => {
    playCheckBeep();
    setJustCheckedId(girviId);
    const updated = { ...checkedMap, [girviId]: true };
    updateCheckedMap(updated);
    updateAuditTimestamp();
    setTimeout(() => setJustCheckedId(null), 1200);
  };

  const handleUncheck = (girviId) => {
    const updated = { ...checkedMap };
    delete updated[girviId];
    updateCheckedMap(updated);
    updateAuditTimestamp();
  };

  const handleCheckAllCurrent = () => {
    if (!window.confirm(`Mark all ${filteredPendingItems.length} pending ${metalType.toUpperCase()} items as checked?`)) return;
    playCheckBeep();
    const updated = { ...checkedMap };
    filteredPendingItems.forEach(g => {
      updated[g.id] = true;
    });
    updateCheckedMap(updated);
    updateAuditTimestamp();
  };

  const handleResetCurrent = () => {
    if (!window.confirm(`Reset verification status for ${metalType.toUpperCase()} items?`)) return;
    const updated = { ...checkedMap };
    currentMetalGirvis.forEach(g => {
      delete updated[g.id];
    });
    updateCheckedMap(updated);
  };

  // Quick search scan on Enter key
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const match = pendingItems.find(g => g.pledge_no && g.pledge_no.toLowerCase() === term);
      if (match) {
        handleCheck(match.id);
        setScanMessage(`Pledge #${match.pledge_no} verified!`);
        setSearchTerm('');
        setTimeout(() => setScanMessage(null), 3000);
      } else if (filteredPendingItems.length === 1) {
        const singleMatch = filteredPendingItems[0];
        handleCheck(singleMatch.id);
        setScanMessage(`Pledge #${singleMatch.pledge_no} verified!`);
        setSearchTerm('');
        setTimeout(() => setScanMessage(null), 3000);
      }
    }
  };

  // Print Audit Report
  const handlePrintAudit = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Girvi Stock Audit Report - ${metalType.toUpperCase()}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #1e293b; }
            h2 { margin-bottom: 5px; color: #0f172a; }
            p { margin: 2px 0; color: #64748b; font-size: 13px; }
            .stats { display: flex; gap: 20px; margin: 15px 0; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .stat-box { font-size: 14px; }
            .stat-box strong { font-size: 16px; color: #0284c7; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            th { background-color: #f1f5f9; font-weight: bold; }
            .text-right { text-align: right; }
            .badge-checked { color: #16a34a; font-weight: bold; }
            .badge-pending { color: #dc2626; font-weight: bold; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h2>Girvi Stock Audit Report (${metalType.toUpperCase()})</h2>
          <p>Generated on: ${new Date().toLocaleString('en-IN')}</p>
          <p>Last Physical Audit Conducted: ${lastAuditTime || 'Not yet conducted'}</p>
          <p>Filter: In-Shop Physical Stock (Excludes Bank Repledged & Released items)</p>
          
          <div class="stats">
            <div class="stat-box">Total Shop Stock: <strong>${totalMetalItemsCount} items</strong> (${totalMetalWeight.toFixed(2)} g)</div>
            <div class="stat-box">Verified / Checked: <strong style="color: #16a34a;">${checkedItems.length} items</strong> (${checkedWeight.toFixed(2)} g)</div>
            <div class="stat-box">Pending Verification: <strong style="color: #dc2626;">${pendingItems.length} items</strong> (${pendingWeight.toFixed(2)} g)</div>
          </div>

          <h3>Verified Stock List (${checkedItems.length})</h3>
          <table>
            <thead>
              <tr>
                <th>S.No.</th>
                <th>Pledge No</th>
                <th>Customer Name</th>
                <th>Articles Description</th>
                <th class="text-right">Net Weight</th>
                <th class="text-right">Loan Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${checkedItems.map((g, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong>${g.pledge_no}</strong></td>
                  <td>${g.customer_name || '-'}</td>
                  <td>${g.articles?.map(a => `${a.name} (${a.net_wt}g)`).join(', ') || '-'}</td>
                  <td class="text-right">${g.articles?.reduce((sum, a) => sum + (Number(a.net_wt) || 0), 0).toFixed(2)} g</td>
                  <td class="text-right">₹${Number(g.loan_amount || 0).toLocaleString('en-IN')}</td>
                  <td class="badge-checked">✓ VERIFIED</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          ${pendingItems.length > 0 ? `
            <h3 style="margin-top: 30px; color: #dc2626;">Pending / Unverified Stock List (${pendingItems.length})</h3>
            <table>
              <thead>
                <tr>
                  <th>S.No.</th>
                  <th>Pledge No</th>
                  <th>Customer Name</th>
                  <th>Articles Description</th>
                  <th class="text-right">Net Weight</th>
                  <th class="text-right">Loan Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${pendingItems.map((g, idx) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td><strong>${g.pledge_no}</strong></td>
                    <td>${g.customer_name || '-'}</td>
                    <td>${g.articles?.map(a => `${a.name} (${a.net_wt}g)`).join(', ') || '-'}</td>
                    <td class="text-right">${g.articles?.reduce((sum, a) => sum + (Number(a.net_wt) || 0), 0).toFixed(2)} g</td>
                    <td class="text-right">₹${Number(g.loan_amount || 0).toLocaleString('en-IN')}</td>
                    <td class="badge-pending">⚠ UNVERIFIED</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '65vh' }}>
        <Loader2 className="spin" size={48} style={{ color: 'var(--primary-color)' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={fetchGirvis}>Retry Loading</button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 85px)' }}>
      
      {/* Top Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => navigate('/ledger')}
            style={{ padding: '0.45rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            title="Back to Girvi Ledger"
          >
            <ArrowLeft size={18} /> Back
          </button>

          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PackageCheck size={26} color="var(--brand-primary, #4f46e5)" />
              In-Shop Physical Girvi Stock Audit
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '3px' }}>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>
                Physical inventory verification for items in shop safe (excludes bank loans & released items).
              </p>
              {/* Last Audit Timestamp Badge */}
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--brand-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', backgroundColor: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <Clock size={13} /> Last Audit: <strong>{lastAuditTime || 'Not conducted yet'}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Metal Selector & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '3px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <button 
              type="button"
              onClick={() => setMetalType('gold')}
              style={{
                padding: '0.45rem 1.1rem',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: metalType === 'gold' ? '#f59e0b' : 'transparent',
                color: metalType === 'gold' ? '#ffffff' : 'var(--text-secondary)',
                transition: 'all 0.2s ease'
              }}
            >
              <Award size={16} /> Gold Stock ({nonRepledgedGirvis.filter(g => !isGirviSilver(g)).length})
            </button>

            <button 
              type="button"
              onClick={() => setMetalType('silver')}
              style={{
                padding: '0.45rem 1.1rem',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: metalType === 'silver' ? '#3b82f6' : 'transparent',
                color: metalType === 'silver' ? '#ffffff' : 'var(--text-secondary)',
                transition: 'all 0.2s ease'
              }}
            >
              <Layers size={16} /> Silver Stock ({nonRepledgedGirvis.filter(g => isGirviSilver(g)).length})
            </button>
          </div>

          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={handlePrintAudit} 
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem', fontSize: '0.875rem' }}
            title="Print Stock Audit Report"
          >
            <Printer size={16} /> Print Report
          </button>
        </div>
      </div>

      {/* Progress & Summary Bar */}
      <div className="card" style={{ padding: '0.85rem 1.25rem', marginBottom: '0.85rem', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Shop Stock</span>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
              {totalMetalItemsCount} items <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>({totalMetalWeight.toFixed(2)} g)</span>
            </div>
          </div>

          <div style={{ height: '30px', width: '1px', backgroundColor: 'var(--border-color)' }}></div>

          <div>
            <span style={{ fontSize: '0.75rem', color: '#16a34a', textTransform: 'uppercase', fontWeight: 700 }}>Checked Stock</span>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#16a34a' }}>
              {checkedItems.length} items <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>({checkedWeight.toFixed(2)} g)</span>
            </div>
          </div>

          <div style={{ height: '30px', width: '1px', backgroundColor: 'var(--border-color)' }}></div>

          <div>
            <span style={{ fontSize: '0.75rem', color: '#dc2626', textTransform: 'uppercase', fontWeight: 700 }}>Pending Stock</span>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#dc2626' }}>
              {pendingItems.length} items <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>({pendingWeight.toFixed(2)} g)</span>
            </div>
          </div>
        </div>

        {/* Progress Bar & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: '1 1 300px', maxWidth: '420px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
              <span>Audit Progress</span>
              <span style={{ color: progressPercent === 100 ? '#16a34a' : 'var(--brand-primary)' }}>{progressPercent}% Checked</span>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '99px', overflow: 'hidden' }}>
              <div 
                style={{ 
                  height: '100%', 
                  width: `${progressPercent}%`, 
                  backgroundColor: progressPercent === 100 ? '#16a34a' : 'var(--brand-primary, #4f46e5)', 
                  transition: 'width 0.3s ease' 
                }}
              ></div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handleCheckAllCurrent} 
              disabled={filteredPendingItems.length === 0}
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
              title="Mark all current pending items as checked"
            >
              Check All
            </button>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handleResetCurrent} 
              disabled={checkedItems.length === 0}
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', color: '#dc2626' }}
              title="Reset verification state for current metal"
            >
              <RotateCcw size={13} /> Reset
            </button>
          </div>
        </div>

      </div>

      {/* Main Full-Page Split Grid (Left: Pending Stock | Right: Checked Stock) */}
      <div className="card" style={{ padding: 0, flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden', minHeight: 0 }}>
        
        {/* LEFT SIDE: PENDING / ALL SHOP ITEMS */}
        <div style={{ borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)', overflow: 'hidden' }}>
          
          {/* Left Header & Filters */}
          <div style={{ padding: '0.85rem 1.1rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#dc2626', display: 'inline-block' }}></span>
                Pending Shop Stock ({filteredPendingItems.length})
              </h3>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                Total: {calculateTotalWeight(filteredPendingItems).toFixed(2)} g
              </span>
            </div>

            {/* Quick Search & Barcode Scan Input */}
            <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
              <Search size={16} style={{ position: 'absolute', top: '50%', left: '10px', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search by Pledge No or Customer Name (Press Enter to auto-check)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="input-field"
                style={{ paddingLeft: '32px', margin: 0, fontSize: '0.85rem' }}
              />
            </div>

            {/* Date Range Filter Controls */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                <Calendar size={13} /> Pledge Date:
              </div>

              {/* Date Presets */}
              <div style={{ display: 'flex', gap: '3px' }}>
                <button 
                  type="button" 
                  onClick={() => handleSetPreset('ALL')}
                  style={{
                    padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)',
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
                    padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)',
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
                    padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)',
                    fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600,
                    backgroundColor: datePreset === 'LAST_MONTH' ? 'var(--brand-primary)' : 'var(--bg-secondary)',
                    color: datePreset === 'LAST_MONTH' ? '#ffffff' : 'var(--text-secondary)'
                  }}
                >
                  Last Month
                </button>
              </div>

              {/* Manual Date Inputs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginLeft: 'auto' }}>
                <input 
                  type="date" 
                  value={fromDate} 
                  onChange={(e) => { setFromDate(e.target.value); setDatePreset('CUSTOM'); }}
                  className="input-field" 
                  style={{ margin: 0, padding: '2px 6px', fontSize: '0.75rem', width: '120px' }} 
                  title="From Pledge Date"
                />
                <span>to</span>
                <input 
                  type="date" 
                  value={toDate} 
                  onChange={(e) => { setToDate(e.target.value); setDatePreset('CUSTOM'); }}
                  className="input-field" 
                  style={{ margin: 0, padding: '2px 6px', fontSize: '0.75rem', width: '120px' }} 
                  title="To Pledge Date"
                />
              </div>
            </div>

            {scanMessage && (
              <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Sparkles size={14} /> {scanMessage}
              </div>
            )}
          </div>

          {/* Left Scrollable List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.85rem' }}>
            {filteredPendingItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                {pendingItems.length === 0 ? (
                  <div>
                    <CheckCircle size={44} color="#16a34a" style={{ margin: '0 auto 0.75rem auto', display: 'block' }} />
                    <p style={{ fontWeight: 800, color: '#16a34a', fontSize: '1.05rem', margin: '0 0 4px 0' }}>All {metalType.toUpperCase()} Stock Verified!</p>
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>Every non-repledged item in your shop has been checked.</p>
                  </div>
                ) : (
                  <div>
                    <Filter size={32} style={{ margin: '0 auto 0.5rem auto', opacity: 0.5, display: 'block' }} />
                    <p style={{ margin: 0, fontSize: '0.875rem' }}>No pending items match your date or search filters.</p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {filteredPendingItems.map((girvi) => {
                  const itemWt = girvi.articles?.reduce((sum, a) => sum + (Number(a.net_wt) || 0), 0) || 0;
                  return (
                    <div 
                      key={girvi.id}
                      onClick={() => handleCheck(girvi.id)}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-surface)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        transition: 'all 0.15s ease',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--brand-primary)'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '3px' }}>
                          <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                            #{girvi.pledge_no}
                          </span>
                          <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', fontWeight: 700 }}>
                            Unchecked
                          </span>
                          {girvi.pledge_date && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                              {new Date(girvi.pledge_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {girvi.customer_name}
                        </div>

                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {girvi.articles?.map(a => a.name).join(', ') || 'Item'}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--brand-primary)' }}>
                          {itemWt.toFixed(2)} g
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          ₹{Number(girvi.loan_amount || 0).toLocaleString('en-IN')}
                        </div>
                        
                        <button 
                          type="button" 
                          className="btn btn-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCheck(girvi.id);
                          }}
                          style={{ marginTop: '5px', padding: '0.2rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          Mark Checked <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT SIDE: MARKED AS GIRVI CHECKED */}
        <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)', overflow: 'hidden' }}>
          
          {/* Right Header */}
          <div style={{ padding: '0.85rem 1.1rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(22, 163, 74, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle size={18} color="#16a34a" />
                Marked as Girvi Checked ({checkedItems.length})
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Physically verified items in shop safe
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#16a34a' }}>
                Total: {checkedWeight.toFixed(2)} g
              </span>
            </div>
          </div>

          {/* Right Scrollable List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.85rem' }}>
            {checkedItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                <ShieldAlert size={40} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem auto', display: 'block', opacity: 0.5 }} />
                <p style={{ fontWeight: 700, margin: '0 0 4px 0', fontSize: '1rem' }}>No Items Verified Yet</p>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>Click "Mark Checked" on items from the left side as you physically inspect them.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {checkedItems.map((girvi) => {
                  const itemWt = girvi.articles?.reduce((sum, a) => sum + (Number(a.net_wt) || 0), 0) || 0;
                  const isJustChecked = girvi.id === justCheckedId;

                  return (
                    <div 
                      key={girvi.id}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: '10px',
                        border: isJustChecked ? '2px solid #16a34a' : '1px solid rgba(22, 163, 74, 0.3)',
                        backgroundColor: isJustChecked ? 'rgba(22, 163, 74, 0.12)' : 'var(--bg-surface)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '3px' }}>
                          <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                            #{girvi.pledge_no}
                          </span>
                          <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(22, 163, 74, 0.15)', color: '#16a34a', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                            <CheckCircle size={12} /> Verified
                          </span>
                          {isJustChecked && (
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', animation: 'fadeIn 0.2s' }}>
                              <Sparkles size={12} /> Just Verified!
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {girvi.customer_name}
                        </div>

                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {girvi.articles?.map(a => a.name).join(', ') || 'Item'}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#16a34a' }}>
                          {itemWt.toFixed(2)} g
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          ₹{Number(girvi.loan_amount || 0).toLocaleString('en-IN')}
                        </div>

                        <button 
                          type="button" 
                          className="btn btn-secondary"
                          onClick={() => handleUncheck(girvi.id)}
                          style={{ marginTop: '5px', padding: '0.2rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)' }}
                          title="Move item back to unverified list"
                        >
                          <ArrowLeft size={13} /> Move Back
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
