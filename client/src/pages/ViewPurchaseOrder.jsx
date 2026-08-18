import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Printer, Receipt, RefreshCw } from 'lucide-react';
import './ViewInvoice.css'; // Reuse printable view styling

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ViewPurchaseOrder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    const fetchPO = async () => {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        const res = await axios.get(`${API}/api/purchase-orders/${id}`, {
          headers: { Authorization: `Bearer ${userInfo.token}` }
        });
        setPo(res.data);
      } catch (err) {
        console.error('Error fetching purchase order:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPO();
  }, [id]);

  const handleConvert = async () => {
    if (!window.confirm(`Convert PO #${po.poNumber} to Purchase Invoice? This will record the purchase bill and update product stock.`)) return;
    setConverting(true);
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      await axios.post(`${API}/api/purchase-orders/${po._id}/convert`, {}, {
        headers: { Authorization: `Bearer ${userInfo.token}` }
      });
      alert(`PO #${po.poNumber} successfully converted to Purchase Invoice! Stock updated.`);
      setPo(prev => ({ ...prev, status: 'Converted' }));
    } catch (err) {
      alert(err.response?.data?.message || 'Error converting Purchase Order');
    } finally {
      setConverting(false);
    }
  };

  if (loading) return <div className="sl-center" style={{ color: '#fff', padding: '40px', textAlign: 'center' }}>Loading Purchase Order...</div>;
  if (!po) return <div className="sl-center" style={{ color: '#fff', padding: '40px', textAlign: 'center' }}>Purchase Order not found.</div>;

  const company = po.company || {};
  const sellerGSTIN = company.gstin || '';
  const sellerStateCode = sellerGSTIN.substring(0, 2);

  const supplierGSTIN = po.supplierGSTIN || '';
  const supplierStateCode = supplierGSTIN.substring(0, 2) || (po.supplierState ? po.supplierState.substring(0, 2) : '');

  const isInterState = sellerStateCode && supplierStateCode && sellerStateCode !== supplierStateCode;
  const isGst = !!sellerGSTIN || (po.totalTax > 0);

  const templates = company.invoiceTemplates || {};
  const primaryColor = templates.primaryColor || '#2563eb';
  const secondaryColor = templates.secondaryColor || '#10b981';
  const fontFamily = templates.fontFamily || 'Inter';
  const addressFontSize = templates.companyAddressFontSize || '14px';
  const showLogo = templates.showLogo !== false;
  const showSignature = templates.showSignature !== false;
  const logoImage = templates.logoImage || '';
  const logoPosition = templates.logoPosition || 'left';
  const metaPosition = templates.metaPosition || 'right';
  const addressLayout = templates.addressLayout || 'side-by-side';
  const signaturePosition = templates.signaturePosition || 'right';
  const termsPosition = templates.termsPosition || 'left';
  const tableStyle = templates.tableStyle || 'bordered';

  let templateClass = 'template-Professional';
  const headerStyle = templates.headerStyle || '';
  if (headerStyle.includes('Modern')) {
    templateClass = 'template-Modern';
  } else if (headerStyle.includes('Classic')) {
    templateClass = 'template-Classic';
  }

  return (
    <div className="sl-page">
      {/* Control Bar (hidden during print) */}
      <div className="sl-header no-print">
        <div>
          <button
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}
            onClick={() => navigate('/purchase-orders')}
          >
            <ArrowLeft size={16} /> Back to Purchase Orders
          </button>
          <h1 className="sl-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            Purchase Order {po.poNumber}
            <span style={{
              fontSize: '12px',
              padding: '4px 10px',
              borderRadius: '6px',
              fontWeight: 'bold',
              background: po.status === 'Converted' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
              color: po.status === 'Converted' ? '#10b981' : '#60a5fa'
            }}>
              {po.status}
            </span>
          </h1>
          <p className="sl-subtitle">View and print Purchase Order {po.poNumber}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {po.status !== 'Converted' && (
            <button
              onClick={handleConvert}
              disabled={converting}
              className="sl-new-btn"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
            >
              {converting ? <RefreshCw size={18} className="spin" /> : <Receipt size={18} />}
              Convert to Bill
            </button>
          )}
          <button className="sl-new-btn" onClick={() => window.print()}>
            <Printer size={18} /> Print / PDF
          </button>
        </div>
      </div>

      {/* Main Printable Document Sheet */}
      <div className={`invoice-container ${templateClass}`} style={{
        fontFamily: `${fontFamily}, sans-serif`,
        '--primary-color': primaryColor,
        '--secondary-color': secondaryColor,
        '--secondary-bg-color': `${secondaryColor}15`,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Top accent */}
        <div style={{ height: '6px', background: primaryColor, borderRadius: '8px 8px 0 0', margin: '-48px -48px 24px -48px' }}></div>

        {/* Company Header Block */}
        <div className={`company-info header-logo-${logoPosition}`} style={{ fontSize: addressFontSize, marginBottom: '20px' }}>
          {showLogo && logoImage ? (
            <img src={logoImage} alt="Company Logo" style={{ maxHeight: '80px', marginBottom: '12px', objectFit: 'contain', display: 'inline-block' }} />
          ) : (
            <h1 className="company-name" style={{ color: primaryColor }}>{company.name || 'Company Name'}</h1>
          )}
          <p>{company.address}</p>
          <p>GSTIN: {sellerGSTIN || 'N/A'} | Phone: {company.phone}</p>
          {company.email && <p>Email: {company.email}</p>}
        </div>

        {/* Purchase Order Metadata Block */}
        <div className={`invoice-meta header-meta-${metaPosition}`} style={{ marginBottom: '20px' }}>
          <h2 className="invoice-type" style={{ background: `${primaryColor}15`, color: primaryColor }}>PURCHASE ORDER</h2>
          <div className="meta-row">
            <span className="meta-label">PO #:</span>
            <span className="meta-value">{po.poNumber}</span>
          </div>
          <div className="meta-row">
            <span className="meta-label">PO Date:</span>
            <span className="meta-value">{new Date(po.poDate).toLocaleDateString('en-IN')}</span>
          </div>
          {po.expectedDeliveryDate && (
            <div className="meta-row">
              <span className="meta-label">Expected Delivery:</span>
              <span className="meta-value">{new Date(po.expectedDeliveryDate).toLocaleDateString('en-IN')}</span>
            </div>
          )}
          <div className="meta-row">
            <span className="meta-label">Status:</span>
            <span className="meta-value">{po.status}</span>
          </div>
        </div>

        <hr className="divider" />

        {/* Billing & Shipping Section */}
        <div className={`address-container layout-${addressLayout}`}>
          <div className="bill-to-section">
            <h3 className="section-title" style={{ color: primaryColor }}>Vendor / Supplier:</h3>
            <div className="customer-info">
              <h4 className="customer-name">{po.supplierName}</h4>
              {po.billingAddress && <p>{po.billingAddress}</p>}
              {po.supplierPhone && <p>Phone: {po.supplierPhone}</p>}
              {isGst && po.supplierGSTIN && (
                <p><strong>GSTIN: {po.supplierGSTIN}</strong></p>
              )}
              {po.supplierState && <p>State: {po.supplierState}</p>}
            </div>
          </div>

          <div className="ship-to-section">
            <h3 className="section-title" style={{ color: primaryColor }}>Deliver To / Buyer:</h3>
            <div className="customer-info">
              <h4 className="customer-name">{company.name}</h4>
              {company.address && <p>{company.address}</p>}
              {company.phone && <p>Phone: {company.phone}</p>}
              {company.gstin && <p><strong>GSTIN: {company.gstin}</strong></p>}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <table className={`invoice-table table-style-${tableStyle}`}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: `2px solid ${primaryColor}` }}>
              <th>Description</th>
              {isGst && <th>HSN</th>}
              <th>Qty</th>
              <th>Rate</th>
              {isGst && <th>GST%</th>}
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {po.items?.map((item, index) => (
              <tr key={index}>
                <td>
                  <div className="item-desc">{item.productName}</div>
                </td>
                {isGst && <td>{item.hsnCode || '—'}</td>}
                <td>{item.qty} {item.unit || 'Pcs'}</td>
                <td>₹{Number(item.rate || 0).toFixed(2)}</td>
                {isGst && <td>{item.gstRate || 0}%</td>}
                <td className="text-right">₹{Number(item.total || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary Section */}
        <div className={`invoice-summary-container layout-terms-${termsPosition}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
            {(po.notes || po.termsConditions) && (
              <div className="invoice-notes">
                <h4 className="notes-title" style={{ color: primaryColor }}>Notes & Terms</h4>
                {po.notes && <p style={{ whiteSpace: 'pre-line', marginBottom: '8px' }}><strong>Notes:</strong> {po.notes}</p>}
                {po.termsConditions && <p style={{ whiteSpace: 'pre-line' }}><strong>Terms & Conditions:</strong> {po.termsConditions}</p>}
              </div>
            )}

            {company.bankDetails?.bankName && (
              <div className="bank-details-info" style={{ marginTop: 0 }}>
                <h4 className="notes-title" style={{ color: primaryColor }}>Bank Details</h4>
                <div className="bank-grid">
                  <p><span>Bank:</span> {company.bankDetails.bankName}</p>
                  <p><span>A/c No:</span> {company.bankDetails.accountNumber}</p>
                  <p><span>IFSC:</span> {company.bankDetails.ifscCode}</p>
                  {company.bankDetails.branchName && <p><span>Branch:</span> {company.bankDetails.branchName}</p>}
                </div>
              </div>
            )}
          </div>

          <div className="summary-details">
            <div className="summary-row">
              <span>Subtotal:</span>
              <span>₹{(po.subtotal || 0).toFixed(2)}</span>
            </div>
            {isGst && (
              <>
                {isInterState ? (
                  <div className="summary-row">
                    <span>IGST:</span>
                    <span>₹{(po.totalTax || 0).toFixed(2)}</span>
                  </div>
                ) : (
                  <>
                    <div className="summary-row">
                      <span>CGST:</span>
                      <span>₹{((po.totalTax || 0) / 2).toFixed(2)}</span>
                    </div>
                    <div className="summary-row">
                      <span>SGST:</span>
                      <span>₹{((po.totalTax || 0) / 2).toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div className="summary-row highlight">
                  <span>Total Tax:</span>
                  <span>₹{(po.totalTax || 0).toFixed(2)}</span>
                </div>
              </>
            )}

            {Boolean(po.packagingCharges) && (
              <div className="summary-row">
                <span>Packaging Charges:</span>
                <span>₹{(po.packagingCharges).toFixed(2)}</span>
              </div>
            )}
            {Boolean(po.transportCharges) && (
              <div className="summary-row">
                <span>Transport Charges:</span>
                <span>₹{(po.transportCharges).toFixed(2)}</span>
              </div>
            )}
            {Boolean(po.otherCharges) && (
              <div className="summary-row">
                <span>Other Charges:</span>
                <span>₹{(po.otherCharges).toFixed(2)}</span>
              </div>
            )}
            {Boolean(po.adjustment) && (
              <div className="summary-row">
                <span>Adjustment:</span>
                <span>₹{(po.adjustment).toFixed(2)}</span>
              </div>
            )}

            <div className="summary-row grand-total">
              <span>Grand Total:</span>
              <span>₹{(po.grandTotal || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer Signature area */}
        {showSignature && (
          <div className={`invoice-footer align-sig-${signaturePosition}`}>
            <div className="footer-sign">
              {company.signatureImage ? (
                <img
                  src={company.signatureImage}
                  alt="Digital Signature"
                  style={{ maxHeight: '80px', maxWidth: '200px', objectFit: 'contain', marginBottom: '10px' }}
                />
              ) : (
                <div style={{ height: '80px' }}></div>
              )}
              <div className="sign-line"></div>
              <p>Authorized Signatory</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewPurchaseOrder;
