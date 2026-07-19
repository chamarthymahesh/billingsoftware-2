import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './InvoiceProfitReport.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const InvoiceProfitReport = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('profit'); // 'profit' or 'commission'
  const [selectedInvoices, setSelectedInvoices] = useState([]);

  // Filter States
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));
  const isSuperAdmin = userInfo?.role === 'Super Admin';
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [companies, setCompanies] = useState([]);

  // Compute Filtered Reports
  const commissionReportsFiltered = reports
    .filter(r => (r.commissionAmount > 0 || r.transportCharges > 0))
    .filter(r => {
      if (filterCustomer && r.customerName !== filterCustomer) return false;
      if (filterStatus && (r.commissionStatus || 'Pending') !== filterStatus) return false;
      if (isSuperAdmin && filterCompany) {
        const compId = r.company?._id || r.company;
        if (String(compId) !== String(filterCompany)) return false;
      }
      return true;
    });

  // Extract Unique Customer Names from all commission invoices
  const uniqueCustomers = Array.from(
    new Set(
      reports
        .filter(r => (r.commissionAmount > 0 || r.transportCharges > 0))
        .map(r => r.customerName)
        .filter(Boolean)
    )
  ).sort();

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedInvoices(commissionReportsFiltered.map(r => r._id));
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
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      await axios.put(
        `${API}/api/invoices/bulk-commission-status`,
        { invoiceIds: selectedInvoices, status },
        { headers: { Authorization: `Bearer ${userInfo.token}` } }
      );
      
      // Update local state
      setReports(reports.map(r => 
        selectedInvoices.includes(r._id) ? { ...r, commissionStatus: status } : r
      ));
      setSelectedInvoices([]);
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating status');
    }
  };


  const handleSingleStatusUpdate = async (id, status) => {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      await axios.put(
        `${API}/api/invoices/bulk-commission-status`,
        { invoiceIds: [id], status },
        { headers: { Authorization: `Bearer ${userInfo.token}` } }
      );
      setReports(reports.map(r => 
        r._id === id ? { ...r, commissionStatus: status } : r
      ));
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating status');
    }
  };

  useEffect(() => {
    const fetchReportsAndCompanies = async () => {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const config = {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        };

        const [reportsRes, companiesRes] = await Promise.all([
          axios.get(`${API}/api/reports/invoice-profit`, config),
          userInfo?.role === 'Super Admin'
            ? axios.get(`${API}/api/companies`, config)
            : Promise.resolve({ data: [] })
        ]);

        setReports(Array.isArray(reportsRes.data) ? reportsRes.data : []);
        if (userInfo?.role === 'Super Admin') {
          setCompanies(Array.isArray(companiesRes.data) ? companiesRes.data : []);
        }
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.message || err.message);
        setLoading(false);
      }
    };

    fetchReportsAndCompanies();
  }, []);

  // Prepare data for the commission chart
  const chartData = commissionReportsFiltered
    .filter(r => r.commissionAmount > 0)
    .map(r => ({
      name: r.invoiceNumber,
      Commission: r.commissionAmount || 0,
      Date: new Date(r.invoiceDate).toLocaleDateString()
    }));

  return (
    <div className="profit-report-container sl-page">
      <div className="report-header sl-header" style={{ flexDirection: 'column', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 className="sl-title">Reports</h1>
          <p className="sl-subtitle">Analyze your profit margins and commissions</p>
        </div>
        
        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button 
            onClick={() => setActiveTab('profit')}
            style={{ 
              padding: '8px 20px', 
              background: activeTab === 'profit' ? '#3b82f6' : 'rgba(255,255,255,0.05)',
              color: activeTab === 'profit' ? '#fff' : '#94a3b8',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            Profit Report
          </button>
          <button 
            onClick={() => setActiveTab('commission')}
            style={{ 
              padding: '8px 20px', 
              background: activeTab === 'commission' ? '#10b981' : 'rgba(255,255,255,0.05)',
              color: activeTab === 'commission' ? '#fff' : '#94a3b8',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            Commission Report
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loader sl-center">Loading reports...</div>
      ) : error ? (
        <div className="error-msg sl-center" style={{ color: '#ef4444' }}>{error}</div>
      ) : (
        <>
          {activeTab === 'profit' && (
            <div className="animate-fade-in">
              <div style={{color: '#aaa', fontSize: '0.9rem', marginBottom: '1rem', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px'}}>
                <strong>Profit Formula:</strong><br/>
                <code>=((SP_Including_GST-CP_Including_GST)-((SP_Including_GST-CP_Including_GST)*GST_Percentage/100))-Transport-Commission-OtherCharges</code>
              </div>
              <div className="sl-table-wrap">
                <table className="sl-table profit-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Invoice #</th>
                      <th>Customer Name</th>
                      <th>Total SP (incl GST)</th>
                      <th>Total Cost</th>
                      <th>Gross Profit</th>
                      <th>GST on Profit</th>
                      <th>Profit (After Tax)</th>
                      <th>Transport</th>
                      <th>Commission</th>
                      <th>Other Charges</th>
                      <th>Final Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.length > 0 ? (
                      reports.map((report) => (
                        <tr key={report.invoiceNumber}>
                          <td>{new Date(report.invoiceDate).toLocaleDateString()}</td>
                          <td><span className="sl-code">{report.invoiceNumber}</span></td>
                          <td>{report.customerName}</td>
                          <td>₹{report.grandTotal?.toFixed(2) || '0.00'}</td>
                          <td>₹{report.totalCost?.toFixed(2) || '0.00'}</td>
                          <td>₹{report.grossProfit?.toFixed(2) || '0.00'}</td>
                          <td>₹{(report.grossProfit * 0.18)?.toFixed(2) || '0.00'}</td>
                          <td>₹{report.profitAfterGst?.toFixed(2) || '0.00'}</td>
                          <td>₹{report.transportCharges?.toFixed(2) || '0.00'}</td>
                          <td>₹{report.commissionAmount?.toFixed(2) || '0.00'}</td>
                          <td>₹{report.otherCharges?.toFixed(2) || '0.00'}</td>
                          <td style={{ color: '#10b981', fontWeight: 'bold' }}>₹{report.finalProfit?.toFixed(2) || '0.00'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="12" className="sl-center">No reports found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'commission' && (
            <div className="animate-fade-in">
              
              {/* Filter Toolbar */}
              <div
                style={{
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'center',
                  background: 'rgba(30, 41, 59, 0.4)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  marginBottom: '20px',
                  flexWrap: 'wrap',
                }}
              >
                {/* Customer Name Filter */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Customer Name</label>
                  <select
                    value={filterCustomer}
                    onChange={(e) => setFilterCustomer(e.target.value)}
                    style={{
                      background: '#1e293b',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: '0.9rem',
                      outline: 'none',
                      cursor: 'pointer',
                      minWidth: '180px',
                    }}
                  >
                    <option value="">All Customers</option>
                    {uniqueCustomers.map((cust, idx) => (
                      <option key={idx} value={cust}>{cust}</option>
                    ))}
                  </select>
                </div>

                {/* Company Filter (Super Admin only) */}
                {isSuperAdmin && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Company</label>
                    <select
                      value={filterCompany}
                      onChange={(e) => setFilterCompany(e.target.value)}
                      style={{
                        background: '#1e293b',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: '#fff',
                        fontSize: '0.9rem',
                        outline: 'none',
                        cursor: 'pointer',
                        minWidth: '180px',
                      }}
                    >
                      <option value="">All Companies</option>
                      {companies.map((comp) => (
                        <option key={comp._id} value={comp._id}>{comp.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Status Filter */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Commission Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{
                      background: '#1e293b',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: '0.9rem',
                      outline: 'none',
                      cursor: 'pointer',
                      minWidth: '150px',
                    }}
                  >
                    <option value="">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Partial">Partial</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>

                {/* Clear Button */}
                {(filterCustomer || filterCompany || filterStatus) && (
                  <button
                    onClick={() => {
                      setFilterCustomer('');
                      setFilterCompany('');
                      setFilterStatus('');
                    }}
                    style={{
                      alignSelf: 'flex-end',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      color: '#f87171',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              {/* Chart Section */}
              <div style={{ background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px', marginBottom: '24px', height: '350px' }}>
                <h3 style={{ margin: '0 0 20px 0', color: '#F8FAFC' }}>Commission Trends</h3>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="name" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                        itemStyle={{ color: '#10b981' }}
                      />
                      <Bar dataKey="Commission" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="sl-center" style={{ height: '100%', color: '#94a3b8' }}>No commission data available for charts</div>
                )}
              </div>

              {/* Bulk Action Toolbar */}
              {selectedInvoices.length > 0 && (
                <div style={{ padding: '12px 20px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontWeight: 600, color: '#fff' }}>{selectedInvoices.length} selected</span>
                  <button onClick={() => handleBulkStatusUpdate('Paid')} style={{ background: '#10b981', color: '#fff', padding: '6px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Mark Paid</button>
                  <button onClick={() => handleBulkStatusUpdate('Pending')} style={{ background: '#ef4444', color: '#fff', padding: '6px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Mark Pending</button>
                  <button onClick={() => handleBulkStatusUpdate('Partial')} style={{ background: '#f59e0b', color: '#fff', padding: '6px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Mark Partial</button>
                </div>
              )}

              {/* Data Table */}
              <div className="sl-table-wrap">
                <table className="sl-table profit-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px', paddingRight: '0' }}>
                        <input type="checkbox" 
                          checked={selectedInvoices.length > 0 && selectedInvoices.length === commissionReportsFiltered.length} 
                          onChange={handleSelectAll} 
                          style={{ cursor: 'pointer', transform: 'scale(1.2)' }} 
                        />
                      </th>
                      <th>Date</th>
                      <th>Invoice #</th>
                      <th>Customer Name</th>
                      <th>Transport Charges</th>
                      <th style={{ textAlign: 'right' }}>Commission Amount</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissionReportsFiltered.length > 0 ? (
                      commissionReportsFiltered.map((report) => (
                        <tr key={report._id || report.invoiceNumber}>
                          <td style={{ paddingRight: '0' }}>
                            <input type="checkbox" checked={selectedInvoices.includes(report._id)} onChange={() => handleSelectOne(report._id)} style={{ cursor: 'pointer', transform: 'scale(1.2)' }} />
                          </td>
                          <td>{new Date(report.invoiceDate).toLocaleDateString()}</td>
                          <td><span className="sl-code">{report.invoiceNumber}</span></td>
                          <td style={{ fontWeight: 600 }}>{report.customerName}</td>
                          <td>₹{report.transportCharges?.toFixed(2) || '0.00'}</td>
                          <td style={{ textAlign: 'right', color: '#10b981', fontWeight: 'bold' }}>
                            ₹{report.commissionAmount?.toFixed(2) || '0.00'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <select
                              value={report.commissionStatus || 'Pending'}
                              onChange={(e) => handleSingleStatusUpdate(report._id, e.target.value)}
                              style={{
                                padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', border: 'none', outline: 'none', cursor: 'pointer',
                                backgroundColor: report.commissionStatus === 'Paid' ? 'rgba(16,185,129,0.2)' : report.commissionStatus === 'Partial' ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)',
                                color: report.commissionStatus === 'Paid' ? '#10b981' : report.commissionStatus === 'Partial' ? '#f59e0b' : '#ef4444',
                                appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', textAlign: 'center'
                              }}
                            >
                              <option value="Pending">Pending</option>
                              <option value="Partial">Partial</option>
                              <option value="Paid">Paid</option>
                            </select>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="sl-center">No commission records found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default InvoiceProfitReport;
