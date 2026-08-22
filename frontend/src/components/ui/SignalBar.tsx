import React, { useEffect, useState } from 'react';
import { useServerStore } from '../../stores/serverStore';
import { useVoiceStore } from '../../stores/voiceStore';
import { API_BASE } from '../../api/client';
import ServerLogo from './ServerLogo';

function getServerIconUrl(server: { icon?: string | null } | null | undefined): string | null {
  const icon = server?.icon;
  if (!icon) return null;
  return icon.startsWith('http') ? icon : `${API_BASE}${icon}`;
}

const FLAVOR_LINES = [
  'the covenant keeps its own counsel',
  'every transmission leaves a shadow',
  'the seal is unbroken',
  'all signals route through the dark matter protocol',
];

/**
 * Signal Bar — the breadcrumb strip directly under the server rail.
 * Gives the icon-only rail a sense of place: realm name in gold, live
 * operative counts, a quiet scrolling ticker, and a voice-link badge
 * when the user is connected to a voice channel.
 */
const SignalBar: React.FC = () => {
  const { selectedServer } = useServerStore();
  const voice = useVoiceStore();
  const [flavorIdx, setFlavorIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setFlavorIdx((i) => (i + 1) % FLAVOR_LINES.length), 9000);
    return () => clearInterval(t);
  }, []);

  if (!selectedServer) return null;

  const members = selectedServer.members || [];
  const online = members.filter((m: { user?: { status?: string }; status?: string }) => {
    const st = (m.user?.status || m.status || '').toLowerCase();
    return st === 'online' || st === 'idle' || st === 'dnd';
  }).length;
  const iconUrl = getServerIconUrl(selectedServer);
  const activeChannel = voice.channelId
    ? (selectedServer.channels || []).find((c: { id: string }) => c.id === voice.channelId)
    : null;

  return (
    <div className="vox-signal-bar">
      <div className="vox-signal-realm">
        {iconUrl ? (
          <img
            src={iconUrl}
            alt=""
            style={{ width: 20, height: 20, borderRadius: 5, objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <ServerLogo
            name={selectedServer.name}
            size={20}
            style={{ borderRadius: 5, fontSize: 9 }}
          />
        )}
        <span className="vox-signal-realm-name">{selectedServer.name}</span>
      </div>

      <div className="vox-signal-divider" />

      <div className="vox-signal-counts">
        <span><b>{online}</b> online</span>
        <span>· {members.length} operatives</span>
      </div>

      <div className="vox-signal-ticker" title="Recent activity">
        <span className="vox-signal-ticker-inner">
          ✦ {FLAVOR_LINES[flavorIdx]} &nbsp;&nbsp;·&nbsp;&nbsp; ✦ the transmissions continue
        </span>
      </div>

      {activeChannel && (
        <div className="vox-signal-voice" title={`Connected to ${activeChannel.name}`}>
          link · {activeChannel.name}
        </div>
      )}
    </div>
  );
};

export default SignalBar;
