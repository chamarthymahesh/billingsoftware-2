import { authFetch } from '../../utils/authFetch';
import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Calendar, User, ArrowUpRight, ArrowDownRight, CheckSquare, RefreshCw } from 'lucide-react';

export default function Debts() {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [dropdowns, setDropdowns] = useState({ cars: [], insurances: [], projects: [], rentals: [], contacts: [] });
  const [isNewContact, setIsNewContact] = useState(false);

  // Form State - Create Debt
  const [newDebt, setNewDebt] = useState({
    type: 'given',
    personName: '',
    relationship: 'friend',
    amount: '',
    dateOccurred: '',
    dueDate: '',
    notes: ''
  });

  // Form State - Add Repayment
  const [repaymentForm, setRepaymentForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    fetchDebts();
    fetchDropdowns();
  }, []);

  const fetchDropdowns = () => {
    authFetch('/api/dropdowns')
      .then(res => res.json())
      .then(data => setDropdowns(data))
      .catch(err => console.error('Error fetching dropdowns:', err));
  };

  const fetchDebts = () => {
    setLoading(true);
    authFetch('/api/debts')
      .then(res => res.json())
      .then(data => {
        setDebts(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching debts:', err);
        setLoading(false);
      });
  };

  const handleCreateDebt = (e) => {
    e.preventDefault();
    if (!newDebt.personName || !newDebt.amount || !newDebt.dateOccurred) {
      alert('Please fill out name, amount and date.');
      return;
    }

    authFetch('/api/debts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newDebt)
    })
      .then(res => res.json())
      .then(() => {
        setIsCreateModalOpen(false);
        setNewDebt({
          type: 'given',
          personName: '',
          relationship: 'friend',
          amount: '',
          dateOccurred: '',
          dueDate: '',
          notes: ''
        });
        fetchDebts();
      })
      .catch(err => console.error('Error creating debt record:', err));
  };

  const handleAddRepayment = (e) => {
    e.preventDefault();
    if (!repaymentForm.amount || !repaymentForm.date) {
      alert('Please fill out amount and date.');
      return;
    }

    authFetch(`/api/debts/${selectedDebt._id}/repayments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(repaymentForm)
    })
      .then(res => res.json())
      .then(() => {
        setIsRepayModalOpen(false);
        setRepaymentForm({ amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
        fetchDebts();
      })
      .catch(err => console.error('Error logging repayment:', err));
  };

  const handleSettleStatus = (id, currentStatus) => {
    const newStatus = currentStatus === 'pending' ? 'settled' : 'pending';
    authFetch(`/api/debts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })
      .then(() => fetchDebts())
      .catch(err => console.error('Error updating status:', err));
  };

  const handleDeleteDebt = (id) => {
    if (!window.confirm('Delete this debt record?')) return;
    authFetch(`/api/debts/${id}`, { method: 'DELETE' })
      .then(() => fetchDebts())
      .catch(err => console.error('Error deleting record:', err));
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Helper: Calc remaining debt balance
  const getRemainingDebt = (debt) => {
    const repaid = debt.repayments.reduce((sum, r) => sum + r.amount, 0);
    return Math.max(debt.amount - repaid, 0);
  };

  const totalGiven = debts
    .filter(d => d.type === 'given' && d.status === 'pending')
    .reduce((sum, d) => sum + getRemainingDebt(d), 0);

  const totalTaken = debts
    .filter(d => d.type === 'taken' && d.status === 'pending')
    .reduce((sum, d) => sum + getRemainingDebt(d), 0);

  return (
    <div>
      <div className="page-header">
        <div className="page-title-section">
          <h1>Friends & Family Ledger</h1>
          <p>Maintain tracking of interest-free hand-loans shared with friends, brother, or relatives.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
          <Plus size={18} />
          Record Hand Loan
        </button>
      </div>

      {/* Debt Metrics */}
      <div className="metrics-grid">
        <div className="glass-card metric-card">
          <div className="metric-header">
            <span className="metric-title">Total Lent Out (Receivable)</span>
            <ArrowUpRight size={20} style={{ color: 'var(--color-success)' }} />
          </div>
          <div>
            <h2 className="metric-value" style={{ color: 'var(--color-success)' }}>{formatCurrency(totalGiven)}</h2>
            <p className="metric-desc">Money given to friends/brother awaiting return</p>
          </div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-header">
            <span className="metric-title">Total Borrowed (Payable)</span>
            <ArrowDownRight size={20} style={{ color: 'var(--color-danger)' }} />
          </div>
          <div>
            <h2 className="metric-value" style={{ color: 'var(--color-danger)' }}>{formatCurrency(totalTaken)}</h2>
            <p className="metric-desc">Money taken from relatives/friends you need to return</p>
          </div>
        </div>
      </div>

      {/* Debt Ledgers list */}
      <div className="glass-card" style={{ padding: '1rem', marginBottom: '2rem' }}>
        <h3 style={{ margin: '1rem', color: 'white' }}>Pending Hand Loans</h3>
        {loading ? (
          <p style={{ margin: '2rem', color: 'var(--text-secondary)' }}>Loading ledger...</p>
        ) : debts.length === 0 ? (
          <p style={{ margin: '2rem', color: 'var(--text-muted)' }}>No hand loan balances recorded yet.</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Name</th>
                  <th>Relation</th>
                  <th>Original Amount</th>
                  <th>Remaining Balance</th>
                  <th>Date Occurred</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {debts.map(d => {
                  const rem = getRemainingDebt(d);
                  return (
                    <tr key={d._id}>
                      <td>
                        <span className={`badge ${d.type === 'given' ? 'badge-success' : 'badge-danger'}`} style={{ display: 'flex', width: 'fit-content', gap: '0.25rem', alignItems: 'center' }}>
                          {d.type === 'given' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                          {d.type === 'given' ? 'Given' : 'Taken'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{d.personName}</td>
                      <td><span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{d.relationship}</span></td>
                      <td>{formatCurrency(d.amount)}</td>
                      <td style={{ fontWeight: 600, color: rem > 0 ? 'white' : 'var(--text-muted)' }}>{formatCurrency(rem)}</td>
                      <td>{new Date(d.dateOccurred).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
                      <td>
                        {d.dueDate ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem' }}>
                            <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                            {new Date(d.dueDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${d.status === 'settled' ? 'badge-success' : 'badge-pending'}`}>
                          {d.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          {d.status === 'pending' && (
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }} 
                              onClick={() => {
                                setSelectedDebt(d);
                                setIsRepayModalOpen(true);
                              }}
                            >
                              <Plus size={14} /> Repayment
                            </button>
                          )}
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                            onClick={() => handleSettleStatus(d._id, d.status)}
                          >
                            {d.status === 'pending' ? 'Settle' : 'Reopen'}
                          </button>
                          <button className="btn btn-danger" style={{ padding: '0.4rem' }} onClick={() => handleDeleteDebt(d._id)}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Repayments History */}
      {!loading && debts.some(d => d.repayments.length > 0) && (
        <div className="glass-card">
          <h3 style={{ marginBottom: '1.25rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={18} style={{ color: 'var(--color-success)' }} />
            Repayment Log Ledger
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {debts.map(d => 
              d.repayments.map((r, rIdx) => (
                <div key={`${d._id}-${rIdx}`} style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                  <div>
                    <strong>{d.personName}</strong> repaid
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                      ({d.type === 'given' ? 'Received back' : 'Returned payment'})
                    </span>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{r.notes ? `"${r.notes}"` : 'Handover cash/online'}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>
                      {formatCurrency(r.amount)}
                    </span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(r.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal - Create Hand Loan */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ marginBottom: '1.5rem', color: 'white' }}>Record Hand Loan (No Interest)</h2>
            <form onSubmit={handleCreateDebt}>
              <div className="form-group">
                <label className="form-label">Transaction Direction</label>
                <select className="form-control" value={newDebt.type} onChange={(e) => setNewDebt({ ...newDebt, type: e.target.value })}>
                  <option value="given">Lent Out (Given to relative/friend)</option>
                  <option value="taken">Borrowed (Taken from friend/relative)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Person Name</label>
                <select 
                  className="form-control"
                  value={isNewContact ? '__new__' : newDebt.personName}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__new__') {
                      setIsNewContact(true);
                      setNewDebt({ ...newDebt, personName: '' });
                    } else {
                      setIsNewContact(false);
                      setNewDebt({ ...newDebt, personName: val });
                    }
                  }}
                >
                  <option value="">-- Select Contact from Vault --</option>
                  {dropdowns.contacts.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="__new__" style={{ color: 'var(--color-info)', fontWeight: 'bold' }}>+ Enter New Name...</option>
                </select>
              </div>

              {isNewContact && (
                <div className="form-group">
                  <label className="form-label">New Person's Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Enter full name"
                    required
                    value={newDebt.personName} 
                    onChange={(e) => setNewDebt({ ...newDebt, personName: e.target.value })}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Relationship</label>
                <select className="form-control" value={newDebt.relationship} onChange={(e) => setNewDebt({ ...newDebt, relationship: e.target.value })}>
                  <option value="brother">Brother</option>
                  <option value="friend">Friend</option>
                  <option value="relative">Relative</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Principal Amount (INR)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  required
                  placeholder="Enter amount"
                  value={newDebt.amount} 
                  onChange={(e) => setNewDebt({ ...newDebt, amount: parseFloat(e.target.value) || '' })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Lending Date</label>
                <input 
                  type="date" 
                  className="form-control" 
                  required
                  value={newDebt.dateOccurred} 
                  onChange={(e) => setNewDebt({ ...newDebt, dateOccurred: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Promise Return Date (Optional)</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={newDebt.dueDate} 
                  onChange={(e) => setNewDebt({ ...newDebt, dueDate: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea 
                  className="form-control" 
                  rows="2"
                  placeholder="Enter context, e.g. urgent medical help, business support"
                  value={newDebt.notes} 
                  onChange={(e) => setNewDebt({ ...newDebt, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Add Repayment */}
      {isRepayModalOpen && selectedDebt && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ marginBottom: '0.5rem', color: 'white' }}>Log Repayment Receipt</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Add return transaction for: <strong style={{ color: 'white' }}>{selectedDebt.personName}</strong>
            </p>
            <form onSubmit={handleAddRepayment}>
              <div className="form-group">
                <label className="form-label">Repayment Amount (INR)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  required
                  placeholder="Enter amount returned"
                  value={repaymentForm.amount} 
                  onChange={(e) => setRepaymentForm({ ...repaymentForm, amount: parseFloat(e.target.value) || '' })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Date Received / Paid</label>
                <input 
                  type="date" 
                  className="form-control" 
                  required
                  value={repaymentForm.date} 
                  onChange={(e) => setRepaymentForm({ ...repaymentForm, date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Mode / Remarks</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="UPI, Cash, Bank Transfer reference"
                  value={repaymentForm.notes} 
                  onChange={(e) => setRepaymentForm({ ...repaymentForm, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsRepayModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Log Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
