import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Mic, MicOff, Headphones, VolumeX } from 'lucide-react';
import { useVoiceStore } from '../../stores/voiceStore';
import { API_BASE } from '../../api/client';
import { useProfileStore } from '../../stores/profileStore';
import StatusPicker from '../ui/StatusPicker';

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
  );
};

export default UserOperativeBar;
