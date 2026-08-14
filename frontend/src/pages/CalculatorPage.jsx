import React, { useState } from 'react';
import { Calculator, Calendar, IndianRupee, Percent, Clock, ArrowRight, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function CalculatorPage() {
  const [loanAmount, setLoanAmount] = useState(1000);
  const [rate, setRate] = useState(1.16);

  // Default Pledge Date: 12-06-2026 for demonstration
  const todayStr = new Date().toISOString().split('T')[0];
  const [pledgeDate, setPledgeDate] = useState('2026-06-12');
  const [presentDate, setPresentDate] = useState(todayStr);

  /**
   * Calendar-aware pawn shop duration calculation:
   * Compares Pledge Date (d1-m1-y1) and Present Date (d2-m2-y2).
   * Calculates Full Months and Remaining Days (where 1 month = 30 days equivalent).
   */
  const getCalendarDuration = (pStr, prStr) => {
    if (!pStr || !prStr) return { fullMonths: 0, extraDays: 0, totalDays: 0, formattedText: '0 days' };
    const pDate = new Date(pStr);
    const prDate = new Date(prStr);

    if (prDate <= pDate) return { fullMonths: 0, extraDays: 0, totalDays: 0, formattedText: '0 days' };

    let fullMonths = (prDate.getFullYear() - pDate.getFullYear()) * 12 + (prDate.getMonth() - pDate.getMonth());
    let extraDays = prDate.getDate() - pDate.getDate();

    if (extraDays < 0) {
      fullMonths -= 1;
      // Days in previous month
      const prevMonthLastDay = new Date(prDate.getFullYear(), prDate.getMonth(), 0).getDate();
      extraDays += prevMonthLastDay;
    }

    fullMonths = Math.max(0, fullMonths);
    extraDays = Math.max(0, extraDays);

    const totalDays = (fullMonths * 30) + extraDays;

    let formattedText = '';
    if (fullMonths > 0 && extraDays > 0) {
      formattedText = `${fullMonths} Month${fullMonths > 1 ? 's' : ''} & ${extraDays} Day${extraDays > 1 ? 's' : ''} (${totalDays} Days equivalent)`;
    } else if (fullMonths > 0) {
      formattedText = `${fullMonths} Month${fullMonths > 1 ? 's' : ''} (${totalDays} Days equivalent)`;
    } else {
      formattedText = `${extraDays} Day${extraDays > 1 ? 's' : ''}`;
    }

    return { fullMonths, extraDays, totalDays, formattedText };
  };

  const duration = getCalendarDuration(pledgeDate, presentDate);
  const principal = Number(loanAmount) || 0;
  const monthlyRate = Number(rate) || 0;

  // Perform Calculation based on custom pawn shop business rules
  const calculateResult = () => {
    if (principal <= 0 || monthlyRate <= 0) {
      return {
        interestAmount: 0,
        totalAmount: 0,
        ruleApplied: 'Invalid input',
        breakdown: [],
        dailyRate: 0
      };
    }

    const fullMonthInterest = principal * (monthlyRate / 100);
    const dailyRate = fullMonthInterest / 30;

    const { fullMonths, extraDays, totalDays } = duration;
    let interestAmount = 0;
    let ruleApplied = '';
    let breakdown = [];

    if (totalDays <= 0) {
      interestAmount = 0;
      ruleApplied = '0 days (Same day calculation)';
      breakdown.push({ label: 'Duration', val: '0 days' });
      breakdown.push({ label: 'Interest Charged', val: '₹0.00' });
    } else if (fullMonths === 0 && extraDays <= 15) {
      // 1 - 15 days = Half Month Interest (0.5 month)
      interestAmount = fullMonthInterest * 0.5;
      ruleApplied = '1 to 15 Days Rule (Fixed 0.5 Month Interest)';
      breakdown.push({ label: 'Duration', val: `${extraDays} days (<= 15 days)` });
      breakdown.push({ label: 'Calculation Formula', val: `₹${principal} × ${monthlyRate}% × 0.5 month` });
      breakdown.push({ label: 'Half Month Interest', val: `₹${interestAmount.toFixed(2)}` });
    } else if (fullMonths === 0 && extraDays <= 30) {
      // 16 - 30 days = Complete 1 Month Interest (1.0 month)
      interestAmount = fullMonthInterest * 1.0;
      ruleApplied = '16 to 30 Days Rule (Fixed 1 Complete Month Interest)';
      breakdown.push({ label: 'Duration', val: `${extraDays} days (16 to 30 days)` });
      breakdown.push({ label: 'Calculation Formula', val: `₹${principal} × ${monthlyRate}% × 1.0 month` });
      breakdown.push({ label: 'Full 1 Month Interest', val: `₹${interestAmount.toFixed(2)}` });
    } else {
      // > 30 days: (fullMonths * fullMonthInterest) + (extraDays * dailyRate)
      const baseMonthsInterest = fullMonths * fullMonthInterest;
      const extraDaysInterest = extraDays * dailyRate;
      interestAmount = baseMonthsInterest + extraDaysInterest;

      ruleApplied = `${fullMonths} Month${fullMonths > 1 ? 's' : ''} Base + ${extraDays} Extra Day${extraDays > 1 ? 's' : ''} (Day-wise calculation for extra days)`;

      breakdown.push({ label: 'Calendar Duration', val: duration.formattedText });
      breakdown.push({ label: `${fullMonths} Full Month(s) Interest`, val: `${fullMonths} × ₹${fullMonthInterest.toFixed(2)} = ₹${baseMonthsInterest.toFixed(2)}` });
      breakdown.push({ label: 'Daily Interest Rate', val: `₹${dailyRate.toFixed(4)} / day` });
      if (extraDays > 0) {
        breakdown.push({ label: `Extra ${extraDays} Day(s) Interest`, val: `${extraDays} × ₹${dailyRate.toFixed(4)} = ₹${extraDaysInterest.toFixed(2)}` });
      }
      breakdown.push({ label: 'Total Calculated Interest', val: `₹${baseMonthsInterest.toFixed(2)} + ₹${extraDaysInterest.toFixed(2)} = ₹${interestAmount.toFixed(2)}` });
    }

    return {
      interestAmount: Number(interestAmount.toFixed(2)),
      totalAmount: Number((principal + interestAmount).toFixed(2)),
      ruleApplied,
      breakdown,
      dailyRate: Number(dailyRate.toFixed(4))
    };
  };

  const res = calculateResult();

  const handleSetPresetDays = (numDays) => {
    const prDate = new Date(presentDate);
    const pDate = new Date(prDate);
    pDate.setDate(pDate.getDate() - numDays);
    setPledgeDate(pDate.toISOString().split('T')[0]);
  };

  return (
    <div className="container mt-6 animate-fade-in" style={{ maxWidth: '1000px', paddingBottom: '3rem' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calculator color="var(--brand-primary)" size={26} /> Interest Calculator
        </h2>
        <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '0.875rem' }}>
          Custom Pawn Shop Interest Calculation (1–15 days = Half Month, 16–30 days = 1 Month, 30+ days = Calendar Months + Day-wise Extra)
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* Form Inputs Panel */}
        <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-surface)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            Input Details
          </h3>

          <form style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            
            {/* Loan Amount */}
            <div className="input-group" style={{ margin: 0 }}>
              <label htmlFor="calc_loan_amount" className="input-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Loan Amount (₹)</span>
                <span style={{ color: 'var(--brand-primary)', fontWeight: 700 }}>₹{principal.toLocaleString('en-IN')}</span>
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                  <IndianRupee size={16} />
                </div>
                <input
                  id="calc_loan_amount"
                  name="calc_loan_amount"
                  type="number"
                  step="100"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '38px', margin: 0, fontSize: '1rem', fontWeight: 700 }}
                  placeholder="Enter loan amount e.g. 1000"
                  required
                />
              </div>

              {/* Quick Presets */}
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {[1000, 5000, 10000, 25000, 50000, 100000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setLoanAmount(amt)}
                    style={{
                      padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                      border: '1px solid var(--border)', background: principal === amt ? 'var(--brand-primary-light)' : 'var(--bg-surface-2)',
                      color: principal === amt ? 'var(--brand-primary)' : 'var(--text-secondary)', cursor: 'pointer'
                    }}
                  >
                    ₹{amt.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
            </div>

            {/* Interest Rate */}
            <div className="input-group" style={{ margin: 0 }}>
              <label htmlFor="calc_interest_rate" className="input-label">Interest Rate (% per month)</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                  <Percent size={16} />
                </div>
                <input
                  id="calc_interest_rate"
                  name="calc_interest_rate"
                  type="number"
                  step="0.01"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '38px', margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--brand-gold)' }}
                  placeholder="Default 1.16%"
                  required
                />
              </div>
            </div>

            {/* Pledge Date */}
            <div className="input-group" style={{ margin: 0 }}>
              <label htmlFor="calc_pledge_date" className="input-label">Pledge Date</label>
              <input
                id="calc_pledge_date"
                name="calc_pledge_date"
                type="date"
                value={pledgeDate}
                onChange={(e) => setPledgeDate(e.target.value)}
                className="input-field"
                style={{ margin: 0 }}
                required
              />
            </div>

            {/* Present / Release Date */}
            <div className="input-group" style={{ margin: 0 }}>
              <label htmlFor="calc_present_date" className="input-label">Present / Calculation Date</label>
              <input
                id="calc_present_date"
                name="calc_present_date"
                type="date"
                value={presentDate}
                onChange={(e) => setPresentDate(e.target.value)}
                className="input-field"
                style={{ margin: 0 }}
                required
              />
            </div>

            {/* Quick Test Duration Buttons */}
            <div>
              <label className="input-label" style={{ marginBottom: '0.3rem' }}>Quick Test Duration:</label>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {[15, 30, 45, 60, 90].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleSetPresetDays(d)}
                    style={{
                      padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600,
                      border: '1px solid var(--border)', background: duration.totalDays === d ? 'var(--brand-primary)' : 'var(--bg-surface-2)',
                      color: duration.totalDays === d ? '#ffffff' : 'var(--text-primary)', cursor: 'pointer'
                    }}
                  >
                    {d} Days
                  </button>
                ))}
              </div>
            </div>

          </form>
        </div>

        {/* Output & Breakdown Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Main Calculation Summary Cards */}
          <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-surface)', border: '2px solid var(--brand-primary)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Duration: <strong style={{ color: 'var(--brand-primary)' }}>{duration.formattedText}</strong>
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, background: 'var(--brand-primary-light)', color: 'var(--brand-primary)', padding: '0.2rem 0.6rem', borderRadius: '99px' }}>
                Rate: {monthlyRate}% / month
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              
              {/* Interest Amount */}
              <div style={{ background: 'var(--brand-gold-light)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(217, 119, 6, 0.2)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-gold)', textTransform: 'uppercase' }}>
                  Interest Amount
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--brand-gold)', marginTop: '0.2rem' }}>
                  ₹{res.interestAmount.toFixed(2)}
                </div>
              </div>

              {/* Total Collect Amount */}
              <div style={{ background: 'var(--brand-emerald-light)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(5, 150, 105, 0.2)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-emerald)', textTransform: 'uppercase' }}>
                  Total Amount
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--brand-emerald)', marginTop: '0.2rem' }}>
                  ₹{res.totalAmount.toFixed(2)}
                </div>
              </div>

            </div>

            {/* Rule Applied Badge */}
            <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', background: 'var(--bg-surface-2)', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <strong>Applied Rule:</strong> {res.ruleApplied}
            </div>
          </div>

          {/* Detailed Step-by-Step Breakdown */}
          <div className="card" style={{ padding: '1.25rem', background: 'var(--bg-surface)' }}>
            <h4 style={{ margin: 0, marginBottom: '0.85rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clock size={16} color="var(--brand-primary)" /> Step-by-Step Calculation Breakdown
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
              {res.breakdown.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: idx < res.breakdown.length - 1 ? '1px dashed var(--border)' : 'none' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{item.label}:</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Verification Formula Box */}
          <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-surface-2)', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            💡 <strong>Formula Check:</strong>
            <ul style={{ margin: '4px 0 0 1.2rem', padding: 0 }}>
              <li>1 to 15 days = Half month interest (`Loan × Rate × 0.5`)</li>
              <li>16 to 30 days = Full 1 month interest (`Loan × Rate × 1.0`)</li>
              <li>Calendar Months = Full month count from Date to Date + Extra Days (`Extra Days × (Monthly Interest / 30)`)</li>
            </ul>
          </div>

        </div>

      </div>
    </div>
  );
}
