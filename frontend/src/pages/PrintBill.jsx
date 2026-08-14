import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { ArrowLeft, Printer, CheckCircle2, IndianRupee, Scale, Hash, Calendar } from 'lucide-react';

/* ─── Number → Words ─────────────────────────────────────── */
const numberToWords = (num) => {
  const a = ['','One ','Two ','Three ','Four ','Five ','Six ','Seven ','Eight ','Nine ','Ten ',
    'Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
  const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  if (!num || isNaN(num)) return 'Zero';
  num = Math.floor(num);
  if (num.toString().length > 9) return 'overflow';
  const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return 'Zero';
  let str = '';
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += (n[5] != 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
  return str.trim() || 'Zero';
};

/* ─── Single Copy Component ──────────────────────────────── */
const Copy = ({ type, girvi, company }) => (
  <div style={{
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '12px 14px',
    fontSize: '11px',
    fontFamily: "'Times New Roman', Times, serif",
    color: '#000',
    backgroundColor: '#fff',
    position: 'relative',
  }}>
    {/* Copy type stamp */}
    <div style={{
      position: 'absolute', top: 8, right: 10,
      background: type === 'BRANCH COPY' ? '#1e40af' : '#065f46',
      color: '#fff', fontSize: '8px', fontWeight: 'bold',
      padding: '2px 7px', borderRadius: '99px', letterSpacing: '0.06em',
      fontFamily: 'Arial, sans-serif',
    }}>{type}</div>

    {/* ── Regulatory Header ── */}
    <div style={{ fontSize: '8px', textAlign: 'center', marginBottom: '4px', color: '#555', fontFamily: 'Arial, sans-serif' }}>
      FORM 'F' (SEE RULE 12) &nbsp;|&nbsp; PAWN TICKET &nbsp;|&nbsp; PBL NO. DRB/R/PB/2026-27
    </div>

    {/* ── Shop Title ── */}
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      borderBottom: '2px solid #000', paddingBottom: '6px', marginBottom: '6px',
    }}>
      <div style={{
        width: '44px', height: '44px', borderRadius: '50%',
        border: '2px solid #d97706',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 'bold', fontSize: '14px', color: '#d97706',
        flexShrink: 0,
      }}>PJ</div>
      <div style={{ flex: 1, textAlign: 'center' }}>
        <div style={{ fontSize: '17px', fontWeight: 'bold', letterSpacing: '1px', lineHeight: 1.2 }}>
          {company ? company.name.toUpperCase() : 'POOJA BANKERS & JEWELLERS'}
        </div>
        <div style={{ fontSize: '9px', fontWeight: 'bold', letterSpacing: '0.08em', color: '#555' }}>PAWN BROKERS</div>
        <div style={{ fontSize: '9px', color: '#333' }}>
          {company ? company.address : 'Main Road, Budigere, Devanahalli Taluk, Bangalore Rural - 562129'}
        </div>
        <div style={{ fontSize: '9px', color: '#333' }}>Mob: {company ? company.mobile : '9448587754'}</div>
      </div>
    </div>

    {/* ── Pledge No & Date ── */}
    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '6px', fontSize: '11px' }}>
      <span>No. <span style={{ borderBottom: '1px solid #000', paddingBottom: '1px' }}>{girvi.pledge_no}</span></span>
      <span>Date: <span style={{ borderBottom: '1px solid #000', paddingBottom: '1px' }}>{new Date(girvi.pledge_date).toLocaleDateString('en-GB')}</span></span>
    </div>

    {/* ── Customer Info ── */}
    <div style={{ border: '1.5px solid #000', borderRadius: '5px', marginBottom: '6px', overflow: 'hidden' }}>
      <div style={{ display: 'flex' }}>
        {/* Left: Customer Fields */}
        <table style={{ flex: 1, borderCollapse: 'collapse', fontSize: '10px' }}>
          <tbody>
            {[
              ['NAME OF PAWNER', girvi.customer_name],
              ['S/O | W/O | D/O', `${girvi.relation_type} ${girvi.relation_name}`],
              ['RESIDENCE', girvi.address],
              ['OCCUPATION', '—'],
            ].map(([label, value]) => (
              <tr key={label} style={{ borderBottom: '1px solid #ccc' }}>
                <td style={{ padding: '3px 5px', fontWeight: 'bold', width: '32%', color: '#333', borderRight: '1px solid #ccc', backgroundColor: '#fafafa' }}>{label}</td>
                <td style={{ padding: '3px 5px', fontWeight: 'bold' }}>: {value}</td>
              </tr>
            ))}
            <tr>
              <td colSpan="2" style={{ padding: 0 }}>
                <div style={{ display: 'flex', fontSize: '10px' }}>
                  <div style={{ flex: 1, padding: '3px 5px', fontWeight: 'bold', backgroundColor: '#fafafa', borderRight: '1px solid #ccc' }}>MOB: {girvi.mobile_number?.replace('+91', '')}</div>
                  <div style={{ flex: 1, padding: '3px 5px', fontWeight: 'bold' }}>INC: {girvi.monthly_income}</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Right: Photos */}
        <div style={{ width: '110px', borderLeft: '1.5px solid #000', display: 'flex', gap: '4px', padding: '4px' }}>
          <div style={{ flex: 1, border: '1px solid #ccc', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0', overflow: 'hidden' }}>
            {girvi.photo_path
              ? <img src={girvi.photo_path} alt="Customer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '8px', color: '#888', textAlign: 'center' }}>Customer Photo</span>}
          </div>
          <div style={{ flex: 1, border: '1px solid #ccc', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#dbeafe', overflow: 'hidden' }}>
            {girvi.articles?.[0]?.photo_path
              ? <img src={girvi.articles[0].photo_path} alt="Item" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '8px', color: '#1d4ed8', textAlign: 'center' }}>Item Photo</span>}
          </div>
        </div>
      </div>
    </div>

    {/* ── Loan Amount ── */}
    <div style={{ display: 'flex', gap: '6px', marginBottom: '5px' }}>
      <div style={{ flex: 1, border: '1.5px solid #000', borderRadius: '5px', padding: '5px 8px' }}>
        <div style={{ fontSize: '8px', fontWeight: 'bold', color: '#555', marginBottom: '2px', fontFamily: 'Arial, sans-serif' }}>PRINCIPAL LOAN AMOUNT</div>
        <div style={{ fontSize: '15px', fontWeight: 'bold' }}>₹{Number(girvi.loan_amount).toLocaleString('en-IN')}</div>
      </div>
      <div style={{ flex: 2, border: '1.5px solid #000', borderRadius: '5px', padding: '5px 8px' }}>
        <div style={{ fontSize: '8px', fontWeight: 'bold', color: '#555', marginBottom: '2px', fontFamily: 'Arial, sans-serif' }}>RUPEES IN WORDS</div>
        <div style={{ fontSize: '11px', fontWeight: 'bold', fontStyle: 'italic' }}>{numberToWords(girvi.loan_amount)} Only</div>
      </div>
    </div>

    <div style={{ fontSize: '9px', fontStyle: 'italic', marginBottom: '3px', color: '#333' }}>
      Rate of interest: <strong>Fourteen percent per annum</strong> &nbsp;&nbsp; Time of redemption: <strong>12 months</strong>
    </div>
    <div style={{ fontSize: '9px', fontStyle: 'italic', marginBottom: '4px', color: '#333' }}>
      The following article / articles is / are pawned with me / us
    </div>

    {/* ── Articles Table ── */}
    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000', fontSize: '10px', textAlign: 'center', marginBottom: '5px' }}>
      <thead>
        <tr style={{ backgroundColor: '#f5f5f5' }}>
          <th rowSpan="2" style={{ border: '1px solid #000', padding: '2px 3px', width: '5%' }}>SL</th>
          <th rowSpan="2" style={{ border: '1px solid #000', padding: '2px 3px', width: '38%', textAlign: 'left' }}>DESCRIPTION OF ARTICLES PLEDGED</th>
          <th colSpan="2" style={{ border: '1px solid #000', padding: '2px 3px', borderBottom: '1px solid #000' }}>GROSS WT</th>
          <th rowSpan="2" style={{ border: '1px solid #000', padding: '2px 3px' }}>LESS WT</th>
          <th rowSpan="2" style={{ border: '1px solid #000', padding: '2px 3px' }}>NET WT</th>
          <th rowSpan="2" style={{ border: '1px solid #000', padding: '2px 3px' }}>VALUE (₹)</th>
        </tr>
        <tr style={{ backgroundColor: '#f5f5f5' }}>
          <th style={{ border: '1px solid #000', padding: '2px', fontSize: '8px' }}>GMS.</th>
          <th style={{ border: '1px solid #000', padding: '2px', fontSize: '8px' }}>MGS.</th>
        </tr>
      </thead>
      <tbody>
        {girvi.articles.map((art, i) => {
          const grams = Math.floor(art.gross_wt);
          const mgs = Math.round((art.gross_wt - grams) * 1000);
          return (
            <tr key={i} style={{ borderBottom: '1px solid #ccc' }}>
              <td style={{ border: '1px solid #000', padding: '3px', fontWeight: 'bold' }}>{i + 1}</td>
              <td style={{ border: '1px solid #000', padding: '3px', fontWeight: 'bold', textAlign: 'left' }}>{art.name}</td>
              <td style={{ border: '1px solid #000', padding: '3px', fontWeight: 'bold' }}>{grams}</td>
              <td style={{ border: '1px solid #000', padding: '3px', fontWeight: 'bold' }}>{mgs > 0 ? mgs : ''}</td>
              <td style={{ border: '1px solid #000', padding: '3px', fontWeight: 'bold' }}>{art.less_wt > 0 ? art.less_wt : ''}</td>
              <td style={{ border: '1px solid #000', padding: '3px', fontWeight: 'bold' }}>{art.net_wt}</td>
              <td style={{ border: '1px solid #000', padding: '3px', fontWeight: 'bold' }}>{art.present_value}</td>
            </tr>
          );
        })}
        {Array.from({ length: Math.max(0, 3 - girvi.articles.length) }).map((_, i) => (
          <tr key={`e-${i}`} style={{ height: '20px' }}>
            <td style={{ border: '1px solid #000' }}>{girvi.articles.length + i + 1}</td>
            <td style={{ border: '1px solid #000' }} />
            <td style={{ border: '1px solid #000' }} />
            <td style={{ border: '1px solid #000' }} />
            <td style={{ border: '1px solid #000' }} />
            <td style={{ border: '1px solid #000' }} />
            <td style={{ border: '1px solid #000' }} />
          </tr>
        ))}
        <tr>
          <td colSpan="7" style={{ padding: '3px 5px', fontSize: '11px', fontWeight: 'bold', textAlign: 'center', borderTop: '1px solid #000' }}>
            (ಪ್ರತಿ ಮೂರು ತಿಂಗಳಿಗೊಮ್ಮೆ ಬಡ್ಡಿ ಹಣ ಕಟ್ಟಬೇಕು)
          </td>
        </tr>
      </tbody>
    </table>

    {/* ── Summary Row ── */}
    <div style={{ display: 'flex', border: '1.5px solid #000', borderRadius: '5px', marginBottom: '6px', overflow: 'hidden' }}>
      {[
        [`Rs. ${Number(girvi.loan_amount).toFixed(2)}`],
        [`Date: ${new Date(girvi.pledge_date).toLocaleDateString('en-GB')}`],
        [`Pieces: ${girvi.articles.reduce((s, a) => s + a.quantity, 0)}`],
      ].map(([val], idx, arr) => (
        <div key={idx} style={{
          flex: 1,
          padding: '4px 6px',
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: '10px',
          borderRight: idx < arr.length - 1 ? '1px solid #000' : 'none',
        }}>{val}</div>
      ))}
    </div>

    {/* ── Signatures ── */}
    <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
      <div style={{ flex: 1, border: '1.5px solid #000', borderRadius: '5px', padding: '5px 6px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontWeight: 'bold', fontSize: '9px' }}>For {company ? company.name.toUpperCase() : 'POOJA BANKERS & JEWELLERS'}</div>
        <div style={{ flex: 1 }} />
        <div style={{ borderTop: '1px solid #000', paddingTop: '3px', textAlign: 'center', fontSize: '8px', fontWeight: 'bold', fontFamily: 'Arial, sans-serif' }}>SIGNATURE OF P.B. OR HIS AGENT</div>
      </div>
      <div style={{ flex: 1, border: '1.5px solid #000', borderRadius: '5px', padding: '5px 6px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: '8px', lineHeight: '1.4', color: '#333' }}>I declare that the above articles are my own property. The above statement is true to the best of my knowledge and belief.</div>
        <div style={{ flex: 1 }} />
        <div style={{ borderTop: '1px solid #000', paddingTop: '3px', textAlign: 'right', fontSize: '8px', fontWeight: 'bold', fontFamily: 'Arial, sans-serif' }}>SIGNATURE / LTI OF PAWNER</div>
      </div>
    </div>
  </div>
);

/* ─── Main Component ─────────────────────────────────────── */
export default function PrintBill() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [girvi, setGirvi] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const girviData = await api.getGirviById(id);
        setGirvi(girviData);
        try {
          const compData = await api.getCompany();
          setCompany(compData);
        } catch (e) { /* company optional */ }
      } catch (err) {
        console.error('Failed to load girvi for printing', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ color: 'var(--text-secondary)' }}>Loading bill…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!girvi) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <span style={{ color: 'var(--brand-danger)', fontSize: '1rem' }}>⚠ Bill not found</span>
    </div>
  );

  const totalPieces = girvi.articles.reduce((s, a) => s + a.quantity, 0);
  const totalNetWt = girvi.articles.reduce((s, a) => s + Number(a.net_wt || 0), 0);

  return (
    <div className="print-page-wrapper">
      {/* ── Toolbar (hidden on print) ── */}
      <div className="print-toolbar hide-on-print" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/ledger')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={16} /> Back to Ledger
          </button>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Pawn Ticket — {girvi.customer_name}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Pledge #{girvi.pledge_no} &nbsp;·&nbsp; {new Date(girvi.pledge_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {[
            { icon: <IndianRupee size={14} />, label: 'Loan', value: `₹${Number(girvi.loan_amount).toLocaleString('en-IN')}`, color: '#6366f1' },
            { icon: <Hash size={14} />,         label: 'Pieces', value: totalPieces, color: '#10b981' },
            { icon: <Scale size={14} />,         label: 'Net Wt', value: `${totalNetWt.toFixed(2)}g`, color: '#f59e0b' },
          ].map(({ icon, label, value, color }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
              borderRadius: '0.625rem', padding: '0.4rem 0.75rem',
            }}>
              <span style={{ color }}>{icon}</span>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
              </div>
            </div>
          ))}
          <button className="btn btn-primary" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Printer size={16} /> Print Bill
          </button>
        </div>
      </div>

      {/* ── Bill Preview Card ── */}
      <div className="print-preview-card" style={{ animation: 'fadeIn 0.5s ease-out' }}>
        <div className="print-container">

          {/* Branch Copy */}
          <Copy type="BRANCH COPY" girvi={girvi} company={company} />

          {/* Scissors Divider */}
          <div style={{
            width: '28px', flexShrink: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: 0, bottom: 0, left: '50%',
              transform: 'translateX(-50%)',
              borderLeft: '1.5px dashed #bbb',
            }} />
            <div style={{
              position: 'relative', zIndex: 1,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '4px',
              background: '#fff', padding: '8px 0',
            }}>
              <span style={{ fontSize: '16px', transform: 'rotate(90deg)', display: 'block', color: '#555' }}>✂</span>
              <span style={{
                fontSize: '7px', fontWeight: 'bold', letterSpacing: '1px',
                color: '#999', writingMode: 'vertical-rl',
                textOrientation: 'mixed', transform: 'rotate(180deg)',
                whiteSpace: 'nowrap', fontFamily: 'Arial, sans-serif',
              }}>TEAR HERE</span>
            </div>
          </div>

          {/* Customer Copy */}
          <Copy type="CUSTOMER COPY" girvi={girvi} company={company} />
        </div>

        {/* Status footer bar (screen only) */}
        <div className="hide-on-print" style={{
          borderTop: '1px solid #e5e7eb',
          background: '#f9fafb',
          padding: '6px 16px',
          display: 'flex', alignItems: 'center', gap: '6px',
          fontSize: '11px', color: '#555', fontFamily: 'Arial, sans-serif',
        }}>
          <CheckCircle2 size={12} color="#10b981" />
          A4 Landscape · Branch Copy + Customer Copy · 6mm margins
        </div>
      </div>

      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}

