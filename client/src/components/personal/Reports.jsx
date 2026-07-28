import { authFetch } from '../../utils/authFetch';
import React, { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid
} from 'recharts';
import {
  Zap, Droplets, Globe, Phone, Flame, FileText,
  TrendingUp, TrendingDown, IndianRupee, BarChart2,
  Filter, Calendar, Layers, Activity, Shield, Hammer, Car as CarIcon, Home, Percent, Users, Send
} from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const TYPE_CONFIG = {
  // Utilities
  electricity: { label: 'Electricity', color: '#f59e0b', icon: Zap },
  water:       { label: 'Water',       color: '#3b82f6', icon: Droplets },
  internet:    { label: 'Internet',    color: '#06b6d4', icon: Globe },
  phone:       { label: 'Phone',       color: '#8b5cf6', icon: Phone },
  gas:         { label: 'Gas',         color: '#f43f5e', icon: Flame },
  // Insurance
  term:        { label: 'Term Life',   color: '#8b5cf6', icon: Shield },
  health:      { label: 'Health',      color: '#ef4444', icon: Shield },
  car_ins:     { label: 'Car Ins.',    color: '#10b981', icon: Shield },
  life:        { label: 'Life',        color: '#6366f1', icon: Shield },
  property:    { label: 'Property',    color: '#f97316', icon: Shield },
  // Projects
  project:     { label: 'Project',     color: '#ec4899', icon: Hammer },
  // Cars
  maintenance: { label: 'Maintenance', color: '#14b8a6', icon: CarIcon },
  // Rentals
  rent:        { label: 'Rent',        color: '#84cc16', icon: Home },
  // Loans & Debts
  loan:        { label: 'Loan',        color: '#f43f5e', icon: Percent },
  debt:        { label: 'Debt',        color: '#f59e0b', icon: Users },
  // Transfers
  transfer:    { label: 'Transfer',    color: '#06b6d4', icon: Send },
  other:       { label: 'Other',       color: '#94A3B8', icon: FileText },
};

const CATEGORY_CONFIG = {
  'Utilities': { color: '#3b82f6' },
  'Insurance': { color: '#8b5cf6' },
  'Construction': { color: '#ec4899' },
  'Car Logs': { color: '#14b8a6' },
  'Rental Income': { color: '#10B981' }, // Income
  'Interest Loans': { color: '#f43f5e' },
  'Personal Debts': { color: '#f59e0b' },
  'Money Transfers': { color: '#06b6d4' }
};

const fmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(13, 18, 31, 0.95)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12, padding: '12px 16px',
      backdropFilter: 'blur(16px)',
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
    }}>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 8, fontSize: '0.85rem', fontWeight: 600 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill, fontWeight: 700, margin: '4px 0', fontSize: '0.95rem' }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, sub, color, trend }) => (
  <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{
        background: `linear-gradient(135deg, ${color}22, ${color}11)`, padding: '8px', borderRadius: 10,
        display: 'flex', alignItems: 'center', border: `1px solid ${color}33`
      }}>
        <Icon size={18} style={{ color }} />
      </span>
    </div>
    <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.5rem 0 0.25rem 0' }}>{value}</h2>
    {sub && (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 500, color: trend < 0 ? 'var(--color-success)' : trend > 0 ? 'var(--color-danger)' : 'var(--text-muted)' }}>
        {trend < 0 ? <TrendingDown size={14} /> : trend > 0 ? <TrendingUp size={14} /> : null}
        <span>{sub}</span>
      </div>
    )}
  </div>
);

export default function Reports() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedCategory, setSelectedCategory] = useState('All Outflows');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedConn, setSelectedConn] = useState('all');

  useEffect(() => {
    Promise.all([
      authFetch('/api/bills').then(r => r.ok ? r.json() : []),
      authFetch('/api/insurances').then(r => r.ok ? r.json() : []),
      authFetch('/api/construction').then(r => r.ok ? r.json() : []),
      authFetch('/api/cars').then(r => r.ok ? r.json() : []),
      authFetch('/api/rentals').then(r => r.ok ? r.json() : []),
      authFetch('/api/loans').then(r => r.ok ? r.json() : []),
      authFetch('/api/debts').then(r => r.ok ? r.json() : []),
      authFetch('/api/transfers').then(r => r.ok ? r.json() : [])
    ])
    .then(([bills, insurances, projects, cars, rentals, loans, debts, transfers]) => {
      let normalized = [];

      // 1. Utilities (Outflow)
      (Array.isArray(bills) ? bills : []).forEach(b => {
        normalized.push({
          _id: b._id, category: 'Utilities', type: b.type, name: b.name, flow: 'outflow', status: b.status,
          payments: (b.payments || []).map(p => ({ amount: p.amount, month: p.month, year: p.year }))
        });
      });

      // 2. Insurances (Outflow)
      (Array.isArray(insurances) ? insurances : []).forEach(i => {
        normalized.push({
          _id: i._id, category: 'Insurance', type: i.type, name: i.policyName, flow: 'outflow', status: i.status,
          payments: (i.payments || []).map(p => ({ amount: p.amount, month: p.month, year: p.year }))
        });
      });

      // 3. Construction (Outflow)
      (Array.isArray(projects) ? projects : []).forEach(p => {
        normalized.push({
          _id: p._id, category: 'Construction', type: 'project', name: p.projectName, flow: 'outflow', status: p.status,
          payments: (p.expenses || []).map(e => {
            const d = new Date(e.date);
            return { amount: e.amount, month: d.getMonth() + 1, year: d.getFullYear() };
          })
        });
      });

      // 4. Cars (Outflow)
      (Array.isArray(cars) ? cars : []).forEach(c => {
        normalized.push({
          _id: c._id, category: 'Car Logs', type: 'maintenance', name: c.name, flow: 'outflow', status: 'active',
          payments: (c.maintenanceLog || []).map(m => {
            const d = new Date(m.date);
            return { amount: m.cost, month: d.getMonth() + 1, year: d.getFullYear() };
          })
        });
      });

      // 5. Rental Income (INFLOW)
      (Array.isArray(rentals) ? rentals : []).forEach(r => {
        normalized.push({
          _id: r._id, category: 'Rental Income', type: 'rent', name: r.tenantName || r.unitNumber, flow: 'inflow', status: r.status,
          payments: (r.payments || []).map(p => ({ amount: p.amountPaid, month: p.month, year: p.year }))
        });
      });

      // 6. Interest Loans (Outflow / Payments)
      (Array.isArray(loans) ? loans : []).forEach(l => {
        normalized.push({
          _id: l._id, category: 'Interest Loans', type: 'loan', name: l.personName, flow: 'outflow', status: l.status,
          payments: (l.payments || []).map(p => ({ amount: p.amount, month: p.month, year: p.year }))
        });
      });

      // 7. Personal Debts (Outflow - Treat initial amount and repayments as events)
      (Array.isArray(debts) ? debts : []).forEach(d => {
        const pmtList = [];
        // The principal amount is an outflow if 'given', inflow if 'taken', but let's just track repayments for simplicity or the main amount.
        // For unified reports, we will track the main principal amount as the event date
        const dt = new Date(d.dateOccurred);
        pmtList.push({ amount: d.amount, month: dt.getMonth() + 1, year: dt.getFullYear() });
        
        normalized.push({
          _id: d._id, category: 'Personal Debts', type: 'debt', name: `${d.personName} (${d.type})`, flow: d.type === 'given' ? 'outflow' : 'inflow', status: d.status,
          payments: pmtList
        });
      });

      // 8. Money Transfers (Outflow)
      // Group transfers by "On Behalf Of" as the record name
      (Array.isArray(transfers) ? transfers : []).forEach(t => {
        const dt = new Date(t.date);
        normalized.push({
          _id: t._id, category: 'Money Transfers', type: 'transfer', name: `To: ${t.sentToPerson} (For: ${t.onBehalfOf})`, flow: 'outflow', status: 'active',
          payments: [{ amount: t.amount, month: dt.getMonth() + 1, year: dt.getFullYear() }]
        });
      });

      setData(normalized);
      setLoading(false);
    })
    .catch(err => {
      console.error('Error fetching reports data:', err);
      setLoading(false);
    });
  }, []);

  // --- Filter Logic ---
  const filteredByCategory = useMemo(() => {
    if (selectedCategory === 'All Outflows') return data.filter(d => d.flow === 'outflow');
    if (selectedCategory === 'All Inflows') return data.filter(d => d.flow === 'inflow');
    return data.filter(d => d.category === selectedCategory);
  }, [data, selectedCategory]);

  const filteredByType = useMemo(() => {
    if (selectedType === 'all') return filteredByCategory;
    return filteredByCategory.filter(b => b.type === selectedType);
  }, [filteredByCategory, selectedType]);

  const filteredData = useMemo(() => {
    if (selectedConn === 'all') return filteredByType;
    return filteredByType.filter(b => b._id === selectedConn);
  }, [filteredByType, selectedConn]);

  // --- Derived: available years across all payments
  const availableYears = useMemo(() => {
    const yrs = new Set();
    filteredByCategory.forEach(b => b.payments?.forEach(p => yrs.add(p.year)));
    if (yrs.size === 0) yrs.add(new Date().getFullYear());
    return [...yrs].sort((a, b) => b - a);
  }, [filteredByCategory]);

  const allTypes = [...new Set(filteredByCategory.map(b => b.type))];

  // --- 1. Monthly trend for selected year & filters
  const monthlyTrend = useMemo(() => {
    return MONTHS.map((name, idx) => {
      const month = idx + 1;
      const total = filteredData.reduce((sum, b) => {
        const p = b.payments?.find(p => p.month === month && p.year === selectedYear);
        return sum + (p ? p.amount : 0);
      }, 0);
      return { name, total };
    });
  }, [filteredData, selectedYear]);

  // --- 2. Breakdown Pie Chart (Category or Type)
  const breakdownData = useMemo(() => {
    const map = {};
    filteredByCategory.forEach(b => {
      const groupKey = (selectedCategory === 'All Outflows' || selectedCategory === 'All Inflows') ? b.category : b.type;
      b.payments?.filter(p => p.year === selectedYear).forEach(p => {
        map[groupKey] = (map[groupKey] || 0) + p.amount;
      });
    });
    return Object.entries(map)
      .map(([key, amount]) => {
        let label = key;
        let color = '#71717a';
        if (selectedCategory === 'All Outflows' || selectedCategory === 'All Inflows') {
          color = CATEGORY_CONFIG[key]?.color || color;
        } else {
          label = TYPE_CONFIG[key]?.label || key;
          color = TYPE_CONFIG[key]?.color || color;
        }
        return { name: label, amount, color };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [filteredByCategory, selectedYear, selectedCategory]);

  // --- 3. Connection-wise total for selected year & type filter
  const connectionWise = useMemo(() => {
    return filteredByType
      .map(b => {
        const total = b.payments?.filter(p => p.year === selectedYear).reduce((sum, p) => sum + p.amount, 0) || 0;
        return { name: b.name, type: b.type, total, color: TYPE_CONFIG[b.type]?.color || CATEGORY_CONFIG[b.category]?.color || '#71717a', category: b.category };
      })
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [filteredByType, selectedYear]);

  // --- 4. Year-over-Year comparison
  const yoyData = useMemo(() => {
    const prevYear = selectedYear - 1;
    return MONTHS.map((name, idx) => {
      const month = idx + 1;
      const current = filteredData.reduce((sum, b) => {
        const p = b.payments?.find(p => p.month === month && p.year === selectedYear);
        return sum + (p ? p.amount : 0);
      }, 0);
      const previous = filteredData.reduce((sum, b) => {
        const p = b.payments?.find(p => p.month === month && p.year === prevYear);
        return sum + (p ? p.amount : 0);
      }, 0);
      return { name, [selectedYear]: current, [prevYear]: previous };
    });
  }, [filteredData, selectedYear]);

  // --- 5. Summary stats
  const { totalAmount, prevYearTotal, highestMonth } = useMemo(() => {
    const prevYear = selectedYear - 1;
    let total = 0, prevTotal = 0, highest = { name: '—', val: 0 };

    MONTHS.forEach((name, idx) => {
      const month = idx + 1;
      const monthTotal = filteredData.reduce((sum, b) => {
        const p = b.payments?.find(p => p.month === month && p.year === selectedYear);
        return sum + (p ? p.amount : 0);
      }, 0);
      total += monthTotal;
      if (monthTotal > highest.val) highest = { name, val: monthTotal };

      const prevMonthTotal = filteredData.reduce((sum, b) => {
        const p = b.payments?.find(p => p.month === month && p.year === prevYear);
        return sum + (p ? p.amount : 0);
      }, 0);
      prevTotal += prevMonthTotal;
    });

    return { totalAmount: total, prevYearTotal: prevTotal, highestMonth: highest };
  }, [filteredData, selectedYear]);

  const trendPct = prevYearTotal > 0 ? ((totalAmount - prevYearTotal) / prevYearTotal * 100).toFixed(1) : null;
  const isIncome = selectedCategory === 'Rental Income' || selectedCategory === 'All Inflows';

  // --- 6. Detailed ledger for selected year
  const ledger = useMemo(() => {
    return filteredData
      .map(b => {
        const payments = MONTHS.map((_, idx) => {
          const month = idx + 1;
          return b.payments?.find(p => p.month === month && p.year === selectedYear) || null;
        });
        const yearTotal = payments.reduce((s, p) => s + (p ? p.amount : 0), 0);
        return { ...b, monthlyPayments: payments, yearTotal };
      })
      .filter(b => b.yearTotal > 0);
  }, [filteredData, selectedYear]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ color: 'var(--color-primary)', fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Activity className="animate-spin" /> Gathering unified metrics...
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.5s ease' }}>

      {/* Header */}
      <div className="page-header">
        <div className="page-title-section">
          <h1>
            <BarChart2 size={36} style={{ color: 'var(--color-primary)' }} />
            Omni-Channel Analytics
          </h1>
          <p>Complete 360° view of your financial ecosystem, tracking all 8 modules.</p>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="glass-card" style={{ padding: '1.25rem 2rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
            <Filter size={18} /> <span style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filters:</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Calendar size={16} style={{ color: 'var(--color-primary)' }} />
            <select className="form-control" style={{ width: 'auto', padding: '0.5rem 1rem' }}
              value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Layers size={16} style={{ color: 'var(--color-accent)' }} />
            <select className="form-control" style={{ width: 'auto', padding: '0.5rem 1rem' }}
              value={selectedCategory} onChange={e => { setSelectedCategory(e.target.value); setSelectedType('all'); setSelectedConn('all'); }}>
              <option value="All Outflows">All Outflows (Summary)</option>
              <option value="All Inflows">All Inflows (Summary)</option>
              <option value="Utilities">Utilities</option>
              <option value="Insurance">Insurances</option>
              <option value="Construction">Construction</option>
              <option value="Car Logs">Car Logs</option>
              <option value="Rental Income">Rental Income</option>
              <option value="Interest Loans">Interest Loans</option>
              <option value="Personal Debts">Personal Debts</option>
              <option value="Money Transfers">Money Transfers</option>
            </select>
          </div>

          {(selectedCategory !== 'All Outflows' && selectedCategory !== 'All Inflows') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', animation: 'fadeIn 0.3s' }}>
              <Layers size={16} style={{ color: 'var(--color-info)' }} />
              <select className="form-control" style={{ width: 'auto', padding: '0.5rem 1rem' }}
                value={selectedType} onChange={e => { setSelectedType(e.target.value); setSelectedConn('all'); }}>
                <option value="all">All Types</option>
                {allTypes.map(t => <option key={t} value={t}>{TYPE_CONFIG[t]?.label || t}</option>)}
              </select>
            </div>
          )}

          {(selectedCategory !== 'All Outflows' && selectedCategory !== 'All Inflows') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', animation: 'fadeIn 0.3s' }}>
              <Activity size={16} style={{ color: 'var(--color-warning)' }} />
              <select className="form-control" style={{ width: 'auto', padding: '0.5rem 1rem' }}
                value={selectedConn} onChange={e => setSelectedConn(e.target.value)}>
                <option value="all">All Records</option>
                {filteredByType.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <StatCard
          icon={IndianRupee}
          label={isIncome ? `Total Volume ${selectedYear}` : `Total Volume ${selectedYear}`}
          value={fmt(totalAmount)}
          color={isIncome ? "var(--color-success)" : "var(--color-primary)"}
          sub={trendPct ? `${trendPct > 0 ? '+' : ''}${trendPct}% vs ${selectedYear - 1}` : `No ${selectedYear - 1} data`}
          trend={isIncome ? parseFloat(trendPct) : -parseFloat(trendPct)}
        />
        <StatCard
          icon={TrendingUp}
          label="Peak Month"
          value={highestMonth.val > 0 ? highestMonth.name : '—'}
          sub={highestMonth.val > 0 ? fmt(highestMonth.val) : 'No payments recorded'}
          color="var(--color-warning)"
        />
        <StatCard
          icon={Layers}
          label="Active Data Streams"
          value={filteredByType.length}
          sub={`Contributing to this view`}
          color="var(--color-accent)"
        />
      </div>

      {/* ── Monthly Trend ── */}
      <div className="glass-card">
        <h3 style={{ marginBottom: '2rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem' }}>
          <TrendingUp size={22} style={{ color: isIncome ? 'var(--color-success)' : 'var(--color-primary)' }} />
          Monthly Volume Timeline — {selectedYear}
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={monthlyTrend} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
            <YAxis stroke="var(--text-muted)" tick={{ fontSize: 13, fontWeight: 500 }} tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} axisLine={false} tickLine={false} dx={-10} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
            <Bar dataKey="total" name={isIncome ? "Total Flow" : "Total Flow"} radius={[8,8,0,0]} fill="url(#barGrad)">
              {monthlyTrend.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.name === highestMonth.name ? 'var(--color-warning)' : 'url(#barGrad)'} />
              ))}
            </Bar>
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isIncome ? 'var(--color-success)' : 'var(--color-primary)'} stopOpacity={0.9} />
                <stop offset="100%" stopColor={isIncome ? 'var(--color-success)' : 'var(--color-primary)'} stopOpacity={0.1} />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Type Breakdown + Connection-wise ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
        {/* Pie: Breakdown */}
        <div className="glass-card">
          <h3 style={{ marginBottom: '2rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem' }}>
            <PieChart size={22} style={{ color: 'var(--color-accent)' }} />
            Composition Matrix
          </h3>
          {breakdownData.length === 0 ? (
            <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No data for {selectedYear}</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={breakdownData} dataKey="amount" nameKey="name"
                  cx="50%" cy="50%" innerRadius={70} outerRadius={110}
                  paddingAngle={5} stroke="rgba(0,0,0,0.5)" strokeWidth={2}>
                  {breakdownData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  layout="vertical" verticalAlign="middle" align="right"
                  formatter={(val, entry) => (
                    <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600 }}>
                      {val}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar: Connection-wise */}
        <div className="glass-card">
          <h3 style={{ marginBottom: '2rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem' }}>
            <Activity size={22} style={{ color: 'var(--color-info)' }} />
            Entity Distribution ({selectedYear})
          </h3>
          {connectionWise.length === 0 ? (
             <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No data for {selectedYear}</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={connectionWise.slice(0, 8)} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis type="number" stroke="var(--text-muted)" tick={{ fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                <YAxis type="category" dataKey="name" stroke="var(--text-primary)" tick={{ fontSize: 12, fontWeight: 600 }} width={140} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="total" name="Total" radius={[0,8,8,0]}>
                  {connectionWise.slice(0, 8).map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Year-over-Year Line Chart ── */}
      <div className="glass-card">
        <h3 style={{ marginBottom: '2rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem' }}>
          <LineChart size={22} style={{ color: 'var(--color-warning)' }} />
          Comparative Analysis — {selectedYear - 1} vs {selectedYear}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={yoyData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
            <YAxis stroke="var(--text-muted)" tick={{ fontSize: 13, fontWeight: 500 }} tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} axisLine={false} tickLine={false} dx={-10} />
            <Tooltip content={<CustomTooltip />} />
            <Legend formatter={val => <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600 }}>{val}</span>} wrapperStyle={{ paddingTop: 20 }} />
            <Line type="monotone" dataKey={selectedYear - 1} name={`FY ${selectedYear - 1}`}
              stroke="rgba(148, 163, 184, 0.5)" strokeWidth={3} strokeDasharray="6 6" dot={{ r: 4, fill: 'rgba(148, 163, 184, 0.5)', strokeWidth: 0 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey={selectedYear} name={`FY ${selectedYear}`}
              stroke={isIncome ? 'var(--color-success)' : 'var(--color-primary)'} strokeWidth={4} dot={{ r: 5, fill: isIncome ? 'var(--color-success)' : 'var(--color-primary)', strokeWidth: 2, stroke: 'var(--bg-secondary)' }} activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Detailed Monthly Ledger Table ── */}
      <div className="glass-card" style={{ overflowX: 'auto', padding: 0 }}>
        <div style={{ padding: '2rem' }}>
          <h3 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem' }}>
            <FileText size={22} style={{ color: 'var(--color-success)' }} />
            Master Ledger — {selectedYear}
          </h3>
        </div>

        {ledger.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', padding: '0 2rem 3rem 2rem', textAlign: 'center' }}>No payment data found for this selection.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', fontWeight: 700, minWidth: 160 }}>Entity Name</th>
                <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', fontWeight: 700 }}>Category</th>
                {MONTHS.map(m => (
                  <th key={m} style={{ textAlign: 'center', padding: '1rem 0.5rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', fontWeight: 700, minWidth: 65 }}>{m}</th>
                ))}
                <th style={{ textAlign: 'right', padding: '1rem 1.5rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', fontWeight: 700 }}>FY Total</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((b, ri) => {
                const TypeIcon = TYPE_CONFIG[b.type]?.icon || (CATEGORY_CONFIG[b.category]?.color ? FileText : FileText);
                const typeColor = TYPE_CONFIG[b.type]?.color || CATEGORY_CONFIG[b.category]?.color || '#71717a';
                return (
                  <tr key={b._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                      {b.name}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: `${typeColor}22`, color: typeColor, padding: '4px 10px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700, border: `1px solid ${typeColor}33` }}>
                        <TypeIcon size={14} /> {TYPE_CONFIG[b.type]?.label || b.category}
                      </span>
                    </td>
                    {b.monthlyPayments.map((pay, mi) => (
                      <td key={mi} style={{ textAlign: 'center', padding: '1rem 0.5rem' }}>
                        {pay ? (
                          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                            ₹{pay.amount >= 1000 ? (pay.amount / 1000).toFixed(1) + 'k' : pay.amount}
                          </span>
                        ) : (
                          <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: '1rem' }}>—</span>
                        )}
                      </td>
                    ))}
                    <td style={{ textAlign: 'right', padding: '1rem 1.5rem', fontWeight: 800, color: isIncome ? 'var(--color-success)' : 'var(--color-primary)' }}>
                      {fmt(b.yearTotal)}
                    </td>
                  </tr>
                );
              })}

              {/* Grand Total Row */}
              <tr style={{ background: isIncome ? 'rgba(16,185,129,0.1)' : 'rgba(6, 182, 212, 0.1)' }}>
                <td colSpan={2} style={{ padding: '1.25rem 1.5rem', fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.05rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Grand Total</td>
                {MONTHS.map((_, mi) => {
                  const monthTotal = ledger.reduce((s, b) => s + (b.monthlyPayments[mi]?.amount || 0), 0);
                  return (
                    <td key={mi} style={{ textAlign: 'center', padding: '1.25rem 0.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {monthTotal > 0 ? <span>₹{monthTotal >= 1000 ? (monthTotal / 1000).toFixed(1) + 'k' : monthTotal}</span> : <span style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>}
                    </td>
                  );
                })}
                <td style={{ textAlign: 'right', padding: '1.25rem 1.5rem', fontWeight: 800, color: isIncome ? 'var(--color-success)' : 'var(--color-primary)', fontSize: '1.2rem' }}>
                  {fmt(ledger.reduce((s, b) => s + b.yearTotal, 0))}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
