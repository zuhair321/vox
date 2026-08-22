import React, { useEffect, useState } from 'react';
import { useStickerStore } from '../../stores/stickerStore';
import { Search, X } from 'lucide-react';

interface StickerPickerProps {
  onSelect: (stickerUrl: string) => void;
  onClose: () => void;
  serverId?: string;
}

const StickerPicker: React.FC<StickerPickerProps> = ({ onSelect, onClose, serverId }) => {
  const { globalStickers, serverStickers, searchResults, isLoading, fetchGlobalStickers, fetchServerStickers, search, clearSearch } = useStickerStore();
  const [query, setQuery] = useState('');
  
  useEffect(() => {
    fetchGlobalStickers();
    if (serverId) fetchServerStickers(serverId);
  }, [serverId]);
  
  useEffect(() => {
    if (query) search(query, serverId);
    else clearSearch();
  }, [query]);
  
  const stickers = query ? searchResults : [...serverStickers, ...globalStickers];
  
  return (
    <div style={{
      position: 'absolute', bottom: '100%', right: 0, marginBottom: '8px',
      width: '340px', background: 'var(--bg-elevated, #1c1a20)',
      border: '1px solid var(--border-hairline, #2a2730)', borderRadius: '8px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 100,
      display: 'flex', flexDirection: 'column', maxHeight: '400px',
    }}>
      {/* Header */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-hairline, #2a2730)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--shadow)' }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stickers..."
            style={{
              width: '100%', background: 'var(--obsidian)', border: '1px solid var(--border-hairline, #2a2730)',
              borderRadius: '4px', padding: '6px 8px 6px 28px', color: 'var(--ghost-white)', fontSize: '12px', outline: 'none',
            }}
          />
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ash)', padding: '4px' }}>
          <X size={14} />
        </button>
      </div>
      
      {/* Sticker Grid */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
        {isLoading && <div style={{ textAlign: 'center', color: 'var(--shadow)', padding: '16px' }}>Loading...</div>}
        {!isLoading && stickers.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--shadow)', padding: '24px', fontSize: '12px' }}>
            {query ? 'No stickers found' : 'No stickers available'}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
          {stickers.map((sticker) => (
            <button
              key={sticker.id}
              onClick={() => { onSelect(sticker.assetUrl); onClose(); }}
              style={{
                background: 'var(--obsidian)', border: '1px solid transparent',
                borderRadius: '4px', padding: '8px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'border-color 0.15s, transform 0.15s',
                aspectRatio: '1',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--chaos)';
                (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
              }}
              title={sticker.name}
            >
              <img src={sticker.assetUrl} alt={sticker.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </button>
          ))}
        </div>
      </div>
      
      {/* Footer */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-hairline, #2a2730)', fontSize: '10px', color: 'var(--shadow)', textAlign: 'center' }}>
        {stickers.length} stickers
      </div>
    </div>
  );
};

export default StickerPicker;
