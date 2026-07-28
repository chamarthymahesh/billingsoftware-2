import { authFetch } from '../../utils/authFetch';
import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Calendar, User, ArrowUpRight, ArrowDownRight, CircleEllipsis, ChevronRight, DollarSign, History, Eye, X } from 'lucide-react';

export default function Loans() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [dropdowns, setDropdowns] = useState({ cars: [], insurances: [], projects: [], rentals: [], contacts: [] });
  const [isNewContact, setIsNewContact] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editLoan, setEditLoan] = useState(null);

  // Form State - Create Loan
  const [newLoan, setNewLoan] = useState({
    type: 'lent',
    personName: '',
    principalAmount: '',
    interestRate: '',
    interestType: 'monthly',
    interestMethod: 'simple',
    dateOccurred: '',
    notes: ''
  });

  // Form State - Add Payment
  const [newTx, setNewTx] = useState({
    amount: '',
    paymentType: 'interest_payment',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    fetchLoans();
    fetchDropdowns();
  }, []);

  const fetchDropdowns = () => {
    authFetch('/api/dropdowns')
      .then(res => res.json())
      .then(data => setDropdowns(data))
      .catch(err => console.error('Error fetching dropdowns:', err));
  };

  const fetchLoans = () => {
    setLoading(true);
    authFetch('/api/loans')
      .then(res => res.json())
      .then(data => {
        setLoans(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching loans:', err);
        setLoading(false);
      });
  };

  const handleCreateLoan = (e) => {
    e.preventDefault();
    if (!newLoan.personName || !newLoan.principalAmount || !newLoan.interestRate || !newLoan.dateOccurred) {
      alert('Please fill out all fields.');
      return;
    }

    authFetch('/api/loans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLoan)
    })
      .then(res => res.json())
      .then(() => {
        setIsCreateModalOpen(false);
        setNewLoan({
          type: 'lent',
          personName: '',
          principalAmount: '',
          interestRate: '',
          interestType: 'monthly',
          interestMethod: 'simple',
          dateOccurred: '',
          notes: ''
        });
        fetchLoans();
      })
      .catch(err => console.error('Error creating loan:', err));
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editLoan.personName || !editLoan.principalAmount || !editLoan.interestRate) {
      alert('Please fill out all required fields.');
      return;
    }

    authFetch(`/api/loans/${editLoan._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editLoan)
    })
      .then(res => res.json())
      .then(() => {
        setIsEditModalOpen(false);
        setEditLoan(null);
        fetchLoans();
      })
      .catch(err => console.error('Error updating loan:', err));
  };

  const handleAddTx = (e) => {
    e.preventDefault();
    if (!newTx.amount || !newTx.date) {
      alert('Please fill out amount and date.');
      return;
    }

    authFetch(`/api/loans/${selectedLoan._id}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTx)
    })
      .then(res => res.json())
      .then(() => {
        setIsTxModalOpen(false);
        setNewTx({ amount: '', paymentType: 'interest_payment', date: new Date().toISOString().split('T')[0], notes: '' });
        fetchLoans();
      })
      .catch(err => console.error('Error adding transaction:', err));
  };

  const handleSettleStatus = (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'settled' : 'active';
    authFetch(`/api/loans/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })
      .then(() => fetchLoans())
      .catch(err => console.error('Error updating loan status:', err));
  };

  const handleDeleteLoan = (id) => {
    if (!window.confirm('Are you sure you want to delete this loan record permanently?')) return;
    authFetch(`/api/loans/${id}`, { method: 'DELETE' })
      .then(() => fetchLoans())
      .catch(err => console.error('Error deleting loan:', err));
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Helper: Get comprehensive loan metrics handling chronological spillover
  const getLoanMetrics = (loan) => {
    const ledger = getLoanLedger(loan);
    if (ledger.length === 0) {
      return { remPrincipal: loan.principalAmount, accruedInt: 0, interestCollected: 0, dueInt: 0 };
    }
    
    // The ledger already tracks the exact balance and accrued interest at each step
    const lastRow = ledger[ledger.length - 1];
    
    return {
      remPrincipal: lastRow.balance,
      accruedInt: lastRow.totalAccrued,
      interestCollected: lastRow.interestPaidSoFar,
      dueInt: Math.max(0, lastRow.totalAccrued - lastRow.compoundedInterestTotal - lastRow.interestPaidSoFar)
    };
  };

  // Helper: Get full detailed ledger for a loan (Month-by-month breakdown)
  const getLoanLedger = (loan) => {
    const ledger = [];
    let currentPrincipal = loan.principalAmount;
    let lastDate = new Date(loan.dateOccurred);
    let totalAccrued = 0;
    
    // Generate Monthly Checkpoints from start date up to today
    const checkpoints = [];
    let start = new Date(loan.dateOccurred);
    let currentCheckpoint = new Date(start);
    let monthNum = 1;
    
    while (true) {
      currentCheckpoint = new Date(currentCheckpoint);
      currentCheckpoint.setMonth(currentCheckpoint.getMonth() + 1);
      if (currentCheckpoint > new Date()) break;
      checkpoints.push({
        date: new Date(currentCheckpoint),
        type: 'monthly_checkpoint',
        monthNum: monthNum++
      });
    }

    // Add Transactions
    const txEvents = loan.payments.map(p => ({
      date: new Date(p.date),
      type: 'transaction',
      data: p
    }));

    // Today Checkpoint
    const todayEvent = {
      date: new Date(),
      type: 'today_checkpoint'
    };

    // Sort all events by date. If dates match, transactions go first, then checkpoints.
    const allEvents = [...checkpoints, ...txEvents, todayEvent].sort((a, b) => {
      if (a.date.getTime() === b.date.getTime()) {
        if (a.type === 'transaction') return -1;
        if (b.type === 'transaction') return 1;
      }
      return a.date - b.date;
    });

    const calculatePeriodInterest = (start, end, principal) => {
      const msInDay = 1000 * 3600 * 24;
      const startDate = new Date(start).setHours(0,0,0,0);
      const endDate = new Date(end).setHours(0,0,0,0);
      const days = (endDate - startDate) / msInDay;
      if (days <= 0) return { days: 0, interest: 0 };
      
      const rate = loan.interestRate / 100;
      const months = days / 30;
      const interest = loan.interestType === 'monthly' ? principal * rate * months : principal * rate * (months / 12);
      return { days, interest };
    };

    // Initial Entry
    ledger.push({
      date: new Date(loan.dateOccurred),
      description: 'Initial Loan Amount Given',
      principalChange: loan.principalAmount,
      balance: currentPrincipal,
      interestAccruedPeriod: 0,
      totalAccrued: 0,
      interestPaid: 0,
      interestPaidSoFar: 0,
      compoundedInterestTotal: 0
    });

    let pendingInterestDays = 0;
    let pendingInterestAmount = 0;
    let totalInterestPaidState = 0;
    let compoundedInterestTotal = 0;

    allEvents.forEach(event => {
      // 1. Accumulate interest from lastDate up to this event's date
      const period = calculatePeriodInterest(lastDate, event.date, currentPrincipal);
      if (period.days > 0) {
        pendingInterestDays += period.days;
        pendingInterestAmount += period.interest;
        totalAccrued += period.interest;
      }
      lastDate = event.date;

      // 2. Process event
      if (event.type === 'monthly_checkpoint') {
        if (pendingInterestAmount > 0) {
          const outstandingAtCheckpoint = totalAccrued - totalInterestPaidState - compoundedInterestTotal;
          let compDesc = '';
          let pChange = 0;
          
          if (loan.interestMethod === 'compound' && outstandingAtCheckpoint > 0) {
            currentPrincipal += outstandingAtCheckpoint;
            compoundedInterestTotal += outstandingAtCheckpoint;
            pChange = outstandingAtCheckpoint;
            compDesc = ` (₹${formatCurrency(outstandingAtCheckpoint)} Compounded to Principal)`;
          }

          ledger.push({
            date: event.date,
            description: `Interest Accrued - Month ${event.monthNum}${compDesc}`,
            principalChange: pChange,
            balance: currentPrincipal,
            interestAccruedPeriod: pendingInterestAmount,
            totalAccrued: totalAccrued,
            interestPaid: 0,
            interestPaidSoFar: totalInterestPaidState,
            compoundedInterestTotal: compoundedInterestTotal,
            isInterestRow: true
          });
          pendingInterestDays = 0;
          pendingInterestAmount = 0;
        }
      } else if (event.type === 'transaction') {
        const tx = event.data;
        let pChange = 0;
        let iPaid = 0;
        let desc = '';
        if (tx.paymentType === 'add_principal') {
          currentPrincipal += tx.amount;
          pChange = tx.amount;
          desc = 'Principal Added';
        } else if (tx.paymentType === 'principal_repayment') {
          currentPrincipal -= tx.amount;
          pChange = -tx.amount;
          desc = 'Principal Repaid';
        } else if (tx.paymentType === 'interest_payment') {
          const outstanding = totalAccrued - totalInterestPaidState - compoundedInterestTotal;
          if (tx.amount > outstanding) {
            const excess = tx.amount - outstanding;
            iPaid = outstanding;
            pChange = -excess; // Spilled over to principal
            currentPrincipal -= excess;
            totalInterestPaidState += outstanding;
            desc = `Interest Paid (₹${formatCurrency(outstanding)}) + Excess applied to Principal (₹${formatCurrency(excess)})`;
          } else {
            iPaid = tx.amount;
            totalInterestPaidState += tx.amount;
            desc = 'Interest Paid';
          }
        }
        ledger.push({
          date: event.date,
          description: desc + (tx.notes ? ` - ${tx.notes}` : ''),
          principalChange: pChange,
          balance: currentPrincipal,
          interestAccruedPeriod: 0,
          totalAccrued: totalAccrued,
          interestPaid: iPaid,
          interestPaidSoFar: totalInterestPaidState,
          compoundedInterestTotal: compoundedInterestTotal
        });
      } else if (event.type === 'today_checkpoint') {
        if (pendingInterestAmount > 0) {
          ledger.push({
            date: event.date,
            description: `Interest Accrued (Partial Month up to today - ${pendingInterestDays} days)`,
            principalChange: 0,
            balance: currentPrincipal,
            interestAccruedPeriod: pendingInterestAmount,
            totalAccrued: totalAccrued,
            interestPaid: 0,
            interestPaidSoFar: totalInterestPaidState,
            compoundedInterestTotal: compoundedInterestTotal,
            isInterestRow: true
          });
          pendingInterestDays = 0;
          pendingInterestAmount = 0;
        }
      }
    });

    return ledger;
  };

  const totalLent = loans
    .filter(l => l.type === 'lent' && l.status === 'active')
    .reduce((sum, l) => sum + getLoanMetrics(l).remPrincipal, 0);

  const totalBorrowed = loans
    .filter(l => l.type === 'borrowed' && l.status === 'active')
    .reduce((sum, l) => sum + getLoanMetrics(l).remPrincipal, 0);

  const handleDownloadPDF = () => {
    const element = document.getElementById('ledger-pdf-content');
    const tableContainer = element.querySelector('.table-container');
    
    // Save original styles
    const originalMaxHeight = tableContainer.style.maxHeight;
    const originalOverflow = tableContainer.style.overflowY;
    
    // Remove scroll restrictions for PDF generation
    tableContainer.style.maxHeight = 'none';
    tableContainer.style.overflowY = 'visible';

    const opt = {
      margin: 0.5,
      filename: `${selectedLoan?.personName}_Ledger.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, scrollY: 0 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
    };

    const revertStyles = () => {
      tableContainer.style.maxHeight = originalMaxHeight;
      tableContainer.style.overflowY = originalOverflow;
    };

    if (!window.html2pdf) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => {
        window.html2pdf().set(opt).from(element).save().then(revertStyles).catch(revertStyles);
      };
      document.head.appendChild(script);
    } else {
      window.html2pdf().set(opt).from(element).save().then(revertStyles).catch(revertStyles);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-section">
          <h1>Interest Loans (Lent & Borrowed)</h1>
          <p>Track money you lent to others (with monthly/yearly interest) or money you borrowed.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
          <Plus size={18} />
          Create Interest Loan
        </button>
      </div>

      {/* Loan summaries */}
      <div className="metrics-grid">
        <div className="glass-card metric-card">
          <div className="metric-header">
            <span className="metric-title">Active Lending (Receivable)</span>
            <ArrowUpRight size={20} style={{ color: 'var(--color-success)' }} />
          </div>
          <div>
            <h2 className="metric-value" style={{ color: 'var(--color-success)' }}>{formatCurrency(totalLent)}</h2>
            <p className="metric-desc">Principal lent generating interest cash flow</p>
          </div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-header">
            <span className="metric-title">Active Borrowing (Payable)</span>
            <ArrowDownRight size={20} style={{ color: 'var(--color-danger)' }} />
          </div>
          <div>
            <h2 className="metric-value" style={{ color: 'var(--color-danger)' }}>{formatCurrency(totalBorrowed)}</h2>
            <p className="metric-desc">Principal you borrowed with interest cost</p>
          </div>
        </div>
      </div>

      {/* Active Loans Table */}
      <div className="glass-card" style={{ padding: '1rem', marginBottom: '2rem' }}>
        <h3 style={{ margin: '1rem', color: 'white' }}>Active Interest Ledgers</h3>
        {loading ? (
          <p style={{ margin: '2rem', color: 'var(--text-secondary)' }}>Loading loans...</p>
        ) : loans.length === 0 ? (
          <p style={{ margin: '2rem', color: 'var(--text-muted)' }}>No loan ledgers active. Create one to track interest repayments.</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Contact Name</th>
                  <th>Original Principal</th>
                  <th>Int. Rate</th>
                  <th>Current Principal</th>
                  <th>Interest (Accrued / Paid / Due)</th>
                  <th>Start Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loans.map(loan => {
                  const metrics = getLoanMetrics(loan);

                  return (
                    <tr key={loan._id}>
                      <td>
                        <span className={`badge ${loan.type === 'lent' ? 'badge-success' : 'badge-danger'}`} style={{ display: 'flex', width: 'fit-content', gap: '0.25rem', alignItems: 'center' }}>
                          {loan.type === 'lent' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                          {loan.type === 'lent' ? 'Lent' : 'Borrowed'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{loan.personName}</td>
                      <td>{formatCurrency(loan.principalAmount)}</td>
                      <td>
                        {loan.interestRate}% / <span style={{ textTransform: 'capitalize', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{loan.interestType.slice(0, 3)}</span>
                      </td>
                      <td style={{ fontWeight: 600, color: 'white' }}>{formatCurrency(metrics.remPrincipal)}</td>
                      <td>
                        <div style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
                          <span style={{ color: 'var(--text-muted)', display: 'inline-block', width: '55px' }}>Accrued:</span> 
                          <span style={{ color: 'var(--text-primary)' }}>{formatCurrency(metrics.accruedInt)}</span><br/>
                          
                          <span style={{ color: 'var(--text-muted)', display: 'inline-block', width: '55px' }}>Paid:</span> 
                          <span style={{ color: 'var(--color-success)' }}>{formatCurrency(metrics.interestCollected)}</span><br/>
                          
                          <span style={{ color: 'var(--text-muted)', display: 'inline-block', width: '55px' }}>Due:</span> 
                          <span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>{formatCurrency(metrics.dueInt)}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem' }}>
                          <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                          {new Date(loan.dateOccurred).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${loan.status === 'active' ? 'badge-success' : 'badge-info'}`}>
                          {loan.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }} 
                            onClick={() => {
                              setSelectedLoan(loan);
                              setIsViewModalOpen(true);
                            }}
                          >
                            <Eye size={14} /> View Details
                          </button>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            onClick={() => {
                              setEditLoan({
                                ...loan,
                                dateOccurred: new Date(loan.dateOccurred).toISOString().split('T')[0]
                              });
                              setIsEditModalOpen(true);
                            }}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }} 
                            onClick={() => {
                              setSelectedLoan(loan);
                              setIsTxModalOpen(true);
                            }}
                          >
                            <Plus size={14} /> Add Payment
                          </button>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                            onClick={() => handleSettleStatus(loan._id, loan.status)}
                          >
                            {loan.status === 'active' ? 'Settle' : 'Activate'}
                          </button>
                          <button className="btn btn-danger" style={{ padding: '0.4rem' }} onClick={() => handleDeleteLoan(loan._id)}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction History Ledger per Loan (Dynamic List) */}
      {!loading && loans.some(l => l.payments.length > 0) && (
        <div className="glass-card">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white' }}>
            <History size={18} style={{ color: 'var(--color-info)' }} />
            Recent Transaction History Logs
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {loans.map(loan => 
              loan.payments.map((p, pIdx) => (
                <div key={`${loan._id}-${pIdx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                  <div>
                    <span style={{ fontWeight: 600, color: 'white' }}>{loan.personName}</span> 
                    <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                      ({loan.type === 'lent' ? 'Lent' : 'Borrowed'})
                    </span>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                      Type: <span style={{ textTransform: 'capitalize', color: 'var(--color-info)' }}>{p.paymentType.replace('_', ' ')}</span> | {p.notes ? `"${p.notes}"` : 'No notes'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ 
                      fontWeight: 700, 
                      color: p.paymentType === 'interest_payment' || p.paymentType === 'principal_repayment' ? 'var(--color-success)' : 'var(--color-warning)'
                    }}>
                      {formatCurrency(p.amount)}
                    </span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(p.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal - Create Loan */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ marginBottom: '1.5rem', color: 'white' }}>Create Interest Loan Ledger</h2>
            <form onSubmit={handleCreateLoan}>
              <div className="form-group">
                <label className="form-label">Loan Type</label>
                <select className="form-control" value={newLoan.type} onChange={(e) => setNewLoan({ ...newLoan, type: e.target.value })}>
                  <option value="lent">Lent Out (I gave money to somebody)</option>
                  <option value="borrowed">Borrowed (I took money from somebody)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Borrower / Lender Name</label>
                <select 
                  className="form-control"
                  value={isNewContact ? '__new__' : newLoan.personName}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__new__') {
                      setIsNewContact(true);
                      setNewLoan({ ...newLoan, personName: '' });
                    } else {
                      setIsNewContact(false);
                      setNewLoan({ ...newLoan, personName: val });
                    }
                  }}
                >
                  <option value="">-- Select Contact from Vault --</option>
                  {dropdowns.contacts.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="__new__" style={{ color: 'var(--color-info)', fontWeight: 'bold' }}>+ Enter New Name...</option>
                </select>
              </div>

              {isNewContact && (
                <div className="form-group">
                  <label className="form-label">New Person's Full Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Enter full name"
                    required
                    value={newLoan.personName} 
                    onChange={(e) => setNewLoan({ ...newLoan, personName: e.target.value })}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Principal Amount (INR)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  placeholder="Enter amount"
                  required
                  value={newLoan.principalAmount} 
                  onChange={(e) => setNewLoan({ ...newLoan, principalAmount: parseFloat(e.target.value) || '' })}
                />
              </div>

              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label">Interest Rate (% per period)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    className="form-control" 
                    placeholder="e.g. 1.5"
                    required
                    value={newLoan.interestRate} 
                    onChange={(e) => setNewLoan({ ...newLoan, interestRate: parseFloat(e.target.value) || '' })}
                  />
                </div>
                <div>
                  <label className="form-label">Interest Term</label>
                  <select className="form-control" value={newLoan.interestType} onChange={(e) => setNewLoan({ ...newLoan, interestType: e.target.value })}>
                    <option value="monthly">Per Month</option>
                    <option value="yearly">Per Year (p.a.)</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Method</label>
                  <select className="form-control" value={newLoan.interestMethod || 'simple'} onChange={(e) => setNewLoan({ ...newLoan, interestMethod: e.target.value })}>
                    <option value="simple">Simple Interest</option>
                    <option value="compound">Compound Interest</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Loan Date</label>
                <input 
                  type="date" 
                  className="form-control" 
                  required
                  value={newLoan.dateOccurred} 
                  onChange={(e) => setNewLoan({ ...newLoan, dateOccurred: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea 
                  className="form-control" 
                  placeholder="Enter security details, checks received, etc."
                  rows="2"
                  value={newLoan.notes} 
                  onChange={(e) => setNewLoan({ ...newLoan, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Edit Loan */}
      {isEditModalOpen && editLoan && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ marginBottom: '1.5rem', color: 'white' }}>Edit Interest Loan Ledger</h2>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label className="form-label">Borrower / Lender Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required
                  value={editLoan.personName} 
                  onChange={(e) => setEditLoan({ ...editLoan, personName: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Principal Amount (INR)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  required
                  value={editLoan.principalAmount} 
                  onChange={(e) => setEditLoan({ ...editLoan, principalAmount: parseFloat(e.target.value) || '' })}
                />
              </div>

              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label">Rate (%)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    className="form-control" 
                    required
                    value={editLoan.interestRate} 
                    onChange={(e) => setEditLoan({ ...editLoan, interestRate: parseFloat(e.target.value) || '' })}
                  />
                </div>
                <div>
                  <label className="form-label">Term</label>
                  <select className="form-control" value={editLoan.interestType} onChange={(e) => setEditLoan({ ...editLoan, interestType: e.target.value })}>
                    <option value="monthly">Per Month</option>
                    <option value="yearly">Per Year</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Method</label>
                  <select className="form-control" value={editLoan.interestMethod || 'simple'} onChange={(e) => setEditLoan({ ...editLoan, interestMethod: e.target.value })}>
                    <option value="simple">Simple</option>
                    <option value="compound">Compound</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Loan Date</label>
                <input 
                  type="date" 
                  className="form-control" 
                  required
                  value={editLoan.dateOccurred} 
                  onChange={(e) => setEditLoan({ ...editLoan, dateOccurred: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea 
                  className="form-control" 
                  rows="2"
                  value={editLoan.notes} 
                  onChange={(e) => setEditLoan({ ...editLoan, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Add Transaction */}
      {isTxModalOpen && selectedLoan && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ marginBottom: '1.5rem', color: 'white' }}>Add Payment for {selectedLoan.personName}</h2>
            <form onSubmit={handleAddTx}>
              <div className="form-group">
                <label className="form-label">Payment Type</label>
                <select className="form-control" value={newTx.paymentType} onChange={(e) => setNewTx({ ...newTx, paymentType: e.target.value })}>
                  <option value="interest_payment">Interest Payment Received / Paid</option>
                  <option value="principal_repayment">Principal Repaid (Reduces outstanding amount)</option>
                  <option value="add_principal">Add to Principal (Increases outstanding amount)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Amount (INR)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  required
                  value={newTx.amount} 
                  onChange={(e) => setNewTx({ ...newTx, amount: parseFloat(e.target.value) || '' })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Transaction Date</label>
                <input 
                  type="date" 
                  className="form-control" 
                  required
                  value={newTx.date} 
                  onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notes (Optional)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Paid via GPay"
                  value={newTx.notes} 
                  onChange={(e) => setNewTx({ ...newTx, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsTxModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - View Loan Ledger Details */}
      {isViewModalOpen && selectedLoan && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '900px', width: '95%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ color: 'white', marginBottom: '0.25rem' }}>Loan Ledger: {selectedLoan.personName}</h2>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Original Principal: {formatCurrency(selectedLoan.principalAmount)} at {selectedLoan.interestRate}% / {selectedLoan.interestType.slice(0,3)} ({selectedLoan.interestMethod || 'simple'})
                </p>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={handleDownloadPDF}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem' }}
                >
                  <ArrowDownRight size={16} /> Download PDF
                </button>
                <button 
                  onClick={() => setIsViewModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div id="ledger-pdf-content" style={{ padding: '1rem', background: 'var(--bg-card)' }}>
              <div className="table-container" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <table style={{ minWidth: '700px' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Interest Accrued</th>
                    <th style={{ textAlign: 'right' }}>Interest Paid</th>
                    <th style={{ textAlign: 'right' }}>Principal (+/-)</th>
                    <th style={{ textAlign: 'right' }}>Current Principal Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {getLoanLedger(selectedLoan).map((entry, idx) => (
                    <tr key={idx} style={{ background: entry.isInterestRow ? 'rgba(99, 102, 241, 0.05)' : 'transparent' }}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {new Date(entry.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                      </td>
                      <td style={{ color: entry.isInterestRow ? 'var(--color-info)' : 'var(--text-primary)' }}>
                        {entry.description}
                      </td>
                      <td style={{ textAlign: 'right', color: entry.interestAccruedPeriod > 0 ? 'var(--color-warning)' : 'var(--text-muted)' }}>
                        {entry.interestAccruedPeriod > 0 ? formatCurrency(entry.interestAccruedPeriod) : '-'}
                      </td>
                      <td style={{ textAlign: 'right', color: entry.interestPaid > 0 ? 'var(--color-success)' : 'var(--text-muted)' }}>
                        {entry.interestPaid > 0 ? formatCurrency(entry.interestPaid) : '-'}
                      </td>
                      <td style={{ textAlign: 'right', color: entry.principalChange !== 0 ? (entry.principalChange > 0 ? 'var(--color-danger)' : 'var(--color-success)') : 'var(--text-muted)' }}>
                        {entry.principalChange !== 0 ? (entry.principalChange > 0 ? `+${formatCurrency(entry.principalChange)}` : formatCurrency(entry.principalChange)) : '-'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'white' }}>
                        {formatCurrency(entry.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Current Principal Balance</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white' }}>{formatCurrency(getLoanMetrics(selectedLoan).remPrincipal)}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Interest Accrued (To Date)</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-info)' }}>{formatCurrency(getLoanMetrics(selectedLoan).accruedInt)}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Interest Paid</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-success)' }}>{formatCurrency(getLoanMetrics(selectedLoan).interestCollected)}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Outstanding Interest Due</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-danger)' }}>
                  {formatCurrency(getLoanMetrics(selectedLoan).dueInt)}
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
