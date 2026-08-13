import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Cloud, Server, HardDrive, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';
import { testReachability } from '../../api/client';

type Mode = 'cloud' | 'custom' | 'local';

interface Props {
  onSelected: (cfg: { mode: string; apiBase: string }) => void;
}

const Welcome: React.FC<Props> = ({ onSelected }) => {
  const api: any = (window as any).electronAPI;
  const [url, setUrl] = useState('https://api.voxchat.app');
  const [testing, setTesting] = useState(false);
  const [probe, setProbe] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Mode>('cloud');

  async function commit() {
    setError(null);
    const apiBase = (picked === 'local') ? 'http://127.0.0.1:4000' : url.trim().replace(/\/$/, '');
    try {
      const res = await api?.voxConfig?.set?.({ mode: picked === 'local' ? 'local' : 'client', apiBase });
      if (res && res.ok) {
        onSelected(res.config || { mode: 'client', apiBase });
      } else {
        setError(res?.reason || 'Could not save configuration.');
      }
    } catch (e: any) {
      setError(e?.message || 'Unexpected error.');
    }
  }

  async function probeNow() {
    if (picked === 'local') {
      setProbe({ ok: true, info: { name: 'Personal VOX server', allowRegistration: true }, latencyMs: 0 });
      return;
    }
    setTesting(true); setError(null); setProbe(null);
    try {
      const r = await testReachability(url);
      setProbe(r);
      if (!r.ok) setError(r.reason ? (`Server unreachable: ${r.reason}`) : 'Server unreachable.');
    } catch (e: any) {
      setError(e?.message || 'Probe failed');
    } finally {
      setTesting(false);
    }
  }

  const cardBase: React.CSSProperties = {
    background: 'rgba(20,18,32,0.7)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 14, padding: '20px 22px', color: '#e6e8ef', cursor: 'pointer',
    transition: 'border-color 180ms ease, transform 180ms ease',
  };
  const cardSelected: React.CSSProperties = {
    ...cardBase, borderColor: '#d7a94a', boxShadow: '0 0 0 1px #d7a94a inset, 0 6px 30px rgba(215,169,74,0.15)',
  };

  return (
    <AnimatePresence>
      <motion.div
        key="welcome"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'radial-gradient(ellipse 120% 80% at 50% -20%, #1a1626 0%, #0a0810 70%, #04030a 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px', backdropFilter: 'blur(8px)',
        }}
      >
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
          style={{
            width: 'min(720px, 100%)',
            background: 'linear-gradient(180deg, rgba(40,32,55,0.85), rgba(20,15,30,0.85))',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '36px 36px 28px',
            boxShadow: '0 30px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <ShieldCheck size={22} color="#d7a94a" />
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: '#f0e6d2', letterSpacing: 0.3 }}>Choose how to connect</h1>
          </div>
          <p style={{ margin: 0, color: '#a39cb5', fontSize: 14, lineHeight: 1.55 }}>
            VOX can talk to a hosted VOX instance over HTTPS, to a self-hosted server you run
            yourself, or run entirely on your own machine with a bundled backend. Pick the option
            that fits.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 22 }}>
            <motion.div whileHover={{ y: -2 }} onClick={() => setPicked('cloud')} style={picked === 'cloud' ? cardSelected : cardBase}>
              <Cloud size={20} color={picked === 'cloud' ? '#d7a94a' : '#a39cb5'} />
              <div style={{ fontWeight: 600, marginTop: 8, color: '#ece5d6' }}>VOX Cloud</div>
              <div style={{ fontSize: 12, color: '#a39cb5', marginTop: 4 }}>Hosted by VOX. Just sign in.</div>
            </motion.div>
            <motion.div whileHover={{ y: -2 }} onClick={() => setPicked('custom')} style={picked === 'custom' ? cardSelected : cardBase}>
              <Server size={20} color={picked === 'custom' ? '#d7a94a' : '#a39cb5'} />
              <div style={{ fontWeight: 600, marginTop: 8, color: '#ece5d6' }}>Self-hosted</div>
              <div style={{ fontSize: 12, color: '#a39cb5', marginTop: 4 }}>Your own VOX server URL.</div>
            </motion.div>
            <motion.div whileHover={{ y: -2 }} onClick={() => setPicked('local')} style={picked === 'local' ? cardSelected : cardBase}>
              <HardDrive size={20} color={picked === 'local' ? '#d7a94a' : '#a39cb5'} />
              <div style={{ fontWeight: 600, marginTop: 8, color: '#ece5d6' }}>Personal server</div>
              <div style={{ fontSize: 12, color: '#a39cb5', marginTop: 4 }}>Bundled backend + database on this machine.</div>
            </motion.div>
          </div>

          {picked === 'custom' && (
            <div style={{ marginTop: 18 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#a39cb5', marginBottom: 6, letterSpacing: 0.4 }}>SERVER URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://vox.yourdomain.com"
                style={{
                  width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, padding: '10px 12px', color: '#ece5d6', fontFamily: 'inherit', fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>
          )}

          <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={probeNow}
              disabled={testing}
              style={{
                background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
                color: '#a39cb5', padding: '8px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {testing ? <Loader2 size={14} className="spin" /> : null}
              Test connection
            </button>
            {probe && probe.ok && (
              <span style={{ fontSize: 12, color: '#58a06b' }}>
                ✓ reachable{typeof probe.latencyMs === 'number' ? ` (${probe.latencyMs} ms)` : ''}{probe.info?.name ? ` — ${probe.info.name}` : ''}
              </span>
            )}
            {error && <span style={{ fontSize: 12, color: '#c0523e' }}>{error}</span>}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 26 }}>
            <div style={{ fontSize: 12, color: '#5d6f6b' }}>
              You can change this any time from <code style={{ color: '#a8c3bb' }}>Settings → Server</code>.
            </div>
            <button
              type="button"
              onClick={commit}
              style={{
                background: 'linear-gradient(135deg,#8a6a2a,#d7a94a)',
                border: 'none', color: '#1a1408', padding: '10px 18px', borderRadius: 10,
                fontWeight: 600, fontSize: 13.5, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: '0 6px 20px rgba(215,169,74,0.25)',
              }}
            >
              Continue <ArrowRight size={15} />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Welcome;
