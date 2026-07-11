import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../api/client';
import { useUiStore } from '../../stores/uiStore';

interface Props { serverId: string; }

const BanList: React.FC<Props> = ({ serverId }) => {
  const { addToast } = useUiStore();
  const [bans, setBans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const token = (() => { try { return localStorage.getItem('vox_token'); } catch { return null; } })();

  const fetchBans = () => {
    fetch(`${API_BASE}/api/servers/${serverId}/bans`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => { setBans(data.bans || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchBans(); }, [serverId]);

  const unban = async (userId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/servers/${serverId}/bans/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      addToast('Unbanned', 'success');
      fetchBans();
    } catch (e) {
      addToast('Failed to unban', 'error');
    }
  };

  if (loading) return <p style={{ color: 'var(--ash)' }}>Loading...</p>;
  if (!bans.length) return <p style={{ color: 'var(--shadow)' }}>No bans on this realm.</p>;

  return (
    <div>
      <h3 style={{ color: 'var(--ghost-white)', fontFamily: 'Cinzel Decorative', marginBottom: '16px' }}>BANNED OPERATIVES</h3>
      {bans.map((ban) => (
        <div key={ban.id} className="vox-setting-row" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid var(--rim)' }}>
          <div className="octagon" style={{ width: '28px', height: '28px', background: 'var(--obsidian)', display: 'grid', placeItems: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--ghost-white)', flexShrink: 0, overflow: 'hidden' }}>
            {ban.user?.avatarUrl
              ? <img src={ban.user.avatarUrl.startsWith('http') ? ban.user.avatarUrl : `${API_BASE}${ban.user.avatarUrl}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (ban.user?.username?.slice(0, 1).toUpperCase() || '?')}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--ghost-white)', fontSize: '13px' }}>{ban.user?.username || ban.userId}</div>
            {ban.reason && <div style={{ color: 'var(--shadow)', fontSize: '11px' }}>{ban.reason}</div>}
          </div>
          <button className="angular-button" onClick={() => unban(ban.userId)} style={{ padding: '4px 10px', fontSize: '11px', background: 'var(--obsidian)', color: 'var(--ash)' }}>
            UNBAN
          </button>
        </div>
      ))}
    </div>
  );
};

export default BanList;