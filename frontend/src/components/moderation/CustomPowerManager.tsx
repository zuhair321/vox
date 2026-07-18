import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  fetchCustomPowers,
  createCustomPower,
  grantCustomPower,
  revokeCustomPower,
  type CustomPower,
} from '../../api/moderation';
import { useUiStore } from '../../stores/uiStore';

interface Member {
  userId: string;
  user?: { username?: string; displayName?: string };
}

interface Props {
  serverId: string;
  members?: Member[];
}

const BURNT_IN_GRANTS = [
  { type: 'permission', permission: 'MANAGE_MESSAGES' },
  { type: 'permission', permission: 'KICK_MEMBERS' },
  { type: 'bypass', restriction: 'slowmode' },
  { type: 'bypass', restriction: 'attachment-limit' },
  { type: 'quota', resource: 'attachments-per-message', limit: 10 },
  { type: 'feature', feature: 'embed-rich-content', config: {} },
];

const CustomPowerManager: React.FC<Props> = ({ serverId, members = [] }) => {
  const { addToast } = useUiStore();
  const [powers, setPowers] = useState<CustomPower[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    fetchCustomPowers(serverId)
      .then((d) => setPowers(d.powers || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, [serverId]);

  const create = async () => {
    if (!name.trim()) {
      addToast('Power name is required.', 'error');
      return;
    }
    setBusy(true);
    try {
      await createCustomPower(serverId, {
        name: name.trim(),
        description: description.trim(),
        icon: icon.trim() || undefined,
        grants: BURNT_IN_GRANTS,
        grantableBy: [],
        maxHolders: undefined,
      });
      addToast('Custom power created.', 'success');
      setName('');
      setDescription('');
      setIcon('');
      load();
    } catch (e: any) {
      addToast(e?.message || 'Failed to create power.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const grant = async (powerId: string, userId: string) => {
    try {
      await grantCustomPower(serverId, userId, { powerId });
      addToast('Power granted.', 'success');
    } catch (e: any) {
      addToast(e?.message || 'Failed to grant.', 'error');
    }
  };

  const revoke = async (powerId: string, userId: string) => {
    try {
      await revokeCustomPower(serverId, userId, powerId);
      addToast('Power revoked.', 'success');
    } catch (e: any) {
      addToast(e?.message || 'Failed to revoke.', 'error');
    }
  };

  if (loading) return <p style={{ color: 'var(--ash)' }}>Loading custom powers...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <h3 style={{ color: 'var(--ghost-white)', margin: 0, fontSize: '16px' }}>Custom Powers</h3>

      <div className="vox-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <input className="angular-input" placeholder="Power name (e.g. Event Host)" value={name}
          onChange={(e) => setName(e.target.value)} style={{ fontSize: '13px', padding: '8px 12px' }} />
        <input className="angular-input" placeholder="Description" value={description}
          onChange={(e) => setDescription(e.target.value)} style={{ fontSize: '13px', padding: '8px 12px' }} />
        <input className="angular-input" placeholder="Icon (emoji)" value={icon}
          onChange={(e) => setIcon(e.target.value)} style={{ fontSize: '13px', padding: '8px 12px', width: '120px' }} />
        <button className="angular-button primary" onClick={create} disabled={busy} style={{ alignSelf: 'flex-start', padding: '8px 16px', fontSize: '12px' }}>
          {busy ? 'Creating...' : 'Create Power'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {powers.length === 0 && <p style={{ color: 'var(--ash)', fontSize: '13px' }}>No custom powers yet.</p>}
        {powers.map((p) => (
          <motion.div key={p.id} className="vox-card" style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {p.icon && <span style={{ fontSize: '18px' }}>{p.icon}</span>}
              <span style={{ color: 'var(--ghost-white)', fontWeight: 600, fontSize: '13px' }}>{p.name}</span>
            </div>
            {p.description && <div style={{ color: 'var(--ash)', fontSize: '12px', marginTop: '4px' }}>{p.description}</div>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
              <select
                className="angular-input"
                defaultValue=""
                onChange={(e) => { if (e.target.value) { grant(p.id, e.target.value); e.target.value = ''; } }}
                style={{ fontSize: '12px', padding: '6px 8px', maxWidth: '200px' }}
              >
                <option value="">Grant to member…</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user?.displayName || m.user?.username || m.userId.slice(0, 8)}
                  </option>
                ))}
              </select>
              <select
                className="angular-input"
                defaultValue=""
                onChange={(e) => { if (e.target.value) { revoke(p.id, e.target.value); e.target.value = ''; } }}
                style={{ fontSize: '12px', padding: '6px 8px', maxWidth: '200px' }}
              >
                <option value="">Revoke from…</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user?.displayName || m.user?.username || m.userId.slice(0, 8)}
                  </option>
                ))}
              </select>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default CustomPowerManager;
