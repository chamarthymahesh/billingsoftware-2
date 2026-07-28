import { authFetch } from '../../utils/authFetch';
import React, { useEffect, useState } from 'react';
import { Shield, Plus, Calendar, AlertCircle, CheckCircle, Trash2, Heart, Award, ShieldAlert, ChevronDown, ChevronUp, DollarSign, Activity, FileText, X, Save, Edit3 } from 'lucide-react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

function MonthCell({ policy, month, monthName, year, payment, onSaved }) {
  const [mode, setMode] = useState(null);
  const [amount, setAmount] = useState('');
  const [datePaid, setDatePaid] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const openEdit = (e) => {
    e.stopPropagation();
    setAmount(payment.amount);
    setDatePaid(payment.date ? new Date(payment.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    setMode('edit');
  };
  const openAdd = (e) => {
    e.stopPropagation();
    setAmount(policy.premiumAmount || '');
    setDatePaid(new Date().toISOString().split('T')[0]);
    setMode('add');
  };
  const cancel = (e) => { e && e.stopPropagation(); setMode(null); };

  const save = async (e) => {
    e.stopPropagation();
    if (!amount) return;
    setSaving(true);
    try {
      let res;
      if (mode === 'add') {
        res = await authFetch(`/api/insurances/${policy._id}/payments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: parseFloat(amount), month, year, date: datePaid || undefined }),
        });
      } else {
        res = await authFetch(`/api/insurances/${policy._id}/payments/${payment._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: parseFloat(amount), month, year, date: datePaid || undefined }),
        });
      }
      
      if (!res.ok) throw new Error();
      onSaved();
      setMode(null);
    } catch (err) { 
      console.error(err);
      alert('Failed to save payment');
    }
    setSaving(false);
  };

  const del = async (e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this payment?')) return;
    setSaving(true);
    try {
      await authFetch(`/api/insurances/${policy._id}/payments/${payment._id}`, { method: 'DELETE' });
      onSaved();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const wrapperStyle = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '10px',
    padding: '0.85rem',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative'
  };

  if (mode) {
    return (
      <div style={{ ...wrapperStyle, border: '1px solid rgba(139,92,246,0.5)', background: 'rgba(139,92,246,0.08)' }} onClick={e => e.stopPropagation()}>
        <div style={{ color: 'var(--color-primary)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>{monthName}</div>
        <input
          type="number" placeholder="Amount"
          value={amount} onChange={e => setAmount(e.target.value)}
          onClick={e => e.stopPropagation()}
          style={{
            background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 6, padding: '6px 8px', color: '#fff', fontSize: '0.9rem', width: '100%', marginBottom: '0.5rem'
          }}
        />
        <input
          type="date" value={datePaid} onChange={e => setDatePaid(e.target.value)}
          onClick={e => e.stopPropagation()}
          style={{
            background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 6, padding: '6px 8px', color: '#fff', fontSize: '0.8rem', width: '100%', marginBottom: '0.6rem'
          }}
        />
        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
          <button onClick={cancel} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
            <X size={15} />
          </button>
          <button onClick={save} disabled={saving} style={{
            background: 'var(--color-primary)', border: 'none', color: '#fff',
            borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600
          }}>
            {saving ? '...' : <Save size={14} />}
          </button>
        </div>
      </div>
    );
  }

  if (payment) {
    return (
      <div style={{ ...wrapperStyle, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>{monthName}</span>
          <span style={{ color: 'var(--color-success)', fontSize: '1.05rem', fontWeight: 700 }}>{fmt(payment.amount)}</span>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Calendar size={12} />
          {new Date(payment.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
          <button onClick={openEdit} title="Edit" style={{
            background: 'rgba(139,92,246,0.15)', border: 'none', borderRadius: 6,
            color: 'var(--color-primary)', cursor: 'pointer', padding: '5px 8px', fontSize: '0.75rem', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '0.25rem', flex: 1, justifyContent: 'center'
          }}>
            <Edit3 size={12} /> Edit
          </button>
          <button onClick={del} title="Delete" style={{
            background: 'rgba(244,63,94,0.15)', border: 'none', borderRadius: 6,
            color: 'var(--color-danger)', cursor: 'pointer', padding: '5px 8px', fontSize: '0.75rem', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '0.25rem', flex: 1, justifyContent: 'center'
          }}>
            <Trash2 size={12} /> Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...wrapperStyle, border: '1px dashed rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', minHeight: '110px' }}>
      <div style={{ position: 'absolute', top: '0.75rem', left: '0.85rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>{monthName}</div>
      <button onClick={openAdd} title="Add payment" style={{
        background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
        color: 'var(--text-secondary)', borderRadius: 8, padding: '8px 16px',
        cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, transition: 'all 0.2s', marginTop: '1.25rem', width: '100%', display: 'flex', justifyContent: 'center', gap: '0.3rem', alignItems: 'center'
      }}>
        <Plus size={14} /> Record
      </button>
    </div>
  );
}

export default function Insurances() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPolicyId, setSelectedPolicyId] = useState(null);
  const [dropdowns, setDropdowns] = useState({ cars: [], insurances: [], projects: [], rentals: [], contacts: [], insuranceProviders: [] });
  
  // Advanced UI State
  const [selectedProvider, setSelectedProvider] = useState('All');
  const [expandedCard, setExpandedCard] = useState(null);
  const [editingPolicyId, setEditingPolicyId] = useState(null);
  const [autoFillLoading, setAutoFillLoading] = useState(null); // stores policyId being auto-filled

  // Form State
  const [formData, setFormData] = useState({
    type: 'term',
    provider: '',
    policyName: '',
    policyNumber: '',
    startDate: '',
    endDate: '',
    termYears: '',
    maturityAmount: '',
    premiumAmount: '',
    frequency: 'yearly',
    dueDate: '',
    carName: '',
    notes: ''
  });

  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    fetchPolicies();
    fetchDropdowns();
  }, []);

  const fetchDropdowns = () => {
    authFetch('/api/dropdowns')
      .then(res => res.json())
      .then(data => {
        // Ensure insuranceProviders includes standard ones
        const defaultProviders = ['LIC', 'Tata AIG', 'SBI Life', 'PLI'];
        const providersSet = new Set([
          ...(data.insuranceProviders || []),
          ...defaultProviders,
        ]);
        setDropdowns({
          ...data,
          insuranceProviders: Array.from(providersSet).sort(),
        });
      })
      .catch(err => console.error('Error fetching dropdowns:', err));
  };

  const fetchPolicies = () => {
    setLoading(true);
    authFetch('/api/insurances')
      .then(res => res.json())
      .then(data => {
        setPolicies(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching policies:', err);
        setLoading(false);
      });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.provider || !formData.policyName || !formData.premiumAmount) {
      alert('Please fill out all required fields.');
      return;
    }

    const url = editingPolicyId ? `/api/insurances/${editingPolicyId}` : '/api/insurances';
    const method = editingPolicyId ? 'PUT' : 'POST';

    authFetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
      .then(res => res.json())
      .then(() => {
        setIsModalOpen(false);
        setEditingPolicyId(null);
        setFormData({
          type: 'term',
          provider: '',
          policyName: '',
          policyNumber: '',
          startDate: '',
          endDate: '',
          termYears: '',
          maturityAmount: '',
          premiumAmount: '',
          frequency: 'yearly',
          dueDate: '',
          carName: '',
          notes: ''
        });
        fetchPolicies();
      })
      .catch(err => console.error('Error saving policy:', err));
  };

  const handleUpdateStatus = (id, newStatus) => {
    authFetch(`/api/insurances/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })
      .then(() => fetchPolicies())
      .catch(err => console.error('Error updating status:', err));
  };

  const handleDelete = (id) => {
    if (!window.confirm('Are you sure you want to delete this policy?')) return;
    authFetch(`/api/insurances/${id}`, { method: 'DELETE' })
      .then(() => fetchPolicies())
      .catch(err => console.error('Error deleting policy:', err));
  };

  const handleAutoFill = async (policy) => {
    if (!policy.startDate) {
      alert('This policy has no Start Date set. Please edit the policy and add a Start Date first.');
      return;
    }
    const startStr = new Date(policy.startDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    const now = new Date();
    const endStr = now.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    if (!window.confirm(`Auto-fill all monthly payments of ${formatCurrency(policy.premiumAmount)} from ${startStr} to ${endStr}?\n\nAlready recorded months will be skipped.`)) return;
    setAutoFillLoading(policy._id);
    try {
      const res = await authFetch(`/api/insurances/${policy._id}/autofill`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Auto-fill failed');
      await fetchPolicies();
      alert(data.message);
    } catch (err) {
      alert('Auto-fill failed: ' + err.message);
    }
    setAutoFillLoading(null);
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    if (!paymentFormData.amount || !paymentFormData.date) {
      alert('Please fill out amount and date.');
      return;
    }
    
    authFetch(`/api/insurances/${selectedPolicyId}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentFormData)
    })
      .then(res => {
        if(!res.ok) throw new Error('Payment failed');
        return res.json();
      })
      .then(() => {
        setIsPaymentModalOpen(false);
        setPaymentFormData({
          amount: '',
          date: new Date().toISOString().split('T')[0],
          notes: ''
        });
        fetchPolicies();
      })
      .catch(err => {
        console.error('Error recording payment:', err);
        alert('Failed to save payment.');
      });
  };

  const getPolicyIcon = (type) => {
    switch (type) {
      case 'term': return <Award size={24} style={{ color: 'var(--color-primary)' }} />;
      case 'health': return <Heart size={24} style={{ color: 'var(--color-danger)' }} />;
      case 'car': return <Shield size={24} style={{ color: 'var(--color-info)' }} />;
      default: return <ShieldAlert size={24} style={{ color: 'var(--text-secondary)' }} />;
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const yearOptions = Array.from(new Array(10), (val, index) => new Date().getFullYear() - 5 + index);

  // --- Derived Data for Advanced UI ---
  const providers = ['All', ...new Set(policies.map(p => p.provider))].sort();
  const filteredPolicies = selectedProvider === 'All' ? policies : policies.filter(p => p.provider === selectedProvider);
  
  const upcomingRenewalsCount = policies.filter(p => {
    const diffTime = new Date(p.dueDate) - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return p.status === 'active' && diffDays >= 0 && diffDays <= 30;
  }).length;

  const totalAnnualPremium = policies.filter(p => p.status === 'active').reduce((sum, p) => {
    let multiplier = 1;
    if(p.frequency === 'monthly') multiplier = 12;
    if(p.frequency === 'quarterly') multiplier = 4;
    if(p.frequency === 'half-yearly') multiplier = 2;
    return sum + (p.premiumAmount * multiplier);
  }, 0);

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div className="page-title-section">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Shield style={{ color: 'var(--color-primary)' }} size={32} />
            Insurance Vault
          </h1>
          <p>Advanced Management for Tata AIG, SBI, LIC, PLI, and more.</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setEditingPolicyId(null);
          setFormData({
            type: 'term', provider: '', policyName: '', policyNumber: '', startDate: '', endDate: '',
            termYears: '', maturityAmount: '', premiumAmount: '', frequency: 'yearly', dueDate: '', carName: '', notes: ''
          });
          setIsModalOpen(true);
        }} style={{ padding: '0.75rem 1.5rem', borderRadius: '12px' }}>
          <Plus size={20} />
          Add New Policy
        </button>
      </div>

      {/* Advanced Metrics Dashboard */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginBottom: '2rem' }}>
        <div className="glass-card metric-card" style={{ borderLeft: '4px solid var(--color-success)' }}>
          <div className="metric-header">
            <span className="metric-title">Active Protection</span>
            <div className="metric-icon-wrapper" style={{ background: 'var(--color-success-glow)' }}>
              <CheckCircle size={22} style={{ color: 'var(--color-success)' }} />
            </div>
          </div>
          <div>
            <h2 className="metric-value">{policies.filter(p => p.status === 'active').length}</h2>
            <p className="metric-desc" style={{ color: 'var(--text-secondary)' }}>Total active policies securing your assets</p>
          </div>
        </div>

        <div className="glass-card metric-card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
          <div className="metric-header">
            <span className="metric-title">Urgent Renewals (30 Days)</span>
            <div className="metric-icon-wrapper" style={{ background: 'var(--color-warning-glow)' }}>
              <AlertCircle size={22} style={{ color: 'var(--color-warning)' }} />
            </div>
          </div>
          <div>
            <h2 className="metric-value" style={{ color: upcomingRenewalsCount > 0 ? 'var(--color-warning)' : 'var(--text-primary)' }}>
              {upcomingRenewalsCount}
            </h2>
            <p className="metric-desc" style={{ color: 'var(--text-secondary)' }}>Policies requiring immediate attention</p>
          </div>
        </div>

        <div className="glass-card metric-card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
          <div className="metric-header">
            <span className="metric-title">Total Annual Outflow</span>
            <div className="metric-icon-wrapper" style={{ background: 'var(--color-primary-glow)' }}>
              <DollarSign size={22} style={{ color: 'var(--color-primary)' }} />
            </div>
          </div>
          <div>
            <h2 className="metric-value">{formatCurrency(totalAnnualPremium)}</h2>
            <p className="metric-desc" style={{ color: 'var(--text-secondary)' }}>Estimated yearly premium commitment</p>
          </div>
        </div>
      </div>

      {/* Provider Tabs (Horizontal Scrollable) */}
      {providers.length > 1 && (
        <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '1.5rem', scrollbarWidth: 'none' }}>
          {providers.map(prov => (
            <button
              key={prov}
              onClick={() => setSelectedProvider(prov)}
              style={{
                background: selectedProvider === prov ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
                color: selectedProvider === prov ? 'white' : 'var(--text-secondary)',
                border: `1px solid ${selectedProvider === prov ? 'var(--color-primary)' : 'var(--border-color)'}`,
                padding: '0.6rem 1.25rem',
                borderRadius: '99px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.9rem',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                boxShadow: selectedProvider === prov ? '0 4px 15px rgba(139, 92, 246, 0.4)' : 'none'
              }}
            >
              {prov} {prov !== 'All' && `(${policies.filter(p => p.provider === prov).length})`}
            </button>
          ))}
        </div>
      )}

      {/* Policies Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--color-primary)', fontSize: '1.2rem', fontWeight: 600 }}>Loading Vault...</p>
        </div>
      ) : filteredPolicies.length === 0 ? (
        <div className="glass-card" style={{ padding: '4rem', textAlign: 'center', borderRadius: '16px' }}>
          <ShieldAlert size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
          <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>No Policies Found</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Click "Add New Policy" to start tracking {selectedProvider !== 'All' ? selectedProvider : 'your'} insurances.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
          {filteredPolicies.map(p => {
            const diffTime = new Date(p.dueDate) - new Date();
            const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // Progress Bar Logic (assume typical 1 year cycle for visual, if overdue it's 100%)
            let progress = 100;
            if (daysLeft > 0) {
              const cycleDays = p.frequency === 'monthly' ? 30 : p.frequency === 'quarterly' ? 90 : p.frequency === 'half-yearly' ? 180 : 365;
              progress = Math.max(0, Math.min(100, 100 - (daysLeft / cycleDays) * 100));
            }
            const isUrgent = daysLeft <= 15 && p.status === 'active';
            const isExpanded = expandedCard === p._id;

            return (
              <div key={p._id} className="glass-card" style={{ 
                borderTop: 'none',
                position: 'relative',
                overflow: 'hidden',
                padding: '0',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {/* Top Colored Accent Bar */}
                <div style={{ 
                  height: '4px', 
                  width: '100%', 
                  background: p.status === 'expired' || p.status === 'lapsed' ? 'var(--text-muted)' : 
                              isUrgent ? 'var(--color-danger)' : 
                              p.type === 'term' ? 'var(--color-primary)' : 
                              p.type === 'health' ? 'var(--color-danger)' : 'var(--color-info)' 
                }} />

                <div style={{ padding: '1.5rem' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ 
                        background: 'rgba(255,255,255,0.05)', 
                        padding: '0.75rem', 
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        {getPolicyIcon(p.type)}
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>{p.provider}</span>
                        <h4 style={{ fontSize: '1.15rem', color: 'white', marginTop: '0.2rem', lineHeight: 1.2 }}>{p.policyName}</h4>
                      </div>
                    </div>
                    <span className={`badge ${p.status === 'active' ? 'badge-success' : 'badge-danger'}`} style={{ padding: '0.3rem 0.75rem' }}>
                      {p.status}
                    </span>
                  </div>

                  {/* Core Details Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Policy No.</span>
                      <span style={{ color: 'white', fontWeight: 500, fontSize: '0.9rem', wordBreak: 'break-all' }}>{p.policyNumber || 'N/A'}</span>
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Premium</span>
                      <span style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: '1rem' }}>{formatCurrency(p.premiumAmount)}</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginLeft: '0.25rem', textTransform: 'capitalize' }}>/{p.frequency.slice(0,2)}</span>
                    </div>
                  </div>

                  {/* Renewal Timeline */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Calendar size={14} /> Next Due
                      </span>
                      <span style={{ color: isUrgent ? 'var(--color-danger)' : 'white', fontWeight: isUrgent ? 700 : 500 }}>
                        {p.dueDate ? new Date(p.dueDate).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : 'Not Set'}
                        {p.dueDate && p.status === 'active' && daysLeft > 0 && <span style={{ opacity: 0.8, marginLeft: '0.5rem' }}>({daysLeft}d left)</span>}
                      </span>
                    </div>
                    {p.dueDate && p.status === 'active' && (
                      <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{ 
                          width: `${progress}%`, 
                          height: '100%', 
                          background: isUrgent ? 'var(--color-danger)' : progress > 75 ? 'var(--color-warning)' : 'var(--color-success)',
                          borderRadius: '99px',
                          transition: 'width 1s ease'
                        }} />
                      </div>
                    )}
                  </div>

                  {/* Expandable Section Toggle */}
                  <button 
                    onClick={() => setExpandedCard(isExpanded ? null : p._id)}
                    style={{ 
                      width: '100%', 
                      background: 'none', 
                      border: 'none', 
                      color: 'var(--color-primary)', 
                      fontSize: '0.85rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '0.5rem',
                      cursor: 'pointer',
                      padding: '0.5rem',
                      fontWeight: 600,
                      transition: '0.2s'
                    }}
                  >
                    {isExpanded ? 'Hide Details' : 'View Full Details'}
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div style={{ 
                      marginTop: '1rem', 
                      paddingTop: '1rem', 
                      borderTop: '1px solid rgba(255,255,255,0.05)',
                      animation: 'fadeIn 0.3s ease'
                    }}>
                      {/* Expanded Policy Insights */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '10px' }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>Total Paid All Time</span>
                          <span style={{ color: 'white', fontWeight: 600, fontSize: '1.1rem' }}>
                            {formatCurrency((p.payments || []).reduce((s, pay) => s + pay.amount, 0))}
                          </span>
                        </div>
                        {p.termYears && (
                          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '10px' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>Policy Term</span>
                            <span style={{ color: 'white', fontWeight: 600, fontSize: '1.1rem' }}>{p.termYears} Years</span>
                          </div>
                        )}
                        {p.maturityAmount && (
                          <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', padding: '1rem', borderRadius: '10px' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>Expected Maturity</span>
                            <span style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: '1.1rem' }}>{formatCurrency(p.maturityAmount)}</span>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                        {p.startDate && (
                          <div>
                            <span style={{ color: 'var(--text-muted)', display: 'block' }}>Start Date</span>
                            <span style={{ color: 'white' }}>{new Date(p.startDate).toLocaleDateString('en-IN')}</span>
                          </div>
                        )}
                        {p.endDate && (
                          <div>
                            <span style={{ color: 'var(--text-muted)', display: 'block' }}>Expiry Date</span>
                            <span style={{ color: 'white' }}>{new Date(p.endDate).toLocaleDateString('en-IN')}</span>
                          </div>
                        )}
                        {p.carName && (
                          <div style={{ gridColumn: 'span 2' }}>
                            <span style={{ color: 'var(--text-muted)', display: 'block' }}>Linked Vehicle</span>
                            <span style={{ color: 'white' }}>{p.carName}</span>
                          </div>
                        )}
                      </div>

                      {p.notes && (
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                            <FileText size={12} /> Notes
                          </span>
                          <p style={{ color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: 1.4 }}>"{p.notes}"</p>
                        </div>
                      )}

                      {/* Month-wise Ledger */}
                      <div style={{ marginTop: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                          <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Month-wise Ledger</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {/* Auto-fill Button */}
                            {p.startDate && (
                              <button
                                onClick={() => handleAutoFill(p)}
                                disabled={autoFillLoading === p._id}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                                  background: autoFillLoading === p._id ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.2)',
                                  border: '1px solid rgba(16,185,129,0.4)',
                                  color: 'var(--color-success)',
                                  borderRadius: '8px', padding: '0.4rem 0.9rem',
                                  cursor: autoFillLoading === p._id ? 'not-allowed' : 'pointer',
                                  fontSize: '0.8rem', fontWeight: 600,
                                  transition: 'all 0.2s ease'
                                }}
                                title={`Auto-fill all months from ${new Date(p.startDate).toLocaleDateString('en-IN', {month:'short',year:'numeric'})} to today`}
                              >
                                {autoFillLoading === p._id ? (
                                  <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(16,185,129,0.3)', borderTop: '2px solid var(--color-success)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                ) : (
                                  <Activity size={14} />
                                )}
                                {autoFillLoading === p._id ? 'Filling...' : '⚡ Auto-fill Past'}
                              </button>
                            )}
                            <select 
                              className="form-control" 
                              style={{ width: 'auto', padding: '0.4rem 2rem 0.4rem 1rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
                              value={selectedYear}
                              onChange={(e) => setSelectedYear(Number(e.target.value))}
                            >
                              {yearOptions.map(yr => (
                                <option key={yr} value={yr}>{yr}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                          gap: '1rem'
                        }}>
                          {MONTHS.map((mName, i) => {
                            // Find payment for this exact month & year. Fallback to generic payments not yet mapped if needed?
                            // Actually, just strict map for month-wise:
                            const payment = (p.payments || []).find(pay => pay.year === selectedYear && pay.month === (i + 1));
                            return (
                              <MonthCell
                                key={i}
                                policy={p}
                                month={i + 1}
                                monthName={mName}
                                year={selectedYear}
                                payment={payment}
                                onSaved={fetchPolicies}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions Footer */}
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <button className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', flex: 1 }} onClick={() => {
                      setSelectedPolicyId(p._id);
                      setPaymentFormData({ ...paymentFormData, amount: p.premiumAmount });
                      setIsPaymentModalOpen(true);
                    }}>
                      Pay Premium
                    </button>
                    {p.status === 'active' ? (
                      <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} onClick={() => handleUpdateStatus(p._id, 'expired')} title="Mark Expired">
                        <ShieldAlert size={16} />
                      </button>
                    ) : (
                      <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', color: 'var(--color-success)' }} onClick={() => handleUpdateStatus(p._id, 'active')} title="Activate">
                        <CheckCircle size={16} />
                      </button>
                    )}
                    <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', color: 'var(--color-primary)' }} onClick={() => {
                      setEditingPolicyId(p._id);
                      setFormData({
                        type: p.type || 'term',
                        provider: p.provider || '',
                        policyName: p.policyName || '',
                        policyNumber: p.policyNumber || '',
                        startDate: p.startDate ? new Date(p.startDate).toISOString().split('T')[0] : '',
                        endDate: p.endDate ? new Date(p.endDate).toISOString().split('T')[0] : '',
                        termYears: p.termYears || '',
                        maturityAmount: p.maturityAmount || '',
                        premiumAmount: p.premiumAmount || '',
                        frequency: p.frequency || 'yearly',
                        dueDate: p.dueDate ? new Date(p.dueDate).toISOString().split('T')[0] : '',
                        carName: p.carName || '',
                        notes: p.notes || ''
                      });
                      setIsModalOpen(true);
                    }} title="Edit Policy">
                      <Edit3 size={16} />
                    </button>
                    <button className="btn btn-danger" style={{ padding: '0.4rem 0.75rem' }} onClick={() => handleDelete(p._id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Advanced Add Policy Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '700px', padding: '0' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'var(--color-primary-glow)', padding: '0.75rem', borderRadius: '12px' }}>
                <Shield style={{ color: 'var(--color-primary)' }} size={24} />
              </div>
              <div>
                <h2 style={{ color: 'white', fontSize: '1.4rem' }}>
                  {editingPolicyId ? 'Edit Policy' : 'Register New Policy'}
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {editingPolicyId ? 'Update details for this insurance.' : 'Fill in the details to securely track this insurance.'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                
                {/* Section 1: Basic Identity */}
                <div style={{ gridColumn: 'span 2' }}>
                  <h4 style={{ color: 'var(--color-primary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={16} /> Policy Identity
                  </h4>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Provider Name <span style={{color:'var(--color-danger)'}}>*</span></label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. LIC, Tata AIG, SBI Life, PLI"
                    required
                    list="providers-list"
                    value={formData.provider} 
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  />
                  <datalist id="providers-list">
                    {dropdowns.insuranceProviders?.map(p => <option key={p} value={p} />)}
                    {providers.filter(p => p !== 'All').map(p => <option key={p} value={p} />)}
                  </datalist>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Category <span style={{color:'var(--color-danger)'}}>*</span></label>
                  <select className="form-control" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                    <option value="term">Term Life / Endowment</option>
                    <option value="health">Health / Medical</option>
                    <option value="car">Vehicle / Auto</option>
                    <option value="property">Property / Home</option>
                    <option value="other">Other General</option>
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                  <label className="form-label">Policy Name / Plan Name <span style={{color:'var(--color-danger)'}}>*</span></label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Endowment Assurance, Car Guard"
                    required
                    value={formData.policyName} 
                    onChange={(e) => setFormData({ ...formData, policyName: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                  <label className="form-label">Policy Number</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. POL-123456789"
                    value={formData.policyNumber} 
                    onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })}
                  />
                </div>

                {/* Section 2: Financials & Dates */}
                <div style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
                  <h4 style={{ color: 'var(--color-success)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <DollarSign size={16} /> Premium & Timeline
                  </h4>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Premium Amount (₹) <span style={{color:'var(--color-danger)'}}>*</span></label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="0"
                    required
                    value={formData.premiumAmount} 
                    onChange={(e) => setFormData({ ...formData, premiumAmount: parseFloat(e.target.value) || '' })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Payment Frequency <span style={{color:'var(--color-danger)'}}>*</span></label>
                  <select className="form-control" value={formData.frequency} onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="half-yearly">Half-Yearly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Next Premium Due Date (Optional)</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={formData.dueDate} 
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Policy Start Date (Optional)</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={formData.startDate} 
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Maturity / Expiry Date (Optional)</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={formData.endDate} 
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Policy Term (Years)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="e.g. 10"
                    value={formData.termYears} 
                    onChange={(e) => setFormData({ ...formData, termYears: parseInt(e.target.value) || '' })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Expected Maturity Amount (₹)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="0"
                    value={formData.maturityAmount} 
                    onChange={(e) => setFormData({ ...formData, maturityAmount: parseFloat(e.target.value) || '' })}
                  />
                </div>

                {/* Section 3: Extras */}
                <div style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
                  <h4 style={{ color: 'var(--color-info)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={16} /> Additional Details
                  </h4>
                </div>

                {formData.type === 'car' && (
                  <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                    <label className="form-label">Associated Vehicle</label>
                    <select 
                      className="form-control" 
                      value={formData.carName} 
                      onChange={(e) => setFormData({ ...formData, carName: e.target.value })}
                    >
                      <option value="">-- Select Registered Car --</option>
                      {dropdowns.cars.map(c => (
                        <option key={c._id} value={c.name}>{c.name} {c.plateNumber ? `(${c.plateNumber})` : ''}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                  <label className="form-label">Remarks / Notes</label>
                  <textarea 
                    className="form-control" 
                    rows="2"
                    placeholder="e.g. Nominee is Spouse, Accidental cover included..."
                    value={formData.notes} 
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem 2rem' }}>
                  Save Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <h2 style={{ marginBottom: '1.5rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <DollarSign size={24} style={{ color: 'var(--color-success)' }} /> Record Premium
            </h2>
            <form onSubmit={handlePaymentSubmit}>
              <div className="form-group">
                <label className="form-label">Payment Date</label>
                <input 
                  type="date" 
                  className="form-control" 
                  required
                  value={paymentFormData.date} 
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Amount Paid (₹)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  required
                  style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--color-success)' }}
                  value={paymentFormData.amount} 
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: parseFloat(e.target.value) || '' })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Transaction Notes</label>
                <textarea 
                  className="form-control" 
                  rows="2"
                  placeholder="e.g. Paid via Auto-debit SBI"
                  value={paymentFormData.notes} 
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsPaymentModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: 'var(--color-success)', color: '#000' }}>
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
