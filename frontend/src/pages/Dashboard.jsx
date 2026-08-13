import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Loader, TrendingUp, Users, CheckCircle, IndianRupee } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getGirviStats();
      setStats(data);
    } catch (err) {
      setError('Failed to fetch dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="container mt-6 flex justify-center" style={{ minHeight: '60vh', alignItems: 'center' }}>
        <Loader className="animate-spin" size={32} style={{ color: 'var(--primary)' }} />
        <span className="ml-3" style={{ color: 'var(--text-muted)' }}>Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-6">
        <div style={{ padding: '1rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--radius-md)' }}>
          {error}
        </div>
      </div>
    );
  }

  const COLORS = ['#6366f1', '#10b981']; // Primary and Success colors

  const pieData = [
    { name: 'Active Girvis', value: stats?.active_girvis || 0 },
    { name: 'Released Girvis', value: stats?.released_girvis || 0 }
  ];

  const StatCard = ({ title, value, icon, subtitle }) => (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', gap: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)' }}>
        <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 500 }}>{title}</h3>
        {icon}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-color)' }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          {subtitle}
        </div>
      )}
    </div>
  );

  return (
    <div className="container mt-6">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2>Analytics Dashboard</h2>
          <p style={{ color: 'var(--text-muted)' }}>High-level overview of your Girvi business</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <StatCard 
          title="Total Girvis" 
          value={stats?.total_girvis || 0} 
          icon={<Users size={20} />} 
          subtitle="All time records"
        />
        <StatCard 
          title="Active Loan Amount" 
          value={`₹${(stats?.active_loan_amount || 0).toLocaleString()}`} 
          icon={<IndianRupee size={20} />} 
          subtitle="Currently out on loan"
        />
        <StatCard 
          title="Released Loan Amount" 
          value={`₹${(stats?.released_loan_amount || 0).toLocaleString()}`} 
          icon={<CheckCircle size={20} color="var(--success)" />} 
          subtitle="Total loans recovered"
        />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem' }}>Girvi Status Breakdown</h3>
          {stats?.total_girvis === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: 'var(--text-muted)' }}>
              No data available to display chart
            </div>
          ) : (
            <div style={{ height: '350px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={130}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
