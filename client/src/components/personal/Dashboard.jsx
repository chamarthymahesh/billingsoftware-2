import { authFetch } from '../../utils/authFetch';
import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  FileText, 
  Shield, 
  HardHat, 
  Users, 
  Car, 
  Home 
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar, 
  Legend 
} from 'recharts';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/api/dashboard/summary')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching dashboard summary:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Loading Dashboard Analytics...</p>
      </div>
    );
  }

  const summary = data?.summary || {
    pendingBillsCount: 0,
    pendingBillsAmount: 0,
    activeInsurancesCount: 0,
    totalLentPrincipal: 0,
    totalBorrowedPrincipal: 0,
    totalDebtsGiven: 0,
    totalDebtsTaken: 0,
    totalConstructionSpent: 0,
    totalMonthlyRentExpectation: 0,
    currentMonthRentReceived: 0
  };

  const feed = data?.recentFeed || [];

  // Calculate Net Position
  const totalReceivables = summary.totalLentPrincipal + summary.totalDebtsGiven + (summary.totalMonthlyRentExpectation - summary.currentMonthRentReceived);
  const totalPayables = summary.totalBorrowedPrincipal + summary.totalDebtsTaken + summary.pendingBillsAmount;
  const netWealth = totalReceivables - totalPayables;

  // Format currency
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Mock data for Cashflow Chart (Vibrant colors)
  const chartData = [
    { name: 'Jan', Rental: summary.totalMonthlyRentExpectation * 0.9, Expenses: summary.pendingBillsAmount * 1.2, Construction: summary.totalConstructionSpent * 0.1 },
    { name: 'Feb', Rental: summary.totalMonthlyRentExpectation * 0.95, Expenses: summary.pendingBillsAmount * 0.8, Construction: summary.totalConstructionSpent * 0.15 },
    { name: 'Mar', Rental: summary.totalMonthlyRentExpectation * 1.1, Expenses: summary.pendingBillsAmount * 1.1, Construction: summary.totalConstructionSpent * 0.2 },
    { name: 'Apr', Rental: summary.totalMonthlyRentExpectation, Expenses: summary.pendingBillsAmount * 0.9, Construction: summary.totalConstructionSpent * 0.25 },
    { name: 'May', Rental: summary.totalMonthlyRentExpectation, Expenses: summary.pendingBillsAmount, Construction: summary.totalConstructionSpent * 0.3 }
  ];

  // Loans lent vs borrowed comparison
  const loanComparisonData = [
    {
      name: 'Interest Loans',
      Lent: summary.totalLentPrincipal,
      Borrowed: summary.totalBorrowedPrincipal
    },
    {
      name: 'Family & Friends',
      Lent: summary.totalDebtsGiven,
      Borrowed: summary.totalDebtsTaken
    }
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-title-section">
          <h1>Overview Dashboard</h1>
          <p>Real-time tracking of your personal net worth, expenditures, and income.</p>
        </div>
        <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp style={{ color: 'var(--color-success)' }} />
          <span>Financial Index Updated</span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="metrics-grid animate-slide-up stagger-1">
        <div className="glass-card metric-card">
          <div className="metric-header">
            <span className="metric-title">Estimated Net Position</span>
            <div className="metric-icon-wrapper" style={{ background: 'var(--color-primary-glow)', color: 'var(--color-primary)' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div>
            <h2 className="metric-value">{formatCurrency(netWealth)}</h2>
            <p className="metric-desc" style={{ color: netWealth >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
              {netWealth >= 0 ? 'Surplus' : 'Deficit'} (Receivables vs Payables)
            </p>
          </div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-header">
            <span className="metric-title">Pending Utility Bills</span>
            <div className="metric-icon-wrapper" style={{ background: 'var(--color-danger-glow)', color: 'var(--color-danger)' }}>
              <FileText size={20} />
            </div>
          </div>
          <div>
            <h2 className="metric-value" style={{ color: 'var(--color-danger)' }}>{formatCurrency(summary.pendingBillsAmount)}</h2>
            <p className="metric-desc">{summary.pendingBillsCount} unpaid bills pending payment</p>
          </div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-header">
            <span className="metric-title">Interest Lending (Active)</span>
            <div className="metric-icon-wrapper" style={{ background: 'var(--color-success-glow)', color: 'var(--color-success)' }}>
              <ArrowUpRight size={20} />
            </div>
          </div>
          <div>
            <h2 className="metric-value" style={{ color: 'var(--color-success)' }}>{formatCurrency(summary.totalLentPrincipal)}</h2>
            <p className="metric-desc">Principal lent generating monthly interest</p>
          </div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-header">
            <span className="metric-title">Rental Collection (Current Month)</span>
            <div className="metric-icon-wrapper" style={{ background: 'var(--color-info-glow)', color: 'var(--color-info)' }}>
              <Home size={20} />
            </div>
          </div>
          <div>
            <h2 className="metric-value" style={{ color: 'var(--color-info)' }}>{formatCurrency(summary.currentMonthRentReceived)}</h2>
            <p className="metric-desc">Out of {formatCurrency(summary.totalMonthlyRentExpectation)} expected rent</p>
          </div>
        </div>
      </div>

      {/* Main Graphs Grid */}
      <div className="dashboard-grid animate-slide-up stagger-2">
        <div className="glass-card" style={{ minHeight: '380px' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={20} style={{ color: 'var(--color-primary)' }} />
            Monthly Cashflow Overview
          </h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-info)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--color-info)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-danger)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--color-danger)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'white' }}
                />
                <Legend />
                <Area type="monotone" dataKey="Rental" name="Rental Income" stroke="var(--color-info)" fillOpacity={1} fill="url(#colorRent)" />
                <Area type="monotone" dataKey="Expenses" name="Utility Bills" stroke="var(--color-danger)" fillOpacity={1} fill="url(#colorExpenses)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card" style={{ minHeight: '380px' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={20} style={{ color: 'var(--color-accent)' }} />
            Loans & Debts Analysis
          </h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={loanComparisonData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'white' }}
                />
                <Legend />
                <Bar dataKey="Lent" name="Lent / Given" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Borrowed" name="Borrowed / Taken" fill="var(--color-danger)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Transactions & Asset Summary */}
      <div className="dashboard-grid animate-slide-up stagger-3" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        {/* Recent Transactions */}
        <div className="glass-card" style={{ maxHeight: '420px', overflowY: 'auto' }}>
          <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Recent Activity Log
          </h3>
          {feed.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>No recent activities found. Add transactions to see them here.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {feed.map((item, idx) => (
                <div key={idx} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  paddingBottom: '0.75rem', 
                  borderBottom: '1px solid var(--border-color)' 
                }}>
                  <div>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      padding: '0.15rem 0.4rem', 
                      borderRadius: '4px', 
                      background: 'rgba(255,255,255,0.06)', 
                      color: 'var(--text-secondary)',
                      textTransform: 'uppercase',
                      fontWeight: 600
                    }}>
                      {item.type}
                    </span>
                    <p style={{ fontWeight: 500, fontSize: '0.95rem', marginTop: '0.25rem' }}>{item.title}</p>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(item.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                    </span>
                  </div>
                  <span style={{ 
                    fontWeight: 700, 
                    color: item.amount >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
                  }}>
                    {item.amount >= 0 ? '+' : ''}{formatCurrency(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Insights Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card">
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <HardHat size={18} style={{ color: 'var(--color-warning)' }} />
              Construction Progress
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              Total Cumulative Spent:
            </p>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-warning)' }}>
              {formatCurrency(summary.totalConstructionSpent)}
            </h2>
          </div>

          <div className="glass-card">
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={18} style={{ color: 'var(--color-accent)' }} />
              Insurance Check
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              Active Insurance Policies:
            </p>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-accent)' }}>
              {summary.activeInsurancesCount} Active
            </h2>
          </div>
        </div>
      </div>
    </div>
  );
}
