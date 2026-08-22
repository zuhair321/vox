import React from 'react';
import { motion } from 'framer-motion';
import { WifiOff, RefreshCw, Settings2 } from 'lucide-react';

interface Props {
  apiBase: string;
  onRetry: () => void | Promise<void>;
  onChangeServer: () => void | Promise<void>;
  retrying?: boolean;
  lastError?: string | null;
}

const OfflineScreen: React.FC<Props> = ({ apiBase, onRetry, onChangeServer, retrying, lastError }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(8,6,14,0.92)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        maxWidth: 460, padding: '32px 32px 28px', textAlign: 'center',
        background: 'linear-gradient(180deg, rgba(38,30,52,0.9), rgba(20,14,30,0.9))',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18,
        color: 'var(--text-primary)',
      }}>
        <WifiOff size={36} color="#c0523e" style={{ marginBottom: 12 }} />
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>Can’t reach your server</h2>
        <p style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: 13.5, lineHeight: 1.5 }}>
          VOX tried to connect to{' '}
          <code style={{ background: 'rgba(0,0,0,0.4)', padding: '2px 6px', borderRadius: 4, color: 'var(--gold)' }}>{apiBase}</code>{' '}
          but did not get an answer. {lastError ? <span style={{ color: 'var(--crimson)' }}>({lastError})</span> : null}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 22 }}>
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            style={{
              background: 'linear-gradient(135deg, var(--gold-dim), var(--gold))', border: 'none', color: 'var(--void)',
              padding: '10px 18px', borderRadius: 10, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <RefreshCw size={15} className={retrying ? 'spin' : ''} /> Try again
          </button>
          <button
            type="button"
            onClick={onChangeServer}
            style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
              color: 'var(--text-muted)', padding: '10px 18px', borderRadius: 10, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Settings2 size={15} /> Change server
          </button>
        </div>
        <p style={{ marginTop: 18, fontSize: 11, color: 'var(--text-faint)' }}>
          If this keeps happening, check your network or self-hosted server logs.
        </p>
      </div>
    </motion.div>
  );
};

export default OfflineScreen;
