import React, { useState, useEffect, useRef } from 'react';
import { useUiStore } from '../../stores/uiStore';

interface GifResult {
  id: string;
  url: string;
  preview: string;
  title: string;
}

const TENOR_API_KEY = ''; // Set in settings
const TENOR_BASE = 'https://g.tenor.com/v1';

const GifPicker: React.FC<{ onSelect: (url: string) => void }> = ({ onSelect }) => {
  const { showEmojiPicker, setShowEmojiPicker } = useUiStore();
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showEmojiPicker) return;
    setQuery('');
    setGifs([]);
    inputRef.current?.focus();
  }, [showEmojiPicker]);

  const searchGifs = async (q: string) => {
    if (!q.trim() || !TENOR_API_KEY) return;
    setLoading(true);
    try {
      const res = await fetch(`${TENOR_BASE}/search?key=${TENOR_API_KEY}&q=${encodeURIComponent(q)}&limit=20`);
      const data = await res.json();
      setGifs(data.results?.map((r: any) => ({
        id: r.id,
        url: r.media?.[0]?.gif?.url,
        preview: r.media?.[0]?.gif?.preview,
        title: r.title || 'GIF',
      })) || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') searchGifs(query);
    if (e.key === 'Escape') setShowEmojiPicker(false);
  };

  if (!showEmojiPicker) return null;

  return (
    <div style={{ position: 'fixed', bottom: 72, left: '50%', transform: 'translateX(-50%)', width: 480, maxHeight: 400, background: 'var(--dark-matter)', border: '1px solid var(--rim)', borderRadius: 8, zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 12, borderBottom: '1px solid var(--rim)', display: 'flex', gap: 8 }}>
        <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKey} placeholder="Search GIFs..." className="angular-input" style={{ flex: 1 }} />
        <button className="angular-button primary" onClick={() => searchGifs(query)} aria-label="Search GIFs" style={{ padding: '6px 12px', fontSize: 12 }}>SEARCH</button>
        <button className="angular-button" onClick={() => setShowEmojiPicker(false)} aria-label="Close GIF picker" style={{ padding: '6px 12px', fontSize: 12, background: 'var(--obsidian)' }}>✕</button>
      </div>
      <div style={{ overflowY: 'auto', padding: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {loading && <p style={{ color: 'var(--ash)', gridColumn: '1 / -1', textAlign: 'center' }}>Loading...</p>}
        {!TENOR_API_KEY && <p style={{ color: 'var(--shadow)', gridColumn: '1 / -1', textAlign: 'center' }}>Set Tenor API key in settings</p>}
        {gifs.map(gif => (
          <button key={gif.id} onClick={() => { onSelect(gif.url); setShowEmojiPicker(false); }} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', borderRadius: 4, overflow: 'hidden' }}>
            <img src={gif.preview || gif.url} alt={gif.title} loading="lazy" style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />
          </button>
        ))}
      </div>
    </div>
  );
};

export default GifPicker;