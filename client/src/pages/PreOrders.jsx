import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Plus, TrendingUp, FileText, CheckCircle, Search, Eye, Edit, Trash2, Clock } from "lucide-react";
import "./Sales.css"; // Reuse the beautiful layout styling of Sales.jsx

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const PreOrders = () => {
  const navigate = useNavigate();
  const [preOrders, setPreOrders] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

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
    const fetchPreOrders = async () => {
      setLoading(true);
      try {
        let url = `${API}/api/pre-orders?companyId=${selectedCompany}`;
        if (selectedMonth) url += `&month=${selectedMonth}`;
        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
        const res = await axios.get(url, { headers: authHeader });
        setPreOrders(res.data);
      } catch (err) {
        setPreOrders([]);
        console.error("Pre-orders fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPreOrders();
  }, [selectedCompany, selectedMonth, startDate, endDate]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this pre-order?")) return;
    try {
      await axios.delete(`${API}/api/pre-orders/${id}`, { headers: authHeader });
      setPreOrders(prev => prev.filter(p => p._id !== id));
    } catch (err) {
      alert("Error deleting pre-order");
    }
  };

  const filtered = preOrders.filter((p) => {
    // 1. Company Filter
    if (selectedCompany && selectedCompany !== "ALL") {
      const compId = p.company?._id || p.company;
      if (compId && compId.toString() !== selectedCompany.toString()) return false;
    }

    // 2. Month / Date Range Filter
    const dStr = p.preOrderDate ? p.preOrderDate.split("T")[0] : "";
    if (dStr) {
      if (selectedMonth && !dStr.startsWith(selectedMonth)) return false;
      if (startDate && dStr < startDate) return false;
      if (endDate && dStr > endDate) return false;
    }

    // 3. Search Filter
    const searchLower = search.toLowerCase();
    const matchesCustomer = (p.customerName || "").toLowerCase().includes(searchLower);
    const matchesNumber = (p.preOrderNumber || "").toLowerCase().includes(searchLower);
    const matchesProduct = p.items?.some((item) => (item.productName || "").toLowerCase().includes(searchLower));
    return matchesCustomer || matchesNumber || matchesProduct;
  });

  // Calculate Pre-Order Statistics
  const totalPreOrdersCount = preOrders.length;
  const totalPreOrdersValue = preOrders.reduce((sum, p) => sum + (p.grandTotal || 0), 0);

  const confirmedPreOrders = preOrders.filter(p => p.status === 'Confirmed' || p.status === 'Processing');
  const confirmedCount = confirmedPreOrders.length;
  const confirmedValue = confirmedPreOrders.reduce((sum, p) => sum + (p.grandTotal || 0), 0);

  const completedPreOrders = preOrders.filter(p => p.status === 'Completed');
  const completedCount = completedPreOrders.length;
  const completedValue = completedPreOrders.reduce((sum, p) => sum + (p.grandTotal || 0), 0);

  const getStatusClass = (status) => {
    switch (status) {
      case "Completed":
        return "sl-status-paid"; // Green styling
      case "Cancelled":
        return "sl-status-pending"; // Red/Warning styling
      case "Confirmed":
      case "Processing":
        return "sl-status-partial"; // Blue/Neutral styling
      default:
        return "sl-status-pending";
    }
  };

  return (
    <div className="sl-page">
      {/* Header */}
      <div className="sl-header">
        <div>
          <h1 className="sl-title">Pre Orders</h1>
          <p className="sl-subtitle">Manage advance pre-orders without affecting stock inventory</p>
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
          <button onClick={() => navigate("/pre-orders/new")} className="sl-new-btn">
            <Plus size={18} />
            Create Pre Order
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="sl-stats" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        <div className="sl-stat">
          <div className="sl-stat-icon" style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6" }}>
            <FileText size={22} />
          </div>
          <div>
            <div className="sl-stat-label">Total Pre Orders</div>
            <div className="sl-stat-value">₹{totalPreOrdersValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <div className="sl-stat-desc">{totalPreOrdersCount} total pre orders</div>
          </div>
        </div>

        <div className="sl-stat">
          <div className="sl-stat-icon" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>
            <Clock size={22} />
          </div>
          <div>
            <div className="sl-stat-label">Confirmed / Processing</div>
            <div className="sl-stat-value">₹{confirmedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <div className="sl-stat-desc">{confirmedCount} active pre-orders</div>
          </div>
        </div>

        <div className="sl-stat">
          <div className="sl-stat-icon" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <div className="sl-stat-label">Completed</div>
            <div className="sl-stat-value">₹{completedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <div className="sl-stat-desc">{completedCount} fulfilled pre-orders</div>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="sl-toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px' }}>
        <div className="sl-search" style={{ flex: '1 1 240px', minWidth: '200px' }}>
          <Search size={18} className="sl-search-icon" />
          <input
            type="text"
            placeholder="Search by pre-order #, customer or product..."
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
          <div className="sl-center" style={{ padding: '40px' }}>Loading pre-orders...</div>
        ) : filtered.length === 0 ? (
          <div className="sl-center" style={{ padding: '40px' }}>No pre-orders found. Click "Create Pre Order" to start.</div>
        ) : (
          <table className="sl-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Pre Order #</th>
                <th>Customer Name</th>
                <th>Amount</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p._id}>
                  <td>{new Date(p.preOrderDate).toLocaleDateString("en-IN")}</td>
                  <td>
                    <span className="sl-code">{p.preOrderNumber}</span>
                  </td>
                  <td>{p.customerName}</td>
                  <td>₹{(p.grandTotal || 0).toFixed(2)}</td>
                  <td>
                    <span className={`sl-status ${getStatusClass(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", minWidth: "80px" }}>
                      <button
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#3b82f6",
                          cursor: "pointer",
                          padding: 0,
                        }}
                        onClick={() => navigate(`/pre-orders/view/${p._id}`)}
                        title="View Pre Order"
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
                        onClick={() => navigate(`/pre-orders/edit/${p._id}`)}
                        title="Edit Pre Order"
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
                        onClick={() => handleDelete(p._id)}
                        title="Delete Pre Order"
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

export default PreOrders;
