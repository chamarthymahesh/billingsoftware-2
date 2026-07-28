import React from 'react';

// Sample recent activity data
const recentActivities = [
  { id: 1, description: 'Paid electricity bill', time: '2 hours ago' },
  { id: 2, description: 'Added new loan record', time: '1 day ago' },
  { id: 3, description: 'Updated car maintenance log', time: '3 days ago' },
  { id: 4, description: 'Generated monthly report', time: '1 week ago' },
];

export default function RecentActivity() {
  return (
    <div className="glass-card recent-activity" style={{ marginTop: '2rem', padding: '1rem' }}>
      <h2 style={{ marginBottom: '1rem' }}>Recent Activity</h2>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {recentActivities.map((item) => (
          <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
            <span>{item.description}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{item.time}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
