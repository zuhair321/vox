import React, { useEffect, useState } from 'react';
import { Pin } from 'lucide-react';
import { useServerStore } from '../../stores/serverStore';

interface PinnedStripProps {
  channelId: string;
  onOpen: () => void;
}

/**
 * Pinned Transmissions — a collapsible strip under the channel header.
 * Shows pin count + preview of the latest pin; clicking opens the full
 * pinned-messages side panel. Renders nothing when the channel has no pins,
 * so it never wastes vertical space.
 */
const PinnedStrip: React.FC<PinnedStripProps> = ({ channelId, onOpen }) => {
  const [count, setCount] = useState<number | null>(null);
  const [latest, setLatest] = useState<string | null>(null);
  const { selectedChannel } = useServerStore();

  useEffect(() => {
    let alive = true;
    setCount(null);
    setLatest(null);
    if (!selectedChannel?.id) return;
    (async () => {
      try {
        const { api } = await import('../../api/client');
        type PinnedMsg = { body?: string; content?: string };
        const res = await api<unknown>(`/api/channels/${selectedChannel.id}/messages/pinned`);
        const list: PinnedMsg[] = (Array.isArray(res) ? res : (res as { messages?: PinnedMsg[] })?.messages || []) as PinnedMsg[];
        if (!alive) return;
        setCount(list.length);
        if (list.length > 0) {
          const first = list[list.length - 1] || list[0];
          setLatest((first?.body || first?.content || '').slice(0, 90) || '(attachment)');
        }
      } catch {
        if (alive) setCount(0);
      }
    })();
    return () => { alive = false; };
  }, [selectedChannel?.id, channelId]);

  if (!count || count === 0) return null;

  return (
    <button
      type="button"
      className="vox-pinned-strip"
      onClick={onOpen}
      title="Open pinned transmissions"
      aria-label={`${count} pinned messages`}
    >
      <span className="vox-pinned-icon"><Pin size={13} strokeWidth={1.5} /></span>
      <span className="vox-pinned-label">Pinned transmissions</span>
      <span className="vox-pinned-count">{count}</span>
      {latest && (
        <span className="vox-pinned-preview">
          <b>Latest:</b> {latest}
        </span>
      )}
      <span className="vox-pinned-chevron">›</span>
    </button>
  );
};

export default PinnedStrip;
