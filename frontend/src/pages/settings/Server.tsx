import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Cloud, Server, HardDrive, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { testReachability } from '../../api/client';

const ServerSettings: React.FC = () => {
  const nav = useNavigate();
  const api: any = (window as any).electronAPI;
  const [cfg, setCfg] = useState<any>(null);
  const [url, setUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [probe, setProbe] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  useEffect(() => {
    let off: any;
    (async () => {
      try {
        const next = api?.voxConfig?.get ? await api.voxConfig.get() : null;
        setCfg(next);
        setUrl(next?.apiBase || '');
        setLastSeen(next?.lastSeenReachable || null);
        if (next?.mode === 'client' && next?.apiBase) {
          const p = await testReachability(next.apiBase);
          setProbe(p);
        }
      } catch (e: any) {
        setError(e?.message || 'Could not load settings.');
      }
      off = api?.voxConfig?.onChanged ? api.voxConfig.onChanged((c: any) => { setCfg(c); setUrl(c.apiBase || ''); setLastSeen(c.lastSeenReachable || null); }) : undefined;
    })();
    return () => { try { off && off(); } catch { /* ignore */ } };
  }, []);

  async function test() {
    setTesting(true); setError(null); setProbe(null);
    try {
      const r = await testReachability(url);
      setProbe(r);
      if (!r.ok) setError(r.reason || 'unreachable');
    } catch (e: any) {
      setError(e?.message || 'probe failed');
    } finally {
      setTesting(false);
    }
  }

  async function save() {
    setSaving(true); setError(null);
    try {
      const r = await api.voxConfig.set({ apiBase: url, mode: cfg?.mode || 'client' });
      if (r.ok) setCfg(r.config);
      else setError(r.reason || 'save failed');
    } catch (e: any) {
      setError(e?.message || 'save error');
    } finally {
      setSaving(false);
    }
  }

  async function switchMode(newMode: 'client' | 'local') {
    setSaving(true); setError(null);
    try {
      const r = await api.voxConfig.set({ mode: newMode, apiBase: newMode === 'local' ? 'http://127.0.0.1:4000' : url });
      if (r.ok) { setCfg(r.config); if (newMode === 'local') nav(0); /* force reboot */ }
      else setError(r.reason || 'switch failed');
    } catch (e: any) {
      setError(e?.message || 'switch error');
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    setSaving(true);
    try {
      const r = await api.voxConfig.reset();
      if (r.ok) { setCfg(r.config); setUrl(r.config.apiBase); }
    } finally { setSaving(false); }
  }

  return (
    <div className="server-settings">
      <header className="settings-main-header">
        <button type="button" onClick={() => nav('/settings')} aria-label="Back"><ArrowLeft size={22} /></button>
        <h1>SERVER</h1>
      </header>

      <div style={{ padding: '16px 24px 60px', maxWidth: 720 }}>
        <div style={{
          background: 'rgba(20,18,32,0.7)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 14, padding: '18px 20px', marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#a39cb5', fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' }}>
            <Cloud size={14} /> CURRENT
          </div>
          <div style={{ marginTop: 8, fontSize: 18, color: '#f0e6d2' }}>
            {cfg?.mode === 'local' ? 'Personal server (bundled backend on this machine)' : (cfg?.apiBase || '—')}
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: '#a39cb5' }}>
            Mode: <code style={{ background: 'rgba(0,0,0,0.4)', padding: '1px 6px', borderRadius: 4 }}>{cfg?.mode || 'unset'}</code>
            {lastSeen ? <> · last reachable {new Date(lastSeen).toLocaleString()}</> : null}
          </div>
        </div>

        <div style={{
          background: 'rgba(20,18,32,0.7)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 14, padding: '18px 20px', marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#a39cb5', fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' }}>
            <Server size={14} /> SERVER URL
          </div>
          <input
            type="url" value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.voxchat.app"
            style={{
              width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '10px 12px', color: '#ece5d6', fontFamily: 'inherit', fontSize: 14, marginTop: 8,
              outline: 'none',
            }}
            disabled={cfg?.mode === 'local'}
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
            <button onClick={test} disabled={testing || !url} style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: '#a39cb5',
              padding: '8px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <RefreshCw size={14} className={testing ? 'spin' : ''} /> Test
            </button>
            <button onClick={save} disabled={saving || !url} style={{
              background: 'linear-gradient(135deg,#8a6a2a,#d7a94a)', border: 'none', color: '#1a1408',
              padding: '8px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 12,
            }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            {probe?.ok && <span style={{ color: '#58a06b', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={14} /> reachable{probe.latencyMs != null ? ` · ${probe.latencyMs}ms` : ''}</span>}
            {error && <span style={{ color: '#c0523e', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={14} /> {error}</span>}
          </div>
        </div>

        <div style={{
          background: 'rgba(20,18,32,0.7)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 14, padding: '18px 20px', marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#a39cb5', fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' }}>
            <HardDrive size={14} /> MODE
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
            <button onClick={() => cfg?.mode !== 'client' && switchMode('client')} disabled={saving} style={{
              padding: '12px 14px', borderRadius: 10, textAlign: 'left',
              background: cfg?.mode === 'client' ? 'rgba(215,169,74,0.1)' : 'rgba(0,0,0,0.25)',
              border: cfg?.mode === 'client' ? '1px solid #d7a94a' : '1px solid rgba(255,255,255,0.08)',
              color: cfg?.mode === 'client' ? '#f0e6d2' : '#a39cb5', cursor: 'pointer',
            }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Connect to a server</div>
              <div style={{ fontSize: 11, color: '#7e758c', marginTop: 2 }}>Cloud or self-hosted URL. No bundled backend.</div>
            </button>
            <button onClick={() => cfg?.mode !== 'local' && switchMode('local')} disabled={saving} style={{
              padding: '12px 14px', borderRadius: 10, textAlign: 'left',
              background: cfg?.mode === 'local' ? 'rgba(215,169,74,0.1)' : 'rgba(0,0,0,0.25)',
              border: cfg?.mode === 'local' ? '1px solid #d7a94a' : '1px solid rgba(255,255,255,0.08)',
              color: cfg?.mode === 'local' ? '#f0e6d2' : '#a39cb5', cursor: 'pointer',
            }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Personal server</div>
              <div style={{ fontSize: 11, color: '#7e758c', marginTop: 2 }}>Run VOX + Postgres on this machine. App will restart.</div>
            </button>
          </div>
        </div>

        <div style={{
          background: 'rgba(20,18,32,0.7)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 14, padding: '14px 20px',
        }}>
          <button onClick={reset} disabled={saving} style={{
            background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#e6e8ef',
            padding: '8px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
          }}>
            Reset to defaults (will show Welcome again)
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServerSettings;
