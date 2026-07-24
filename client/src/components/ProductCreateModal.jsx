import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Package, Tag, Layers, DollarSign, Hash, Boxes, FileText, Plus } from 'lucide-react';
import './ProductCreateModal.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const GST_RATES = [0, 0.1, 0.25, 1, 1.5, 3, 5, 7.5, 12, 18, 28];
const UNITS = ['Pcs', 'Kg', 'Gm', 'Ltr', 'Ml', 'Box', 'Carton', 'Dozen', 'Meter', 'Feet', 'Set'];

const toProperCase = (str = '') =>
  str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

const emptyForm = {
  name: '', brand: '', productType: 'Physical Good', category: '',
  sku: '', barcode: '', hsnCode: '', unit: 'Pcs', gstRate: 18,
  purchasePrice: 0, sellingPrice: 0, mrp: 0, stock: 0, minStockLevel: 5, description: '',
};

const ProductCreateModal = ({ isOpen, onClose, onProductCreated, initialName = '' }) => {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  const authHeader = { Authorization: `Bearer ${userInfo?.token}` };

  useEffect(() => {
    if (isOpen) {
      setForm({
        ...emptyForm,
        name: toProperCase(initialName),
      });
    }
  }, [isOpen, initialName]);

  const handleInput = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      ...form,
      name: toProperCase(form.name),
      brand: toProperCase(form.brand),
      category: toProperCase(form.category),
    };
    try {
      const { data } = await axios.post(`${API}/api/products`, payload, {
        headers: { ...authHeader, 'Content-Type': 'application/json' }
      });
      if (onProductCreated) {
        onProductCreated(data);
      }
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving product');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="pr-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pr-modal">
        {/* Header */}
        <div className="pr-modal-header">
          <div className="pr-modal-icon"><Package size={20} /></div>
          <div>
            <h2>Add New Product</h2>
            <p>All fields marked * are required</p>
          </div>
          <button type="button" className="pr-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="pr-modal-body">
          {/* Basic Info */}
          <div className="pr-section-title"><Tag size={14} /> Basic Information</div>
          <div className="pr-grid-2">
            <div className="pr-field span-2">
              <label>Product Name *</label>
              <input
                type="text"
                name="name"
                required
                value={form.name}
                onChange={handleInput}
                placeholder="Enter product name..."
              />
            </div>

            <div className="pr-field">
              <label>Brand</label>
              <input
                type="text"
                name="brand"
                value={form.brand}
                onChange={handleInput}
                placeholder="Enter brand..."
              />
            </div>

            <div className="pr-field">
              <label>Product Type</label>
              <select name="productType" value={form.productType} onChange={handleInput}>
                <option>Physical Good</option>
                <option>Service</option>
              </select>
            </div>

            <div className="pr-field">
              <label>Category</label>
              <input
                type="text"
                name="category"
                value={form.category}
                onChange={handleInput}
                placeholder="Enter category..."
              />
            </div>

            <div className="pr-field">
              <label>Unit of Measure</label>
              <select name="unit" value={form.unit} onChange={handleInput}>
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Codes */}
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

          {/* Tax */}
          <div className="pr-section-title"><Layers size={14} /> Tax Information</div>
          <div className="pr-grid-3">
            <div className="pr-field">
              <label>GST Rate (%)</label>
              <select name="gstRate" value={form.gstRate} onChange={handleInput}>
                {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
              </select>
            </div>
          </div>

          {/* Pricing */}
          <div className="pr-section-title"><DollarSign size={14} /> Pricing <span className="pr-section-note">(All prices Excl. GST)</span></div>
          <div className="pr-grid-3">
            <div className="pr-field">
              <label>Purchase Price (₹) *</label>
              <div className="pr-input-prefix"><span>₹</span>
                <input type="number" required name="purchasePrice" min="0" step="0.01" value={form.purchasePrice} onChange={handleInput} />
              </div>
            </div>
            <div className="pr-field">
              <label>Selling Price (₹) *</label>
              <div className="pr-input-prefix"><span>₹</span>
                <input type="number" name="sellingPrice" required min="0" step="0.01" value={form.sellingPrice} onChange={handleInput} />
              </div>
            </div>
            <div className="pr-field">
              <label>M.R.P. (₹)</label>
              <div className="pr-input-prefix"><span>₹</span>
                <input type="number" name="mrp" min="0" step="0.01" value={form.mrp} onChange={handleInput} />
              </div>
            </div>
          </div>

          {/* Stock */}
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

          {/* Description */}
          <div className="pr-section-title"><FileText size={14} /> Description</div>
          <div className="pr-field">
            <textarea name="description" rows={3} value={form.description}
              onChange={handleInput} placeholder="Product details, notes…" />
          </div>

          {/* Footer */}
          <div className="pr-modal-footer">
            <button type="button" className="pr-btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="pr-btn-save" disabled={loading}>
              <Plus size={16} /> {loading ? 'Saving...' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductCreateModal;
