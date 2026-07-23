import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, ShoppingCart, DollarSign, FileText, CheckCircle, Search, Pencil, Trash2, Eye } from 'lucide-react';
import RecordPurchaseModal from '../components/RecordPurchaseModal';
import PurchaseViewModal from '../components/PurchaseViewModal';
import './Purchases.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Purchases = () => {
  const [purchases, setPurchases] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  
  const [selectedCompany, setSelectedCompany] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [viewingPurchase, setViewingPurchase] = useState(null);

  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  const authHeader = { Authorization: `Bearer ${userInfo?.token}` };

  useEffect(() => {
    const fetchInitData = async () => {
      try {
        const [compRes, suppRes, prodRes] = await Promise.all([
          axios.get(`${API}/api/companies`, { headers: authHeader }),
          axios.get(`${API}/api/suppliers`, { headers: authHeader }),
          axios.get(`${API}/api/products`, { headers: authHeader })
        ]);
        
        setCompanies(compRes.data);
        if (compRes.data.length > 0) setSelectedCompany(compRes.data[0]._id);
        
        setSuppliers(suppRes.data);
        setProducts(prodRes.data);
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };
    fetchInitData();
  }, []);

  useEffect(() => {
    if (!selectedCompany) return;
    
    const fetchPurchases = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/api/purchases?companyId=${selectedCompany}`, { headers: authHeader });
        setPurchases(res.data);
      } catch (error) {
        console.error('Error fetching purchases:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPurchases();
  }, [selectedCompany]);

  const handlePurchaseAdded = (newPurchase) => {
    setPurchases(prev => [newPurchase, ...prev]);
    setTimeout(() => {
      axios.get(`${API}/api/suppliers`, { headers: authHeader }).then(r => setSuppliers(r.data));
      axios.get(`${API}/api/products`, { headers: authHeader }).then(r => setProducts(r.data));
    }, 1000);
  };

  const handlePurchaseUpdated = (updatedPurchase) => {
    setPurchases(prev => prev.map(p => p._id === updatedPurchase._id ? updatedPurchase : p));
    setTimeout(() => {
      axios.get(`${API}/api/products`, { headers: authHeader }).then(r => setProducts(r.data));
    }, 1000);
  };

  const handleEdit = (purchase) => {
    setEditingPurchase(purchase);
    setIsModalOpen(true);
  };

  const handleView = (purchase) => {
    setViewingPurchase(purchase);
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.patch(`${API}/api/purchases/${id}/status`, { status: newStatus }, { headers: authHeader });
      // Optimistically update UI
      setPurchases(prev => prev.map(p => p._id === id ? { ...p, paymentStatus: newStatus } : p));
    } catch (error) {
      alert(error.response?.data?.message || 'Error updating status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this purchase? Stock will be reversed automatically.')) return;
    setDeletingId(id);
    try {
      await axios.delete(`${API}/api/purchases/${id}`, { headers: authHeader });
      setPurchases(prev => prev.filter(p => p._id !== id));
      // Refresh products to reflect reversed stock
      axios.get(`${API}/api/products`, { headers: authHeader }).then(r => setProducts(r.data));
    } catch (error) {
      alert(error.response?.data?.message || 'Error deleting purchase');
    } finally {
      setDeletingId(null);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingPurchase(null);
  };

  const filteredPurchases = purchases.filter(p => {
    const searchLower = search.toLowerCase();
    const matchesSupplier = (p.supplierName || '').toLowerCase().includes(searchLower);
    const matchesBill = (p.billNumber || '').toLowerCase().includes(searchLower);
    const matchesGem = (p.gemContractNumber || '').toLowerCase().includes(searchLower);
    const matchesProduct = p.items?.some(item => {
      const prodName = item.product?.name || item.productName || '';
      return prodName.toLowerCase().includes(searchLower);
    });
    return matchesSupplier || matchesBill || matchesGem || matchesProduct;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid': return 'status-paid';
      case 'Partial': return 'status-partial';
      case 'Pending': default: return 'status-pending';
    }
  };

  const totalPurchaseValue = purchases.reduce((sum, p) => sum + p.grandTotal, 0);
  const pendingValue = purchases.filter(p => p.paymentStatus === 'Pending').reduce((sum, p) => sum + p.grandTotal, 0);
  const totalBills = purchases.length;

  return (
    <div className="pur-page">
      {/* Header */}
      <div className="pur-header">
        <div>
          <h1 className="pur-title">Purchases</h1>
          <p className="pur-subtitle">Manage purchase bills and inventory inwards</p>
        </div>
        <button className="pur-record-btn" onClick={() => { setEditingPurchase(null); setIsModalOpen(true); }}>
          <Plus size={18} /> Record New Purchase
        </button>
      </div>

      {/* Stats Cards */}
      <div className="pur-stats">
        <div className="pur-stat">
          <div className="pur-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <ShoppingCart size={20} />
          </div>
          <div>
            <p>Total Purchase Value</p>
            <h3>₹{totalPurchaseValue.toFixed(2)}</h3>
          </div>
        </div>
        <div className="pur-stat">
          <div className="pur-stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
            <DollarSign size={20} />
          </div>
          <div>
            <p>Outstanding Amount</p>
            <h3>₹{pendingValue.toFixed(2)}</h3>
          </div>
        </div>
        <div className="pur-stat">
          <div className="pur-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <CheckCircle size={20} />
          </div>
          <div>
            <p>Total Bills Recorded</p>
            <h3>{totalBills}</h3>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="pur-toolbar">
        <div className="pur-search">
          <Search size={16} className="pur-search-icon" />
          <input 
            placeholder="Search by supplier, bill #, product, or GeM contract..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>
        <select className="pur-company-select" value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} disabled={userInfo.role !== 'Super Admin'}>
          {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="pur-table-wrap">
        <table className="pur-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Bill Number</th>
              <th>Supplier</th>
              <th>Items</th>
              <th>Base Total</th>
              <th>Extra Charges</th>
              <th>Grand Total</th>
              <th>Payment Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="pur-center">Loading...</td></tr>
            ) : filteredPurchases.length === 0 ? (
              <tr>
                <td colSpan={9} className="pur-center">
                  <FileText size={36} style={{ color: '#334155', marginBottom: '0.5rem' }} />
                  <div>No purchases found.</div>
                </td>
              </tr>
            ) : (
              filteredPurchases.map(p => (
                <tr key={p._id}>
                  <td>{new Date(p.purchaseDate).toLocaleDateString()}</td>
                  <td><span className="pur-code">{p.billNumber}</span></td>
                  <td><div className="pur-supplier-name">{p.supplierName}</div></td>
                  <td>{p.items?.length || 0} items</td>
                  <td>₹{p.itemsTotal?.toFixed(2)}</td>
                  <td>₹{p.extraCharges?.toFixed(2)}</td>
                  <td className="pur-bold-price">₹{p.grandTotal?.toFixed(2)}</td>
                  <td>
                    <select
                      value={p.paymentStatus}
                      onChange={e => handleStatusChange(p._id, e.target.value)}
                      className={`pur-status-select ${getStatusColor(p.paymentStatus)}`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Partial">Partial</option>
                      <option value="Paid">Paid</option>
                    </select>
                  </td>
                  <td>
                    <div className="pur-actions">
                      <button
                        className="pur-action-btn pur-view-btn"
                        onClick={() => handleView(p)}
                        title="View invoice"
                      >
                        <Eye size={14} />
                      </button>
                      <button 
                        className="pur-action-btn pur-edit-btn" 
                        onClick={() => handleEdit(p)}
                        title="Edit purchase"
                      >
                        <Pencil size={14} />
                      </button>
                      <button 
                        className="pur-action-btn pur-delete-btn" 
                        onClick={() => handleDelete(p._id)}
                        disabled={deletingId === p._id}
                        title="Delete purchase"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* View Modal */}
      {viewingPurchase && (
        <PurchaseViewModal
          purchase={viewingPurchase}
          onClose={() => setViewingPurchase(null)}
        />
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <RecordPurchaseModal 
          isOpen={isModalOpen}
          onClose={handleModalClose}
          companies={companies}
          products={products}
          suppliers={suppliers}
          onPurchaseAdded={handlePurchaseAdded}
          editingPurchase={editingPurchase}
          onPurchaseUpdated={handlePurchaseUpdated}
        />
      )}
    </div>
  );
};

export default Purchases;


