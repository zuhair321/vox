import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fetchRoles, type Role } from '../../api/roles';
import { useUiStore } from '../../stores/uiStore';

interface Props {
  serverId: string;
  channelId?: string;
}

// Channel-level permission overrides (guide §3.1). In VOX these are stored as
// ChannelPermission allow/deny bitfields. This component manages role overrides
// for the currently selected channel and falls back gracefully when no channel
// is selected.
const ChannelPermissions: React.FC<Props> = ({ serverId, channelId }) => {
  const { addToast } = useUiStore();
  const [roles, setRoles] = useState<Role[]>([]);
  const [overrides, setOverrides] = useState<Record<string, { allow: string; deny: string }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchRoles(serverId)
      .then((d) => setRoles(d.roles || []))
      .catch(() => setRoles([]))
      .finally(() => setLoading(false));
  }, [serverId]);

  if (loading) return <p style={{ color: 'var(--ash)' }}>Loading channel permissions...</p>;

  if (!channelId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h3 style={{ color: 'var(--ghost-white)', margin: 0, fontSize: '16px' }}>Channel Permissions</h3>
        <p style={{ color: 'var(--ash)', fontSize: '13px' }}>
          Select a channel to configure role-specific permission overrides (allow / deny bitfields).
        </p>
      </div>
    );
  }

  const setOverride = (roleId: string, kind: 'allow' | 'deny', value: string) => {
    setOverrides((prev) => ({ ...prev, [roleId]: { allow: prev[roleId]?.allow || '0', deny: prev[roleId]?.deny || '0', [kind]: value } }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h3 style={{ color: 'var(--ghost-white)', margin: 0, fontSize: '16px' }}>Channel Permissions</h3>
      <p style={{ color: 'var(--ash)', fontSize: '12px', margin: 0 }}>
        Override server-wide role permissions for this channel. Leave as 0 to inherit.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {roles.length === 0 && <p style={{ color: 'var(--ash)', fontSize: '13px' }}>No roles to configure.</p>}
        {roles.map((role) => (
          <motion.div key={role.id} className="vox-card" style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: role.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--ghost-white)', fontSize: '13px', fontWeight: 600, flex: 1 }}>{role.name}</span>
            <label style={{ color: 'var(--shadow)', fontSize: '11px' }}>Allow</label>
            <input
              className="angular-input"
              placeholder="0"
              defaultValue={overrides[role.id]?.allow || '0'}
              onChange={(e) => setOverride(role.id, 'allow', e.target.value)}
              style={{ width: '90px', fontSize: '12px', padding: '6px 8px' }}
            />
            <label style={{ color: 'var(--shadow)', fontSize: '11px' }}>Deny</label>
            <input
              className="angular-input"
              placeholder="0"
              defaultValue={overrides[role.id]?.deny || '0'}
              onChange={(e) => setOverride(role.id, 'deny', e.target.value)}
              style={{ width: '90px', fontSize: '12px', padding: '6px 8px' }}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ChannelPermissions;
