import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Building2, TrendingUp, DollarSign, Activity, ShoppingCart, Truck, Percent } from 'lucide-react';
import './Sales.css'; 

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Dashboard = () => {
  const navigate = useNavigate();
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  const authHeader = { Authorization: `Bearer ${userInfo?.token}` };

  const [totalCompanies, setTotalCompanies] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [totalPurchases, setTotalPurchases] = useState(0);
  const [totalTransport, setTotalTransport] = useState(0);
  const [totalCommission, setTotalCommission] = useState(0);
  const [companyBreakdown, setCompanyBreakdown] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [compRes, profitRes, purchaseRes] = await Promise.all([
          axios.get(`${API}/api/companies`, { headers: authHeader }),
          axios.get(`${API}/api/reports/invoice-profit`, { headers: authHeader }),
          axios.get(`${API}/api/purchases`, { headers: authHeader })
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
        const breakdown = compList.map(comp => {
          const compId = comp._id;
          
          // Filter invoices for this company
          const compInvoices = reportData.filter(inv => {
            const invCompId = inv.company?._id || inv.company;
            return String(invCompId) === String(compId);
          });
          
          // Filter purchases for this company
          const compPurchases = purchasesData.filter(p => {
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
            commission
          };
        });

        setCompanyBreakdown(breakdown);

      } catch (err) {
        console.error('Dashboard fetch error', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const isSuperAdmin = userInfo?.role === 'Super Admin';

  return (
    <div className="sl-page">
      <div className="sl-header">
        <div>
          <h1 className="sl-title">Dashboard</h1>
          <p className="sl-subtitle">{isSuperAdmin ? 'Overview across all your registered companies' : 'Overview of your company'}</p>
        </div>
      </div>

      {loading ? (
        <div className="sl-center" style={{ paddingTop: '50px' }}>Loading statistics...</div>
      ) : (
        <>
          <div className="sl-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            {isSuperAdmin && (
              <div className="sl-stat">
                <div className="sl-stat-icon" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>
                  <Building2 size={24} />
                </div>
                <div>
                  <p>REGISTERED COMPANIES</p>
                  <h3>{totalCompanies}</h3>
                </div>
              </div>
            )}

            <div className="sl-stat">
              <div className="sl-stat-icon" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                <TrendingUp size={24} />
              </div>
              <div>
                <p>{isSuperAdmin ? 'TOTAL PROFIT (ALL COMPANIES)' : 'TOTAL PROFIT'}</p>
                <h3 style={{ color: '#10b981' }}>₹{totalProfit.toFixed(2)}</h3>
              </div>
            </div>

            <div className="sl-stat">
              <div className="sl-stat-icon" style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}>
                <DollarSign size={24} />
              </div>
              <div>
                <p>{isSuperAdmin ? 'TOTAL REVENUE (SALES)' : 'TOTAL REVENUE'}</p>
                <h3>₹{totalSales.toFixed(2)}</h3>
              </div>
            </div>

            <div className="sl-stat">
              <div className="sl-stat-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                <ShoppingCart size={24} />
              </div>
              <div>
                <p>{isSuperAdmin ? 'TOTAL PURCHASES (ALL COMPANIES)' : 'TOTAL PURCHASES'}</p>
                <h3>₹{totalPurchases.toFixed(2)}</h3>
              </div>
            </div>

            <div className="sl-stat">
              <div className="sl-stat-icon" style={{ background: 'rgba(236,72,153,0.15)', color: '#ec4899' }}>
                <Truck size={24} />
              </div>
              <div>
                <p>{isSuperAdmin ? 'TOTAL TRANSPORT CHARGES (ALL COMPANIES)' : 'TOTAL TRANSPORT CHARGES'}</p>
                <h3>₹{totalTransport.toFixed(2)}</h3>
              </div>
            </div>

            <div className="sl-stat">
              <div className="sl-stat-icon" style={{ background: 'rgba(20,184,166,0.15)', color: '#14b8a6' }}>
                <Percent size={24} />
              </div>
              <div>
                <p>{isSuperAdmin ? 'TOTAL COMMISSION (ALL COMPANIES)' : 'TOTAL COMMISSION'}</p>
                <h3>₹{totalCommission.toFixed(2)}</h3>
              </div>
            </div>
          </div>

          {isSuperAdmin && (
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
          )}

          <div style={{ marginTop: '40px', background: 'rgba(30,41,59,0.5)', padding: '30px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
             <Activity size={48} style={{ color: '#3b82f6', opacity: 0.5, marginBottom: '16px' }} />
             <h2 style={{ color: '#F8FAFC', marginBottom: '8px' }}>Welcome back, {userInfo?.name}!</h2>
             <p style={{ color: '#94a3b8' }}>Use the sidebar to navigate to companies, sales, purchases, and reporting.</p>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
