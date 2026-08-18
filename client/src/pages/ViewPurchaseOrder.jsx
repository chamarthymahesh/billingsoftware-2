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
  const showLogo = templates.showLogo !== false;
  const logoImage = templates.logoImage || '';

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
      <div className="invoice-container template-Professional" style={{ fontFamily: templates.fontFamily || 'Inter, sans-serif' }}>
        <div className="invoice-header" style={{ borderColor: primaryColor }}>
          <div className="company-logo-section">
            {showLogo && logoImage && (
              <img src={logoImage} alt="Company Logo" className="invoice-logo" />
            )}
            <div>
              <h2 className="company-name" style={{ color: primaryColor }}>{company.name || 'Company Name'}</h2>
              <div className="company-details">
                {company.address && <div>{company.address}</div>}
                {company.phone && <div>Phone: {company.phone}</div>}
                {company.email && <div>Email: {company.email}</div>}
                {company.gstin && <div>GSTIN: {company.gstin}</div>}
              </div>
            </div>
          </div>

          <div className="invoice-meta">
            <h1 style={{ color: primaryColor, margin: 0, fontSize: '24px', fontWeight: 800 }}>PURCHASE ORDER</h1>
            <div style={{ marginTop: '10px' }}>
              <div><strong>PO No:</strong> {po.poNumber}</div>
              <div><strong>PO Date:</strong> {new Date(po.poDate).toLocaleDateString('en-IN')}</div>
              {po.expectedDeliveryDate && (
                <div><strong>Expected Delivery:</strong> {new Date(po.expectedDeliveryDate).toLocaleDateString('en-IN')}</div>
              )}
              <div><strong>Status:</strong> {po.status}</div>
            </div>
          </div>
        </div>

        {/* Addresses Section */}
        <div className="addresses-container">
          <div className="address-box">
            <h4 style={{ color: primaryColor }}>Vendor / Supplier:</h4>
            <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#1e293b' }}>{po.supplierName}</div>
            {po.billingAddress && <div style={{ whiteSpace: 'pre-line' }}>{po.billingAddress}</div>}
            {po.supplierPhone && <div>Phone: {po.supplierPhone}</div>}
            {po.supplierGSTIN && <div>GSTIN: {po.supplierGSTIN}</div>}
            {po.supplierState && <div>State: {po.supplierState}</div>}
          </div>

          <div className="address-box">
            <h4 style={{ color: primaryColor }}>Deliver To / Buyer:</h4>
            <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#1e293b' }}>{company.name}</div>
            {company.address && <div style={{ whiteSpace: 'pre-line' }}>{company.address}</div>}
            {company.phone && <div>Phone: {company.phone}</div>}
            {company.gstin && <div>GSTIN: {company.gstin}</div>}
          </div>
        </div>

        {/* Items Table */}
        <table className="items-table bordered">
          <thead>
            <tr style={{ background: primaryColor, color: '#fff' }}>
              <th style={{ width: '5%' }}>#</th>
              <th style={{ width: '40%' }}>Product / Description</th>
              <th>HSN</th>
              <th>Qty</th>
              <th>Rate (₹)</th>
              {isGst && <th>GST %</th>}
              <th style={{ textAlign: 'right' }}>Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            {po.items?.map((item, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>
                  <div style={{ fontWeight: 600 }}>{item.productName}</div>
                </td>
                <td>{item.hsnCode || '-'}</td>
                <td>{item.qty} {item.unit || 'Pcs'}</td>
                <td>₹{(item.rate || 0).toFixed(2)}</td>
                {isGst && <td>{item.gstRate || 0}%</td>}
                <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{(item.total || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Section */}
        <div className="totals-section">
          <div className="notes-terms" style={{ flex: 1 }}>
            {po.notes && (
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ color: primaryColor, margin: '0 0 4px 0' }}>Notes:</h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#475569', whiteSpace: 'pre-line' }}>{po.notes}</p>
              </div>
            )}
            {po.termsConditions && (
              <div>
                <h4 style={{ color: primaryColor, margin: '0 0 4px 0' }}>Terms & Conditions:</h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b', whiteSpace: 'pre-line' }}>{po.termsConditions}</p>
              </div>
            )}
          </div>

          <div className="totals-table" style={{ minWidth: '280px' }}>
            <div className="total-row">
              <span>Subtotal:</span>
              <span>₹{(po.subtotal || 0).toFixed(2)}</span>
            </div>
            {isGst && (
              <div className="total-row">
                <span>Tax Amount (GST):</span>
                <span>₹{(po.totalTax || 0).toFixed(2)}</span>
              </div>
            )}
            {Boolean(po.packagingCharges) && (
              <div className="total-row">
                <span>Packaging Charges:</span>
                <span>₹{(po.packagingCharges).toFixed(2)}</span>
              </div>
            )}
            {Boolean(po.transportCharges) && (
              <div className="total-row">
                <span>Transport Charges:</span>
                <span>₹{(po.transportCharges).toFixed(2)}</span>
              </div>
            )}
            {Boolean(po.otherCharges) && (
              <div className="total-row">
                <span>Other Charges:</span>
                <span>₹{(po.otherCharges).toFixed(2)}</span>
              </div>
            )}
            {Boolean(po.adjustment) && (
              <div className="total-row">
                <span>Adjustment:</span>
                <span>₹{(po.adjustment).toFixed(2)}</span>
              </div>
            )}
            <div className="total-row grand-total" style={{ borderTop: `2px solid ${primaryColor}`, color: primaryColor }}>
              <span>Grand Total:</span>
              <span>₹{(po.grandTotal || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer Signature area */}
        <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            This is a computer-generated Purchase Order.
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '40px' }}>For {company.name}</div>
            <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '4px', fontSize: '12px', color: '#64748b' }}>Authorized Signatory</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewPurchaseOrder;
