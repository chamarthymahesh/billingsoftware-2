import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Printer } from 'lucide-react';
import './ViewInvoice.css'; // Reuse the beautiful invoice view/print styling

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ViewDeliveryChallan = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [challan, setChallan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChallan = async () => {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        const res = await axios.get(`${API}/api/delivery-challans/${id}`, {
          headers: { Authorization: `Bearer ${userInfo.token}` }
        });
        setChallan(res.data);
      } catch (err) {
        console.error('Error fetching delivery challan:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchChallan();
  }, [id]);

  if (loading) return <div className="sl-center" style={{ color: '#fff', padding: '40px', textAlign: 'center' }}>Loading Delivery Challan...</div>;
  if (!challan) return <div className="sl-center" style={{ color: '#fff', padding: '40px', textAlign: 'center' }}>Delivery Challan not found.</div>;

  const sellerGSTIN = challan.company?.gstin || '';
  const sellerStateCode = sellerGSTIN.substring(0, 2);
  
  const customerGSTIN = challan.customerGSTIN || '';
  const customerStateCode = customerGSTIN.substring(0, 2) || (challan.placeOfSupply ? challan.placeOfSupply.substring(0, 2) : '') || (challan.customerState ? challan.customerState.substring(0, 2) : '');
  
  const isInterState = sellerStateCode && customerStateCode && sellerStateCode !== customerStateCode;
  const isGst = !!sellerGSTIN || challan.totalTax > 0;

  const templates = challan.company?.invoiceTemplates || {};
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
          <button style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }} onClick={() => navigate('/delivery-challans')}>
            <ArrowLeft size={16} /> Back to Delivery Challans
          </button>
          <h1 className="sl-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            Delivery Challan {challan.challanNumber}
          </h1>
          <p className="sl-subtitle">View and print delivery challan {challan.challanNumber}</p>
        </div>
        <button className="sl-new-btn" onClick={() => window.print()}>
          <Printer size={18} /> Print / PDF
        </button>
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
            <h1 className="company-name" style={{ color: primaryColor }}>{challan.company?.name}</h1>
          )}
          <p>{challan.company?.address}</p>
          <p>GSTIN: {sellerGSTIN || 'N/A'} | Phone: {challan.company?.phone}</p>
          {challan.company?.email && <p>Email: {challan.company.email}</p>}
        </div>

        {/* Challan Metadata Block */}
        <div className="invoice-meta" style={{ marginBottom: '20px' }}>
          <h2 className="invoice-type" style={{ background: `${primaryColor}15`, color: primaryColor }}>DELIVERY CHALLAN</h2>
          <div className="meta-row">
            <span className="meta-label">Challan #:</span>
            <span className="meta-value">{challan.challanNumber}</span>
          </div>
          <div className="meta-row">
            <span className="meta-label">Date:</span>
            <span className="meta-value">{new Date(challan.challanDate).toLocaleDateString('en-IN')}</span>
          </div>
          {challan.convertedFromInvoice && (
            <div className="meta-row">
              <span className="meta-label">Ref Invoice:</span>
              <span className="meta-value" style={{ wordBreak: 'break-all', whiteSpace: 'normal' }}>
                {typeof challan.convertedFromInvoice === 'object'
                  ? challan.convertedFromInvoice.invoiceNumber
                  : challan.convertedFromInvoice}
              </span>
            </div>
          )}
        </div>

        <hr className="divider" />

        {/* Billing & Shipping Section */}
        <div className={`address-container layout-${addressLayout}`}>
          <div className="bill-to-section">
            <h3 className="section-title" style={{ color: primaryColor }}>Challan To:</h3>
            <div className="customer-info">
              <h4 className="customer-name">{challan.customerName}</h4>
              <p>{challan.billingAddress}</p>
              {challan.customerPhone && <p>Phone: {challan.customerPhone}</p>}
              {customerGSTIN && <p><strong>GSTIN: {customerGSTIN}</strong></p>}
              {challan.customerState && <p>State: {challan.customerState}</p>}
            </div>
          </div>
          
          {challan.shippingAddress && challan.shippingAddress !== challan.billingAddress && (
            <div className="ship-to-section">
              <h3 className="section-title" style={{ color: primaryColor }}>Ship To:</h3>
              <div className="customer-info">
                <p>{challan.shippingAddress}</p>
                <p><strong>Place of Supply: {challan.placeOfSupply || challan.customerState}</strong></p>
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
            {challan.items?.map((item, idx) => (
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
            {(challan.notes || challan.termsConditions) && (
              <div className="invoice-notes">
                <h4 className="notes-title" style={{ color: primaryColor }}>Notes & Terms</h4>
                <p style={{ whiteSpace: 'pre-line' }}>{challan.notes || challan.termsConditions}</p>
              </div>
            )}
          </div>

          <div className="summary-details">
            <div className="summary-row">
              <span>Subtotal:</span>
              <span>₹{challan.subtotal.toFixed(2)}</span>
            </div>
            {isGst && (
              <>
                {isInterState ? (
                  <div className="summary-row">
                    <span>IGST:</span>
                    <span>₹{challan.totalTax.toFixed(2)}</span>
                  </div>
                ) : (
                  <>
                    <div className="summary-row">
                      <span>CGST:</span>
                      <span>₹{(challan.totalTax / 2).toFixed(2)}</span>
                    </div>
                    <div className="summary-row">
                      <span>SGST:</span>
                      <span>₹{(challan.totalTax / 2).toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div className="summary-row highlight">
                  <span>Total Tax:</span>
                  <span>₹{challan.totalTax.toFixed(2)}</span>
                </div>
              </>
            )}

            <div className="summary-row grand-total">
              <span>Grand Total:</span>
              <span>₹{challan.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Signature Block */}
        {showSignature && (
          <div className={`invoice-footer align-sig-${signaturePosition}`}>
            <div className="footer-sign">
              <div className="sign-line" />
              <p>Receiver's Signature / Signatory</p>
              <p style={{ fontWeight: 600, fontSize: '0.85em', marginTop: '4px' }}>{challan.company?.name}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewDeliveryChallan;
