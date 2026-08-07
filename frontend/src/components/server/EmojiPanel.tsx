import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../api/client';
import { useUiStore } from '../../stores/uiStore';

interface Props { serverId: string; }

const EmojiPanel: React.FC<Props> = ({ serverId }) => {
  const { addToast } = useUiStore();
  const [emojis, setEmojis] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const token = (() => { try { return localStorage.getItem('vox_token'); } catch { return null; } })();

  const fetchEmojis = () => {
    fetch(`${API_BASE}/api/servers/${serverId}/emojis`, { headers: {} })
      .then((r) => r.json())
      .then((data) => { setEmojis(data.emojis || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchEmojis(); }, [serverId]);

  const createEmoji = async () => {
    if (!name.trim() || !url.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/servers/${serverId}/emojis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), url: url.trim() })
      });
      if (!res.ok) throw new Error('Failed');
      addToast('Emoji added', 'success');
      setName('');
      setUrl('');
      fetchEmojis();
    } catch (e) {
      addToast('Failed to add emoji', 'error');
    }
  };

  const deleteEmoji = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/servers/${serverId}/emojis/${id}`, {
        method: 'DELETE',
        headers: {}
      });
      if (!res.ok) throw new Error('Failed');
      addToast('Emoji deleted', 'success');
      fetchEmojis();
    } catch (e) {
      addToast('Failed to delete emoji', 'error');
    }
  };

  if (loading) return <p style={{ color: 'var(--ash)' }}>Loading...</p>;

  return (
    <div>
      <h3 style={{ color: 'var(--ghost-white)', fontFamily: 'Cinzel Decorative', marginBottom: '16px' }}>CUSTOM EMOJI</h3>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder=":name:" className="angular-input" style={{ width: '100px' }} />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Image URL" className="angular-input" style={{ flex: 1, minWidth: '150px' }} />
        <button className="angular-button primary" onClick={createEmoji} style={{ padding: '6px 14px', fontSize: '12px' }}>ADD</button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        {emojis.map((emoji) => (
          <div key={emoji.id} style={{ textAlign: 'center', position: 'relative' }}>
            <img src={emoji.url} alt={emoji.name} style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
            <span style={{ display: 'block', color: 'var(--ash)', fontSize: '11px', fontFamily: 'Share Tech Mono' }}>:{emoji.name}:</span>
            <button className="angular-button" onClick={() => deleteEmoji(emoji.id)} style={{ padding: '2px 6px', fontSize: '10px', background: 'var(--crimson)', color: 'white', marginTop: '4px' }}>DELETE</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmojiPanel;
