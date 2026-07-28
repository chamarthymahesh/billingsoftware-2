import { authFetch } from '../../utils/authFetch';
import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Calendar, HardHat, DollarSign, ListCollapse, Wrench, FileEdit } from 'lucide-react';

export default function Construction() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  // Form State - Project
  const [projectForm, setProjectForm] = useState({
    projectName: '',
    totalBudget: '',
    description: ''
  });

  // Form State - Expense
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    category: 'materials',
    itemDescription: '',
    supplier: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = () => {
    setLoading(true);
    authFetch('/api/construction')
      .then(res => res.json())
      .then(data => {
        setProjects(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching construction projects:', err);
        setLoading(false);
      });
  };

  const handleCreateProject = (e) => {
    e.preventDefault();
    if (!projectForm.projectName || !projectForm.totalBudget) {
      alert('Please fill out all fields.');
      return;
    }

    authFetch('/api/construction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectForm)
    })
      .then(res => res.json())
      .then(() => {
        setIsProjectModalOpen(false);
        setProjectForm({ projectName: '', totalBudget: '', description: '' });
        fetchProjects();
      })
      .catch(err => console.error('Error creating project:', err));
  };

  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!expenseForm.amount || !expenseForm.itemDescription) {
      alert('Please fill out amount and description.');
      return;
    }

    authFetch(`/api/construction/${selectedProject._id}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expenseForm)
    })
      .then(res => res.json())
      .then(() => {
        setIsExpenseModalOpen(false);
        setExpenseForm({ amount: '', category: 'materials', itemDescription: '', supplier: '', notes: '', date: new Date().toISOString().split('T')[0] });
        fetchProjects();
      })
      .catch(err => console.error('Error adding expense:', err));
  };

  const handleDeleteProject = (id) => {
    if (!window.confirm('Are you sure you want to delete this project and all its expenditure details?')) return;
    authFetch(`/api/construction/${id}`, { method: 'DELETE' })
      .then(() => fetchProjects())
      .catch(err => console.error('Error deleting project:', err));
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Helper: Calc spent per project
  const getProjectSpent = (project) => {
    return project.expenses.reduce((sum, e) => sum + e.amount, 0);
  };

  // Helper: Calc category breakdown
  const getCategoryBreakdown = (project) => {
    const breakdown = { materials: 0, labor: 0, contractor: 0, permits: 0, other: 0 };
    project.expenses.forEach(e => {
      if (breakdown[e.category] !== undefined) {
        breakdown[e.category] += e.amount;
      } else {
        breakdown['other'] += e.amount;
      }
    });
    return breakdown;
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-section">
          <h1>Construction Projects Tracker</h1>
          <p>Manage infrastructure development, site construction budgets, building material bills, contractor fees, and labor wages.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsProjectModalOpen(true)}>
          <Plus size={18} />
          Create Construction Project
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading construction data...</p>
      ) : projects.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>No construction projects registered yet. Start tracking building expenses today.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {projects.map(project => {
            const spent = getProjectSpent(project);
            const remaining = project.totalBudget - spent;
            const percentage = Math.min((spent / project.totalBudget) * 100, 100);
            const categories = getCategoryBreakdown(project);

            return (
              <div key={project._id} className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                  <div>
                    <h2 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem' }}>
                      <HardHat size={24} style={{ color: 'var(--color-warning)' }} />
                      {project.projectName}
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.9rem' }}>{project.description || 'No description'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                      onClick={() => {
                        setSelectedProject(project);
                        setIsExpenseModalOpen(true);
                      }}
                    >
                      <Plus size={16} /> Log Expense
                    </button>
                    <button className="btn btn-danger" style={{ padding: '0.5rem' }} onClick={() => handleDeleteProject(project._id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Budget Allocation: {formatCurrency(project.totalBudget)}</span>
                    <span style={{ fontWeight: 600, color: spent > project.totalBudget ? 'var(--color-danger)' : 'var(--color-success)' }}>
                      Spent: {formatCurrency(spent)} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${percentage}%`, 
                      height: '100%', 
                      background: spent > project.totalBudget ? 'var(--color-danger)' : 'linear-gradient(90deg, var(--color-warning), var(--color-accent))',
                      borderRadius: '4px',
                      boxShadow: '0 0 10px rgba(245, 158, 11, 0.4)'
                    }} />
                  </div>
                </div>

                {/* Category summary boxes */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  {Object.entries(categories).map(([cat, amt]) => (
                    <div key={cat} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '8px' }}>
                      <span style={{ textTransform: 'capitalize', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{cat}</span>
                      <p style={{ fontWeight: 700, marginTop: '0.25rem', fontSize: '1rem' }}>{formatCurrency(amt)}</p>
                    </div>
                  ))}
                </div>

                {/* Expenses Log List */}
                <h4 style={{ marginBottom: '0.75rem', color: 'white', fontSize: '1.1rem' }}>Expenditure Ledger</h4>
                {project.expenses.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>No expenses recorded for this project yet.</p>
                ) : (
                  <div className="table-container" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Category</th>
                          <th>Description</th>
                          <th>Supplier/Vendor</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {project.expenses.map((e, idx) => (
                          <tr key={idx}>
                            <td>{new Date(e.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
                            <td>
                              <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{e.category}</span>
                            </td>
                            <td style={{ fontWeight: 500 }}>{e.itemDescription}</td>
                            <td>{e.supplier || '—'}</td>
                            <td style={{ fontWeight: 600, color: 'var(--color-danger)' }}>-{formatCurrency(e.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal - Create Project */}
      {isProjectModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ marginBottom: '1.5rem', color: 'white' }}>Create Construction Project</h2>
            <form onSubmit={handleCreateProject}>
              <div className="form-group">
                <label className="form-label">Project Name / Site Address</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Sector-4 Residential Villa"
                  required
                  value={projectForm.projectName} 
                  onChange={(e) => setProjectForm({ ...projectForm, projectName: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Total Allocated Budget (INR)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  placeholder="e.g. 50,00,000"
                  required
                  value={projectForm.totalBudget} 
                  onChange={(e) => setProjectForm({ ...projectForm, totalBudget: parseFloat(e.target.value) || '' })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Short Description</label>
                <textarea 
                  className="form-control" 
                  placeholder="Enter details about stages, contractors hired, etc."
                  rows="3"
                  value={projectForm.description} 
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsProjectModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Start Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Log Expense */}
      {isExpenseModalOpen && selectedProject && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ marginBottom: '0.5rem', color: 'white' }}>Log Construction Expense</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Adding invoice details for: <strong style={{ color: 'white' }}>{selectedProject.projectName}</strong>
            </p>
            <form onSubmit={handleAddExpense}>
              <div className="form-group">
                <label className="form-label">Expense Category</label>
                <select className="form-control" value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}>
                  <option value="materials">Materials (Cement, steel, brick, sand, plumbing)</option>
                  <option value="labor">Labor Wages / Site Help</option>
                  <option value="contractor">Contractor Commission / Retainer fee</option>
                  <option value="permits">Municipal Permits / Electricity load approval</option>
                  <option value="other">Other Miscellaneous spending</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Amount (INR)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  required
                  placeholder="Enter invoice amount"
                  value={expenseForm.amount} 
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || '' })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Item / Service Details</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required
                  placeholder="e.g. 50 bags of OPC cement, slab pouring labor charge"
                  value={expenseForm.itemDescription} 
                  onChange={(e) => setExpenseForm({ ...expenseForm, itemDescription: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Supplier / Agency Name (Optional)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Ultratech Distributors"
                  value={expenseForm.supplier} 
                  onChange={(e) => setExpenseForm({ ...expenseForm, supplier: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Invoice Date</label>
                <input 
                  type="date" 
                  className="form-control" 
                  required
                  value={expenseForm.date} 
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notes / Bill Reference</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Bill #TR-402, paid by cash"
                  value={expenseForm.notes} 
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsExpenseModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add to Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
