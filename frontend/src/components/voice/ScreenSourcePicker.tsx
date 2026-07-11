import React, { useCallback, useEffect, useState } from 'react';

interface Source {
  id: string;
  name: string;
  thumbnail: string;
}

const ScreenSourcePicker: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const api = window.electronAPI?.screenCapture;
    if (!api) return;

    const openPicker = async () => {
      setOpen(true);
      setLoading(true);
      try {
        const list = await api.getSources();
        setSources(list);
      } catch {
        setSources([]);
      } finally {
        setLoading(false);
      }
    };

    const off = api.onRequest(openPicker);
    return off;
  }, []);

  const choose = useCallback(async (sourceId: string) => {
    const api = window.electronAPI?.screenCapture;
    if (!api) return;
    setOpen(false);
    setLoading(true);
    try {
      await api.select(sourceId);
    } catch (err) {
      console.error('[screen-picker]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const cancel = useCallback(async () => {
    const api = window.electronAPI?.screenCapture;
    if (!api) return;
    setOpen(false);
    try {
      await api.cancel();
    } catch {}
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') cancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, cancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100000,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) cancel(); }}
    >
      <div
        style={{
          background: '#0a0a0d',
          border: '1px solid #2a2a38',
          borderRadius: '10px',
          padding: '24px',
          width: 'min(800px, 92vw)',
          maxHeight: '80vh',
          boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
          fontFamily: "'Share Tech Mono', monospace",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 16px', color: '#f4f7fb', fontSize: '16px', fontWeight: 700 }}>
          Share a screen or window
        </h2>

        {loading && <div style={{ color: '#8c95a3', padding: '40px 0', textAlign: 'center', fontSize: '13px' }}>Loading sources...</div>}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '12px',
          maxHeight: '55vh',
          overflowY: 'auto',
          padding: '4px',
        }}>
          {sources.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => choose(s.id)}
              style={{
                background: '#161620',
                border: '1px solid #2a2a38',
                borderRadius: '6px',
                padding: '8px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                textAlign: 'left',
                color: '#f4f7fb',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#8fcf9b'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#2a2a38'; }}
            >
              <div style={{
                width: '100%',
                height: '140px',
                background: '#000',
                borderRadius: '4px',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <img src={s.thumbnail} alt={s.name} draggable={false}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.name}
              </div>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button type="button" onClick={cancel}
            style={{
              background: '#d84a5a', color: 'white', border: 'none',
              padding: '8px 20px', borderRadius: '4px', cursor: 'pointer',
              fontSize: '12px', fontWeight: 700, fontFamily: "'Share Tech Mono', monospace",
            }}>
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScreenSourcePicker;
