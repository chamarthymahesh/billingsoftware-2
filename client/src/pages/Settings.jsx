import { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Building2, Image as ImageIcon, CreditCard, FileText } from 'lucide-react';
import './Settings.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Settings = () => {
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  const authHeader = { Authorization: `Bearer ${userInfo?.token}` };
  
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [companyProfile, setCompanyProfile] = useState({
    name: '',
    gstin: '',
    phone: '',
    email: '',
    address: ''
  });

  const [branding, setBranding] = useState({
    signatureImage: ''
  });

  const [bankDetails, setBankDetails] = useState({
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branchName: ''
  });

  const [invoiceTemplates, setInvoiceTemplates] = useState({
    headerStyle: 'Professional (Logo Left)',
    financialYear: '2026-27',
    fyPrefix: '26-27',
    invoicePrefix: 'JE',
    termsAndConditions: '1. Goods once sold will not be taken back.\n2. Interest @18% p.a. will be charged if payment is not made within due date.'
  });

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`${API}/api/companies`, { headers: authHeader });
        setCompanies(data);
        if (data.length > 0) {
          // Select the company matching the user's companyId, or the first one if Super Admin
          const initialCompany = data.find(c => c._id === userInfo.companyId) || data[0];
          setSelectedCompanyId(initialCompany._id);
          populateForm(initialCompany);
        }
      } catch (err) {
        console.error('Failed to load companies', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCompanies();
  }, []);

  const populateForm = (company) => {
    setCompanyProfile({
      name: company.name || '',
      gstin: company.gstin || '',
      phone: company.phone || '',
      email: company.email || '',
      address: company.address || ''
    });
    setBranding({
      signatureImage: company.signatureImage || ''
    });
    setBankDetails({
      bankName: company.bankDetails?.bankName || '',
      accountNumber: company.bankDetails?.accountNumber || '',
      ifscCode: company.bankDetails?.ifscCode || '',
      branchName: company.bankDetails?.branchName || ''
    });
    setInvoiceTemplates({
      headerStyle: company.invoiceTemplates?.headerStyle || 'Professional (Logo Left)',
      financialYear: company.invoiceTemplates?.financialYear || '2026-27',
      fyPrefix: company.invoiceTemplates?.fyPrefix || '26-27',
      invoicePrefix: company.invoiceTemplates?.invoicePrefix || 'JE',
      termsAndConditions: company.invoiceTemplates?.termsAndConditions || '1. Goods once sold will not be taken back.\n2. Interest @18% p.a. will be charged if payment is not made within due date.'
    });
  };

  const handleCompanySwitch = (id) => {
    setSelectedCompanyId(id);
    const company = companies.find(c => c._id === id);
    if (company) populateForm(company);
  };

  const handleProfileChange = (e) => setCompanyProfile({ ...companyProfile, [e.target.name]: e.target.value });
  const handleBankChange = (e) => setBankDetails({ ...bankDetails, [e.target.name]: e.target.value });
  const handleTemplateChange = (e) => setInvoiceTemplates({ ...invoiceTemplates, [e.target.name]: e.target.value });

  // Handle fake file upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBranding({ signatureImage: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const saveSettings = async () => {
    if (!selectedCompanyId) return;
    try {
      setSaving(true);
      const payload = {
        ...companyProfile,
        signatureImage: branding.signatureImage,
        bankDetails,
        invoiceTemplates
      };
      
      const { data } = await axios.put(`${API}/api/companies/${selectedCompanyId}`, payload, { headers: authHeader });
      
      // Update local state
      setCompanies(companies.map(c => c._id === data._id ? data : c));
      alert('Settings saved successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="settings-loading">Loading settings...</div>;

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div>
          <h1 className="settings-title">Business Settings</h1>
          <p className="settings-subtitle">Manage your company profile and billing preferences</p>
        </div>
        {userInfo.role === 'Super Admin' && (
          <select 
            className="settings-company-select"
            value={selectedCompanyId} 
            onChange={(e) => handleCompanySwitch(e.target.value)}
          >
            {companies.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="settings-body">
        
        {/* Company Profile */}
        <div className="settings-card">
          <div className="card-header">
            <Building2 size={16} /> COMPANY PROFILE
          </div>
          <div className="card-grid">
            <div className="form-group">
              <label>COMPANY NAME *</label>
              <input type="text" name="name" value={companyProfile.name} onChange={handleProfileChange} />
            </div>
            <div className="form-group">
              <label>GSTIN</label>
              <input type="text" name="gstin" value={companyProfile.gstin} onChange={handleProfileChange} />
            </div>
            <div className="form-group">
              <label>PHONE</label>
              <input type="text" name="phone" value={companyProfile.phone} onChange={handleProfileChange} />
            </div>
            <div className="form-group">
              <label>EMAIL</label>
              <input type="email" name="email" value={companyProfile.email} onChange={handleProfileChange} />
            </div>
            <div className="form-group full-width">
              <label>ADDRESS</label>
              <textarea name="address" value={companyProfile.address} onChange={handleProfileChange} rows="2" />
            </div>
          </div>
        </div>

        {/* Branding & Assets */}
        <div className="settings-card">
          <div className="card-header">
            <ImageIcon size={16} /> BRANDING & ASSETS
          </div>
          <div className="form-group">
            <label>DIGITAL SIGNATURE / STAMP (FOR INVOICES)</label>
            <div className="file-upload-wrapper">
              <input type="file" id="signature" accept="image/*" onChange={handleFileChange} />
              <p className="help-text">Upload a PNG/JPG width transparent background (Max 2MB)</p>
            </div>
            {branding.signatureImage && (
              <div className="signature-preview">
                <img src={branding.signatureImage} alt="Signature Preview" />
                <button className="remove-btn" onClick={() => setBranding({ signatureImage: '' })}>Remove</button>
              </div>
            )}
          </div>
        </div>

        {/* Bank Details */}
        <div className="settings-card">
          <div className="card-header">
            <CreditCard size={16} /> BANK DETAILS (FOR INVOICES)
          </div>
          <div className="card-grid">
            <div className="form-group">
              <label>BANK NAME</label>
              <input type="text" name="bankName" value={bankDetails.bankName} onChange={handleBankChange} />
            </div>
            <div className="form-group">
              <label>ACCOUNT NUMBER</label>
              <input type="text" name="accountNumber" value={bankDetails.accountNumber} onChange={handleBankChange} />
            </div>
            <div className="form-group">
              <label>IFSC CODE</label>
              <input type="text" name="ifscCode" value={bankDetails.ifscCode} onChange={handleBankChange} />
            </div>
            <div className="form-group">
              <label>BRANCH NAME</label>
              <input type="text" name="branchName" value={bankDetails.branchName} onChange={handleBankChange} />
            </div>
          </div>
        </div>

        {/* Invoice & Prefix Templates */}
        <div className="settings-card">
          <div className="card-header">
            <FileText size={16} /> INVOICE & PREFIX TEMPLATES
          </div>
          <div className="card-grid">
            <div className="form-group">
              <label>INVOICE HEADER STYLE</label>
              <select name="headerStyle" value={invoiceTemplates.headerStyle} onChange={handleTemplateChange}>
                <option>Professional (Logo Left)</option>
                <option>Modern (Logo Center)</option>
                <option>Classic (Text Only)</option>
              </select>
            </div>
            <div className="form-group">
              <label>CURRENT FINANCIAL YEAR</label>
              <select name="financialYear" value={invoiceTemplates.financialYear} onChange={handleTemplateChange}>
                <option>2026-27</option>
                <option>2025-26</option>
                <option>2024-25</option>
              </select>
            </div>
            <div className="form-group">
              <label>FY PREFIX (DIGIT)</label>
              <input type="text" name="fyPrefix" value={invoiceTemplates.fyPrefix} onChange={handleTemplateChange} />
            </div>
            <div className="form-group">
              <label>INVOICE PREFIX</label>
              <input type="text" name="invoicePrefix" value={invoiceTemplates.invoicePrefix} onChange={handleTemplateChange} />
            </div>
            <div className="form-group full-width">
              <label>STANDARD TERMS & CONDITIONS</label>
              <textarea name="termsAndConditions" value={invoiceTemplates.termsAndConditions} onChange={handleTemplateChange} rows="3" />
            </div>
          </div>
          
          <div className="info-box">
            Your next invoice number will look like: <strong>{invoiceTemplates.invoicePrefix}-{invoiceTemplates.fyPrefix}/001</strong>
          </div>
        </div>

        <div className="settings-footer">
          <button className="save-btn" onClick={saveSettings} disabled={saving}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default Settings;
