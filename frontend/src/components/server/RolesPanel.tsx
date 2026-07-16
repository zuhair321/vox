import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../api/client';
import { useUiStore } from '../../stores/uiStore';

const ROLES = ['FOUNDER', 'ADMIN', 'MODERATOR', 'MEMBER'];

const RoleColor: Record<string, string> = {
  FOUNDER: '#e7edf5',
  ADMIN: '#d84a5a',
  MODERATOR: '#d9c98d',
  MEMBER: '#8c95a3',
};

interface Props { serverId: string; }

const RolesPanel: React.FC<Props> = ({ serverId }) => {
  const { addToast } = useUiStore();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const token = (() => { try { return JSON.parse(localStorage.getItem('vox_user') || '{}').id ? localStorage.getItem('vox_token') : null; } catch { return null; } })();

  useEffect(() => {
    fetch(`${API_BASE}/api/servers/${serverId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        setMembers(data.members || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [serverId, token]);

  const changeRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/servers/${serverId}/members/${userId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error('Failed');
      addToast(`Role updated to ${newRole}`, 'success');
      setMembers((prev) => prev.map((m) => (m.userId === userId ? { ...m, role: newRole } : m)));
    } catch (e) {
      addToast('Failed to update role', 'error');
    }
  };

  if (loading) return <p style={{ color: 'var(--ash)' }}>Loading...</p>;

  return (
    <div>
      <h3 style={{ color: 'var(--ghost-white)', fontFamily: 'Cinzel Decorative', marginBottom: '16px' }}>OPERATIVES</h3>
      {members.map((member) => {
        const role = member.role || 'MEMBER';
        const roleColor = RoleColor[role] || RoleColor.MEMBER;
        return (
          <div key={member.userId} className="vox-setting-row" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
              <div
                className="octagon"
                style={{
                  width: '32px',
                  height: '32px',
                  flexShrink: 0,
                  background: `linear-gradient(135deg, ${roleColor}33, var(--obsidian))`,
                  border: `1px solid ${roleColor}44`,
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 800,
                  fontSize: '13px',
                  color: roleColor,
                  overflow: 'hidden',
                }}
              >
                 {member.user?.avatarUrl
                   ? <img src={member.user.avatarUrl.startsWith('http') ? member.user.avatarUrl : `${API_BASE}${member.user.avatarUrl}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                   : ((member.user?.username?.slice(0, 1) || '?').toUpperCase())}
              </div>
              <span style={{ color: 'var(--ghost-white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                {member.user?.username || member.userId}
              </span>
            </div>
            <select
              value={role}
              onChange={(e) => changeRole(member.userId, e.target.value)}
              className="angular-input"
              style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', flexShrink: 0, minWidth: '110px', color: roleColor }}
            >
              {ROLES.map((r) => (
                <option key={r} value={r} style={{ color: RoleColor[r] }}>{r}</option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
};

export default RolesPanel;
