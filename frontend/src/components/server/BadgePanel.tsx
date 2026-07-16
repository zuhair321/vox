import React, { useState, useEffect } from 'react';
import { fetchBadges, createServerBadge, deleteBadge, assignBadge, Badge } from '../../api/badges';
import { useUiStore } from '../../stores/uiStore';

interface Member { userId: string; nick?: string; user?: { username?: string; displayName?: string }; username?: string; displayName?: string; }
interface Props { serverId: string; members?: Member[]; }

const isImage = (icon: string) => /^https?:\/\//.test(icon) || icon.startsWith('/');

const BadgePanel: React.FC<Props> = ({ serverId, members = [] }) => {
  const { addToast } = useUiStore();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#5865f2');
  const [loading, setLoading] = useState(true);
  const [assignTo, setAssignTo] = useState<Record<string, string>>({});

  const load = () => {
    fetchBadges(serverId)
      .then((d) => setBadges((d.badges || []).filter((b) => b.serverId === serverId)))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [serverId]);

  const create = async () => {
    if (!name.trim() || !icon.trim()) return;
    try {
      await createServerBadge(serverId, { name: name.trim(), icon: icon.trim(), description: description.trim() || undefined, color });
      addToast('Badge created', 'success');
      setName(''); setIcon(''); setDescription(''); setColor('#5865f2');
      load();
    } catch (e: any) {
      addToast(e?.message || 'Failed to create badge', 'error');
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteBadge(id);
      addToast('Badge deleted', 'success');
      load();
    } catch (e: any) {
      addToast(e?.message || 'Failed to delete badge', 'error');
    }
  };

  const assign = async (badgeId: string) => {
    const userId = assignTo[badgeId];
    if (!userId) { addToast('Pick a member first', 'error'); return; }
    try {
      await assignBadge(serverId, badgeId, userId);
      addToast('Badge awarded', 'success');
    } catch (e: any) {
      addToast(e?.message || 'Failed to award badge', 'error');
    }
  };

  const memberLabel = (m: Member) =>
    m.nick || m.user?.displayName || m.displayName || m.user?.username || m.username || m.userId;

  if (loading) return <p style={{ color: 'var(--ash)' }}>Loading...</p>;

  return (
    <div>
      <h3 style={{ color: 'var(--ghost-white)', fontFamily: 'Cinzel Decorative', marginBottom: '16px' }}>BADGES</h3>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Badge name" className="angular-input" style={{ width: '130px' }} />
        <input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="Emoji or image URL" className="angular-input" style={{ width: '160px' }} />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="angular-input" style={{ flex: 1, minWidth: '140px' }} />
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} title="Badge color" style={{ width: '36px', height: '32px', background: 'transparent', border: '1px solid var(--rim)', cursor: 'pointer' }} />
        <button className="angular-button primary" onClick={create} style={{ padding: '6px 14px', fontSize: '12px' }}>CREATE</button>
      </div>
      {badges.length === 0 ? (
        <p style={{ color: 'var(--shadow)', fontSize: '12px' }}>No badges yet. Create one above.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {badges.map((b) => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', border: '1px solid var(--rim)', background: 'var(--obsidian)', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', background: (b.color || '#5865f2') + '22', border: `1px solid ${b.color || '#5865f2'}` }}>
                {isImage(b.icon) ? <img src={b.icon} alt={b.name} style={{ width: '22px', height: '22px', objectFit: 'contain' }} /> : <span style={{ fontSize: '18px' }}>{b.icon}</span>}
              </span>
              <div style={{ minWidth: '120px' }}>
                <div style={{ color: 'var(--ghost-white)', fontFamily: 'Share Tech Mono', fontSize: '13px' }}>{b.name}</div>
                {b.description && <div style={{ color: 'var(--shadow)', fontSize: '11px' }}>{b.description}</div>}
              </div>
              <div style={{ flex: 1 }} />
              <select
                value={assignTo[b.id] || ''}
                onChange={(e) => setAssignTo((prev) => ({ ...prev, [b.id]: e.target.value }))}
                className="angular-input"
                style={{ minWidth: '140px' }}
              >
                <option value="">Award to…</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>{memberLabel(m)}</option>
                ))}
              </select>
              <button className="angular-button" onClick={() => assign(b.id)} style={{ padding: '4px 10px', fontSize: '11px' }}>AWARD</button>
              <button className="angular-button" onClick={() => remove(b.id)} style={{ padding: '2px 8px', fontSize: '10px', background: 'var(--crimson)', color: 'white' }}>DELETE</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BadgePanel;
