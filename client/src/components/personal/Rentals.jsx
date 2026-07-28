import { authFetch } from '../../utils/authFetch';
import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Calendar, Home, User, DollarSign, CalendarCheck, FileText } from 'lucide-react';

export default function Rentals() {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedRental, setSelectedRental] = useState(null);

  // Form State - Add Property
  const [propertyForm, setPropertyForm] = useState({
    buildingName: '',
    unitNumber: '',
    tenantName: '',
    tenantPhone: '',
    monthlyRent: '',
    notes: ''
  });

  // Form State - Add Payment
  const [paymentForm, setPaymentForm] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1, // 1-12
    amountPaid: '',
    status: 'paid',
    notes: '',
    datePaid: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchRentals();
  }, []);

  const fetchRentals = () => {
    setLoading(true);
    authFetch('/api/rentals')
      .then(res => res.json())
      .then(data => {
        setRentals(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching rental properties:', err);
        setLoading(false);
      });
  };

  const handleCreateProperty = (e) => {
    e.preventDefault();
    if (!propertyForm.buildingName || !propertyForm.unitNumber || !propertyForm.tenantName || !propertyForm.monthlyRent) {
      alert('Please fill out all required fields.');
      return;
    }

    authFetch('/api/rentals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(propertyForm)
    })
      .then(res => res.json())
      .then(() => {
        setIsPropertyModalOpen(false);
        setPropertyForm({ buildingName: '', unitNumber: '', tenantName: '', tenantPhone: '', monthlyRent: '', notes: '' });
        fetchRentals();
      })
      .catch(err => console.error('Error creating rental building:', err));
  };

  const handleAddPayment = (e) => {
    e.preventDefault();
    if (!paymentForm.amountPaid || !paymentForm.year || !paymentForm.month) {
      alert('Please fill out amount, year and month.');
      return;
    }

    authFetch(`/api/rentals/${selectedRental._id}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentForm)
    })
      .then(res => res.json())
      .then(() => {
        setIsPaymentModalOpen(false);
        setPaymentForm({
          year: new Date().getFullYear(),
          month: new Date().getMonth() + 1,
          amountPaid: '',
          status: 'paid',
          notes: '',
          datePaid: new Date().toISOString().split('T')[0]
        });
        fetchRentals();
      })
      .catch(err => console.error('Error adding rental payment:', err));
  };

  const handleDeleteProperty = (id) => {
    if (!window.confirm('Delete this rental property and all historical rent payment books?')) return;
    authFetch(`/api/rentals/${id}`, { method: 'DELETE' })
      .then(() => fetchRentals())
      .catch(err => console.error('Error deleting rental unit:', err));
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const getMonthName = (monthNumber) => {
    const date = new Date();
    date.setMonth(monthNumber - 1);
    return date.toLocaleString('en-IN', { month: 'long' });
  };

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const totalMonthlyExpectation = rentals.reduce((sum, r) => sum + r.monthlyRent, 0);
  
  const totalMonthlyCollected = rentals.reduce((sum, r) => {
    const currentPay = r.payments.find(p => p.year === currentYear && p.month === currentMonth);
    return sum + (currentPay ? currentPay.amountPaid : 0);
  }, 0);

  const pendingCollection = totalMonthlyExpectation - totalMonthlyCollected;

  return (
    <div>
      <div className="page-header">
        <div className="page-title-section">
          <h1>Rental Income Ledger</h1>
          <p>Track rented buildings, commercial stores, flat leases, tenant books, and monthly rent collections.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsPropertyModalOpen(true)}>
          <Plus size={18} />
          Register Rental Unit
        </button>
      </div>

      {/* Rental Metrics */}
      <div className="metrics-grid">
        <div className="glass-card metric-card">
          <div className="metric-header">
            <span className="metric-title">Monthly Rental Target</span>
            <Home size={20} style={{ color: 'var(--color-info)' }} />
          </div>
          <div>
            <h2 className="metric-value" style={{ color: 'var(--color-info)' }}>{formatCurrency(totalMonthlyExpectation)}</h2>
            <p className="metric-desc">Expected rent from all active lease agreements</p>
          </div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-header">
            <span className="metric-title">Collected (Current Month)</span>
            <CalendarCheck size={20} style={{ color: 'var(--color-success)' }} />
          </div>
          <div>
            <h2 className="metric-value" style={{ color: 'var(--color-success)' }}>{formatCurrency(totalMonthlyCollected)}</h2>
            <p className="metric-desc">Rent payments cleared for {getMonthName(currentMonth)} {currentYear}</p>
          </div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-header">
            <span className="metric-title">Outstanding (Current Month)</span>
            <DollarSign size={20} style={{ color: 'var(--color-danger)' }} />
          </div>
          <div>
            <h2 className="metric-value" style={{ color: 'var(--color-danger)' }}>{formatCurrency(pendingCollection)}</h2>
            <p className="metric-desc">Balance yet to be collected this month</p>
          </div>
        </div>
      </div>

      {/* Properties List */}
      <h3 style={{ marginBottom: '1.5rem', color: 'white' }}>Rental Estates</h3>
      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading rental database...</p>
      ) : rentals.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>No rental units set up. Register a building to track lease cash flows.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {rentals.map(rental => {
            const currentMonthPayment = rental.payments.find(p => p.year === currentYear && p.month === currentMonth);
            const unpaidRentStatus = !currentMonthPayment;

            return (
              <div key={rental._id} className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
                      {rental.buildingName} — Unit {rental.unitNumber}
                    </h3>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <span>Tenant: <strong>{rental.tenantName}</strong></span>
                      {rental.tenantPhone && <span>Phone: {rental.tenantPhone}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className={`badge ${currentMonthPayment?.status === 'paid' ? 'badge-success' : currentMonthPayment?.status === 'partial' ? 'badge-warning' : 'badge-danger'}`}>
                      {currentMonthPayment ? `This Month: ${currentMonthPayment.status}` : 'This Month: Unpaid'}
                    </span>
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                      onClick={() => {
                        setSelectedRental(rental);
                        setIsPaymentModalOpen(true);
                      }}
                    >
                      <Plus size={14} /> Log Payment
                    </button>
                    <button className="btn btn-danger" style={{ padding: '0.4rem' }} onClick={() => handleDeleteProperty(rental._id)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div style={{ margin: '1rem 0', display: 'flex', gap: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Monthly Rent</span>
                    <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-info)' }}>{formatCurrency(rental.monthlyRent)}</p>
                  </div>
                  {currentMonthPayment && (
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Amount Cleared</span>
                      <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-success)' }}>{formatCurrency(currentMonthPayment.amountPaid)}</p>
                    </div>
                  )}
                </div>

                {/* Historical collection log */}
                <h4 style={{ marginBottom: '0.5rem', color: 'white', fontSize: '0.95rem' }}>Collection Ledger</h4>
                {rental.payments.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>No rent collections logged yet.</p>
                ) : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Rent Period</th>
                          <th>Date Paid</th>
                          <th>Status</th>
                          <th>Notes</th>
                          <th>Amount Received</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rental.payments.map((p, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600 }}>{getMonthName(p.month)} {p.year}</td>
                            <td>{new Date(p.datePaid).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
                            <td>
                              <span className={`badge ${p.status === 'paid' ? 'badge-success' : p.status === 'partial' ? 'badge-warning' : 'badge-danger'}`}>
                                {p.status}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{p.notes || '—'}</td>
                            <td style={{ fontWeight: 700, color: 'var(--color-success)' }}>+{formatCurrency(p.amountPaid)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal - Register Property */}
      {isPropertyModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ marginBottom: '1.5rem', color: 'white' }}>Register Rental Property</h2>
            <form onSubmit={handleCreateProperty}>
              <div className="form-group">
                <label className="form-label">Building / Estate Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Commercial Complex Sector 5, Mahesh Villa"
                  required
                  value={propertyForm.buildingName} 
                  onChange={(e) => setPropertyForm({ ...propertyForm, buildingName: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Unit Number / Shop Number</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Shop A, Flat 302"
                  required
                  value={propertyForm.unitNumber} 
                  onChange={(e) => setPropertyForm({ ...propertyForm, unitNumber: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label">Tenant Full Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Enter name"
                    required
                    value={propertyForm.tenantName} 
                    onChange={(e) => setPropertyForm({ ...propertyForm, tenantName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Tenant Phone Contact</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Enter number"
                    value={propertyForm.tenantPhone} 
                    onChange={(e) => setPropertyForm({ ...propertyForm, tenantPhone: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Monthly Rental Amount (INR)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  placeholder="e.g. 15,000"
                  required
                  value={propertyForm.monthlyRent} 
                  onChange={(e) => setPropertyForm({ ...propertyForm, monthlyRent: parseFloat(e.target.value) || '' })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Agreement Remarks</label>
                <textarea 
                  className="form-control" 
                  rows="2"
                  placeholder="e.g. 1-year agreement, security deposit 50k"
                  value={propertyForm.notes} 
                  onChange={(e) => setPropertyForm({ ...propertyForm, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsPropertyModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Estate Property
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Log Payment */}
      {isPaymentModalOpen && selectedRental && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ marginBottom: '0.5rem', color: 'white' }}>Log Rent Received</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Recording transaction for: <strong style={{ color: 'white' }}>{selectedRental.tenantName} ({selectedRental.buildingName} - {selectedRental.unitNumber})</strong>
            </p>
            <form onSubmit={handleAddPayment}>
              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label">Year</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    required
                    value={paymentForm.year} 
                    onChange={(e) => setPaymentForm({ ...paymentForm, year: parseInt(e.target.value) || new Date().getFullYear() })}
                  />
                </div>
                <div>
                  <label className="form-label">Month</label>
                  <select 
                    className="form-control" 
                    value={paymentForm.month} 
                    onChange={(e) => setPaymentForm({ ...paymentForm, month: parseInt(e.target.value) || 1 })}
                  >
                    <option value={1}>January</option>
                    <option value={2}>February</option>
                    <option value={3}>March</option>
                    <option value={4}>April</option>
                    <option value={5}>May</option>
                    <option value={6}>June</option>
                    <option value={7}>July</option>
                    <option value={8}>August</option>
                    <option value={9}>September</option>
                    <option value={10}>October</option>
                    <option value={11}>November</option>
                    <option value={12}>December</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Amount Paid (INR)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  required
                  placeholder={`Monthly rent is ${formatCurrency(selectedRental.monthlyRent)}`}
                  value={paymentForm.amountPaid} 
                  onChange={(e) => setPaymentForm({ ...paymentForm, amountPaid: parseFloat(e.target.value) || '' })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Status</label>
                <select className="form-control" value={paymentForm.status} onChange={(e) => setPaymentForm({ ...paymentForm, status: e.target.value })}>
                  <option value="paid">Fully Paid</option>
                  <option value="partial">Partially Paid</option>
                  <option value="unpaid">Unpaid / Bounce</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Payment Date</label>
                <input 
                  type="date" 
                  className="form-control" 
                  required
                  value={paymentForm.datePaid} 
                  onChange={(e) => setPaymentForm({ ...paymentForm, datePaid: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Remarks</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="UPI, Cash, bank transfer transaction reference"
                  value={paymentForm.notes} 
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsPaymentModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Log Collection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
