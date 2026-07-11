import React, { useEffect, useState } from 'react';
import { AlertTriangle, Globe, Monitor, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BackHeader from '../../components/settings/BackHeader';
import SectionHeader from '../../components/settings/SectionHeader';
import VoxCard from '../../components/settings/VoxCard';
import ConfirmDialog from '../../components/settings/ConfirmDialog';
import { useUiStore } from '../../stores/uiStore';
import { fetchSessions, revokeSession, revokeAllSessions, type SessionInfo } from '../../api/auth';

const Sessions: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useUiStore();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [showRevokeAll, setShowRevokeAll] = useState(false);
  const [filter, setFilter] = useState<'all' | 'current'>('all');

  const currentToken = localStorage.getItem('vox_token');

  useEffect(() => {
    fetchSessions()
      .then(setSessions)
      .catch(() => addToast('Could not load sessions', 'error'))
      .finally(() => setLoading(false));
  }, [addToast]);

  const handleRevoke = async (sessionId: string) => {
    setRevoking(sessionId);
    try {
      await revokeSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      addToast('Session logged out', 'success');
    } catch {
      addToast('Failed to log out session', 'error');
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeAll = async () => {
    setShowRevokeAll(false);
    try {
      await revokeAllSessions();
      setSessions(prev => prev.filter(s => s.token === currentToken));
      addToast('All other sessions logged out', 'success');
    } catch {
      addToast('Failed to log out sessions', 'error');
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const getDeviceIcon = (session: SessionInfo) => {
    if (!session.deviceInfo) return <Globe size={22} />;
    const d = session.deviceInfo.toLowerCase();
    if (d.includes('mobile') || d.includes('iphone') || d.includes('android')) return <Smartphone size={22} />;
    if (d.includes('tablet') || d.includes('ipad')) return <Smartphone size={22} />;
    return <Monitor size={22} />;
  };

  const getDeviceLabel = (session: SessionInfo) => {
    if (session.deviceInfo) return session.deviceInfo;
    if (session.userAgent) {
      // Trim user agent to a readable hostname-ish piece.
      const match = session.userAgent.match(/\(([^)]+)\)/);
      return match ? match[1] : session.userAgent.slice(0, 60);
    }
    if (session.ipAddress) return `IP: ${session.ipAddress}`;
    return 'Unknown device';
  };

  const isCurrentSession = (session: SessionInfo) => session.token === currentToken;

  const visible = sessions.filter(s => filter === 'all' || isCurrentSession(s));

  return (
    <main className="settings-page">
      <BackHeader title="SESSIONS" badge={String(sessions.length)} onBack={() => navigate(-1)} />
      <div className="settings-list-stack">
        <p className="settings-copy">
          These are the devices currently logged into your VOX account. You can log out
          of each individually or all other devices at once. If you see an unrecognized
          session, revoke it immediately and consider changing your password.
        </p>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          {(['all', 'current'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? 'var(--discord-blurple)' : 'var(--bg-tertiary)',
                color: filter === f ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 12px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              {f === 'all' ? `All (${sessions.length})` : 'Current'}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Loading...</div>
        ) : visible.length === 0 ? (
          <VoxCard>
            <AlertTriangle size={20} />
            <span>No sessions to show.</span>
          </VoxCard>
        ) : (
          <>
            <section>
              <SectionHeader title="ACTIVE SESSIONS" />
              {visible.map(session => {
                const isCurrent = isCurrentSession(session);
                return (
                  <VoxCard key={session.id} className="device-card" style={{ opacity: revoking === session.id ? 0.6 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      <div style={{ color: isCurrent ? 'var(--green)' : 'var(--text-secondary)' }}>
                        {getDeviceIcon(session)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <strong>
                          {getDeviceLabel(session)}
                          {isCurrent && (
                            <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--green)', fontWeight: 400 }}>
                              (this device)
                            </span>
                          )}
                        </strong>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {session.ipAddress && <span>IP: {session.ipAddress}</span>}
                          <span>Created: {formatDate(session.createdAt)}</span>
                          <span>Expires: {formatDate(session.expiresAt)}</span>
                        </div>
                      </div>
                    </div>
                    {!isCurrent && (
                      <button
                        type="button"
                        className="angular-button danger"
                        onClick={() => handleRevoke(session.id)}
                        disabled={revoking === session.id}
                        aria-label={`Log out session from ${getDeviceLabel(session)}`}
                        style={{ flexShrink: 0 }}
                      >
                        {revoking === session.id ? '...' : 'Log out'}
                      </button>
                    )}
                  </VoxCard>
                );
              })}
            </section>

            {!loading && sessions.length > 1 && (
              <section>
                <SectionHeader title="DANGER ZONE" />
                <button
                  type="button"
                  className="angular-button danger"
                  onClick={() => setShowRevokeAll(true)}
                  style={{ width: '100%' }}
                >
                  Log out all other sessions
                </button>
              </section>
            )}
          </>
        )}
      </div>

      {showRevokeAll && (
        <ConfirmDialog
          title="LOG OUT ALL SESSIONS"
          body="This will end all sessions except this one. You'll stay logged in here."
          confirmLabel="Log out all"
          onCancel={() => setShowRevokeAll(false)}
          onConfirm={handleRevokeAll}
        />
      )}
    </main>
  );
};

export default Sessions;
