import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import { Plus, Trash2, Save, FileText, ArrowLeft, PlusCircle, Package } from "lucide-react";
import CreatableSelect from "../components/CreatableSelect";
import ProductCreateModal from "../components/ProductCreateModal";
import "./CreateInvoice.css"; // Reuse the beautiful layout styling of CreateInvoice.jsx

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const INDIAN_STATES = [
  "01 - Jammu & Kashmir", "02 - Himachal Pradesh", "03 - Punjab", "04 - Chandigarh",
  "05 - Uttarakhand", "06 - Haryana", "07 - Delhi", "08 - Rajasthan",
  "09 - Uttar Pradesh", "10 - Bihar", "11 - Sikkim", "12 - Arunachal Pradesh",
  "13 - Nagaland", "14 - Manipur", "15 - Mizoram", "16 - Tripura",
  "17 - Meghalaya", "18 - Assam", "19 - West Bengal", "20 - Jharkhand",
  "21 - Odisha", "22 - Chhattisgarh", "23 - Madhya Pradesh", "24 - Gujarat",
  "25 - Daman & Diu", "26 - Dadra & Nagar Haveli", "27 - Maharashtra",
  "29 - Karnataka", "30 - Goa", "31 - Lakshadweep", "32 - Kerala",
  "33 - Tamil Nadu", "34 - Puducherry", "35 - Andaman & Nicobar Islands",
  "36 - Telangana", "37 - Andhra Pradesh", "38 - Ladakh", "97 - Other Territory"
];

const makeItem = () => ({
  id: Date.now() + Math.random().toString(),
  product: "",
  productName: "",
  hsnCode: "",
  unit: "Pcs",
  qty: 1,
  rate: 0,
  mrp: 0,
  discount: 0,
  gstRate: 18,
  isInclusive: false,
  taxableAmount: 0,
  taxAmount: 0,
  total: 0,
});

const CreateQuotation = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
  const authHeader = { Authorization: `Bearer ${userInfo?.token}` };

  const [companies, setCompanies] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [form, setForm] = useState({
    company: userInfo?.companyId || "",
    quotationNumber: "",
    quotationDate: new Date().toISOString().split("T")[0],
    customerName: "",
    customerPhone: "",
    customerGSTIN: "",
    customerState: "",
    billingAddress: "",
    shippingAddress: "",
    placeOfSupply: "",
    packagingCharges: 0,
    transportCharges: 0,
    otherCharges: 0,
    adjustment: 0,
    notes: "",
    isExpectedOrder: false,
    status: "Sent",
    termsConditions: "Valid for 30 days from quotation date.\nAll disputes subject to local jurisdiction.",
  });

  const [items, setItems] = useState([makeItem()]);
  const [sameAsShipping, setSameAsShipping] = useState(false);
  const [quickProductModalOpen, setQuickProductModalOpen] = useState(false);
  const [quickProductInitialName, setQuickProductInitialName] = useState("");
  const [activeRowIdForQuickProduct, setActiveRowIdForQuickProduct] = useState(null);

  const [companyBankAccounts, setCompanyBankAccounts] = useState([]);
  const [legacyBankDetails, setLegacyBankDetails] = useState(null);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState('');
  const [selectedBank, setSelectedBank] = useState(null);

  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [newBankForm, setNewBankForm] = useState({
    accountName: '', bankName: '', accountNumber: '', ifscCode: '', branchName: '', isDefault: false
  });

  // Fetch companies, products and customers
  useEffect(() => {
    const initData = async () => {
      try {
        const [compRes, prodRes, custRes] = await Promise.all([
          axios.get(`${API}/api/companies`, { headers: authHeader }),
          axios.get(`${API}/api/products`, { headers: authHeader }),
          axios.get(`${API}/api/customers`, { headers: authHeader }),
        ]);

        setCompanies(compRes.data);
        if (compRes.data.length > 0 && !form.company) {
          setForm(f => ({ ...f, company: compRes.data[0]._id }));
        }

        setProducts(prodRes.data);
        setCustomers(custRes.data);
      } catch (err) {
        console.error("Error loading form dependencies", err);
      }
    };
    initData();
  }, []);

  // Set default next quotation number
  useEffect(() => {
    if (!id && form.company) {
      axios
        .get(`${API}/api/quotations/next-number?companyId=${form.company}`, { headers: authHeader })
        .then((res) => {
          setForm((f) => ({ ...f, quotationNumber: res.data.quotationNumber }));
        })
        .catch(console.error);
    }
  }, [form.company, id]);

  // Load quotation for editing
  useEffect(() => {
    if (id) {
      const fetchQuotationForEdit = async () => {
        try {
          const res = await axios.get(`${API}/api/quotations/${id}`, { headers: authHeader });
          const qtn = res.data;
          setForm({
            company: qtn.company?._id || qtn.company || "",
            quotationNumber: qtn.quotationNumber || "",
            quotationDate: qtn.quotationDate ? new Date(qtn.quotationDate).toISOString().split("T")[0] : "",
            customerName: qtn.customerName || "",
            customerPhone: qtn.customerPhone || "",
            customerGSTIN: qtn.customerGSTIN || "",
            customerState: qtn.customerState || "",
            billingAddress: qtn.billingAddress || "",
            shippingAddress: qtn.shippingAddress || "",
            placeOfSupply: qtn.placeOfSupply || "",
            packagingCharges: qtn.packagingCharges || 0,
            transportCharges: qtn.transportCharges || 0,
            otherCharges: qtn.otherCharges || 0,
            adjustment: qtn.adjustment || 0,
            notes: qtn.notes || "",
            isExpectedOrder: qtn.isExpectedOrder || false,
            status: qtn.status || "Sent",
            termsConditions: qtn.termsConditions || "",
          });

          if (!qtn.shippingAddress || qtn.shippingAddress === qtn.billingAddress) {
            setSameAsShipping(true);
          } else {
            setSameAsShipping(false);
          }

          if (qtn.bankDetails && qtn.bankDetails.bankName) {
            setSelectedBank(qtn.bankDetails);
            setSelectedBankAccountId('saved');
          }

          if (qtn.items && qtn.items.length > 0) {
            setItems(
              qtn.items.map((item) => ({
                ...item,
                id: item._id || Date.now() + Math.random().toString(),
              })),
            );
          }
        } catch (err) {
          console.error("Error fetching quotation for edit", err);
        }
      };
      fetchQuotationForEdit();
    }
  }, [id]);

  const handleInput = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const combinedCustomers = [
    ...customers.map((c) => ({
      name: c.name,
      phone: c.phone || "",
      gstin: c.gstin || "",
      state: c.state || "",
      billingAddress: c.billingAddress || c.address || "",
      shippingAddress: c.shippingAddress || c.billingAddress || c.address || "",
      isCompany: false,
    })),
    ...companies.map((c) => ({
      name: c.name,
      phone: c.phone || "",
      gstin: c.gstin || "",
      state: c.state || "",
      billingAddress: c.address || "",
      shippingAddress: c.address || "",
      isCompany: true,
    })),
  ];

  const handleCustomerSelect = (val) => {
    const cust = combinedCustomers.find((c) => c.name.toLowerCase() === val.toLowerCase());
    if (cust) {
      const bAddr = cust.billingAddress || "";
      const sAddr = cust.shippingAddress || bAddr;
      if (!cust.shippingAddress || bAddr === sAddr) {
        setSameAsShipping(true);
      } else {
        setSameAsShipping(false);
      }
      setForm((f) => ({
        ...f,
        customerName: cust.name,
        customerPhone: cust.phone || "",
        customerGSTIN: cust.gstin || "",
        customerState: cust.state || "",
        billingAddress: bAddr,
        shippingAddress: sAddr,
        placeOfSupply: cust.state || "",
      }));
    } else {
      setForm((f) => ({ ...f, customerName: val }));
    }
  };

  const handleSameAsShipping = (checked) => {
    setSameAsShipping(checked);
    if (checked) setForm((f) => ({ ...f, shippingAddress: f.billingAddress }));
  };

  useEffect(() => {
    if (companies.length > 0 && form.company) {
      const activeCompanyObj = companies.find((c) => c._id === form.company);
      if (activeCompanyObj) {
        const accounts = activeCompanyObj.bankAccounts || [];
        setCompanyBankAccounts(accounts);
        setLegacyBankDetails(activeCompanyObj.bankDetails || null);

        // Pre-select default account if not editing
        if (!id) {
          const defaultAcc = accounts.find((a) => a.isDefault);
          if (defaultAcc) {
            setSelectedBankAccountId(defaultAcc._id);
            setSelectedBank(defaultAcc);
          } else if (accounts.length > 0) {
            setSelectedBankAccountId(accounts[0]._id);
            setSelectedBank(accounts[0]);
          } else if (activeCompanyObj.bankDetails?.bankName) {
            setSelectedBankAccountId('legacy');
            setSelectedBank(activeCompanyObj.bankDetails);
          } else {
            setSelectedBankAccountId('');
            setSelectedBank(null);
          }
        }
      }
    }
  }, [form.company, companies, id]);

  // Build bank account options for CreatableSelect
  const bankAccountOptions = companyBankAccounts.map((acc) => ({
    label: `${acc.bankName} - ${acc.accountNumber}${acc.isDefault ? ' (Default)' : ''}`,
    value: `${acc.bankName} - ${acc.accountNumber}`,
  }));

  const selectedBankLabel = selectedBank
    ? `${selectedBank.bankName} - ${selectedBank.accountNumber}`
    : '';

  const handleBankAccountChange = (val) => {
    if (!val) {
      setSelectedBankAccountId('');
      setSelectedBank(null);
      return;
    }
    const found = companyBankAccounts.find(
      (a) => `${a.bankName} - ${a.accountNumber}` === val || `${a.bankName} - ${a.accountNumber} (Default)` === val
    );
    if (found) {
      setSelectedBankAccountId(found._id);
      setSelectedBank(found);
      return;
    }
    setSelectedBankAccountId('');
    setSelectedBank(null);
  };

  const handleCreateBankOption = (typedName) => {
    setNewBankForm({ accountName: '', bankName: typedName, accountNumber: '', ifscCode: '', branchName: '', isDefault: false });
    setBankModalOpen(true);
  };

  const handleSaveNewBank = async () => {
    if (!newBankForm.bankName || !newBankForm.accountNumber || !newBankForm.ifscCode) {
      return alert('Please fill Bank Name, Account Number and IFSC Code.');
    }
    try {
      const updatedAccounts = [...companyBankAccounts, newBankForm];
      await axios.put(`${API}/api/companies/${form.company}`, { bankAccounts: updatedAccounts }, { headers: authHeader });
      const { data } = await axios.get(`${API}/api/companies`, { headers: authHeader });
      setCompanies(data);
      const updatedCompany = data.find((c) => c._id === form.company);
      if (updatedCompany) {
        const newAccounts = updatedCompany.bankAccounts || [];
        setCompanyBankAccounts(newAccounts);
        const newAcc = newAccounts[newAccounts.length - 1];
        if (newAcc) {
          setSelectedBankAccountId(newAcc._id);
          setSelectedBank(newAcc);
        }
      }
      setBankModalOpen(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Error adding bank account');
    }
  };

  const handleProductSelect = (rowId, productName) => {
    const prod = products.find((p) => p.name.toLowerCase() === productName.toLowerCase());
    setItems((prev) =>
      prev.map((i) => {
        if (i.id === rowId) {
          if (prod) {
            return calcItem({
              ...i,
              product: prod._id,
              productName: prod.name,
              hsnCode: prod.hsnCode || "",
              unit: prod.unit || "Pcs",
              rate: prod.sellingPrice || 0,
              mrp: prod.mrp || 0,
              gstRate: prod.gstRate || 18,
            });
          } else {
            return {
              ...i,
              productName,
              product: "",
            };
          }
        }
        return i;
      })
    );
  };

  const calcItem = (item) => {
    const qty = Number(item.qty) || 0;
    const rate = Number(item.rate) || 0;
    const discount = Number(item.discount) || 0;
    const gstRate = Number(item.gstRate) || 0;

    let base = rate - discount;
    let taxable = base * qty;
    let tax = 0;
    let total = 0;

    if (item.isInclusive) {
      taxable = (base * qty) / (1 + gstRate / 100);
      tax = (base * qty) - taxable;
      total = base * qty;
    } else {
      tax = taxable * (gstRate / 100);
      total = taxable + tax;
    }

    return {
      ...item,
      taxableAmount: Number(taxable.toFixed(2)),
      taxAmount: Number(tax.toFixed(2)),
      total: Number(total.toFixed(2)),
    };
  };

  const updateItemField = (rowId, field, value) => {
    setItems(prev =>
      prev.map(i => {
        if (i.id === rowId) {
          const updated = { ...i, [field]: value };
          return calcItem(updated);
        }
        return i;
      })
    );
  };

  // Math Calculations
  const subtotal = items.reduce((sum, i) => sum + (i.taxableAmount || 0), 0);
  const totalDiscount = items.reduce((sum, i) => sum + (i.discount || 0) * (i.qty || 0), 0);
  const totalTax = items.reduce((sum, i) => sum + (i.taxAmount || 0), 0);

  const packaging = Number(form.packagingCharges) || 0;
  const transport = Number(form.transportCharges) || 0;
  const other = Number(form.otherCharges) || 0;
  const adjustment = Number(form.adjustment) || 0;
  const grandTotal = Math.round(subtotal + totalTax + packaging + transport + other - adjustment);

  const handleQuickProductCreated = (newProduct) => {
    setProducts(prev => [newProduct, ...prev]);
    if (activeRowIdForQuickProduct) {
      handleProductSelect(activeRowIdForQuickProduct, newProduct.name);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.company) return alert("Select your company first");
    if (!form.customerName) return alert("Customer Name is required");
    if (items.some(i => !i.product)) return alert("Select a product for all rows");

    const payload = {
      ...form,
      items,
      subtotal,
      totalDiscount,
      totalTax,
      grandTotal,
      bankDetails: selectedBank,
    };

    try {
      if (id) {
        await axios.put(`${API}/api/quotations/${id}`, payload, { headers: authHeader });
      } else {
        await axios.post(`${API}/api/quotations`, payload, { headers: authHeader });
      }
      navigate("/quotations");
    } catch (err) {
      alert(err.response?.data?.message || "Error saving quotation");
    }
  };

  const customerOptions = combinedCustomers.map((c) => c.name);
  const productOptions = products.map((p) => p.name);

  return (
    <div className="ci-page">
      {/* Topbar */}
      <div className="ci-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button type="button" onClick={() => navigate("/quotations")} className="ci-back-btn">
            <ArrowLeft size={16} /> Back to Quotations
          </button>
          <h1 className="ci-page-title">
            <FileText size={18} style={{ color: "#3b82f6" }} />
            {id ? "Edit Quotation" : "Create Quotation"}
          </h1>
        </div>
        <div className="ci-topbar-actions">
          <button type="submit" form="quotation-form" className="ci-submit-btn">
            <Save size={16} /> {id ? "Update Quotation" : "Save Quotation"}
          </button>
        </div>
      </div>

      <form id="quotation-form" onSubmit={handleSave} className="ci-body">
        <div className="ci-main">
          {/* Basic Info Section */}
          <div className="ci-section">
            <div className="ci-section-title">
              <FileText size={14} /> Basic Information
            </div>
            <div className="ci-grid-4">
              <div className="ci-field">
                <label>Quotation Number</label>
                <input
                  type="text"
                  name="quotationNumber"
                  required
                  value={form.quotationNumber}
                  onChange={handleInput}
                />
              </div>
              <div className="ci-field">
                <label>Quotation Date</label>
                <input
                  type="date"
                  name="quotationDate"
                  required
                  value={form.quotationDate}
                  onChange={handleInput}
                />
              </div>
              <div className="ci-field">
                <label>Quotation Status</label>
                <select name="status" value={form.status} onChange={handleInput}>
                  <option value="Draft">Draft</option>
                  <option value="Sent">Sent</option>
                  <option value="Accepted">Accepted (Won)</option>
                  <option value="Declined">Declined (Lost)</option>
                </select>
              </div>
              <div className="ci-field" style={{ justifyContent: "center" }}>
                <label className="ci-checkbox-label" style={{ marginTop: "16px" }}>
                  <input
                    type="checkbox"
                    name="isExpectedOrder"
                    checked={form.isExpectedOrder}
                    onChange={(e) => setForm(f => ({ ...f, isExpectedOrder: e.target.checked }))}
                    style={{ width: "16px", height: "16px", margin: 0 }}
                  />
                  Mark as Expected Order
                </label>
              </div>
            </div>
          </div>

          {/* Customer Info Section */}
          <div className="ci-section">
            <div className="ci-section-title">
              <FileText size={14} /> Customer Information
            </div>
            <div className="ci-grid-3">
              <div className="ci-field">
                <label>Customer Name *</label>
                <CreatableSelect
                  value={form.customerName}
                  onChange={handleCustomerSelect}
                  options={customerOptions}
                  placeholder="Select or enter customer..."
                />
              </div>
              <div className="ci-field">
                <label>Customer GSTIN</label>
                <input
                  type="text"
                  name="customerGSTIN"
                  value={form.customerGSTIN}
                  onChange={handleInput}
                  placeholder="GST Number"
                />
              </div>
              <div className="ci-field">
                <label>Customer Phone</label>
                <input
                  type="text"
                  name="customerPhone"
                  value={form.customerPhone}
                  onChange={handleInput}
                  placeholder="Phone Number"
                />
              </div>
            </div>

            <div className="ci-grid-2" style={{ marginTop: "16px" }}>
              <div className="ci-field">
                <label>Customer State</label>
                <select name="customerState" value={form.customerState} onChange={handleInput}>
                  <option value="">Select state...</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="ci-field">
                <label>Place of Supply</label>
                <select name="placeOfSupply" value={form.placeOfSupply} onChange={handleInput}>
                  <option value="">Select state...</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="ci-grid-2" style={{ marginTop: "16px" }}>
              <div className="ci-field">
                <label>Billing Address</label>
                <textarea
                  name="billingAddress"
                  rows={2}
                  value={form.billingAddress}
                  onChange={(e) => {
                    handleInput(e);
                    if (sameAsShipping) setForm((f) => ({ ...f, shippingAddress: e.target.value }));
                  }}
                  placeholder="Full billing address"
                />
              </div>
              <div className="ci-field">
                <div className="ci-label-row">
                  <label>Shipping Address</label>
                  <label className="ci-checkbox-label">
                    <input
                      type="checkbox"
                      checked={sameAsShipping}
                      onChange={(e) => handleSameAsShipping(e.target.checked)}
                      style={{ width: "auto", margin: 0 }}
                    />
                    Same as billing
                  </label>
                </div>
                <textarea
                  name="shippingAddress"
                  rows={2}
                  value={form.shippingAddress}
                  onChange={handleInput}
                  placeholder="Shipping address"
                  disabled={sameAsShipping}
                />
              </div>
            </div>
          </div>

          {/* Products / Items Section */}
          <div className="ci-section" style={{ position: "relative", zIndex: 10 }}>
            <div className="ci-section-title">
              <Package size={16} /> Products / Items
            </div>
            <div className="ci-items-table-wrap">
              <table className="ci-items-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: "260px" }}>PRODUCT</th>
                    <th style={{ width: "80px" }}>HSN</th>
                    <th style={{ width: "90px" }}>UNIT</th>
                    <th style={{ width: "120px" }}>QTY</th>
                    <th style={{ width: "100px" }}>RATE (₹)</th>
                    <th style={{ width: "80px" }}>GST %</th>
                    <th style={{ width: "110px" }}>TOTAL (₹)</th>
                    <th style={{ width: "60px" }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id}>
                      <td>
                        <CreatableSelect
                          value={item.productName}
                          onChange={(val) => handleProductSelect(item.id, val)}
                          options={productOptions}
                          placeholder="Search product..."
                          onCreateOption={(name) => {
                            setQuickProductInitialName(name);
                            setActiveRowIdForQuickProduct(item.id);
                            setQuickProductModalOpen(true);
                          }}
                        />
                      </td>
                      <td>{item.hsnCode || "—"}</td>
                      <td>{item.unit}</td>
                      <td>
                        <input
                          type="number"
                          className="ci-input"
                          value={item.qty}
                          onChange={(e) => updateItemField(item.id, "qty", Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="ci-input"
                          value={item.rate}
                          onChange={(e) => updateItemField(item.id, "rate", Number(e.target.value))}
                        />
                      </td>
                      <td>{item.gstRate}%</td>
                      <td>₹{(item.total || 0).toFixed(2)}</td>
                      <td>
                        <button
                          type="button"
                          disabled={items.length === 1}
                          onClick={() => setItems(items.filter(i => i.id !== item.id))}
                          style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={() => setItems([...items, makeItem()])}
              className="ci-add-item-btn"
              style={{ marginTop: "12px" }}
            >
              <Plus size={16} /> Add Item
            </button>
          </div>

          {/* Bottom Summary Section */}
          <div className="ci-section">
            <div className="ci-bottom-layout">
              <div className="ci-left-meta">
                <div className="ci-field">
                  <label>Notes / Remarks</label>
                  <textarea name="notes" rows={3} value={form.notes} onChange={handleInput} />
                </div>
                <div className="ci-field">
                  <label>Terms & Conditions</label>
                  <textarea name="termsConditions" rows={3} value={form.termsConditions} onChange={handleInput} />
                </div>
                <div className="ci-field" style={{ marginTop: '12px' }}>
                  <label>Bank Account for Payment</label>
                  <CreatableSelect
                    value={selectedBankLabel}
                    onChange={handleBankAccountChange}
                    onCreateOption={handleCreateBankOption}
                    options={bankAccountOptions}
                    placeholder="Select bank account..."
                  />
                  {selectedBank && (
                    <div style={{ marginTop: '10px', fontSize: '11px', color: '#94a3b8', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div><strong>Bank:</strong> {selectedBank.bankName}</div>
                      <div><strong>A/c No:</strong> {selectedBank.accountNumber}</div>
                      <div><strong>IFSC:</strong> {selectedBank.ifscCode}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="ci-right-summary">
                <div className="summary-row">
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>Total Tax:</span>
                  <span>₹{totalTax.toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>Transport Charges:</span>
                  <input
                    type="number"
                    className="ci-sum-input"
                    name="transportCharges"
                    value={form.transportCharges}
                    onChange={handleInput}
                  />
                </div>
                <div className="summary-row">
                  <span>Packaging Charges:</span>
                  <input
                    type="number"
                    className="ci-sum-input"
                    name="packagingCharges"
                    value={form.packagingCharges}
                    onChange={handleInput}
                  />
                </div>
                <div className="summary-row">
                  <span>Other Charges:</span>
                  <input
                    type="number"
                    className="ci-sum-input"
                    name="otherCharges"
                    value={form.otherCharges}
                    onChange={handleInput}
                  />
                </div>
                <div className="summary-row">
                  <span>Adjustment:</span>
                  <input
                    type="number"
                    className="ci-sum-input"
                    name="adjustment"
                    value={form.adjustment}
                    onChange={handleInput}
                  />
                </div>
                <div className="summary-row grand-total">
                  <span>Grand Total:</span>
                  <span>₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      <ProductCreateModal
        isOpen={quickProductModalOpen}
        onClose={() => setQuickProductModalOpen(false)}
        initialName={quickProductInitialName}
        onProductCreated={handleQuickProductCreated}
      />
      {/* Bank Account Creation Modal */}
      {bankModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1e293b', borderRadius: '12px', padding: '28px', width: '500px', maxWidth: '95vw', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <h3 style={{ color: '#f1f5f9', marginBottom: '20px', fontSize: '1.1rem', fontWeight: 700 }}>Add New Bank Account</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="ci-field">
                <label>ACCOUNT HOLDER NAME</label>
                <input type="text" value={newBankForm.accountName} onChange={(e) => setNewBankForm({ ...newBankForm, accountName: e.target.value })} placeholder="e.g. Acme Corp" />
              </div>
              <div className="ci-field">
                <label>BANK NAME *</label>
                <input type="text" value={newBankForm.bankName} onChange={(e) => setNewBankForm({ ...newBankForm, bankName: e.target.value })} placeholder="e.g. HDFC Bank" />
              </div>
              <div className="ci-field">
                <label>ACCOUNT NUMBER *</label>
                <input type="text" value={newBankForm.accountNumber} onChange={(e) => setNewBankForm({ ...newBankForm, accountNumber: e.target.value })} placeholder="e.g. 50100012345" />
              </div>
              <div className="ci-field">
                <label>IFSC CODE *</label>
                <input type="text" value={newBankForm.ifscCode} onChange={(e) => setNewBankForm({ ...newBankForm, ifscCode: e.target.value })} placeholder="e.g. HDFC0000123" />
              </div>
              <div className="ci-field">
                <label>BRANCH NAME</label>
                <input type="text" value={newBankForm.branchName} onChange={(e) => setNewBankForm({ ...newBankForm, branchName: e.target.value })} placeholder="e.g. Connaught Place" />
              </div>
              <div className="ci-field" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '4px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', textTransform: 'none', letterSpacing: 'normal' }}>
                  <input type="checkbox" checked={newBankForm.isDefault} onChange={(e) => setNewBankForm({ ...newBankForm, isDefault: e.target.checked })} style={{ width: '16px', height: '16px' }} />
                  Set as Default
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setBankModalOpen(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#94a3b8', padding: '8px 18px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
              <button type="button" onClick={handleSaveNewBank} style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>Add Bank Account</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateQuotation;
