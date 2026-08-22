import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Mic, MicOff, Headphones, VolumeX } from 'lucide-react';
import { useVoiceStore } from '../../stores/voiceStore';
import { API_BASE } from '../../api/client';
import { useProfileStore } from '../../stores/profileStore';
import StatusPicker from '../ui/StatusPicker';
import { useSocketStore } from '../../stores/socketStore';
import { useServerStore } from '../../stores/serverStore';
import { Headphones as DockHeadphones, Mic as DockMic, PhoneOff } from 'lucide-react';

/**
 * Voice Dock — renders above the operative bar ONLY while connected to a
 * voice channel: channel name, stacked member avatars (speaking glow),
 * and mute/deafen/leave controls. Collapses to nothing when not in a call.
 */
const VoiceDock: React.FC = () => {
  const voice = useVoiceStore();
  const socket = useSocketStore((st) => st.socket);
  const { selectedServer } = useServerStore();
  const localMuted = useVoiceStore((st) => st.localMuted);
  const localDeafened = useVoiceStore((st) => st.localDeafened);
  const setLocalMuted = useVoiceStore((st) => st.setLocalMuted);
  const setLocalDeafened = useVoiceStore((st) => st.setLocalDeafened);

  if (!voice.connected || !voice.channelId) return null;

  const channelName = (() => {
    try {
      const ch = (selectedServer?.channels || []).find((c: { id: string }) => c.id === voice.channelId);
      return ch?.name || 'Voice channel';
    } catch { return 'Voice channel'; }
  })();

  const leave = () => {
    socket?.emit('voice:leave');
    voice.clearChannel();
  };

  const members = [
    { id: 'you', username: 'You', avatarUrl: null, speaking: false, muted: localMuted, deafened: localDeafened },
    ...voice.voiceUsers,
  ];

  return (
    <div className="vox-voice-dock">
      <div className="vox-voice-dock-head">voice link</div>
      <div className="vox-voice-dock-name">{channelName}</div>
      <div className="vox-voice-dock-users">
        {members.slice(0, 6).map((m: { id?: string; socketId?: string; speaking: boolean; muted: boolean; deafened: boolean; username: string; avatarUrl?: string | null }) => (
          <div
            key={m.id || m.socketId}
            className={`vox-voice-dock-avatar ${m.speaking ? 'speaking' : ''} ${m.muted || m.deafened ? 'muted' : ''}`}
            title={m.username}
          >
            {m.avatarUrl ? <img src={resolveMediaUrl(m.avatarUrl) || undefined} alt="" /> : (m.username || '?').slice(0, 1).toUpperCase()}
          </div>
        ))}
      </div>
      <div className="vox-voice-dock-actions">
        <button
          type="button"
          className={`vox-voice-dock-btn ${localMuted ? 'toggled' : ''}`}
          onClick={async () => {
            // Lazy mic: if unmuting and no stream, request mic first
            if (localMuted && !voice.localStream) {
              try {
                const w = window as unknown as { electronAPI?: { clearPermissionCache?: () => Promise<boolean> } };
                if (w.electronAPI?.clearPermissionCache) await w.electronAPI.clearPermissionCache();
                const raw = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
                voice.setLocalStream(raw);
              } catch {
                return; // Keep muted if mic fails
              }
            }
            setLocalMuted(!localMuted);
          }}
          aria-label={localMuted ? 'Unmute microphone' : 'Mute microphone'}
          title={localMuted ? 'Unmute' : 'Mute'}
        >
          <DockMic size={13} />
        </button>
        <button
          type="button"
          className={`vox-voice-dock-btn ${localDeafened ? 'toggled' : ''}`}
          onClick={() => setLocalDeafened(!localDeafened)}
          aria-label={localDeafened ? 'Undeafen' : 'Deafen'}
          title={localDeafened ? 'Undeafen' : 'Deafen'}
        >
          <DockHeadphones size={13} />
        </button>
        <button
          type="button"
          className="vox-voice-dock-btn danger"
          onClick={leave}
          aria-label="Leave voice channel"
          title="Leave channel"
        >
          <PhoneOff size={13} />
        </button>
      </div>
    </div>
  );
};

function resolveMediaUrl(url: string | null | undefined) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

/**
 * Operative (user) bar pinned to the bottom of every sidebar column.
 * Shows the current user's avatar/status plus Discord-style controls:
 * mic mute, headphone deafen, and settings.
 * Shared across the server sidebar, the DM bar, and the friends page so the
 * DM bar always "hits" the same bottom bar as the main sidebar.
 */
const UserOperativeBar: React.FC = () => {
  const navigate = useNavigate();
  const profile = useProfileStore();
  const avatarUrl = resolveMediaUrl(profile.avatarUrl);
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const localMuted = useVoiceStore((st) => st.localMuted);
  const localDeafened = useVoiceStore((st) => st.localDeafened);
  const setLocalMuted = useVoiceStore((st) => st.setLocalMuted);
  const setLocalDeafened = useVoiceStore((st) => st.setLocalDeafened);

  return (
    <>
      <VoiceDock />
      <div
        className="vox-user-panel"
      style={{ position: 'relative', gridTemplateColumns: 'minmax(0, 1fr) 30px 30px 30px' }}
    >
      {statusPickerOpen && <StatusPicker onClose={() => setStatusPickerOpen(false)} />}
      <button
        type="button"
        className="vox-user-profile ripple-container"
        onClick={() => setStatusPickerOpen((v) => !v)}
        aria-label="Set status"
      >
        <div className="octagon">{avatarUrl ? <img src={avatarUrl} alt="" /> : profile.displayName.slice(0, 1).toUpperCase()}</div>
        <span>
          <strong>{profile.displayName}</strong>
          <em style={{ textTransform: 'capitalize' }}>{profile.userStatus}</em>
          {profile.hasTurbo && <span className="turbo-badge" title="Turbo">⚡</span>}
        </span>
      </button>
      <button
        type="button"
        className={`vox-panel-icon ripple-container ${localMuted ? 'active-danger' : ''}`}
        onClick={() => setLocalMuted(!localMuted)}
        aria-label={localMuted ? 'Unmute microphone' : 'Mute microphone'}
        title={localMuted ? 'Unmute' : 'Mute'}
      >
        {localMuted ? <MicOff size={17} /> : <Mic size={17} />}
      </button>
      <button
        type="button"
        className={`vox-panel-icon ripple-container ${localDeafened ? 'active-danger' : ''}`}
        onClick={() => setLocalDeafened(!localDeafened)}
        aria-label={localDeafened ? 'Undeafen' : 'Deafen'}
        title={localDeafened ? 'Undeafen' : 'Deafen'}
      >
        {localDeafened ? <VolumeX size={17} /> : <Headphones size={17} />}
      </button>
      <button type="button" className="vox-panel-icon ripple-container" onClick={() => navigate('/settings')} aria-label="Settings">
        <Settings size={17} />
      </button>
      </div>
    </>
  );
};

export default UserOperativeBar;
