import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Save, Building2, Image as ImageIcon, CreditCard, FileText } from 'lucide-react';
import './Settings.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Settings = () => {
  const navigate = useNavigate();
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
    termsAndConditions: '1. Goods once sold will not be taken back.\n2. Interest @18% p.a. will be charged if payment is not made within due date.',
    primaryColor: '#2563eb',
    secondaryColor: '#475569',
    logoImage: '',
    fontFamily: 'Inter',
    showLogo: true,
    showSignature: true,
    invoiceTitle: 'TAX INVOICE',
    companyAddressFontSize: '14px',
    logoPosition: 'left',
    metaPosition: 'right',
    addressLayout: 'side-by-side',
    signaturePosition: 'right',
    termsPosition: 'left',
    tableStyle: 'bordered'
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
      termsAndConditions: company.invoiceTemplates?.termsAndConditions || '1. Goods once sold will not be taken back.\n2. Interest @18% p.a. will be charged if payment is not made within due date.',
      primaryColor: company.invoiceTemplates?.primaryColor || '#2563eb',
      secondaryColor: company.invoiceTemplates?.secondaryColor || '#475569',
      logoImage: company.invoiceTemplates?.logoImage || '',
      fontFamily: company.invoiceTemplates?.fontFamily || 'Inter',
      showLogo: company.invoiceTemplates?.showLogo !== undefined ? company.invoiceTemplates.showLogo : true,
      showSignature: company.invoiceTemplates?.showSignature !== undefined ? company.invoiceTemplates.showSignature : true,
      invoiceTitle: company.invoiceTemplates?.invoiceTitle || 'TAX INVOICE',
      companyAddressFontSize: company.invoiceTemplates?.companyAddressFontSize || '14px',
      logoPosition: company.invoiceTemplates?.logoPosition || 'left',
      metaPosition: company.invoiceTemplates?.metaPosition || 'right',
      addressLayout: company.invoiceTemplates?.addressLayout || 'side-by-side',
      signaturePosition: company.invoiceTemplates?.signaturePosition || 'right',
      termsPosition: company.invoiceTemplates?.termsPosition || 'left',
      tableStyle: company.invoiceTemplates?.tableStyle || 'bordered'
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
  const handleCheckboxChange = (e) => setInvoiceTemplates({ ...invoiceTemplates, [e.target.name]: e.target.checked });

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInvoiceTemplates(prev => ({ ...prev, logoImage: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

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
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button 
            className="save-btn" 
            style={{ margin: 0, padding: '8px 16px', background: '#2563eb' }} 
            onClick={() => navigate('/settings/designer')}
          >
            <ImageIcon size={16} /> Open Visual Invoice Designer
          </button>
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
          <div className="card-grid">
            <div className="form-group">
              <label>DIGITAL SIGNATURE / STAMP (FOR INVOICES)</label>
              <div className="file-upload-wrapper">
                <input type="file" id="signature" accept="image/*" onChange={handleFileChange} />
                <p className="help-text">Upload a PNG/JPG with transparent background (Max 2MB)</p>
              </div>
              {branding.signatureImage && (
                <div className="signature-preview">
                  <img src={branding.signatureImage} alt="Signature Preview" />
                  <button className="remove-btn" onClick={() => setBranding({ signatureImage: '' })}>Remove</button>
                </div>
              )}
            </div>
            <div className="form-group">
              <label>COMPANY LOGO (FOR INVOICES)</label>
              <div className="file-upload-wrapper">
                <input type="file" id="logo" accept="image/*" onChange={handleLogoChange} />
                <p className="help-text">Upload a PNG/JPG company logo (Max 2MB)</p>
              </div>
              {invoiceTemplates.logoImage && (
                <div className="signature-preview">
                  <img src={invoiceTemplates.logoImage} alt="Logo Preview" style={{ maxHeight: '60px', objectFit: 'contain' }} />
                  <button className="remove-btn" onClick={() => setInvoiceTemplates(prev => ({ ...prev, logoImage: '' }))}>Remove</button>
                </div>
              )}
            </div>
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
            <FileText size={16} /> INVOICE & PREFIX TEMPLATES & CUSTOMIZATION
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
              <label>INVOICE TITLE</label>
              <input type="text" name="invoiceTitle" value={invoiceTemplates.invoiceTitle} onChange={handleTemplateChange} />
            </div>
            <div className="form-group">
              <label>PRIMARY ACCENT COLOR</label>
              <input type="color" name="primaryColor" value={invoiceTemplates.primaryColor} onChange={handleTemplateChange} style={{ height: '40px', padding: 0 }} />
            </div>
            <div className="form-group">
              <label>SECONDARY ACCENT COLOR</label>
              <input type="color" name="secondaryColor" value={invoiceTemplates.secondaryColor} onChange={handleTemplateChange} style={{ height: '40px', padding: 0 }} />
            </div>
            <div className="form-group">
              <label>FONT FAMILY</label>
              <select name="fontFamily" value={invoiceTemplates.fontFamily} onChange={handleTemplateChange}>
                <option>Inter</option>
                <option>Roboto</option>
                <option>Outfit</option>
                <option>Courier New</option>
                <option>Georgia</option>
              </select>
            </div>
            <div className="form-group">
              <label>ADDRESS FONT SIZE</label>
              <select name="companyAddressFontSize" value={invoiceTemplates.companyAddressFontSize} onChange={handleTemplateChange}>
                <option value="12px">Small (12px)</option>
                <option value="14px">Normal (14px)</option>
                <option value="16px">Large (16px)</option>
              </select>
            </div>
            <div className="form-group">
              <label>LOGO POSITION</label>
              <select name="logoPosition" value={invoiceTemplates.logoPosition} onChange={handleTemplateChange}>
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
            <div className="form-group">
              <label>METADATA POSITION</label>
              <select name="metaPosition" value={invoiceTemplates.metaPosition} onChange={handleTemplateChange}>
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </div>
            <div className="form-group">
              <label>ADDRESSES LAYOUT</label>
              <select name="addressLayout" value={invoiceTemplates.addressLayout} onChange={handleTemplateChange}>
                <option value="side-by-side">Side-by-Side</option>
                <option value="stacked">Stacked</option>
              </select>
            </div>
            <div className="form-group">
              <label>SIGNATURE ALIGNMENT</label>
              <select name="signaturePosition" value={invoiceTemplates.signaturePosition} onChange={handleTemplateChange}>
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
            <div className="form-group">
              <label>TERMS BLOCK POSITION</label>
              <select name="termsPosition" value={invoiceTemplates.termsPosition} onChange={handleTemplateChange}>
                <option value="left">Left (Totals on Right)</option>
                <option value="right">Right (Totals on Left)</option>
              </select>
            </div>
            <div className="form-group">
              <label>TABLE STYLE</label>
              <select name="tableStyle" value={invoiceTemplates.tableStyle} onChange={handleTemplateChange}>
                <option value="bordered">Bordered Outline</option>
                <option value="minimal">Minimal (Borders Bottom)</option>
                <option value="striped">Striped Rows</option>
              </select>
            </div>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" id="showLogo" name="showLogo" checked={invoiceTemplates.showLogo} onChange={handleCheckboxChange} />
              <label htmlFor="showLogo" style={{ cursor: 'pointer', margin: 0 }}>SHOW LOGO</label>
            </div>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" id="showSignature" name="showSignature" checked={invoiceTemplates.showSignature} onChange={handleCheckboxChange} />
              <label htmlFor="showSignature" style={{ cursor: 'pointer', margin: 0 }}>SHOW SIGNATORY</label>
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

        {/* Live Preview Card */}
        <div className="settings-card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <ImageIcon size={16} /> LIVE INVOICE TEMPLATE PREVIEW
          </div>
          <div className="preview-container" style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '24px',
            fontFamily: `${invoiceTemplates.fontFamily}, sans-serif`,
            color: '#0f172a',
            marginTop: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            textAlign: 'left'
          }}>
            {/* Accent border */}
            <div style={{
              height: '5px',
              background: invoiceTemplates.primaryColor,
              borderRadius: '8px 8px 0 0',
              margin: '-24px -24px 20px -24px'
            }}></div>

            {/* Header layout */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: invoiceTemplates.logoPosition === 'center' ? 'center' : 'flex-start',
              flexDirection: invoiceTemplates.metaPosition === 'left' ? 'row-reverse' : 'row',
              gap: '24px',
              flexWrap: 'wrap'
            }}>
              {/* Company Info container */}
              <div style={{
                textAlign: invoiceTemplates.logoPosition === 'center' ? 'center' : (invoiceTemplates.logoPosition === 'right' ? 'right' : 'left'),
                flex: 1,
                minWidth: '200px'
              }}>
                {invoiceTemplates.showLogo && invoiceTemplates.logoImage ? (
                  <img src={invoiceTemplates.logoImage} alt="Logo" style={{ maxHeight: '45px', marginBottom: '8px', display: 'inline-block' }} />
                ) : (
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: invoiceTemplates.primaryColor, marginBottom: '4px' }}>
                    {companyProfile.name || 'YOUR COMPANY NAME'}
                  </div>
                )}
                <p style={{ margin: 0, fontSize: invoiceTemplates.companyAddressFontSize, color: '#475569' }}>
                  {companyProfile.address || '123 Business Street, Suite 100'}
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                  GSTIN: {companyProfile.gstin || '29AAAAA1111A1ZA'} | Phone: {companyProfile.phone || '9999999999'}
                </p>
              </div>
              
              {/* Metadata container */}
              <div style={{
                textAlign: invoiceTemplates.metaPosition === 'left' ? 'left' : 'right',
                minWidth: '180px',
                marginTop: invoiceTemplates.logoPosition === 'center' ? '12px' : 0
              }}>
                <div style={{
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  color: invoiceTemplates.primaryColor,
                  background: `${invoiceTemplates.primaryColor}15`,
                  padding: '4px 12px',
                  borderRadius: '4px',
                  display: 'inline-block',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {invoiceTemplates.invoiceTitle}
                </div>
                <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  Invoice #: <strong>{invoiceTemplates.invoicePrefix}-{invoiceTemplates.fyPrefix}/001</strong>
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                  Date: {new Date().toLocaleDateString('en-IN')}
                </p>
              </div>
            </div>

            <hr style={{ border: '0', borderTop: '1px solid #cbd5e1', margin: '16px 0' }} />

            {/* Addresses layout */}
            <div style={{
              display: 'flex',
              gap: '24px',
              flexDirection: invoiceTemplates.addressLayout === 'stacked' ? 'column' : 'row',
              marginBottom: '20px'
            }}>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '11px', color: invoiceTemplates.primaryColor, fontWeight: 700 }}>BILL TO:</h4>
                <p style={{ margin: 0, fontSize: '11px', fontWeight: 600 }}>Sample Customer</p>
                <p style={{ margin: 0, fontSize: '11px', color: '#475569' }}>Customer Address, City, State</p>
              </div>
              <div style={{
                flex: 1,
                borderLeft: (invoiceTemplates.addressLayout === 'stacked' ? 'none' : '1px solid #e2e8f0'),
                paddingLeft: (invoiceTemplates.addressLayout === 'stacked' ? 0 : '24px')
              }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '11px', color: invoiceTemplates.primaryColor, fontWeight: 700 }}>SHIP TO:</h4>
                <p style={{ margin: 0, fontSize: '11px', color: '#475569' }}>Delivery Destination, City, State</p>
              </div>
            </div>

            {/* Items table */}
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '11px',
              marginBottom: '16px',
              border: invoiceTemplates.tableStyle === 'bordered' ? '1px solid #cbd5e1' : 'none'
            }}>
              <thead>
                <tr style={{
                  background: '#f8fafc',
                  borderBottom: `2px solid ${invoiceTemplates.primaryColor}`
                }}>
                  <th style={{ padding: '6px', textAlign: 'left', color: '#475569', textTransform: 'uppercase', border: invoiceTemplates.tableStyle === 'bordered' ? '1px solid #cbd5e1' : 'none' }}>Item Description</th>
                  <th style={{ padding: '6px', textAlign: 'right', color: '#475569', textTransform: 'uppercase', border: invoiceTemplates.tableStyle === 'bordered' ? '1px solid #cbd5e1' : 'none' }}>Qty</th>
                  <th style={{ padding: '6px', textAlign: 'right', color: '#475569', textTransform: 'uppercase', border: invoiceTemplates.tableStyle === 'bordered' ? '1px solid #cbd5e1' : 'none' }}>Rate</th>
                  <th style={{ padding: '6px', textAlign: 'right', color: '#475569', textTransform: 'uppercase', border: invoiceTemplates.tableStyle === 'bordered' ? '1px solid #cbd5e1' : 'none' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{
                  background: invoiceTemplates.tableStyle === 'striped' ? '#f8fafc' : 'transparent',
                  borderBottom: invoiceTemplates.tableStyle === 'bordered' ? '1px solid #cbd5e1' : '1px solid #e2e8f0'
                }}>
                  <td style={{ padding: '6px', fontWeight: 600, border: invoiceTemplates.tableStyle === 'bordered' ? '1px solid #cbd5e1' : 'none' }}>Sample Premium Product</td>
                  <td style={{ padding: '6px', textAlign: 'right', border: invoiceTemplates.tableStyle === 'bordered' ? '1px solid #cbd5e1' : 'none' }}>2 Pcs</td>
                  <td style={{ padding: '6px', textAlign: 'right', border: invoiceTemplates.tableStyle === 'bordered' ? '1px solid #cbd5e1' : 'none' }}>₹500.00</td>
                  <td style={{ padding: '6px', textAlign: 'right', fontWeight: 600, border: invoiceTemplates.tableStyle === 'bordered' ? '1px solid #cbd5e1' : 'none' }}>₹1,000.00</td>
                </tr>
              </tbody>
            </table>

            {/* Bottom block */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              flexDirection: invoiceTemplates.termsPosition === 'right' ? 'row-reverse' : 'row',
              gap: '24px'
            }}>
              <div style={{ flex: 1, fontSize: '9px', color: '#64748b', whiteSpace: 'pre-line' }}>
                <strong>Terms & Conditions:</strong><br />
                {invoiceTemplates.termsAndConditions}
              </div>
              <div style={{ width: '180px', textAlign: 'right' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingBottom: '4px' }}>
                  <span>Subtotal:</span>
                  <span>₹1,000.00</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingBottom: '8px', borderBottom: '1px solid #cbd5e1' }}>
                  <span>Tax (18%):</span>
                  <span>₹180.00</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 800, color: invoiceTemplates.secondaryColor, padding: '6px 0' }}>
                  <span>Grand Total:</span>
                  <span>₹1,180.00</span>
                </div>
                {invoiceTemplates.showSignature && branding.signatureImage && (
                  <div style={{
                    marginTop: '12px',
                    textAlign: invoiceTemplates.signaturePosition,
                    width: '100%',
                    display: 'flex',
                    justifyContent: invoiceTemplates.signaturePosition === 'center' ? 'center' : (invoiceTemplates.signaturePosition === 'left' ? 'flex-start' : 'flex-end')
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <img src={branding.signatureImage} alt="Sig" style={{ maxHeight: '35px', objectFit: 'contain' }} />
                      <div style={{ borderTop: '1px solid #0f172a', fontSize: '9px', marginTop: '2px', padding: '0 8px' }}>Authorized Signatory</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
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
