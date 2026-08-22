import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Plus, Trash2, Key, Send } from 'lucide-react';
import { listBots, addBot, removeBot } from '../../api/bots';

interface Props { serverId: string; }

const BotsPanel: React.FC<Props> = ({ serverId }) => {
  const [bots, setBots] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [color, setColor] = useState('#9B824F');
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => listBots(serverId).then(setBots).catch(() => {});

  useEffect(() => { refresh(); }, [serverId]);

  const submit = async () => {
    if (!/^[a-z0-9_-]{2,24}$/.test(name)) { setError('Name must match [a-z0-9_-].'); return; }
    setBusy(true); setError(null);
    try {
      const j = await addBot(serverId, { name, displayName, color });
      setToken(j.token);
      setName(''); setDisplayName('');
      refresh();
    } catch (e: any) {
      setError(e?.message || 'Failed to add bot.');
    } finally { setBusy(false); }
  };

  return (
    <div style={{ padding: 20, maxWidth: 900 }}>
      <h2 style={{ fontFamily: 'var(--serif)', color: 'var(--gold)', letterSpacing: '0.06em', marginBottom: 8 }}>BOTS</h2>
      <p style={{ color: 'var(--shadow)', fontSize: 13, marginBottom: 16 }}>
        VOX bots are real accounts that authenticate with a long-lived token (sent as <code>X-Bot-Token</code>).
        They can post messages, react, and join voice. Save the token — it's shown only once.
      </p>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          type="text"
          value={name}
          placeholder="bot-name"
          onChange={(e) => setName(e.target.value.replace(/[^a-z0-9_-]/gi, '').toLowerCase())}
          style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--rim)', background: 'transparent', color: 'var(--ghost-white)', width: 160 }}
        />
        <input
          type="text"
          value={displayName}
          placeholder="Display name"
          onChange={(e) => setDisplayName(e.target.value)}
          style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid var(--rim)', background: 'transparent', color: 'var(--ghost-white)', width: 180 }}
        />
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          style={{ width: 40, height: 36, padding: 0, border: '1px solid var(--rim)', borderRadius: 6, background: 'transparent' }}
          title="Bot accent color"
        />
        <button
          onClick={submit}
          disabled={busy || !name}
          style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: 'var(--gold)', color: '#0E0E12', fontWeight: 600, cursor: busy || !name ? 'not-allowed' : 'pointer', opacity: busy || !name ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={14} /> {busy ? 'Adding…' : 'Add bot'}
        </button>
      </div>

      {error && <div style={{ color: 'var(--electric)', fontSize: 13, marginBottom: 8 }}>{error}</div>}

      {token && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ padding: 12, borderRadius: 6, background: 'rgba(155,130,79,0.10)', border: '1px solid var(--gold)', marginBottom: 16, fontSize: 12 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--gold)', marginBottom: 6 }}>
            <Key size={14} /> Save this token immediately — it's shown only once.
          </div>
          <code style={{ display: 'block', wordBreak: 'break-all', color: 'var(--ghost-white)', background: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 4 }}>
            {token}
          </code>
          <div style={{ marginTop: 6, fontFamily: 'monospace', fontSize: 11, color: 'var(--shadow)' }}>
            Example:&nbsp;
            <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: 3 }}>
              curl -H &quot;X-Bot-Token: {token.slice(0,16)}…&quot; -d '{"{ channelId, body }"}' /api/bots/&lt;botId&gt;/post
            </code>
          </div>
        </motion.div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {bots.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: 24, textAlign: 'center', color: 'var(--shadow)', fontSize: 13 }}>
            No bots in this server yet.
          </div>
        )}
        {bots.map((b) => (
          <div key={b.id} style={{ padding: 14, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--rim)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: b.color || 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={18} color="#0E0E12" />
              </div>
              <div>
                <div style={{ color: 'var(--ghost-white)', fontWeight: 600 }}>{b.displayName}</div>
                <div style={{ color: 'var(--shadow)', fontSize: 11 }}>@{b.username}</div>
              </div>
              <button
                onClick={async () => { try { await removeBot(serverId, b.id); refresh(); } catch (_) {} }}
                style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--shadow)', cursor: 'pointer' }}
                title="Remove bot from server"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BotsPanel;
