import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { ArrowLeft, Printer } from 'lucide-react';

const numberToWords = (num) => {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
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
        } catch (e) {
          console.warn("Could not load company details");
        }
      } catch (err) {
        console.error("Failed to load girvi for printing", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <div style={{ padding: '2rem' }}>Loading bill...</div>;
  if (!girvi) return <div style={{ padding: '2rem' }}>Bill not found!</div>;

  const handlePrint = () => {
    window.print();
  };

  const Copy = ({ type }) => (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid #000',
      padding: '10px',
      fontSize: '12px',
      minHeight: '260mm',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '4px', marginBottom: '8px' }}>
        <span style={{ fontWeight: 'bold' }}>FORM 'F' (SEE RULE 12) PAWN TICKET</span>
        <span>PBL NO. DRB/R/PB/2026-27</span>
        <span style={{ backgroundColor: '#e5e7eb', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '10px' }}>{type}</span>
      </div>

      {/* Shop Title */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{
          width: '50px', height: '50px',
          borderRadius: '50%', border: '2px solid #f59e0b',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#f59e0b', fontWeight: 'bold', fontSize: '20px', marginRight: '10px'
        }}>
          PJ
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '20px', letterSpacing: '1px' }}>{company ? company.name.toUpperCase() : "POOJA BANKERS & JEWELLERS"}</h1>
          <div style={{ fontWeight: 'bold', fontSize: '10px' }}>PAWN BROKERS</div>
          <div style={{ fontSize: '10px' }}>{company ? company.address : "Main Road, Budigere, Devanahalli Taluk, Bangalore Rural - 562129"}</div>
          <div style={{ fontSize: '10px' }}>Mob - {company ? company.mobile : "9448587754"}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '8px' }}>
        <span>No. {girvi.pledge_no}</span>
        <span>Date : {new Date(girvi.pledge_date).toLocaleDateString('en-GB')}</span>
      </div>

      {/* Customer Info Box */}
      <div style={{ border: '2px solid #000', borderRadius: '8px', display: 'flex', marginBottom: '8px' }}>
        <div style={{ flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px', borderBottom: '1px solid #000', fontWeight: 'bold', width: '35%' }}>NAME OF PAWNER</td>
                <td style={{ padding: '4px', borderBottom: '1px solid #000', borderLeft: '1px solid #000', fontWeight: 'bold' }}>: {girvi.customer_name}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px', borderBottom: '1px solid #000', fontWeight: 'bold' }}>S/O W/O D/O</td>
                <td style={{ padding: '4px', borderBottom: '1px solid #000', borderLeft: '1px solid #000', fontWeight: 'bold' }}>: {girvi.relation_type} {girvi.relation_name}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px', borderBottom: '1px solid #000', fontWeight: 'bold' }}>RESIDENCE<br />(OWN/RENTAL)</td>
                <td style={{ padding: '4px', borderBottom: '1px solid #000', borderLeft: '1px solid #000', fontWeight: 'bold' }}>: {girvi.address}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px', borderBottom: '1px solid #000', fontWeight: 'bold' }}>OCCUPATION<br />ADDRESS</td>
                <td style={{ padding: '4px', borderBottom: '1px solid #000', borderLeft: '1px solid #000', fontWeight: 'bold' }}>: —</td>
              </tr>
              <tr>
                <td colSpan="2" style={{ padding: '0' }}>
                  <div style={{ display: 'flex' }}>
                    <div style={{ flex: 1, padding: '4px', fontWeight: 'bold' }}>MOB : {girvi.mobile_number?.replace('+91', '')}</div>
                    <div style={{ flex: 1, padding: '4px', fontWeight: 'bold', borderLeft: '1px solid #000' }}>INC : {girvi.monthly_income}</div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {/* Photos */}
        <div style={{ width: '120px', borderLeft: '2px solid #000', display: 'flex', padding: '4px', gap: '4px' }}>
          <div style={{ flex: 1, border: '1px solid #ccc', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
            {girvi.photo_path ? (
              <img src={girvi.photo_path} alt="Customer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : <span style={{ fontSize: '10px' }}>Customer Photo</span>}
          </div>
          <div style={{ flex: 1, border: '1px solid #ccc', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3b82f6' }}>
            {girvi.articles && girvi.articles[0]?.photo_path ? (
              <img src={girvi.articles[0].photo_path} alt="Item" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : <span style={{ fontSize: '10px', color: 'white' }}>Item Photo</span>}
          </div>
        </div>
      </div>

      {/* Loan Boxes */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <div style={{ flex: 1, border: '1px solid #000', borderRadius: '8px', padding: '6px' }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>PRINCIPAL LOAN AMOUNT</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>₹{girvi.loan_amount}</div>
        </div>
        <div style={{ flex: 2, border: '1px solid #000', borderRadius: '8px', padding: '6px' }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>RUPEES IN WORDS</div>
          <div style={{ fontSize: '14px', fontWeight: 'bold', fontStyle: 'italic' }}>{numberToWords(girvi.loan_amount)} Only</div>
        </div>
      </div>

      <div style={{ fontSize: '10px', fontWeight: 'bold', fontStyle: 'italic', marginBottom: '4px' }}>
        Rate of interest Fourteen percent per annum &nbsp;&nbsp;&nbsp; Time of redemption 12 months
      </div>
      <div style={{ fontSize: '10px', fontStyle: 'italic', marginBottom: '4px' }}>
        The following article / articles is / are pawned with me / us
      </div>

      {/* Articles Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: '11px', textAlign: 'center', marginBottom: '4px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #000' }}>
            <th rowSpan="2" style={{ borderRight: '1px solid #000', padding: '2px', width: '5%' }}>SL NO</th>
            <th rowSpan="2" style={{ borderRight: '1px solid #000', padding: '2px', width: '40%' }}>DESCRIPTION OF ARTICLES PLEDGED</th>
            <th colSpan="2" style={{ borderRight: '1px solid #000', padding: '2px', borderBottom: '1px solid #000' }}>GROSS WT</th>
            <th rowSpan="2" style={{ borderRight: '1px solid #000', padding: '2px' }}>LESS WT</th>
            <th rowSpan="2" style={{ borderRight: '1px solid #000', padding: '2px' }}>NET WT</th>
            <th rowSpan="2" style={{ padding: '2px' }}>PRESENT VALUE</th>
          </tr>
          <tr style={{ borderBottom: '1px solid #000' }}>
            <th style={{ borderRight: '1px solid #000', padding: '2px', fontSize: '9px' }}>GMS.</th>
            <th style={{ borderRight: '1px solid #000', padding: '2px', fontSize: '9px' }}>MGS.</th>
          </tr>
        </thead>
        <tbody>
          {girvi.articles.map((art, index) => {
            const grams = Math.floor(art.gross_wt);
            const mgs = Math.round((art.gross_wt - grams) * 1000);
            return (
              <tr key={index} style={{ borderBottom: '1px solid #000' }}>
                <td style={{ borderRight: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>{index + 1}</td>
                <td style={{ borderRight: '1px solid #000', padding: '4px', fontWeight: 'bold', textAlign: 'left' }}>{art.name}</td>
                <td style={{ borderRight: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>{grams}</td>
                <td style={{ borderRight: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>{mgs > 0 ? mgs : ''}</td>
                <td style={{ borderRight: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>{art.less_wt > 0 ? art.less_wt : ''}</td>
                <td style={{ borderRight: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>{art.net_wt}</td>
                <td style={{ padding: '4px', fontWeight: 'bold' }}>{art.present_value}</td>
              </tr>
            );
          })}
          {/* Fill empty rows to at least 6 total rows */}
          {Array.from({ length: Math.max(0, 6 - girvi.articles.length) }).map((_, i) => (
            <tr key={`empty-${i}`} style={{ borderBottom: '1px solid #000', height: '28px' }}>
              <td style={{ borderRight: '1px solid #000' }}>{girvi.articles.length + i + 1}</td>
              <td style={{ borderRight: '1px solid #000' }}></td>
              <td style={{ borderRight: '1px solid #000' }}></td>
              <td style={{ borderRight: '1px solid #000' }}></td>
              <td style={{ borderRight: '1px solid #000' }}></td>
              <td style={{ borderRight: '1px solid #000' }}></td>
              <td></td>
            </tr>
          ))}
          <tr>
            <td colSpan="7" style={{ padding: '4px', fontWeight: 'bold', fontSize: '12px' }}>
              (ಪ್ರತಿ ಮೂರು ತಿಂಗಳಿಗೊಮ್ಮೆ ಬಡ್ಡಿ ಹಣ ಕಟ್ಟಬೇಕು)
            </td>
          </tr>
        </tbody>
      </table>

      {/* Footer Info Box */}
      <div style={{ display: 'flex', border: '1px solid #000', borderRadius: '8px', marginBottom: '8px' }}>
        <div style={{ flex: 1, borderRight: '1px solid #000', padding: '4px', textAlign: 'center', fontWeight: 'bold' }}>Rs. {girvi.loan_amount.toFixed(2)}</div>
        <div style={{ flex: 1, borderRight: '1px solid #000', padding: '4px', textAlign: 'center', fontWeight: 'bold' }}>Date: {new Date(girvi.pledge_date).toLocaleDateString('en-GB')}</div>
        <div style={{ flex: 1, padding: '4px', textAlign: 'center', fontWeight: 'bold' }}>No. of PIECES: {girvi.articles.reduce((sum, art) => sum + art.quantity, 0)}</div>
      </div>

      {/* Signatures */}
      <div style={{ display: 'flex', gap: '8px', flex: 1, minHeight: '80px' }}>
        <div style={{ flex: 1, border: '1px solid #000', borderRadius: '8px', padding: '6px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 'bold', fontSize: '10px' }}>For {company ? company.name.toUpperCase() : "POOJA BANKERS & JEWELLERS"}</div>
          <div style={{ flex: 1 }} />
          <div style={{ borderTop: '1px solid #000', paddingTop: '4px', textAlign: 'center', fontSize: '9px', fontWeight: 'bold' }}>
            SIGNATURE OF P.B. OR HIS AGENT
          </div>
        </div>
        <div style={{ flex: 1, border: '1px solid #000', borderRadius: '8px', padding: '6px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '9px', fontWeight: 'bold', lineHeight: '1.2' }}>
            I declare that the above articles are my own property. The above statement is true to the best of my knowledge and belief.
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ borderTop: '1px solid #000', paddingTop: '4px', textAlign: 'right', fontSize: '9px', fontWeight: 'bold' }}>
            SIGNATURE / LTI OF PAWNER
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="print-page-wrapper" style={{ padding: '2rem', backgroundColor: 'var(--bg-secondary)', minHeight: '100vh' }}>
      <div className="hide-on-print" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/ledger')}>
          <ArrowLeft size={16} /> Back to Ledger
        </button>
        <button className="btn btn-primary" onClick={handlePrint}>
          <Printer size={16} /> Print Bill
        </button>
      </div>

      {/* The Printable Container */}
      <div className="print-container">
        <Copy type="BRANCH COPY" />

        {/* Scissors / Cut Line */}
        <div style={{
          width: '30px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          padding: '0 4px'
        }}>
          {/* Dashed vertical line */}
          <div style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            borderLeft: '2px dashed #9ca3af',
            zIndex: 0
          }} />
          {/* Scissors icon + text centered */}
          <div style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'white',
            padding: '8px 0'
          }}>
            <span style={{ fontSize: '18px', transform: 'rotate(90deg)', display: 'block' }}>✂</span>
            <span style={{
              fontSize: '8px',
              fontWeight: 'bold',
              letterSpacing: '1px',
              color: '#6b7280',
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              transform: 'rotate(180deg)',
              whiteSpace: 'nowrap'
            }}>TEAR HERE</span>
          </div>
        </div>

        <Copy type="CUSTOMER COPY" />
      </div>
    </div>
  );
}
