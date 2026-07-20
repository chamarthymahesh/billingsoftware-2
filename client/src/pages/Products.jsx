import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Plus, X, Package, Search, Trash2, Edit2,
  Tag, Layers, BarChart2, AlertTriangle, DollarSign,
  Hash, FileText, Boxes
} from 'lucide-react';
import CreatableSelect from '../components/CreatableSelect';
import './Products.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const toProperCase = (str = '') =>
  str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

const GST_RATES  = [0, 0.1, 0.25, 1, 1.5, 3, 5, 7.5, 12, 18, 28];
const UNITS      = ['Pcs', 'Kg', 'Gm', 'Ltr', 'Ml', 'Box', 'Carton', 'Dozen', 'Meter', 'Feet', 'Set'];

const emptyForm = {
  name: '', brand: '', productType: 'Physical Good', category: '',
  sku: '', barcode: '', hsnCode: '', unit: 'Pcs', gstRate: 18,
  purchasePrice: 0, sellingPrice: 0, mrp: 0, stock: 0, minStockLevel: 5, description: '',
};

const Products = () => {
  const [products, setProducts]     = useState([]);
  const [companies, setCompanies]   = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [loading, setLoading]       = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm]             = useState(emptyForm);
  const [search, setSearch]         = useState('');

  const userInfo   = JSON.parse(localStorage.getItem('userInfo'));
  const authHeader = { Authorization: `Bearer ${userInfo?.token}` };

  // Derived option lists from existing products (unique values in Proper Case)
  const productNames = [...new Set(products.map(p => toProperCase(p.name)))].filter(Boolean);
  const brandOptions = [...new Set(products.map(p => toProperCase(p.brand)))].filter(Boolean);
  const categoryOptions = [...new Set(products.map(p => toProperCase(p.category)))].filter(Boolean);

  useEffect(() => {
    axios.get(`${API}/api/companies`, { headers: authHeader })
      .then(r => { setCompanies(r.data); if (r.data.length > 0) setSelectedCompany(r.data[0]._id); })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedCompany) return;
    setLoading(true);
    axios.get(`${API}/api/products?companyId=${selectedCompany}`, { headers: authHeader })
      .then(r => setProducts(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedCompany]);

  const openAdd  = () => { setForm({ ...emptyForm }); setEditProduct(null); setIsModalOpen(true); };
  const openEdit = (p) => { setForm({ ...p }); setEditProduct(p); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); setEditProduct(null); };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  // Handler for CreatableSelect fields
  const handleSelectChange = (field) => (value) => {
    setForm(f => ({ ...f, [field]: toProperCase(value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      name:     toProperCase(form.name),
      brand:    toProperCase(form.brand),
      category: toProperCase(form.category),
    };
    try {
      if (editProduct) {
        const { data } = await axios.put(`${API}/api/products/${editProduct._id}`, payload,
          { headers: { ...authHeader, 'Content-Type': 'application/json' } });
        setProducts(ps => ps.map(p => p._id === data._id ? data : p));
      } else {
        const { data } = await axios.post(`${API}/api/products`, payload,
          { headers: { ...authHeader, 'Content-Type': 'application/json' } });
        setProducts(ps => [data, ...ps]);
      }
      closeModal();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving product');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    await axios.delete(`${API}/api/products/${id}`, { headers: authHeader });
    setProducts(ps => ps.filter(p => p._id !== id));
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.brand || '').toLowerCase().includes(search.toLowerCase())
  );

  const getStockStatus = (p) => {
    if (p.stock === 0) return 'out';
    if (p.stock <= p.minStockLevel) return 'low';
    return 'ok';
  };

  return (
    <div className="pr-page">
      {/* Header */}
      <div className="pr-header">
        <div>
          <h1 className="pr-title">Products</h1>
          <p className="pr-subtitle">{products.length} products across your inventory</p>
        </div>
        {userInfo?.role === 'Super Admin' && (
          <button className="pr-add-btn" onClick={openAdd}>
            <Plus size={18} /> Add Product
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="pr-stats">
        <div className="pr-stat">
          <div className="pr-stat-icon" style={{ background:'rgba(99,102,241,.15)', color:'#818cf8' }}><Package size={20} /></div>
          <div><p>Total Products</p><h3>{products.length}</h3></div>
        </div>
        <div className="pr-stat">
          <div className="pr-stat-icon" style={{ background:'rgba(16,185,129,.15)', color:'#34d399' }}><Boxes size={20} /></div>
          <div><p>In Stock</p><h3>{products.filter(p => p.stock > p.minStockLevel).length}</h3></div>
        </div>
        <div className="pr-stat">
          <div className="pr-stat-icon" style={{ background:'rgba(245,158,11,.15)', color:'#fbbf24' }}><AlertTriangle size={20} /></div>
          <div><p>Low Stock</p><h3>{products.filter(p => p.stock > 0 && p.stock <= p.minStockLevel).length}</h3></div>
        </div>
        <div className="pr-stat">
          <div className="pr-stat-icon" style={{ background:'rgba(239,68,68,.15)', color:'#f87171' }}><BarChart2 size={20} /></div>
          <div><p>Out of Stock</p><h3>{products.filter(p => p.stock === 0).length}</h3></div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="pr-toolbar">
        <div className="pr-search">
          <Search size={16} className="pr-search-icon" />
          <input placeholder="Search by name, SKU, brand or category…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="pr-company-select" value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)}>
          {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="pr-table-wrap">
        <table className="pr-table">
          <thead>
            <tr>
              <th>Product</th><th>Brand</th><th>Category</th><th>HSN</th>
              <th>GST%</th><th>Purchase (Excl.)</th><th>Selling (Excl.)</th><th>MRP</th><th>Stock</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="pr-center">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={10} className="pr-center">
                <Package size={36} style={{ color:'#334155', marginBottom:'0.5rem' }} />
                <div>No products found</div>
              </td></tr>
            ) : filtered.map(p => (
              <tr key={p._id} className={`pr-row status-${getStockStatus(p)}`}>
                <td>
                  <div className="pr-product-name">{toProperCase(p.name)}</div>
                  <div className="pr-product-sku">{p.sku || '—'}</div>
                </td>
                <td><span className="pr-brand">{toProperCase(p.brand) || '—'}</span></td>
                <td><span className="pr-badge">{toProperCase(p.category) || '—'}</span></td>
                <td><code className="pr-code">{p.hsnCode || '—'}</code></td>
                <td><span className="pr-gst">{p.gstRate}%</span></td>
                <td className="pr-price">₹{Number(p.purchasePrice).toFixed(2)}</td>
                <td className="pr-price">₹{Number(p.sellingPrice).toFixed(2)}</td>
                <td className="pr-price">₹{Number(p.mrp).toFixed(2)}</td>
                <td>
                  <div className={`pr-stock-badge stock-${getStockStatus(p)}`}>
                    {p.stock} {p.unit}
                  </div>
                </td>
                <td>
                  <div className="pr-actions">
                    <button className="pr-act edit" onClick={() => openEdit(p)}><Edit2 size={15} /></button>
                    {userInfo?.role === 'Super Admin' && (
                      <button className="pr-act delete" onClick={() => handleDelete(p._id)}><Trash2 size={15} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Modal ── */}
      {isModalOpen && (
        <div className="pr-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="pr-modal">
            {/* Header */}
            <div className="pr-modal-header">
              <div className="pr-modal-icon"><Package size={20} /></div>
              <div>
                <h2>{editProduct ? 'Edit Product' : 'Add New Product'}</h2>
                <p>All fields marked * are required</p>
              </div>
              <button className="pr-close" onClick={closeModal}><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit} className="pr-modal-body">

              {/* ── Basic Info ── */}
              <div className="pr-section-title"><Tag size={14} /> Basic Information</div>
              <div className="pr-grid-2">
                {/* Product Name – CreatableSelect */}
                <div className="pr-field span-2">
                  <label>Product Name * <span className="pr-hint">(Proper Case)</span></label>
                  <CreatableSelect
                    value={form.name}
                    onChange={handleSelectChange('name')}
                    options={productNames}
                    placeholder="Search or create product name…"
                  />
                  {/* Hidden input to make form validation work */}
                  <input type="text" required value={form.name} onChange={() => {}}
                    style={{ position:'absolute', opacity:0, height:0, pointerEvents:'none' }} />
                </div>

                {/* Brand – CreatableSelect */}
                <div className="pr-field">
                  <label>Brand <span className="pr-hint">(Proper Case)</span></label>
                  <CreatableSelect
                    value={form.brand}
                    onChange={handleSelectChange('brand')}
                    options={brandOptions}
                    placeholder="Search or create brand…"
                  />
                </div>

                {/* Product Type */}
                <div className="pr-field">
                  <label>Product Type</label>
                  <select name="productType" value={form.productType} onChange={handleInput}>
                    <option>Physical Good</option>
                    <option>Service</option>
                  </select>
                </div>

                {/* Category – CreatableSelect */}
                <div className="pr-field">
                  <label>Category <span className="pr-hint">(Proper Case)</span></label>
                  <CreatableSelect
                    value={form.category}
                    onChange={handleSelectChange('category')}
                    options={categoryOptions}
                    placeholder="Search or create category…"
                  />
                </div>

                {/* Unit */}
                <div className="pr-field">
                  <label>Unit of Measure</label>
                  <select name="unit" value={form.unit} onChange={handleInput}>
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {/* ── Codes ── */}
              <div className="pr-section-title"><Hash size={14} /> Identification Codes</div>
              <div className="pr-grid-3">
                <div className="pr-field">
                  <label>SKU / Item Code</label>
                  <input name="sku" value={form.sku} onChange={handleInput} placeholder="Product Code" />
                </div>
                <div className="pr-field">
                  <label>Barcode (EAN/UPC)</label>
                  <input name="barcode" value={form.barcode} onChange={handleInput} placeholder="Scan Barcode" />
                </div>
                <div className="pr-field">
                  <label>HSN / SAC Code</label>
                  <input name="hsnCode" value={form.hsnCode} onChange={handleInput} placeholder="GST Category Code" />
                </div>
              </div>

              {/* ── Tax ── */}
              <div className="pr-section-title"><Layers size={14} /> Tax Information</div>
              <div className="pr-grid-3">
                <div className="pr-field">
                  <label>GST Rate (%)</label>
                  <select name="gstRate" value={form.gstRate} onChange={handleInput}>
                    {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                  </select>
                </div>
              </div>

              {/* ── Pricing (Excl. GST) ── */}
              <div className="pr-section-title"><DollarSign size={14} /> Pricing <span className="pr-section-note">(All prices Excl. GST)</span></div>
              <div className="pr-grid-3">
                <div className="pr-field">
                  <label>Purchase Price (₹) *</label>
                  <div className="pr-input-prefix"><span>₹</span>
                    <input type="number" name="purchasePrice" min="0" step="0.01" value={form.purchasePrice} onChange={handleInput} />
                  </div>
                  <span className="pr-field-hint">Excl. GST — taxable value</span>
                </div>
                <div className="pr-field">
                  <label>Selling Price (₹) *</label>
                  <div className="pr-input-prefix"><span>₹</span>
                    <input type="number" name="sellingPrice" required min="0" step="0.01" value={form.sellingPrice} onChange={handleInput} />
                  </div>
                  <span className="pr-field-hint">Excl. GST — taxable value</span>
                </div>
                <div className="pr-field">
                  <label>M.R.P. (₹)</label>
                  <div className="pr-input-prefix"><span>₹</span>
                    <input type="number" name="mrp" min="0" step="0.01" value={form.mrp} onChange={handleInput} />
                  </div>
                  <span className="pr-field-hint">Incl. GST — printed price</span>
                </div>
              </div>

              {/* ── Stock ── */}
              <div className="pr-section-title"><Boxes size={14} /> Stock Information</div>
              <div className="pr-grid-3">
                <div className="pr-field">
                  <label>Initial Stock</label>
                  <input type="number" name="stock" min="0" value={form.stock} onChange={handleInput} />
                </div>
                <div className="pr-field">
                  <label>Min Stock Level (Alert)</label>
                  <input type="number" name="minStockLevel" min="0" value={form.minStockLevel} onChange={handleInput} />
                </div>
              </div>

              {/* ── Description ── */}
              <div className="pr-section-title"><FileText size={14} /> Description</div>
              <div className="pr-field">
                <textarea name="description" rows={3} value={form.description}
                  onChange={handleInput} placeholder="Product details, notes…" />
              </div>

              {/* Footer */}
              <div className="pr-modal-footer">
                <button type="button" className="pr-btn-cancel" onClick={closeModal}>Cancel</button>
                <button type="submit" className="pr-btn-save">
                  <Plus size={16} /> {editProduct ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
