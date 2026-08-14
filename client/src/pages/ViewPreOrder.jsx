import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Printer } from 'lucide-react';
import './ViewInvoice.css'; // Reuse the beautiful invoice view/print styling

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ViewPreOrder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [preOrder, setPreOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPreOrder = async () => {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        const res = await axios.get(`${API}/api/pre-orders/${id}`, {
          headers: { Authorization: `Bearer ${userInfo.token}` }
        });
        setPreOrder(res.data);
      } catch (err) {
        console.error('Error fetching pre-order:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPreOrder();
  }, [id]);

  if (loading) return <div className="sl-center" style={{ color: '#fff', padding: '40px', textAlign: 'center' }}>Loading Pre Order...</div>;
  if (!preOrder) return <div className="sl-center" style={{ color: '#fff', padding: '40px', textAlign: 'center' }}>Pre Order not found.</div>;

  const sellerGSTIN = preOrder.company?.gstin || '';
  const sellerStateCode = sellerGSTIN.substring(0, 2);
  
  const customerGSTIN = preOrder.customerGSTIN || '';
  const customerStateCode = customerGSTIN.substring(0, 2) || (preOrder.placeOfSupply ? preOrder.placeOfSupply.substring(0, 2) : '') || (preOrder.customerState ? preOrder.customerState.substring(0, 2) : '');
  
  const isInterState = sellerStateCode && customerStateCode && sellerStateCode !== customerStateCode;
  const isGst = !!sellerGSTIN || preOrder.totalTax > 0;

  const templates = preOrder.company?.invoiceTemplates || {};
  const primaryColor = templates.primaryColor || '#2563eb';
  const secondaryColor = templates.secondaryColor || '#10b981';
  const fontFamily = templates.fontFamily || 'Inter';
  const addressFontSize = templates.companyAddressFontSize || '14px';
  const showLogo = templates.showLogo !== false;
  const showSignature = templates.showSignature !== false;
  const logoImage = templates.logoImage || '';
  const logoPosition = templates.logoPosition || 'left';
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
          <button style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }} onClick={() => navigate('/pre-orders')}>
            <ArrowLeft size={16} /> Back to Pre Orders
          </button>
          <h1 className="sl-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            Pre Order {preOrder.preOrderNumber}
            <span className="no-print" style={{ display: "inline-block", background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6", fontSize: "12px", fontWeight: "bold", padding: "4px 10px", borderRadius: "6px" }}>
              {preOrder.status || 'Confirmed'}
            </span>
          </h1>
          <p className="sl-subtitle">View and print pre-order {preOrder.preOrderNumber}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="sl-new-btn" onClick={() => window.print()}>
            <Printer size={18} /> Print / PDF
          </button>
        </div>
      </div>

      {/* Main Print Sheet */}
      <div 
        className={`invoice-container ${templateClass}`}
        style={{
          fontFamily: `${fontFamily}, sans-serif`,
          '--primary-color': primaryColor,
          '--secondary-color': secondaryColor,
          '--secondary-bg-color': `${secondaryColor}15`,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Top accent */}
        <div style={{ height: '6px', background: primaryColor, borderRadius: '8px 8px 0 0', margin: '-48px -48px 24px -48px' }}></div>

        {/* Company Header Block */}
        <div className={`company-info header-logo-${logoPosition}`} style={{ fontSize: addressFontSize, marginBottom: '20px' }}>
          {showLogo && logoImage ? (
            <img src={logoImage} alt="Company Logo" style={{ maxHeight: '80px', marginBottom: '12px', objectFit: 'contain', display: 'inline-block' }} />
          ) : (
            <h1 className="company-name" style={{ color: primaryColor }}>{preOrder.company?.name}</h1>
          )}
          <p>{preOrder.company?.address}</p>
          <p>GSTIN: {sellerGSTIN || 'N/A'} | Phone: {preOrder.company?.phone}</p>
          {preOrder.company?.email && <p>Email: {preOrder.company.email}</p>}
        </div>

        {/* Pre Order Metadata Block */}
        <div className="invoice-meta" style={{ marginBottom: '20px' }}>
          <h2 className="invoice-type" style={{ background: `${primaryColor}15`, color: primaryColor }}>PRE ORDER</h2>
          <div className="meta-row">
            <span className="meta-label">Pre Order #:</span>
            <span className="meta-value">{preOrder.preOrderNumber}</span>
          </div>
          <div className="meta-row">
            <span className="meta-label">Date:</span>
            <span className="meta-value">{new Date(preOrder.preOrderDate).toLocaleDateString('en-IN')}</span>
          </div>
          <div className="meta-row">
            <span className="meta-label">Status:</span>
            <span className="meta-value">{preOrder.status || 'Confirmed'}</span>
          </div>
        </div>

        <hr className="divider" />

        {/* Billing & Shipping Section */}
        <div className={`address-container layout-${addressLayout}`}>
          <div className="bill-to-section">
            <h3 className="section-title" style={{ color: primaryColor }}>Pre Order To:</h3>
            <div className="customer-info">
              <h4 className="customer-name">{preOrder.customerName}</h4>
              <p>{preOrder.billingAddress}</p>
              {preOrder.customerPhone && <p>Phone: {preOrder.customerPhone}</p>}
              {customerGSTIN && <p><strong>GSTIN: {customerGSTIN}</strong></p>}
              {preOrder.customerState && <p>State: {preOrder.customerState}</p>}
            </div>
          </div>
          
          {preOrder.shippingAddress && preOrder.shippingAddress !== preOrder.billingAddress && (
            <div className="ship-to-section">
              <h3 className="section-title" style={{ color: primaryColor }}>Ship To:</h3>
              <div className="customer-info">
                <p>{preOrder.shippingAddress}</p>
                <p><strong>Place of Supply: {preOrder.placeOfSupply || preOrder.customerState}</strong></p>
              </div>
            </div>
          )}
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
            {preOrder.items?.map((item, idx) => (
              <tr key={item._id || idx}>
                <td>
                  <div className="item-desc">{item.productName}</div>
                </td>
                {isGst && <td>{item.hsnCode || '—'}</td>}
                <td>{item.qty} {item.unit || 'Pcs'}</td>
                <td>₹{Number(item.rate).toFixed(2)}</td>
                {isGst && <td>{item.gstRate || 0}%</td>}
                <td className="text-right">₹{Number(item.total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary Section */}
        <div className={`invoice-summary-container layout-terms-${termsPosition}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
            {(preOrder.bankDetails?.bankName || preOrder.company?.bankDetails?.bankName) && (
              <div className="bank-details-info" style={{ marginTop: 0 }}>
                <h4 className="notes-title" style={{ color: primaryColor }}>Bank Details (For Payment)</h4>
                <div className="bank-grid">
                  {(() => {
                    const bank = preOrder.bankDetails?.bankName ? preOrder.bankDetails : preOrder.company.bankDetails;
                    return (
                      <>
                        <p><span>Bank:</span> {bank.bankName}</p>
                        <p><span>A/c No:</span> {bank.accountNumber}</p>
                        <p><span>IFSC:</span> {bank.ifscCode}</p>
                        {bank.branchName && <p><span>Branch:</span> {bank.branchName}</p>}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
            {(preOrder.notes || preOrder.termsConditions) && (
              <div className="invoice-notes">
                <h4 className="notes-title" style={{ color: primaryColor }}>Notes & Terms</h4>
                <p style={{ whiteSpace: 'pre-line' }}>{preOrder.notes || preOrder.termsConditions}</p>
              </div>
            )}
          </div>

          <div className="summary-details">
            <div className="summary-row">
              <span>Subtotal:</span>
              <span>₹{preOrder.subtotal.toFixed(2)}</span>
            </div>
            {isGst && (
              <>
                {isInterState ? (
                  <div className="summary-row">
                    <span>IGST:</span>
                    <span>₹{preOrder.totalTax.toFixed(2)}</span>
                  </div>
                ) : (
                  <>
                    <div className="summary-row">
                      <span>CGST:</span>
                      <span>₹{(preOrder.totalTax / 2).toFixed(2)}</span>
                    </div>
                    <div className="summary-row">
                      <span>SGST:</span>
                      <span>₹{(preOrder.totalTax / 2).toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div className="summary-row highlight">
                  <span>Total Tax:</span>
                  <span>₹{preOrder.totalTax.toFixed(2)}</span>
                </div>
              </>
            )}

            <div className="summary-row grand-total">
              <span>Grand Total:</span>
              <span>₹{preOrder.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Signature Block */}
        {showSignature && (
          <div className={`invoice-footer align-sig-${signaturePosition}`}>
            <div className="footer-sign">
              <div className="sign-line" />
              <p>Authorized Signatory</p>
              <p style={{ fontWeight: 600, fontSize: '0.85em', marginTop: '4px' }}>{preOrder.company?.name}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewPreOrder;
