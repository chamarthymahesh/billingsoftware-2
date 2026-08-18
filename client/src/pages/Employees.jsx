import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Search, DollarSign, Calendar, FileText, Trash2, Edit2, History, Wallet, UserCheck, Building2, TrendingUp, AlertCircle, ArrowUpRight } from 'lucide-react';
import './Employees.css';

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [history, setHistory] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'history'
  
  // Modals
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedEmpForLedger, setSelectedEmpForLedger] = useState(null);

  const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
  const isSuperAdmin = userInfo?.role === "Super Admin";
  const authHeader = { Authorization: `Bearer ${userInfo?.token}` };

  const [empForm, setEmpForm] = useState({
    name: '',
    designation: '',
    phone: '',
    email: '',
    salaryAmount: '',
    companyId: '',
    isActive: true,
  });

  const [payForm, setPayForm] = useState({
    employeeId: '',
    companyId: '',
    type: 'Salary', // 'Salary', 'Advance', 'Bonus', 'Deduction'
    month: '',
    amountPaid: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Bank Transfer',
    notes: '',
  });

  // Fetch Companies
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await axios.get(`${API}/api/companies`, { headers: authHeader });
        setCompanies(res.data);
        if (isSuperAdmin) {
          setSelectedCompany("ALL");
        } else if (res.data.length > 0) {
          setSelectedCompany(res.data[0]._id);
        }
      } catch (err) {
        console.error("Error fetching companies:", err);
      }
    };
    fetchCompanies();
  }, []);

  // Fetch Employees and Salary History
  useEffect(() => {
    fetchData();
  }, [activeTab, selectedCompany]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let compParam = selectedCompany ? `?companyId=${selectedCompany}` : '';
      if (activeTab === 'list') {
        const { data } = await axios.get(`${API}/api/employees${compParam}`, { headers: authHeader });
        setEmployees(data);
      } else {
        const { data } = await axios.get(`${API}/api/employees/salary${compParam}`, { headers: authHeader });
        setHistory(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Open Add / Edit Staff Modal
  const openEmpModal = (emp = null) => {
    if (emp) {
      setEditingEmp(emp);
      setEmpForm({
        name: emp.name || '',
        designation: emp.designation || '',
        phone: emp.phone || '',
        email: emp.email || '',
        salaryAmount: emp.salaryAmount || '',
        companyId: emp.companyId?._id || emp.companyId || (companies[0]?._id || ''),
        isActive: emp.isActive !== false,
      });
    } else {
      setEditingEmp(null);
      setEmpForm({
        name: '',
        designation: '',
        phone: '',
        email: '',
        salaryAmount: '',
        companyId: (selectedCompany && selectedCompany !== 'ALL') ? selectedCompany : (companies[0]?._id || ''),
        isActive: true,
      });
    }
    setShowEmpModal(true);
  };

  // Submit Employee Add/Edit
  const handleEmpSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingEmp) {
        await axios.put(`${API}/api/employees/${editingEmp._id}`, empForm, { headers: authHeader });
      } else {
        await axios.post(`${API}/api/employees`, empForm, { headers: authHeader });
      }
      setShowEmpModal(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving staff member');
    }
  };

  // Delete Employee
  const handleDeleteEmp = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete staff member "${name}" and their salary/advance history?`)) return;
    try {
      await axios.delete(`${API}/api/employees/${id}`, { headers: authHeader });
      setEmployees(prev => prev.filter(e => e._id !== id));
    } catch (err) {
      alert('Error deleting employee');
    }
  };

  // Open Pay Salary / Advance Modal
  const openPayModal = (emp, defaultType = 'Salary') => {
    const currentMonthStr = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    setPayForm({
      employeeId: emp._id,
      companyId: emp.companyId?._id || emp.companyId || (companies[0]?._id || ''),
      type: defaultType,
      month: currentMonthStr,
      amountPaid: defaultType === 'Salary' ? emp.salaryAmount : '',
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'Bank Transfer',
      notes: defaultType === 'Advance' ? 'Salary Advance' : ''
    });
    setShowPayModal(true);
  };

  // Submit Payment / Advance Entry
  const handlePaySubmit = async (e) => {
    e.preventDefault();
    if (!payForm.amountPaid || Number(payForm.amountPaid) <= 0) {
      return alert("Please enter a valid amount");
    }
    try {
      await axios.post(`${API}/api/employees/salary`, payForm, { headers: authHeader });
      setShowPayModal(false);
      fetchData();
      alert(`${payForm.type} payment recorded successfully!`);
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving salary payment');
    }
  };

  // Delete Salary Record
  const handleDeleteSalaryRecord = async (id) => {
    if (!window.confirm("Are you sure you want to delete this payment/advance record entry?")) return;
    try {
      await axios.delete(`${API}/api/employees/salary/${id}`, { headers: authHeader });
      setHistory(prev => prev.filter(h => h._id !== id));
    } catch (err) {
      alert('Error deleting salary record');
    }
  };

  // Filter staff list
  const filteredEmployees = employees.filter(emp => {
    const q = searchQuery.toLowerCase();
    return (emp.name || '').toLowerCase().includes(q) ||
           (emp.designation || '').toLowerCase().includes(q) ||
           (emp.phone || '').toLowerCase().includes(q);
  });

  // Filter history list
  const filteredHistory = history.filter(rec => {
    const q = searchQuery.toLowerCase();
    const empName = rec.employeeId?.name || '';
    const month = rec.month || '';
    return empName.toLowerCase().includes(q) || month.toLowerCase().includes(q) || (rec.type || '').toLowerCase().includes(q);
  });

  // Overall Statistics
  const totalEmployees = employees.length;
  const totalMonthlySalaryBudget = employees.reduce((sum, e) => sum + (e.salaryAmount || 0), 0);
  const totalAdvancesGivenOverall = employees.reduce((sum, e) => sum + (e.totalAdvanceTaken || 0), 0);
  const totalSalaryPaidOverall = employees.reduce((sum, e) => sum + (e.totalSalaryPaid || 0), 0);

  // Helper for Payment Type Styling
  const getTypeBadge = (type) => {
    switch (type) {
      case 'Advance':
        return <span className="type-badge advance">💸 Advance</span>;
      case 'Bonus':
        return <span className="type-badge bonus">🎁 Bonus</span>;
      case 'Deduction':
        return <span className="type-badge deduction">➖ Deduction</span>;
      default:
        return <span className="type-badge salary">💳 Salary</span>;
    }
  };

  return (
    <div className="employees-container">
      {/* Top Header */}
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Staff & Salary Management</h1>
          <p className="page-subtitle">Track staff salaries, record advances, manage payouts & complete history</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {companies.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Company:</span>
              <select
                className="sl-company-select"
                style={{ padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff' }}
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
              >
                {isSuperAdmin && <option value="ALL">All Companies</option>}
                {companies.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          <button className="btn-primary" onClick={() => openEmpModal()}>
            <Plus size={16} /> Add Staff Member
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="kpi-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', width: '48px', height: '48px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Active Staff</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff' }}>{totalEmployees} Members</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>₹{totalMonthlySalaryBudget.toLocaleString('en-IN')} monthly budget</div>
          </div>
        </div>

        <div className="kpi-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', width: '48px', height: '48px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wallet size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Total Advances Given</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f59e0b' }}>₹{totalAdvancesGivenOverall.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Staff advance payments</div>
          </div>
        </div>

        <div className="kpi-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', width: '48px', height: '48px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Total Salary Disbursed</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>₹{totalSalaryPaidOverall.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Cumulative salary payouts</div>
          </div>
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div className="tab-container" style={{ margin: 0 }}>
          <button className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>
            👥 Staff Directory & Advances
          </button>
          <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
            📜 All Salary & Advance Logs
          </button>
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder={activeTab === 'list' ? "Search staff name, phone..." : "Search history..."}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 36px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff', fontSize: '13px' }}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="glass-card animate-fade-in">
        {loading ? (
          <div className="loading-state">Loading payroll data...</div>
        ) : (
          <div className="table-wrap">
            {activeTab === 'list' ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Staff Member</th>
                    {isSuperAdmin && <th>Company</th>}
                    <th>Designation</th>
                    <th>Monthly Salary</th>
                    <th>Advances Taken</th>
                    <th>Total Disbursed</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.length === 0 ? (
                    <tr><td colSpan="8" className="empty-row">No staff records found. Click "+ Add Staff Member" to begin.</td></tr>
                  ) : (
                    filteredEmployees.map(emp => (
                      <tr key={emp._id}>
                        <td>
                          <div className="emp-name-cell">
                            <div className="emp-avatar">{emp.name?.charAt(0).toUpperCase()}</div>
                            <div>
                              <div style={{ fontWeight: 'bold', color: '#fff' }}>{emp.name}</div>
                              <div style={{ fontSize: '12px', color: '#94a3b8' }}>{emp.phone || emp.email || 'No contact'}</div>
                            </div>
                          </div>
                        </td>
                        {isSuperAdmin && (
                          <td>
                            <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
                              {emp.companyId?.name || 'N/A'}
                            </span>
                          </td>
                        )}
                        <td>{emp.designation || 'Staff'}</td>
                        <td className="amount-cell">₹{(emp.salaryAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td>
                          {(emp.totalAdvanceTaken || 0) > 0 ? (
                            <span className="advance-pill">
                              💸 ₹{(emp.totalAdvanceTaken).toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span style={{ color: '#64748b', fontSize: '12px' }}>₹0</span>
                          )}
                        </td>
                        <td className="amount-cell positive">
                          ₹{(emp.totalPaidOverall || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td>
                          <span className={`status-badge ${emp.isActive ? 'active' : 'inactive'}`}>
                            {emp.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              className="btn-pay"
                              onClick={() => openPayModal(emp, 'Salary')}
                              title="Pay Salary"
                            >
                              💳 Pay Salary
                            </button>
                            <button
                              className="btn-advance"
                              onClick={() => openPayModal(emp, 'Advance')}
                              title="Give Advance"
                            >
                              💸 Give Advance
                            </button>
                            <button
                              className="btn-icon"
                              onClick={() => setSelectedEmpForLedger(emp)}
                              title="View Payment Ledger"
                              style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                            >
                              <History size={15} />
                            </button>
                            <button
                              className="btn-icon"
                              onClick={() => openEmpModal(emp)}
                              title="Edit Employee"
                              style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              className="btn-icon"
                              onClick={() => handleDeleteEmp(emp._id, emp.name)}
                              title="Delete Employee"
                              style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Staff Member</th>
                    {isSuperAdmin && <th>Company</th>}
                    <th>For Month / Period</th>
                    <th>Amount Paid</th>
                    <th>Method</th>
                    <th>Notes</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.length === 0 ? (
                    <tr><td colSpan="9" className="empty-row">No payment history records found</td></tr>
                  ) : (
                    filteredHistory.map(rec => (
                      <tr key={rec._id}>
                        <td>{new Date(rec.paymentDate).toLocaleDateString('en-IN')}</td>
                        <td>{getTypeBadge(rec.type)}</td>
                        <td>
                          <div className="emp-info">
                            <strong style={{ color: '#fff' }}>{rec.employeeId?.name || 'Staff Member'}</strong>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{rec.employeeId?.designation}</div>
                          </div>
                        </td>
                        {isSuperAdmin && (
                          <td>
                            <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
                              {rec.companyId?.name || 'N/A'}
                            </span>
                          </td>
                        )}
                        <td><span className="month-badge">{rec.month}</span></td>
                        <td className={`amount-cell ${rec.type === 'Advance' ? 'advance-amount' : 'positive'}`}>
                          ₹{rec.amountPaid?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td>{rec.paymentMethod}</td>
                        <td style={{ fontSize: '12px', color: '#cbd5e1' }}>{rec.notes || '-'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => handleDeleteSalaryRecord(rec._id)}
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                            title="Delete entry"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Employee Modal */}
      {showEmpModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h2>{editingEmp ? "Edit Staff Member" : "Add New Staff Member"}</h2>
              <button className="close-btn" onClick={() => setShowEmpModal(false)}>✕</button>
            </div>
            <form onSubmit={handleEmpSubmit} className="modal-form">
              <div className="form-grid-2">
                {isSuperAdmin && (
                  <div className="form-group full-width">
                    <label>Company *</label>
                    <select
                      className="input-field"
                      required
                      value={empForm.companyId}
                      onChange={e => setEmpForm({...empForm, companyId: e.target.value})}
                    >
                      {companies.map(c => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    className="input-field"
                    required
                    value={empForm.name}
                    onChange={e => setEmpForm({...empForm, name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Designation</label>
                  <input
                    className="input-field"
                    placeholder="e.g. Accountant, Driver, Manager"
                    value={empForm.designation}
                    onChange={e => setEmpForm({...empForm, designation: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Monthly Salary (₹) *</label>
                  <input
                    type="number"
                    className="input-field"
                    required
                    value={empForm.salaryAmount}
                    onChange={e => setEmpForm({...empForm, salaryAmount: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    className="input-field"
                    value={empForm.phone}
                    onChange={e => setEmpForm({...empForm, phone: e.target.value})}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Email Address</label>
                  <input
                    type="email"
                    className="input-field"
                    value={empForm.email}
                    onChange={e => setEmpForm({...empForm, email: e.target.value})}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowEmpModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">💾 Save Staff Member</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Salary / Salary Advance Modal */}
      {showPayModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card small-modal">
            <div className="modal-header">
              <h2>Record Payment / Advance</h2>
              <button className="close-btn" onClick={() => setShowPayModal(false)}>✕</button>
            </div>
            <form onSubmit={handlePaySubmit} className="modal-form">
              {/* Payment Type Switcher */}
              <div className="form-group">
                <label>Payment Category *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                  <button
                    type="button"
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: payForm.type === 'Salary' ? '2px solid #10b981' : '1px solid var(--border)',
                      background: payForm.type === 'Salary' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-elevated)',
                      color: payForm.type === 'Salary' ? '#10b981' : '#94a3b8',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                    onClick={() => setPayForm({ ...payForm, type: 'Salary' })}
                  >
                    💳 Regular Salary
                  </button>
                  <button
                    type="button"
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: payForm.type === 'Advance' ? '2px solid #f59e0b' : '1px solid var(--border)',
                      background: payForm.type === 'Advance' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-elevated)',
                      color: payForm.type === 'Advance' ? '#f59e0b' : '#94a3b8',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                    onClick={() => setPayForm({ ...payForm, type: 'Advance' })}
                  >
                    💸 Salary Advance
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Month / Period *</label>
                <input
                  className="input-field"
                  placeholder="e.g. May 2026"
                  required
                  value={payForm.month}
                  onChange={e => setPayForm({...payForm, month: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Amount Paid (₹) *</label>
                <input
                  type="number"
                  step="any"
                  className="input-field"
                  required
                  value={payForm.amountPaid}
                  onChange={e => setPayForm({...payForm, amountPaid: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Payment Date</label>
                <input
                  type="date"
                  className="input-field"
                  value={payForm.paymentDate}
                  onChange={e => setPayForm({...payForm, paymentDate: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Payment Method</label>
                <select
                  className="input-field"
                  value={payForm.paymentMethod}
                  onChange={e => setPayForm({...payForm, paymentMethod: e.target.value})}
                >
                  <option value="Bank Transfer">🏦 Bank Transfer</option>
                  <option value="Cash">💵 Cash</option>
                  <option value="UPI">📱 UPI / Online</option>
                  <option value="Cheque">🎫 Cheque</option>
                </select>
              </div>

              <div className="form-group">
                <label>Notes / Description</label>
                <textarea
                  className="input-field"
                  rows="2"
                  placeholder={payForm.type === 'Advance' ? "e.g. Advance taken for personal emergency" : "e.g. Full month salary payment"}
                  value={payForm.notes}
                  onChange={e => setPayForm({...payForm, notes: e.target.value})}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowPayModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">✅ Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Specific Salary & Advance History Ledger Modal */}
      {selectedEmpForLedger && (
        <EmployeeLedgerModal
          emp={selectedEmpForLedger}
          onClose={() => setSelectedEmpForLedger(null)}
          authHeader={authHeader}
        />
      )}
    </div>
  );
}

// Sub-component: Employee Ledger Modal for detailed advances & salary timeline
function EmployeeLedgerModal({ emp, onClose, authHeader }) {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLedger = async () => {
      try {
        const { data } = await axios.get(`${API}/api/employees/salary?employeeId=${emp._id}`, { headers: authHeader });
        setLedger(data);
      } catch (err) {
        console.error("Error loading employee ledger:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLedger();
  }, [emp._id]);

  const totalAdvance = ledger.filter(r => r.type === 'Advance').reduce((sum, r) => sum + (r.amountPaid || 0), 0);
  const totalSalary = ledger.filter(r => r.type === 'Salary' || !r.type).reduce((sum, r) => sum + (r.amountPaid || 0), 0);
  const totalPaid = totalAdvance + totalSalary;

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-card" style={{ maxWidth: '700px', width: '90%' }}>
        <div className="modal-header">
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              📜 Salary & Advance Ledger
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
              {emp.name} ({emp.designation || 'Staff'}) — Base Salary: ₹{(emp.salaryAmount || 0).toLocaleString('en-IN')}/mo
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Individual Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', margin: '16px 0', background: 'var(--bg-elevated)', padding: '12px', borderRadius: '8px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Total Salary Paid</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#10b981' }}>₹{totalSalary.toLocaleString('en-IN')}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Total Advances Taken</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#f59e0b' }}>₹{totalAdvance.toLocaleString('en-IN')}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Net Overall Disbursed</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#60a5fa' }}>₹{totalPaid.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Loading ledger...</div>
          ) : ledger.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No payment or advance entries recorded yet for {emp.name}.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Month/Period</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map(item => (
                  <tr key={item._id}>
                    <td>{new Date(item.paymentDate).toLocaleDateString('en-IN')}</td>
                    <td>
                      <span className={`type-badge ${item.type === 'Advance' ? 'advance' : 'salary'}`}>
                        {item.type === 'Advance' ? '💸 Advance' : '💳 Salary'}
                      </span>
                    </td>
                    <td><span className="month-badge">{item.month}</span></td>
                    <td className={`amount-cell ${item.type === 'Advance' ? 'advance-amount' : 'positive'}`}>
                      ₹{item.amountPaid?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td>{item.paymentMethod}</td>
                    <td style={{ fontSize: '12px', color: '#cbd5e1' }}>{item.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="modal-footer" style={{ marginTop: '16px' }}>
          <button type="button" className="btn-primary" onClick={onClose}>Close Ledger</button>
        </div>
      </div>
    </div>
  );
}
