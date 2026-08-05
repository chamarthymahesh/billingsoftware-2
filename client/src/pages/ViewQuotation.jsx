import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Printer, Receipt } from 'lucide-react';
import './ViewInvoice.css'; // Reuse the beautiful invoice view/print styling

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ViewQuotation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuotation = async () => {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        const res = await axios.get(`${API}/api/quotations/${id}`, {
          headers: { Authorization: `Bearer ${userInfo.token}` }
        });
        setQuotation(res.data);
      } catch (err) {
        console.error('Error fetching quotation:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuotation();
  }, [id]);

  if (loading) return <div className="sl-center" style={{ color: '#fff', padding: '40px', textAlign: 'center' }}>Loading Quotation...</div>;
  if (!quotation) return <div className="sl-center" style={{ color: '#fff', padding: '40px', textAlign: 'center' }}>Quotation not found.</div>;

  const sellerGSTIN = quotation.company?.gstin || '';
  const sellerStateCode = sellerGSTIN.substring(0, 2);
  
  const customerGSTIN = quotation.customerGSTIN || '';
  const customerStateCode = customerGSTIN.substring(0, 2) || (quotation.placeOfSupply ? quotation.placeOfSupply.substring(0, 2) : '') || (quotation.customerState ? quotation.customerState.substring(0, 2) : '');
  
  const isInterState = sellerStateCode && customerStateCode && sellerStateCode !== customerStateCode;
  const isGst = !!sellerGSTIN || quotation.totalTax > 0;

  const templates = quotation.company?.invoiceTemplates || {};
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
          <button style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }} onClick={() => navigate('/quotations')}>
            <ArrowLeft size={16} /> Back to Quotations
          </button>
          <h1 className="sl-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            Quotation {quotation.quotationNumber}
            {quotation.isExpectedOrder && (
              <span className="no-print" style={{ display: "inline-block", background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", fontSize: "12px", fontWeight: "bold", padding: "4px 10px", borderRadius: "6px" }}>
                Expected Order
              </span>
            )}
          </h1>
          <p className="sl-subtitle">View and print quotation {quotation.quotationNumber}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {quotation.status !== 'Accepted' && (
            <button 
              onClick={() => navigate(`/sales/new?fromQuotation=${quotation._id}`)} 
              className="sl-new-btn"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
            >
              <Receipt size={18} /> Convert to Invoice
            </button>
          )}
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
            <h1 className="company-name" style={{ color: primaryColor }}>{quotation.company?.name}</h1>
          )}
          <p>{quotation.company?.address}</p>
          <p>GSTIN: {sellerGSTIN || 'N/A'} | Phone: {quotation.company?.phone}</p>
          {quotation.company?.email && <p>Email: {quotation.company.email}</p>}
        </div>

        {/* Quotation Metadata Block */}
        <div className="invoice-meta" style={{ marginBottom: '20px' }}>
          <h2 className="invoice-type" style={{ background: `${primaryColor}15`, color: primaryColor }}>QUOTATION</h2>
          <div className="meta-row">
            <span className="meta-label">Quotation #:</span>
            <span className="meta-value">{quotation.quotationNumber}</span>
          </div>
          <div className="meta-row">
            <span className="meta-label">Date:</span>
            <span className="meta-value">{new Date(quotation.quotationDate).toLocaleDateString('en-IN')}</span>
          </div>
        </div>

        <hr className="divider" />

        {/* Billing & Shipping Section */}
        <div className={`address-container layout-${addressLayout}`}>
          <div className="bill-to-section">
            <h3 className="section-title" style={{ color: primaryColor }}>Quotation To:</h3>
            <div className="customer-info">
              <h4 className="customer-name">{quotation.customerName}</h4>
              <p>{quotation.billingAddress}</p>
              {quotation.customerPhone && <p>Phone: {quotation.customerPhone}</p>}
              {customerGSTIN && <p><strong>GSTIN: {customerGSTIN}</strong></p>}
              {quotation.customerState && <p>State: {quotation.customerState}</p>}
            </div>
          </div>
          
          {quotation.shippingAddress && quotation.shippingAddress !== quotation.billingAddress && (
            <div className="ship-to-section">
              <h3 className="section-title" style={{ color: primaryColor }}>Ship To:</h3>
              <div className="customer-info">
                <p>{quotation.shippingAddress}</p>
                <p><strong>Place of Supply: {quotation.placeOfSupply || quotation.customerState}</strong></p>
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
            {quotation.items?.map((item, idx) => (
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
            {(quotation.bankDetails?.bankName || quotation.company?.bankDetails?.bankName) && (
              <div className="bank-details-info" style={{ marginTop: 0 }}>
                <h4 className="notes-title" style={{ color: primaryColor }}>Bank Details (For Payment)</h4>
                <div className="bank-grid">
                  {(() => {
                    const bank = quotation.bankDetails?.bankName ? quotation.bankDetails : quotation.company.bankDetails;
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
            {(quotation.notes || quotation.termsConditions) && (
              <div className="invoice-notes">
                <h4 className="notes-title" style={{ color: primaryColor }}>Notes & Terms</h4>
                <p style={{ whiteSpace: 'pre-line' }}>{quotation.notes || quotation.termsConditions}</p>
              </div>
            )}
          </div>

          <div className="summary-details">
            <div className="summary-row">
              <span>Subtotal:</span>
              <span>₹{quotation.subtotal.toFixed(2)}</span>
            </div>
            {isGst && (
              <>
                {isInterState ? (
                  <div className="summary-row">
                    <span>IGST:</span>
                    <span>₹{quotation.totalTax.toFixed(2)}</span>
                  </div>
                ) : (
                  <>
                    <div className="summary-row">
                      <span>CGST:</span>
                      <span>₹{(quotation.totalTax / 2).toFixed(2)}</span>
                    </div>
                    <div className="summary-row">
                      <span>SGST:</span>
                      <span>₹{(quotation.totalTax / 2).toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div className="summary-row highlight">
                  <span>Total Tax:</span>
                  <span>₹{quotation.totalTax.toFixed(2)}</span>
                </div>
              </>
            )}

            <div className="summary-row grand-total">
              <span>Grand Total:</span>
              <span>₹{quotation.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Signature Block */}
        {showSignature && (
          <div className={`invoice-footer align-sig-${signaturePosition}`}>
            <div className="footer-sign">
              <div className="sign-line" />
              <p>Authorized Signatory</p>
              <p style={{ fontWeight: 600, fontSize: '0.85em', marginTop: '4px' }}>{quotation.company?.name}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewQuotation;
