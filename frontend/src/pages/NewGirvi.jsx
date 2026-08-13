import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Save, ArrowLeft, Camera, Image as ImageIcon } from 'lucide-react';
import CameraCapture from '../components/CameraCapture';

export default function NewGirvi() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeCamera, setActiveCamera] = useState(null); // { type: 'customer' } or { type: 'article', index: 0 }

  const [girviData, setGirviData] = useState({
    pledge_no: '',
    pledge_date: new Date().toISOString().split('T')[0],
    due_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    customer_name: '',
    relation_type: '',
    relation_name: '',
    address: '',
    mobile_number: '',
    monthly_income: '',
    present_value: '',
    loan_amount: '',
    loan_amount_words: '',
    photo_path: '',
  });

  const [articles, setArticles] = useState([
    {
      name: '',
      quantity: 1,
      gross_wt: '',
      less_wt: '',
      net_wt: '',
      present_value: '',
      loan_amount: '',
      loan_amount_words: '',
      photo_path: '',
    }
  ]);

  const [isRepledged, setIsRepledged] = useState(false);
  const [availableRepledges, setAvailableRepledges] = useState([]);
  const [repledgeEntries, setRepledgeEntries] = useState([]);

  useEffect(() => {
    api.getRepledges().then(data => setAvailableRepledges(data)).catch(console.error);
  }, []);

  const numberToWords = (num) => {
    if (!num || isNaN(num) || num === 0) return 'Zero';
    num = Math.floor(num);
    const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
    const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];

    if ((num = num.toString()).length > 9) return 'overflow';
    let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    return str.trim() + ' Rupees Only';
  };

  const handleGirviChange = (e) => {
    const { name, value } = e.target;
    let val = value;
    if (name.includes('amount') || name.includes('value') || name === 'monthly_income') {
      val = value === '' ? '' : (parseFloat(value) || '');
    }
    
    setGirviData((prev) => {
      const updated = { ...prev, [name]: val };
      if (name === 'loan_amount') {
        updated.loan_amount_words = numberToWords(val);
      }
      return updated;
    });
  };

  useEffect(() => {
    if (id) {
      setLoading(true);
      api.getGirviById(id)
        .then(data => {
          setGirviData({
            pledge_no: data.pledge_no,
            pledge_date: data.pledge_date.split('T')[0],
            due_date: data.due_date.split('T')[0],
            customer_name: data.customer_name,
            relation_type: data.relation_type || '',
            relation_name: data.relation_name || '',
            address: data.address || '',
            mobile_number: data.mobile_number || '',
            monthly_income: data.monthly_income || '',
            present_value: data.present_value || 0,
            loan_amount: data.loan_amount || 0,
            loan_amount_words: data.loan_amount_words || '',
            photo_path: data.photo_path || '',
            status: data.status || 'Active'
          });
          if (data.articles && data.articles.length > 0) {
            setArticles(data.articles);
          }
          if (data.repledges && data.repledges.length > 0) {
            setIsRepledged(true);
            setRepledgeEntries(data.repledges.map(r => ({
              type: 'link',
              linked_id: r.id,
              loan_number: r.loan_number,
              repledger_name: r.repledger_name,
              bank_name: r.bank_name,
              date_of_loan: r.date_of_loan.split('T')[0],
              amount: r.amount
            })));
          }
        })
        .catch(err => setError(err.message || "Failed to load Girvi"))
        .finally(() => setLoading(false));
    }
  }, [id]);

  useEffect(() => {
    const fetchCustomer = async () => {
      if (girviData.mobile_number && girviData.mobile_number.replace(/\D/g, '').length >= 10) {
        try {
          const formattedMobile = girviData.mobile_number.startsWith('+') ? girviData.mobile_number : `+91${girviData.mobile_number}`;
          const customer = await api.getCustomerByMobile(formattedMobile);
          if (customer) {
            setGirviData(prev => ({
              ...prev,
              customer_name: customer.customer_name || prev.customer_name,
              relation_type: customer.relation_type || prev.relation_type,
              relation_name: customer.relation_name || prev.relation_name,
              address: customer.address || prev.address,
              monthly_income: customer.monthly_income || prev.monthly_income,
            }));
          }
        } catch (err) {
          // Ignore 404 or other errors for autofill
        }
      }
    };
    
    const timeoutId = setTimeout(fetchCustomer, 600);
    return () => clearTimeout(timeoutId);
  }, [girviData.mobile_number]);

  const handleArticleChange = (index, e) => {
    const { name, value } = e.target;
    setArticles((prev) => {
      const newArticles = [...prev];
      let val = value;
      if (['quantity'].includes(name)) val = value === '' ? '' : (parseInt(value) || '');
      if (['gross_wt', 'less_wt', 'net_wt', 'present_value', 'loan_amount'].includes(name)) val = value === '' ? '' : (parseFloat(value) || '');
      
      newArticles[index] = { ...newArticles[index], [name]: val };
      
      // Auto calculate net_wt
      if (name === 'gross_wt' || name === 'less_wt') {
        const gross = Number(newArticles[index].gross_wt) || 0;
        const less = Number(newArticles[index].less_wt) || 0;
        newArticles[index].net_wt = Math.max(0, gross - less) || '';
      }

      if (name === 'loan_amount') {
        newArticles[index].loan_amount_words = numberToWords(val);
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

  const handleImageUpload = (file, callback) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        callback(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleCameraCapture = (dataUrl) => {
    if (activeCamera?.type === 'customer') {
      setGirviData(prev => ({ ...prev, photo_path: dataUrl }));
    } else if (activeCamera?.type === 'article') {
      const newArticles = [...articles];
      newArticles[activeCamera.index].photo_path = dataUrl;
      setArticles(newArticles);
    }
    setActiveCamera(null);
  };

  const addRepledge = () => {
    setRepledgeEntries(prev => [...prev, {
      type: 'new',
      linked_id: '',
      loan_number: '',
      repledger_name: '',
      bank_name: 'KS',
      date_of_loan: new Date().toISOString().split('T')[0],
      amount: ''
    }]);
  };

  const removeRepledge = (index) => {
    setRepledgeEntries(prev => prev.filter((_, i) => i !== index));
  };

  const updateRepledge = (index, field, value) => {
    const updated = [...repledgeEntries];
    updated[index][field] = value;
    setRepledgeEntries(updated);
  };

  const handleRepledgeToggle = (checked) => {
    setIsRepledged(checked);
    if (checked && repledgeEntries.length === 0) {
      addRepledge();
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

      if (isRepledged) {
        payload.repledge_ids = repledgeEntries.filter(r => r.type === 'link' && r.linked_id).map(r => r.linked_id);
        payload.new_repledges = repledgeEntries.filter(r => r.type === 'new').map(r => ({
          loan_number: r.loan_number,
          repledger_name: r.repledger_name,
          bank_name: r.bank_name,
          date_of_loan: new Date(r.date_of_loan || Date.now()).toISOString(),
          amount: Number(r.amount) || 0
        }));
      }

      if (id) {
        const savedGirvi = await api.updateGirvi(id, payload);
        navigate(`/girvi/${savedGirvi.id}/print`);
      } else {
        const savedGirvi = await api.createGirvi(payload);
        navigate(`/girvi/${savedGirvi.id}/print`);
      }
    } catch (err) {
      setError(err.message || 'Failed to create Girvi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
      {activeCamera && (
        <CameraCapture 
          onCapture={handleCameraCapture} 
          onClose={() => setActiveCamera(null)} 
        />
      )}
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

      <form onSubmit={handleSubmit} onWheel={(e) => { if (e.target.type === 'number') e.target.blur(); }}>
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
            <div className="input-group">
              <label className="input-label">Monthly Income (₹)</label>
              <input type="number" step="0.01" name="monthly_income" className="input-field" value={girviData.monthly_income} onChange={handleGirviChange} />
            </div>
            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">Address</label>
              <textarea name="address" className="input-field" value={girviData.address} onChange={handleGirviChange} rows="2"></textarea>
            </div>
            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">Customer Photo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                  <ImageIcon size={18} />
                  {girviData.photo_path ? 'Change File' : 'Upload File'}
                  <input 
                    type="file" 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    onChange={(e) => handleImageUpload(e.target.files[0], (data) => setGirviData(prev => ({ ...prev, photo_path: data })))} 
                  />
                </label>
                <button type="button" className="btn btn-secondary" onClick={() => setActiveCamera({ type: 'customer' })}>
                  <Camera size={18} /> Take Photo
                </button>
                {girviData.photo_path && (
                  <img src={girviData.photo_path} alt="Customer" style={{ height: '50px', width: '50px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border)' }} />
                )}
              </div>
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
                  <label className="input-label">Loan Amount Words</label>
                  <input type="text" name="loan_amount_words" className="input-field" value={article.loan_amount_words} onChange={(e) => handleArticleChange(index, e)} />
                </div>
                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="input-label">Item Photo</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                      <ImageIcon size={18} />
                      {article.photo_path ? 'Change File' : 'Upload File'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        style={{ display: 'none' }} 
                        onChange={(e) => handleImageUpload(e.target.files[0], (data) => {
                          const newArticles = [...articles];
                          newArticles[index].photo_path = data;
                          setArticles(newArticles);
                        })} 
                      />
                    </label>
                    <button type="button" className="btn btn-secondary" onClick={() => setActiveCamera({ type: 'article', index })}>
                      <Camera size={18} /> Take Photo
                    </button>
                    {article.photo_path && (
                      <img src={article.photo_path} alt="Item" style={{ height: '50px', width: '50px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border)' }} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Repledge Section */}
        <div className="card" style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <input 
              type="checkbox" 
              id="repledge_toggle"
              checked={isRepledged}
              onChange={(e) => handleRepledgeToggle(e.target.checked)}
              style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
            />
            <label htmlFor="repledge_toggle" style={{ fontWeight: '600', fontSize: '1.125rem', cursor: 'pointer', margin: 0 }}>
              Is the item repledged?
            </label>
          </div>

          {isRepledged && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {repledgeEntries.map((entry, index) => (
                <div key={index} style={{ padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: '8px', position: 'relative' }}>
                  {repledgeEntries.length > 1 && (
                    <button type="button" onClick={() => removeRepledge(index)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                      <Trash2 size={18} />
                    </button>
                  )}
                  
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input type="radio" name={`repledge_type_${index}`} checked={entry.type === 'new'} onChange={() => updateRepledge(index, 'type', 'new')} /> Create New Repledge
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input type="radio" name={`repledge_type_${index}`} checked={entry.type === 'link'} onChange={() => updateRepledge(index, 'type', 'link')} /> Link Existing Repledge
                    </label>
                  </div>

                  {entry.type === 'link' ? (
                    <div className="input-group">
                      <label className="input-label">Select Existing Repledge *</label>
                      <select className="input-field" value={entry.linked_id} onChange={(e) => updateRepledge(index, 'linked_id', Number(e.target.value))} required>
                        <option value="">-- Select --</option>
                        {availableRepledges.map(r => (
                          <option key={r.id} value={r.id}>{r.loan_number} ({r.bank_name}) - ₹{r.amount}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      <div className="input-group">
                        <label className="input-label">Name (whose name it is kept) *</label>
                        <input type="text" className="input-field" value={entry.repledger_name} onChange={(e) => updateRepledge(index, 'repledger_name', e.target.value)} required />
                      </div>
                      <div className="input-group">
                        <label className="input-label">Loan Number *</label>
                        <input type="text" className="input-field" value={entry.loan_number} onChange={(e) => updateRepledge(index, 'loan_number', e.target.value)} required />
                      </div>
                      <div className="input-group">
                        <label className="input-label">Bank *</label>
                        <select className="input-field" value={entry.bank_name} onChange={(e) => updateRepledge(index, 'bank_name', e.target.value)} required>
                          <option value="KS">KS</option>
                          <option value="MM">MM</option>
                          <option value="BOB">BOB</option>
                          <option value="DH">DH</option>
                          <option value="SBI">SBI</option>
                        </select>
                      </div>
                      <div className="input-group">
                        <label className="input-label">Date of Loan *</label>
                        <input type="date" className="input-field" value={entry.date_of_loan} onChange={(e) => updateRepledge(index, 'date_of_loan', e.target.value)} required />
                      </div>
                      <div className="input-group">
                        <label className="input-label">Amount (₹) *</label>
                        <input type="number" className="input-field" value={entry.amount} onChange={(e) => updateRepledge(index, 'amount', e.target.value)} required />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              <div>
                <button type="button" className="btn btn-secondary" onClick={addRepledge} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Plus size={16} /> Add Another Repledge Link
                </button>
              </div>
            </div>
          )}
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
