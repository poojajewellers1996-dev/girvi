import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Loader2, Search, Calendar, User, Activity } from 'lucide-react';

export default function SystemLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getLogs();
      setLogs(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch System Logs');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (log.action && log.action.toLowerCase().includes(term)) ||
      (log.details && log.details.toLowerCase().includes(term)) ||
      (log.module && log.module.toLowerCase().includes(term)) ||
      (log.user_name && log.user_name.toLowerCase().includes(term))
    );
  });

  const getModuleColor = (mod) => {
    switch(mod) {
      case 'SETUP': return '#3b82f6';
      case 'AUTH': return '#8b5cf6';
      case 'GIRVI': return '#10b981';
      default: return 'var(--text-muted)';
    }
  };

  const formatTimestamp = (ts) => {
    try {
      return new Date(ts).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return ts;
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Loader2 className="spin" size={48} style={{ color: 'var(--primary-color)' }} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>System Logs</h2>
        <div style={{ position: 'relative', minWidth: '300px' }}>
          <div style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
            <Search size={18} />
          </div>
          <input 
            type="text" 
            placeholder="Search action, details, module..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '40px', margin: 0 }}
          />
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
              <tr>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Timestamp</th>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Module</th>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Action</th>
                <th style={{ padding: '1rem', fontWeight: '600' }}>Details</th>
                <th style={{ padding: '1rem', fontWeight: '600' }}>User</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {searchTerm ? "No logs match your search." : "No system logs found."}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Calendar size={14} color="var(--text-muted)" />
                        {formatTimestamp(log.timestamp)}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: '600', color: getModuleColor(log.module) }}>
                      {log.module}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: '500' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Activity size={14} color="var(--text-muted)" />
                        {log.action}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{log.details}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <User size={14} color="var(--text-muted)" />
                        {log.user_name}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
