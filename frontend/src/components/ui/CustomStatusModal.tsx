import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfileStore } from '../../stores/profileStore';
import { useUiStore } from '../../stores/uiStore';
import { api } from '../../api/client';
import { setActivity, type ActivityType } from '../../api/activity';
import { EMOJI_MAP } from '../../utils/markdown';

const CLEAR_AFTER_OPTIONS = [
  { label: "Don't clear", value: '' },
  { label: '30 minutes', value: '30min' },
  { label: '1 hour', value: '1hour' },
  { label: '4 hours', value: '4hours' },
  { label: 'Today', value: 'today' },
  { label: 'This week', value: 'week' },
];

const ACTIVITY_TYPES: { label: string; value: ActivityType }[] = [
  { label: 'Playing', value: 'PLAYING' },
  { label: 'Listening to', value: 'LISTENING' },
  { label: 'Watching', value: 'WATCHING' },
  { label: 'Streaming', value: 'STREAMING' },
];

const QUICK_EMOJIS = ['💬', '🎮', '🎵', '📚', '💪', '🎯', '🔥', '💀', '☕', '🦇', '🔮', '⚡'];

const CustomStatusModal: React.FC = () => {
  const { showCustomStatus, setShowCustomStatus } = useUiStore();
  const { addToast } = useUiStore();
  const [emoji, setEmoji] = useState('💬');
  const [text, setText] = useState('');
  const [showEmojiGrid, setShowEmojiGrid] = useState(false);
  const [clearAfter, setClearAfter] = useState('');
  const [saving, setSaving] = useState(false);
  const [activityType, setActivityType] = useState<ActivityType>('PLAYING');
  const [activityName, setActivityName] = useState('');
  const [activityUrl, setActivityUrl] = useState('');

  if (!showCustomStatus) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await api('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ customStatus: text, statusEmoji: emoji }),
      });
      // Persist rich-presence activity (or clear it when name is empty).
      try {
        await setActivity(activityName.trim() ? { type: activityType, name: activityName.trim(), url: activityUrl.trim() || null } : null);
      } catch { /* non-fatal */ }
      // Update local profile store display
      addToast('⚡ Status updated.', 'success');
      setShowCustomStatus(false);
    } catch (e: any) {
      addToast(e?.message || 'Failed to set status.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {showCustomStatus && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.8)',
          }}
          onClick={() => setShowCustomStatus(false)}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="angular-cut-top-right"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '360px',
              background: 'var(--dark-matter)',
              border: '1px solid var(--rim)',
              padding: '28px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            }}
          >
            {/* Title */}
            <h2
              style={{
                fontFamily: "'Cinzel Decorative', serif",
                fontSize: '18px',
                color: 'var(--ghost-white)',
                marginBottom: '20px',
                letterSpacing: '0.1em',
              }}
            >
              SET CUSTOM STATUS
            </h2>

            {/* Emoji picker row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => setShowEmojiGrid((v) => !v)}
                style={{
                  fontSize: '28px',
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--obsidian)',
                  border: '1px solid var(--rim)',
                  cursor: 'pointer',
                }}
              >
                {emoji}
              </button>

              {/* Quick emoji row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {QUICK_EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    style={{
                      fontSize: '18px',
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: emoji === e ? 'var(--phantom)' : 'transparent',
                      border: emoji === e ? '1px solid var(--rim)' : 'none',
                      cursor: 'pointer',
                      borderRadius: 0,
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Status text */}
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '10px',
                  color: 'var(--shadow)',
                  marginBottom: '8px',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                }}
              >
                WHAT'S ON YOUR MIND?
              </label>
              <input
                type="text"
                className="angular-input"
                placeholder="Status text..."
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 128))}
                maxLength={128}
              />
              <div style={{ textAlign: 'right', fontSize: '10px', color: 'var(--shadow)', marginTop: '4px' }}>
                {text.length}/128
              </div>
            </div>

            {/* Clear after */}
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '10px',
                  color: 'var(--shadow)',
                  marginBottom: '8px',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                }}
              >
                CLEAR AFTER
              </label>
              <select
                className="angular-input"
                value={clearAfter}
                onChange={(e) => setClearAfter(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                {CLEAR_AFTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Activity / Rich Presence */}
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '10px',
                  color: 'var(--shadow)',
                  marginBottom: '8px',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                }}
              >
                ACTIVITY (RICH PRESENCE)
              </label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <select
                  className="angular-input"
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value as ActivityType)}
                  style={{ cursor: 'pointer', width: '130px' }}
                >
                  {ACTIVITY_TYPES.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  className="angular-input"
                  placeholder={activityType === 'LISTENING' ? 'Song / artist…' : activityType === 'WATCHING' ? 'Show / video…' : 'Game / app…'}
                  value={activityName}
                  onChange={(e) => setActivityName(e.target.value.slice(0, 128))}
                  maxLength={128}
                  style={{ flex: 1 }}
                />
              </div>
              {activityType === 'STREAMING' && (
                <input
                  type="text"
                  className="angular-input"
                  placeholder="Stream URL (optional)"
                  value={activityUrl}
                  onChange={(e) => setActivityUrl(e.target.value)}
                />
              )}
              <div style={{ fontSize: '10px', color: 'var(--shadow)', marginTop: '4px' }}>
                Leave the name empty to clear your activity.
              </div>
            </div>

            {/* Save button */}
            <button
              type="button"
              className="angular-button primary"
              onClick={handleSave}
              disabled={saving}
              style={{ width: '100%', padding: '12px', letterSpacing: '0.1em' }}
            >
              SET STATUS →
            </button>

            {/* Clear status link */}
            <div
              style={{
                textAlign: 'center',
                marginTop: '12px',
                fontSize: '12px',
                color: 'var(--shadow)',
                cursor: 'pointer',
              }}
              onClick={() => {
                setEmoji('💬');
                setText('');
                setShowCustomStatus(false);
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = 'var(--blood)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = 'var(--shadow)';
              }}
            >
              Clear Status
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CustomStatusModal;
