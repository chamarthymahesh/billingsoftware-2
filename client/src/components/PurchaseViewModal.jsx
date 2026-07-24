import { X, Building2, User, Calendar, Hash, Package } from 'lucide-react';
import './PurchaseViewModal.css';

const PurchaseViewModal = ({ purchase, onClose }) => {
  if (!purchase) return null;

  const totalTax = purchase.items?.reduce((sum, item) => {
    const qty = item.qty || 0;
    const rate = item.rate || 0;
    const gst = item.gstRate || 0;
    let taxAmount = 0;
    if (item.isInclusive) {
      const baseRate = rate / (1 + gst / 100);
      taxAmount = (rate * qty) - baseRate * qty;
    } else {
      const taxableAmount = rate * qty;
      taxAmount = (taxableAmount * gst) / 100;
    }
    return sum + taxAmount;
  }, 0) || 0;
  const subtotal = (purchase.itemsTotal || 0) - totalTax;

  const buyerGSTIN = purchase.targetCompany?.gstin || '';
  const buyerStateCode = buyerGSTIN.substring(0, 2);
  const sellerGSTIN = purchase.supplierGSTIN || '';
  const sellerStateCode = sellerGSTIN.substring(0, 2);
  const isInterState = buyerStateCode && sellerStateCode && buyerStateCode !== sellerStateCode;

  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid':    return { bg: 'rgba(16,185,129,0.15)', color: '#34d399' };
      case 'Partial': return { bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24' };
      default:        return { bg: 'rgba(239,68,68,0.15)',   color: '#f87171' };
    }
  };
  const sc = getStatusColor(purchase.paymentStatus);

  return (
    <div className="pvm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pvm-modal">

        {/* Header */}
        <div className="pvm-header">
          <div>
            <h2>Purchase Invoice</h2>
            <p className="pvm-bill-no">Bill #{purchase.billNumber}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="pvm-status-badge" style={{ background: sc.bg, color: sc.color }}>
              {purchase.paymentStatus}
            </span>
            <button className="pvm-close" onClick={onClose}><X size={20} /></button>
          </div>
        </div>

        {/* Meta Info */}
        <div className="pvm-meta-grid">
          <div className="pvm-meta-card">
            <div className="pvm-meta-icon"><User size={16} /></div>
            <div>
              <p className="pvm-meta-label">Supplier</p>
              <p className="pvm-meta-value">{purchase.supplierName}</p>
              {purchase.supplierGSTIN && (
                <p className="pvm-meta-sub">GSTIN: {purchase.supplierGSTIN}</p>
              )}
            </div>
          </div>
          <div className="pvm-meta-card">
            <div className="pvm-meta-icon"><Building2 size={16} /></div>
            <div>
              <p className="pvm-meta-label">Company</p>
              <p className="pvm-meta-value">
                {purchase.targetCompany?.name || purchase.targetCompany || '—'}
              </p>
            </div>
          </div>
          <div className="pvm-meta-card">
            <div className="pvm-meta-icon"><Calendar size={16} /></div>
            <div>
              <p className="pvm-meta-label">Purchase Date</p>
              <p className="pvm-meta-value">{new Date(purchase.purchaseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>
          <div className="pvm-meta-card">
            <div className="pvm-meta-icon"><Hash size={16} /></div>
            <div>
              <p className="pvm-meta-label">Bill Number</p>
              <p className="pvm-meta-value">{purchase.billNumber}</p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="pvm-section">
          <div className="pvm-section-title">
            <Package size={16} />
            <span>Items ({purchase.items?.length || 0})</span>
          </div>
          <div className="pvm-table-wrap">
            <table className="pvm-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Rate (₹)</th>
                  <th>GST %</th>
                  <th>Incl?</th>
                  <th style={{ textAlign: 'right' }}>Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {purchase.items?.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>
                      {item.product?.name || item.productName || '—'}
                    </td>
                    <td>{item.qty}</td>
                    <td>₹{item.rate?.toFixed(2)}</td>
                    <td>{item.gstRate}%</td>
                    <td>{item.isInclusive ? '✓' : '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{item.total?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="pvm-totals">
          <div className="pvm-total-row">
            <span>Taxable Amount</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          {totalTax > 0 && (
            isInterState ? (
              <div className="pvm-total-row">
                <span>IGST</span>
                <span>₹{totalTax.toFixed(2)}</span>
              </div>
            ) : (
              <>
                <div className="pvm-total-row">
                  <span>CGST</span>
                  <span>₹{(totalTax / 2).toFixed(2)}</span>
                </div>
                <div className="pvm-total-row">
                  <span>SGST</span>
                  <span>₹{(totalTax / 2).toFixed(2)}</span>
                </div>
              </>
            )
          )}
          <div className="pvm-total-row">
            <span>Items Total</span>
            <span>₹{purchase.itemsTotal?.toFixed(2)}</span>
          </div>
          {purchase.packagingCharges > 0 && (
            <div className="pvm-total-row">
              <span>Packaging Charges</span>
              <span>₹{purchase.packagingCharges?.toFixed(2)}</span>
            </div>
          )}
          {purchase.transportCharges > 0 && (
            <div className="pvm-total-row">
              <span>Transport Charges</span>
              <span>₹{purchase.transportCharges?.toFixed(2)}</span>
            </div>
          )}
          {purchase.otherMiscCharges > 0 && (
            <div className="pvm-total-row">
              <span>Other Charges</span>
              <span>₹{purchase.otherMiscCharges?.toFixed(2)}</span>
            </div>
          )}
          {purchase.extraCharges > 0 && (
            <div className="pvm-total-row">
              <span>Extra Charges</span>
              <span>+₹{purchase.extraCharges?.toFixed(2)}</span>
            </div>
          )}
          {purchase.adjustment > 0 && (
            <div className="pvm-total-row">
              <span>Adjustment</span>
              <span>-₹{purchase.adjustment?.toFixed(2)}</span>
            </div>
          )}
          <div className="pvm-total-row pvm-grand-total">
            <span>Grand Total</span>
            <span>₹{purchase.grandTotal?.toFixed(2)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="pvm-footer">
          <button className="pvm-close-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default PurchaseViewModal;
