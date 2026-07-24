import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, TrendingUp, DollarSign, FileText, CheckCircle, Search, Eye, Edit, Trash2 } from 'lucide-react';
import './Sales.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Sales = () => {
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState([]);

  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  const authHeader = { Authorization: `Bearer ${userInfo?.token}` };

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await axios.get(`${API}/api/companies`, { headers: authHeader });
        setCompanies(res.data);
        if (res.data.length > 0) setSelectedCompany(res.data[0]._id);
      } catch (err) {
        console.error('Error fetching companies:', err);
      }
    };
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (!selectedCompany) return;
    const fetchSales = async () => {
      setLoading(true);
      try {
        // Try fetching invoices for the selected company
        const res = await axios.get(`${API}/api/invoices?companyId=${selectedCompany}`, { headers: authHeader });
        setSales(res.data);
      } catch (err) {
        // If endpoint not available yet, show empty
        setSales([]);
        console.error('Sales fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSales();
  }, [selectedCompany]);

  const filtered = sales.filter(s => {
    const searchLower = search.toLowerCase();
    const matchesCustomer = (s.customerName || '').toLowerCase().includes(searchLower);
    const matchesInvoice = (s.invoiceNumber || '').toLowerCase().includes(searchLower);
    const matchesGem = (s.gemContractNumber || '').toLowerCase().includes(searchLower);
    const matchesProduct = s.items?.some(item => 
      (item.productName || '').toLowerCase().includes(searchLower)
    );
    return matchesCustomer || matchesInvoice || matchesGem || matchesProduct;
  });

  const totalSales = sales.reduce((sum, s) => sum + (s.grandTotal !== undefined ? s.grandTotal : ((s.subtotal || 0) + (s.totalTax || 0))), 0);
  const paidSales = sales.filter(s => s.paymentStatus === 'Paid').reduce((sum, s) => sum + (s.grandTotal !== undefined ? s.grandTotal : ((s.subtotal || 0) + (s.totalTax || 0))), 0);
  const totalBills = sales.length;

  const getStatusClass = (status) => {
    switch (status) {
      case 'Paid': return 'sl-status-paid';
      case 'Partial': return 'sl-status-partial';
      default: return 'sl-status-pending';
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedInvoices(filtered.map(s => s._id));
    } else {
      setSelectedInvoices([]);
    }
  };

  const handleSelectOne = (id) => {
    if (selectedInvoices.includes(id)) {
      setSelectedInvoices(selectedInvoices.filter(i => i !== id));
    } else {
      setSelectedInvoices([...selectedInvoices, id]);
    }
  };

  const handleBulkStatusUpdate = async (status) => {
    try {
      await axios.put(`${API}/api/invoices/bulk-status`, { invoiceIds: selectedInvoices, status }, { headers: authHeader });
      setSales(sales.map(s => selectedInvoices.includes(s._id) ? { ...s, paymentStatus: status } : s));
      setSelectedInvoices([]);
    } catch (err) {
      console.error('Bulk update error', err);
      alert('Failed to update status');
    }
  };

  return (
    <div className="sl-page">
      {/* Header */}
      <div className="sl-header">
        <div>
          <h1 className="sl-title">Sales</h1>
          <p className="sl-subtitle">View and manage all your sales invoices</p>
        </div>
        <button className="sl-new-btn" onClick={() => navigate('/sales/new')}>
          <Plus size={18} /> New Invoice
        </button>
      </div>

      {/* Stats */}
      <div className="sl-stats">
        <div className="sl-stat">
          <div className="sl-stat-icon" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <p>Total Sales Value</p>
            <h3>₹{totalSales.toFixed(2)}</h3>
          </div>
        </div>
        <div className="sl-stat">
          <div className="sl-stat-icon" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>
            <DollarSign size={20} />
          </div>
          <div>
            <p>Amount Collected</p>
            <h3>₹{paidSales.toFixed(2)}</h3>
          </div>
        </div>
        <div className="sl-stat">
          <div className="sl-stat-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
            <CheckCircle size={20} />
          </div>
          <div>
            <p>Total Invoices</p>
            <h3>{totalBills}</h3>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="sl-toolbar">
        <div className="sl-search">
          <Search size={16} className="sl-search-icon" />
          <input
            placeholder="Search by customer, invoice #, product, or GeM contract..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {userInfo.role === 'Super Admin' && (
          <select className="sl-company-select" value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)}>
            {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        )}
      </div>

      {/* Bulk Action Toolbar */}
      {selectedInvoices.length > 0 && (
        <div style={{ padding: '12px 20px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontWeight: 600 }}>{selectedInvoices.length} selected</span>
          <button onClick={() => handleBulkStatusUpdate('Paid')} style={{ background: '#10b981', color: '#fff', padding: '6px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Mark Paid</button>
          <button onClick={() => handleBulkStatusUpdate('Pending')} style={{ background: '#ef4444', color: '#fff', padding: '6px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Mark Pending</button>
          <button onClick={() => handleBulkStatusUpdate('Partial')} style={{ background: '#f59e0b', color: '#fff', padding: '6px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Mark Partial</button>
        </div>
      )}

      {/* Table */}
      <div className="sl-table-wrap">
        <table className="sl-table">
          <thead>
            <tr>
              <th style={{ width: '40px', paddingRight: '0' }}>
                <input type="checkbox" checked={selectedInvoices.length === filtered.length && filtered.length > 0} onChange={handleSelectAll} style={{ cursor: 'pointer', transform: 'scale(1.2)' }} />
              </th>
              <th>Date</th>
              <th>Invoice #</th>
              <th>GeM Contract</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Subtotal</th>
              <th>Tax</th>
              <th>Grand Total</th>
              <th>Status</th>
              <th style={{ minWidth: '100px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="sl-center">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="sl-center">
                  <FileText size={36} style={{ color: '#334155', marginBottom: '0.5rem' }} />
                  <div>No sales invoices found.</div>
                </td>
              </tr>
            ) : (
              filtered.map(s => (
                <tr key={s._id}>
                  <td style={{ paddingRight: '0' }}>
                    <input type="checkbox" checked={selectedInvoices.includes(s._id)} onChange={() => handleSelectOne(s._id)} style={{ cursor: 'pointer', transform: 'scale(1.2)' }} />
                  </td>
                  <td>{s.invoiceDate ? new Date(s.invoiceDate).toLocaleDateString('en-IN') : '-'}</td>
                  <td><span className="sl-code">{s.invoiceNumber || '-'}</span></td>
                  <td><span className="sl-code" style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{s.gemContractNumber || '—'}</span></td>
                  <td><div className="sl-customer-name">{s.customerName || '-'}</div></td>
                  <td>{s.items?.length || 0} items</td>
                  <td>₹{(s.subtotal || 0).toFixed(2)}</td>
                  <td>₹{(s.totalTax || 0).toFixed(2)}</td>
                  <td className="sl-bold-price">₹{(s.grandTotal !== undefined ? s.grandTotal : ((s.subtotal || 0) + (s.totalTax || 0))).toFixed(2)}</td>
                  <td>
                    <span className={`sl-status-badge ${getStatusClass(s.paymentStatus)}`}>
                      {s.paymentStatus || 'Pending'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-start', minWidth: '80px' }}>
                      <button style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 0 }} onClick={() => navigate(`/sales/view/${s._id}`)} title="View">
                        <Eye size={18} />
                      </button>
                      <button style={{ background: 'transparent', border: 'none', color: '#f59e0b', cursor: 'pointer', padding: 0 }} onClick={() => navigate(`/sales/edit/${s._id}`)} title="Edit">
                        <Edit size={18} />
                      </button>
                      <button style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }} onClick={async () => {
                        if(window.confirm('Are you sure you want to delete this invoice? This will restore the product stock levels.')) {
                          try {
                            await axios.delete(`${API}/api/invoices/${s._id}`, { headers: authHeader });
                            setSales(sales.filter(inv => inv._id !== s._id));
                          } catch (err) {
                            console.error('Delete error', err);
                            alert('Failed to delete invoice');
                          }
                        }
                      }} title="Delete">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Sales;
