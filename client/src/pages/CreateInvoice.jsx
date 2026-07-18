import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Plus, Trash2, Save, FileText, User, Package, IndianRupee, RefreshCw } from 'lucide-react';
import CreatableSelect from '../components/CreatableSelect';
import './CreateInvoice.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const GST_RATES = [0, 0.1, 0.25, 1, 1.5, 3, 5, 7.5, 12, 18, 28];
const INDIAN_STATES = [
  '01 - Jammu & Kashmir',
  '02 - Himachal Pradesh',
  '03 - Punjab',
  '04 - Chandigarh',
  '05 - Uttarakhand',
  '06 - Haryana',
  '07 - Delhi',
  '08 - Rajasthan',
  '09 - Uttar Pradesh',
  '10 - Bihar',
  '11 - Sikkim',
  '12 - Arunachal Pradesh',
  '13 - Nagaland',
  '14 - Manipur',
  '15 - Mizoram',
  '16 - Tripura',
  '17 - Meghalaya',
  '18 - Assam',
  '19 - West Bengal',
  '20 - Jharkhand',
  '21 - Odisha',
  '22 - Chhattisgarh',
  '23 - Madhya Pradesh',
  '24 - Gujarat',
  '26 - Dadra & Nagar Haveli and Daman & Diu',
  '27 - Maharashtra',
  '29 - Karnataka',
  '30 - Goa',
  '31 - Lakshadweep',
  '32 - Kerala',
  '33 - Tamil Nadu',
  '34 - Puducherry',
  '35 - Andaman & Nicobar Islands',
  '36 - Telangana',
  '37 - Andhra Pradesh',
  '38 - Ladakh'
];

const toProper = (s) => {
  if (!s) return '';
  return s.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase());
};

const makeItem = () => ({
  id: Date.now() + Math.random(),
  product: '', productName: '', hsnCode: '', unit: 'Pcs',
  qty: 1, rate: 0, mrp: 0, discount: 0, gstRate: 18,
  isInclusive: false, taxableAmount: 0, taxAmount: 0, total: 0,
  productCompanyId: null, // Keep track of which company owns this product
});

const calcItem = (item) => {
  const qty = parseFloat(item.qty) || 0;
  const rate = parseFloat(item.rate) || 0;
  const disc = parseFloat(item.discount) || 0;
  const gst = parseFloat(item.gstRate) || 0;

  let rateAfterDisc = rate - (rate * disc / 100);

  let taxableAmount, taxAmount, total;
  if (item.isInclusive) {
    const baseRate = rateAfterDisc / (1 + gst / 100);
    taxableAmount = baseRate * qty;
    total = rateAfterDisc * qty;
    taxAmount = total - taxableAmount;
  } else {
    taxableAmount = rateAfterDisc * qty;
    taxAmount = taxableAmount * gst / 100;
    total = taxableAmount + taxAmount;
  }

  return {
    ...item,
    taxableAmount: Number(taxableAmount.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    total: Number(total.toFixed(2)),
  };
};

const CreateInvoice = () => {
  const navigate = useNavigate();
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  const authHeader = { Authorization: `Bearer ${userInfo?.token}` };
  const isSuperAdmin = userInfo?.role === 'Super Admin';

  const [companies, setCompanies] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showGlobalProducts, setShowGlobalProducts] = useState(false);

  const [form, setForm] = useState({
    company: userInfo?.companyId || '',
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    gemContractNumber: '',
    paymentStatus: 'Pending',
    paymentMethod: 'Cash',
    customerName: '',
    customerPhone: '',
    customerGSTIN: '',
    customerState: '',
    billingAddress: '',
    shippingAddress: '',
    placeOfSupply: '',
    packagingCharges: 0,
    transportCharges: 0,
    otherCharges: 0,
    commissionType: 'None', // 'None', 'Percentage', 'Fixed'
    commissionValue: 0,
    notes: '',
    termsConditions: 'Goods once sold will not be taken back.\nAll disputes subject to local jurisdiction.',
  });

  const [items, setItems] = useState([makeItem()]);
  const [sameAsShipping, setSameAsShipping] = useState(false);

  const [showGlobal, setShowGlobal] = useState(false);

  useEffect(() => {
    const fetchCustomersAndCompanies = async () => {
      try {
        const companiesUrl = showGlobal ? `${API}/api/companies?global=true` : `${API}/api/companies`;
        const customersUrl = (showGlobal || !form.company) 
          ? `${API}/api/customers` 
          : `${API}/api/customers?companyId=${form.company}`;

        const [compRes, custRes] = await Promise.all([
          axios.get(companiesUrl, { headers: authHeader }),
          axios.get(customersUrl, { headers: authHeader })
        ]);

        setCompanies(compRes.data);
        setCustomers(custRes.data);

        // Set default company if none set
        let initialCompanyId = form.company;
        if (!initialCompanyId && compRes.data.length > 0) {
           initialCompanyId = compRes.data[0]._id;
           setForm(f => ({ ...f, company: initialCompanyId }));
        }

        if (initialCompanyId && !form.invoiceNumber) {
          const numRes = await axios.get(`${API}/api/invoices/next-number?companyId=${initialCompanyId}`, { headers: authHeader });
          setForm(f => ({ ...f, invoiceNumber: numRes.data.invoiceNumber }));
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchCustomersAndCompanies();
  }, [showGlobal, form.company]);

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API}/api/products`, { headers: authHeader });
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleCompanyChange = async (companyId) => {
    setForm(f => ({ ...f, company: companyId }));
    try {
      const res = await axios.get(`${API}/api/invoices/next-number?companyId=${companyId}`, { headers: authHeader });
      setForm(f => ({ ...f, invoiceNumber: res.data.invoiceNumber }));
    } catch (err) { /* ignore */ }
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const combinedCustomers = [
    ...customers.map(c => ({
      name: c.name,
      phone: c.phone || '',
      gstin: c.gstin || '',
      state: c.state || '',
      billingAddress: c.billingAddress || '',
      shippingAddress: c.shippingAddress || '',
      isCompany: false
    })),
    ...companies.map(c => ({
      name: c.name,
      phone: c.phone || '',
      gstin: c.gstin || '',
      state: c.state || '',
      billingAddress: c.address || '',
      shippingAddress: c.address || '',
      isCompany: true
    }))
  ];

  const handleCustomerSelect = (val) => {
    const cust = combinedCustomers.find(c => c.name.toLowerCase() === val.toLowerCase());
    if (cust) {
      setForm(f => ({
        ...f,
        customerName: cust.name,
        customerPhone: cust.phone || '',
        customerGSTIN: cust.gstin || '',
        customerState: cust.state || '',
        billingAddress: cust.billingAddress || '',
        shippingAddress: cust.shippingAddress || '',
      }));
    } else {
      setForm(f => ({ ...f, customerName: toProper(val) }));
    }
  };

  // Items
  const addItem = () => setItems(prev => [...prev, makeItem()]);
  const removeItem = (id) => setItems(prev => prev.filter(i => i.id !== id));

  const handleItemChange = (id, field, value) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      let updated = { ...item, [field]: value };

      if (field === 'productName') {
        updated.productName = toProper(value);
        const found = products.find(p => p.name.toLowerCase() === value.toLowerCase());
        if (found) {
          updated.product = found._id;
          updated.rate = found.sellingPrice || 0;
          updated.mrp = found.mrp || 0;
          updated.gstRate = found.gstRate || 18;
          updated.hsnCode = found.hsnCode || '';
          updated.unit = found.unit || 'Pcs';
          updated.productCompanyId = found.companyId?._id || found.companyId; // Keep track of owner
        } else {
          updated.product = '';
          updated.productCompanyId = null;
        }
      }

      if (field === 'total') {
        const newTotal = parseFloat(value) || 0;
        const qty = parseFloat(item.qty) || 0;
        const disc = parseFloat(item.discount) || 0;
        const gst = parseFloat(item.gstRate) || 0;
        
        if (qty > 0) {
          let rateAfterDisc;
          if (item.isInclusive) {
            rateAfterDisc = newTotal / qty;
          } else {
            rateAfterDisc = newTotal / (qty * (1 + gst / 100));
          }
          
          let newRate = rateAfterDisc;
          if (disc < 100) {
            newRate = rateAfterDisc / (1 - disc / 100);
          }
          
          updated.rate = Number(newRate.toFixed(2));
        }
        updated.total = newTotal;
      }

      return calcItem(updated);
    }));
  };

  const handleTransfer = async (item) => {
    if (!form.company) return alert('Select your company first');
    try {
      const res = await axios.post(`${API}/api/purchases/transfer`, {
        sourceProductId: item.product,
        targetCompanyId: form.company,
        qty: item.qty
      }, { headers: authHeader });
      
      alert(res.data.message || 'Transfer successful!');
      
      // The target product was created or updated in the target company
      // Refresh products list
      await fetchProducts();

      // Update the line item to point to the NEW product (which belongs to the current company)
      setItems(prev => prev.map(i => {
        if (i.id === item.id) {
          return {
            ...i,
            product: res.data.targetProduct._id,
            productCompanyId: res.data.targetProduct.companyId
          };
        }
        return i;
      }));

    } catch (err) {
      alert(err.response?.data?.message || 'Error transferring stock');
    }
  };

  // Billing same as shipping
  const handleSameAsShipping = (checked) => {
    setSameAsShipping(checked);
    if (checked) setForm(f => ({ ...f, shippingAddress: f.billingAddress }));
  };

  // Computed totals
  const subtotal = items.reduce((s, i) => s + (i.taxableAmount || 0), 0);
  const totalDiscount = items.reduce((s, i) => {
    const rate = parseFloat(i.rate) || 0;
    const disc = parseFloat(i.discount) || 0;
    const qty = parseFloat(i.qty) || 0;
    return s + (rate * qty * disc / 100);
  }, 0);
  const totalTax = items.reduce((s, i) => s + (i.taxAmount || 0), 0);
  const extraCharges = (parseFloat(form.packagingCharges) || 0)
    + (parseFloat(form.transportCharges) || 0)
    + (parseFloat(form.otherCharges) || 0);

  let commissionAmount = 0;
  if (form.commissionType === 'Percentage') {
    commissionAmount = subtotal * (parseFloat(form.commissionValue) || 0) / 100;
  } else if (form.commissionType === 'Fixed') {
    commissionAmount = parseFloat(form.commissionValue) || 0;
  }

  const grandTotal = subtotal + totalTax + extraCharges - commissionAmount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) { alert('Add at least one item'); return; }
    
    // Check if any product needs transferring
    const needsTransfer = items.some(i => i.productCompanyId && String(i.productCompanyId) !== String(form.company));
    if (needsTransfer) {
      alert('Some items belong to another company. Please click "Transfer" to pull stock into your company before saving the invoice.');
      return;
    }

    const invalid = items.filter(i => !i.product);
    if (invalid.length > 0) {
      alert(`Product "${invalid[0].productName}" not found. Please add it in Products first.`);
      return;
    }

    setLoading(true);
    try {
      // 1. Create Customer if doesn't exist
      const isCompany = companies.some(c => c.name.toLowerCase() === form.customerName.toLowerCase());
      const existingCust = customers.find(c => c.name.toLowerCase() === form.customerName.toLowerCase());
      if (!existingCust && !isCompany && form.customerName.trim()) {
        await axios.post(`${API}/api/customers`, {
          name: form.customerName,
          phone: form.customerPhone,
          gstin: form.customerGSTIN,
          state: form.customerState,
          billingAddress: form.billingAddress,
          shippingAddress: form.shippingAddress,
        }, { headers: authHeader });
      }

      // 2. Create Invoice
      const payload = {
        ...form,
        items: items.map(i => ({
          product: i.product,
          productName: i.productName,
          hsnCode: i.hsnCode,
          unit: i.unit,
          qty: Number(i.qty),
          rate: Number(i.rate),
          mrp: Number(i.mrp),
          discount: Number(i.discount),
          gstRate: Number(i.gstRate),
          isInclusive: Boolean(i.isInclusive),
          taxableAmount: Number(i.taxableAmount),
          taxAmount: Number(i.taxAmount),
          total: Number(i.total),
        })),
        subtotal: Number(subtotal.toFixed(2)),
        totalDiscount: Number(totalDiscount.toFixed(2)),
        totalTax: Number(totalTax.toFixed(2)),
        packagingCharges: Number(form.packagingCharges) || 0,
        transportCharges: Number(form.transportCharges) || 0,
        otherCharges: Number(form.otherCharges) || 0,
        commissionType: form.commissionType,
        commissionValue: Number(form.commissionValue) || 0,
        commissionAmount: Number(commissionAmount.toFixed(2)),
        grandTotal: Number(grandTotal.toFixed(2)),
      };
      await axios.post(`${API}/api/invoices`, payload, {
        headers: { ...authHeader, 'Content-Type': 'application/json' },
      });
      navigate('/sales');
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating invoice');
    } finally {
      setLoading(false);
    }
  };

  // Filter products based on showGlobalProducts toggle
  const displayedProducts = showGlobalProducts
    ? products
    : products.filter(p => {
        const prodCompId = p.companyId?._id || p.companyId;
        return String(prodCompId) === String(form.company);
      });

  const productOptions = displayedProducts.map(p => {
    const prodCompId = p.companyId?._id || p.companyId;
    const isGlobal = String(prodCompId) !== String(form.company);
    return {
      value: p.name,
      label: toProper(p.name),
      isGlobal: isGlobal
    };
  });
  const customerOptions = combinedCustomers.map(c => toProper(c.name));

  return (
    <div className="ci-page">
      {/* Top Bar */}
      <div className="ci-topbar">
        <button className="ci-back-btn" onClick={() => navigate('/sales')}>
          <ArrowLeft size={18} /> Back to Sales
        </button>
        <h1 className="ci-page-title"><FileText size={22} /> Create Invoice</h1>
        <div className="ci-topbar-actions">
          <button type="button" className="ci-draft-btn" onClick={() => navigate('/sales')}>Discard</button>
          <button type="button" className="ci-submit-btn" disabled={loading} onClick={handleSubmit}>
            <Save size={16} /> {loading ? 'Saving...' : 'Save Invoice'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="ci-body">
        <div className="ci-main">

          {/* ── Section: Invoice Details ── */}
          <div className="ci-section">
            <div className="ci-section-title"><FileText size={16} /> Invoice Details</div>
            <div className="ci-grid-3">
              <div className="ci-field">
                <label>COMPANY *</label>
                <select name="company" value={form.company} onChange={e => handleCompanyChange(e.target.value)} required disabled={!isSuperAdmin}>
                  {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div className="ci-field">
                <label>INVOICE NUMBER *</label>
                <input type="text" name="invoiceNumber" value={form.invoiceNumber} onChange={handleInput} required />
              </div>
              <div className="ci-field">
                <label>INVOICE DATE *</label>
                <input type="date" name="invoiceDate" value={form.invoiceDate} onChange={handleInput} required />
              </div>
              <div className="ci-field">
                <label>PAYMENT STATUS</label>
                <select name="paymentStatus" value={form.paymentStatus} onChange={handleInput}>
                  <option>Pending</option>
                  <option>Paid</option>
                  <option>Partial</option>
                </select>
              </div>
              <div className="ci-field">
                <label>PAYMENT METHOD</label>
                <select name="paymentMethod" value={form.paymentMethod} onChange={handleInput}>
                  <option>Cash</option>
                  <option>Bank Transfer</option>
                  <option>UPI</option>
                  <option>Card</option>
                </select>
              </div>
              <div className="ci-field">
                <label>GEM CONTRACT NUMBER</label>
                <input type="text" name="gemContractNumber" value={form.gemContractNumber} onChange={handleInput} placeholder="e.g. GEMC-5116877..." />
              </div>
              <div className="ci-field">
                <label>PLACE OF SUPPLY</label>
                <select name="placeOfSupply" value={form.placeOfSupply} onChange={handleInput}>
                  <option value="">-- Select State --</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="ci-section">
            <div className="ci-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><User size={16} /> Customer Details</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#94a3b8', cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={showGlobal} onChange={e => setShowGlobal(e.target.checked)} style={{ width: 'auto', margin: 0 }} />
                Show Global Customers & Companies
              </label>
            </div>
            <div className="ci-grid-3">
              <div className="ci-field">
                <label>CUSTOMER NAME *</label>
                <CreatableSelect
                  value={form.customerName}
                  onChange={handleCustomerSelect}
                  options={customerOptions}
                  placeholder="Select or enter new..."
                />
              </div>
              <div className="ci-field">
                <label>PHONE</label>
                <input type="text" name="customerPhone" value={form.customerPhone} onChange={handleInput} placeholder="Mobile number" />
              </div>
              <div className="ci-field">
                <label>GSTIN</label>
                <input type="text" name="customerGSTIN" value={form.customerGSTIN} onChange={handleInput} placeholder="GST number" />
              </div>
              <div className="ci-field">
                <label>CUSTOMER STATE</label>
                <select name="customerState" value={form.customerState} onChange={handleInput}>
                  <option value="">-- Select State --</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="ci-field ci-span-2">
                <label>BILLING ADDRESS</label>
                <textarea name="billingAddress" value={form.billingAddress}
                  onChange={e => {
                    handleInput(e);
                    if (sameAsShipping) setForm(f => ({ ...f, shippingAddress: e.target.value }));
                  }}
                  rows={2} placeholder="Full billing address" />
              </div>
              <div className="ci-field ci-span-2">
                <div className="ci-label-row">
                  <label>SHIPPING ADDRESS</label>
                  <label className="ci-checkbox-label">
                    <input type="checkbox" checked={sameAsShipping} onChange={e => handleSameAsShipping(e.target.checked)} />
                    Same as billing
                  </label>
                </div>
                <textarea name="shippingAddress" value={form.shippingAddress} onChange={handleInput}
                  rows={2} placeholder="Shipping address" disabled={sameAsShipping} />
              </div>
            </div>
          </div>

          {/* ── Section: Line Items ── */}
          <div className="ci-section">
            <div className="ci-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Package size={16} /> Line Items</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#94a3b8', cursor: 'pointer', userSelect: 'none', fontWeight: 'normal' }}>
                <input type="checkbox" checked={showGlobalProducts} onChange={e => setShowGlobalProducts(e.target.checked)} style={{ width: 'auto', margin: 0 }} />
                Show Global Products
              </label>
            </div>

            <div className="ci-items-table-wrap">
              <table className="ci-items-table">
                <thead>
                  <tr>
                    <th style={{ width: '22%' }}>PRODUCT</th>
                    <th style={{ width: '8%' }}>HSN</th>
                    <th style={{ width: '6%' }}>UNIT</th>
                    <th style={{ width: '6%' }}>QTY</th>
                    <th style={{ width: '10%' }}>RATE (₹)</th>
                    <th style={{ width: '8%' }}>MRP (₹)</th>
                    <th style={{ width: '6%' }}>DISC %</th>
                    <th style={{ width: '6%' }}>GST %</th>
                    <th style={{ width: '5%' }}>INCL?</th>
                    <th style={{ width: '10%' }}>TOTAL (₹)</th>
                    <th style={{ width: '8%' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => {
                    const isForeign = item.productCompanyId && String(item.productCompanyId) !== String(form.company);
                    return (
                    <tr key={item.id} style={{ background: isForeign ? 'rgba(245, 158, 11, 0.05)' : 'transparent' }}>
                      <td>
                        <CreatableSelect
                          value={item.productName}
                          onChange={val => handleItemChange(item.id, 'productName', val)}
                          options={productOptions}
                          placeholder="Search..."
                        />
                        {isForeign && <div style={{fontSize: '10px', color: '#fbbf24', marginTop: '4px'}}>Other Company Stock</div>}
                      </td>
                      <td>
                        <input className="ci-input" type="text" value={item.hsnCode}
                          onChange={e => handleItemChange(item.id, 'hsnCode', e.target.value)} />
                      </td>
                      <td>
                        <input className="ci-input" type="text" value={item.unit}
                          onChange={e => handleItemChange(item.id, 'unit', e.target.value)} />
                      </td>
                      <td>
                        <input className="ci-input" type="number" min="1" value={item.qty}
                          onChange={e => handleItemChange(item.id, 'qty', e.target.value)} />
                      </td>
                      <td>
                        <input className="ci-input" type="number" min="0" step="0.01" value={item.rate}
                          onChange={e => handleItemChange(item.id, 'rate', e.target.value)} />
                      </td>
                      <td>
                        <input className="ci-input" type="number" min="0" step="0.01" value={item.mrp}
                          onChange={e => handleItemChange(item.id, 'mrp', e.target.value)} />
                      </td>
                      <td>
                        <input className="ci-input" type="number" min="0" max="100" step="0.1" value={item.discount}
                          onChange={e => handleItemChange(item.id, 'discount', e.target.value)} />
                      </td>
                      <td>
                        <select className="ci-input" value={item.gstRate}
                          onChange={e => handleItemChange(item.id, 'gstRate', e.target.value)}>
                          {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                        </select>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input type="checkbox" checked={item.isInclusive}
                          onChange={e => handleItemChange(item.id, 'isInclusive', e.target.checked)} />
                      </td>
                      <td>
                        <input className="ci-input" type="number" min="0" step="0.01" value={item.total}
                          onChange={e => handleItemChange(item.id, 'total', e.target.value)} />
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          {isForeign && (
                            <button type="button" onClick={() => handleTransfer(item)} style={{ background: '#fbbf24', border: 'none', color: '#000', borderRadius: '4px', padding: '4px 6px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
                              <RefreshCw size={12} /> Transfer
                            </button>
                          )}
                          <button type="button" className="ci-del-btn" onClick={() => removeItem(item.id)}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>

            <button type="button" className="ci-add-item-btn" onClick={addItem}>
              <Plus size={15} /> Add Item
            </button>
          </div>

          {/* ── Section: Additional Charges & Deductions ── */}
          <div className="ci-section">
            <div className="ci-section-title"><IndianRupee size={16} /> Additional Charges & Deductions</div>
            <div className="ci-grid-3">
              <div className="ci-field">
                <label>PACKAGING CHARGES (₹)</label>
                <input type="number" min="0" step="0.01" name="packagingCharges"
                  value={form.packagingCharges} onChange={handleInput} />
              </div>
              <div className="ci-field">
                <label>TRANSPORT CHARGES (₹)</label>
                <input type="number" min="0" step="0.01" name="transportCharges"
                  value={form.transportCharges} onChange={handleInput} />
              </div>
              <div className="ci-field">
                <label>OTHER CHARGES (₹)</label>
                <input type="number" min="0" step="0.01" name="otherCharges"
                  value={form.otherCharges} onChange={handleInput} />
              </div>
            </div>

            <div className="ci-grid-2" style={{ marginTop: '16px' }}>
              <div className="ci-field">
                <label>COMMISSION / DEDUCTION TYPE</label>
                <select name="commissionType" value={form.commissionType} onChange={handleInput}>
                  <option value="None">None</option>
                  <option value="Percentage">Percentage on Taxable Amt</option>
                  <option value="Fixed">Fixed Amount</option>
                </select>
              </div>
              {form.commissionType !== 'None' && (
                <div className="ci-field">
                  <label>{form.commissionType === 'Percentage' ? 'COMMISSION %' : 'COMMISSION AMOUNT (₹)'}</label>
                  <input type="number" min="0" step="0.01" name="commissionValue"
                    value={form.commissionValue} onChange={handleInput} />
                </div>
              )}
            </div>
          </div>

          {/* ── Section: Notes ── */}
          <div className="ci-section">
            <div className="ci-grid-2">
              <div className="ci-field">
                <label>NOTES</label>
                <textarea name="notes" value={form.notes} onChange={handleInput}
                  rows={3} placeholder="Any notes for the customer..." />
              </div>
              <div className="ci-field">
                <label>TERMS & CONDITIONS</label>
                <textarea name="termsConditions" value={form.termsConditions} onChange={handleInput} rows={3} />
              </div>
            </div>
          </div>

          {/* ── Invoice Summary at bottom ── */}
          <div className="ci-section ci-summary-bottom">
            <div className="ci-summary-bottom-title">INVOICE SUMMARY</div>
            <div className="ci-summary-bottom-grid">
              <div className="ci-summary-bottom-rows">
                <div className="ci-summary-row">
                  <span>Taxable Amount</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="ci-summary-row ci-green">
                  <span>Total Discount</span>
                  <span>-₹{totalDiscount.toFixed(2)}</span>
                </div>
                <div className="ci-summary-row">
                  <span>Total GST</span>
                  <span>₹{totalTax.toFixed(2)}</span>
                </div>
                <div className="ci-summary-row">
                  <span>Extra Charges</span>
                  <span>+₹{extraCharges.toFixed(2)}</span>
                </div>
                {commissionAmount > 0 && (
                  <div className="ci-summary-row ci-green">
                    <span>Commission ({form.commissionType})</span>
                    <span>-₹{commissionAmount.toFixed(2)}</span>
                  </div>
                )}
                {/* Per GST rate breakdown */}
                {GST_RATES.filter(r => items.some(i => Number(i.gstRate) === r && i.taxAmount > 0)).map(r => {
                  const tax = items.filter(i => Number(i.gstRate) === r).reduce((s, i) => s + i.taxAmount, 0);
                  return (
                    <div key={r} className="ci-summary-row ci-sub">
                      <span>GST @{r}%</span>
                      <span>₹{tax.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="ci-summary-bottom-right">
                <div className="ci-summary-divider" />
                <div className="ci-summary-grand">
                  <span>Grand Total</span>
                  <span>₹{grandTotal.toFixed(2)}</span>
                </div>
                <div className="ci-summary-items-count">
                  {items.length} item{items.length !== 1 ? 's' : ''}
                </div>
                <button type="submit" className="ci-final-btn" disabled={loading}>
                  <Save size={18} />
                  {loading ? 'Saving Invoice...' : 'Save Invoice'}
                </button>
              </div>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
};

export default CreateInvoice;
