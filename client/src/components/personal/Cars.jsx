import { authFetch } from '../../utils/authFetch';
import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Calendar, Wrench, Shield, Car as CarIcon, Gauge, MapPin } from 'lucide-react';

export default function Cars() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCarModalOpen, setIsCarModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [selectedCar, setSelectedCar] = useState(null);
  const [dropdowns, setDropdowns] = useState({ cars: [], insurances: [], projects: [], rentals: [], contacts: [] });

  // Form State - Add Car
  const [carForm, setCarForm] = useState({
    name: '',
    plateNumber: '',
    insuranceProvider: '',
    insuranceDueDate: '',
    notes: ''
  });

  // Form State - Add Service Log
  const [serviceForm, setServiceForm] = useState({
    serviceType: 'general_service',
    cost: '',
    odometer: '',
    serviceCenter: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchCars();
    fetchDropdowns();
  }, []);

  const fetchDropdowns = () => {
    authFetch('/api/dropdowns')
      .then(res => res.json())
      .then(data => setDropdowns(data))
      .catch(err => console.error('Error fetching dropdowns:', err));
  };

  const fetchCars = () => {
    setLoading(true);
    authFetch('/api/cars')
      .then(res => res.json())
      .then(data => {
        setCars(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching cars:', err);
        setLoading(false);
      });
  };

  const handleCreateCar = (e) => {
    e.preventDefault();
    if (!carForm.name) {
      alert('Please enter a vehicle name.');
      return;
    }

    authFetch('/api/cars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(carForm)
    })
      .then(res => res.json())
      .then(() => {
        setIsCarModalOpen(false);
        setCarForm({ name: '', plateNumber: '', insuranceProvider: '', insuranceDueDate: '', notes: '' });
        fetchCars();
      })
      .catch(err => console.error('Error creating car:', err));
  };

  const handleAddService = (e) => {
    e.preventDefault();
    if (!serviceForm.cost) {
      alert('Please fill out service cost.');
      return;
    }

    authFetch(`/api/cars/${selectedCar._id}/maintenance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(serviceForm)
    })
      .then(res => res.json())
      .then(() => {
        setIsServiceModalOpen(false);
        setServiceForm({ serviceType: 'general_service', cost: '', odometer: '', serviceCenter: '', notes: '', date: new Date().toISOString().split('T')[0] });
        fetchCars();
      })
      .catch(err => console.error('Error adding service details:', err));
  };

  const handleDeleteCar = (id) => {
    if (!window.confirm('Remove this vehicle and all maintenance histories?')) return;
    authFetch(`/api/cars/${id}`, { method: 'DELETE' })
      .then(() => fetchCars())
      .catch(err => console.error('Error deleting car:', err));
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-section">
          <h1>Vehicle Fleet & Maintenance</h1>
          <p>Track your cars, maintenance logs, general repairs, Tata AIG insurance policies, and mileage records.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsCarModalOpen(true)}>
          <Plus size={18} />
          Register New Car
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading cars database...</p>
      ) : cars.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>No cars registered yet. Add a car to log services and insurance updates.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {cars.map(car => {
            const totalMaintenanceCost = car.maintenanceLog.reduce((sum, log) => sum + log.cost, 0);
            const latestOdo = car.maintenanceLog.length > 0 ? Math.max(...car.maintenanceLog.map(l => l.odometer || 0)) : 0;

            return (
              <div key={car._id} className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ 
                      width: '50px', 
                      height: '50px', 
                      borderRadius: 'var(--border-radius-sm)', 
                      background: 'var(--color-primary-glow)', 
                      color: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <CarIcon size={28} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.4rem', color: 'white' }}>{car.name}</h2>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Plate: {car.plateNumber || 'Not Specified'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                      onClick={() => {
                        setSelectedCar(car);
                        setIsServiceModalOpen(true);
                      }}
                    >
                      <Plus size={16} /> Log Service
                    </button>
                    <button className="btn btn-danger" style={{ padding: '0.5rem' }} onClick={() => handleDeleteCar(car._id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Car stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Wrench size={20} style={{ color: 'var(--color-accent)' }} />
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Maintenance Cost</span>
                      <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{formatCurrency(totalMaintenanceCost)}</p>
                    </div>
                  </div>

                  {latestOdo > 0 && (
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Gauge size={20} style={{ color: 'var(--color-info)' }} />
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Latest Odometer Reading</span>
                        <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{latestOdo.toLocaleString()} km</p>
                      </div>
                    </div>
                  )}

                  {car.insuranceProvider && (
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Shield size={20} style={{ color: 'var(--color-success)' }} />
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Insurance ({car.insuranceProvider})</span>
                        <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'white' }}>
                          Due: {car.insuranceDueDate ? new Date(car.insuranceDueDate).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Maintenance Logs List */}
                <h4 style={{ marginBottom: '0.75rem', color: 'white' }}>Maintenance & Repairs Log</h4>
                {car.maintenanceLog.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>No service entries recorded yet for this vehicle.</p>
                ) : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Service Type</th>
                          <th>Odometer</th>
                          <th>Service Center</th>
                          <th>Notes</th>
                          <th>Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {car.maintenanceLog.map((log, idx) => (
                          <tr key={idx}>
                            <td>{new Date(log.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
                            <td>
                              <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>
                                {log.serviceType.replace('_', ' ')}
                              </span>
                            </td>
                            <td>{log.odometer ? `${log.odometer.toLocaleString()} km` : '—'}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem' }}>
                                <MapPin size={12} style={{ color: 'var(--text-muted)' }} />
                                {log.serviceCenter || '—'}
                              </div>
                            </td>
                            <td style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>{log.notes || '—'}</td>
                            <td style={{ fontWeight: 600, color: 'var(--color-danger)' }}>-{formatCurrency(log.cost)}</td>
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

      {/* Modal - Add Car */}
      {isCarModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ marginBottom: '1.5rem', color: 'white' }}>Register Vehicle</h2>
            <form onSubmit={handleCreateCar}>
              <div className="form-group">
                <label className="form-label">Vehicle Name (Make & Model)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Tata Harrier, Swift Dzire"
                  required
                  value={carForm.name} 
                  onChange={(e) => setCarForm({ ...carForm, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">License Plate Number</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. AP 39 AB 1234"
                  value={carForm.plateNumber} 
                  onChange={(e) => setCarForm({ ...carForm, plateNumber: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Link Active Car Insurance Policy</label>
                <select 
                  className="form-control"
                  value={carForm.insuranceProvider ? `${carForm.insuranceProvider}|||${carForm.insuranceDueDate ? carForm.insuranceDueDate.split('T')[0] : ''}` : ''}
                  onChange={(e) => {
                    const selectedVal = e.target.value;
                    if (selectedVal) {
                      const [provider, dueDate] = selectedVal.split('|||');
                      setCarForm({ ...carForm, insuranceProvider: provider, insuranceDueDate: dueDate });
                    } else {
                      setCarForm({ ...carForm, insuranceProvider: '', insuranceDueDate: '' });
                    }
                  }}
                >
                  <option value="">-- Select Insurance Policy from Vault --</option>
                  {dropdowns.insurances.filter(i => i.type === 'car').map(i => (
                    <option key={i._id} value={`${i.provider}|||${i.dueDate ? i.dueDate.split('T')[0] : ''}`}>
                      {i.provider} - {i.policyName} (Due: {i.dueDate ? new Date(i.dueDate).toLocaleDateString('en-IN') : '—'})
                    </option>
                  ))}
                </select>
              </div>

              {carForm.insuranceProvider && (
                <div style={{ background: 'var(--color-success-glow)', color: 'var(--color-success)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                  Linked Insurance: <strong>{carForm.insuranceProvider}</strong> (Due: {carForm.insuranceDueDate ? new Date(carForm.insuranceDueDate).toLocaleDateString('en-IN') : '—'})
                </div>
              )}

              <div className="form-group">
                <label className="form-label">General Notes / Registration Details</label>
                <textarea 
                  className="form-control" 
                  rows="2"
                  value={carForm.notes} 
                  onChange={(e) => setCarForm({ ...carForm, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCarModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Register Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Log Service */}
      {isServiceModalOpen && selectedCar && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ marginBottom: '0.5rem', color: 'white' }}>Log Service Invoice</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Add maintenance record for: <strong style={{ color: 'white' }}>{selectedCar.name}</strong>
            </p>
            <form onSubmit={handleAddService}>
              <div className="form-group">
                <label className="form-label">Service Type</label>
                <select className="form-control" value={serviceForm.serviceType} onChange={(e) => setServiceForm({ ...serviceForm, serviceType: e.target.value })}>
                  <option value="general_service">Scheduled General Service</option>
                  <option value="repair">Breakdown / Engine / Body Repair</option>
                  <option value="insurance_claim">Insurance Claim Work</option>
                  <option value="other">Other Accessories / Spares / Washing</option>
                </select>
              </div>

              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label">Total Cost (INR)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    required
                    placeholder="Enter cost"
                    value={serviceForm.cost} 
                    onChange={(e) => setServiceForm({ ...serviceForm, cost: parseFloat(e.target.value) || '' })}
                  />
                </div>
                <div>
                  <label className="form-label">Odometer Reading (km)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="e.g. 45000"
                    value={serviceForm.odometer} 
                    onChange={(e) => setServiceForm({ ...serviceForm, odometer: parseInt(e.target.value) || '' })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Service Station Name / Location</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Varun Motors, Maruti Authorized Service"
                  value={serviceForm.serviceCenter} 
                  onChange={(e) => setServiceForm({ ...serviceForm, serviceCenter: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Date of Service</label>
                <input 
                  type="date" 
                  className="form-control" 
                  required
                  value={serviceForm.date} 
                  onChange={(e) => setServiceForm({ ...serviceForm, date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Work Done & Spares Changed Details</label>
                <textarea 
                  className="form-control" 
                  rows="3"
                  placeholder="e.g. Engine oil replaced, front brake pads changed, wheel alignment done"
                  value={serviceForm.notes} 
                  onChange={(e) => setServiceForm({ ...serviceForm, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsServiceModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Log Service Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
