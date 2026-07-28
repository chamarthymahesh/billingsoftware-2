import { authFetch } from '../../utils/authFetch';
import React, { useEffect, useState } from 'react';
import { Send, Plus, Calendar, Activity, Edit3, Trash2, X, Save, User, Building } from 'lucide-react';

const fmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

export default function Transfers() {
  const [transfers, setTransfers] = useState([]);
  const [dropdowns, setDropdowns] = useState({ bankAccounts: [], transferMethods: [] });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    sentByAccount: '',
    sentToPerson: '',
    onBehalfOf: 'Father', // Default as per user request
    transferMethod: '',
    notes: ''
  });

  useEffect(() => {
    fetchTransfers();
    fetchDropdowns();
  }, []);

  const fetchTransfers = async () => {
    try {
      const res = await authFetch('/api/transfers');
      const data = await res.json();
      setTransfers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const res = await authFetch('/api/admin/config');
      const data = await res.json();
      setDropdowns({
        bankAccounts: data.bankAccounts || ['HDFC', 'SBI', 'Cash'],
        transferMethods: data.transferMethods || ['UPI', 'NEFT', 'Cash']
      });
      // Set defaults for form
      setFormData(prev => ({
        ...prev,
        sentByAccount: data.bankAccounts?.[0] || 'HDFC',
        transferMethod: data.transferMethods?.[0] || 'UPI'
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await authFetch(`/api/transfers/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      } else {
        await authFetch('/api/transfers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      }
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        sentByAccount: dropdowns.bankAccounts[0] || '',
        sentToPerson: '',
        onBehalfOf: 'Father',
        transferMethod: dropdowns.transferMethods[0] || '',
        notes: ''
      });
      fetchTransfers();
    } catch (err) {
      alert('Error saving transfer');
      console.error(err);
    }
  };

  const handleEdit = (t) => {
    setFormData({
      amount: t.amount,
      date: new Date(t.date).toISOString().split('T')[0],
      sentByAccount: t.sentByAccount,
      sentToPerson: t.sentToPerson,
      onBehalfOf: t.onBehalfOf,
      transferMethod: t.transferMethod,
      notes: t.notes || ''
    });
    setEditingId(t._id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transfer record?')) return;
    try {
      await authFetch(`/api/transfers/${id}`, { method: 'DELETE' });
      fetchTransfers();
    } catch (err) {
      console.error(err);
    }
  };

  const totalTransferred = transfers.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="animate-fade-in" style={{ padding: '2rem 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.7) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Send size={36} style={{ color: 'var(--color-primary)' }} />
            Money Transfers
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '1.1rem' }}>
            Track money sent to third parties on behalf of family members.
          </p>
        </div>
        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontSize: '1rem', fontWeight: 600, boxShadow: '0 4px 15px rgba(139,92,246,0.3)' }} onClick={() => {
          setEditingId(null);
          setFormData(prev => ({ ...prev, amount: '', sentToPerson: '', notes: '' }));
          setIsModalOpen(true);
        }}>
          <Plus size={20} /> Record Transfer
        </button>
      </div>

      {/* Summary Card */}
      <div style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.5rem', marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <div style={{ width: 60, height: 60, borderRadius: '12px', background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
          <Activity size={32} />
        </div>
        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Total Transferred</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>{fmt(totalTransferred)}</div>
        </div>
      </div>

      {/* Transfers Grid */}
      {transfers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <Send size={48} style={{ color: 'rgba(255,255,255,0.1)', marginBottom: '1rem' }} />
          <h3 style={{ color: 'var(--text-secondary)' }}>No transfers recorded yet.</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Click "Record Transfer" to log money sent on someone's behalf.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {transfers.map((t, index) => (
            <div key={t._id} className="animate-slide-up" style={{ animationDelay: `${index * 0.05}s`, background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', padding: '1.5rem', position: 'relative', overflow: 'hidden', transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Amount Sent</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>{fmt(t.amount)}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)' }}>
                  <Calendar size={12} /> {new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '10px' }}>
                  <User size={18} style={{ color: 'var(--color-info)' }} />
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Sent To</span>
                    <span style={{ color: 'white', fontWeight: 500, fontSize: '0.95rem' }}>{t.sentToPerson}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '10px' }}>
                  <Building size={18} style={{ color: 'var(--color-warning)' }} />
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>On Behalf Of</span>
                    <span style={{ color: 'white', fontWeight: 500, fontSize: '0.95rem' }}>{t.onBehalfOf}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <div style={{ borderLeft: '2px solid rgba(139,92,246,0.3)', paddingLeft: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>From Account</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>{t.sentByAccount}</span>
                  </div>
                  <div style={{ borderLeft: '2px solid rgba(16,185,129,0.3)', paddingLeft: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Method</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>{t.transferMethod}</span>
                  </div>
                </div>

                {t.notes && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '6px' }}>
                    "{t.notes}"
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', color: 'var(--color-primary)' }} onClick={() => handleEdit(t)}>
                  <Edit3 size={16} />
                </button>
                <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', color: 'var(--color-danger)' }} onClick={() => handleDelete(t._id)}>
                  <Trash2 size={16} />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', animation: 'fadeIn 0.2s ease' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', width: '100%', maxWidth: '600px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
            
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {editingId ? <Edit3 size={20} className="text-primary" /> : <Send size={20} className="text-primary" />}
                {editingId ? 'Edit Transfer' : 'Record Transfer'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem', display: 'flex', borderRadius: '50%', transition: 'all 0.2s ease' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">On Behalf Of (Who requested this?)</label>
                  <input type="text" className="form-control" required placeholder="e.g. Father" value={formData.onBehalfOf} onChange={e => setFormData({...formData, onBehalfOf: e.target.value})} />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Sent To (Recipient Name)</label>
                  <input type="text" className="form-control" required placeholder="e.g. Ramesh Electrician" value={formData.sentToPerson} onChange={e => setFormData({...formData, sentToPerson: e.target.value})} />
                </div>

                <div>
                  <label className="form-label">Amount (₹)</label>
                  <input type="number" className="form-control" required min="1" step="any" placeholder="25000" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                </div>
                
                <div>
                  <label className="form-label">Date Sent</label>
                  <input type="date" className="form-control" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>

                <div>
                  <label className="form-label">From Account</label>
                  <select className="form-control" value={formData.sentByAccount} onChange={e => setFormData({...formData, sentByAccount: e.target.value})}>
                    {dropdowns.bankAccounts.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>

                <div>
                  <label className="form-label">Transfer Method</label>
                  <select className="form-control" value={formData.transferMethod} onChange={e => setFormData({...formData, transferMethod: e.target.value})}>
                    {dropdowns.transferMethods.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Notes (Optional)</label>
                  <textarea className="form-control" rows="2" placeholder="e.g. Advance payment for house repair" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Save size={16} /> Save Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
