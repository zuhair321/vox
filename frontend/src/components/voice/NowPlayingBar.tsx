import React, { useEffect, useRef, useState } from 'react';
import { Music, Play, Pause, SkipForward, Volume2, Link as LinkIcon, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceStore } from '../../stores/voiceStore';

// NowPlayingBar: queues audio URLs and plays them in the voice channel via the
// local mic track. This is the music-bot primitive — the host user pastes
// YouTube/SoundCloud/direct audio URLs, the bar replaces the mic capture with
// an HTMLAudioElement-fed MediaStream so everyone in the channel hears it.
const NowPlayingBar: React.FC = () => {
  const [queue, setQueue] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.6);
  const [current, setCurrent] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const voiceStore = useVoiceStore();

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      if (audioRef.current) audioRef.current.crossOrigin = 'anonymous';
    }
    return () => {
      if (audioRef.current) {
        if (audioRef.current) audioRef.current.pause();
        if (audioRef.current) audioRef.current.src = '';
      }
    };
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const addTrack = (): void => {
    const url = input.trim();
    if (!url) return;
    setQueue((q) => [...q, url]);
    setInput('');
    if (!current) playNext([url, ...queue]);
  };

  const playNext = (q?: string[]) => {
    const trackQ = q || queue;
    if (!trackQ.length) { setCurrent(null); setIsPlaying(false); return; }
    if (!audioRef.current) return;
    const head = trackQ[0];
    const rest = trackQ.slice(1);
    audioRef.current.src = head;
    audioRef.current.play().then(() => {
      setCurrent(head);
      setIsPlaying(true);
      setQueue(rest);
      // When this track ends, play the next from `rest`.
      if (audioRef.current) audioRef.current.onended = () => playNext(rest);
    }).catch((err) => {
      console.warn('[now-playing] play failed', err);
      playNext(rest);
    });
  };

  const toggle = () => {
    if (!audioRef.current || !current) {
      if (queue.length) playNext();
      return;
    }
    if (isPlaying) {
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const skip = () => playNext();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'fixed',
        bottom: 80,
        right: 24,
        background: 'rgba(20,20,24,0.92)',
        border: '1px solid var(--rim)',
        borderRadius: 10,
        padding: 12,
        minWidth: 280,
        maxWidth: 360,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        zIndex: 95,
        backdropFilter: 'blur(8px)',
      }}
    >
      <Music size={16} color="var(--gold)" />
      <input
        type="text"
        placeholder="audio URL…"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') addTrack(); }}
        style={{ flex: 1, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--rim)', background: 'transparent', color: 'var(--ghost-white)', fontSize: 12 }}
      />
      <button
        onClick={addTrack}
        disabled={!input.trim()}
        title="Add to queue"
        style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--shadow)', cursor: 'pointer' }}
      >
        <Plus size={14} />
      </button>
      <button
        onClick={toggle}
        title={isPlaying ? 'Pause' : 'Play'}
        style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--gold)', cursor: 'pointer' }}
      >
        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <button
        onClick={skip}
        disabled={!queue.length}
        title="Skip"
        style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--shadow)', cursor: 'pointer', opacity: queue.length ? 1 : 0.4 }}
      >
        <SkipForward size={14} />
      </button>
      <VolSlider volume={volume} setVolume={setVolume} />
      {current && <span style={{ position: 'absolute', bottom: -18, left: 12, fontSize: 10, color: 'var(--shadow)' }}>playing: {current.slice(0, 32)}{current.length > 32 ? '…' : ''} · queue {queue.length}</span>}
    </motion.div>
  );
};

const VolSlider: React.FC<{ volume: number; setVolume: (v: number) => void }> = ({ volume, setVolume }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
    <Volume2 size={12} color="var(--shadow)" />
    <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVolume(Number(e.target.value))} style={{ width: 60 }} />
  </div>
);

export default NowPlayingBar;
