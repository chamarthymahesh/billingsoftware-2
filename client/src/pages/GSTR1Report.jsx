import { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, Download, Filter } from 'lucide-react';
import './Sales.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const GSTR1Report = () => {
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  const token = userInfo?.token;
  const authHeader = { Authorization: `Bearer ${token}` };

  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('b2b');

  useEffect(() => {
    axios.get(`${API}/api/companies`, { headers: authHeader }).then(r => {
      setCompanies(r.data);
      if (r.data.length > 0) setSelectedCompany(r.data[0]._id);
    }).catch(() => {});
  }, []);

  const fetchReport = async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/reports/gstr1`, {
        headers: authHeader,
        params: { companyId: selectedCompany, month, year }
      });
      setReport(data);
    } catch (err) {
      console.error(err);
      alert('Failed to fetch GSTR-1 report. Make sure the backend is running.');
    }
    setLoading(false);
  };

  const downloadCSV = (section) => {
    if (!report) return;
    const rows = section === 'b2b' ? report.b2b 
               : section === 'b2c' ? report.b2c 
               : section === 'hsnB2b' ? report.hsnB2B 
               : report.hsnB2C;
    let csv = '';
    if (section === 'b2b' || section === 'b2c') {
      csv = 'Invoice No,Date,Customer,GSTIN,Place of Supply,Tax Type,Taxable Value,CGST,SGST,IGST,Total Tax,Grand Total\n';
      csv += rows.map(r => [
        r.invoiceNumber,
        new Date(r.invoiceDate).toLocaleDateString('en-IN'),
        `"${r.customerName}"`,
        r.customerGSTIN || '',
        r.placeOfSupply || '',
        r.taxType || '',
        r.taxableValue?.toFixed(2),
        r.cgst?.toFixed(2),
        r.sgst?.toFixed(2),
        r.igst?.toFixed(2),
        r.totalTax?.toFixed(2),
        r.grandTotal?.toFixed(2),
      ].join(',')).join('\n');
    } else {
      csv = 'HSN,GST Rate,Qty,Taxable Amount,CGST,SGST,IGST,Total Tax,Total Amount\n';
      csv += rows.map(r => [
        r.hsn,
        r.gstRate + '%',
        r.qty,
        r.taxableAmount?.toFixed(2),
        r.cgst?.toFixed(2),
        r.sgst?.toFixed(2),
        r.igst?.toFixed(2),
        r.taxAmount?.toFixed(2),
        r.totalAmount?.toFixed(2),
      ].join(',')).join('\n');
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `GSTR1_${section}_${month}_${year}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const tabStyle = (t) => ({
    padding: '8px 20px',
    border: 'none',
    borderRadius: '6px 6px 0 0',
    cursor: 'pointer',
    fontWeight: 600,
    background: activeTab === t ? '#10b981' : 'rgba(30,41,59,0.8)',
    color: activeTab === t ? '#fff' : '#94a3b8',
    transition: 'all 0.2s',
  });

  const tagStyle = (type) => ({
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 700,
    background: type === 'IGST' ? 'rgba(139,92,246,0.15)' : 'rgba(16,185,129,0.15)',
    color: type === 'IGST' ? '#a78bfa' : '#34d399',
  });

  return (
    <div className="sl-page">
      <div className="sl-header">
        <div>
          <h1 className="sl-title">GSTR-1 Report</h1>
          <p className="sl-subtitle">
            Generate GST Return 1 — Intra-state: CGST + SGST &nbsp;|&nbsp; Inter-state: IGST
            {report?.sellerStateCode && <span style={{ color: '#10b981', marginLeft: '8px' }}>(Seller State Code: {report.sellerStateCode})</span>}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '24px', background: 'rgba(30,41,59,0.7)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>COMPANY</label>
          <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)} className="sl-company-select" disabled={userInfo.role !== 'Super Admin'}>
            {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>MONTH</label>
          <select value={month} onChange={e => setMonth(e.target.value)} className="sl-company-select">
            {months.map((m, i) => <option key={i+1} value={String(i+1)}>{m}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>YEAR</label>
          <select value={year} onChange={e => setYear(e.target.value)} className="sl-company-select">
            {[2023,2024,2025,2026,2027].map(y => <option key={y} value={String(y)}>{y}</option>)}
          </select>
        </div>
        <button className="sl-new-btn" onClick={fetchReport} disabled={loading}>
          <Filter size={16} /> {loading ? 'Loading...' : 'Generate Report'}
        </button>
      </div>

      {/* Summary cards */}
      {report && (
        <>
          <div className="sl-stats" style={{ marginBottom: '24px' }}>
            <div className="sl-stat">
              <div className="sl-stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}><FileText size={24} color="#10b981" /></div>
              <div><p>TOTAL INVOICES</p><h3>{report.totals.totalInvoices}</h3></div>
            </div>
            <div className="sl-stat">
              <div className="sl-stat-icon" style={{ background: 'rgba(59,130,246,0.15)' }}><FileText size={24} color="#3b82f6" /></div>
              <div><p>TAXABLE VALUE</p><h3>₹{report.totals.totalTaxable?.toFixed(2)}</h3></div>
            </div>
            <div className="sl-stat">
              <div className="sl-stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}><FileText size={24} color="#10b981" /></div>
              <div>
                <p>CGST + SGST</p>
                <h3>₹{report.totals.totalCGST?.toFixed(2)} + ₹{report.totals.totalSGST?.toFixed(2)}</h3>
              </div>
            </div>
            <div className="sl-stat">
              <div className="sl-stat-icon" style={{ background: 'rgba(139,92,246,0.15)' }}><FileText size={24} color="#8b5cf6" /></div>
              <div><p>IGST</p><h3>₹{report.totals.totalIGST?.toFixed(2)}</h3></div>
            </div>
            <div className="sl-stat">
              <div className="sl-stat-icon" style={{ background: 'rgba(245,158,11,0.15)' }}><FileText size={24} color="#f59e0b" /></div>
              <div><p>GRAND TOTAL</p><h3>₹{report.totals.totalGrandTotal?.toFixed(2)}</h3></div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '0' }}>
            <button style={tabStyle('b2b')} onClick={() => setActiveTab('b2b')}>B2B ({report.b2b.length})</button>
            <button style={tabStyle('b2c')} onClick={() => setActiveTab('b2c')}>B2C ({report.b2c.length})</button>
            <button style={tabStyle('hsnB2b')} onClick={() => setActiveTab('hsnB2b')}>HSN B2B ({report.hsnB2B?.length || 0})</button>
            <button style={tabStyle('hsnB2c')} onClick={() => setActiveTab('hsnB2c')}>HSN B2C ({report.hsnB2C?.length || 0})</button>
          </div>

          <div className="sl-table-wrap" style={{ borderRadius: '0 8px 8px 8px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <button onClick={() => downloadCSV(activeTab)} style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                <Download size={14} /> Download CSV
              </button>
            </div>

            {/* B2B / B2C Table */}
            {(activeTab === 'b2b' || activeTab === 'b2c') && (
              <table className="sl-table">
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Date</th>
                    <th>Customer</th>
                    {activeTab === 'b2b' && <th>GSTIN</th>}
                    <th>Place of Supply</th>
                    <th>Tax Type</th>
                    <th>Taxable Value</th>
                    <th>CGST</th>
                    <th>SGST</th>
                    <th>IGST</th>
                    <th>Grand Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeTab === 'b2b' ? report.b2b : report.b2c).length === 0 ? (
                    <tr><td colSpan={11} className="sl-center">No records found for this period</td></tr>
                  ) : (activeTab === 'b2b' ? report.b2b : report.b2c).map((row, i) => (
                    <tr key={i}>
                      <td><span className="sl-code">{row.invoiceNumber}</span></td>
                      <td>{new Date(row.invoiceDate).toLocaleDateString('en-IN')}</td>
                      <td className="sl-customer-name">{row.customerName}</td>
                      {activeTab === 'b2b' && <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{row.customerGSTIN || '-'}</td>}
                      <td>{row.placeOfSupply || '-'}</td>
                      <td><span style={tagStyle(row.taxType)}>{row.taxType}</span></td>
                      <td>₹{row.taxableValue?.toFixed(2)}</td>
                      <td style={{ color: '#34d399' }}>₹{row.cgst?.toFixed(2)}</td>
                      <td style={{ color: '#34d399' }}>₹{row.sgst?.toFixed(2)}</td>
                      <td style={{ color: '#a78bfa' }}>₹{row.igst?.toFixed(2)}</td>
                      <td className="sl-bold-price">₹{row.grandTotal?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* HSN Summary Table */}
            {(activeTab === 'hsnB2b' || activeTab === 'hsnB2c') && (
              <table className="sl-table">
                <thead>
                  <tr>
                    <th>HSN Code</th>
                    <th>GST Rate</th>
                    <th>Total Qty</th>
                    <th>Taxable Amount</th>
                    <th>CGST</th>
                    <th>SGST</th>
                    <th>IGST</th>
                    <th>Total Tax</th>
                    <th>Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {((activeTab === 'hsnB2b' ? report.hsnB2B : report.hsnB2C) || []).length === 0 ? (
                    <tr><td colSpan={9} className="sl-center">No HSN data found</td></tr>
                  ) : (activeTab === 'hsnB2b' ? report.hsnB2B : report.hsnB2C).map((h, i) => (
                    <tr key={i}>
                      <td><span className="sl-code">{h.hsn}</span></td>
                      <td>{h.gstRate}%</td>
                      <td>{h.qty}</td>
                      <td>₹{h.taxableAmount?.toFixed(2)}</td>
                      <td style={{ color: '#34d399' }}>₹{h.cgst?.toFixed(2)}</td>
                      <td style={{ color: '#34d399' }}>₹{h.sgst?.toFixed(2)}</td>
                      <td style={{ color: '#a78bfa' }}>₹{h.igst?.toFixed(2)}</td>
                      <td>₹{h.taxAmount?.toFixed(2)}</td>
                      <td className="sl-bold-price">₹{h.totalAmount?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {!report && !loading && (
        <div className="sl-center" style={{ paddingTop: '60px' }}>
          <FileText size={48} style={{ color: '#334155', marginBottom: '12px' }} />
          <div>Select company, month, year and click <strong>Generate Report</strong></div>
        </div>
      )}
    </div>
  );
};

export default GSTR1Report;
