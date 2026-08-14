import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Loader, Users, CheckCircle, IndianRupee, Scale, Coins, Percent } from 'lucide-react';
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

  const StatCard = ({ title, value, icon, subtitle, color }) => (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '1.25rem', gap: '0.4rem', background: 'var(--bg-surface)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{title}</span>
        {icon}
      </div>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: color || 'var(--text-primary)' }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {subtitle}
        </div>
      )}
    </div>
  );

  return (
    <div className="container mt-6 animate-fade-in" style={{ paddingBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>Analytics Dashboard</h2>
          <p style={{ color: 'var(--text-muted)', margin: 0, marginTop: '2px', fontSize: '0.875rem' }}>High-level overview of your Girvi & Gold/Silver business</p>
        </div>
      </div>

      {/* Row 1: Primary Overview Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <StatCard 
          title="Total Girvis" 
          value={stats?.total_girvis || 0} 
          icon={<Users size={20} color="#6366f1" />} 
          subtitle="All time records"
          color="#6366f1"
        />
        <StatCard 
          title="Active Loan Amount" 
          value={`₹${(stats?.active_loan_amount || 0).toLocaleString('en-IN')}`} 
          icon={<IndianRupee size={20} color="#10b981" />} 
          subtitle="Currently out on loan"
          color="#10b981"
        />
        <StatCard 
          title="Released Loan Amount" 
          value={`₹${(stats?.released_loan_amount || 0).toLocaleString('en-IN')}`} 
          icon={<CheckCircle size={20} color="#8b5cf6" />} 
          subtitle="Total loans recovered"
          color="#8b5cf6"
        />
        <StatCard 
          title="Total Interest Collected" 
          value={`₹${(stats?.total_interest_collected || 0).toLocaleString('en-IN')}`} 
          icon={<Coins size={20} color="#f59e0b" />} 
          subtitle="From ledger transactions"
          color="#f59e0b"
        />
      </div>

      {/* Row 2: Gold & Silver Specific Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <StatCard 
          title="🥇 Gold Girvi Weight" 
          value={`${(stats?.gold_weight || 0).toFixed(2)} g`} 
          icon={<Scale size={20} color="#f59e0b" />} 
          subtitle="Total active Gold weight"
          color="#f59e0b"
        />
        <StatCard 
          title="🥇 Total Gold Loan" 
          value={`₹${(stats?.gold_loan_amount || 0).toLocaleString('en-IN')}`} 
          icon={<IndianRupee size={20} color="#f59e0b" />} 
          subtitle="Active Gold loan principal"
          color="#f59e0b"
        />
        <StatCard 
          title="🥈 Silver Girvi Weight" 
          value={`${(stats?.silver_weight || 0).toFixed(2)} g`} 
          icon={<Scale size={20} color="#94a3b8" />} 
          subtitle="Total active Silver weight"
          color="#94a3b8"
        />
        <StatCard 
          title="🥈 Total Silver Loan" 
          value={`₹${(stats?.silver_loan_amount || 0).toLocaleString('en-IN')}`} 
          icon={<IndianRupee size={20} color="#94a3b8" />} 
          subtitle="Active Silver loan principal"
          color="#94a3b8"
        />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 600 }}>Girvi Status Breakdown</h3>
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
