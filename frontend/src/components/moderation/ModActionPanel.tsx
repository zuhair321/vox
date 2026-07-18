import React, { useState } from 'react';
import { kickMember, banMember, timeoutMember, warnMember, muteMember, deafenMember } from '../../api/moderation';
import { useUiStore } from '../../stores/uiStore';

interface Props {
  serverId: string;
  targetId: string;
  targetName: string;
}

const ModActionPanel: React.FC<Props> = ({ serverId, targetId, targetName }) => {
  const { addToast } = useUiStore();
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState(5);
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (fn: () => Promise<any>, label: string) => {
    setBusy(label);
    try {
      await fn();
      addToast(`${label} applied to ${targetName}.`, 'success');
    } catch (e: any) {
      addToast(e?.message || `Failed to ${label.toLowerCase()}.`, 'error');
    } finally {
      setBusy(null);
    }
  };

  const btn = (label: string, onClick: () => void, color: string) => (
    <button
      onClick={onClick}
      disabled={!!busy}
      style={{
        padding: '6px 12px',
        background: busy === label ? 'var(--rim)' : color,
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 600,
        cursor: busy ? 'not-allowed' : 'pointer',
        opacity: busy ? 0.7 : 1,
      }}
    >
      {busy === label ? '...' : label}
    </button>
  );

  return (
    <div className="vox-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <input
        className="angular-input"
        placeholder="Reason..."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        style={{ fontSize: '12px', padding: '6px 10px' }}
      />
      <input
        className="angular-input"
        type="number"
        placeholder="Duration (min)"
        value={duration}
        onChange={(e) => setDuration(Number(e.target.value) || 0)}
        style={{ fontSize: '12px', padding: '6px 10px', width: '120px' }}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {btn('Kick', () => act(() => kickMember(serverId, { targetId, reason }), 'Kick'), 'var(--chaos)')}
        {btn('Ban', () => act(() => banMember(serverId, { targetId, reason }), 'Ban'), '#a33030')}
        {btn('Timeout', () => act(() => timeoutMember(serverId, { targetId, duration, reason }), 'Timeout'), '#d4a017')}
        {btn('Warn', () => act(() => warnMember(serverId, { targetId, reason }), 'Warn'), '#2d7dd2')}
        {btn('Mute', () => act(() => muteMember(serverId, { targetId, reason }), 'Mute'), '#5a3d8a')}
        {btn('Deafen', () => act(() => deafenMember(serverId, { targetId, reason }), 'Deafen'), '#4a6d5a')}
      </div>
    </div>
  );
};

export default ModActionPanel;
