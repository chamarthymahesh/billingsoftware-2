import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Building2, TrendingUp, DollarSign, Activity, ShoppingCart, Truck, Percent, Search, X } from "lucide-react";
import "./Sales.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const Dashboard = () => {
  console.log("page loaded");
  const navigate = useNavigate();
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));
  const authHeader = { Authorization: `Bearer ${userInfo?.token}` };

  const [totalCompanies, setTotalCompanies] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [totalPurchases, setTotalPurchases] = useState(0);
  const [totalTransport, setTotalTransport] = useState(0);
  const [totalCommission, setTotalCommission] = useState(0);
  const [totalPaidCommission, setTotalPaidCommission] = useState(0);
  const [companyBreakdown, setCompanyBreakdown] = useState([]);
  const [activeBreakdownModal, setActiveBreakdownModal] = useState(null);
  const [loading, setLoading] = useState(false);

  // New state variables for company customer/vendor breakdown
  const [allInvoices, setAllInvoices] = useState([]);
  const [allPurchases, setAllPurchases] = useState([]);
  const [selectedCompanyForBreakdown, setSelectedCompanyForBreakdown] = useState(null);
  const [breakdownTab, setBreakdownTab] = useState("customers");
  const [modalSearch, setModalSearch] = useState("");

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
        setAllInvoices(profitRes.data);
        setAllPurchases(purchaseRes.data);

        // Sum up total profit, sales, transport, and commission from the profit report
        const reportData = profitRes.data;
        const totalP = reportData.reduce((sum, inv) => sum + (inv.finalProfit || 0), 0);
        const totalS = reportData.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
        const totalT = reportData.reduce((sum, inv) => sum + (inv.transportCharges || 0), 0);
        const totalC = reportData.reduce((sum, inv) => sum + (inv.commissionAmount || 0), 0);
        const totalPaidC = reportData
          .filter((inv) => inv.commissionStatus === "Paid")
          .reduce((sum, inv) => sum + (inv.commissionAmount || 0), 0);

        setTotalProfit(totalP);
        setTotalSales(totalS);
        setTotalTransport(totalT);
        setTotalCommission(totalC);
        setTotalPaidCommission(totalPaidC);

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
          const paidCommission = compInvoices
            .filter((inv) => inv.commissionStatus === "Paid")
            .reduce((sum, inv) => sum + (inv.commissionAmount || 0), 0);
          const purchases = compPurchases.reduce((sum, p) => sum + (p.grandTotal || 0), 0);

          return {
            companyId: compId,
            companyName: comp.name,
            profit,
            revenue,
            purchases,
            transport,
            commission,
            paidCommission,
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

  const userCompanyRow = !isSuperAdmin
    ? companyBreakdown.find((c) => String(c.companyId) === String(userInfo?.companyId)) || companyBreakdown[0]
    : null;

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
                <h3 style={{ fontSize: "1.4rem" }}>₹{totalCommission.toFixed(2)}</h3>
                <div style={{ display: "flex", gap: "8px", fontSize: "0.8rem", color: "#94a3b8", marginTop: "4px" }}>
                  <span style={{ color: "#10b981" }}>Paid: ₹{totalPaidCommission.toFixed(2)}</span>
                  <span>|</span>
                  <span style={{ color: "#ef4444" }}>
                    Pending: ₹{(totalCommission - totalPaidCommission).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {isSuperAdmin && (
            <div
              style={{
                marginTop: "40px",
                background: "rgba(30,41,59,0.7)",
                padding: "24px",
                borderRadius: "16px",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <h3
                style={{
                  color: "#F8FAFC",
                  marginBottom: "16px",
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Building2 size={20} color="#3b82f6" /> Company-Wise Financial Breakdown
              </h3>
              <div className="sl-table-wrap">
                <table className="sl-table">
                  <thead>
                    <tr>
                      <th style={{ color: "#94a3b8" }}>Company Name</th>
                      <th style={{ color: "#94a3b8" }}>Total Profit</th>
                      <th style={{ color: "#94a3b8" }}>Total Revenue</th>
                      <th style={{ color: "#94a3b8" }}>Total Purchases</th>
                      <th style={{ color: "#94a3b8" }}>Total Transport</th>
                      <th style={{ color: "#94a3b8" }}>Total Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="sl-center">
                          No company data found
                        </td>
                      </tr>
                    ) : (
                      companyBreakdown.map((row, i) => (
                        <tr
                          key={i}
                          onClick={() => {
                            setSelectedCompanyForBreakdown(row);
                            setBreakdownTab("customers");
                            setModalSearch("");
                          }}
                          style={{ cursor: "pointer" }}
                          title="Click to view Customer & Vendor Breakdown"
                        >
                          <td className="sl-customer-name" style={{ color: "#F8FAFC" }}>
                            {row.companyName}
                          </td>
                          <td style={{ color: "#10b981", fontWeight: 600 }}>₹{row.profit.toFixed(2)}</td>
                          <td style={{ color: "#F8FAFC" }}>₹{row.revenue.toFixed(2)}</td>
                          <td style={{ color: "#F8FAFC" }}>₹{row.purchases.toFixed(2)}</td>
                          <td style={{ color: "#F8FAFC" }}>₹{row.transport.toFixed(2)}</td>
                          <td style={{ color: "#F8FAFC" }}>₹{row.commission.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div
            style={{
              marginTop: "40px",
              background: "rgba(30,41,59,0.5)",
              padding: "30px",
              borderRadius: "16px",
              border: "1px solid rgba(255,255,255,0.05)",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Activity size={48} style={{ color: "#3b82f6", opacity: 0.5, marginBottom: "16px" }} />
            <h2 style={{ color: "#F8FAFC", marginBottom: "8px" }}>Welcome back, {userInfo?.name}!</h2>
            <p style={{ color: "#94a3b8" }}>
              Use the sidebar to navigate to companies, sales, purchases, and reporting.
            </p>
            {userCompanyRow && (
              <button
                className="sl-new-btn"
                style={{ marginTop: "20px" }}
                onClick={() => {
                  setSelectedCompanyForBreakdown(userCompanyRow);
                  setBreakdownTab("customers");
                  setModalSearch("");
                }}
              >
                View Customer & Vendor Breakdown
              </button>
            )}
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
                      {activeBreakdownModal === "commission" && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "0.8rem",
                            color: "#94a3b8",
                            marginTop: "-4px",
                            marginBottom: "8px",
                          }}
                        >
                          <span style={{ color: "#10b981" }}>Paid: ₹{(item.paidCommission || 0).toFixed(2)}</span>
                          <span style={{ color: "#ef4444" }}>
                            Pending: ₹{(val - (item.paidCommission || 0)).toFixed(2)}
                          </span>
                        </div>
                      )}

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

      {/* Detailed Company Customer/Vendor Breakdown Modal */}
      {selectedCompanyForBreakdown &&
        (() => {
          // Filter invoices for this company
          const compInvoicesForModal = allInvoices.filter((inv) => {
            const invCompId = inv.company?._id || inv.company;
            return String(invCompId) === String(selectedCompanyForBreakdown.companyId);
          });

          // Filter purchases for this company
          const compPurchasesForModal = allPurchases.filter((p) => {
            const pCompId = p.targetCompany?._id || p.targetCompany;
            return String(pCompId) === String(selectedCompanyForBreakdown.companyId);
          });

          // Calculate Customer Stats
          const customerStatsMap = {};
          compInvoicesForModal.forEach((inv) => {
            const name = inv.customerName || "Unknown Customer";
            if (!customerStatsMap[name]) {
              customerStatsMap[name] = {
                name,
                revenue: 0,
                profit: 0,
                invoiceCount: 0,
              };
            }
            customerStatsMap[name].revenue += inv.grandTotal || 0;
            customerStatsMap[name].profit += inv.finalProfit || 0;
            customerStatsMap[name].invoiceCount += 1;
          });

          // Calculate Vendor Stats
          const vendorStatsMap = {};
          compPurchasesForModal.forEach((p) => {
            const name = p.supplierName || "Unknown Supplier";
            if (!vendorStatsMap[name]) {
              vendorStatsMap[name] = {
                name,
                purchases: 0,
                billCount: 0,
              };
            }
            vendorStatsMap[name].purchases += p.grandTotal || 0;
            vendorStatsMap[name].billCount += 1;
          });

          const customerStatsList = Object.values(customerStatsMap)
            .filter((c) => c.name.toLowerCase().includes(modalSearch.toLowerCase()))
            .sort((a, b) => b.profit - a.profit);

          const vendorStatsList = Object.values(vendorStatsMap)
            .filter((v) => v.name.toLowerCase().includes(modalSearch.toLowerCase()))
            .sort((a, b) => b.purchases - a.purchases);

          return (
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
              onClick={() => setSelectedCompanyForBreakdown(null)}
            >
              <div
                style={{
                  background: "#1e293b",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "16px",
                  width: "100%",
                  maxWidth: "800px",
                  maxHeight: "85vh",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "20px 24px",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div>
                    <h3
                      style={{
                        color: "#F8FAFC",
                        fontSize: "1.3rem",
                        fontWeight: 700,
                        margin: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <Building2 size={22} color="#3b82f6" /> {selectedCompanyForBreakdown.companyName}
                    </h3>
                    <p style={{ margin: "4px 0 0 0", color: "#94a3b8", fontSize: "0.85rem" }}>
                      Detailed Customer & Vendor/Supplier Breakdown
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedCompanyForBreakdown(null)}
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
                      transition: "background 0.2s",
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Tabs and Search Bar */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "16px 24px",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    gap: "16px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => {
                        setBreakdownTab("customers");
                        setModalSearch("");
                      }}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "8px",
                        border: "none",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontSize: "0.9rem",
                        background: breakdownTab === "customers" ? "#3b82f6" : "rgba(255,255,255,0.05)",
                        color: breakdownTab === "customers" ? "white" : "#94a3b8",
                        transition: "all 0.2s",
                      }}
                    >
                      Customers ({Object.keys(customerStatsMap).length})
                    </button>
                    <button
                      onClick={() => {
                        setBreakdownTab("vendors");
                        setModalSearch("");
                      }}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "8px",
                        border: "none",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontSize: "0.9rem",
                        background: breakdownTab === "vendors" ? "#f59e0b" : "rgba(255,255,255,0.05)",
                        color: breakdownTab === "vendors" ? "white" : "#94a3b8",
                        transition: "all 0.2s",
                      }}
                    >
                      Vendors / Suppliers ({Object.keys(vendorStatsMap).length})
                    </button>
                  </div>

                  <div style={{ position: "relative", minWidth: "220px" }}>
                    <Search
                      size={16}
                      style={{
                        position: "absolute",
                        left: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#64748b",
                      }}
                    />
                    <input
                      type="text"
                      placeholder={`Search ${breakdownTab === "customers" ? "customers" : "vendors"}...`}
                      value={modalSearch}
                      onChange={(e) => setModalSearch(e.target.value)}
                      style={{
                        width: "100%",
                        background: "rgba(15, 23, 42, 0.4)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "8px",
                        padding: "8px 12px 8px 36px",
                        color: "white",
                        fontSize: "0.9rem",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                {/* Modal Body */}
                <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
                  {breakdownTab === "customers" ? (
                    <div className="sl-table-wrap">
                      <table className="sl-table">
                        <thead>
                          <tr>
                            <th>Customer Name</th>
                            <th>Total Sales (Revenue)</th>
                            <th>Total Profit</th>
                            <th>Profit Margin</th>
                            <th>Invoices</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customerStatsList.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="sl-center">
                                No customer statistics found
                              </td>
                            </tr>
                          ) : (
                            customerStatsList.map((c, idx) => {
                              const margin = c.revenue > 0 ? (c.profit / c.revenue) * 100 : 0;
                              return (
                                <tr key={idx}>
                                  <td style={{ fontWeight: 600, color: "#F8FAFC" }}>{c.name}</td>
                                  <td>₹{c.revenue.toFixed(2)}</td>
                                  <td style={{ color: c.profit >= 0 ? "#10b981" : "#ef4444", fontWeight: 600 }}>
                                    ₹{c.profit.toFixed(2)}
                                  </td>
                                  <td style={{ color: margin >= 0 ? "#3b82f6" : "#ef4444" }}>{margin.toFixed(1)}%</td>
                                  <td>{c.invoiceCount}</td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="sl-table-wrap">
                      <table className="sl-table">
                        <thead>
                          <tr>
                            <th>Vendor / Supplier Name</th>
                            <th>Total Purchases</th>
                            <th>Purchase Bills</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vendorStatsList.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="sl-center">
                                No vendor statistics found
                              </td>
                            </tr>
                          ) : (
                            vendorStatsList.map((v, idx) => (
                              <tr key={idx}>
                                <td style={{ fontWeight: 600, color: "#F8FAFC" }}>{v.name}</td>
                                <td style={{ color: "#f59e0b", fontWeight: 600 }}>₹{v.purchases.toFixed(2)}</td>
                                <td>{v.billCount}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
};

export default Dashboard;
