import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Plus, Trash2, Save, ShoppingBag, ArrowLeft, PlusCircle, Info } from "lucide-react";
import CreatableSelect from "../components/CreatableSelect";
import ProductCreateModal from "../components/ProductCreateModal";
import "./CreateInvoice.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const toProperCase = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
};

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

const GST_RATES = [0, 0.1, 0.25, 1, 1.5, 3, 5, 7.5, 12, 18, 28];

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

const calcItemTotal = (item) => {
  const qty = parseFloat(item.qty) || 0;
  const rate = parseFloat(item.rate) || 0;
  const gst = parseFloat(item.gstRate) || 0;
  if (item.isInclusive) {
    return Number((rate * qty).toFixed(2));
  }
  const base = rate * qty;
  return Number((base + base * (gst / 100)).toFixed(2));
};

const CreatePurchaseOrder = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
  const authHeader = { Authorization: `Bearer ${userInfo?.token}` };

  const [companies, setCompanies] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);

  const [form, setForm] = useState({
    company: userInfo?.companyId || "",
    poNumber: "",
    poDate: new Date().toISOString().split("T")[0],
    expectedDeliveryDate: "",
    supplierName: "",
    supplierPhone: "",
    supplierGSTIN: "",
    supplierState: "",
    billingAddress: "",
    shippingAddress: "",
    packagingCharges: 0,
    transportCharges: 0,
    otherCharges: 0,
    adjustment: 0,
    notes: "",
    status: "Issued",
    termsConditions: "1. Please deliver goods according to the specifications.\n2. Invoices must reference this PO number.",
  });

  const [items, setItems] = useState([makeItem()]);
  const [quickProductModalOpen, setQuickProductModalOpen] = useState(false);
  const [quickProductInitialName, setQuickProductInitialName] = useState("");
  const [activeRowIdForQuickProduct, setActiveRowIdForQuickProduct] = useState(null);
  const tableBottomRef = useRef(null);

  // Fetch all reference data for supplier & product auto-fill
  useEffect(() => {
    const initData = async () => {
      try {
        const [compRes, prodRes, suppRes, purchRes, poRes] = await Promise.all([
          axios.get(`${API}/api/companies`, { headers: authHeader }),
          axios.get(`${API}/api/products`, { headers: authHeader }),
          axios.get(`${API}/api/suppliers`, { headers: authHeader }),
          axios.get(`${API}/api/purchases`, { headers: authHeader }).catch(() => ({ data: [] })),
          axios.get(`${API}/api/purchase-orders`, { headers: authHeader }).catch(() => ({ data: [] })),
        ]);

        setCompanies(compRes.data || []);
        if (compRes.data?.length > 0 && !form.company) {
          setForm(prev => ({ ...prev, company: compRes.data[0]._id }));
        }

        setProducts(prodRes.data || []);
        setSuppliers(suppRes.data || []);
        setPurchases(purchRes.data || []);
        setPurchaseOrders(poRes.data || []);
      } catch (err) {
        console.error("Error fetching init data for PO:", err);
      }
    };
    initData();
  }, []);

  // Fetch next PO number when company changes (if creating new)
  useEffect(() => {
    if (id || !form.company) return;
    const fetchNextNumber = async () => {
      try {
        const res = await axios.get(`${API}/api/purchase-orders/next-number?companyId=${form.company}`, { headers: authHeader });
        if (res.data?.poNumber) {
          setForm(prev => ({ ...prev, poNumber: res.data.poNumber }));
        }
      } catch (err) {
        console.error("Error fetching PO number:", err);
      }
    };
    fetchNextNumber();
  }, [form.company, id]);

  // Load existing PO if editing
  useEffect(() => {
    if (!id) return;
    const fetchPO = async () => {
      try {
        const res = await axios.get(`${API}/api/purchase-orders/${id}`, { headers: authHeader });
        const po = res.data;
        setForm({
          company: po.company?._id || po.company,
          poNumber: po.poNumber || "",
          poDate: po.poDate ? po.poDate.split("T")[0] : new Date().toISOString().split("T")[0],
          expectedDeliveryDate: po.expectedDeliveryDate ? po.expectedDeliveryDate.split("T")[0] : "",
          supplierName: po.supplierName || "",
          supplierPhone: po.supplierPhone || "",
          supplierGSTIN: po.supplierGSTIN || "",
          supplierState: po.supplierState || "",
          billingAddress: po.billingAddress || "",
          shippingAddress: po.shippingAddress || "",
          packagingCharges: po.packagingCharges || 0,
          transportCharges: po.transportCharges || 0,
          otherCharges: po.otherCharges || 0,
          adjustment: po.adjustment || 0,
          notes: po.notes || "",
          status: po.status || "Issued",
          termsConditions: po.termsConditions || "",
        });

        if (po.items && po.items.length > 0) {
          setItems(po.items.map(item => ({
            id: item._id || Date.now() + Math.random().toString(),
            product: item.product?._id || item.product || "",
            productName: item.productName || item.product?.name || "",
            hsnCode: item.hsnCode || "",
            unit: item.unit || "Pcs",
            qty: item.qty || 1,
            rate: item.rate || 0,
            mrp: item.mrp || 0,
            discount: item.discount || 0,
            gstRate: item.gstRate !== undefined ? item.gstRate : 18,
            isInclusive: Boolean(item.isInclusive),
            taxableAmount: item.taxableAmount || 0,
            taxAmount: item.taxAmount || 0,
            total: item.total || calcItemTotal(item),
          })));
        }
      } catch (err) {
        console.error("Error loading PO for edit:", err);
        alert("Failed to load Purchase Order");
      }
    };
    fetchPO();
  }, [id]);

  // Aggregate supplier details from all sources (suppliers master, companies, purchases, purchase-orders)
  const combinedSuppliersMap = new Map();

  const addSupplierToMap = (name, gstin, phone, address, state) => {
    if (!name || typeof name !== 'string') return;
    const key = name.trim().toLowerCase();
    if (!key) return;

    const existing = combinedSuppliersMap.get(key) || {
      name: toProperCase(name.trim()),
      gstin: '',
      phone: '',
      address: '',
      state: '',
    };

    combinedSuppliersMap.set(key, {
      name: existing.name || toProperCase(name.trim()),
      gstin: gstin || existing.gstin || '',
      phone: phone || existing.phone || '',
      address: address || existing.address || '',
      state: state || existing.state || '',
    });
  };

  suppliers.forEach(s => {
    const name = typeof s === 'string' ? s : s.name;
    const gstin = typeof s === 'object' ? s.gstin : '';
    const phone = typeof s === 'object' ? s.phone : '';
    const address = typeof s === 'object' ? (s.address || s.billingAddress) : '';
    const state = typeof s === 'object' ? (s.state || s.supplierState) : '';
    addSupplierToMap(name, gstin, phone, address, state);
  });

  companies.forEach(c => {
    addSupplierToMap(c.name, c.gstin, c.phone, c.address, c.state);
  });

  purchases.forEach(p => {
    addSupplierToMap(p.supplierName, p.supplierGSTIN, p.supplierPhone, p.billingAddress, p.supplierState);
  });

  purchaseOrders.forEach(po => {
    addSupplierToMap(po.supplierName, po.supplierGSTIN, po.supplierPhone, po.billingAddress, po.supplierState);
  });

  const combinedSuppliers = Array.from(combinedSuppliersMap.values());
  const supplierOptions = combinedSuppliers.map(s => s.name);
  const productOptions = [...new Set(products.map(p => toProperCase(p.name)))].filter(Boolean);

  // Supplier selection handling (auto-fills GSTIN, Phone, Address, State)
  const handleSupplierSelect = (val) => {
    if (!val) return;
    const key = val.trim().toLowerCase();
    const matched = combinedSuppliersMap.get(key) || combinedSuppliers.find(s => s.name.toLowerCase() === key);

    if (matched) {
      setForm(prev => ({
        ...prev,
        supplierName: matched.name,
        supplierGSTIN: matched.gstin || '',
        supplierPhone: matched.phone || '',
        billingAddress: matched.address || '',
        supplierState: matched.state || prev.supplierState,
      }));
    } else {
      setForm(prev => ({ ...prev, supplierName: toProperCase(val) }));
    }
  };

  // Item change handling (similar to Purchase Invoice)
  const handleItemChange = (id, field, value) => {
    setItems(prevItems =>
      prevItems.map(item => {
        if (item.id !== id) return item;
        let updated = { ...item, [field]: value };

        // Product selection auto-fill
        if (field === "productName") {
          updated.productName = toProperCase(value);
          const found = products.find(p => p.name.toLowerCase() === value.toLowerCase());
          if (found) {
            updated.product = found._id;
            updated.hsnCode = found.hsnCode || "";
            updated.unit = found.unit || "Pcs";
            updated.rate = found.purchasePrice || found.price || 0;
            updated.mrp = found.mrp || 0;
            updated.gstRate = found.gstRate !== undefined ? found.gstRate : 18;
          } else {
            updated.product = "";
          }
        }

        // Bidirectional total calculation
        if (field === "total") {
          const newTotal = parseFloat(value) || 0;
          const qty = parseFloat(item.qty) || 0;
          const gst = parseFloat(item.gstRate) || 0;
          if (qty > 0) {
            let newRate = updated.isInclusive ? (newTotal / qty) : (newTotal / (qty * (1 + gst / 100)));
            updated.rate = Number(newRate.toFixed(2));
          }
          updated.total = value;
        } else {
          updated.total = calcItemTotal(updated);
        }

        return updated;
      })
    );
  };

  const handleQuickProductCreated = (newProduct) => {
    setProducts(prev => [newProduct, ...prev]);
    setItems(prev => prev.map(item => {
      if (item.id === activeRowIdForQuickProduct) {
        let updated = {
          ...item,
          productName: newProduct.name,
          product: newProduct._id,
          hsnCode: newProduct.hsnCode || "",
          unit: newProduct.unit || "Pcs",
          rate: newProduct.purchasePrice || 0,
          gstRate: newProduct.gstRate !== undefined ? newProduct.gstRate : 18,
          isInclusive: false,
        };
        updated.total = calcItemTotal(updated);
        return updated;
      }
      return item;
    }));
  };

  const addItem = () => {
    setItems(prev => [...prev, makeItem()]);
    setTimeout(() => {
      tableBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  const removeItem = (id) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter(i => i.id !== id));
  };

  // Tax and Total calculations
  const itemsTotal = items.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
  const totalTax = items.reduce((sum, item) => {
    const qty = parseFloat(item.qty) || 0;
    const rate = parseFloat(item.rate) || 0;
    const gst = parseFloat(item.gstRate) || 0;
    let taxAmount = 0;
    if (item.isInclusive) {
      const baseRate = rate / (1 + gst / 100);
      taxAmount = (rate * qty) - (baseRate * qty);
    } else {
      const taxableAmount = rate * qty;
      taxAmount = (taxableAmount * gst) / 100;
    }
    return sum + taxAmount;
  }, 0);

  const subtotal = itemsTotal - totalTax;

  const selectedCompanyObj = companies.find(c => c._id === form.company);
  const buyerGSTIN = selectedCompanyObj?.gstin || '';
  const buyerStateCode = buyerGSTIN.substring(0, 2);
  const supplierGSTIN = form.supplierGSTIN || '';
  const sellerStateCode = supplierGSTIN.substring(0, 2);
  const isInterState = buyerStateCode && sellerStateCode && buyerStateCode !== sellerStateCode;

  const packagingCharges = Number(form.packagingCharges) || 0;
  const transportCharges = Number(form.transportCharges) || 0;
  const otherCharges = Number(form.otherCharges) || 0;
  const extraCharges = packagingCharges + transportCharges + otherCharges;
  const adjustment = Number(form.adjustment) || 0;

  const grandTotal = Math.round(itemsTotal + extraCharges - adjustment);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company) return alert("Please select a target company");
    if (!form.poNumber) return alert("PO Number is required");
    if (!form.supplierName) return alert("Supplier Name is required");
    if (items.length === 0 || !items[0].productName) return alert("Please add at least one item to the PO");

    try {
      const payload = {
        ...form,
        supplierName: toProperCase(form.supplierName),
        items: items.map(i => ({
          product: i.product || undefined,
          productName: i.productName,
          hsnCode: i.hsnCode,
          unit: i.unit,
          qty: Number(i.qty),
          rate: Number(i.rate),
          gstRate: Number(i.gstRate),
          isInclusive: Boolean(i.isInclusive),
          taxableAmount: Number((i.isInclusive ? (i.rate / (1 + i.gstRate / 100)) * i.qty : i.rate * i.qty).toFixed(2)),
          taxAmount: Number((i.total - (i.isInclusive ? (i.rate / (1 + i.gstRate / 100)) * i.qty : i.rate * i.qty)).toFixed(2)),
          total: Number(i.total),
        })),
        subtotal: Number(subtotal.toFixed(2)),
        totalTax: Number(totalTax.toFixed(2)),
        packagingCharges,
        transportCharges,
        otherCharges,
        adjustment,
        grandTotal,
      };

      // Auto-create or update supplier in backend with phone, gstin, state, address for future auto-fill
      if (form.supplierName.trim()) {
        try {
          await axios.post(`${API}/api/suppliers`, {
            name: form.supplierName,
            gstin: form.supplierGSTIN,
            phone: form.supplierPhone,
            address: form.billingAddress,
            state: form.supplierState,
          }, { headers: authHeader });
        } catch (err) {
          // If already exists, update supplier info if provided
          try {
            const existingSupp = suppliers.find(s => s.name?.toLowerCase() === form.supplierName.toLowerCase());
            if (existingSupp?._id) {
              await axios.put(`${API}/api/suppliers/${existingSupp._id}`, {
                name: form.supplierName,
                gstin: form.supplierGSTIN,
                phone: form.supplierPhone,
                address: form.billingAddress,
                state: form.supplierState,
              }, { headers: authHeader });
            }
          } catch (e) {
            console.error('Updating supplier error:', e);
          }
        }
      }

      if (id) {
        await axios.put(`${API}/api/purchase-orders/${id}`, payload, { headers: authHeader });
        alert("Purchase Order updated successfully!");
      } else {
        await axios.post(`${API}/api/purchase-orders`, payload, { headers: authHeader });
        alert("Purchase Order created successfully!");
      }
      navigate("/purchase-orders");
    } catch (err) {
      console.error("Error saving Purchase Order:", err);
      alert(err.response?.data?.message || "Error saving Purchase Order");
    }
  };

  return (
    <div className="sl-page" style={{ paddingBottom: '60px' }}>
      {/* Header */}
      <div className="sl-header">
        <div>
          <button
            type="button"
            onClick={() => navigate("/purchase-orders")}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}
          >
            <ArrowLeft size={16} /> Back to Purchase Orders
          </button>
          <h1 className="sl-title">{id ? "Edit Purchase Order" : "Create Purchase Order (PO)"}</h1>
          <p className="sl-subtitle">Generate a purchase order for suppliers. Stock will NOT be affected until converted into a Purchase Invoice.</p>
        </div>
      </div>

      {/* Info Banner on Stock */}
      <div style={{
        background: 'rgba(59, 130, 246, 0.12)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        color: '#60a5fa',
        fontSize: '13px'
      }}>
        <Info size={20} style={{ flexShrink: 0 }} />
        <div>
          <strong>No Stock Impact:</strong> Purchase Orders record your planned purchase requests. Stock levels remain untouched. Once the products arrive, click "Convert to Bill" to record the purchase invoice and update inventory.
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          {/* General PO Information */}
          <div className="sl-table-wrap" style={{ padding: '20px' }}>
            <h3 style={{ color: '#f8fafc', fontSize: '16px', marginBottom: '16px', fontWeight: 600 }}>PO Details</h3>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>TARGET COMPANY *</label>
              <select
                className="sl-company-select"
                style={{ width: '100%', padding: '10px' }}
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                disabled={Boolean(id)}
              >
                {companies.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>PO NUMBER *</label>
                <input
                  type="text"
                  required
                  value={form.poNumber}
                  onChange={(e) => setForm({ ...form, poNumber: e.target.value })}
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '10px', color: '#fff', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>STATUS</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '10px', color: '#fff', fontSize: '13px' }}
                >
                  <option value="Draft">Draft</option>
                  <option value="Issued">Issued</option>
                  <option value="Converted">Converted</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>PO DATE *</label>
                <input
                  type="date"
                  required
                  value={form.poDate}
                  onChange={(e) => setForm({ ...form, poDate: e.target.value })}
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '10px', color: '#fff', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>EXPECTED DELIVERY</label>
                <input
                  type="date"
                  value={form.expectedDeliveryDate}
                  onChange={(e) => setForm({ ...form, expectedDeliveryDate: e.target.value })}
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '10px', color: '#fff', fontSize: '13px' }}
                />
              </div>
            </div>
          </div>

          {/* Supplier Information */}
          <div className="sl-table-wrap" style={{ padding: '20px' }}>
            <h3 style={{ color: '#f8fafc', fontSize: '16px', marginBottom: '16px', fontWeight: 600 }}>Supplier Details</h3>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>SUPPLIER NAME *</label>
              <CreatableSelect
                options={supplierOptions}
                value={form.supplierName}
                onChange={handleSupplierSelect}
                placeholder="Search or select supplier..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>SUPPLIER GSTIN</label>
                <input
                  type="text"
                  value={form.supplierGSTIN}
                  onChange={(e) => setForm({ ...form, supplierGSTIN: e.target.value.toUpperCase() })}
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '10px', color: '#fff', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>SUPPLIER PHONE</label>
                <input
                  type="text"
                  value={form.supplierPhone}
                  onChange={(e) => setForm({ ...form, supplierPhone: e.target.value })}
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '10px', color: '#fff', fontSize: '13px' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>SUPPLIER STATE</label>
              <select
                value={form.supplierState}
                onChange={(e) => setForm({ ...form, supplierState: e.target.value })}
                style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '10px', color: '#fff', fontSize: '13px' }}
              >
                <option value="">Select State</option>
                {INDIAN_STATES.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>BILLING / SUPPLIER ADDRESS</label>
              <textarea
                rows={2}
                value={form.billingAddress}
                onChange={(e) => setForm({ ...form, billingAddress: e.target.value })}
                style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '10px', color: '#fff', fontSize: '13px' }}
              />
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="sl-table-wrap" style={{ padding: '20px', marginBottom: '20px', overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ color: '#f8fafc', fontSize: '16px', fontWeight: 600 }}>Products in this PO</h3>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>{items.length} item{items.length !== 1 ? 's' : ''}</span>
          </div>

          <table className="sl-table">
            <thead>
              <tr>
                <th style={{ minWidth: '220px' }}>PRODUCT</th>
                <th style={{ width: '90px' }}>QTY</th>
                <th style={{ width: '120px' }}>RATE (₹)</th>
                <th style={{ width: '90px' }}>GST %</th>
                <th style={{ width: '70px', textAlign: 'center' }}>INCL?</th>
                <th style={{ width: '130px' }}>TOTAL (₹)</th>
                <th style={{ width: '50px', textAlign: 'center' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <CreatableSelect
                      value={item.productName}
                      onChange={val => handleItemChange(item.id, 'productName', val)}
                      options={productOptions}
                      placeholder="Search or select product..."
                      onCreateOption={(name) => {
                        setQuickProductInitialName(name);
                        setActiveRowIdForQuickProduct(item.id);
                        setQuickProductModalOpen(true);
                      }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={(e) => handleItemChange(item.id, "qty", e.target.value)}
                      style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff', fontSize: '13px' }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="any"
                      value={item.rate}
                      onChange={(e) => handleItemChange(item.id, "rate", e.target.value)}
                      style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff', fontSize: '13px' }}
                    />
                  </td>
                  <td>
                    <select
                      value={item.gstRate}
                      onChange={(e) => handleItemChange(item.id, "gstRate", Number(e.target.value))}
                      style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff', fontSize: '13px' }}
                    >
                      {GST_RATES.map(r => (
                        <option key={r} value={r}>{r}%</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={item.isInclusive}
                      onChange={(e) => handleItemChange(item.id, "isInclusive", e.target.checked)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="any"
                      value={item.total}
                      onChange={(e) => handleItemChange(item.id, "total", e.target.value)}
                      style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#10b981', fontWeight: 'bold', fontSize: '13px' }}
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                      style={{ background: 'transparent', border: 'none', color: items.length === 1 ? '#475569' : '#ef4444', cursor: items.length === 1 ? 'not-allowed' : 'pointer' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div ref={tableBottomRef} />

          <button
            type="button"
            onClick={addItem}
            style={{ marginTop: '12px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#3b82f6', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600 }}
          >
            <Plus size={16} /> Add Item
          </button>
        </div>

        {/* Charges & Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          {/* Notes & Terms */}
          <div className="sl-table-wrap" style={{ padding: '20px' }}>
            <h3 style={{ color: '#f8fafc', fontSize: '16px', marginBottom: '16px', fontWeight: 600 }}>Notes & Terms</h3>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>Notes</label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Internal notes or instructions to supplier..."
                style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '10px', color: '#fff', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>Terms & Conditions</label>
              <textarea
                rows={3}
                value={form.termsConditions}
                onChange={(e) => setForm({ ...form, termsConditions: e.target.value })}
                style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '10px', color: '#fff', fontSize: '13px' }}
              />
            </div>
          </div>

          {/* Charges and Totals Summary */}
          <div className="sl-table-wrap" style={{ padding: '20px' }}>
            <h3 style={{ color: '#f8fafc', fontSize: '16px', marginBottom: '16px', fontWeight: 600 }}>Summary & Additional Charges</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Packaging Charges (₹)</label>
                <input
                  type="number"
                  step="any"
                  value={form.packagingCharges}
                  onChange={(e) => setForm({ ...form, packagingCharges: e.target.value })}
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Transport Charges (₹)</label>
                <input
                  type="number"
                  step="any"
                  value={form.transportCharges}
                  onChange={(e) => setForm({ ...form, transportCharges: e.target.value })}
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff', fontSize: '13px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Other Charges (₹)</label>
                <input
                  type="number"
                  step="any"
                  value={form.otherCharges}
                  onChange={(e) => setForm({ ...form, otherCharges: e.target.value })}
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Adjustment (₹)</label>
                <input
                  type="number"
                  step="any"
                  value={form.adjustment}
                  onChange={(e) => setForm({ ...form, adjustment: e.target.value })}
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff', fontSize: '13px' }}
                />
              </div>
            </div>

            <div style={{ borderTop: '1px solid #334155', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '13px' }}>
                <span>Taxable Amount:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {totalTax > 0 && (
                isInterState ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '13px' }}>
                    <span>IGST:</span>
                    <span>₹{totalTax.toFixed(2)}</span>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '13px' }}>
                      <span>CGST:</span>
                      <span>₹{(totalTax / 2).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '13px' }}>
                      <span>SGST:</span>
                      <span>₹{(totalTax / 2).toFixed(2)}</span>
                    </div>
                  </>
                )
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '13px' }}>
                <span>Items Total:</span>
                <span>₹{itemsTotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '13px' }}>
                <span>Extra Charges:</span>
                <span>+₹{extraCharges.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f8fafc', fontSize: '18px', fontWeight: 'bold', paddingTop: '8px', borderTop: '1px dashed #334155' }}>
                <span>Grand Total:</span>
                <span style={{ color: '#10b981' }}>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            onClick={() => navigate("/purchase-orders")}
            style={{ background: '#334155', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', cursor: 'pointer', fontWeight: 600 }}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 28px', fontSize: '14px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)' }}
          >
            <Save size={18} />
            {id ? "Update Purchase Order" : "Save Purchase Order"}
          </button>
        </div>
      </form>

      {/* Quick Create Product Modal */}
      <ProductCreateModal
        isOpen={quickProductModalOpen}
        onClose={() => setQuickProductModalOpen(false)}
        initialName={quickProductInitialName}
        onProductCreated={handleQuickProductCreated}
      />
    </div>
  );
};

export default CreatePurchaseOrder;
