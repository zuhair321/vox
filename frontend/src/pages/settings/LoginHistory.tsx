import React, { useEffect, useState } from 'react';
import { ShieldAlert, Monitor, Globe, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BackHeader from '../../components/settings/BackHeader';
import SectionHeader from '../../components/settings/SectionHeader';
import VoxCard from '../../components/settings/VoxCard';
import ConfirmDialog from '../../components/settings/ConfirmDialog';
import { useUiStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { getLoginHistory, clearLoginHistory, deleteLoginHistoryEntry, type LoginHistoryEntry } from '../../api/auth';

const LoginHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useUiStore();
  const { loginAlert, clearLoginAlert } = useAuthStore();
  const [history, setHistory] = useState<LoginHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [showClearAll, setShowClearAll] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (loginAlert?.isNewLogin && loginAlert.alertMessage) {
      addToast(loginAlert.alertMessage, 'warning', { duration: 10000 });
      clearLoginAlert();
    }
  }, [loginAlert, addToast, clearLoginAlert]);

  const loadHistory = async () => {
    try {
      const data = await getLoginHistory();
      setHistory(data.history);
    } catch {
      addToast('Could not load login history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLoginHistoryEntry(id);
      setHistory(prev => prev.filter(h => h.id !== id));
      addToast('Entry removed', 'success');
    } catch {
      addToast('Failed to remove entry', 'error');
    }
  };

  const handleClearAll = async () => {
    setShowClearAll(false);
    setClearing(true);
    try {
      await clearLoginHistory();
      setHistory([]);
      addToast('Login history cleared', 'success');
    } catch {
      addToast('Failed to clear history', 'error');
    } finally {
      setClearing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const getDeviceLabel = (entry: LoginHistoryEntry) => {
    if (entry.deviceInfo) return entry.deviceInfo;
    if (entry.userAgent) {
      const match = entry.userAgent.match(/\(([^)]+)\)/);
      return match ? match[1] : entry.userAgent.slice(0, 60);
    }
    if (entry.ipAddress) return `IP: ${entry.ipAddress}`;
    return 'Unknown device';
  };

  return (
    <main className="settings-page">
      <BackHeader title="LOGIN HISTORY" onBack={() => navigate(-1)} />
      <div className="settings-list-stack">
        <p className="settings-copy">
          VOX tracks recent logins to your account. If you see an unfamiliar login,
          revoke the associated session immediately and change your password.
        </p>

        {loginAlert?.isNewLogin && loginAlert.alertMessage && (
          <VoxCard style={{ borderColor: 'rgba(255, 107, 107, 0.4)', background: 'rgba(255, 107, 107, 0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <ShieldAlert size={22} style={{ color: '#ff6b6b' }} />
              <div>
                <strong style={{ color: '#ff6b6b' }}>New login detected</strong>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {loginAlert.alertMessage}
                </div>
              </div>
            </div>
          </VoxCard>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Loading...</div>
        ) : history.length === 0 ? (
          <VoxCard>
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
              No login history yet.
            </div>
          </VoxCard>
        ) : (
          <>
            <section>
              <SectionHeader title="RECENT LOGINS" />
              {history.map(entry => (
                <VoxCard key={entry.id} className="device-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <div style={{ color: entry.alertSent ? '#ff6b6b' : 'var(--text-secondary)' }}>
                      {entry.deviceInfo ? <Monitor size={22} /> : <Globe size={22} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <strong>
                        {getDeviceLabel(entry)}
                        {entry.alertSent && (
                          <span style={{ marginLeft: '8px', fontSize: '11px', color: '#ff6b6b', fontWeight: 400 }}>
                            (new login)
                          </span>
                        )}
                      </strong>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {entry.ipAddress && <span>IP: {entry.ipAddress}</span>}
                        <span>Date: {formatDate(entry.createdAt)}</span>
                      </div>
                      {entry.location && (
                        <div style={{ fontSize: '12px', color: '#ff6b6b', marginTop: '4px' }}>
                          {entry.location}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="angular-button danger"
                    onClick={() => handleDelete(entry.id)}
                    aria-label="Remove entry"
                    style={{ flexShrink: 0 }}
                  >
                    <Trash2 size={16} />
                  </button>
                </VoxCard>
              ))}
            </section>

            {!loading && history.length > 0 && (
              <section>
                <SectionHeader title="DANGER ZONE" />
                <button
                  type="button"
                  className="angular-button danger"
                  onClick={() => setShowClearAll(true)}
                  style={{ width: '100%' }}
                  disabled={clearing}
                >
                  {clearing ? 'Clearing...' : 'Clear all login history'}
                </button>
              </section>
            )}
          </>
        )}
      </div>

      {showClearAll && (
        <ConfirmDialog
          title="CLEAR LOGIN HISTORY"
          body="This will permanently delete all your login history entries."
          confirmLabel="Clear all"
          onCancel={() => setShowClearAll(false)}
          onConfirm={handleClearAll}
        />
      )}
    </main>
  );
};

export default LoginHistoryPage;
