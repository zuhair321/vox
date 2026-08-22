import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Trash2, Star, Image as ImgIcon } from 'lucide-react';
import { fetchServerEmojis, uploadCustomEmoji, deleteServerEmoji } from '../../api/emojiUpload';

interface Props { serverId: string; }

const CustomEmojiUploadPanel: React.FC<Props> = ({ serverId }) => {
  const [emojis, setEmojis] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    fetchServerEmojis(serverId).then(setEmojis).catch(() => {});
  }, [serverId]);

  useEffect(() => { refresh(); }, [refresh]);

  const onPickFile = (f: File | null) => {
    setFile(f);
    setError(null);
    if (!f) { setPreview(null); return; }
    const url = URL.createObjectURL(f);
    setPreview(url);
  };

  const submit = async () => {
    if (!file) { setError('Pick a file first.'); return; }
    if (!/^[a-z0-9_-]{2,32}$/.test(name)) { setError('Name must be 2-32 chars: [a-z0-9_-].'); return; }
    setBusy(true); setError(null);
    try {
      await uploadCustomEmoji(serverId, name, file);
      setName(''); setFile(null); setPreview(null);
      await refresh();
    } catch (e: any) {
      setError(e?.message || 'Upload failed.');
    } finally { setBusy(false); }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '900px' }}>
      <h2 style={{ fontFamily: 'var(--serif)', color: 'var(--gold)', letterSpacing: '0.06em', marginBottom: 8 }}>CUSTOM EMOJI</h2>
      <p style={{ color: 'var(--shadow)', marginBottom: 16, fontSize: 13 }}>
        Upload up to 256 KB of image/webp (animated), image/gif (animated), image/png, or image/jpeg. Members will type <code>:name</code> to use it.
      </p>

      <div
        onDragEnter={(e) => { e.preventDefault(); setDrag(true); }}
        onDragOver={(e) => { e.preventDefault(); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0] || null;
          onPickFile(f);
        }}
        style={{
          padding: 24,
          borderRadius: 8,
          border: '1.5px dashed ' + (drag ? 'var(--gold)' : 'var(--rim)'),
          background: drag ? 'rgba(155,130,79,0.06)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 16,
          transition: 'border-color .15s, background .15s',
        }}
      >
        <input
          type="file"
          accept="image/webp,image/gif,image/png,image/jpeg"
          onChange={(e) => onPickFile(e.target.files?.[0] || null)}
          style={{ display: 'none' }}
          id="emoji-file-input"
        />
        <label htmlFor="emoji-file-input" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--gold)' }}>
          <Upload size={20} /> <span>Drag a file or click to choose</span>
        </label>
        <input
          type="text"
          value={name}
          placeholder="emoji-name"
          onChange={(e) => setName(e.target.value.replace(/[^a-z0-9_-]/gi, '').toLowerCase())}
          style={{ marginLeft: 'auto', width: 140, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--rim)', background: 'transparent', color: 'var(--ghost-white)' }}
        />
        <button
          disabled={busy || !file || !name}
          onClick={submit}
          style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: 'var(--gold)', color: '#0E0E12', fontWeight: 600, cursor: busy || !file || !name ? 'not-allowed' : 'pointer', opacity: busy || !file || !name ? 0.5 : 1 }}
        >
          {busy ? 'Uploading…' : 'Add emoji'}
        </button>
      </div>

      {error && <div style={{ color: 'var(--electric)', fontSize: 13, marginBottom: 8 }}>{error}</div>}

      {preview && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <img src={preview} alt="preview" style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'contain', background: 'rgba(255,255,255,0.04)', padding: 4 }} />
          <div style={{ fontSize: 12, color: 'var(--shadow)' }}>
            {file && (file.size / 1024).toFixed(1)} KB · {file?.type}
            <br />Will be saved as <code>:{name || '?'}</code>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 10 }}>
        {emojis.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: 24, color: 'var(--shadow)', textAlign: 'center', fontSize: 13 }}>
            No custom emoji yet. Upload one above.
          </div>
        )}
        {emojis.map((e) => (
          <motion.div
            key={e.id}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18 }}
            style={{ position: 'relative', padding: 8, textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 6, border: '1px solid var(--rim)' }}
            title={e.name}
          >
            <img src={e.url} alt={e.name} style={{ width: 36, height: 36, imageRendering: e.animated ? 'auto' : 'pixelated' }} />
            <div style={{ fontSize: 10, color: 'var(--shadow)', marginTop: 4 }}>:{e.name}</div>
            <button
              onClick={async () => { try { await deleteServerEmoji(serverId, e.id); refresh(); } catch (_) {} }}
              style={{ position: 'absolute', top: 2, right: 2, background: 'transparent', border: 'none', color: 'var(--shadow)', cursor: 'pointer', padding: 2 }}
              title="Delete"
            >
              <Trash2 size={12} />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default CustomEmojiUploadPanel;
