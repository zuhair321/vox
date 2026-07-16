import React, { useState, useEffect } from 'react';
import { fetchStickers, createServerSticker, deleteSticker, Sticker } from '../../api/stickers';
import { uploadSticker } from '../../api/uploads';
import { useUiStore } from '../../stores/uiStore';

interface Props { serverId: string; }

const StickerPanel: React.FC<Props> = ({ serverId }) => {
  const { addToast } = useUiStore();
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = () => {
    fetchStickers(serverId)
      .then((d) => setStickers((d.stickers || []).filter((s) => s.serverId === serverId)))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [serverId]);

  const create = async () => {
    if (!name.trim() || !url.trim()) return;
    try {
      await createServerSticker(serverId, name.trim(), url.trim());
      addToast('Sticker added', 'success');
      setName(''); setUrl('');
      load();
    } catch (e: any) {
      addToast(e?.message || 'Failed to add sticker', 'error');
    }
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!name.trim()) { addToast('Enter a sticker name first.', 'error'); return; }
    setUploading(true);
    try {
      const data = await uploadSticker(file);
      await createServerSticker(serverId, name.trim(), data.url);
      addToast('Sticker uploaded', 'success');
      setName(''); setUrl('');
      load();
    } catch (err: any) {
      addToast(err?.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteSticker(id);
      addToast('Sticker deleted', 'success');
      load();
    } catch (e: any) {
      addToast(e?.message || 'Failed to delete sticker', 'error');
    }
  };

  if (loading) return <p style={{ color: 'var(--ash)' }}>Loading...</p>;

  return (
    <div>
      <h3 style={{ color: 'var(--ghost-white)', fontFamily: 'Cinzel Decorative', marginBottom: '16px' }}>STICKERS</h3>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sticker name" className="angular-input" style={{ width: '140px' }} />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Image URL (PNG/GIF)" className="angular-input" style={{ flex: 1, minWidth: '150px' }} />
        <button className="angular-button primary" onClick={create} style={{ padding: '6px 14px', fontSize: '12px' }}>ADD</button>
        <label className="angular-button" style={{ padding: '6px 14px', fontSize: '12px', cursor: 'pointer' }}>
          {uploading ? 'UPLOADING...' : 'UPLOAD FILE'}
          <input type="file" accept="image/*" onChange={onUpload} style={{ display: 'none' }} />
        </label>
      </div>
      {stickers.length === 0 ? (
        <p style={{ color: 'var(--shadow)', fontSize: '12px' }}>No stickers yet. Add one above.</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
          {stickers.map((s) => (
            <div key={s.id} style={{ textAlign: 'center', position: 'relative', width: '96px' }}>
              <img src={s.url} alt={s.name} style={{ width: '96px', height: '96px', objectFit: 'contain' }} />
              <span style={{ display: 'block', color: 'var(--ash)', fontSize: '11px', fontFamily: 'Share Tech Mono' }}>{s.name}</span>
              <button className="angular-button" onClick={() => remove(s.id)} style={{ padding: '2px 6px', fontSize: '10px', background: 'var(--crimson)', color: 'white', marginTop: '4px' }}>DELETE</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StickerPanel;
