import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../api/client';
import { useUiStore } from '../../stores/uiStore';

interface Props { serverId: string; }

const WebhookPanel: React.FC<Props> = ({ serverId }) => {
  const { addToast } = useUiStore();
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [channelId, setChannelId] = useState('');
  const [loading, setLoading] = useState(true);
  const token = (() => { try { return localStorage.getItem('vox_token'); } catch { return null; } })();

  const fetchWebhooks = () => {
    fetch(`${API_BASE}/api/servers/${serverId}/webhooks`, { headers: {} })
      .then((r) => r.json())
      .then((data) => { setWebhooks(data.webhooks || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchWebhooks(); }, [serverId]);

  const createWebhook = async () => {
    if (!name.trim() || !channelId) return;
    try {
      const res = await fetch(`${API_BASE}/api/servers/${serverId}/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), channelId })
      });
      if (!res.ok) throw new Error('Failed');
      addToast('Webhook created', 'success');
      setName('');
      fetchWebhooks();
    } catch (e) {
      addToast('Failed to create webhook', 'error');
    }
  };

  const deleteWebhook = async (id: string) => {
    if (!window.confirm('Delete this webhook?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/servers/${serverId}/webhooks/${id}`, {
        method: 'DELETE',
        headers: {}
      });
      if (!res.ok) throw new Error('Failed');
      addToast('Webhook deleted', 'success');
      fetchWebhooks();
    } catch (e) {
      addToast('Failed to delete webhook', 'error');
    }
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token).then(() => addToast('Token copied', 'success'));
  };

  if (loading) return <p style={{ color: 'var(--ash)' }}>Loading...</p>;

  return (
    <div>
      <h3 style={{ color: 'var(--ghost-white)', fontFamily: 'Cinzel Decorative', marginBottom: '16px' }}>WEBHOOKS</h3>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Webhook name..." className="angular-input" style={{ flex: 1, minWidth: '120px' }} />
        <input value={channelId} onChange={(e) => setChannelId(e.target.value)} placeholder="Channel ID" className="angular-input" style={{ width: '120px' }} />
        <button className="angular-button primary" onClick={createWebhook} style={{ padding: '6px 14px', fontSize: '12px' }}>CREATE</button>
      </div>
      {webhooks.map((wh) => (
        <div key={wh.id} className="vox-setting-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 80px', gap: '12px', alignItems: 'center' }}>
          <span style={{ color: 'var(--ghost-white)' }}>{wh.name}</span>
          <code style={{ color: 'var(--ash)', fontSize: '11px', fontFamily: 'Share Tech Mono' }}>{wh.token.slice(0, 20)}...</code>
          <button className="angular-button" onClick={() => copyToken(wh.token)} style={{ padding: '4px 10px', fontSize: '11px', background: 'var(--obsidian)', color: 'var(--ash)' }}>COPY</button>
          <button className="angular-button" onClick={() => deleteWebhook(wh.id)} style={{ padding: '4px 10px', fontSize: '11px', background: 'var(--crimson)', color: 'white' }}>DELETE</button>
        </div>
      ))}
    </div>
  );
};

export default WebhookPanel;
