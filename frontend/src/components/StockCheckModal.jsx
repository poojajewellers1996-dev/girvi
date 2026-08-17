import React, { useState, useEffect, useMemo } from 'react';
import { X, CheckCircle, PackageCheck, Search, RotateCcw, ArrowRight, ArrowLeft, Printer, ShieldAlert, Award, Layers } from 'lucide-react';

export default function StockCheckModal({ isOpen, onClose, girvis = [] }) {
  const [metalType, setMetalType] = useState('gold'); // 'gold' | 'silver'
  const [searchTerm, setSearchTerm] = useState('');
  const [checkedMap, setCheckedMap] = useState({}); // { [girviId]: true }
  const [scanMessage, setScanMessage] = useState(null);

  // Load saved audit progress from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('girvi_stock_checked_ids');
      if (saved) {
        setCheckedMap(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load saved stock audit state', e);
    }
  }, []);

  // Save progress to localStorage whenever checkedMap changes
  const updateCheckedMap = (newMap) => {
    setCheckedMap(newMap);
    try {
      localStorage.setItem('girvi_stock_checked_ids', JSON.stringify(newMap));
    } catch (e) {
      console.error('Failed to save stock audit state', e);
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

  // Filter Left side by search term
  const filteredPendingItems = useMemo(() => {
    if (!searchTerm.trim()) return pendingItems;
    const term = searchTerm.toLowerCase().trim();
    return pendingItems.filter(g => {
      const pMatch = g.pledge_no && g.pledge_no.toLowerCase().includes(term);
      const cMatch = g.customer_name && g.customer_name.toLowerCase().includes(term);
      const aMatch = g.articles && g.articles.some(a => a.name && a.name.toLowerCase().includes(term));
      return pMatch || cMatch || aMatch;
    });
  }, [pendingItems, searchTerm]);

  // Total weight calculations for stats
  const calculateTotalWeight = (items) => {
    return items.reduce((sum, g) => {
      const itemWeight = g.articles?.reduce((artSum, a) => artSum + (Number(a.net_wt) || 0), 0) || 0;
      return sum + itemWeight;
    }, 0);
  };

  const calculateTotalLoan = (items) => {
    return items.reduce((sum, g) => sum + (Number(g.loan_amount) || 0), 0);
  };

  const totalMetalItemsCount = currentMetalGirvis.length;
  const totalMetalWeight = calculateTotalWeight(currentMetalGirvis);
  const checkedWeight = calculateTotalWeight(checkedItems);
  const pendingWeight = calculateTotalWeight(pendingItems);
  const progressPercent = totalMetalItemsCount > 0 ? Math.round((checkedItems.length / totalMetalItemsCount) * 100) : 0;

  // Handlers
  const handleCheck = (girviId) => {
    const updated = { ...checkedMap, [girviId]: true };
    updateCheckedMap(updated);
  };

  const handleUncheck = (girviId) => {
    const updated = { ...checkedMap };
    delete updated[girviId];
    updateCheckedMap(updated);
  };

  const handleCheckAllCurrent = () => {
    if (!window.confirm(`Mark all ${pendingItems.length} pending ${metalType.toUpperCase()} items as checked?`)) return;
    const updated = { ...checkedMap };
    pendingItems.forEach(g => {
      updated[g.id] = true;
    });
    updateCheckedMap(updated);
  };

  const handleResetCurrent = () => {
    if (!window.confirm(`Reset audit status for ${metalType.toUpperCase()} items?`)) return;
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
        setScanMessage(`Pledge #${match.pledge_no} marked as checked!`);
        setSearchTerm('');
        setTimeout(() => setScanMessage(null), 3000);
      } else if (filteredPendingItems.length === 1) {
        const singleMatch = filteredPendingItems[0];
        handleCheck(singleMatch.id);
        setScanMessage(`Pledge #${singleMatch.pledge_no} marked as checked!`);
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

  if (!isOpen) return null;

  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '1rem'
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '1280px',
          height: '92vh',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          background: 'var(--bg-surface, #ffffff)',
          color: 'var(--text-primary, #0f172a)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
          border: '1px solid var(--border-color, #e2e8f0)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* Header Bar */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <PackageCheck size={26} color="var(--brand-primary, #4f46e5)" />
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>In-Shop Physical Girvi Stock Audit</h2>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Verify physically present shop inventory. Excludes repledged bank loans & released items.
            </p>
          </div>

          {/* Metal Type Switcher Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', background: 'var(--bg-primary)', padding: '3px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
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
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
              title="Print Stock Audit Report"
            >
              <Printer size={16} /> Print Report
            </button>

            <button 
              type="button" 
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '50%' }}
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Progress & Summary Bar */}
        <div style={{ padding: '0.85rem 1.5rem', backgroundColor: 'var(--bg-surface-2, #f8fafc)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: '1 1 300px', maxWidth: '400px' }}>
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
                disabled={pendingItems.length === 0}
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                title="Mark all current pending items as checked"
              >
                Check All
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handleResetCurrent} 
                disabled={checkedItems.length === 0}
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', color: '#dc2626' }}
                title="Reset verification state for current metal"
              >
                <RotateCcw size={12} /> Reset
              </button>
            </div>
          </div>

        </div>

        {/* Main Split Grid (Left: Pending Stock | Right: Checked Stock) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, overflow: 'hidden' }}>
          
          {/* LEFT SIDE: PENDING / ALL SHOP ITEMS */}
          <div style={{ borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)', overflow: 'hidden' }}>
            
            {/* Left Header & Search */}
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#dc2626', display: 'inline-block' }}></span>
                  Pending Shop Stock ({pendingItems.length})
                </h3>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Total: {pendingWeight.toFixed(2)} g
                </span>
              </div>

              {/* Quick Scan Input */}
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', top: '50%', left: '10px', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search by Pledge No or Customer Name (Press Enter to auto-check)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="input-field"
                  style={{ paddingLeft: '32px', margin: 0, fontSize: '0.875rem' }}
                />
              </div>

              {scanMessage && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <CheckCircle size={14} /> {scanMessage}
                </div>
              )}
            </div>

            {/* Left Scrollable List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
              {filteredPendingItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  {pendingItems.length === 0 ? (
                    <div>
                      <CheckCircle size={40} color="#16a34a" style={{ margin: '0 auto 0.75rem auto', display: 'block' }} />
                      <p style={{ fontWeight: 700, color: '#16a34a', fontSize: '1rem', margin: '0 0 4px 0' }}>All {metalType.toUpperCase()} Stock Verified!</p>
                      <p style={{ margin: 0, fontSize: '0.85rem' }}>Every non-repledged item in your shop has been checked.</p>
                    </div>
                  ) : (
                    'No pending items match your search filter.'
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {filteredPendingItems.map((girvi, idx) => {
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
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--brand-primary)'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                              #{girvi.pledge_no}
                            </span>
                            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', fontWeight: 700 }}>
                              Unchecked
                            </span>
                          </div>

                          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {girvi.customer_name}
                          </div>

                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {girvi.articles?.map(a => a.name).join(', ') || 'Item'}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--brand-primary)' }}>
                            {itemWt.toFixed(2)} g
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            ₹{Number(girvi.loan_amount || 0).toLocaleString('en-IN')}
                          </div>
                          
                          <button 
                            type="button" 
                            className="btn btn-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCheck(girvi.id);
                            }}
                            style={{ marginTop: '6px', padding: '0.25rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
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
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(22, 163, 74, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CheckCircle size={18} color="#16a34a" />
                  Marked as Girvi Checked ({checkedItems.length})
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
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
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
              {checkedItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <ShieldAlert size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem auto', display: 'block', opacity: 0.5 }} />
                  <p style={{ fontWeight: 600, margin: '0 0 4px 0' }}>No Items Verified Yet</p>
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>Click "Mark Checked" on items from the left side as you physically inspect them.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {checkedItems.map((girvi, idx) => {
                    const itemWt = girvi.articles?.reduce((sum, a) => sum + (Number(a.net_wt) || 0), 0) || 0;
                    return (
                      <div 
                        key={girvi.id}
                        style={{
                          padding: '0.85rem 1rem',
                          borderRadius: '10px',
                          border: '1px solid rgba(22, 163, 74, 0.3)',
                          backgroundColor: 'var(--bg-surface)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '1rem',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                              #{girvi.pledge_no}
                            </span>
                            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(22, 163, 74, 0.15)', color: '#16a34a', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                              <CheckCircle size={12} /> Verified
                            </span>
                          </div>

                          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {girvi.customer_name}
                          </div>

                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {girvi.articles?.map(a => a.name).join(', ') || 'Item'}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#16a34a' }}>
                            {itemWt.toFixed(2)} g
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            ₹{Number(girvi.loan_amount || 0).toLocaleString('en-IN')}
                          </div>

                          <button 
                            type="button" 
                            className="btn btn-secondary"
                            onClick={() => handleUncheck(girvi.id)}
                            style={{ marginTop: '6px', padding: '0.25rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)' }}
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
    </div>
  );
}
