import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Plus, Trash2, Save, FileText, ArrowLeft, PlusCircle, Package } from "lucide-react";
import CreatableSelect from "../components/CreatableSelect";
import ProductCreateModal from "../components/ProductCreateModal";
import "./CreateInvoice.css"; // Reuse the layout styling of CreateInvoice.jsx

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

const CreatePreOrder = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
  const authHeader = { Authorization: `Bearer ${userInfo?.token}` };

  const [companies, setCompanies] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [form, setForm] = useState({
    company: userInfo?.companyId || "",
    preOrderNumber: "",
    preOrderDate: new Date().toISOString().split("T")[0],
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
    status: "Confirmed",
    termsConditions: "Valid for pre-orders.\nAll disputes subject to local jurisdiction.",
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

  // Set default next pre-order number
  useEffect(() => {
    if (!id && form.company) {
      axios
        .get(`${API}/api/pre-orders/next-number?companyId=${form.company}`, { headers: authHeader })
        .then((res) => {
          setForm((f) => ({ ...f, preOrderNumber: res.data.preOrderNumber }));
        })
        .catch(console.error);
    }
  }, [form.company, id]);

  // Load pre-order for editing
  useEffect(() => {
    if (id) {
      const fetchPreOrderForEdit = async () => {
        try {
          const res = await axios.get(`${API}/api/pre-orders/${id}`, { headers: authHeader });
          const po = res.data;
          setForm({
            company: po.company?._id || po.company || "",
            preOrderNumber: po.preOrderNumber || "",
            preOrderDate: po.preOrderDate ? new Date(po.preOrderDate).toISOString().split("T")[0] : "",
            customerName: po.customerName || "",
            customerPhone: po.customerPhone || "",
            customerGSTIN: po.customerGSTIN || "",
            customerState: po.customerState || "",
            billingAddress: po.billingAddress || "",
            shippingAddress: po.shippingAddress || "",
            placeOfSupply: po.placeOfSupply || "",
            packagingCharges: po.packagingCharges || 0,
            transportCharges: po.transportCharges || 0,
            otherCharges: po.otherCharges || 0,
            adjustment: po.adjustment || 0,
            notes: po.notes || "",
            status: po.status || "Confirmed",
            termsConditions: po.termsConditions || "",
          });

          if (!po.shippingAddress || po.shippingAddress === po.billingAddress) {
            setSameAsShipping(true);
          } else {
            setSameAsShipping(false);
          }

          if (po.items && po.items.length > 0) {
            setItems(
              po.items.map((i) => ({
                id: i._id || Date.now() + Math.random().toString(),
                product: i.product?._id || i.product || "",
                productName: i.productName || "",
                hsnCode: i.hsnCode || "",
                unit: i.unit || "Pcs",
                qty: i.qty || 1,
                rate: i.rate || 0,
                mrp: i.mrp || 0,
                discount: i.discount || 0,
                gstRate: i.gstRate || 0,
                isInclusive: i.isInclusive || false,
                taxableAmount: i.taxableAmount || 0,
                taxAmount: i.taxAmount || 0,
                total: i.total || 0,
              }))
            );
          }
          if (po.bankDetails) {
            setLegacyBankDetails(po.bankDetails);
            setSelectedBank(po.bankDetails);
          }
        } catch (err) {
          console.error("Error fetching pre-order for edit", err);
        }
      };
      fetchPreOrderForEdit();
    }
  }, [id]);

  // Fetch Company Bank Accounts
  useEffect(() => {
    if (!form.company) return;
    axios.get(`${API}/api/companies/${form.company}/bank-accounts`, { headers: authHeader })
      .then(res => {
        setCompanyBankAccounts(res.data || []);
        if (!id) {
          const def = (res.data || []).find(b => b.isDefault) || (res.data || [])[0];
          if (def) {
            setSelectedBankAccountId(def._id);
            setSelectedBank({
              accountName: def.accountName,
              accountNumber: def.accountNumber,
              ifscCode: def.ifscCode,
              bankName: def.bankName,
              branchName: def.branchName
            });
          }
        }
      })
      .catch(err => console.error("Error fetching company bank accounts:", err));
  }, [form.company, id]);

  const handleBankSelectChange = (e) => {
    const val = e.target.value;
    setSelectedBankAccountId(val);
    if (val === 'legacy' && legacyBankDetails) {
      setSelectedBank(legacyBankDetails);
    } else {
      const b = companyBankAccounts.find(x => x._id === val);
      if (b) {
        setSelectedBank({
          accountName: b.accountName,
          accountNumber: b.accountNumber,
          ifscCode: b.ifscCode,
          bankName: b.bankName,
          branchName: b.branchName
        });
      } else {
        setSelectedBank(null);
      }
    }
  };

  const handleCreateBankAccount = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API}/api/companies/${form.company}/bank-accounts`, newBankForm, { headers: authHeader });
      setCompanyBankAccounts(res.data || []);
      const created = (res.data || []).find(b => b.accountNumber === newBankForm.accountNumber) || res.data[res.data.length - 1];
      if (created) {
        setSelectedBankAccountId(created._id);
        setSelectedBank({
          accountName: created.accountName,
          accountNumber: created.accountNumber,
          ifscCode: created.ifscCode,
          bankName: created.bankName,
          branchName: created.branchName
        });
      }
      setBankModalOpen(false);
      setNewBankForm({ accountName: '', bankName: '', accountNumber: '', ifscCode: '', branchName: '', isDefault: false });
    } catch (err) {
      alert("Error adding bank account: " + (err.response?.data?.message || err.message));
    }
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setForm((f) => {
      let updated = { ...f, [name]: value };
      if (name === "customerState" && value) {
        const matchedState = INDIAN_STATES.find(s => s.toLowerCase().includes(value.toLowerCase())) || value;
        if (matchedState) {
          updated.customerState = matchedState;
          if (!f.customerState) updated.customerState = matchedState;
          if (!f.placeOfSupply) updated.placeOfSupply = matchedState;
        }
      }
      if (sameAsShipping && name === "billingAddress") {
        updated.shippingAddress = value;
      }
      return updated;
    });
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

  const handleCustomerSelect = (name) => {
    const cust = combinedCustomers.find((c) => c.name.toLowerCase() === name.toLowerCase());
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
        customerPhone: cust.phone || f.customerPhone,
        customerGSTIN: cust.gstin || f.customerGSTIN,
        customerState: cust.state || f.customerState,
        billingAddress: bAddr,
        shippingAddress: sAddr,
        placeOfSupply: cust.state || f.placeOfSupply,
      }));
    } else {
      setForm((f) => ({ ...f, customerName: name }));
    }
  };

  const calcItem = (item) => {
    const qty = Number(item.qty) || 0;
    const rate = Number(item.rate) || 0;
    const discount = Number(item.discount) || 0;
    const gstRate = Number(item.gstRate) || 0;

    let baseRate = rate - discount;
    if (baseRate < 0) baseRate = 0;

    let taxable = 0;
    let tax = 0;
    let total = 0;

    if (item.isInclusive) {
      total = baseRate * qty;
      taxable = total / (1 + gstRate / 100);
      tax = total - taxable;
    } else {
      taxable = baseRate * qty;
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

  const handleProductSelect = (rowId, productName) => {
    const prod = products.find((p) => p.name.toLowerCase() === productName.toLowerCase());

    setItems((prev) =>
      prev.map((i) => {
        if (i.id === rowId) {
          if (prod) {
            const updated = {
              ...i,
              product: prod._id,
              productName: prod.name,
              hsnCode: prod.hsnCode || "",
              unit: prod.unit || "Pcs",
              rate: prod.salesRate || prod.price || 0,
              mrp: prod.mrp || 0,
              gstRate: prod.gstRate !== undefined ? prod.gstRate : 18,
            };
            return calcItem(updated);
          } else {
            return {
              ...i,
              product: "",
              productName: productName,
            };
          }
        }
        return i;
      })
    );
  };

  const updateItemField = (rowId, field, value) => {
    setItems((prev) =>
      prev.map((i) => {
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
    setProducts((prev) => [newProduct, ...prev]);
    if (activeRowIdForQuickProduct) {
      handleProductSelect(activeRowIdForQuickProduct, newProduct.name);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.company) return alert("Select your company first");
    if (!form.customerName) return alert("Customer Name is required");
    if (items.some((i) => !i.product)) return alert("Select a valid product for all rows");

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
        await axios.put(`${API}/api/pre-orders/${id}`, payload, { headers: authHeader });
      } else {
        await axios.post(`${API}/api/pre-orders`, payload, { headers: authHeader });
      }
      navigate("/pre-orders");
    } catch (err) {
      alert(err.response?.data?.message || "Error saving pre-order");
    }
  };

  const customerOptions = combinedCustomers.map((c) => c.name);
  const productOptions = products.map((p) => p.name);

  return (
    <div className="ci-page">
      {/* Topbar */}
      <div className="ci-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button type="button" onClick={() => navigate("/pre-orders")} className="ci-back-btn">
            <ArrowLeft size={16} /> Back to Pre Orders
          </button>
          <h1 className="ci-page-title">
            <FileText size={18} style={{ color: "#3b82f6" }} />
            {id ? "Edit Pre Order" : "Create Pre Order"}
          </h1>
        </div>
        <div className="ci-topbar-actions">
          <button type="submit" form="preorder-form" className="ci-submit-btn">
            <Save size={16} /> {id ? "Update Pre Order" : "Save Pre Order"}
          </button>
        </div>
      </div>

      <form id="preorder-form" onSubmit={handleSave} className="ci-body">
        <div className="ci-main">
          {/* Basic Info Section */}
          <div className="ci-section">
            <div className="ci-section-title">
              <FileText size={14} /> Basic Information
            </div>
            <div className="ci-grid-4">
              <div className="ci-field">
                <label>Pre Order Number</label>
                <input
                  type="text"
                  name="preOrderNumber"
                  required
                  value={form.preOrderNumber}
                  onChange={handleInput}
                />
              </div>
              <div className="ci-field">
                <label>Pre Order Date</label>
                <input
                  type="date"
                  name="preOrderDate"
                  required
                  value={form.preOrderDate}
                  onChange={handleInput}
                />
              </div>
              <div className="ci-field">
                <label>Status</label>
                <select name="status" value={form.status} onChange={handleInput}>
                  <option value="Draft">Draft</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Processing">Processing</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div className="ci-field">
                <label>Company</label>
                <select name="company" value={form.company} onChange={handleInput} required>
                  {companies.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Customer Info Section */}
          <div className="ci-section">
            <div className="ci-section-title">Customer Information</div>
            <div className="ci-grid-3">
              <div className="ci-field">
                <label>Customer Name</label>
                <CreatableSelect
                  options={customerOptions}
                  value={form.customerName}
                  onChange={handleCustomerSelect}
                  placeholder="Select or type customer name..."
                />
              </div>
              <div className="ci-field">
                <label>Customer Phone</label>
                <input
                  type="text"
                  name="customerPhone"
                  value={form.customerPhone}
                  onChange={handleInput}
                />
              </div>
              <div className="ci-field">
                <label>Customer GSTIN</label>
                <input
                  type="text"
                  name="customerGSTIN"
                  value={form.customerGSTIN}
                  onChange={handleInput}
                  maxLength={15}
                  placeholder="e.g. 29ABCDE1234F1Z5"
                />
              </div>
            </div>

            <div className="ci-grid-3" style={{ marginTop: "12px" }}>
              <div className="ci-field">
                <label>Customer State</label>
                <select name="customerState" value={form.customerState} onChange={handleInput}>
                  <option value="">-- Select State --</option>
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
                  <option value="">-- Select State --</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="ci-grid-2" style={{ marginTop: "12px" }}>
              <div className="ci-field">
                <label>Billing Address</label>
                <textarea
                  rows={2}
                  name="billingAddress"
                  value={form.billingAddress}
                  onChange={handleInput}
                />
              </div>
              <div className="ci-field">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label>Shipping Address</label>
                  <label style={{ fontSize: "11px", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={sameAsShipping}
                      onChange={(e) => {
                        setSameAsShipping(e.target.checked);
                        if (e.target.checked) setForm((f) => ({ ...f, shippingAddress: f.billingAddress }));
                      }}
                    />
                    Same as Billing
                  </label>
                </div>
                <textarea
                  rows={2}
                  name="shippingAddress"
                  value={form.shippingAddress}
                  onChange={handleInput}
                />
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="ci-section">
            <div className="ci-section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Items / Products</span>
              <button
                type="button"
                className="ci-add-row-btn"
                onClick={() => setItems((prev) => [...prev, makeItem()])}
              >
                <Plus size={14} /> Add Row
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="ci-table">
                <thead>
                  <tr>
                    <th style={{ width: "22%" }}>Product</th>
                    <th style={{ width: "9%" }}>HSN</th>
                    <th style={{ width: "7%" }}>Unit</th>
                    <th style={{ width: "8%" }}>Qty</th>
                    <th style={{ width: "10%" }}>Rate (₹)</th>
                    <th style={{ width: "9%" }}>Discount (₹)</th>
                    <th style={{ width: "8%" }}>GST %</th>
                    <th style={{ width: "11%" }}>Taxable (₹)</th>
                    <th style={{ width: "11%" }}>Total (₹)</th>
                    <th style={{ width: "5%" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <div style={{ flex: 1 }}>
                            <CreatableSelect
                              options={productOptions}
                              value={item.productName}
                              onChange={(val) => handleProductSelect(item.id, val)}
                              placeholder="Select product..."
                            />
                          </div>
                          <button
                            type="button"
                            title="Create Quick Product"
                            onClick={() => {
                              setQuickProductInitialName(item.productName || "");
                              setActiveRowIdForQuickProduct(item.id);
                              setQuickProductModalOpen(true);
                            }}
                            style={{
                              background: "rgba(59, 130, 246, 0.15)",
                              border: "1px solid rgba(59, 130, 246, 0.3)",
                              color: "#3b82f6",
                              borderRadius: "4px",
                              padding: "6px 8px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center"
                            }}
                          >
                            <PlusCircle size={14} />
                          </button>
                        </div>
                      </td>
                      <td>
                        <input
                          type="text"
                          value={item.hsnCode}
                          onChange={(e) => updateItemField(item.id, "hsnCode", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => updateItemField(item.id, "unit", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => updateItemField(item.id, "qty", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => updateItemField(item.id, "rate", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          value={item.discount}
                          onChange={(e) => updateItemField(item.id, "discount", e.target.value)}
                        />
                      </td>
                      <td>
                        <select
                          value={item.gstRate}
                          onChange={(e) => updateItemField(item.id, "gstRate", e.target.value)}
                        >
                          <option value={0}>0%</option>
                          <option value={5}>5%</option>
                          <option value={12}>12%</option>
                          <option value={18}>18%</option>
                          <option value={28}>28%</option>
                        </select>
                      </td>
                      <td>₹{item.taxableAmount.toFixed(2)}</td>
                      <td>
                        <strong>₹{item.total.toFixed(2)}</strong>
                      </td>
                      <td>
                        {items.length > 1 && (
                          <button
                            type="button"
                            className="ci-delete-row-btn"
                            onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes & Terms */}
          <div className="ci-section">
            <div className="ci-grid-2">
              <div className="ci-field">
                <label>Notes</label>
                <textarea
                  rows={3}
                  name="notes"
                  value={form.notes}
                  onChange={handleInput}
                  placeholder="Additional notes for the customer..."
                />
              </div>
              <div className="ci-field">
                <label>Terms & Conditions</label>
                <textarea
                  rows={3}
                  name="termsConditions"
                  value={form.termsConditions}
                  onChange={handleInput}
                />
              </div>
            </div>
          </div>

          {/* Bank Account Selection */}
          <div className="ci-section">
            <div className="ci-section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Bank Details for Print</span>
              <button
                type="button"
                className="ci-add-row-btn"
                onClick={() => setBankModalOpen(true)}
              >
                <Plus size={14} /> Add New Bank Account
              </button>
            </div>
            <div className="ci-field" style={{ maxWidth: "400px" }}>
              <label>Select Bank Account</label>
              <select value={selectedBankAccountId} onChange={handleBankSelectChange}>
                <option value="">-- Do Not Include Bank Details --</option>
                {legacyBankDetails && (
                  <option value="legacy">
                    {legacyBankDetails.bankName} - {legacyBankDetails.accountNumber} (Saved with document)
                  </option>
                )}
                {companyBankAccounts.map((acc) => (
                  <option key={acc._id} value={acc._id}>
                    {acc.bankName} - {acc.accountNumber} ({acc.accountName}) {acc.isDefault ? "[Default]" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Sidebar Summary */}
        <div className="ci-sidebar">
          <div className="ci-summary-card">
            <h3 className="ci-summary-title">Summary</h3>
            <div className="ci-summary-row">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="ci-summary-row">
              <span>Total Discount</span>
              <span>- ₹{totalDiscount.toFixed(2)}</span>
            </div>
            <div className="ci-summary-row">
              <span>Total Tax (GST)</span>
              <span>₹{totalTax.toFixed(2)}</span>
            </div>

            <hr className="ci-summary-divider" />

            <div className="ci-field" style={{ marginBottom: "8px" }}>
              <label>Packaging Charges (₹)</label>
              <input
                type="number"
                name="packagingCharges"
                value={form.packagingCharges}
                onChange={handleInput}
              />
            </div>
            <div className="ci-field" style={{ marginBottom: "8px" }}>
              <label>Transport Charges (₹)</label>
              <input
                type="number"
                name="transportCharges"
                value={form.transportCharges}
                onChange={handleInput}
              />
            </div>
            <div className="ci-field" style={{ marginBottom: "8px" }}>
              <label>Other Charges (₹)</label>
              <input
                type="number"
                name="otherCharges"
                value={form.otherCharges}
                onChange={handleInput}
              />
            </div>
            <div className="ci-field" style={{ marginBottom: "8px" }}>
              <label>Adjustment / Roundoff (₹)</label>
              <input
                type="number"
                name="adjustment"
                value={form.adjustment}
                onChange={handleInput}
              />
            </div>

            <hr className="ci-summary-divider" />

            <div className="ci-grand-total">
              <span>Grand Total</span>
              <span>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </form>

      {/* Quick Product Modal */}
      {quickProductModalOpen && (
        <ProductCreateModal
          initialName={quickProductInitialName}
          onClose={() => setQuickProductModalOpen(false)}
          onSuccess={handleQuickProductCreated}
        />
      )}

      {/* Bank Account Modal */}
      {bankModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: '#1e293b', border: '1px solid #334155', borderRadius: '12px',
            padding: '24px', width: '400px', color: '#fff'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Add Bank Account</h3>
            <form onSubmit={handleCreateNewBankAccount} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Account Name</label>
                <input
                  type="text"
                  required
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff' }}
                  value={newBankForm.accountName}
                  onChange={(e) => setNewBankForm({ ...newBankForm, accountName: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Bank Name</label>
                <input
                  type="text"
                  required
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff' }}
                  value={newBankForm.bankName}
                  onChange={(e) => setNewBankForm({ ...newBankForm, bankName: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Account Number</label>
                <input
                  type="text"
                  required
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff' }}
                  value={newBankForm.accountNumber}
                  onChange={(e) => setNewBankForm({ ...newBankForm, accountNumber: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>IFSC Code</label>
                <input
                  type="text"
                  required
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff' }}
                  value={newBankForm.ifscCode}
                  onChange={(e) => setNewBankForm({ ...newBankForm, ifscCode: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Branch Name</label>
                <input
                  type="text"
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff' }}
                  value={newBankForm.branchName}
                  onChange={(e) => setNewBankForm({ ...newBankForm, branchName: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  id="isDefaultBank"
                  checked={newBankForm.isDefault}
                  onChange={(e) => setNewBankForm({ ...newBankForm, isDefault: e.target.checked })}
                />
                <label htmlFor="isDefaultBank" style={{ fontSize: '13px', cursor: 'pointer' }}>Set as default bank account</label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
                  onClick={() => setBankModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: '#2563eb', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Save Bank Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatePreOrder;
