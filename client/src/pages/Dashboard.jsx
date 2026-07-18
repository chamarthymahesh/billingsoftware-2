import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Building2, TrendingUp, DollarSign, Activity, ShoppingCart, Truck, Percent } from 'lucide-react';
import './Sales.css'; 

const API = 'http://localhost:5000';

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

      } catch (err) {
        console.error('Dashboard fetch error', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="sl-page">
      <div className="sl-header">
        <div>
          <h1 className="sl-title">Dashboard</h1>
          <p className="sl-subtitle">Overview across all your registered companies</p>
        </div>
      </div>

      {loading ? (
        <div className="sl-center" style={{ paddingTop: '50px' }}>Loading statistics...</div>
      ) : (
        <>
          <div className="sl-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <div className="sl-stat">
              <div className="sl-stat-icon" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>
                <Building2 size={24} />
              </div>
              <div>
                <p>REGISTERED COMPANIES</p>
                <h3>{totalCompanies}</h3>
              </div>
            </div>

            <div className="sl-stat">
              <div className="sl-stat-icon" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                <TrendingUp size={24} />
              </div>
              <div>
                <p>TOTAL PROFIT (ALL COMPANIES)</p>
                <h3 style={{ color: '#10b981' }}>₹{totalProfit.toFixed(2)}</h3>
              </div>
            </div>

            <div className="sl-stat">
              <div className="sl-stat-icon" style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}>
                <DollarSign size={24} />
              </div>
              <div>
                <p>TOTAL REVENUE (SALES)</p>
                <h3>₹{totalSales.toFixed(2)}</h3>
              </div>
            </div>

            <div className="sl-stat">
              <div className="sl-stat-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                <ShoppingCart size={24} />
              </div>
              <div>
                <p>TOTAL PURCHASES</p>
                <h3>₹{totalPurchases.toFixed(2)}</h3>
              </div>
            </div>

            <div className="sl-stat">
              <div className="sl-stat-icon" style={{ background: 'rgba(236,72,153,0.15)', color: '#ec4899' }}>
                <Truck size={24} />
              </div>
              <div>
                <p>TOTAL TRANSPORT CHARGES</p>
                <h3>₹{totalTransport.toFixed(2)}</h3>
              </div>
            </div>

            <div className="sl-stat">
              <div className="sl-stat-icon" style={{ background: 'rgba(20,184,166,0.15)', color: '#14b8a6' }}>
                <Percent size={24} />
              </div>
              <div>
                <p>TOTAL COMMISSION</p>
                <h3>₹{totalCommission.toFixed(2)}</h3>
              </div>
            </div>
          </div>

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
