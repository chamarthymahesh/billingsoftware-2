import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Printer } from 'lucide-react';
import './ViewInvoice.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ViewInvoice = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        const res = await axios.get(`${API}/api/invoices/${id}`, {
          headers: { Authorization: `Bearer ${userInfo.token}` }
        });
        setInvoice(res.data);
      } catch (err) {
        console.error('Error fetching invoice:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [id]);

  if (loading) return <div className="sl-center" style={{ color: '#fff', padding: '40px', textAlign: 'center' }}>Loading Invoice...</div>;
  if (!invoice) return <div className="sl-center" style={{ color: '#fff', padding: '40px', textAlign: 'center' }}>Invoice not found.</div>;

  const sellerGSTIN = invoice.company?.gstin || '';
  const sellerStateCode = sellerGSTIN.substring(0, 2);
  
  const customerGSTIN = invoice.customerGSTIN || '';
  const customerStateCode = customerGSTIN.substring(0, 2) || (invoice.placeOfSupply ? invoice.placeOfSupply.substring(0, 2) : '') || (invoice.customerState ? invoice.customerState.substring(0, 2) : '');
  
  const isInterState = sellerStateCode && customerStateCode && sellerStateCode !== customerStateCode;
  const isGst = !!sellerGSTIN || invoice.totalTax > 0;

  let templateClass = 'template-Professional';
  const headerStyle = invoice.company?.invoiceTemplates?.headerStyle || '';
  if (headerStyle.includes('Modern')) {
    templateClass = 'template-Modern';
  } else if (headerStyle.includes('Classic')) {
    templateClass = 'template-Classic';
  }

  // Map payment status to CSS class format
  const getStatusClass = (status) => {
    if (!status) return 'status-unpaid';
    const s = status.toLowerCase();
    if (s === 'paid') return 'status-paid';
    if (s === 'pending') return 'status-unpaid';
    if (s === 'partial') return 'status-partially_paid';
    return 'status-unpaid';
  };

  const templates = invoice.company?.invoiceTemplates || {};
  const primaryColor = templates.primaryColor || '#2563eb';
  const secondaryColor = templates.secondaryColor || '#10b981';
  const fontFamily = templates.fontFamily || 'Inter';
  const addressFontSize = templates.companyAddressFontSize || '14px';
  const showLogo = templates.showLogo !== false;
  const showSignature = templates.showSignature !== false;
  const logoImage = templates.logoImage || '';
  const invoiceTitle = templates.invoiceTitle || (isGst ? 'TAX INVOICE' : 'INVOICE');

  const logoPosition = templates.logoPosition || 'left';
  const metaPosition = templates.metaPosition || 'right';
  const addressLayout = templates.addressLayout || 'side-by-side';
  const signaturePosition = templates.signaturePosition || 'right';
  const termsPosition = templates.termsPosition || 'left';
  const tableStyle = templates.tableStyle || 'bordered';

  // WYSIWYG Canvas Config
  let canvasElements = null;
  try {
    if (templates.canvasLayout) {
      canvasElements = JSON.parse(templates.canvasLayout);
    }
  } catch (e) {
    console.error('Error parsing canvas layout', e);
  }

  const getCanvasStyles = (key, defaultOrder) => {
    if (!canvasElements || !canvasElements[key]) {
      return { order: defaultOrder };
    }
    const el = canvasElements[key];
    if (!el.isVisible) {
      return { display: 'none' };
    }
    return {
      order: el.order !== undefined ? el.order : defaultOrder,
      fontSize: el.fontSize,
      color: el.color,
      fontWeight: el.fontWeight,
      fontStyle: el.fontStyle,
      textAlign: el.alignment
    };
  };

  return (
    <div className="sl-page">
      <div className="sl-header no-print">
        <div>
          <button style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }} onClick={() => navigate('/sales')}>
            <ArrowLeft size={16} /> Back to Sales
          </button>
          <h1 className="sl-title">Invoice {invoice.invoiceNumber}</h1>
          <p className="sl-subtitle">View and print invoice {invoice.invoiceNumber}</p>
        </div>
        <button className="sl-new-btn" onClick={() => window.print()}>
          <Printer size={18} /> Print / PDF
        </button>
      </div>

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
        {(!canvasElements || canvasElements.companyInfo?.isVisible) && (
          <div 
            className={`company-info header-logo-${logoPosition}`} 
            style={{ 
              ...getCanvasStyles('companyInfo', 1), 
              fontSize: getCanvasStyles('companyInfo', 1).fontSize || addressFontSize,
              marginBottom: '20px'
            }}
          >
            {showLogo && logoImage ? (
              <img src={logoImage} alt="Company Logo" style={{ maxHeight: '80px', marginBottom: '12px', objectFit: 'contain', display: 'inline-block' }} />
            ) : (
              <h1 className="company-name" style={{ color: getCanvasStyles('companyInfo', 1).color || primaryColor }}>{invoice.company?.name}</h1>
            )}
            <p>{invoice.company?.address}</p>
            <p>GSTIN: {invoice.company?.gstin || 'N/A'} | Phone: {invoice.company?.phone}</p>
            {invoice.company?.email && <p>Email: {invoice.company.email}</p>}
          </div>
        )}

        {/* Invoice Metadata Block */}
        {(!canvasElements || canvasElements.invoiceMeta?.isVisible) && (
          <div 
            className={`invoice-meta header-meta-${metaPosition}`} 
            style={{ 
              ...getCanvasStyles('invoiceMeta', 2),
              marginBottom: '20px'
            }}
          >
            <h2 className="invoice-type" style={{ background: `${primaryColor}15`, color: getCanvasStyles('invoiceMeta', 2).color || primaryColor }}>{invoiceTitle}</h2>
            <div className="meta-row">
              <span className="meta-label">Invoice #:</span>
              <span className="meta-value">{invoice.invoiceNumber}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Date:</span>
              <span className="meta-value">{new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</span>
            </div>

            {invoice.gemContractNumber && (
              <div className="meta-row">
                <span className="meta-label">GeM Contract:</span>
                <span className="meta-value">{invoice.gemContractNumber}</span>
              </div>
            )}
          </div>
        )}

        <hr className="divider" style={{ order: getCanvasStyles('companyInfo', 1).order }} />

        {/* Billing & Shipping Section */}
        <div className={`address-container layout-${addressLayout}`} style={{ order: getCanvasStyles('billTo', 3).order }}>
          {(!canvasElements || canvasElements.billTo?.isVisible) && (
            <div className="bill-to-section" style={getCanvasStyles('billTo', 3)}>
              <h3 className="section-title" style={{ color: getCanvasStyles('billTo', 3).color || primaryColor }}>Bill To:</h3>
              <div className="customer-info">
                <h4 className="customer-name">{invoice.customerName}</h4>
                <p>{invoice.billingAddress}</p>
                {invoice.customerPhone && <p>Phone: {invoice.customerPhone}</p>}
                {isGst && invoice.customerGSTIN && (
                  <p><strong>GSTIN: {invoice.customerGSTIN}</strong></p>
                )}
                {invoice.customerState && <p>State: {invoice.customerState}</p>}
              </div>
            </div>
          )}
          
          {(!canvasElements || canvasElements.shipTo?.isVisible) && invoice.shippingAddress && invoice.shippingAddress !== invoice.billingAddress && (
            <div className="ship-to-section" style={getCanvasStyles('shipTo', 4)}>
              <h3 className="section-title" style={{ color: getCanvasStyles('shipTo', 4).color || primaryColor }}>Ship To:</h3>
              <div className="customer-info">
                <p>{invoice.shippingAddress}</p>
                <p><strong>Place of Supply: {invoice.placeOfSupply || invoice.customerState}</strong></p>
              </div>
            </div>
          )}
        </div>

        {/* Items Table */}
        {(!canvasElements || canvasElements.itemsTable?.isVisible) && (
          <table 
            className={`invoice-table table-style-${canvasElements?.itemsTable?.tableStyle || tableStyle}`} 
            style={getCanvasStyles('itemsTable', 5)}
          >
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
              {invoice.items.map((item, i) => (
                <tr key={i}>
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
        )}

        {/* Summary Section */}
        <div 
          className={`invoice-summary-container layout-terms-${termsPosition}`} 
          style={{ 
            order: Math.min(getCanvasStyles('bankDetails', 6).order, getCanvasStyles('terms', 7).order, 7)
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
            {(!canvasElements || canvasElements.terms?.isVisible) && (invoice.notes || invoice.termsConditions) && (
              <div className="invoice-notes" style={getCanvasStyles('terms', 7)}>
                <h4 className="notes-title" style={{ color: getCanvasStyles('terms', 7).color || primaryColor }}>Notes & Terms</h4>
                <p style={{ whiteSpace: 'pre-line' }}>{invoice.notes || invoice.termsConditions}</p>
              </div>
            )}
            
            {(!canvasElements || canvasElements.bankDetails?.isVisible) && invoice.company?.bankDetails?.bankName && (
              <div className="bank-details-info" style={{ ...getCanvasStyles('bankDetails', 6), marginTop: 0 }}>
                <h4 className="notes-title" style={{ color: getCanvasStyles('bankDetails', 6).color || primaryColor }}>Bank Details (For Payment)</h4>
                <div className="bank-grid">
                  <p><span>Bank:</span> {invoice.company.bankDetails.bankName}</p>
                  <p><span>A/c No:</span> {invoice.company.bankDetails.accountNumber}</p>
                  <p><span>IFSC:</span> {invoice.company.bankDetails.ifscCode}</p>
                  {invoice.company.bankDetails.branchName && <p><span>Branch:</span> {invoice.company.bankDetails.branchName}</p>}
                </div>
              </div>
            )}
          </div>

          <div className="summary-details">
            <div className="summary-row">
              <span>Subtotal:</span>
              <span>₹{invoice.subtotal.toFixed(2)}</span>
            </div>
            {isGst && (
              <>
                {isInterState ? (
                  <div className="summary-row">
                    <span>IGST:</span>
                    <span>₹{invoice.totalTax.toFixed(2)}</span>
                  </div>
                ) : (
                  <>
                    <div className="summary-row">
                      <span>CGST:</span>
                      <span>₹{(invoice.totalTax / 2).toFixed(2)}</span>
                    </div>
                    <div className="summary-row">
                      <span>SGST:</span>
                      <span>₹{(invoice.totalTax / 2).toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div className="summary-row highlight">
                  <span>Total Tax:</span>
                  <span>₹{invoice.totalTax.toFixed(2)}</span>
                </div>
              </>
            )}

            {invoice.transportCharges > 0 && (
              <div className="summary-row">
                <span>Transport Charges:</span>
                <span>₹{invoice.transportCharges.toFixed(2)}</span>
              </div>
            )}
            {invoice.packagingCharges > 0 && (
              <div className="summary-row">
                <span>Packaging Charges:</span>
                <span>₹{invoice.packagingCharges.toFixed(2)}</span>
              </div>
            )}
            {invoice.otherCharges > 0 && (
              <div className="summary-row">
                <span>Other Charges:</span>
                <span>₹{invoice.otherCharges.toFixed(2)}</span>
              </div>
            )}
            {invoice.commissionAmount > 0 && (
              <div className="summary-row" style={{ color: '#34d399' }}>
                <span>Commission ({invoice.commissionType}):</span>
                <span>-₹{invoice.commissionAmount.toFixed(2)}</span>
              </div>
            )}

            {invoice.adjustment > 0 && (
              <div className="summary-row">
                <span>Adjustment:</span>
                <span>-₹{invoice.adjustment.toFixed(2)}</span>
              </div>
            )}

            <div className="summary-row grand-total">
              <span>Grand Total:</span>
              <span>₹{(invoice.grandTotal || (invoice.subtotal + invoice.totalTax)).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        {showSignature && (!canvasElements || canvasElements.signature?.isVisible) && (
          <div 
            className={`invoice-footer align-sig-${canvasElements?.signature?.alignment || signaturePosition}`}
            style={getCanvasStyles('signature', 8)}
          >
            <div className="footer-sign">
              {invoice.company?.signatureImage ? (
                <img 
                  src={invoice.company.signatureImage} 
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

export default ViewInvoice;
