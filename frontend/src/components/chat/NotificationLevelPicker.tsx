import React, { useEffect, useState, useRef } from 'react';
import { Bell, BellOff, AtSign, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { putNotificationLevel, getNotifications } from '../../api/notifications';

type Level = 'ALL' | 'MENTIONS' | 'NOTHING' | 'DEFAULT';

const LABELS = {
  ALL: 'All messages',
  MENTIONS: 'Only @mentions',
  NOTHING: 'Nothing (muted)',
  DEFAULT: 'Server default',
};

interface Props {
  serverId: string | null | undefined;
  channelId: string | null | undefined;
  className?: string;
}

const NotificationLevelPicker: React.FC<Props> = ({ serverId, channelId, className }) => {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<Level>('DEFAULT');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!serverId && !channelId) return;
    let alive = true;
    getNotifications()
      .then((j) => {
        if (!alive) return;
        const mutes = (j && j.mutes) || [];
        let chosen: Level = 'DEFAULT';
        const chMatch = mutes.find((m: any) => m.channelId && m.channelId === channelId);
        const svMatch = mutes.find((m: any) => m.serverId && m.serverId === serverId && !m.channelId);
        if (chMatch) chosen = (chMatch.level as Level);
        else if (svMatch) chosen = (svMatch.level as Level);
        setLevel(chosen);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [serverId, channelId]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const set = async (l: Level) => {
    setLevel(l);
    setOpen(false);
    try {
      await putNotificationLevel({ serverId: serverId || undefined, channelId: channelId || undefined, level: l });
    } catch (err) {
      console.warn('[notif] save failed', err);
    }
  };

  const Icon = level === 'NOTHING' ? BellOff : level === 'ALL' ? Bell : AtSign;
  const tint = level === 'NOTHING' ? 'var(--shadow)' : 'var(--gold)';

  return (
    <div ref={ref} className={'vox-notif-picker ' + (className || '')} style={{ position: 'relative' }}>
      <button
        type="button"
        className="vox-notif-trigger"
        onClick={() => setOpen((v) => !v)}
        title={'Channel notifications: ' + LABELS[level]}
        aria-label="Channel notifications"
        style={{
          background: 'transparent',
          border: 'none',
          color: tint,
          padding: '6px',
          cursor: 'pointer',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Icon size={18} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="vox-notif-menu"
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              zIndex: 200,
              minWidth: '220px',
              background: 'rgba(20,20,24,0.98)',
              border: '1px solid var(--rim)',
              borderRadius: '8px',
              padding: '6px',
              boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ padding: '8px 12px 4px', fontSize: 11, color: 'var(--shadow)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Notify me about
            </div>
            {(['ALL', 'MENTIONS', 'NOTHING', 'DEFAULT'] as Level[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => set(l)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '8px 12px',
                  background: level === l ? 'rgba(155,130,79,0.16)' : 'transparent',
                  color: 'var(--ghost-white)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: 13,
                  textAlign: 'left',
                }}
              >
                <span style={{ flex: 1 }}>{LABELS[l]}</span>
                {level === l && <Check size={14} color="var(--gold)" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationLevelPicker;
