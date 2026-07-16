import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchStickers, type Sticker } from '../../api/stickers';

interface Props {
  open: boolean;
  serverId?: string;
  onClose: () => void;
  onSelect: (sticker: Sticker) => void;
}

const StickerPicker: React.FC<Props> = ({ open, serverId, onClose, onSelect }) => {
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchStickers(serverId)
      .then((d) => setStickers(d.stickers || []))
      .catch(() => setStickers([]))
      .finally(() => setLoading(false));
  }, [open, serverId]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.12 }}
        style={{
          position: 'absolute',
          bottom: '100%',
          right: '8px',
          marginBottom: '8px',
          width: '300px',
          maxHeight: '280px',
          overflowY: 'auto',
          background: 'var(--dark-matter)',
          border: '1px solid var(--rim)',
          borderRadius: '8px',
          padding: '12px',
          zIndex: 1000,
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--shadow)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Stickers</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--ash)', cursor: 'pointer', fontSize: '14px' }}>×</button>
        </div>
        {loading ? (
          <p style={{ color: 'var(--shadow)', fontSize: '12px', textAlign: 'center', padding: '16px' }}>Loading…</p>
        ) : stickers.length === 0 ? (
          <p style={{ color: 'var(--shadow)', fontSize: '12px', textAlign: 'center', padding: '16px' }}>
            No stickers yet. Admins can add them in Server Settings → Stickers.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {stickers.map((s) => (
              <button
                key={s.id}
                type="button"
                title={s.name}
                onClick={() => { onSelect(s); onClose(); }}
                style={{
                  background: 'var(--obsidian)',
                  border: '1px solid var(--rim)',
                  borderRadius: '6px',
                  padding: '4px',
                  cursor: 'pointer',
                  aspectRatio: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img src={s.url} alt={s.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default StickerPicker;
