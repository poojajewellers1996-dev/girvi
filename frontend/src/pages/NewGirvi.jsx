import React, { useState } from 'react';
import { api } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react';

export default function NewGirvi() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [girviData, setGirviData] = useState({
    pledge_no: '',
    pledge_date: new Date().toISOString().split('T')[0],
    due_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    customer_name: '',
    relation_type: '',
    relation_name: '',
    address: '',
    mobile_number: '',
    present_value: 0,
    loan_amount: 0,
    loan_amount_words: '',
  });

  const [articles, setArticles] = useState([
    {
      name: '',
      quantity: 1,
      gross_wt: 0,
      less_wt: 0,
      net_wt: 0,
      present_value: 0,
      loan_amount: 0,
      loan_amount_words: '',
    }
  ]);

  const handleGirviChange = (e) => {
    const { name, value } = e.target;
    setGirviData((prev) => ({
      ...prev,
      [name]: name.includes('amount') || name.includes('value') ? parseFloat(value) || 0 : value
    }));
  };

  const handleArticleChange = (index, e) => {
    const { name, value } = e.target;
    setArticles((prev) => {
      const newArticles = [...prev];
      let val = value;
      if (['quantity'].includes(name)) val = parseInt(value) || 0;
      if (['gross_wt', 'less_wt', 'net_wt', 'present_value', 'loan_amount'].includes(name)) val = parseFloat(value) || 0;
      
      newArticles[index] = { ...newArticles[index], [name]: val };
      
      // Auto calculate net_wt
      if (name === 'gross_wt' || name === 'less_wt') {
        const gross = newArticles[index].gross_wt || 0;
        const less = newArticles[index].less_wt || 0;
        newArticles[index].net_wt = Number((gross - less).toFixed(3));
      }
      return newArticles;
    });
  };

  const addArticle = () => {
    setArticles([...articles, {
      name: '',
      quantity: 1,
      gross_wt: 0,
      less_wt: 0,
      net_wt: 0,
      present_value: 0,
      loan_amount: 0,
      loan_amount_words: '',
    }]);
  };

  const removeArticle = (index) => {
    if (articles.length > 1) {
      setArticles(articles.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Calculate total present_value and loan_amount if not set manually
      let totalPresentValue = girviData.present_value;
      let totalLoanAmount = girviData.loan_amount;

      if (!totalPresentValue) {
        totalPresentValue = articles.reduce((sum, art) => sum + (Number(art.present_value) || 0), 0);
      }
      if (!totalLoanAmount) {
        totalLoanAmount = articles.reduce((sum, art) => sum + (Number(art.loan_amount) || 0), 0);
      }

      const payload = {
        ...girviData,
        pledge_date: new Date(girviData.pledge_date).toISOString(),
        due_date: new Date(girviData.due_date).toISOString(),
        present_value: totalPresentValue,
        loan_amount: totalLoanAmount,
        mobile_number: girviData.mobile_number ? (girviData.mobile_number.startsWith('+') ? girviData.mobile_number : `+91${girviData.mobile_number}`) : null,
        articles: articles.map(art => ({
          ...art,
          loan_amount_words: art.loan_amount_words || 'Zero'
        }))
      };

      if (!payload.loan_amount_words) {
         payload.loan_amount_words = 'Zero';
      }

      await api.createGirvi(payload);
      navigate('/ledger');
    } catch (err) {
      setError(err.message || 'Failed to create Girvi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/ledger')} style={{ padding: '0.5rem' }}>
          <ArrowLeft size={20} />
        </button>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>Create New Girvi</h2>
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Customer Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <div className="input-group">
              <label className="input-label">Pledge No *</label>
              <input type="text" name="pledge_no" className="input-field" value={girviData.pledge_no} onChange={handleGirviChange} required />
            </div>
            <div className="input-group">
              <label className="input-label">Pledge Date *</label>
              <input type="date" name="pledge_date" className="input-field" value={girviData.pledge_date} onChange={handleGirviChange} required />
            </div>
            <div className="input-group">
              <label className="input-label">Due Date *</label>
              <input type="date" name="due_date" className="input-field" value={girviData.due_date} onChange={handleGirviChange} required />
            </div>
            <div className="input-group">
              <label className="input-label">Customer Name *</label>
              <input type="text" name="customer_name" className="input-field" value={girviData.customer_name} onChange={handleGirviChange} required />
            </div>
            <div className="input-group">
              <label className="input-label">Relation Type</label>
              <select name="relation_type" className="input-field" value={girviData.relation_type} onChange={handleGirviChange}>
                <option value="">Select...</option>
                <option value="S/O">S/O</option>
                <option value="D/O">D/O</option>
                <option value="W/O">W/O</option>
                <option value="C/O">C/O</option>
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Relation Name</label>
              <input type="text" name="relation_name" className="input-field" value={girviData.relation_name} onChange={handleGirviChange} />
            </div>
            <div className="input-group">
              <label className="input-label">Mobile Number</label>
              <input type="text" name="mobile_number" className="input-field" placeholder="10-digit number" value={girviData.mobile_number} onChange={handleGirviChange} />
            </div>
            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">Address</label>
              <textarea name="address" className="input-field" value={girviData.address} onChange={handleGirviChange} rows="2"></textarea>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <h3 style={{ margin: 0 }}>Articles</h3>
            <button type="button" className="btn btn-secondary" onClick={addArticle} style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={16} /> Add Article
            </button>
          </div>

          {articles.map((article, index) => (
            <div key={index} style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '1rem', position: 'relative' }}>
              {articles.length > 1 && (
                <button type="button" onClick={() => removeArticle(index)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'rgb(239, 68, 68)', cursor: 'pointer' }}>
                  <Trash2 size={20} />
                </button>
              )}
              <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>Article #{index + 1}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="input-group">
                  <label className="input-label">Name *</label>
                  <input type="text" name="name" className="input-field" value={article.name} onChange={(e) => handleArticleChange(index, e)} required />
                </div>
                <div className="input-group">
                  <label className="input-label">Quantity *</label>
                  <input type="number" name="quantity" className="input-field" min="1" value={article.quantity} onChange={(e) => handleArticleChange(index, e)} required />
                </div>
                <div className="input-group">
                  <label className="input-label">Gross Wt (g) *</label>
                  <input type="number" step="0.001" name="gross_wt" className="input-field" value={article.gross_wt} onChange={(e) => handleArticleChange(index, e)} required />
                </div>
                <div className="input-group">
                  <label className="input-label">Less Wt (g)</label>
                  <input type="number" step="0.001" name="less_wt" className="input-field" value={article.less_wt} onChange={(e) => handleArticleChange(index, e)} />
                </div>
                <div className="input-group">
                  <label className="input-label">Net Wt (g)</label>
                  <input type="number" step="0.001" name="net_wt" className="input-field" value={article.net_wt} readOnly style={{ backgroundColor: 'var(--bg-primary)', cursor: 'not-allowed' }} />
                </div>
                <div className="input-group">
                  <label className="input-label">Present Value (₹) *</label>
                  <input type="number" step="0.01" name="present_value" className="input-field" value={article.present_value} onChange={(e) => handleArticleChange(index, e)} required />
                </div>
                <div className="input-group">
                  <label className="input-label">Loan Amount (₹) *</label>
                  <input type="number" step="0.01" name="loan_amount" className="input-field" value={article.loan_amount} onChange={(e) => handleArticleChange(index, e)} required />
                </div>
                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="input-label">Loan Amount (Words)</label>
                  <input type="text" name="loan_amount_words" className="input-field" value={article.loan_amount_words} onChange={(e) => handleArticleChange(index, e)} placeholder="e.g. Ten Thousand Only" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/ledger')}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Save size={20} /> {loading ? 'Saving...' : 'Save Girvi'}
          </button>
        </div>
      </form>
    </div>
  );
}
