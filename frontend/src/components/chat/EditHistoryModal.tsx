import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, X, ArrowLeft, ArrowRight } from 'lucide-react';
import { fetchMessageHistory } from '../../api/messages';

interface Props {
  messageId: string | null;
  onClose: () => void;
}

const EditHistoryModal: React.FC<Props> = ({ messageId, onClose }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!messageId) return;
    fetchMessageHistory(messageId).then((h) => {
      setHistory(h);
      setIdx(Math.max(0, h.length - 1)); // jump to current (last)
    }).catch(() => setHistory([]));
  }, [messageId]);

  return (
    <AnimatePresence>
      {messageId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 250,
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 6 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 6 }}
            transition={{ duration: 0.16 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(20,20,24,0.98)', borderRadius: 12, border: '1px solid var(--rim)',
              padding: 20, minWidth: 360, maxWidth: 600, maxHeight: '70vh', overflow: 'auto',
              boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
              <History size={18} color="var(--gold)" />
              <div style={{ marginLeft: 10, fontFamily: 'var(--serif)', color: 'var(--gold)', letterSpacing: '0.06em', fontSize: 14 }}>EDIT HISTORY</div>
              <button onClick={onClose} aria-label="Close edit history" style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--shadow)', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
            {history.length === 0 && (
              <div style={{ padding: 16, color: 'var(--shadow)', fontSize: 13 }}>No edits recorded for this message.</div>
            )}
            {history.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <button
                    onClick={() => setIdx((i) => Math.max(0, i - 1))}
                    disabled={idx === 0}
                    style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', color: idx === 0 ? 'var(--shadow)' : 'var(--gold)', cursor: idx === 0 ? 'not-allowed' : 'pointer' }}
                  ><ArrowLeft size={14} /></button>
                  <span style={{ fontSize: 11, color: 'var(--shadow)' }}>
                    Revision {history.length - idx} of {history.length} · {idx === history.length - 1 ? 'current' : 'older'}
                  </span>
                  <button
                    onClick={() => setIdx((i) => Math.min(history.length - 1, i + 1))}
                    disabled={idx === history.length - 1}
                    style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', color: idx === history.length - 1 ? 'var(--shadow)' : 'var(--gold)', cursor: idx === history.length - 1 ? 'not-allowed' : 'pointer' }}
                  ><ArrowRight size={14} /></button>
                </div>
                <div style={{ padding: 12, borderRadius: 6, border: '1px solid var(--rim)', background: 'rgba(255,255,255,0.03)', marginBottom: 8 }}>
                  <div style={{ whiteSpace: 'pre-wrap', color: 'var(--ghost-white)', fontSize: 14 }}>{history[idx]?.body || ''}</div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--shadow)' }}>
                  {history[idx]?.editedAt ? new Date(history[idx].editedAt).toLocaleString() : '—'}
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EditHistoryModal;
