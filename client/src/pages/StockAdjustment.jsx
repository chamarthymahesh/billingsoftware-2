import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Save, AlertTriangle, Check } from 'lucide-react';
import './Products.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const StockAdjustment = () => {
  const [products, setProducts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [search, setSearch] = useState('');
  const [showNegativeOnly, setShowNegativeOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Keep track of edited stock values locally before saving
  const [editValues, setEditValues] = useState({});
  const [updatingId, setUpdatingId] = useState(null);
  const [successId, setSuccessId] = useState(null);

  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  const authHeader = { Authorization: `Bearer ${userInfo?.token}` };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [compRes, prodRes] = await Promise.all([
        axios.get(`${API}/api/companies`, { headers: authHeader }),
        axios.get(`${API}/api/products`, { headers: authHeader })
      ]);
      setCompanies(compRes.data);
      setProducts(prodRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStockChange = (productId, value) => {
    setEditValues({
      ...editValues,
      [productId]: value
    });
  };

  const handleUpdateStock = async (product) => {
    const newValue = editValues[product._id];
    if (newValue === undefined || newValue === '') return;

    setUpdatingId(product._id);
    try {
      await axios.put(`${API}/api/products/${product._id}`, {
        stock: Number(newValue)
      }, { headers: authHeader });
      
      // Update local state to reflect change instantly
      setProducts(products.map(p => 
        p._id === product._id ? { ...p, stock: Number(newValue) } : p
      ));
      
      // Show success tick briefly
      setSuccessId(product._id);
      setTimeout(() => setSuccessId(null), 2000);
      
      // Remove from edit state
      const newEdits = { ...editValues };
      delete newEdits[product._id];
      setEditValues(newEdits);
      
    } catch (err) {
      console.error('Error updating stock', err);
      alert('Failed to update stock');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = (p.name || '').toLowerCase().includes(search.toLowerCase()) || 
                          (p.sku || '').toLowerCase().includes(search.toLowerCase());
    const matchesCompany = selectedCompany ? (p.companyId?._id === selectedCompany) : true;
    const matchesNegative = showNegativeOnly ? (p.stock || 0) < 0 : true;
    
    return matchesSearch && matchesCompany && matchesNegative;
  });

  const negativeCount = products.filter(p => (p.stock || 0) < 0).length;

  return (
    <div className="sl-page">
      <div className="sl-header">
        <div>
          <h1 className="sl-title">Stock Adjustment</h1>
          <p className="sl-subtitle">Correct inventory discrepancies and fix negative stock</p>
        </div>
      </div>

      {/* Filters */}
      <div className="sl-toolbar" style={{ marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div className="sl-search" style={{ minWidth: '300px' }}>
          <Search size={16} className="sl-search-icon" />
          <input
            placeholder="Search by product name or SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        
        <select 
          className="sl-company-select" 
          value={selectedCompany} 
          onChange={e => setSelectedCompany(e.target.value)}
        >
          <option value="">All Companies</option>
          {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>

        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          background: showNegativeOnly ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.05)',
          border: showNegativeOnly ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid transparent',
          padding: '8px 16px', 
          borderRadius: '8px', 
          cursor: 'pointer',
          color: showNegativeOnly ? '#ef4444' : '#e2e8f0',
          fontWeight: 600,
          transition: 'all 0.2s'
        }}>
          <input 
            type="checkbox" 
            checked={showNegativeOnly} 
            onChange={(e) => setShowNegativeOnly(e.target.checked)} 
            style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
          />
          <AlertTriangle size={18} />
          Show Only Negative Stock ({negativeCount})
        </label>
      </div>

      {/* Data Table */}
      <div className="sl-table-wrap">
        <table className="sl-table">
          <thead>
            <tr>
              <th>Product Name</th>
              <th>SKU</th>
              <th>Company</th>
              <th style={{ textAlign: 'center' }}>Current Stock</th>
              <th style={{ minWidth: '180px' }}>Adjust To</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="sl-center">Loading products...</td></tr>
            ) : filteredProducts.length === 0 ? (
              <tr><td colSpan={6} className="sl-center">No products found matching criteria.</td></tr>
            ) : (
              filteredProducts.map(p => {
                const isNegative = (p.stock || 0) < 0;
                const hasEdits = editValues[p._id] !== undefined && editValues[p._id] !== '';
                
                return (
                  <tr key={p._id} style={{ background: isNegative ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td><span className="sl-code">{p.sku || '-'}</span></td>
                    <td><span style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '0.8rem' }}>{p.companyId?.name || 'Unknown'}</span></td>
                    
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ 
                        display: 'inline-block',
                        padding: '4px 12px', 
                        borderRadius: '12px',
                        fontWeight: 'bold', 
                        background: isNegative ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.1)',
                        color: isNegative ? '#f87171' : '#e2e8f0'
                      }}>
                        {p.stock || 0} {p.unit || 'Pcs'}
                      </span>
                    </td>
                    
                    <td>
                      <input 
                        type="number" 
                        value={editValues[p._id] !== undefined ? editValues[p._id] : ''}
                        onChange={(e) => handleStockChange(p._id, e.target.value)}
                        placeholder="New value"
                        className="sl-input"
                        style={{ 
                          width: '120px', 
                          padding: '6px 12px', 
                          background: 'rgba(15, 23, 42, 0.6)',
                          borderColor: hasEdits ? '#3b82f6' : 'rgba(255,255,255,0.1)'
                        }}
                      />
                    </td>
                    
                    <td>
                      {successId === p._id ? (
                        <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                          <Check size={18} /> Updated
                        </span>
                      ) : (
                        <button 
                          onClick={() => handleUpdateStock(p)}
                          disabled={!hasEdits || updatingId === p._id}
                          style={{
                            background: hasEdits ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                            color: hasEdits ? '#fff' : '#94a3b8',
                            border: 'none',
                            padding: '6px 16px',
                            borderRadius: '6px',
                            cursor: hasEdits ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: 600,
                            transition: 'all 0.2s'
                          }}
                        >
                          <Save size={14} />
                          {updatingId === p._id ? 'Saving...' : 'Update'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StockAdjustment;
