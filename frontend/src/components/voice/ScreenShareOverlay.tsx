import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceStore } from '../../stores/voiceStore';
import { useSocketStore } from '../../stores/socketStore';

// ScreenShareOverlay — renders a floating panel with any active screen shares
// (local preview + remote streams). The panel mounts itself only when at least
// one stream is active, so users in a normal voice call won't see anything.
//
// Layout:
//   - Fixed top-right, large enough to be useful, dark themed to match VOX.
//   - Header strip: title (e.g. "Screen share") + minimize/maximize + close.
//   - Body: each stream is a <video> card labelled with the sharer's name.
//   - When multiple sharers are active, they stack vertically.
//   - When minimized, collapse to a single floating button in the corner that
//     re-opens the panel on click.
//
// Each <video> element is mounted once per stream and reuses the same DOM
// node across re-renders, so srcObject stays attached and the browser keeps
// decoding frames without a flicker.

type Position = { x: number; y: number };

const PANEL_DEFAULT_WIDTH = 640;
const PANEL_DEFAULT_HEIGHT = 360;
const PANEL_MIN_WIDTH = 320;
const PANEL_MIN_HEIGHT = 180;
const PANEL_MARGIN = 16;

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

// ── "Now Watching Together" reaction particles ─────────────────────────────────
interface Reaction {
  id: string;
  emoji: string;
  x: number; // 0-100% position
  y: number; // 0-100% position
}

// Rate-limit: one reaction per user per 400ms.
const RATE_LIMIT_MS = 400;
let lastReactionTime = 0;

const REACTION_EMOJIS = ['😂', '🔥', '❤️', '👏', '😮', '🎉', '👀', '💀'];
// ─────────────────────────────────────────────────────────────────────────────

const ScreenShareOverlay: React.FC = () => {
  const voice = useVoiceStore();
  const socket = useSocketStore();
  const [minimized, setMinimized] = useState(false);
  const [cinematic, setCinematic] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const [size, setSize] = useState({ width: PANEL_DEFAULT_WIDTH, height: PANEL_DEFAULT_HEIGHT });
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const dragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);

  // Socket listener: receive reactions from other watchers.
  useEffect(() => {
    if (!socket.socket) return;
    const handler = ({ emoji, x, y }: { emoji: string; x: number; y: number }) => {
      const id = `${Date.now()}-${Math.random()}`;
      setReactions(prev => [...prev, { id, emoji, x, y }]);
      // Auto-remove after 1.5s.
      setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 1500);
    };
    socket.socket.on('screen:reaction', handler);
    return () => { socket.socket?.off('screen:reaction', handler); };
  }, [socket.socket]);

  // Emit a reaction when the user taps over the screen area.
  const handleScreenTap = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    if (now - lastReactionTime < RATE_LIMIT_MS) return;
    lastReactionTime = now;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const emoji = REACTION_EMOJIS[Math.floor(Math.random() * REACTION_EMOJIS.length)];

    // Emit to server.
    if (socket.socket && voice.channelId) {
      socket.socket.emit('screen:reaction', { emoji, x, y, channelId: voice.channelId });
    }

    // Add locally with a unique id.
    const id = `${now}-local`;
    setReactions(prev => [...prev, { id, emoji, x, y }]);
    setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 1500);
  }, [socket.socket, voice.channelId]);

  const remoteStreams = Array.from(voice.remoteScreenStreams.entries());
  const hasRemote = remoteStreams.length > 0;
  const hasLocal = !!voice.localScreenStream;
  const visible = hasRemote || hasLocal;

  // Build a quick lookup of socketId → username for labelling remote streams.
  const usernameBySocketId = new Map<string, string>();
  for (const u of voice.voiceUsers) {
    usernameBySocketId.set(u.socketId, u.username);
  }

  // First-fit initial position so the panel hugs the top-right corner.
  useEffect(() => {
    if (position || !visible) return;
    const w = typeof window !== 'undefined' ? window.innerWidth : PANEL_DEFAULT_WIDTH + PANEL_MARGIN;
    setPosition({
      x: Math.max(PANEL_MARGIN, w - PANEL_DEFAULT_WIDTH - PANEL_MARGIN),
      y: PANEL_MARGIN,
    });
  }, [visible, position]);

  // Keep the panel on-screen if the window resizes.
  useEffect(() => {
    if (!visible) return;
    const onResize = () => {
      setPosition((cur) => {
        if (!cur) return cur;
        const maxX = window.innerWidth - Math.min(size.width, window.innerWidth - PANEL_MARGIN * 2) - PANEL_MARGIN;
        const maxY = window.innerHeight - Math.min(size.height, window.innerHeight - PANEL_MARGIN * 2) - PANEL_MARGIN;
        return {
          x: clamp(cur.x, PANEL_MARGIN, Math.max(PANEL_MARGIN, maxX)),
          y: clamp(cur.y, PANEL_MARGIN, Math.max(PANEL_MARGIN, maxY)),
        };
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [visible, size.width, size.height]);

  const beginDrag = (e: React.PointerEvent) => {
    if (!position) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      offsetX: e.clientX - position.x,
      offsetY: e.clientY - position.y,
    };
  };

  const onDrag = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const maxX = window.innerWidth - Math.min(size.width, window.innerWidth - PANEL_MARGIN * 2) - PANEL_MARGIN;
    const maxY = window.innerHeight - Math.min(size.height, window.innerHeight - PANEL_MARGIN * 2) - PANEL_MARGIN;
    setPosition({
      x: clamp(e.clientX - dragRef.current.offsetX, PANEL_MARGIN, Math.max(PANEL_MARGIN, maxX)),
      y: clamp(e.clientY - dragRef.current.offsetY, PANEL_MARGIN, Math.max(PANEL_MARGIN, maxY)),
    });
  };

  const endDrag = (e: React.PointerEvent) => {
    dragRef.current = null;
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
  };

  const stopLocalShare = () => {
    // Reuse the same handler that the toolbar button uses: stop tracks on the
    // dedicated screen stream, notify peers, and reset local state.
    voice.localScreenStream?.getTracks().forEach((t) => t.stop());
    voice.setLocalScreenStream(null);
    voice.setScreenSharing(false);
    // Import dynamically to avoid a circular import on cold render paths.
    import('../../stores/socketStore').then(({ useSocketStore }) => {
      useSocketStore.getState().socket?.emit('voice:screen', { screen: false });
    });
  };

  if (!visible) return null;

  // Minimized: a single floating pill in the corner with a count badge.
  if (minimized) {
    const label = hasLocal && hasRemote
      ? `${remoteStreams.length + 1} screen shares`
      : hasLocal
        ? 'You are sharing'
        : `${remoteStreams.length} screen share${remoteStreams.length === 1 ? '' : 's'}`;
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        title={label}
        style={{
          position: 'fixed',
          top: PANEL_MARGIN,
          right: PANEL_MARGIN,
          zIndex: 9999,
          background: 'var(--abyss)',
          border: '1px solid var(--toxic)',
          color: 'var(--ghost-white)',
          padding: '8px 14px',
          borderRadius: '999px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5), 0 0 12px var(--toxic-glow)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          fontWeight: 600,
          fontFamily: "'Share Tech Mono', monospace",
        }}
      >
        <span style={{ color: 'var(--toxic)' }}>🖥️</span>
        <span>{label}</span>
      </button>
    );
  }

  const left = position?.x ?? PANEL_MARGIN;
  const top = position?.y ?? PANEL_MARGIN;

  return (
    <div
      role="dialog"
      aria-label="Screen share"
      style={{
        position: 'fixed',
        left,
        top,
        width: cinematic ? '100vw' : size.width,
        height: cinematic ? '100vh' : size.height,
        maxWidth: '100vw',
        maxHeight: '100vh',
        zIndex: cinematic ? 99999 : 9999,
        background: cinematic ? '#000' : 'var(--abyss)',
        border: cinematic ? 'none' : '1px solid var(--rim)',
        borderRadius: cinematic ? 0 : '8px',
        boxShadow: cinematic ? 'none' : '0 12px 48px rgba(0,0,0,0.65), 0 0 24px var(--chaos-glow)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        resize: cinematic ? 'none' : 'both',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Header — hidden in cinematic mode */}
      {!cinematic && (
      <div
        onPointerDown={beginDrag}
        onPointerMove={onDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          background: 'var(--void)',
          borderBottom: '1px solid var(--rim)',
          cursor: 'grab',
          userSelect: 'none',
        }}
      >
        <span style={{ color: 'var(--toxic)', fontSize: '14px' }}>🖥️</span>
        <span style={{
          color: 'var(--ghost-white)',
          fontSize: '12px',
          fontWeight: 700,
          fontFamily: "'Share Tech Mono', monospace",
          letterSpacing: '0.05em',
        }}>
          SCREEN SHARE
        </span>
        <span style={{
          color: 'var(--ash)',
          fontSize: '11px',
          marginLeft: '4px',
        }}>
          {hasRemote && hasLocal
            ? `${remoteStreams.length + 1} active`
            : hasRemote
              ? `${remoteStreams.length} active`
              : 'You are sharing'}
        </span>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Cinematic mode toggle */}
          <button
            type="button"
            onClick={() => setCinematic(v => !v)}
            title={cinematic ? 'Exit premiere mode' : 'Premiere mode'}
            style={{
              border: 'none',
              background: cinematic ? 'rgba(217,201,141,0.15)' : 'transparent',
              color: cinematic ? '#d9c98d' : 'var(--ash)',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: 600,
              fontFamily: "'Share Tech Mono', monospace",
              letterSpacing: '0.05em',
            }}
          >
            🎬 PREMIERE
          </button>
          {hasLocal && (
            <button
              type="button"
              onClick={stopLocalShare}
              title="Stop sharing"
              style={{
                border: 'none',
                background: 'var(--blood)',
                color: 'white',
                padding: '4px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
                fontFamily: "'Share Tech Mono', monospace",
              }}
            >
              STOP
            </button>
          )}
          {/* PiP button */}
          {document.pictureInPictureEnabled && (
            <button
              type="button"
              onClick={async () => {
                try {
                  const videoEl = document.querySelector('[data-screen-video]') as HTMLVideoElement || document.querySelector('video') as HTMLVideoElement;
                  if (videoEl && !document.pictureInPictureElement) {
                    await videoEl.requestPictureInPicture();
                  } else if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                  }
                } catch (err) {
                }
              }}
              title="Picture-in-Picture"
              aria-label="Toggle Picture-in-Picture"
              style={{
                width: '24px',
                height: '24px',
                border: 'none',
                background: 'transparent',
                color: 'var(--ghost-white)',
                cursor: 'pointer',
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
              }}
            >
              📺
            </button>
          )}
          <button
            type="button"
            onClick={() => setMinimized(true)}
            title="Minimize"
            aria-label="Minimize screen share panel"
            style={{
              width: '24px',
              height: '24px',
              border: 'none',
              background: 'transparent',
              color: 'var(--ghost-white)',
              cursor: 'pointer',
              borderRadius: '4px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
            }}
          >
            –
          </button>
        </div>
      </div>
      )}

      {/* Body — one or more video cards stacked vertically. */}
      <div
        onClick={handleScreenTap}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: cinematic ? 0 : '8px',
          padding: cinematic ? 0 : '8px',
          background: 'black',
          position: 'relative',
        }}
      >
        {/* Letterbox bars for cinematic mode */}
        {cinematic && (
          <>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '60px', background: 'linear-gradient(180deg, var(--void), transparent)', zIndex: 5, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px', background: 'linear-gradient(0deg, var(--void), transparent)', zIndex: 5, pointerEvents: 'none' }} />
          </>
        )}
        {hasLocal && (
          <VideoCard
            label="You"
            sublabel="Local preview"
            stream={voice.localScreenStream}
            muted
          />
        )}
        {remoteStreams.map(([socketId, stream]) => {
          const username = usernameBySocketId.get(socketId);
          return (
            <VideoCard
              key={socketId}
              label={username || 'Screen'}
              sublabel={username ? 'Sharing screen' : ''}
              stream={stream}
            />
          );
        })}
        {/* Floating emoji reactions from all watchers. */}
        <AnimatePresence>
          {reactions.map((r) => (
            <motion.span
              key={r.id}
              initial={{ opacity: 0, scale: 0.5, y: 0, x: `${r.x}%` }}
              animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.2, 1], y: -40 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                left: `${r.x}%`,
                bottom: '20%',
                fontSize: '28px',
                pointerEvents: 'none',
                zIndex: 10,
                lineHeight: 1,
              }}
            >
              {r.emoji}
            </motion.span>
          ))}
        </AnimatePresence>
        {/* Tap hint — shown when no reactions are active. */}
        {reactions.length === 0 && (
          <div style={{
            position: 'absolute',
            bottom: '8px',
            right: '12px',
            fontSize: '10px',
            color: 'rgba(255,255,255,0.25)',
            fontFamily: "'Share Tech Mono', monospace",
            pointerEvents: 'none',
            letterSpacing: '0.05em',
          }}>
            TAP TO REACT
          </div>
        )}
      </div>
    </div>
  );
};

interface VideoCardProps {
  label: string;
  sublabel?: string;
  stream: MediaStream | null;
  muted?: boolean;
}

const VideoCard: React.FC<VideoCardProps> = ({ label, sublabel, stream, muted }) => {
  const videoRef = useCallback((el: HTMLVideoElement | null) => {
    if (!el || !stream) return;
    el.srcObject = stream;
    el.play().catch(() => {});
  }, [stream]);

  return (
    <div
      style={{
        position: 'relative',
        flex: 1,
        minHeight: '200px',
        background: 'black',
        borderRadius: '6px',
        overflow: 'hidden',
        border: '1px solid var(--rim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={!!muted}
        controls={false}
        data-screen-video
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          background: 'black',
        }}
      />
      {/* Floating label badge — top-left of the card. */}
      <div
        style={{
          position: 'absolute',
          top: '8px',
          left: '8px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(12, 9, 11, 0.85)',
          border: '1px solid var(--toxic)',
          borderRadius: '4px',
          padding: '4px 8px',
          color: 'var(--ghost-white)',
          fontSize: '11px',
          fontFamily: "'Share Tech Mono', monospace",
          fontWeight: 600,
          pointerEvents: 'none',
        }}
      >
        <span style={{ color: 'var(--toxic)' }}>●</span>
        <span>{label}</span>
        {sublabel && (
          <span style={{ color: 'var(--ash)', fontWeight: 400, marginLeft: '4px' }}>
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
};

export default ScreenShareOverlay;