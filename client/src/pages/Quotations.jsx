import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Plus, TrendingUp, DollarSign, FileText, CheckCircle, Search, Eye, Edit, Trash2, Calendar, Receipt } from "lucide-react";
import "./Sales.css"; // Reuse the beautiful layout styling of Sales.jsx

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const Quotations = () => {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
  const authHeader = { Authorization: `Bearer ${userInfo?.token}` };

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await axios.get(`${API}/api/companies`, { headers: authHeader });
        setCompanies(res.data);
        if (res.data.length > 0) setSelectedCompany(res.data[0]._id);
      } catch (err) {
        console.error("Error fetching companies:", err);
      }
    };
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (!selectedCompany) return;
    const fetchQuotations = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/api/quotations?companyId=${selectedCompany}`, { headers: authHeader });
        setQuotations(res.data);
      } catch (err) {
        setQuotations([]);
        console.error("Quotations fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuotations();
  }, [selectedCompany]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this quotation?")) return;
    try {
      await axios.delete(`${API}/api/quotations/${id}`, { headers: authHeader });
      setQuotations(prev => prev.filter(q => q._id !== id));
    } catch (err) {
      alert("Error deleting quotation");
    }
  };

  const filtered = quotations.filter((q) => {
    const searchLower = search.toLowerCase();
    const matchesCustomer = (q.customerName || "").toLowerCase().includes(searchLower);
    const matchesNumber = (q.quotationNumber || "").toLowerCase().includes(searchLower);
    const matchesProduct = q.items?.some((item) => (item.productName || "").toLowerCase().includes(searchLower));
    return matchesCustomer || matchesNumber || matchesProduct;
  });

  // Calculate Quotation Statistics
  const totalQuotationsCount = quotations.length;
  const totalQuotationsValue = quotations.reduce((sum, q) => sum + (q.grandTotal || 0), 0);

  const expectedOrders = quotations.filter(q => q.isExpectedOrder);
  const expectedCount = expectedOrders.length;
  const expectedValue = expectedOrders.reduce((sum, q) => sum + (q.grandTotal || 0), 0);

  const acceptedQuotations = quotations.filter(q => q.status === 'Accepted');
  const acceptedCount = acceptedQuotations.length;
  const acceptedValue = acceptedQuotations.reduce((sum, q) => sum + (q.grandTotal || 0), 0);

  const getStatusClass = (status) => {
    switch (status) {
      case "Accepted":
        return "sl-status-paid"; // Green styling
      case "Declined":
        return "sl-status-pending"; // Red/Warning styling
      case "Sent":
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
          <h1 className="sl-title">Quotations</h1>
          <p className="sl-subtitle">Manage customer quotations, track pipeline & expected orders</p>
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
          <button onClick={() => navigate("/quotations/new")} className="sl-new-btn">
            <Plus size={18} />
            Create Quotation
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
            <div className="sl-stat-label">Total Quotations</div>
            <div className="sl-stat-value">₹{totalQuotationsValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <div className="sl-stat-desc">{totalQuotationsCount} draft/sent proposals</div>
          </div>
        </div>

        <div className="sl-stat">
          <div className="sl-stat-icon" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <div className="sl-stat-label">Expected Orders</div>
            <div className="sl-stat-value">₹{expectedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <div className="sl-stat-desc">{expectedCount} high-probability orders</div>
          </div>
        </div>

        <div className="sl-stat">
          <div className="sl-stat-icon" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <div className="sl-stat-label">Converted / Won</div>
            <div className="sl-stat-value">₹{acceptedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <div className="sl-stat-desc">{acceptedCount} quotation conversions</div>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="sl-toolbar" style={{ justifyContent: 'space-between', padding: '12px 20px' }}>
        <div className="sl-search">
          <Search size={18} className="sl-search-icon" />
          <input
            type="text"
            placeholder="Search by quotation #, customer or product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="sl-table-wrap">
        {loading ? (
          <div className="sl-center" style={{ padding: '40px' }}>Loading quotations...</div>
        ) : filtered.length === 0 ? (
          <div className="sl-center" style={{ padding: '40px' }}>No quotations found. Click "Create Quotation" to start.</div>
        ) : (
          <table className="sl-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Quotation #</th>
                <th>Customer Name</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Expected Order</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q) => (
                <tr key={q._id}>
                  <td>{new Date(q.quotationDate).toLocaleDateString("en-IN")}</td>
                  <td>
                    <span className="sl-code">{q.quotationNumber}</span>
                  </td>
                  <td>{q.customerName}</td>
                  <td>₹{(q.grandTotal || 0).toFixed(2)}</td>
                  <td>
                    <span className={`sl-status ${getStatusClass(q.status)}`}>
                      {q.status}
                    </span>
                  </td>
                  <td>
                    {q.isExpectedOrder ? (
                      <span className="sl-badge-transfer" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                        Expected Order
                      </span>
                    ) : (
                      <span style={{ color: '#64748b', fontSize: '11px' }}>No</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", minWidth: "80px" }}>
                      {q.status !== 'Accepted' && (
                        <button
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#10b981",
                            cursor: "pointer",
                            padding: 0,
                          }}
                          onClick={() => navigate(`/sales/new?fromQuotation=${q._id}`)}
                          title="Convert to Sales Invoice"
                        >
                          <Receipt size={18} />
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
                        onClick={() => navigate(`/quotations/view/${q._id}`)}
                        title="View Quotation"
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
                        onClick={() => navigate(`/quotations/edit/${q._id}`)}
                        title="Edit Quotation"
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
                        onClick={() => handleDelete(q._id)}
                        title="Delete Quotation"
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

export default Quotations;
