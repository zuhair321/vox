import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { resolveInvite, joinByInvite } from '../api/invites';
import { useServerStore } from '../stores/serverStore';
import { useUiStore } from '../stores/uiStore';
import { API_BASE } from '../api/client';
import ServerLogo from '../components/ui/ServerLogo';

interface InviteInfo {
  code: string;
  server: {
    id: string;
    name: string;
    description?: string | null;
    icon?: string | null;
    banner?: string | null;
    memberCount: number;
  };
}

const InviteAccept: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { addToast } = useUiStore();
  const { fetchServers } = useServerStore();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    resolveInvite(code)
      .then((data: any) => {
        setInvite(data);
        setLoading(false);
      })
      .catch((e: any) => {
        setError(e?.message || 'Invalid or expired invite.');
        setLoading(false);
      });
  }, [code]);

  const handleJoin = async () => {
    if (!code) return;
    setJoining(true);
    try {
      const data = await joinByInvite(code);
      const server = data?.server;
      if (server?.id) {
        await fetchServers();
        addToast(`Joined ${server.name}!`, 'success');
        navigate(`/channels/${server.id}/${server.channels?.[0]?.id || ''}`);
      }
    } catch (e: any) {
      addToast(e?.message || 'Failed to join.', 'error');
    } finally {
      setJoining(false);
    }
  };

  const serverBanner = invite?.server?.banner
    ? (invite.server.banner.startsWith('http') ? invite.server.banner : `${API_BASE}${invite.server.banner}`)
    : null;
  const serverIcon = invite?.server?.icon
    ? (invite.server.icon.startsWith('http') ? invite.server.icon : `${API_BASE}${invite.server.icon}`)
    : null;

  return (
    <div className="main-content animated-bg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
      {loading ? (
        <div className="spinner" />
      ) : error ? (
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '48px', opacity: 0.2, marginBottom: '16px' }}>🔒</div>
          <h2 style={{ fontSize: '20px', color: 'var(--ghost-white)', marginBottom: '8px' }}>INVITE INVALID</h2>
          <p style={{ color: 'var(--ash)', fontSize: '14px', marginBottom: '24px' }}>{error}</p>
          <button className="angular-button" onClick={() => navigate('/friends')}>BACK TO FRIENDS</button>
        </div>
      ) : invite ? (
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          {serverBanner && (
            <div style={{ width: '100%', height: '120px', marginBottom: '20px', overflow: 'hidden', borderRadius: '8px' }}>
              <img src={serverBanner} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
          <ServerLogo
            src={serverIcon}
            name={invite.server.name}
            size={64}
            style={{
              margin: '0 auto 16px',
              backgroundColor: 'var(--phantom)',
            }}
          />
          <h2 style={{ fontSize: '20px', color: 'var(--ghost-white)', marginBottom: '4px' }}>{invite.server.name}</h2>
          {invite.server.description && (
            <p style={{ color: 'var(--ash)', fontSize: '13px', marginBottom: '8px' }}>{invite.server.description}</p>
          )}
          <p style={{ color: 'var(--shadow)', fontSize: '12px', marginBottom: '24px' }}>{invite.server.memberCount} members</p>
          <button
            className="angular-button primary"
            onClick={handleJoin}
            disabled={joining}
            style={{ width: '100%', fontSize: '13px', letterSpacing: '0.1em' }}
          >
            {joining ? 'JOINING...' : 'JOIN SERVER'}
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default InviteAccept;
