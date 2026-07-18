import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, KeyRound, Eye, X, Building2, Shield, Phone, Mail, MapPin, Hash } from 'lucide-react';
import './Companies.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Companies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [formData, setFormData] = useState({
    name: '', gstin: '', phone: '', email: '', address: '',
    adminEmail: '', adminPassword: '',
  });

  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  const config = { headers: { Authorization: `Bearer ${userInfo?.token}` } };

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API}/api/companies`, config);
      setCompanies(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCompanies(); }, []);

  const handleInput = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/api/companies`, formData, { headers: { ...config.headers, 'Content-Type': 'application/json' } });
      setIsModalOpen(false);
      setFormData({ name: '', gstin: '', phone: '', email: '', address: '', adminEmail: '', adminPassword: '' });
      fetchCompanies();
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating company');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this company and all its data?')) return;
    try {
      await axios.delete(`${API}/api/companies/${id}`, config);
      fetchCompanies();
    } catch (err) { console.error(err); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/api/users/${selectedUser._id}/reset-password`, { newPassword },
        { headers: { ...config.headers, 'Content-Type': 'application/json' } });
      setIsResetModalOpen(false);
      setNewPassword('');
      alert('Password updated!');
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const colors = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#14b8a6','#f97316','#ec4899','#06b6d4','#84cc16'];
  const getColor = (i) => colors[i % colors.length];

  return (
    <div className="companies-page">
      {/* Page Header */}
      <div className="cp-header">
        <div>
          <h1 className="cp-title">Companies</h1>
          <p className="cp-subtitle">Manage your {companies.length} registered companies</p>
        </div>
        <button className="cp-add-btn" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          Add Company
        </button>
      </div>

      {/* Stats Cards */}
      <div className="cp-stats">
        <div className="cp-stat-card">
          <div className="cp-stat-icon" style={{ background: 'rgba(99,102,241,0.15)', color: '#6366f1' }}>
            <Building2 size={22} />
          </div>
          <div>
            <p className="cp-stat-label">Total Companies</p>
            <h2 className="cp-stat-value">{companies.length}</h2>
          </div>
        </div>
        <div className="cp-stat-card">
          <div className="cp-stat-icon" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
            <Shield size={22} />
          </div>
          <div>
            <p className="cp-stat-label">Active Admins</p>
            <h2 className="cp-stat-value">{companies.filter(c => c.adminUser).length}</h2>
          </div>
        </div>
      </div>

      {/* Company Cards Grid */}
      {loading ? (
        <div className="cp-loading">Loading companies...</div>
      ) : companies.length === 0 ? (
        <div className="cp-empty">
          <Building2 size={48} className="cp-empty-icon" />
          <h3>No companies yet</h3>
          <p>Click "Add Company" to get started</p>
        </div>
      ) : (
        <div className="cp-grid">
          {companies.map((company, i) => (
            <div key={company._id} className="cp-card">
              <div className="cp-card-header" style={{ background: `linear-gradient(135deg, ${getColor(i)}22, ${getColor(i)}08)`, borderBottom: `1px solid ${getColor(i)}33` }}>
                <div className="cp-card-avatar" style={{ background: getColor(i) }}>
                  {company.name.charAt(0).toUpperCase()}
                </div>
                <div className="cp-card-title">
                  <h3>{company.name}</h3>
                  <span className="cp-gstin">GSTIN: {company.gstin || 'N/A'}</span>
                </div>
                <div className="cp-card-actions">
                  <button className="cp-action-btn view" title="View Details"><Eye size={16} /></button>
                  <button className="cp-action-btn reset" title="Reset Password"
                    onClick={() => { setSelectedUser(company.adminUser); setIsResetModalOpen(true); }}>
                    <KeyRound size={16} />
                  </button>
                  <button className="cp-action-btn delete" title="Delete Company"
                    onClick={() => handleDelete(company._id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="cp-card-body">
                <div className="cp-info-row"><Phone size={14} /><span>{company.phone}</span></div>
                <div className="cp-info-row"><Mail size={14} /><span>{company.email}</span></div>
                <div className="cp-info-row"><MapPin size={14} /><span>{company.address}</span></div>
                {company.adminUser && (
                  <div className="cp-admin-badge">
                    <Shield size={12} />
                    Admin: {company.adminUser.email}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Company Modal ── */}
      {isModalOpen && (
        <div className="cp-overlay" onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}>
          <div className="cp-modal">
            {/* Modal Header */}
            <div className="cp-modal-header">
              <div className="cp-modal-icon"><Building2 size={20} /></div>
              <h2>Add New Company</h2>
              <button className="cp-close" onClick={() => setIsModalOpen(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreate} className="cp-modal-body">
              {/* Company Info Section */}
              <div className="cp-section-label">Company Information</div>
              <div className="cp-form-grid">
                <div className="cp-field">
                  <label><Building2 size={13} /> Company Name *</label>
                  <input name="name" required value={formData.name} onChange={handleInput} placeholder="e.g. ABC Traders Pvt Ltd" />
                </div>
                <div className="cp-field">
                  <label><Hash size={13} /> GSTIN</label>
                  <input name="gstin" value={formData.gstin} onChange={handleInput} placeholder="Optional" />
                </div>
                <div className="cp-field">
                  <label><Phone size={13} /> Phone *</label>
                  <input name="phone" required value={formData.phone} onChange={handleInput} placeholder="e.g. 9876543210" />
                </div>
                <div className="cp-field">
                  <label><Mail size={13} /> Company Email *</label>
                  <input type="email" name="email" required value={formData.email} onChange={handleInput} placeholder="office@company.com" />
                </div>
              </div>
              <div className="cp-field full">
                <label><MapPin size={13} /> Address *</label>
                <input name="address" required value={formData.address} onChange={handleInput} placeholder="Full business address" />
              </div>

              {/* Admin Account Section */}
              <div className="cp-section-divider">
                <span><Shield size={13} /> Admin Account Details</span>
              </div>
              <div className="cp-form-grid">
                <div className="cp-field">
                  <label><Mail size={13} /> Admin Email *</label>
                  <input type="email" name="adminEmail" required value={formData.adminEmail}
                    onChange={handleInput} placeholder="login-id@company.com" />
                </div>
                <div className="cp-field">
                  <label><KeyRound size={13} /> Admin Password *</label>
                  <input type="password" name="adminPassword" required value={formData.adminPassword}
                    onChange={handleInput} placeholder="Create secure password" />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="cp-modal-footer">
                <button type="button" className="cp-btn-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="cp-btn-create"><Plus size={16} /> Create Company</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reset Password Modal ── */}
      {isResetModalOpen && (
        <div className="cp-overlay" onClick={(e) => e.target === e.currentTarget && setIsResetModalOpen(false)}>
          <div className="cp-modal cp-modal-sm">
            <div className="cp-modal-header">
              <div className="cp-modal-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                <KeyRound size={20} />
              </div>
              <h2>Reset Password</h2>
              <button className="cp-close" onClick={() => setIsResetModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleResetPassword} className="cp-modal-body">
              <p className="cp-reset-info">Resetting password for admin: <strong>{selectedUser?.email}</strong></p>
              <div className="cp-field full" style={{ marginTop: '1rem' }}>
                <label><KeyRound size={13} /> New Password *</label>
                <input type="password" required value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" />
              </div>
              <div className="cp-modal-footer">
                <button type="button" className="cp-btn-cancel" onClick={() => setIsResetModalOpen(false)}>Cancel</button>
                <button type="submit" className="cp-btn-create" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Companies;
