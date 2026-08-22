import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchStageSpeakers, requestToSpeak, approveSpeaker, promoteStageMod, removeSpeaker, type StageSpeaker } from '../../api/stages';
import { useUiStore } from '../../stores/uiStore';
import { useSocketStore } from '../../stores/socketStore';
import { useServerStore } from '../../stores/serverStore';
import { useAuthStore } from '../../stores/authStore';
import { Mic, MicOff, Check, Shield, X, Hand } from 'lucide-react';

const STAGE_ROLES = ['FOUNDER', 'ADMIN', 'MODERATOR'];

const StagePanel: React.FC<{ channelId: string }> = ({ channelId }) => {
  const { addToast } = useUiStore();
  const socket = useSocketStore();
  const { selectedServer } = useServerStore();
  const myId = useAuthStore((s) => s.user?.id);

  const [speakers, setSpeakers] = useState<StageSpeaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const myMember = selectedServer?.members?.find((m) => m.userId === myId);
  const isMod = !!myMember && STAGE_ROLES.includes(myMember.role);

  const load = useCallback(async () => {
    try {
      const data = await fetchStageSpeakers(channelId);
      setSpeakers(data.speakers || []);
    } catch {
      // Stage is optional chrome — don't spam toasts on transient failures.
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    load();
  }, [load]);

  // Live updates when speakers change.
  useEffect(() => {
    if (!socket.socket) return;
    const handler = () => load();
    socket.socket.on('stage:speakers', handler);
    return () => {
      socket.socket?.off('stage:speakers', handler);
    };
  }, [socket.socket, load]);

  const act = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    try {
      await fn();
      if (okMsg) addToast(okMsg, 'success');
      await load();
    } catch {
      addToast('Stage action failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const mySpeaker = speakers.find((s) => s.userId === myId);
  const requested = speakers.filter((s) => s.status === 'REQUESTED');
  const speaking = speakers.filter((s) => s.status === 'SPEAKER' || s.status === 'MOD');

  const SpeakerRow = ({ s }: { s: StageSpeaker }) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        background: 'var(--dark-matter)',
        border: '1px solid var(--rim)',
        borderRadius: 8,
      }}
    >
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--obsidian)', border: '1px solid var(--rim)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--chaos)', fontWeight: 700, fontSize: 13 }}>
        {s.user?.avatarUrl ? <img src={s.user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (s.user?.displayName || s.user?.username || '?').charAt(0).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'var(--ghost-white)', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {s.user?.displayName || s.user?.username || 'Unknown'}
          {s.userId === myId && <span style={{ color: 'var(--shadow)', fontSize: 11, fontWeight: 400 }}> (you)</span>}
        </div>
        <div style={{ fontSize: 10, color: 'var(--shadow)', letterSpacing: '0.08em' }}>{s.status}</div>
      </div>
      {isMod && s.userId !== myId && s.status === 'REQUESTED' && (
        <button
          type="button"
          disabled={busy}
          onClick={() => act(() => approveSpeaker(channelId, s.userId), `${s.user?.displayName || s.user?.username} can now speak.`)}
          title="Approve to speak"
          style={{ padding: '5px 10px', background: 'rgba(74,194,82,0.12)', border: '1px solid rgba(74,194,82,0.4)', borderRadius: 4, color: 'var(--toxic)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <Check size={12} /> APPROVE
        </button>
      )}
      {isMod && s.userId !== myId && s.status === 'SPEAKER' && (
        <button
          type="button"
          disabled={busy}
          onClick={() => act(() => promoteStageMod(channelId, s.userId), 'Promoted to stage mod.')}
          title="Promote to stage moderator"
          style={{ padding: '5px 10px', background: 'transparent', border: '1px solid var(--rim)', borderRadius: 4, color: 'var(--ash)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <Shield size={12} /> MOD
        </button>
      )}
      {s.userId === myId && s.status === 'REQUESTED' && (
        <button
          type="button"
          disabled={busy}
          onClick={() => act(() => removeSpeaker(channelId, s.userId), 'Request withdrawn.')}
          title="Withdraw your request"
          style={{ padding: '5px 10px', background: 'transparent', border: '1px solid var(--rim)', borderRadius: 4, color: 'var(--ash)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <X size={12} /> CANCEL REQUEST
        </button>
      )}
      {(isMod || s.userId === myId) && s.status !== 'REQUESTED' && (
        <button
          type="button"
          disabled={busy}
          onClick={() => act(() => removeSpeaker(channelId, s.userId), 'Removed from stage.')}
          title={s.userId === myId ? 'Leave stage' : 'Remove from stage'}
          style={{ padding: '5px 10px', background: 'transparent', border: '1px solid var(--blood)', borderRadius: 4, color: 'var(--blood)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <X size={12} /> {s.userId === myId ? 'LEAVE' : 'REMOVE'}
        </button>
      )}
    </div>
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', maxWidth: 480, width: '100%', margin: '0 auto' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', padding: '28px 16px', background: 'var(--dark-matter)', border: '1px solid var(--rim)', borderRadius: 12 }}
        >
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎤</div>
          <div style={{ color: 'var(--ghost-white)', fontSize: 16, fontWeight: 700, fontFamily: "'Share Tech Mono', monospace" }}>
            {selectedServer?.channels?.find((c) => c.id === channelId)?.name?.toUpperCase() || 'STAGE'}
          </div>
          <div style={{ color: 'var(--ash)', fontSize: 12, marginTop: 6 }}>
            {speaking.length} speaker{speaking.length !== 1 ? 's' : ''} · {requested.length} request{requested.length !== 1 ? 's' : ''}
          </div>

          {!mySpeaker && (
            <button
              type="button"
              disabled={busy}
              onClick={() => act(() => requestToSpeak(channelId), 'Request sent — wait for a mod to approve.')}
              className="angular-button primary"
              style={{ marginTop: 16, padding: '8px 24px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 8, opacity: busy ? 0.6 : 1 }}
            >
              <Hand size={14} /> REQUEST TO SPEAK
            </button>
          )}
          {mySpeaker?.status === 'REQUESTED' && (
            <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--chaos)', fontSize: 12, border: '1px solid rgba(216,74,90,0.4)', padding: '8px 20px', borderRadius: 6, background: 'rgba(216,74,90,0.08)' }}>
              <MicOff size={14} /> REQUEST PENDING — MODS HAVE BEEN NOTIFIED
            </div>
          )}
          {mySpeaker?.status === 'SPEAKER' && (
            <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--toxic)', fontSize: 12, border: '1px solid rgba(74,194,82,0.4)', padding: '8px 20px', borderRadius: 6, background: 'rgba(74,194,82,0.08)' }}>
              <Mic size={14} /> YOU ARE LIVE ON STAGE
            </div>
          )}
          {mySpeaker?.status === 'MOD' && (
            <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--gold)', fontSize: 12, border: '1px solid rgba(74,243,255,0.4)', padding: '8px 20px', borderRadius: 6, background: 'rgba(74,243,255,0.08)' }}>
              <Shield size={14} /> STAGE MODERATOR
            </div>
          )}
        </motion.div>

        {/* Speakers */}
        <div style={{ fontSize: 11, color: 'var(--ash)', fontWeight: 700, letterSpacing: '0.1em' }}>ON STAGE</div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 20 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : speaking.length === 0 ? (
          <div style={{ color: 'var(--shadow)', fontSize: 12, padding: '8px 4px' }}>The stage is empty. Request to speak to get things going.</div>
        ) : (
          speaking.map((s) => <SpeakerRow key={s.userId} s={s} />)
        )}

        {/* Requests (mods only) */}
        {isMod && requested.length > 0 && (
          <>
            <div style={{ fontSize: 11, color: 'var(--chaos)', fontWeight: 700, letterSpacing: '0.1em', marginTop: 8 }}>
              REQUESTS ({requested.length})
            </div>
            {requested.map((s) => <SpeakerRow key={s.userId} s={s} />)}
          </>
        )}
      </div>
    </div>
  );
};

export default StagePanel;
