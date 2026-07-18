import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { fetchAutomodConfig, updateAutomodConfig } from '../../api/automod';
import { useUiStore } from '../../stores/uiStore';

interface Props {
  serverId: string;
}

const AutoModDashboard: React.FC<Props> = ({ serverId }) => {
  const { addToast } = useUiStore();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [filterWords, setFilterWords] = useState(true);
  const [filterLinks, setFilterLinks] = useState(true);
  const [filterSpam, setFilterSpam] = useState(true);
  const [maxStrikes, setMaxStrikes] = useState(3);
  const [strikeTimeout, setStrikeTimeout] = useState(1440);

  React.useEffect(() => {
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3 style={{ color: 'var(--ghost-white)', margin: 0, fontSize: '16px' }}>Auto-Mod Dashboard</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
        {[
          { label: 'Word Filter', on: filterWords, set: setFilterWords },
          { label: 'Link Filter', on: filterLinks, set: setFilterLinks },
          { label: 'Spam Filter', on: filterSpam, set: setFilterSpam },
        ].map((item) => (
          <motion.div key={item.label} whileHover={{ scale: 1.02 }} className="vox-card" style={{ padding: '14px' }}>
            <div style={{ color: 'var(--shadow)', fontSize: '11px', marginBottom: '4px' }}>{item.label}</div>
            <button
              onClick={() => item.set(!item.on)}
              style={{
                width: '100%', padding: '6px', borderRadius: '4px', border: 'none',
                background: item.on ? 'var(--chaos)' : 'var(--rim)', color: '#fff',
                cursor: 'pointer', fontSize: '12px', fontWeight: 600,
              }}
            >
              {item.on ? 'Enabled' : 'Disabled'}
            </button>
          </motion.div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ color: 'var(--ash)', fontSize: '12px' }}>Max Strikes:</label>
        <input className="angular-input" type="number" min={1} max={20} value={maxStrikes} onChange={(e) => setMaxStrikes(Number(e.target.value))} style={{ width: '70px' }} />
        <label style={{ color: 'var(--ash)', fontSize: '12px' }}>Timeout (min):</label>
        <input className="angular-input" type="number" min={1} max={43200} value={strikeTimeout} onChange={(e) => setStrikeTimeout(Number(e.target.value))} style={{ width: '90px' }} />
      </div>
      <button className="angular-button primary" onClick={save} disabled={saving} style={{ alignSelf: 'flex-start', padding: '8px 16px' }}>
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
};

export default AutoModDashboard;
