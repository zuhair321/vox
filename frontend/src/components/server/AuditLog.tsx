import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../api/client';

interface Props { serverId: string; }

const AuditLog: React.FC<Props> = ({ serverId }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const token = (() => { try { return localStorage.getItem('vox_token'); } catch { return null; } })();

  useEffect(() => {
    fetch(`${API_BASE}/api/servers/${serverId}/audit`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => { setLogs(data.logs || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [serverId, token]);

  if (loading) return <p style={{ color: 'var(--ash)' }}>Loading...</p>;
  if (!logs.length) return <p style={{ color: 'var(--shadow)' }}>No audit entries yet.</p>;

  return (
    <div>
      <h3 style={{ color: 'var(--ghost-white)', fontFamily: 'Cinzel Decorative', marginBottom: '16px' }}>AUDIT LOG</h3>
      {logs.map((log) => (
        <div key={log.id} className="vox-setting-row" style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px', alignItems: 'center' }}>
          <span style={{ color: 'var(--chaos)', fontFamily: 'Share Tech Mono', fontSize: '11px' }}>{new Date(log.createdAt).toLocaleString()}</span>
          <span style={{ color: 'var(--ghost-white)' }}>
            <strong>{log.userId}</strong> {log.action} {log.targetId ? `→ ${log.targetId}` : ''}
          </span>
        </div>
      ))}
    </div>
  );
};

export default AuditLog;
