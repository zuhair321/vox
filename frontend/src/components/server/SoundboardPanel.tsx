import React, { useState, useEffect, useRef } from 'react';
import { fetchSounds, createServerSound, deleteSound, Sound } from '../../api/soundboard';
import { uploadSound } from '../../api/uploads';
import { useUiStore } from '../../stores/uiStore';

interface Props { serverId: string; }

const SoundboardPanel: React.FC<Props> = ({ serverId }) => {
  const { addToast } = useUiStore();
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [volume, setVolume] = useState(1);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const load = () => {
    fetchSounds(serverId)
      .then((d) => setSounds((d.sounds || []).filter((s) => s.serverId === serverId)))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [serverId]);

  const create = async () => {
    if (!name.trim() || !url.trim()) return;
    try {
      await createServerSound(serverId, name.trim(), url.trim(), volume);
      addToast('Sound added', 'success');
      setName(''); setUrl(''); setVolume(1);
      load();
    } catch (e: any) {
      addToast(e?.message || 'Failed to add sound', 'error');
    }
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!name.trim()) { addToast('Enter a sound name first.', 'error'); return; }
    setUploading(true);
    try {
      const data = await uploadSound(file);
      await createServerSound(serverId, name.trim(), data.url, volume);
      addToast('Sound uploaded', 'success');
      setName(''); setUrl(''); setVolume(1);
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
      await deleteSound(id);
      addToast('Sound deleted', 'success');
      load();
    } catch (e: any) {
      addToast(e?.message || 'Failed to delete sound', 'error');
    }
  };

  const play = (s: Sound) => {
    try {
      if (audioRef.current) { audioRef.current.pause(); }
      const a = new Audio(s.url);
      a.volume = Math.max(0, Math.min(1, s.volume ?? 1));
      audioRef.current = a;
      a.play().catch(() => addToast('Could not play sound', 'error'));
    } catch {
      addToast('Could not play sound', 'error');
    }
  };

  if (loading) return <p style={{ color: 'var(--ash)' }}>Loading...</p>;

  return (
    <div>
      <h3 style={{ color: 'var(--ghost-white)', fontFamily: 'Cinzel Decorative', marginBottom: '16px' }}>SOUNDBOARD</h3>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sound name" className="angular-input" style={{ width: '140px' }} />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Audio URL (MP3/OGG)" className="angular-input" style={{ flex: 1, minWidth: '150px' }} />
        <label style={{ color: 'var(--ash)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          VOL
          <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
        </label>
        <button className="angular-button primary" onClick={create} style={{ padding: '6px 14px', fontSize: '12px' }}>ADD</button>
        <label className="angular-button" style={{ padding: '6px 14px', fontSize: '12px', cursor: 'pointer' }}>
          {uploading ? 'UPLOADING...' : 'UPLOAD FILE'}
          <input type="file" accept="audio/*" onChange={onUpload} style={{ display: 'none' }} />
        </label>
      </div>
      {sounds.length === 0 ? (
        <p style={{ color: 'var(--shadow)', fontSize: '12px' }}>No sounds yet. Add one above.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
          {sounds.map((s) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', border: '1px solid var(--rim)', background: 'var(--obsidian)' }}>
              <button className="angular-button" onClick={() => play(s)} style={{ padding: '4px 10px', fontSize: '12px' }}>▶ PLAY</button>
              <span style={{ color: 'var(--ghost-white)', fontFamily: 'Share Tech Mono', flex: 1 }}>{s.name}</span>
              <span style={{ color: 'var(--shadow)', fontSize: '11px' }}>{Math.round((s.volume ?? 1) * 100)}%</span>
              <button className="angular-button" onClick={() => remove(s.id)} style={{ padding: '2px 8px', fontSize: '10px', background: 'var(--crimson)', color: 'white' }}>DELETE</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SoundboardPanel;
