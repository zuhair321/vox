import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '../../api/client';

function resolveUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

function formatDuration(seconds?: number) {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '0:00';
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

// Deterministic pseudo-random bar heights so each voice note has a stable,
// unique-looking waveform (no layout shift between renders).
function buildWaveform(seed: string, count = 48): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    const r = ((h >>> 0) % 1000) / 1000;
    // Blend a primary "voice" envelope with randomness for a natural look.
    const envelope = 0.35 + 0.65 * Math.sin((i / count) * Math.PI * (1.5 + (h % 3)));
    bars.push(Math.max(0.12, Math.min(1, envelope * (0.5 + r * 0.7))));
  }
  return bars;
}

interface VoiceNotePlayerProps {
  url: string;
  name?: string;
  duration?: number;
}

const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({ url, name, duration }) => {
  const fullUrl = resolveUrl(url);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(duration || 0);
  const [loading, setLoading] = useState(false);

  const bars = useMemo(() => buildWaveform(fullUrl), [fullUrl]);

  const progress = total > 0 ? Math.min(1, current / total) : 0;

  const stopRaf = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrent(audio.currentTime);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      setLoading(true);
      audio.play().then(() => {
        setLoading(false);
        setPlaying(true);
        stopRaf();
        rafRef.current = requestAnimationFrame(tick);
      }).catch(() => {
        setLoading(false);
        setPlaying(false);
      });
    } else {
      audio.pause();
      setPlaying(false);
      stopRaf();
    }
  }, [tick, stopRaf]);

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const el = e.currentTarget;
    if (!audio || !total) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * total;
    setCurrent(audio.currentTime);
  }, [total]);

  const handleDownload = useCallback(() => {
    const a = document.createElement('a');
    a.href = fullUrl;
    a.download = name || 'voice-note.webm';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [fullUrl, name]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setTotal(audio.duration);
      }
    };
    const onEnded = () => {
      setPlaying(false);
      setCurrent(0);
      stopRaf();
    };
    const onPause = () => { setPlaying(false); stopRaf(); };
    const onPlay = () => { setPlaying(true); };

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('durationchange', onLoaded);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('play', onPlay);
    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('durationchange', onLoaded);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('play', onPlay);
      stopRaf();
    };
  }, [stopRaf]);

  return (
    <div
      className="vox-voice-note"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginTop: '6px',
        padding: '10px 14px',
        width: 'min(420px, 100%)',
        background: 'linear-gradient(135deg, var(--obsidian), var(--dark-matter))',
        border: '1px solid var(--rim)',
        borderRadius: '6px',
        clipPath: 'var(--cut-corner-tr)',
        boxShadow: playing
          ? '0 0 18px var(--chaos-glow), inset 0 0 12px rgba(216,74,90,0.06)'
          : '0 2px 10px rgba(0,0,0,0.35)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Glow sweep while playing */}
      <AnimatePresence>
        {playing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at 12% 50%, rgba(216,74,90,0.14), transparent 60%)',
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>

      {/* Play / pause button */}
      <motion.button
        type="button"
        onClick={togglePlay}
        whileTap={{ scale: 0.88 }}
        whileHover={{ scale: 1.06 }}
        aria-label={playing ? 'Pause voice note' : 'Play voice note'}
        title={playing ? 'Pause' : 'Play'}
        style={{
          flexShrink: 0,
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '1px solid var(--chaos)',
          background: playing
            ? 'var(--chaos)'
            : 'linear-gradient(135deg, var(--void-purple), var(--crimson))',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: playing ? '0 0 14px var(--chaos-glow)' : '0 0 8px rgba(216,74,90,0.25)',
          position: 'relative',
        }}
      >
        {loading ? (
          <span
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.35)',
              borderTopColor: '#fff',
              display: 'inline-block',
              animation: 'vox-spin 0.7s linear infinite',
            }}
          />
        ) : playing ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
            <rect x="3" y="2" width="3.5" height="12" rx="1" />
            <rect x="9.5" y="2" width="3.5" height="12" rx="1" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
            <path d="M4 2.5v11a.5.5 0 0 0 .77.42l8.5-5.5a.5.5 0 0 0 0-.84l-8.5-5.5A.5.5 0 0 0 4 2.5z" />
          </svg>
        )}
        {/* Pulsing ring while playing */}
        {playing && (
          <motion.span
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.8, opacity: 0 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '1px solid var(--chaos)',
              pointerEvents: 'none',
            }}
          />
        )}
      </motion.button>

      {/* Waveform + meta */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <div
          className="vox-voice-wave"
          onClick={seek}
          role="slider"
          aria-label="Seek voice note"
          aria-valuemin={0}
          aria-valuemax={Math.round(total || 0)}
          aria-valuenow={Math.round(current)}
          tabIndex={0}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            height: '34px',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          {bars.map((h, i) => {
            const filled = i / bars.length <= progress;
            return (
              <motion.span
                key={i}
                initial={false}
                animate={
                  playing && filled
                    ? { scaleY: [h, Math.min(1, h + 0.25), h], opacity: 1 }
                    : { scaleY: h, opacity: filled ? 1 : 0.32 }
                }
                transition={
                  playing && filled
                    ? { duration: 0.5 + (i % 5) * 0.08, repeat: Infinity, ease: 'easeInOut', delay: (i % 7) * 0.03 }
                    : { duration: 0.2 }
                }
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: '100%',
                  borderRadius: '2px',
                  transformOrigin: 'center',
                  background: filled
                    ? 'linear-gradient(180deg, var(--chaos), var(--crimson))'
                    : 'var(--rim)',
                  boxShadow: filled && playing ? '0 0 6px var(--chaos-glow)' : 'none',
                }}
              />
            );
          })}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: '11px',
            color: 'var(--ash)',
          }}
        >
          <span style={{ letterSpacing: '0.04em' }}>
            {playing || current > 0 ? formatDuration(current) : formatDuration(total)}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', opacity: 0.8 }}>
            <span style={{ fontSize: '11px' }}>🎤</span>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Voice
            </span>
          </span>
        </div>
      </div>

      {/* Download */}
      <motion.button
        type="button"
        onClick={handleDownload}
        title={`Download ${name || 'voice note'}`}
        aria-label={`Download ${name || 'voice note'}`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        style={{
          flexShrink: 0,
          background: 'var(--void)',
          border: '1px solid var(--rim)',
          color: 'var(--ghost-white)',
          width: '30px',
          height: '30px',
          borderRadius: '5px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '13px',
        }}
      >
        ⬇
      </motion.button>

      <audio
        ref={audioRef}
        src={fullUrl}
        preload="metadata"
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default VoiceNotePlayer;
