import React, { useState, useEffect } from 'react';
import { fetchAutomodConfig, updateAutomodConfig, type AutomodConfig } from '../../api/automod';
import { useUiStore } from '../../stores/uiStore';

interface Props { serverId: string; }

const Toggle: React.FC<{ on: boolean; onClick: () => void }> = ({ on, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      width: '40px', height: '22px', borderRadius: '11px', border: 'none',
      background: on ? 'var(--chaos)' : 'var(--rim)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
    }}
  >
    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'white', position: 'absolute', top: '3px', left: on ? '21px' : '3px', transition: 'left 0.2s' }} />
  </button>
);

const AutomodPanel: React.FC<Props> = ({ serverId }) => {
  const { addToast } = useUiStore();
  const [config, setConfig] = useState<AutomodConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Local editable copy with sensible defaults when no config exists yet.
  const [filterWords, setFilterWords] = useState(true);
  const [filterLinks, setFilterLinks] = useState(true);
  const [filterSpam, setFilterSpam] = useState(true);
  const [maxStrikes, setMaxStrikes] = useState(3);
  const [strikeTimeout, setStrikeTimeout] = useState(1440);

  useEffect(() => {
    fetchAutomodConfig(serverId)
      .then((d) => {
        setConfig(d.automod);
        if (d.automod) {
          setFilterWords(d.automod.filterWords);
          setFilterLinks(d.automod.filterLinks);
          setFilterSpam(d.automod.filterSpam);
          setMaxStrikes(d.automod.maxStrikes);
          setStrikeTimeout(d.automod.strikeTimeout);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [serverId]);

  const save = async () => {
    setSaving(true);
    try {
      const d = await updateAutomodConfig(serverId, { filterWords, filterLinks, filterSpam, maxStrikes, strikeTimeout });
      setConfig(d.automod);
      addToast('Auto-mod settings saved', 'success');
    } catch (e: any) {
      addToast(e?.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p style={{ color: 'var(--ash)' }}>Loading...</p>;

  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--rim)' };
  const labelWrap: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '2px' };

  return (
    <div>
      <h3 style={{ color: 'var(--ghost-white)', fontFamily: 'Cinzel Decorative', marginBottom: '4px' }}>AUTO-MODERATION</h3>
      <p style={{ color: 'var(--shadow)', fontSize: '12px', marginBottom: '16px' }}>
        {config ? 'Auto-mod is active on this server.' : 'Auto-mod is not configured yet — enable the filters below and save.'}
      </p>

      <div style={row}>
        <div style={labelWrap}>
          <span style={{ color: 'var(--ghost-white)', fontSize: '13px' }}>Word filter</span>
          <span style={{ color: 'var(--shadow)', fontSize: '11px' }}>Blocks messages containing banned words.</span>
        </div>
        <Toggle on={filterWords} onClick={() => setFilterWords((v) => !v)} />
      </div>

      <div style={row}>
        <div style={labelWrap}>
          <span style={{ color: 'var(--ghost-white)', fontSize: '13px' }}>Link filter</span>
          <span style={{ color: 'var(--shadow)', fontSize: '11px' }}>Blocks messages that contain URLs.</span>
        </div>
        <Toggle on={filterLinks} onClick={() => setFilterLinks((v) => !v)} />
      </div>

      <div style={row}>
        <div style={labelWrap}>
          <span style={{ color: 'var(--ghost-white)', fontSize: '13px' }}>Spam filter</span>
          <span style={{ color: 'var(--shadow)', fontSize: '11px' }}>Blocks users sending too many messages too fast.</span>
        </div>
        <Toggle on={filterSpam} onClick={() => setFilterSpam((v) => !v)} />
      </div>

      <div style={{ ...row, borderBottom: 'none', marginTop: '8px' }}>
        <div style={labelWrap}>
          <span style={{ color: 'var(--ghost-white)', fontSize: '13px' }}>Max strikes before timeout</span>
          <span style={{ color: 'var(--shadow)', fontSize: '11px' }}>Auto-timeout a member once they hit this many active strikes.</span>
        </div>
        <input type="number" min={1} max={20} value={maxStrikes} onChange={(e) => setMaxStrikes(Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)))} className="angular-input" style={{ width: '70px' }} />
      </div>

      <div style={{ ...row, borderBottom: 'none' }}>
        <div style={labelWrap}>
          <span style={{ color: 'var(--ghost-white)', fontSize: '13px' }}>Timeout duration (minutes)</span>
          <span style={{ color: 'var(--shadow)', fontSize: '11px' }}>How long the auto-timeout mutes the member.</span>
        </div>
        <input type="number" min={1} max={43200} value={strikeTimeout} onChange={(e) => setStrikeTimeout(Math.max(1, Math.min(43200, parseInt(e.target.value, 10) || 1)))} className="angular-input" style={{ width: '90px' }} />
      </div>

      <button className="angular-button primary" onClick={save} disabled={saving} style={{ marginTop: '16px', padding: '8px 20px' }}>
        {saving ? 'SAVING...' : 'SAVE AUTO-MOD'}
      </button>
    </div>
  );
};

export default AutomodPanel;
