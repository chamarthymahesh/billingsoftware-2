import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Package, AlertTriangle, TrendingUp } from 'lucide-react';
import './Products.css'; // Reusing existing styles where possible, or we can use App.css

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const GlobalStock = () => {
  const [products, setProducts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  const authHeader = { Authorization: `Bearer ${userInfo?.token}` };

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const compRes = await axios.get(`${API}/api/companies`, { headers: authHeader });
        setCompanies(compRes.data);
        if (userInfo.role !== 'Super Admin' && compRes.data.length > 0) {
          setSelectedCompany(compRes.data[0]._id);
        }
      } catch (err) {
        console.error('Error fetching companies:', err);
      }
    };
    fetchCompanies();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const url = selectedCompany 
          ? `${API}/api/products?companyId=${selectedCompany}`
          : `${API}/api/products`;
        const prodRes = await axios.get(url, { headers: authHeader });
        setProducts(prodRes.data);
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [selectedCompany]);

  const filteredProducts = products.filter(p => {
    const matchesSearch = (p.name || '').toLowerCase().includes(search.toLowerCase()) || 
                          (p.sku || '').toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const totalStockValue = filteredProducts.reduce((sum, p) => sum + ((p.purchasePrice || 0) * (p.stock || 0)), 0);
  const totalItems = filteredProducts.reduce((sum, p) => sum + (p.stock || 0), 0);
  const lowStockCount = filteredProducts.filter(p => (p.stock || 0) <= (p.minStockLevel || 5)).length;

  return (
    <div className="sl-page">
      <div className="sl-header">
        <div>
          <h1 className="sl-title">Global Stock</h1>
          <p className="sl-subtitle">View stock levels across all your companies</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="sl-stats" style={{ marginBottom: '24px' }}>
        <div className="sl-stat">
          <div className="sl-stat-icon" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <p>TOTAL STOCK VALUE</p>
            <h3>₹{totalStockValue.toFixed(2)}</h3>
          </div>
        </div>
        <div className="sl-stat">
          <div className="sl-stat-icon" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
            <Package size={24} />
          </div>
          <div>
            <p>TOTAL ITEMS IN STOCK</p>
            <h3>{totalItems}</h3>
          </div>
        </div>
        <div className="sl-stat" style={{ border: lowStockCount > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : 'none' }}>
          <div className="sl-stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <p>LOW STOCK ALERTS</p>
            <h3>{lowStockCount}</h3>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="sl-toolbar" style={{ marginBottom: '16px' }}>
        <div className="sl-search">
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
          style={{ width: '250px' }}
          disabled={userInfo.role !== 'Super Admin'}
        >
          {userInfo.role === 'Super Admin' && <option value="">All Companies</option>}
          {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
      </div>

      {/* Data Table */}
      <div className="sl-table-wrap">
        <table className="sl-table">
          <thead>
            <tr>
              <th>Product Name</th>
              <th>SKU</th>
              <th>Company</th>
              <th>Category</th>
              <th>Unit Cost</th>
              <th>Current Stock</th>
              <th>Stock Value</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="sl-center">Loading stock data...</td></tr>
            ) : filteredProducts.length === 0 ? (
              <tr><td colSpan={8} className="sl-center">No products found.</td></tr>
            ) : (
              filteredProducts.map(p => (
                <tr key={p._id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td><span className="sl-code">{p.sku || '-'}</span></td>
                  <td><span style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '0.8rem' }}>{selectedCompany ? (companies.find(c => c._id === selectedCompany)?.name || 'Unknown') : 'Universal'}</span></td>
                  <td>{p.category || '-'}</td>
                  <td>₹{(p.purchasePrice || 0).toFixed(2)}</td>
                  <td style={{ fontWeight: 'bold', color: p.stock <= p.minStockLevel ? '#ef4444' : '#10b981' }}>
                    {p.stock || 0} {p.unit || 'Pcs'}
                  </td>
                  <td>₹{((p.stock || 0) * (p.purchasePrice || 0)).toFixed(2)}</td>
                  <td>
                    {p.stock <= p.minStockLevel ? (
                      <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                        <AlertTriangle size={14} /> Low Stock
                      </span>
                    ) : (
                      <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 600 }}>In Stock</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GlobalStock;
