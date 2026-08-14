import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Plus, ShoppingCart, Eye, Edit, Trash2, Search, Truck, FileText } from "lucide-react";
import "./Sales.css"; // Reuse the beautiful layout styling of Sales.jsx

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const DeliveryChallans = () => {
  const navigate = useNavigate();
  const [challans, setChallans] = useState([]);
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
    const fetchChallans = async () => {
      setLoading(true);
      try {
        let url = `${API}/api/delivery-challans?companyId=${selectedCompany}`;
        if (selectedMonth) url += `&month=${selectedMonth}`;
        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
        const res = await axios.get(url, { headers: authHeader });
        setChallans(res.data);
      } catch (err) {
        setChallans([]);
        console.error("Challans fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchChallans();
  }, [selectedCompany, selectedMonth, startDate, endDate]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this delivery challan?")) return;
    try {
      await axios.delete(`${API}/api/delivery-challans/${id}`, { headers: authHeader });
      setChallans(prev => prev.filter(c => c._id !== id));
    } catch (err) {
      alert("Error deleting challan");
    }
  };

  const filtered = challans.filter((c) => {
    // 1. Company Filter
    if (selectedCompany && selectedCompany !== "ALL") {
      const compId = c.company?._id || c.company;
      if (compId && compId.toString() !== selectedCompany.toString()) return false;
    }

    // 2. Month / Date Range Filter
    const dStr = c.challanDate ? c.challanDate.split("T")[0] : "";
    if (dStr) {
      if (selectedMonth && !dStr.startsWith(selectedMonth)) return false;
      if (startDate && dStr < startDate) return false;
      if (endDate && dStr > endDate) return false;
    }

    // 3. Search Filter
    const searchLower = search.toLowerCase();
    const matchesCustomer = (c.customerName || "").toLowerCase().includes(searchLower);
    const matchesNumber = (c.challanNumber || "").toLowerCase().includes(searchLower);
    const matchesProduct = c.items?.some((item) => (item.productName || "").toLowerCase().includes(searchLower));
    return matchesCustomer || matchesNumber || matchesProduct;
  });

  // Calculate statistics
  const totalChallansCount = challans.length;
  const totalItemsDispatched = challans.reduce((sum, c) => {
    return sum + (c.items?.reduce((itemSum, item) => itemSum + (item.qty || 0), 0) || 0);
  }, 0);

  return (
    <div className="sl-page">
      {/* Header */}
      <div className="sl-header">
        <div>
          <h1 className="sl-title">Delivery Challans</h1>
          <p className="sl-subtitle">Manage material dispatches, delivery runs & challans</p>
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
          <button onClick={() => navigate("/delivery-challans/new")} className="sl-new-btn">
            <Plus size={18} />
            Create Delivery Challan
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="sl-stats" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        <div className="sl-stat">
          <div className="sl-stat-icon" style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6" }}>
            <Truck size={22} />
          </div>
          <div>
            <div className="sl-stat-label">Total Delivery Challans</div>
            <div className="sl-stat-value">{totalChallansCount}</div>
            <div className="sl-stat-desc">dispatched material records</div>
          </div>
        </div>

        <div className="sl-stat">
          <div className="sl-stat-icon" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
            <ShoppingCart size={22} />
          </div>
          <div>
            <div className="sl-stat-label">Total Items Dispatched</div>
            <div className="sl-stat-value">{totalItemsDispatched} Units</div>
            <div className="sl-stat-desc">across all completed runs</div>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="sl-toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px' }}>
        <div className="sl-search" style={{ flex: '1 1 240px', minWidth: '200px' }}>
          <Search size={18} className="sl-search-icon" />
          <input
            type="text"
            placeholder="Search by challan #, customer or product..."
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
          <div className="sl-center" style={{ padding: '40px' }}>Loading challans...</div>
        ) : filtered.length === 0 ? (
          <div className="sl-center" style={{ padding: '40px' }}>No delivery challans found.</div>
        ) : (
          <table className="sl-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Challan #</th>
                <th>Customer Name</th>
                <th>Amount (Ref)</th>
                <th>Source Invoice</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c._id}>
                  <td>{new Date(c.challanDate).toLocaleDateString("en-IN")}</td>
                  <td>
                    <span className="sl-code">{c.challanNumber}</span>
                  </td>
                  <td>{c.customerName}</td>
                  <td>₹{(c.grandTotal || 0).toFixed(2)}</td>
                  <td>
                    {c.convertedFromInvoice ? (
                      <span className="sl-badge-transfer" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                        Converted
                      </span>
                    ) : (
                      <span style={{ color: '#64748b', fontSize: '11px' }}>Manual</span>
                    )}
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
                        onClick={() => navigate(`/delivery-challans/view/${c._id}`)}
                        title="View Challan"
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
                        onClick={() => navigate(`/delivery-challans/edit/${c._id}`)}
                        title="Edit Challan"
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
                        onClick={() => handleDelete(c._id)}
                        title="Delete Challan"
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

export default DeliveryChallans;
