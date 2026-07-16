import React, { useEffect, useState } from 'react';
import { Code2, Copy } from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';
import {
  getWidgetConfig,
  updateWidgetConfig,
  type WidgetConfig,
} from '../../api/widget';

const WidgetPanel: React.FC<{ serverId: string }> = ({ serverId }) => {
  const { addToast } = useUiStore();
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [url, setUrl] = useState('');
  const [embedCode, setEmbedCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const data = await getWidgetConfig(serverId);
      setConfig(data.config);
      setUrl(data.url);
      setEmbedCode(data.embedCode);
    } catch (e: any) {
      addToast(e?.message || 'Could not load widget settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const update = async (patch: Partial<WidgetConfig>) => {
    setSaving(true);
    try {
      const data = await updateWidgetConfig(serverId, patch);
      setConfig(data.config);
      addToast('Widget settings updated', 'success');
    } catch (e: any) {
      addToast(e?.message || 'Failed to update widget', 'error');
    } finally {
      setSaving(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text);
    addToast('Copied to clipboard', 'success');
  };

  if (loading || !config) {
    return <div style={{ color: 'var(--text-muted)' }}>Loading widget settings...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <section>
        <h3 style={{ color: 'var(--ghost-white)', fontSize: 14, letterSpacing: '0.08em', marginBottom: 12 }}>
          WIDGET SETTINGS
        </h3>
        <div className="vox-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <strong>Enable Widget</strong>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Allow embedding this server on external websites.
            </div>
          </div>
          <button
            type="button"
            className={`vox-toggle ${config.enabled ? 'on' : ''}`}
            onClick={() => update({ enabled: !config.enabled })}
            disabled={saving}
            aria-label="Toggle widget"
          >
            <span className="knob" />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
          <label style={{ flex: 1, minWidth: 140 }}>
            <span className="field-label">Theme</span>
            <select
              className="text-input"
              value={config.theme}
              onChange={(e) => update({ theme: e.target.value as 'dark' | 'light' })}
              disabled={saving}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </label>
          <div className="vox-card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div>
              <strong>Show Online Count</strong>
            </div>
            <button
              type="button"
              className={`vox-toggle ${config.showOnline ? 'on' : ''}`}
              onClick={() => update({ showOnline: !config.showOnline })}
              disabled={saving}
              aria-label="Toggle online count"
            >
              <span className="knob" />
            </button>
          </div>
          <div className="vox-card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div>
              <strong>Show Join Button</strong>
            </div>
            <button
              type="button"
              className={`vox-toggle ${config.showJoin ? 'on' : ''}`}
              onClick={() => update({ showJoin: !config.showJoin })}
              disabled={saving}
              aria-label="Toggle join button"
            >
              <span className="knob" />
            </button>
          </div>
        </div>
      </section>

      {config.enabled && (
        <section>
          <h3 style={{ color: 'var(--ghost-white)', fontSize: 14, letterSpacing: '0.08em', marginBottom: 12 }}>
            <Code2 size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />EMBED CODE
          </h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'rgba(255,255,255,0.04)', padding: '10px 12px', borderRadius: 6 }}>
            <code style={{ flex: 1, wordBreak: 'break-all', fontSize: 12, whiteSpace: 'pre-wrap' }}>{embedCode}</code>
            <button type="button" className="angular-button" onClick={() => copy(embedCode)}><Copy size={16} /></button>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
            Embed this iframe on any website to show your server's presence.{' '}
            <a href={url} target="_blank" rel="noreferrer" style={{ color: 'var(--chaos)' }}>Open preview →</a>
          </p>
        </section>
      )}
    </div>
  );
};

export default WidgetPanel;
