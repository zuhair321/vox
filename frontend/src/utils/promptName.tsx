// Electron-compatible replacement for window.prompt (which is NOT implemented
// in Electron's renderer — it always returns null). Mounts a tiny in-app modal
// and resolves with the typed value, null on cancel.
import React from 'react';
import { createRoot } from 'react-dom/client';

export function promptName(title: string, initial: string = ''): Promise<string | null> {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    host.style.position = 'fixed';
    host.style.zIndex = '9999';
    document.body.appendChild(host);
    const root = createRoot(host);

    const close = (value: string | null) => {
      root.unmount();
      host.remove();
      resolve(value);
    };

    const Modal: React.FC = () => {
      const [val, setVal] = React.useState(initial);
      return (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) close(null); }}
        >
          <div
            style={{
              background: 'var(--obsidian, #14161a)', border: '1px solid var(--rim, #2a2d34)',
              borderRadius: '8px', padding: '20px', width: '320px', maxWidth: '90vw',
              boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: 'var(--ghost-white, #e7edf5)', fontFamily: "'Cinzel', serif" }}>
              {title}
            </h3>
            <input
              autoFocus
              value={val}
              onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') close(val.trim() === '' ? null : val);
                if (e.key === 'Escape') close(null);
              }}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                background: 'var(--void, #0b0d11)', border: '1px solid var(--rim, #2a2d34)',
                borderRadius: '4px', color: 'var(--ghost-white, #e7edf5)', fontSize: '13px', outline: 'none',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
              <button
                onClick={() => close(null)}
                style={{ padding: '6px 14px', background: 'transparent', border: '1px solid var(--rim, #2a2d34)', borderRadius: '4px', color: 'var(--ash, #9aa3b2)', cursor: 'pointer', fontSize: '12px' }}
              >
                Cancel
              </button>
              <button
                onClick={() => close(val.trim() === '' ? null : val)}
                disabled={val.trim() === ''}
                style={{ padding: '6px 14px', background: 'var(--chaos, #d84a5a)', border: 'none', borderRadius: '4px', color: '#fff', cursor: val.trim() === '' ? 'not-allowed' : 'pointer', fontSize: '12px', opacity: val.trim() === '' ? 0.5 : 1 }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      );
    };

    root.render(<Modal />);
  });
}
