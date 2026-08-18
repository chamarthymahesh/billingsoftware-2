import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Plus, ShoppingBag, FileText, CheckCircle, Search, Eye, Edit, Trash2, Receipt, AlertCircle, RefreshCw } from "lucide-react";
import "./Sales.css"; // Reuse the beautiful layout styling of Sales.jsx & Quotations.jsx

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const PurchaseOrders = () => {
  const navigate = useNavigate();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [convertingId, setConvertingId] = useState(null);

  const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
  const isSuperAdmin = userInfo?.role === "Super Admin";
  const authHeader = { Authorization: `Bearer ${userInfo?.token}` };

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await axios.get(`${API}/api/companies`, { headers: authHeader });
        setCompanies(res.data);
        if (isSuperAdmin) {
          setSelectedCompany("ALL");
        } else if (res.data.length > 0) {
          setSelectedCompany(res.data[0]._id);
        }
      } catch (err) {
        console.error("Error fetching companies:", err);
      }
    };
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (!selectedCompany) return;
    const fetchPurchaseOrders = async () => {
      setLoading(true);
      try {
        let url = `${API}/api/purchase-orders?companyId=${selectedCompany}`;
        if (selectedMonth) url += `&month=${selectedMonth}`;
        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
        const res = await axios.get(url, { headers: authHeader });
        setPurchaseOrders(res.data);
      } catch (err) {
        setPurchaseOrders([]);
        console.error("Purchase Orders fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPurchaseOrders();
  }, [selectedCompany, selectedMonth, startDate, endDate]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this Purchase Order? (Note: Stock is NOT affected)")) return;
    try {
      await axios.delete(`${API}/api/purchase-orders/${id}`, { headers: authHeader });
      setPurchaseOrders(prev => prev.filter(po => po._id !== id));
    } catch (err) {
      alert("Error deleting Purchase Order");
    }
  };

  const handleConvert = async (po) => {
    if (!window.confirm(`Convert PO #${po.poNumber} to Purchase Invoice? This will create a Purchase bill and update product stock.`)) return;
    setConvertingId(po._id);
    try {
      await axios.post(`${API}/api/purchase-orders/${po._id}/convert`, {}, { headers: authHeader });
      alert(`PO #${po.poNumber} successfully converted to Purchase Invoice! Stock updated.`);
      setPurchaseOrders(prev => prev.map(p => p._id === po._id ? { ...p, status: "Converted" } : p));
    } catch (err) {
      alert(err.response?.data?.message || "Error converting Purchase Order");
    } finally {
      setConvertingId(null);
    }
  };

  const filtered = purchaseOrders.filter((po) => {
    // 1. Company Filter
    if (selectedCompany && selectedCompany !== "ALL") {
      const compId = po.company?._id || po.company;
      if (compId && compId.toString() !== selectedCompany.toString()) return false;
    }

    // 2. Month / Date Range Filter
    const dStr = po.poDate ? po.poDate.split("T")[0] : "";
    if (dStr) {
      if (selectedMonth && !dStr.startsWith(selectedMonth)) return false;
      if (startDate && dStr < startDate) return false;
      if (endDate && dStr > endDate) return false;
    }

    // 3. Search Filter
    const searchLower = search.toLowerCase();
    const matchesSupplier = (po.supplierName || "").toLowerCase().includes(searchLower);
    const matchesNumber = (po.poNumber || "").toLowerCase().includes(searchLower);
    const matchesProduct = po.items?.some((item) => (item.productName || "").toLowerCase().includes(searchLower));
    return matchesSupplier || matchesNumber || matchesProduct;
  });

  // Calculate PO Statistics
  const totalCount = purchaseOrders.length;
  const totalValue = purchaseOrders.reduce((sum, po) => sum + (po.grandTotal || 0), 0);

  const issuedPOs = purchaseOrders.filter(po => po.status === 'Issued');
  const issuedCount = issuedPOs.length;
  const issuedValue = issuedPOs.reduce((sum, po) => sum + (po.grandTotal || 0), 0);

  const convertedPOs = purchaseOrders.filter(po => po.status === 'Converted');
  const convertedCount = convertedPOs.length;
  const convertedValue = convertedPOs.reduce((sum, po) => sum + (po.grandTotal || 0), 0);

  const getStatusClass = (status) => {
    switch (status) {
      case "Converted":
        return "sl-status-paid"; // Green
      case "Cancelled":
        return "sl-status-pending"; // Red
      case "Issued":
        return "sl-status-partial"; // Blue
      default:
        return "sl-status-pending"; // Gray/Neutral
    }
  };

  return (
    <div className="sl-page">
      {/* Header */}
      <div className="sl-header">
        <div>
          <h1 className="sl-title">Purchase Orders (PO)</h1>
          <p className="sl-subtitle">Manage purchase orders to suppliers. Create POs without altering stock, then convert to Purchase Invoices when received.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {companies.length > 1 && (
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="sl-company-select"
            >
              {companies.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <button onClick={() => navigate("/purchase-orders/new")} className="sl-new-btn">
            <Plus size={18} />
            Create Purchase Order
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="sl-stats" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        <div className="sl-stat">
          <div className="sl-stat-icon" style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6" }}>
            <ShoppingBag size={22} />
          </div>
          <div>
            <div className="sl-stat-label">Total Purchase Orders</div>
            <div className="sl-stat-value">₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <div className="sl-stat-desc">{totalCount} total PO documents</div>
          </div>
        </div>

        <div className="sl-stat">
          <div className="sl-stat-icon" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>
            <FileText size={22} />
          </div>
          <div>
            <div className="sl-stat-label">Issued / Pending Delivery</div>
            <div className="sl-stat-value">₹{issuedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <div className="sl-stat-desc">{issuedCount} active purchase orders</div>
          </div>
        </div>

        <div className="sl-stat">
          <div className="sl-stat-icon" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <div className="sl-stat-label">Converted to Invoices</div>
            <div className="sl-stat-value">₹{convertedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <div className="sl-stat-desc">{convertedCount} converted & stock added</div>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="sl-toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px' }}>
        <div className="sl-search" style={{ flex: '1 1 240px', minWidth: '200px' }}>
          <Search size={18} className="sl-search-icon" />
          <input
            type="text"
            placeholder="Search by PO #, supplier or product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          {/* Company Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>Company:</span>
            <select
              className="sl-company-select"
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
            >
              {isSuperAdmin && <option value="ALL">All Companies</option>}
              {companies.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>Month:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                if (e.target.value) {
                  setStartDate("");
                  setEndDate("");
                }
              }}
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#fff',
                padding: '6px 10px',
                fontSize: '13px'
              }}
            />
          </div>

          {/* Date Range Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (e.target.value) setSelectedMonth("");
              }}
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#fff',
                padding: '6px 10px',
                fontSize: '13px'
              }}
            />
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                if (e.target.value) setSelectedMonth("");
              }}
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#fff',
                padding: '6px 10px',
                fontSize: '13px'
              }}
            />
          </div>

          {/* Clear Filters Button */}
          {(selectedMonth || startDate || endDate || search || (isSuperAdmin && selectedCompany !== "ALL")) && (
            <button
              type="button"
              onClick={() => {
                setSelectedMonth("");
                setStartDate("");
                setEndDate("");
                setSearch("");
                if (isSuperAdmin) setSelectedCompany("ALL");
              }}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="sl-table-wrap">
        {loading ? (
          <div className="sl-center" style={{ padding: '40px' }}>Loading Purchase Orders...</div>
        ) : filtered.length === 0 ? (
          <div className="sl-center" style={{ padding: '40px' }}>No Purchase Orders found. Click "Create Purchase Order" to start.</div>
        ) : (
          <table className="sl-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>PO #</th>
                <th>Supplier Name</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Stock Effect</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((po) => (
                <tr key={po._id}>
                  <td>{new Date(po.poDate).toLocaleDateString("en-IN")}</td>
                  <td>
                    <span className="sl-code">{po.poNumber}</span>
                  </td>
                  <td>{po.supplierName}</td>
                  <td>₹{(po.grandTotal || 0).toFixed(2)}</td>
                  <td>
                    <span className={`sl-status ${getStatusClass(po.status)}`}>
                      {po.status}
                    </span>
                  </td>
                  <td>
                    {po.status === 'Converted' ? (
                      <span className="sl-badge-transfer" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                        Stock Added
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '11px' }}>No Stock Effect</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", minWidth: "120px" }}>
                      {po.status !== 'Converted' && (
                        <button
                          style={{
                            background: "rgba(16, 185, 129, 0.15)",
                            border: "1px solid rgba(16, 185, 129, 0.3)",
                            color: "#10b981",
                            cursor: "pointer",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontWeight: 600,
                          }}
                          onClick={() => handleConvert(po)}
                          disabled={convertingId === po._id}
                          title="Convert to Purchase Invoice (Adds Stock)"
                        >
                          {convertingId === po._id ? <RefreshCw size={14} className="spin" /> : <Receipt size={14} />}
                          Convert to Bill
                        </button>
                      )}
                      <button
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#3b82f6",
                          cursor: "pointer",
                          padding: 0,
                        }}
                        onClick={() => navigate(`/purchase-orders/view/${po._id}`)}
                        title="View Purchase Order"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#f59e0b",
                          cursor: "pointer",
                          padding: 0,
                        }}
                        onClick={() => navigate(`/purchase-orders/edit/${po._id}`)}
                        title="Edit Purchase Order"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                          padding: 0,
                        }}
                        onClick={() => handleDelete(po._id)}
                        title="Delete Purchase Order"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PurchaseOrders;
