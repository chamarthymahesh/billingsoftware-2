import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { X, Plus, Trash2 } from 'lucide-react';
import CreatableSelect from './CreatableSelect';
import ProductCreateModal from './ProductCreateModal';
import './RecordPurchaseModal.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const toProperCase = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
};

const GST_RATES = [0, 0.1, 0.25, 1, 1.5, 3, 5, 7.5, 12, 18, 28];

const makeItem = () => ({
  id: Date.now() + Math.random(),
  productName: '',
  productId: '',
  qty: 1,
  rate: 0,
  gstRate: 18,
  isInclusive: false,
  total: 0,
});

const calcTotal = (item) => {
  const qty = parseFloat(item.qty) || 0;
  const rate = parseFloat(item.rate) || 0;
  const gst = parseFloat(item.gstRate) || 0;
  if (item.isInclusive) {
    const base = (rate / (1 + gst / 100)) * qty;
    return Number((rate * qty).toFixed(2));
  }
  const base = rate * qty;
  return Number((base + base * (gst / 100)).toFixed(2));
};

const RecordPurchaseModal = ({ isOpen, onClose, companies, suppliers, products, onPurchaseAdded, editingPurchase, onPurchaseUpdated, prepopulatedData }) => {
  const isEditMode = Boolean(editingPurchase);
  const [form, setForm] = useState({
    targetCompany: prepopulatedData?.targetCompany || editingPurchase?.targetCompany?._id || editingPurchase?.targetCompany || (companies.length > 0 ? companies[0]._id : ''),
    supplierName: prepopulatedData?.supplierName || editingPurchase?.supplierName || '',
    supplierGSTIN: prepopulatedData?.supplierGSTIN || editingPurchase?.supplierGSTIN || '',
    billNumber: prepopulatedData?.billNumber || editingPurchase?.billNumber || '',
    purchaseDate: prepopulatedData?.purchaseDate || (editingPurchase?.purchaseDate ? new Date(editingPurchase.purchaseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
    paymentStatus: prepopulatedData?.paymentStatus || editingPurchase?.paymentStatus || 'Pending',
    packagingCharges: prepopulatedData?.packagingCharges || editingPurchase?.packagingCharges || 0,
    transportCharges: prepopulatedData?.transportCharges || editingPurchase?.transportCharges || 0,
    otherMiscCharges: prepopulatedData?.otherMiscCharges || editingPurchase?.otherMiscCharges || 0,
    adjustment: prepopulatedData?.adjustment || editingPurchase?.adjustment || 0,
  });

  const [items, setItems] = useState(() => {
    if (prepopulatedData?.items?.length > 0) {
      return prepopulatedData.items.map(i => ({
        id: i.id || (Date.now() + Math.random()),
        productName: i.productName || '',
        productId: i.productId || '',
        qty: i.qty || 1,
        rate: i.rate || 0,
        gstRate: i.gstRate || 18,
        isInclusive: i.isInclusive || false,
        total: i.total || calcTotal(i),
      }));
    }
    if (editingPurchase?.items?.length > 0) {
      return editingPurchase.items.map(i => ({
        id: Date.now() + Math.random(),
        productName: i.product?.name || i.productName || '',
        productId: i.product?._id || i.product || '',
        qty: i.qty,
        rate: i.rate,
        gstRate: i.gstRate || 18,
        isInclusive: i.isInclusive || false,
        total: i.total || calcTotal(i),
      }));
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const tableBottomRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setForm({
        targetCompany: prepopulatedData?.targetCompany || editingPurchase?.targetCompany?._id || editingPurchase?.targetCompany || (companies.length > 0 ? companies[0]._id : ''),
        supplierName: prepopulatedData?.supplierName || editingPurchase?.supplierName || '',
        supplierGSTIN: prepopulatedData?.supplierGSTIN || editingPurchase?.supplierGSTIN || '',
        billNumber: prepopulatedData?.billNumber || editingPurchase?.billNumber || '',
        purchaseDate: prepopulatedData?.purchaseDate || (editingPurchase?.purchaseDate ? new Date(editingPurchase.purchaseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
        paymentStatus: prepopulatedData?.paymentStatus || editingPurchase?.paymentStatus || 'Pending',
        packagingCharges: prepopulatedData?.packagingCharges || editingPurchase?.packagingCharges || 0,
        transportCharges: prepopulatedData?.transportCharges || editingPurchase?.transportCharges || 0,
        otherMiscCharges: prepopulatedData?.otherMiscCharges || editingPurchase?.otherMiscCharges || 0,
        adjustment: prepopulatedData?.adjustment || editingPurchase?.adjustment || 0,
      });

      if (prepopulatedData?.items?.length > 0) {
        setItems(prepopulatedData.items.map(i => ({
          id: i.id || (Date.now() + Math.random()),
          productName: i.productName || '',
          productId: i.productId || '',
          qty: i.qty || 1,
          rate: i.rate || 0,
          gstRate: i.gstRate || 18,
          isInclusive: i.isInclusive || false,
          total: i.total || calcTotal(i),
        })));
      } else if (editingPurchase?.items?.length > 0) {
        setItems(editingPurchase.items.map(i => ({
          id: Date.now() + Math.random(),
          productName: i.product?.name || i.productName || '',
          productId: i.product?._id || i.product || '',
          qty: i.qty,
          rate: i.rate,
          gstRate: i.gstRate || 18,
          isInclusive: i.isInclusive || false,
          total: i.total || calcTotal(i),
        })));
      } else {
        setItems([]);
      }
      setShowGlobal(false);
    }
  }, [editingPurchase, prepopulatedData, isOpen]);

  useEffect(() => {
    if (companies.length > 0 && !form.targetCompany) {
      setForm(f => ({ ...f, targetCompany: companies[0]._id }));
    }
  }, [companies]);

  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  const authHeader = { Authorization: `Bearer ${userInfo?.token}` };

  const [showGlobal, setShowGlobal] = useState(false);
  const [modalSuppliers, setModalSuppliers] = useState(suppliers);
  const [modalCompanies, setModalCompanies] = useState(companies);
  const [localProducts, setLocalProducts] = useState([]);
  const [quickProductModalOpen, setQuickProductModalOpen] = useState(false);
  const [quickProductInitialName, setQuickProductInitialName] = useState('');
  const [activeRowIdForQuickProduct, setActiveRowIdForQuickProduct] = useState(null);

  useEffect(() => {
    if (products) setLocalProducts(products);
  }, [products]);

  useEffect(() => {
    const fetchSuppliersAndCompanies = async () => {
      try {
        const companiesUrl = showGlobal ? `${API}/api/companies?global=true` : `${API}/api/companies`;
        const suppliersUrl = (showGlobal || !form.targetCompany)
          ? `${API}/api/suppliers`
          : `${API}/api/suppliers?companyId=${form.targetCompany}`;

        const [compRes, suppRes] = await Promise.all([
          axios.get(companiesUrl, { headers: authHeader }),
          axios.get(suppliersUrl, { headers: authHeader })
        ]);

        setModalCompanies(compRes.data);
        setModalSuppliers(suppRes.data);
      } catch (err) {
        console.error('Error fetching modal suppliers/companies:', err);
      }
    };
    if (isOpen) {
      fetchSuppliersAndCompanies();
    }
  }, [showGlobal, form.targetCompany, isOpen]);

  const combinedSuppliers = [
    ...modalSuppliers.map(s => ({
      name: s.name || s,
      gstin: s.gstin || '',
      isCompany: false
    })),
    ...modalCompanies.map(c => ({
      name: c.name,
      gstin: c.gstin || '',
      isCompany: true
    }))
  ];

  const supplierOptions = [...new Set(combinedSuppliers.map(s => toProperCase(s.name)))].filter(Boolean);
  const productOptions = [...new Set(localProducts.map(p => toProperCase(p.name)))].filter(Boolean);

  const handleInput = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSupplierChange = (val) => {
    const supp = combinedSuppliers.find(s => s.name.toLowerCase() === val.toLowerCase());
    if (supp) {
      setForm(f => ({
        ...f,
        supplierName: supp.name,
        supplierGSTIN: supp.gstin || '',
      }));
    } else {
      setForm(f => ({ ...f, supplierName: toProperCase(val) }));
    }
  };

  const addItem = () => {
    const newItems = [...items, makeItem()];
    setItems(newItems);
    // Scroll to bottom after render
    setTimeout(() => {
      tableBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  const removeItem = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleQuickProductCreated = (newProduct) => {
    // 1. Add it to our local products array
    setLocalProducts(prev => [newProduct, ...prev]);

    // 2. Map this new product into the active item row
    setItems(prev => prev.map(item => {
      if (item.id === activeRowIdForQuickProduct) {
        let updated = {
          ...item,
          productName: newProduct.name,
          productId: newProduct._id,
          rate: newProduct.purchasePrice || 0,
          gstRate: newProduct.gstRate || 18,
          isInclusive: false,
        };
        updated.total = calcTotal(updated);
        return updated;
      }
      return item;
    }));
  };

  const handleItemChange = (id, field, value) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      let updated = { ...item, [field]: value };

      if (field === 'productName') {
        updated.productName = toProperCase(value);
        const found = localProducts.find(p => p.name.toLowerCase() === value.toLowerCase());
        if (found) {
          updated.productId = found._id;
          updated.rate = found.purchasePrice || 0;
          updated.gstRate = found.gstRate || 18;
        } else {
          updated.productId = '';
        }
      }

      if (field === 'total') {
        const newTotal = parseFloat(value) || 0;
        const qty = parseFloat(item.qty) || 0;
        const gst = parseFloat(item.gstRate) || 0;

        if (qty > 0) {
          let newRate;
          if (item.isInclusive) {
            newRate = newTotal / qty;
          } else {
            newRate = newTotal / (qty * (1 + gst / 100));
          }
          updated.rate = Number(newRate.toFixed(2));
        }
        updated.total = value;
      } else {
        updated.total = calcTotal(updated);
      }
      return updated;
    }));
  };

  const itemsTotal = items.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
  const totalTax = items.reduce((sum, item) => {
    const qty = parseFloat(item.qty) || 0;
    const rate = parseFloat(item.rate) || 0;
    const gst = parseFloat(item.gstRate) || 0;
    let taxAmount = 0;
    if (item.isInclusive) {
      const baseRate = rate / (1 + gst / 100);
      taxAmount = (rate * qty) - baseRate * qty;
    } else {
      const taxableAmount = rate * qty;
      taxAmount = (taxableAmount * gst) / 100;
    }
    return sum + taxAmount;
  }, 0);
  const subtotal = itemsTotal - totalTax;

  const selectedCompanyObj = modalCompanies.find(c => c._id === form.targetCompany);
  const buyerGSTIN = selectedCompanyObj?.gstin || '';
  const buyerStateCode = buyerGSTIN.substring(0, 2);
  const supplierGSTIN = form.supplierGSTIN || '';
  const sellerStateCode = supplierGSTIN.substring(0, 2);
  const isInterState = buyerStateCode && sellerStateCode && buyerStateCode !== sellerStateCode;

  const extraCharges = (parseFloat(form.packagingCharges) || 0)
    + (parseFloat(form.transportCharges) || 0)
    + (parseFloat(form.otherMiscCharges) || 0);
  const grandTotal = Math.round(itemsTotal - (parseFloat(form.adjustment) || 0));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) { alert('Please add at least one item.'); return; }
    const invalid = items.filter(i => !i.productId);
    if (invalid.length > 0) {
      alert(`Product "${invalid[0].productName}" not found. Please create it in Products first.`);
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        supplierName: toProperCase(form.supplierName),
        items: items.map(i => ({
          product: i.productId,
          qty: Number(i.qty),
          rate: Number(i.rate),
          gstRate: Number(i.gstRate),
          isInclusive: Boolean(i.isInclusive),
          total: Number(i.total),
        })),
        itemsTotal: Number(itemsTotal.toFixed(2)),
        extraCharges: Number(extraCharges.toFixed(2)),
        adjustment: Number(form.adjustment) || 0,
        grandTotal: Number(grandTotal.toFixed(2)),
      };

      // 1. Create Supplier if doesn't exist
      const isCompany = modalCompanies.some(c => c.name.toLowerCase() === form.supplierName.toLowerCase());
      const existingSupp = modalSuppliers.find(s => (s.name || s).toLowerCase() === form.supplierName.toLowerCase());
      if (!existingSupp && !isCompany && form.supplierName.trim()) {
        try {
          await axios.post(`${API}/api/suppliers`, {
            name: form.supplierName,
            gstin: form.supplierGSTIN,
          }, { headers: authHeader });
        } catch (err) {
          console.error('Error auto-creating supplier:', err);
        }
      }

      if (isEditMode) {
        const { data } = await axios.put(`${API}/api/purchases/${editingPurchase._id}`, payload, {
          headers: { ...authHeader, 'Content-Type': 'application/json' },
        });
        onPurchaseUpdated && onPurchaseUpdated(data);
      } else {
        const { data } = await axios.post(`${API}/api/purchases`, payload, {
          headers: { ...authHeader, 'Content-Type': 'application/json' },
        });
        onPurchaseAdded(data);
      }
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Error recording purchase');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="rpm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="rpm-modal">
        {/* Header */}
        <div className="rpm-header">
          <h2>{isEditMode ? 'Edit Purchase Bill' : 'Record New Purchase Bill'}</h2>
          <button type="button" className="rpm-close" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="rpm-body">
          {/* Top Info Grid */}
          <div className="rpm-grid-2">
            <div className="rpm-field">
              <label>TARGET COMPANY *</label>
              <select name="targetCompany" value={form.targetCompany} onChange={handleInput} required>
                <option value="">-- Choose --</option>
                {modalCompanies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
             <div className="rpm-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ marginBottom: 0, fontSize: '0.75rem', fontWeight: 'bold' }}>SUPPLIER NAME *</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#94a3b8', cursor: 'pointer', userSelect: 'none', fontWeight: 'normal' }}>
                  <input type="checkbox" checked={showGlobal} onChange={e => setShowGlobal(e.target.checked)} style={{ width: 'auto', margin: 0 }} />
                  Show Global
                </label>
              </div>
              <CreatableSelect
                value={form.supplierName}
                onChange={handleSupplierChange}
                options={supplierOptions}
                placeholder="Search or add supplier..."
              />
              <input type="text" required value={form.supplierName} onChange={() => {}}
                style={{ position: 'absolute', opacity: 0, height: 0, pointerEvents: 'none' }} />
            </div>
            <div className="rpm-field">
              <label>SUPPLIER GSTIN</label>
              <input type="text" name="supplierGSTIN" value={form.supplierGSTIN} onChange={handleInput} />
            </div>
            <div className="rpm-field">
              <label>BILL NUMBER *</label>
              <input type="text" name="billNumber" required value={form.billNumber} onChange={handleInput} />
            </div>
            <div className="rpm-field">
              <label>PURCHASE DATE *</label>
              <input 
                type="date" 
                name="purchaseDate" 
                required 
                value={form.purchaseDate} 
                onChange={handleInput} 
                onClick={(e) => e.target.showPicker && e.target.showPicker()}
                onFocus={(e) => e.target.showPicker && e.target.showPicker()}
              />
            </div>
            <div className="rpm-field">
              <label>PAYMENT STATUS</label>
              <select name="paymentStatus" value={form.paymentStatus} onChange={handleInput}>
                <option>Pending</option>
                <option>Paid</option>
                <option>Partial</option>
              </select>
            </div>
          </div>

          {/* Items Section */}
          <div className="rpm-items-section">
            <div className="rpm-items-header">
              <h3>Products in this Bill</h3>
              <span className="rpm-item-count">{items.length} item{items.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="rpm-items-table-wrapper">
              <table className="rpm-items-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: '220px' }}>PRODUCT</th>
                    <th style={{ width: '90px' }}>QTY</th>
                    <th style={{ width: '120px' }}>RATE (₹)</th>
                    <th style={{ width: '80px' }}>GST %</th>
                    <th style={{ width: '70px', textAlign: 'center' }}>INCL?</th>
                    <th style={{ width: '130px' }}>TOTAL (₹)</th>
                    <th style={{ width: '50px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="rpm-empty-items">
                        No items yet — click "+ Add Item" below
                      </td>
                    </tr>
                  )}
                  {items.map(item => (
                    <tr key={item.id}>
                      <td>
                        <CreatableSelect
                          value={item.productName}
                          onChange={val => handleItemChange(item.id, 'productName', val)}
                          options={productOptions}
                          placeholder="Search product..."
                          onCreateOption={(name) => {
                            setQuickProductInitialName(name);
                            setActiveRowIdForQuickProduct(item.id);
                            setQuickProductModalOpen(true);
                          }}
                        />
                      </td>
                      <td>
                        <input type="number" className="rpm-input" min="1" value={item.qty}
                          onChange={e => handleItemChange(item.id, 'qty', e.target.value)} />
                      </td>
                      <td>
                        <input type="number" className="rpm-input" min="0" step="0.01" value={item.rate}
                          onChange={e => handleItemChange(item.id, 'rate', e.target.value)} />
                      </td>
                      <td>
                        <select className="rpm-input" value={item.gstRate}
                          onChange={e => handleItemChange(item.id, 'gstRate', e.target.value)}>
                          {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                        </select>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input type="checkbox" checked={item.isInclusive}
                          onChange={e => handleItemChange(item.id, 'isInclusive', e.target.checked)} />
                      </td>
                      <td>
                        <input type="number" className="rpm-input" min="0" step="0.01" value={item.total}
                          onChange={e => handleItemChange(item.id, 'total', e.target.value)} />
                      </td>
                      <td>
                        <button type="button" className="rpm-delete-item" onClick={() => removeItem(item.id)}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div ref={tableBottomRef} />
            </div>

            {/* Add Item button BELOW table — always visible */}
            <button type="button" className="rpm-add-item-btn" onClick={addItem}>
              <Plus size={14} /> Add Item
            </button>
          </div>

          {/* Charges & Totals */}
          <div className="rpm-footer-section">
            <div className="rpm-charges">
              <div className="rpm-charge-field">
                <label>PACKAGING (₹)</label>
                <input type="number" min="0" step="0.01" name="packagingCharges" value={form.packagingCharges} onChange={handleInput} />
              </div>
              <div className="rpm-charge-field">
                <label>TRANSPORT (₹)</label>
                <input type="number" min="0" step="0.01" name="transportCharges" value={form.transportCharges} onChange={handleInput} />
              </div>
              <div className="rpm-charge-field">
                <label>OTHER (₹)</label>
                <input type="number" min="0" step="0.01" name="otherMiscCharges" value={form.otherMiscCharges} onChange={handleInput} />
              </div>
            </div>
            <div className="rpm-totals">
              <div className="rpm-total-row"><span>Taxable Amount:</span><span>₹{subtotal.toFixed(2)}</span></div>
              {totalTax > 0 && (
                isInterState ? (
                  <div className="rpm-total-row"><span>IGST:</span><span>₹{totalTax.toFixed(2)}</span></div>
                ) : (
                  <>
                    <div className="rpm-total-row"><span>CGST:</span><span>₹{(totalTax / 2).toFixed(2)}</span></div>
                    <div className="rpm-total-row"><span>SGST:</span><span>₹{(totalTax / 2).toFixed(2)}</span></div>
                  </>
                )
              )}
              <div className="rpm-total-row"><span>Items Total:</span><span>₹{itemsTotal.toFixed(2)}</span></div>
              <div className="rpm-total-row"><span>Extra Charges:</span><span>+₹{extraCharges.toFixed(2)}</span></div>
              <div className="rpm-total-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <span>Adjustment (₹):</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="adjustment"
                  className="rpm-input"
                  style={{ width: '120px', textAlign: 'right', padding: '4px 8px' }}
                  value={form.adjustment}
                  onChange={handleInput}
                />
              </div>
              <div className="rpm-total-row rpm-grand-total"><span>Grand Total:</span><span>₹{grandTotal.toFixed(2)}</span></div>
            </div>
          </div>

          {/* Actions */}
          <div className="rpm-actions">
            <button type="button" className="rpm-btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="rpm-btn-submit" disabled={loading}>
              {loading ? 'Saving...' : isEditMode ? 'Update Purchase' : 'Record Purchase'}
            </button>
          </div>
        </form>
      </div>
      <ProductCreateModal
        isOpen={quickProductModalOpen}
        onClose={() => setQuickProductModalOpen(false)}
        initialName={quickProductInitialName}
        onProductCreated={handleQuickProductCreated}
      />
    </div>
  );
};

export default RecordPurchaseModal;
