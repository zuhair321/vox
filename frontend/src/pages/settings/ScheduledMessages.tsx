import React, { useEffect, useState, useMemo } from 'react';
import { Clock, Plus, Trash2, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BackHeader from '../../components/settings/BackHeader';
import SectionHeader from '../../components/settings/SectionHeader';
import VoxCard from '../../components/settings/VoxCard';
import ConfirmDialog from '../../components/settings/ConfirmDialog';
import { useUiStore } from '../../stores/uiStore';
import { useServerStore } from '../../stores/serverStore';
import {
  listScheduled,
  scheduleMessage,
  cancelScheduled,
  type ScheduledMessage,
} from '../../api/scheduled';

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const ScheduledMessagesPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useUiStore();
  const { servers } = useServerStore();
  const [items, setItems] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [channelId, setChannelId] = useState('');
  const [body, setBody] = useState('');
  const [when, setWhen] = useState(toLocalInput(new Date(Date.now() + 60 * 60 * 1000)));
  const [scheduling, setScheduling] = useState(false);

  const [cancelTarget, setCancelTarget] = useState<ScheduledMessage | null>(null);

  const textChannels = useMemo(
    () => servers.flatMap((s) => s.channels.filter((c) => c.type === 'TEXT')),
    [servers],
  );

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const data = await listScheduled();
      setItems(data.scheduled);
    } catch {
      addToast('Could not load scheduled messages', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setChannelId(textChannels[0]?.id || '');
    setBody('');
    setWhen(toLocalInput(new Date(Date.now() + 60 * 60 * 1000)));
    setShowCreate(true);
  };

  const handleCreate = async () => {
    if (!channelId || !body.trim()) {
      addToast('Channel and message are required', 'error');
      return;
    }
    setScheduling(true);
    try {
      await scheduleMessage({ channelId, body: body.trim(), scheduledAt: new Date(when).toISOString() });
      addToast('Message scheduled', 'success');
      setShowCreate(false);
      await loadItems();
    } catch (e: any) {
      addToast(e?.message || 'Failed to schedule message', 'error');
    } finally {
      setScheduling(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    try {
      await cancelScheduled(cancelTarget.id);
      setItems((prev) => prev.filter((i) => i.id !== cancelTarget.id));
      addToast('Scheduled message cancelled', 'success');
    } catch {
      addToast('Failed to cancel', 'error');
    } finally {
      setCancelTarget(null);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <main className="settings-page">
      <BackHeader title="SCHEDULED MESSAGES" onBack={() => navigate(-1)} />
      <div className="settings-list-stack">
        <p className="settings-copy">
          Schedule messages to be sent automatically at a future time. Use this for
          announcements, reminders, or timed posts.
        </p>

        <section>
          <SectionHeader title="SCHEDULED" />
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Loading...</div>
          ) : items.length === 0 ? (
            <VoxCard>
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                No scheduled messages.
              </div>
            </VoxCard>
          ) : (
            items.map((m) => (
              <VoxCard key={m.id} className="device-card">
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Clock size={16} style={{ color: 'var(--text-secondary)' }} />
                    <strong>{formatDate(m.scheduledAt)}</strong>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0' }}>
                    #{m.channel?.name || 'unknown-channel'}
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', padding: '8px 10px', borderRadius: 6, fontSize: 13 }}>
                    {m.body}
                  </div>
                </div>
                <button
                  type="button"
                  className="angular-button danger"
                  onClick={() => setCancelTarget(m)}
                  aria-label="Cancel"
                  style={{ flexShrink: 0 }}
                >
                  <Trash2 size={16} />
                </button>
              </VoxCard>
            ))
          )}
          <button
            type="button"
            className="angular-button"
            onClick={openCreate}
            style={{ width: '100%', marginTop: 12 }}
            disabled={textChannels.length === 0}
          >
            <Plus size={16} /> Schedule a Message
          </button>
          {textChannels.length === 0 && (
            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              Join a server with a text channel to schedule messages.
            </p>
          )}
        </section>
      </div>

      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2><Send size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />Schedule Message</h2>
            <label className="field-label">Channel</label>
            <select className="text-input" value={channelId} onChange={(e) => setChannelId(e.target.value)}>
              {textChannels.map((c) => (
                <option key={c.id} value={c.id}>#{c.name}</option>
              ))}
            </select>
            <label className="field-label" style={{ marginTop: 12 }}>Message</label>
            <textarea
              className="text-input"
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What should be sent?"
            />
            <label className="field-label" style={{ marginTop: 12 }}>Send at</label>
            <input
              className="text-input"
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button type="button" className="angular-button" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="button" className="angular-button primary" onClick={handleCreate} disabled={scheduling}>
                {scheduling ? 'Scheduling...' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelTarget && (
        <ConfirmDialog
          title="CANCEL SCHEDULED MESSAGE"
          body="Remove this scheduled message? It will not be sent."
          confirmLabel="Cancel message"
          onCancel={() => setCancelTarget(null)}
          onConfirm={handleCancel}
        />
      )}
    </main>
  );
};

export default ScheduledMessagesPage;
