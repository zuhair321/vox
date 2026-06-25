import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSocketStore } from '../../stores/socketStore';
import { useServerStore } from '../../stores/serverStore';
import { useMessageStore } from '../../stores/messageStore';
import { sendMessageHTTP } from '../../api/messages';
import { uploadChatAttachment } from '../../api/uploads';
import { useUiStore } from '../../stores/uiStore';
import GifPicker, { GifItem } from './GifPicker';
import EmojiPicker from '../ui/EmojiPicker';
import type { Attachment } from '../../types';
import { playMessageSend, playError } from '../../utils/sounds';

interface PendingAttachment {
  id: string;
  name: string;
  status: 'uploading' | 'done' | 'error';
  error?: string;
  attachment?: Attachment;
}

function formatSize(bytes: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MessageInput: React.FC<{ channelId?: string; dmId?: string }> = ({ channelId, dmId }) => {
  const [content, setContent] = useState('');
  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const { sendDM, startTyping, stopTyping } = useSocketStore();
  const { addToast } = useUiStore();
  const { selectedServer } = useServerStore();
  const { replyingTo, setReplyingTo } = useMessageStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const memberNames = useMemo(() => {
    const names: string[] = [];
    for (const m of selectedServer?.members || []) {
      const u = (m as any).user || m;
      if (u?.username) names.push(u.username);
    }
    return Array.from(new Set(names));
  }, [selectedServer]);

  const mentionState = (() => {
    const m = content.slice(0, content.length).match(/@([A-Za-z0-9_]*)$/);
    if (!m) return { open: false, query: '', start: 0 };
    return { open: true, query: m[1], start: m.index || 0 };
  })();

  const mentionMatches = useMemo(() => {
    if (!mentionState.open) return [];
    const q = mentionState.query.toLowerCase();
    return memberNames.filter((n) => n.toLowerCase().startsWith(q)).slice(0, 8);
  }, [mentionState.open, mentionState.query, memberNames]);

  const insertMention = (username: string) => {
    const before = content.slice(0, mentionState.start);
    const after = content.slice(mentionState.start + mentionState.query.length + 1);
    setContent(`${before}@${username} ${after}`);
    inputRef.current?.focus();
  };

  const insertEmoji = (emoji: string) => {
    const el = inputRef.current;
    const caret = el ? el.selectionStart ?? content.length : content.length;
    const before = content.slice(0, caret);
    const after = content.slice(caret);
    setContent(`${before}${emoji}${after}`);
    requestAnimationFrame(() => {
      if (inputRef.current) {
        const pos = caret + emoji.length;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(pos, pos);
      }
    });
  };

  const resolveRecipientId = (): string => {
    if (!dmId) return '';
    const myId = (() => {
      try {
        return JSON.parse(localStorage.getItem('vox_user') || '{}')?.id || '';
      } catch {
        return '';
      }
    })();
    return dmId.split('_').find((part) => part && part !== myId) || dmId;
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (channelId && content.length > 0) stopTyping(channelId);
    }, 1000);
    return () => clearTimeout(timer);
  }, [content, channelId, stopTyping]);

  const readyAttachments = pending
    .filter((p) => p.status === 'done' && p.attachment)
    .map((p) => p.attachment!) as Attachment[];

  const canSend = !busy && content.length <= 2000 && (content.trim().length > 0 || readyAttachments.length > 0);

  const charCountColor = content.length >= 2000 ? 'var(--blood)' : content.length >= 1900 ? 'var(--gold)' : 'var(--ash)';

  const addFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;
    setBusy(true);

    const entries: PendingAttachment[] = list.map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
      status: 'uploading',
    }));
    setPending((prev) => [...prev, ...entries]);

    await Promise.all(
      list.map(async (file, i) => {
        const entry = entries[i];
        try {
          const attachment = await uploadChatAttachment(file);
          setPending((prev) =>
            prev.map((p) => (p.id === entry.id ? { ...p, status: 'done', attachment } : p)),
          );
        } catch (e: any) {
          setPending((prev) =>
            prev.map((p) =>
              p.id === entry.id
                ? { ...p, status: 'error', error: e?.message || 'Upload failed' }
                : p,
            ),
          );
        }
      }),
    );

    setBusy(false);
  };

  const removePending = (id: string) =>
    setPending((prev) => prev.filter((p) => p.id !== id));

  const clearDone = () => setPending((prev) => prev.filter((p) => p.status !== 'done'));

  const send = () => {
    if (!canSend) return;
    const text = content.trim();
    const attachments = readyAttachments;

    const onError = (err: any) => {
      playError();
      addToast(err?.message || 'Message failed to send.', 'error');
    };

    if (channelId) {
      sendMessageHTTP(channelId, text, replyingTo?.id, attachments)
        .then(() => playMessageSend())
        .catch(onError);
      stopTyping(channelId);
    } else if (dmId) {
      const recipientId = resolveRecipientId();
      if (!recipientId) {
        playError();
        addToast('No recipient for this conversation.', 'error');
        return;
      }
      sendDM(recipientId, text, attachments.length ? attachments : undefined);
      playMessageSend();
    }

    setContent('');
    clearDone();
    if (replyingTo) setReplyingTo(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (mentionState.open && mentionMatches.length > 0 && (e.key === 'Tab' || e.key === 'Enter')) {
      e.preventDefault();
      insertMention(mentionMatches[0]);
      return;
    }
    if (e.key === 'Escape' && mentionState.open) {
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    } else if (channelId) {
      startTyping(channelId);
    }
  };

  const handleGifPick = (gif: GifItem) => {
    const body = `[GIF] ${gif.url}`;
    if (channelId) {
      sendMessageHTTP(channelId, body, undefined, []).catch((err: any) =>
        addToast(err?.message || 'GIF failed to send.', 'error'),
      );
    } else if (dmId) {
      const recipientId = resolveRecipientId();
      if (recipientId) sendDM(recipientId, body, undefined);
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = '';
  };

  return (
    <div className="message-input-wrapper" style={{ position: 'relative' }}>
      {replyingTo && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            marginBottom: '6px',
            background: 'var(--obsidian)',
            border: '1px solid var(--rim)',
            borderLeft: '3px solid var(--chaos)',
            fontSize: '12px',
            color: 'var(--ash)',
          }}
        >
          <span style={{ color: 'var(--chaos)' }}>↩️</span>
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Replying to{' '}
            <strong style={{ color: 'var(--ghost-white)' }}>
              {replyingTo.author?.username || replyingTo.authorOverride || 'Unknown'}
            </strong>
            : {replyingTo.body.slice(0, 60)}
          </span>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="reply-dismiss-btn"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--shadow)',
              cursor: 'pointer',
              fontSize: '14px',
              lineHeight: 1,
            }}
            aria-label="Cancel reply"
          >
            ✕
          </button>
        </div>
      )}

      {mentionState.open && mentionMatches.length > 0 && (
        <div className="mention-dropdown" role="listbox" aria-label="Mention suggestions">
          {mentionMatches.map((name) => (
            <button
              key={name}
              type="button"
              className="mention-item"
              onClick={() => insertMention(name)}
            >
              <span className="mention-at">@</span>
              {name}
            </button>
          ))}
        </div>
      )}

      <GifPicker open={gifOpen} gifs={[]} onClose={() => setGifOpen(false)} onPick={handleGifPick} />
      <EmojiPicker open={emojiOpen} onClose={() => setEmojiOpen(false)} onSelect={insertEmoji} />

      {pending.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            padding: '6px 10px 0',
          }}
        >
          {pending.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 8px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                fontSize: '12px',
                color: 'var(--ghost-white, #e0e6ed)',
                maxWidth: '220px',
              }}
              className="pending-attachment-chip"
              title={p.status === 'error' ? p.error : p.attachment ? formatSize(p.attachment.size) : ''}
            >
              <span style={{ opacity: 0.7 }}>{p.status === 'uploading' ? '⏳' : p.status === 'error' ? '⚠️' : '📎'}</span>
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: p.status === 'error' ? '#ff6b6b' : undefined,
                }}
              >
                {p.name}
              </span>
              <button
                type="button"
                onClick={() => removePending(p.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--ash, #8a93a3)',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '14px',
                  lineHeight: 1,
                }}
                aria-label={`Remove ${p.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="text"
        className="angular-input"
        placeholder={channelId ? 'Message #channel' : 'Send a direct message...'}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label={channelId ? `Message #${selectedServer?.name || 'channel'}` : 'Send a direct message'}
        style={{ paddingRight: '144px' }}
      />

      <button
        type="button"
        onClick={() => setEmojiOpen((v) => !v)}
        className="input-action-btn"
        title="Pick an emoji"
        aria-label="Pick an emoji"
        aria-expanded={emojiOpen}
        style={{
          position: 'absolute',
          right: '100px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: emojiOpen ? 'var(--chaos)' : 'var(--ash, #8a93a3)',
          fontSize: '18px',
          padding: 0,
        }}
      >
        😊
      </button>

      <button
        type="button"
        onClick={() => setGifOpen((v) => !v)}
        className="input-action-btn"
        title="Pick a GIF"
        aria-label="Pick a GIF"
        aria-expanded={gifOpen}
        style={{
          position: 'absolute',
          right: '64px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: gifOpen ? 'var(--accent, #b1121b)' : 'var(--ash, #8a93a3)',
          fontSize: '18px',
          padding: 0,
        }}
      >
        🎞
      </button>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="input-action-btn"
        disabled={busy}
        title="Attach a file"
        aria-label="Attach a file"
        style={{
          position: 'absolute',
          right: '36px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          cursor: busy ? 'wait' : 'pointer',
          color: 'var(--ash, #8a93a3)',
          fontSize: '18px',
          padding: 0,
          opacity: busy ? 0.5 : 1,
        }}
      >
        📎
      </button>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={onPick}
        style={{ display: 'none' }}
      />

      {content.length > 1800 && (
        <div
          style={{
            position: 'absolute',
            right: '8px',
            top: '-20px',
            fontSize: '11px',
            color: charCountColor,
            fontFamily: "'Share Tech Mono', monospace",
            transition: 'color 0.2s ease',
          }}
        >
          {content.length} / 2000
        </div>
      )}

      <button
        type="button"
        className="send-button"
        onClick={send}
        disabled={!canSend}
        title="Send message"
        aria-label="Send message"
        style={{
          position: 'absolute',
          right: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '28px',
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--phantom)',
          color: 'var(--shadow)',
          border: '1px solid var(--rim)',
          cursor: canSend ? 'pointer' : 'not-allowed',
          fontSize: '12px',
          padding: 0,
          clipPath: 'polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)',
          transition: 'background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        }}
      >
        ➤
      </button>
    </div>
  );
};

export default MessageInput;
