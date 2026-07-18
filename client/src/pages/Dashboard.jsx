import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Building2, TrendingUp, DollarSign, Activity, ShoppingCart, Truck, Percent } from "lucide-react";
import "./Sales.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const Dashboard = () => {
  const navigate = useNavigate();
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));
  const authHeader = { Authorization: `Bearer ${userInfo?.token}` };

  const [totalCompanies, setTotalCompanies] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [totalPurchases, setTotalPurchases] = useState(0);
  const [totalTransport, setTotalTransport] = useState(0);
  const [totalCommission, setTotalCommission] = useState(0);
  const [companyBreakdown, setCompanyBreakdown] = useState([]);
  const [activeBreakdownModal, setActiveBreakdownModal] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [compRes, profitRes, purchaseRes] = await Promise.all([
          axios.get(`${API}/api/companies`, { headers: authHeader }),
          axios.get(`${API}/api/reports/invoice-profit`, { headers: authHeader }),
          axios.get(`${API}/api/purchases`, { headers: authHeader }),
        ]);

        setTotalCompanies(compRes.data.length);

        // Sum up total profit, sales, transport, and commission from the profit report
        const reportData = profitRes.data;
        const totalP = reportData.reduce((sum, inv) => sum + (inv.finalProfit || 0), 0);
        const totalS = reportData.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
        const totalT = reportData.reduce((sum, inv) => sum + (inv.transportCharges || 0), 0);
        const totalC = reportData.reduce((sum, inv) => sum + (inv.commissionAmount || 0), 0);

        setTotalProfit(totalP);
        setTotalSales(totalS);
        setTotalTransport(totalT);
        setTotalCommission(totalC);

        // Sum up total purchases
        const purchasesData = purchaseRes.data;
        const totalPurch = purchasesData.reduce((sum, p) => sum + (p.grandTotal || 0), 0);
        setTotalPurchases(totalPurch);

        // Group statistics by company for breakdown
        const compList = compRes.data;
        const breakdown = compList.map((comp) => {
          const compId = comp._id;

          // Filter invoices for this company
          const compInvoices = reportData.filter((inv) => {
            const invCompId = inv.company?._id || inv.company;
            return String(invCompId) === String(compId);
          });

          // Filter purchases for this company
          const compPurchases = purchasesData.filter((p) => {
            const pCompId = p.targetCompany?._id || p.targetCompany;
            return String(pCompId) === String(compId);
          });

          const profit = compInvoices.reduce((sum, inv) => sum + (inv.finalProfit || 0), 0);
          const revenue = compInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
          const transport = compInvoices.reduce((sum, inv) => sum + (inv.transportCharges || 0), 0);
          const commission = compInvoices.reduce((sum, inv) => sum + (inv.commissionAmount || 0), 0);
          const purchases = compPurchases.reduce((sum, p) => sum + (p.grandTotal || 0), 0);

          return {
            companyName: comp.name,
            profit,
            revenue,
            purchases,
            transport,
            commission,
          };
        });

        setCompanyBreakdown(breakdown);
      } catch (err) {
        console.error("Dashboard fetch error", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const isSuperAdmin = userInfo?.role === "Super Admin";

  const getModalConfig = () => {
    switch (activeBreakdownModal) {
      case "profit":
        return {
          title: "Total Profit Contribution",
          field: "profit",
          total: totalProfit,
          color: "#10b981",
        };
      case "revenue":
        return {
          title: "Total Revenue (Sales) Contribution",
          field: "revenue",
          total: totalSales,
          color: "#8b5cf6",
        };
      case "purchases":
        return {
          title: "Total Purchases Contribution",
          field: "purchases",
          total: totalPurchases,
          color: "#f59e0b",
        };
      case "transport":
        return {
          title: "Total Transport Charges Contribution",
          field: "transport",
          total: totalTransport,
          color: "#ec4899",
        };
      case "commission":
        return {
          title: "Total Commission Contribution",
          field: "commission",
          total: totalCommission,
          color: "#14b8a6",
        };
      default:
        return null;
    }
  };

  const modalConfig = getModalConfig();
  const sortedBreakdown = modalConfig
    ? [...companyBreakdown].sort((a, b) => b[modalConfig.field] - a[modalConfig.field])
    : [];

  return (
    <div className="sl-page">
      <div className="sl-header">
        <div>
          <h1 className="sl-title">Dashboard</h1>
          <p className="sl-subtitle">
            {isSuperAdmin ? "Overview across all your registered companies" : "Overview of your company"}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="sl-center" style={{ paddingTop: "50px" }}>
          Loading statistics...
        </div>
      ) : (
        <>
          <div className="sl-stats" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            {isSuperAdmin && (
              <div className="sl-stat">
                <div className="sl-stat-icon" style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6" }}>
                  <Building2 size={24} />
                </div>
                <div>
                  <p>REGISTERED COMPANIES</p>
                  <h3>{totalCompanies}</h3>
                </div>
              </div>
            )}

            <div
              className="sl-stat"
              onClick={() => isSuperAdmin && setActiveBreakdownModal("profit")}
              style={{
                cursor: isSuperAdmin ? "pointer" : "default",
                transition: "transform 0.2s",
                transform: isSuperAdmin ? "scale(1)" : "none",
              }}
              onMouseEnter={(e) => isSuperAdmin && (e.currentTarget.style.transform = "translateY(-4px)")}
              onMouseLeave={(e) => isSuperAdmin && (e.currentTarget.style.transform = "translateY(0)")}
            >
              <div className="sl-stat-icon" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
                <TrendingUp size={24} />
              </div>
              <div>
                <p>{isSuperAdmin ? "TOTAL PROFIT (ALL COMPANIES) ↗" : "TOTAL PROFIT"}</p>
                <h3 style={{ color: "#10b981" }}>₹{totalProfit.toFixed(2)}</h3>
              </div>
            </div>

            <div
              className="sl-stat"
              onClick={() => isSuperAdmin && setActiveBreakdownModal("revenue")}
              style={{ cursor: isSuperAdmin ? "pointer" : "default", transition: "transform 0.2s" }}
              onMouseEnter={(e) => isSuperAdmin && (e.currentTarget.style.transform = "translateY(-4px)")}
              onMouseLeave={(e) => isSuperAdmin && (e.currentTarget.style.transform = "translateY(0)")}
            >
              <div className="sl-stat-icon" style={{ background: "rgba(139,92,246,0.15)", color: "#8b5cf6" }}>
                <DollarSign size={24} />
              </div>
              <div>
                <p>{isSuperAdmin ? "TOTAL REVENUE (SALES) ↗" : "TOTAL REVENUE"}</p>
                <h3>₹{totalSales.toFixed(2)}</h3>
              </div>
            </div>

            <div
              className="sl-stat"
              onClick={() => isSuperAdmin && setActiveBreakdownModal("purchases")}
              style={{ cursor: isSuperAdmin ? "pointer" : "default", transition: "transform 0.2s" }}
              onMouseEnter={(e) => isSuperAdmin && (e.currentTarget.style.transform = "translateY(-4px)")}
              onMouseLeave={(e) => isSuperAdmin && (e.currentTarget.style.transform = "translateY(0)")}
            >
              <div className="sl-stat-icon" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>
                <ShoppingCart size={24} />
              </div>
              <div>
                <p>{isSuperAdmin ? "TOTAL PURCHASES (ALL COMPANIES) ↗" : "TOTAL PURCHASES"}</p>
                <h3>₹{totalPurchases.toFixed(2)}</h3>
              </div>
            </div>

            <div
              className="sl-stat"
              onClick={() => isSuperAdmin && setActiveBreakdownModal("transport")}
              style={{ cursor: isSuperAdmin ? "pointer" : "default", transition: "transform 0.2s" }}
              onMouseEnter={(e) => isSuperAdmin && (e.currentTarget.style.transform = "translateY(-4px)")}
              onMouseLeave={(e) => isSuperAdmin && (e.currentTarget.style.transform = "translateY(0)")}
            >
              <div className="sl-stat-icon" style={{ background: "rgba(236,72,153,0.15)", color: "#ec4899" }}>
                <Truck size={24} />
              </div>
              <div>
                <p>{isSuperAdmin ? "TOTAL TRANSPORT CHARGES (ALL) ↗" : "TOTAL TRANSPORT CHARGES"}</p>
                <h3>₹{totalTransport.toFixed(2)}</h3>
              </div>
            </div>

            <div
              className="sl-stat"
              onClick={() => isSuperAdmin && setActiveBreakdownModal("commission")}
              style={{ cursor: isSuperAdmin ? "pointer" : "default", transition: "transform 0.2s" }}
              onMouseEnter={(e) => isSuperAdmin && (e.currentTarget.style.transform = "translateY(-4px)")}
              onMouseLeave={(e) => isSuperAdmin && (e.currentTarget.style.transform = "translateY(0)")}
            >
              <div className="sl-stat-icon" style={{ background: "rgba(20,184,166,0.15)", color: "#14b8a6" }}>
                <Percent size={24} />
              </div>
              <div>
                <p>{isSuperAdmin ? "TOTAL COMMISSION (ALL) ↗" : "TOTAL COMMISSION"}</p>
                <h3>₹{totalCommission.toFixed(2)}</h3>
              </div>
            </div>
          </div>

          {/* {isSuperAdmin && (
            <div style={{ marginTop: '40px', background: 'rgba(30,41,59,0.7)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 style={{ color: '#F8FAFC', marginBottom: '16px', fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={20} color="#3b82f6" /> Company-Wise Financial Breakdown
              </h3>
              <div className="sl-table-wrap">
                <table className="sl-table">
                  <thead>
                    <tr>
                      <th style={{ color: '#94a3b8' }}>Company Name</th>
                      <th style={{ color: '#94a3b8' }}>Total Profit</th>
                      <th style={{ color: '#94a3b8' }}>Total Revenue</th>
                      <th style={{ color: '#94a3b8' }}>Total Purchases</th>
                      <th style={{ color: '#94a3b8' }}>Total Transport</th>
                      <th style={{ color: '#94a3b8' }}>Total Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyBreakdown.length === 0 ? (
                      <tr><td colSpan={6} className="sl-center">No company data found</td></tr>
                    ) : companyBreakdown.map((row, i) => (
                      <tr key={i}>
                        <td className="sl-customer-name" style={{ color: '#F8FAFC' }}>{row.companyName}</td>
                        <td style={{ color: '#10b981', fontWeight: 600 }}>₹{row.profit.toFixed(2)}</td>
                        <td style={{ color: '#F8FAFC' }}>₹{row.revenue.toFixed(2)}</td>
                        <td style={{ color: '#F8FAFC' }}>₹{row.purchases.toFixed(2)}</td>
                        <td style={{ color: '#F8FAFC' }}>₹{row.transport.toFixed(2)}</td>
                        <td style={{ color: '#F8FAFC' }}>₹{row.commission.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )} */}

          <div
            style={{
              marginTop: "40px",
              background: "rgba(30,41,59,0.5)",
              padding: "30px",
              borderRadius: "16px",
              border: "1px solid rgba(255,255,255,0.05)",
              textAlign: "center",
            }}
          >
            <Activity size={48} style={{ color: "#3b82f6", opacity: 0.5, marginBottom: "16px" }} />
            <h2 style={{ color: "#F8FAFC", marginBottom: "8px" }}>Welcome back, {userInfo?.name}!</h2>
            <p style={{ color: "#94a3b8" }}>
              Use the sidebar to navigate to companies, sales, purchases, and reporting.
            </p>
          </div>
        </>
      )}

      {/* Modal Popup Overlay */}
      {isSuperAdmin && activeBreakdownModal && modalConfig && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(8px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={() => setActiveBreakdownModal(null)}
        >
          <div
            style={{
              background: "#1e293b",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "600px",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "20px 24px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <h3
                style={{
                  color: "#F8FAFC",
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    background: modalConfig.color,
                  }}
                ></span>
                {modalConfig.title}
              </h3>
              <button
                onClick={() => setActiveBreakdownModal(null)}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "none",
                  color: "#94a3b8",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  fontWeight: 300,
                  transition: "background 0.2s",
                }}
              >
                &times;
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  background: "rgba(30,41,59,0.5)",
                  padding: "16px 20px",
                  borderRadius: "12px",
                  marginBottom: "20px",
                  border: "1px solid rgba(255,255,255,0.02)",
                }}
              >
                <span style={{ color: "#94a3b8", fontSize: "0.875rem" }}>TOTAL SUM</span>
                <span style={{ color: "#F8FAFC", fontSize: "1.5rem", fontWeight: 800 }}>
                  ₹{modalConfig.total.toFixed(2)}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {sortedBreakdown.map((item, index) => {
                  const val = item[modalConfig.field];
                  const percentage = modalConfig.total > 0 ? (val / modalConfig.total) * 100 : 0;
                  return (
                    <div
                      key={index}
                      style={{
                        background: "rgba(30,41,59,0.3)",
                        padding: "16px",
                        borderRadius: "12px",
                        border: "1px solid rgba(255,255,255,0.03)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ color: "#F8FAFC", fontWeight: 600 }}>{item.companyName}</span>
                        <span style={{ color: modalConfig.color, fontWeight: 700 }}>₹{val.toFixed(2)}</span>
                      </div>

                      {/* Visual Progress bar */}
                      <div
                        style={{
                          height: "8px",
                          background: "rgba(255,255,255,0.05)",
                          borderRadius: "4px",
                          overflow: "hidden",
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${percentage}%`,
                            background: modalConfig.color,
                            borderRadius: "4px",
                            transition: "width 0.5s ease-out",
                          }}
                        ></div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "6px" }}>
                        <span style={{ color: "#64748b", fontSize: "10px" }}>
                          Contribution: {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
