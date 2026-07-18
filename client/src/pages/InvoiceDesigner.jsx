import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Save, Undo, Redo, Eye, EyeOff, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Type, MoveUp, MoveDown, RefreshCw } from 'lucide-react';
import './InvoiceDesigner.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const defaultElements = {
  companyInfo: { label: 'Company Header', fontSize: '14px', color: '#475569', fontWeight: 'normal', fontStyle: 'normal', isVisible: true, order: 1, alignment: 'left' },
  invoiceMeta: { label: 'Invoice Metadata', fontSize: '12px', color: '#64748b', fontWeight: 'normal', fontStyle: 'normal', isVisible: true, order: 2, alignment: 'right' },
  billTo: { label: 'Billing Details (Bill To)', fontSize: '11px', color: '#475569', fontWeight: 'normal', fontStyle: 'normal', isVisible: true, order: 3, alignment: 'left' },
  shipTo: { label: 'Shipping Details (Ship To)', fontSize: '11px', color: '#475569', fontWeight: 'normal', fontStyle: 'normal', isVisible: true, order: 4, alignment: 'left' },
  itemsTable: { label: 'Items Table Style', fontSize: '11px', color: '#0f172a', fontWeight: 'normal', fontStyle: 'normal', isVisible: true, order: 5, alignment: 'left', tableStyle: 'bordered' },
  bankDetails: { label: 'Bank Information', fontSize: '12px', color: '#1e293b', fontWeight: 'normal', fontStyle: 'normal', isVisible: true, order: 6, alignment: 'left' },
  terms: { label: 'Terms & Conditions Notes', fontSize: '11px', color: '#64748b', fontWeight: 'normal', fontStyle: 'normal', isVisible: true, order: 7, alignment: 'left' },
  signature: { label: 'Authorized Signatory', fontSize: '12px', color: '#0f172a', fontWeight: 'normal', fontStyle: 'normal', isVisible: true, order: 8, alignment: 'right' }
};

const InvoiceDesigner = () => {
  const navigate = useNavigate();
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  const authHeader = { Authorization: `Bearer ${userInfo?.token}` };

  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [elements, setElements] = useState(defaultElements);
  const [selectedElement, setSelectedElement] = useState(null);
  
  // History stack for Undo/Redo
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  const [companyProfile, setCompanyProfile] = useState({});
  const [branding, setBranding] = useState({});
  const [bankDetails, setBankDetails] = useState({});
  const [invoiceTemplates, setInvoiceTemplates] = useState({});

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`${API}/api/companies`, { headers: authHeader });
        setCompanies(data);
        if (data.length > 0) {
          const initialCompany = data.find(c => c._id === userInfo.companyId) || data[0];
          setSelectedCompanyId(initialCompany._id);
          loadCompanySettings(initialCompany);
        }
      } catch (err) {
        console.error('Failed to load companies', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCompanies();
  }, []);

  const loadCompanySettings = (company) => {
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
    setInvoiceTemplates(company.invoiceTemplates || {});

    // Load canvas layout from DB (use draft if available, or publish, or default)
    try {
      const savedLayout = company.invoiceTemplates?.canvasLayoutDraft || company.invoiceTemplates?.canvasLayout;
      if (savedLayout) {
        setElements(JSON.parse(savedLayout));
      } else {
        setElements(defaultElements);
      }
    } catch (e) {
      setElements(defaultElements);
    }
    
    // Clear history stacks
    setHistory([]);
    setRedoStack([]);
    setSelectedElement(null);
  };

  const handleCompanySwitch = (id) => {
    setSelectedCompanyId(id);
    const company = companies.find(c => c._id === id);
    if (company) loadCompanySettings(company);
  };

  const pushHistory = (state) => {
    setHistory(prev => [...prev, JSON.parse(JSON.stringify(state))]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prevState = history[history.length - 1];
    setRedoStack(prev => [...prev, JSON.parse(JSON.stringify(elements))]);
    setElements(prevState);
    setHistory(prev => prev.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const nextState = redoStack[redoStack.length - 1];
    setHistory(prev => [...prev, JSON.parse(JSON.stringify(elements))]);
    setElements(nextState);
    setRedoStack(prev => prev.slice(0, -1));
  };

  const updateSelectedStyle = (key, value) => {
    if (!selectedElement) return;
    pushHistory(elements);
    setElements(prev => ({
      ...prev,
      [selectedElement]: {
        ...prev[selectedElement],
        [key]: value
      }
    }));
  };

  const handleMove = (direction) => {
    if (!selectedElement) return;
    const currentOrder = elements[selectedElement].order;
    const targetOrder = direction === 'up' ? currentOrder - 1 : currentOrder + 1;
    
    const swapKey = Object.keys(elements).find(key => elements[key].order === targetOrder);
    if (!swapKey) return;

    pushHistory(elements);
    setElements(prev => ({
      ...prev,
      [selectedElement]: { ...prev[selectedElement], order: targetOrder },
      [swapKey]: { ...prev[swapKey], order: currentOrder }
    }));
  };

  const handleSave = async (isPublish = false) => {
    if (!selectedCompanyId) return;
    try {
      setSaving(true);
      const layoutString = JSON.stringify(elements);
      
      const payload = {
        invoiceTemplates: {
          ...invoiceTemplates,
          [isPublish ? 'canvasLayout' : 'canvasLayoutDraft']: layoutString
        }
      };

      const { data } = await axios.put(`${API}/api/companies/${selectedCompanyId}`, payload, { headers: authHeader });
      setCompanies(companies.map(c => c._id === data._id ? data : c));
      setInvoiceTemplates(data.invoiceTemplates || {});
      alert(isPublish ? 'Visual template published successfully!' : 'Visual template draft saved successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving layout');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset all layout settings to default template?')) {
      pushHistory(elements);
      setElements(defaultElements);
    }
  };

  if (loading) return <div className="designer-loading">Loading Visual Canvas...</div>;

  const currentSelection = selectedElement ? elements[selectedElement] : null;

  return (
    <div className="designer-page">
      <div className="designer-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button className="back-btn" onClick={() => navigate('/settings')}>
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <h1 className="designer-title">WYSIWYG Invoice Designer</h1>
            <p className="designer-subtitle">Click elements on the canvas to style them in real-time</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {userInfo.role === 'Super Admin' && (
            <select 
              className="designer-company-select"
              value={selectedCompanyId} 
              onChange={(e) => handleCompanySwitch(e.target.value)}
            >
              {companies.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          )}

          <button className="control-btn" onClick={handleUndo} disabled={history.length === 0} title="Undo">
            <Undo size={16} />
          </button>
          <button className="control-btn" onClick={handleRedo} disabled={redoStack.length === 0} title="Redo">
            <Redo size={16} />
          </button>
          <button className="control-btn reset" onClick={handleReset} title="Reset to default">
            <RefreshCw size={16} />
          </button>
          <button className="save-draft-btn" onClick={() => handleSave(false)} disabled={saving}>
            Save Draft
          </button>
          <button className="publish-btn" onClick={() => handleSave(true)} disabled={saving}>
            <Save size={16} /> {saving ? 'Publishing...' : 'Publish Layout'}
          </button>
        </div>
      </div>

      <div className="designer-body">
        {/* Visual Canvas Area */}
        <div className="canvas-wrapper">
          <div className="canvas-container" style={{ fontFamily: 'Inter, sans-serif' }}>
            {/* Header / Top accent */}
            <div style={{ height: '6px', background: invoiceTemplates.primaryColor || '#2563eb', borderRadius: '8px 8px 0 0', margin: '-24px -24px 20px -24px' }}></div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Company Info Block */}
              {elements.companyInfo.isVisible && (
                <div 
                  onClick={() => setSelectedElement('companyInfo')}
                  className={`canvas-block ${selectedElement === 'companyInfo' ? 'selected' : ''}`}
                  style={{
                    order: elements.companyInfo.order,
                    textAlign: elements.companyInfo.alignment,
                    fontSize: elements.companyInfo.fontSize,
                    color: elements.companyInfo.color,
                    fontWeight: elements.companyInfo.fontWeight,
                    fontStyle: elements.companyInfo.fontStyle
                  }}
                >
                  <div className="block-label">Company Header</div>
                  {invoiceTemplates.logoImage ? (
                    <img src={invoiceTemplates.logoImage} alt="Logo" style={{ maxHeight: '50px', marginBottom: '8px', display: 'inline-block' }} />
                  ) : (
                    <h2 style={{ margin: '0 0 4px 0', fontSize: '1.4rem', color: invoiceTemplates.primaryColor || '#2563eb', fontWeight: 800 }}>
                      {companyProfile.name || 'YOUR COMPANY NAME'}
                    </h2>
                  )}
                  <p style={{ margin: 0 }}>{companyProfile.address || '123 Business Street, Suite 100'}</p>
                  <p style={{ margin: 0, fontSize: '0.8em', opacity: 0.8 }}>
                    GSTIN: {companyProfile.gstin || '29AAAAA1111A1ZA'} | Phone: {companyProfile.phone || '9999999999'}
                  </p>
                </div>
              )}

              {/* Invoice Metadata Block */}
              {elements.invoiceMeta.isVisible && (
                <div 
                  onClick={() => setSelectedElement('invoiceMeta')}
                  className={`canvas-block ${selectedElement === 'invoiceMeta' ? 'selected' : ''}`}
                  style={{
                    order: elements.invoiceMeta.order,
                    textAlign: elements.invoiceMeta.alignment,
                    fontSize: elements.invoiceMeta.fontSize,
                    color: elements.invoiceMeta.color,
                    fontWeight: elements.invoiceMeta.fontWeight,
                    fontStyle: elements.invoiceMeta.fontStyle
                  }}
                >
                  <div className="block-label">Invoice Metadata</div>
                  <div style={{
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    color: invoiceTemplates.primaryColor || '#2563eb',
                    background: `${invoiceTemplates.primaryColor || '#2563eb'}15`,
                    padding: '4px 12px',
                    borderRadius: '4px',
                    display: 'inline-block',
                    textTransform: 'uppercase',
                    marginBottom: '6px'
                  }}>
                    {invoiceTemplates.invoiceTitle || 'TAX INVOICE'}
                  </div>
                  <p style={{ margin: 0 }}>Invoice #: <strong>{invoiceTemplates.invoicePrefix || 'JE'}-{invoiceTemplates.fyPrefix || '26-27'}/001</strong></p>
                  <p style={{ margin: 0 }}>Date: {new Date().toLocaleDateString('en-IN')}</p>
                </div>
              )}

              {/* Bill To Block */}
              {elements.billTo.isVisible && (
                <div 
                  onClick={() => setSelectedElement('billTo')}
                  className={`canvas-block ${selectedElement === 'billTo' ? 'selected' : ''}`}
                  style={{
                    order: elements.billTo.order,
                    textAlign: elements.billTo.alignment,
                    fontSize: elements.billTo.fontSize,
                    color: elements.billTo.color,
                    fontWeight: elements.billTo.fontWeight,
                    fontStyle: elements.billTo.fontStyle
                  }}
                >
                  <div className="block-label">Billing Details</div>
                  <h4 style={{ margin: '0 0 4px 0', color: invoiceTemplates.primaryColor || '#2563eb', fontSize: '1.05em' }}>BILL TO:</h4>
                  <p style={{ margin: 0, fontWeight: 700 }}>Sample Customer Pvt Ltd</p>
                  <p style={{ margin: 0 }}>456 Corporate Ave, Industrial Area, State</p>
                  <p style={{ margin: 0 }}>GSTIN: 29BBBBB2222B2ZB</p>
                </div>
              )}

              {/* Ship To Block */}
              {elements.shipTo.isVisible && (
                <div 
                  onClick={() => setSelectedElement('shipTo')}
                  className={`canvas-block ${selectedElement === 'shipTo' ? 'selected' : ''}`}
                  style={{
                    order: elements.shipTo.order,
                    textAlign: elements.shipTo.alignment,
                    fontSize: elements.shipTo.fontSize,
                    color: elements.shipTo.color,
                    fontWeight: elements.shipTo.fontWeight,
                    fontStyle: elements.shipTo.fontStyle
                  }}
                >
                  <div className="block-label">Shipping Details</div>
                  <h4 style={{ margin: '0 0 4px 0', color: invoiceTemplates.primaryColor || '#2563eb', fontSize: '1.05em' }}>SHIP TO:</h4>
                  <p style={{ margin: 0 }}>Delivery Depot 4, Warehouse Complex, City</p>
                  <p style={{ margin: 0 }}>State Code: 29 (Intra-state)</p>
                </div>
              )}

              {/* Items Table Block */}
              {elements.itemsTable.isVisible && (
                <div 
                  onClick={() => setSelectedElement('itemsTable')}
                  className={`canvas-block ${selectedElement === 'itemsTable' ? 'selected' : ''}`}
                  style={{
                    order: elements.itemsTable.order,
                    fontSize: elements.itemsTable.fontSize,
                    color: elements.itemsTable.color,
                    fontWeight: elements.itemsTable.fontWeight,
                    fontStyle: elements.itemsTable.fontStyle
                  }}
                >
                  <div className="block-label">Items Table</div>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    margin: '10px 0',
                    border: elements.itemsTable.tableStyle === 'bordered' ? '1px solid #cbd5e1' : 'none'
                  }}>
                    <thead>
                      <tr style={{
                        background: '#f8fafc',
                        borderBottom: `2px solid ${invoiceTemplates.primaryColor || '#2563eb'}`
                      }}>
                        <th style={{ padding: '8px', textAlign: 'left', border: elements.itemsTable.tableStyle === 'bordered' ? '1px solid #cbd5e1' : 'none' }}>Description</th>
                        <th style={{ padding: '8px', textAlign: 'right', border: elements.itemsTable.tableStyle === 'bordered' ? '1px solid #cbd5e1' : 'none' }}>Qty</th>
                        <th style={{ padding: '8px', textAlign: 'right', border: elements.itemsTable.tableStyle === 'bordered' ? '1px solid #cbd5e1' : 'none' }}>Rate</th>
                        <th style={{ padding: '8px', textAlign: 'right', border: elements.itemsTable.tableStyle === 'bordered' ? '1px solid #cbd5e1' : 'none' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{
                        background: elements.itemsTable.tableStyle === 'striped' ? '#f8fafc' : 'transparent',
                        borderBottom: elements.itemsTable.tableStyle === 'bordered' ? '1px solid #cbd5e1' : '1px solid #e2e8f0'
                      }}>
                        <td style={{ padding: '8px', fontWeight: 600, border: elements.itemsTable.tableStyle === 'bordered' ? '1px solid #cbd5e1' : 'none' }}>Premium Steel Bars</td>
                        <td style={{ padding: '8px', textAlign: 'right', border: elements.itemsTable.tableStyle === 'bordered' ? '1px solid #cbd5e1' : 'none' }}>10 Tons</td>
                        <td style={{ padding: '8px', textAlign: 'right', border: elements.itemsTable.tableStyle === 'bordered' ? '1px solid #cbd5e1' : 'none' }}>₹45,000.00</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, border: elements.itemsTable.tableStyle === 'bordered' ? '1px solid #cbd5e1' : 'none' }}>₹4,50,000.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Bank Details Block */}
              {elements.bankDetails.isVisible && (
                <div 
                  onClick={() => setSelectedElement('bankDetails')}
                  className={`canvas-block ${selectedElement === 'bankDetails' ? 'selected' : ''}`}
                  style={{
                    order: elements.bankDetails.order,
                    textAlign: elements.bankDetails.alignment,
                    fontSize: elements.bankDetails.fontSize,
                    color: elements.bankDetails.color,
                    fontWeight: elements.bankDetails.fontWeight,
                    fontStyle: elements.bankDetails.fontStyle
                  }}
                >
                  <div className="block-label">Bank Info</div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '1em', color: invoiceTemplates.primaryColor || '#2563eb' }}>Bank Account Details</h4>
                  <p style={{ margin: '2px 0' }}>Bank Name: {bankDetails.bankName || 'HDFC Bank'}</p>
                  <p style={{ margin: '2px 0' }}>A/c No: {bankDetails.accountNumber || '501002222222'}</p>
                  <p style={{ margin: '2px 0' }}>IFSC: {bankDetails.ifscCode || 'HDFC0000123'}</p>
                </div>
              )}

              {/* Terms Notes Block */}
              {elements.terms.isVisible && (
                <div 
                  onClick={() => setSelectedElement('terms')}
                  className={`canvas-block ${selectedElement === 'terms' ? 'selected' : ''}`}
                  style={{
                    order: elements.terms.order,
                    textAlign: elements.terms.alignment,
                    fontSize: elements.terms.fontSize,
                    color: elements.terms.color,
                    fontWeight: elements.terms.fontWeight,
                    fontStyle: elements.terms.fontStyle
                  }}
                >
                  <div className="block-label">Terms & Notes</div>
                  <strong>Terms & Conditions:</strong>
                  <p style={{ margin: '4px 0 0 0', whiteSpace: 'pre-line', fontSize: '0.9em', lineHeight: '1.4' }}>
                    {invoiceTemplates.termsAndConditions}
                  </p>
                </div>
              )}

              {/* Signature Block */}
              {elements.signature.isVisible && (
                <div 
                  onClick={() => setSelectedElement('signature')}
                  className={`canvas-block ${selectedElement === 'signature' ? 'selected' : ''}`}
                  style={{
                    order: elements.signature.order,
                    fontSize: elements.signature.fontSize,
                    color: elements.signature.color,
                    fontWeight: elements.signature.fontWeight,
                    fontStyle: elements.signature.fontStyle,
                    display: 'flex',
                    justifyContent: elements.signature.alignment === 'center' ? 'center' : (elements.signature.alignment === 'left' ? 'flex-start' : 'flex-end')
                  }}
                >
                  <div className="block-label">Authorized Signatory</div>
                  <div style={{ textAlign: 'center', width: '200px' }}>
                    {branding.signatureImage ? (
                      <img src={branding.signatureImage} alt="Signature" style={{ maxHeight: '40px', display: 'inline-block', marginBottom: '4px' }} />
                    ) : (
                      <div style={{ height: '40px' }}></div>
                    )}
                    <div style={{ borderTop: '1px solid #0f172a', margin: '4px 0', fontSize: '0.85em' }}>Authorized Signatory</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Styling Side Panel */}
        <div className="designer-sidebar">
          {selectedElement ? (
            <div className="style-card">
              <h3 className="style-card-title">Customize {currentSelection.label}</h3>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <button 
                  className={`toggle-visible-btn ${currentSelection.isVisible ? 'active' : ''}`}
                  onClick={() => updateSelectedStyle('isVisible', !currentSelection.isVisible)}
                >
                  {currentSelection.isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                  {currentSelection.isVisible ? 'Visible' : 'Hidden'}
                </button>
              </div>

              {currentSelection.isVisible && (
                <>
                  {/* Font Size */}
                  <div className="setting-group">
                    <label className="setting-label">Font Size</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input 
                        type="range" 
                        min="10" 
                        max="24" 
                        value={parseInt(currentSelection.fontSize)} 
                        onChange={(e) => updateSelectedStyle('fontSize', `${e.target.value}px`)}
                        style={{ flex: 1 }}
                      />
                      <span className="font-badge">{currentSelection.fontSize}</span>
                    </div>
                  </div>

                  {/* Text Color */}
                  <div className="setting-group">
                    <label className="setting-label">Text Color</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input 
                        type="color" 
                        value={currentSelection.color} 
                        onChange={(e) => updateSelectedStyle('color', e.target.value)}
                        style={{ width: '45px', height: '35px', padding: 0, border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer' }}
                      />
                      <span className="color-code">{currentSelection.color}</span>
                    </div>
                  </div>

                  {/* Alignments */}
                  {selectedElement !== 'itemsTable' && (
                    <div className="setting-group">
                      <label className="setting-label">Text Alignment</label>
                      <div className="align-buttons">
                        <button 
                          className={`align-btn ${currentSelection.alignment === 'left' ? 'active' : ''}`}
                          onClick={() => updateSelectedStyle('alignment', 'left')}
                        >
                          <AlignLeft size={16} />
                        </button>
                        <button 
                          className={`align-btn ${currentSelection.alignment === 'center' ? 'active' : ''}`}
                          onClick={() => updateSelectedStyle('alignment', 'center')}
                        >
                          <AlignCenter size={16} />
                        </button>
                        <button 
                          className={`align-btn ${currentSelection.alignment === 'right' ? 'active' : ''}`}
                          onClick={() => updateSelectedStyle('alignment', 'right')}
                        >
                          <AlignRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Table Styles specific */}
                  {selectedElement === 'itemsTable' && (
                    <div className="setting-group">
                      <label className="setting-label">Table Border Theme</label>
                      <select 
                        className="designer-select"
                        value={currentSelection.tableStyle} 
                        onChange={(e) => updateSelectedStyle('tableStyle', e.target.value)}
                      >
                        <option value="bordered">Bordered Outline</option>
                        <option value="minimal">Minimal (Line Bottom)</option>
                        <option value="striped">Striped Rows</option>
                      </select>
                    </div>
                  )}

                  {/* Font Weights & Styles */}
                  <div className="setting-group">
                    <label className="setting-label">Text Styling</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        className={`style-btn ${currentSelection.fontWeight === 'bold' ? 'active' : ''}`}
                        onClick={() => updateSelectedStyle('fontWeight', currentSelection.fontWeight === 'bold' ? 'normal' : 'bold')}
                      >
                        <Bold size={16} /> Bold
                      </button>
                      <button 
                        className={`style-btn ${currentSelection.fontStyle === 'italic' ? 'active' : ''}`}
                        onClick={() => updateSelectedStyle('fontStyle', currentSelection.fontStyle === 'italic' ? 'normal' : 'italic')}
                      >
                        <Italic size={16} /> Italic
                      </button>
                    </div>
                  </div>

                  {/* Positioning Order */}
                  <div className="setting-group">
                    <label className="setting-label">Vertical Stack Position</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        className="position-btn" 
                        onClick={() => handleMove('up')}
                        disabled={currentSelection.order <= 1}
                      >
                        <MoveUp size={16} /> Move Up
                      </button>
                      <button 
                        className="position-btn" 
                        onClick={() => handleMove('down')}
                        disabled={currentSelection.order >= Object.keys(elements).length}
                      >
                        <MoveDown size={16} /> Move Down
                      </button>
                    </div>
                    <p style={{ margin: '6px 0 0 0', fontSize: '10px', color: '#64748b' }}>
                      Current visual index: <strong>{currentSelection.order}</strong>
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              <Type size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
              <p>No element selected</p>
              <p style={{ fontSize: '11px' }}>Click on any part of the mockup on the left to customize its style, visibility, and ordering.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceDesigner;
