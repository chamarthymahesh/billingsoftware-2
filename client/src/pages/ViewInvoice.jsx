import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Printer } from 'lucide-react';
import './Sales.css';

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

  if (loading) return <div className="sl-center">Loading Invoice...</div>;
  if (!invoice) return <div className="sl-center">Invoice not found.</div>;

  return (
    <div className="sl-page">
      <div className="sl-header">
        <div>
          <button style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }} onClick={() => navigate('/sales')}>
            <ArrowLeft size={16} /> Back to Sales
          </button>
          <h1 className="sl-title">Invoice {invoice.invoiceNumber}</h1>
          <p className="sl-subtitle">{new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</p>
        </div>
        <button className="sl-new-btn" onClick={() => window.print()}>
          <Printer size={18} /> Print Invoice
        </button>
      </div>

      <div style={{ background: '#fff', color: '#000', padding: '40px', borderRadius: '8px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #eee', paddingBottom: '20px', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: '0 0 10px 0' }}>Bill To:</h2>
            <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{invoice.customerName}</p>
            {invoice.customerPhone && <p style={{ margin: '0 0 5px 0' }}>Phone: {invoice.customerPhone}</p>}
            {invoice.customerGSTIN && <p style={{ margin: '0 0 5px 0' }}>GSTIN: {invoice.customerGSTIN}</p>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ margin: '0 0 10px 0' }}>Invoice Details:</h2>
            <p style={{ margin: '0 0 5px 0' }}><strong>Invoice #:</strong> {invoice.invoiceNumber}</p>
            <p style={{ margin: '0 0 5px 0' }}><strong>Date:</strong> {new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</p>
            <p style={{ margin: '0 0 5px 0' }}><strong>Status:</strong> {invoice.paymentStatus}</p>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>Item</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Qty</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Rate</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Tax</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px' }}>{item.productName}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>{item.qty} {item.unit}</td>
                <td style={{ padding: '12px', textAlign: 'right' }}>₹{item.rate.toFixed(2)}</td>
                <td style={{ padding: '12px', textAlign: 'right' }}>₹{item.taxAmount.toFixed(2)}</td>
                <td style={{ padding: '12px', textAlign: 'right' }}>₹{item.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '300px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Subtotal:</span>
              <span>₹{invoice.subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Tax:</span>
              <span>₹{invoice.totalTax.toFixed(2)}</span>
            </div>
            {invoice.transportCharges > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Transport:</span>
                <span>₹{invoice.transportCharges.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #eee', paddingTop: '12px', marginTop: '12px', fontWeight: 'bold', fontSize: '1.2rem' }}>
              <span>Grand Total:</span>
              <span>₹{invoice.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewInvoice;
