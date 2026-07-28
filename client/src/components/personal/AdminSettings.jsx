import { authFetch } from '../../utils/authFetch';
import React, { useState, useEffect } from 'react';
import { Settings, Save, Plus, Trash2, AlertCircle } from 'lucide-react';

export default function AdminSettings() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/config');
      if (!res.ok) throw new Error('Failed to fetch configuration');
      const data = await res.json();
      setConfig(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await authFetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!res.ok) throw new Error('Failed to save configuration');
      alert('Settings saved successfully!');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = (key) => {
    const newItem = prompt('Enter new value:');
    if (newItem && newItem.trim()) {
      setConfig(prev => ({
        ...prev,
        [key]: [...prev[key], newItem.trim()]
      }));
    }
  };

  const handleRemoveItem = (key, index) => {
    if (window.confirm('Are you sure you want to remove this item?')) {
      setConfig(prev => ({
        ...prev,
        [key]: prev[key].filter((_, i) => i !== index)
      }));
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading settings...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;
  if (!config) return null;

  const configSections = [
    { key: 'utilityConnections', label: 'Electricity / Utility Connections' },
    { key: 'billTypes', label: 'Utility Bill Types' },
    { key: 'insuranceTypes', label: 'Insurance Types' },
    { key: 'insuranceProviders', label: 'Insurance Providers' },
    { key: 'constructionCategories', label: 'Construction Expense Categories' },
    { key: 'relationshipTypes', label: 'Personal Debt Relationship Types' },
    { key: 'carServiceTypes', label: 'Car Service Types' },
    { key: 'buildingNames', label: 'Building Names (Rental)' }
  ];

  return (
    <div className="admin-settings">
      <div className="page-header">
        <div className="page-title-section">
          <h1>Admin Settings</h1>
          <p>Manage dropdown options for all modules</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : <><Save size={18} /> Save Settings</>}
        </button>
      </div>

      <div className="glass-card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--color-info)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <AlertCircle style={{ color: 'var(--color-info)', flexShrink: 0, marginTop: '0.25rem' }} size={20} />
          <div>
            <h3 style={{ fontWeight: 600, color: 'white', marginBottom: '0.25rem' }}>How this works</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              The values defined below will auto-populate the dropdowns in their respective modules. 
              Adding or removing items here will instantly update the forms across the application.
              Remember to click "Save Settings" after making changes.
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {configSections.map(section => (
          <div key={section.key} className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <h3 style={{ fontWeight: 600, color: 'white', fontSize: '0.95rem' }}>{section.label}</h3>
              <button 
                onClick={() => handleAddItem(section.key)}
                title="Add new item"
                style={{ 
                  background: 'rgba(99, 102, 241, 0.1)', 
                  border: 'none',
                  color: 'var(--color-primary)', 
                  padding: '0.4rem', 
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Plus size={16} />
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', maxHeight: '250px' }}>
              {config[section.key] && config[section.key].length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {config[section.key].map((item, index) => (
                    <li 
                      key={index} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '0.5rem 0.75rem', 
                        borderRadius: '4px', 
                        background: 'rgba(0, 0, 0, 0.2)', 
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.lastChild.style.opacity = 1}
                      onMouseLeave={(e) => e.currentTarget.lastChild.style.opacity = 0}
                    >
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{item}</span>
                      <button 
                        onClick={() => handleRemoveItem(section.key, index)}
                        title="Remove item"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-danger)',
                          cursor: 'pointer',
                          opacity: 0,
                          transition: 'opacity 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '1rem 0' }}>No items defined.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
