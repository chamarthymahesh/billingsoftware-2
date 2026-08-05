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

const CreateDeliveryChallan = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const fromInvoiceId = searchParams.get("fromInvoice");

  const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
  const authHeader = { Authorization: `Bearer ${userInfo?.token}` };

  const [companies, setCompanies] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [form, setForm] = useState({
    company: userInfo?.companyId || "",
    challanNumber: "",
    challanDate: new Date().toISOString().split("T")[0],
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
    termsConditions: "Received above goods in good condition.\nAll disputes subject to local jurisdiction.",
    convertedFromInvoice: "",
  });

  const [items, setItems] = useState([makeItem()]);
  const [sameAsShipping, setSameAsShipping] = useState(false);
  const [quickProductModalOpen, setQuickProductModalOpen] = useState(false);
  const [quickProductInitialName, setQuickProductInitialName] = useState("");
  const [activeRowIdForQuickProduct, setActiveRowIdForQuickProduct] = useState(null);

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

  // Set default next challan number
  useEffect(() => {
    if (!id && form.company) {
      axios
        .get(`${API}/api/delivery-challans/next-number?companyId=${form.company}`, { headers: authHeader })
        .then((res) => {
          setForm((f) => ({ ...f, challanNumber: res.data.challanNumber }));
        })
        .catch(console.error);
    }
  }, [form.company, id]);

  // Load from Invoice if requested
  useEffect(() => {
    if (fromInvoiceId && !id) {
      const fetchInvoiceForChallan = async () => {
        try {
          const res = await axios.get(`${API}/api/invoices/${fromInvoiceId}`, { headers: authHeader });
          const inv = res.data;
          setForm((f) => ({
            ...f,
            company: inv.company?._id || inv.company || f.company,
            customerName: inv.customerName || "",
            customerPhone: inv.customerPhone || "",
            customerGSTIN: inv.customerGSTIN || "",
            customerState: inv.customerState || "",
            billingAddress: inv.billingAddress || "",
            shippingAddress: inv.shippingAddress || "",
            placeOfSupply: inv.placeOfSupply || "",
            packagingCharges: inv.packagingCharges || 0,
            transportCharges: inv.transportCharges || 0,
            otherCharges: inv.otherCharges || 0,
            adjustment: inv.adjustment || 0,
            notes: inv.notes || "",
            termsConditions: f.termsConditions,
            convertedFromInvoice: fromInvoiceId,
          }));

          if (inv.items && inv.items.length > 0) {
            setItems(
              inv.items.map((item) => ({
                ...item,
                id: item.id || item._id || Date.now() + Math.random(),
                product: item.product?._id || item.product || "",
              })),
            );
          }
        } catch (err) {
          console.error("Error fetching invoice for challan:", err);
          alert("Failed to load invoice details.");
        }
      };
      fetchInvoiceForChallan();
    }
  }, [fromInvoiceId, id]);

  // Load challan for editing
  useEffect(() => {
    if (id) {
      const fetchChallanForEdit = async () => {
        try {
          const res = await axios.get(`${API}/api/delivery-challans/${id}`, { headers: authHeader });
          const dc = res.data;
          setForm({
            company: dc.company?._id || dc.company || "",
            challanNumber: dc.challanNumber || "",
            challanDate: dc.challanDate ? new Date(dc.challanDate).toISOString().split("T")[0] : "",
            customerName: dc.customerName || "",
            customerPhone: dc.customerPhone || "",
            customerGSTIN: dc.customerGSTIN || "",
            customerState: dc.customerState || "",
            billingAddress: dc.billingAddress || "",
            shippingAddress: dc.shippingAddress || "",
            placeOfSupply: dc.placeOfSupply || "",
            packagingCharges: dc.packagingCharges || 0,
            transportCharges: dc.transportCharges || 0,
            otherCharges: dc.otherCharges || 0,
            adjustment: dc.adjustment || 0,
            notes: dc.notes || "",
            termsConditions: dc.termsConditions || "",
            convertedFromInvoice: dc.convertedFromInvoice || "",
          });

          if (dc.shippingAddress === dc.billingAddress && dc.billingAddress) {
            setSameAsShipping(true);
          }

          if (dc.items && dc.items.length > 0) {
            setItems(
              dc.items.map((item) => ({
                ...item,
                id: item._id || Date.now() + Math.random().toString(),
              })),
            );
          }
        } catch (err) {
          console.error("Error fetching challan for edit", err);
        }
      };
      fetchChallanForEdit();
    }
  }, [id]);

  const handleInput = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleCustomerSelect = (val) => {
    const cust = customers.find((c) => c.name.toLowerCase() === val.toLowerCase());
    if (cust) {
      setForm((f) => ({
        ...f,
        customerName: cust.name,
        customerPhone: cust.phone || "",
        customerGSTIN: cust.gstin || "",
        customerState: cust.state || "",
        billingAddress: cust.address || "",
        shippingAddress: sameAsShipping ? cust.address || "" : (f.shippingAddress || cust.address || ""),
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
    };

    try {
      if (id) {
        await axios.put(`${API}/api/delivery-challans/${id}`, payload, { headers: authHeader });
      } else {
        await axios.post(`${API}/api/delivery-challans`, payload, { headers: authHeader });
      }
      navigate("/delivery-challans");
    } catch (err) {
      alert(err.response?.data?.message || "Error saving delivery challan");
    }
  };

  const customerOptions = customers.map((c) => c.name);
  const productOptions = products.map((p) => p.name);

  return (
    <div className="ci-page">
      {/* Topbar */}
      <div className="ci-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button type="button" onClick={() => navigate("/delivery-challans")} className="ci-back-btn">
            <ArrowLeft size={16} /> Back to Delivery Challans
          </button>
          <h1 className="ci-page-title">
            <FileText size={18} style={{ color: "#3b82f6" }} />
            {id ? "Edit Delivery Challan" : "Create Delivery Challan"}
          </h1>
        </div>
        <div className="ci-topbar-actions">
          <button type="submit" form="challan-form" className="ci-submit-btn">
            <Save size={16} /> {id ? "Update Challan" : "Save Challan"}
          </button>
        </div>
      </div>

      <form id="challan-form" onSubmit={handleSave} className="ci-body">
        <div className="ci-main">
          {/* Basic Info Section */}
          <div className="ci-section">
            <div className="ci-section-title">
              <FileText size={14} /> Basic Information
            </div>
            <div className="ci-grid-3">
              <div className="ci-field">
                <label>Challan Number</label>
                <input
                  type="text"
                  name="challanNumber"
                  required
                  value={form.challanNumber}
                  onChange={handleInput}
                />
              </div>
              <div className="ci-field">
                <label>Challan Date</label>
                <input
                  type="date"
                  name="challanDate"
                  required
                  value={form.challanDate}
                  onChange={handleInput}
                />
              </div>
              {form.convertedFromInvoice && (
                <div className="ci-field">
                  <label>Ref. Invoice ID</label>
                  <input
                    type="text"
                    disabled
                    value={form.convertedFromInvoice}
                    style={{ opacity: 0.6 }}
                  />
                </div>
              )}
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
    </div>
  );
};

export default CreateDeliveryChallan;
