import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Wallet, CreditCard, CheckCircle } from 'lucide-react';
import RecentActivity from './RecentActivity.jsx';

// Sample data for summary cards
const summaryData = [
  { title: 'Total Bills', value: '₹ 12,340', color: 'var(--color-primary)', bg: 'var(--color-primary-glow)', icon: Wallet },
  { title: 'Pending Payments', value: '₹ 3,210', color: 'var(--color-danger)', bg: 'var(--color-danger-glow)', icon: CreditCard },
  { title: 'Paid Bills', value: '₹ 9,130', color: 'var(--color-success)', bg: 'var(--color-success-glow)', icon: CheckCircle },
];

// Sample chart data
const chartData = [
  { name: 'Jan', bills: 1200 },
  { name: 'Feb', bills: 1100 },
  { name: 'Mar', bills: 1400 },
  { name: 'Apr', bills: 900 },
  { name: 'May', bills: 1300 },
  { name: 'Jun', bills: 1500 },
];

export default function Landing() {
  return (
    <div className="hero-section">
      <div style={{ textAlign: 'center', marginBottom: '3rem', marginTop: '1rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', background: 'linear-gradient(135deg, #fff, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800 }}>Welcome to Mahesh Finance</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Track your utilities, loans, and assets with a sleek glass‑morphic UI.</p>
      </div>

      <div className="metrics-grid">
        {summaryData.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="glass-card metric-card" style={{ animationDelay: `${index * 0.1}s`, borderTop: `4px solid ${item.color}` }}>
              <div className="metric-header">
                <span className="metric-title">{item.title}</span>
                <div className="metric-icon-wrapper" style={{ background: item.bg, color: item.color }}>
                  <Icon size={20} />
                </div>
              </div>
              <div>
                <h2 className="metric-value" style={{ color: item.color }}>{item.value}</h2>
                <p className="metric-desc">Overall recorded in system</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="chart-container glass-card" style={{ marginTop: '2rem', padding: '1.5rem', borderLeft: '4px solid var(--color-primary)' }}>
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white' }}>
          <Wallet size={20} style={{ color: 'var(--color-primary)' }} />
          Bills Overview
        </h2>
        <div style={{ width: '100%', height: '320px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBills" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} />
              <YAxis stroke="var(--text-secondary)" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'white', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="bills" stroke="var(--color-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorBills)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ marginTop: '2.5rem' }}>
        <RecentActivity />
      </div>
    </div>
  );
}
