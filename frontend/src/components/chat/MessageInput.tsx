import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSocketStore } from '../../stores/socketStore';
import { useServerStore } from '../../stores/serverStore';
import { useMessageStore } from '../../stores/messageStore';
import { useAuthStore } from '../../stores/authStore';
import { useDMStore } from '../../stores/dmStore';
import { API_BASE } from '../../api/client';
import { sendMessageHTTP } from '../../api/messages';
import { uploadChatAttachment } from '../../api/uploads';
import { sendDMHTTP } from '../../api/dm';
import { useUiStore } from '../../stores/uiStore';
import { useEmojiStore } from '../../stores/emojiStore';
import EmojiPicker from '../ui/EmojiPicker';
import { SlashCommandMenu, COMMANDS, type SlashCommand } from './SlashCommandMenu';
import type { Attachment } from '../../types';
import { playMessageSend, playError } from '../../utils/sounds';
import { useVoiceRecorder, type VoiceRecording } from '../../hooks/useVoiceRecorder';

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

const MessageInput: React.FC<{ channelId?: string; dmId?: string }> = React.memo(({ channelId, dmId }) => {
  const [content, setContent] = useState('');
  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const { sendDM, startTyping, stopTyping, startDmTyping, stopDmTyping } = useSocketStore();
  const { addToast } = useUiStore();
  const { selectedServer } = useServerStore();
  const { replyingTo, setReplyingTo } = useMessageStore();
  const { loadServerEmojis, byServer } = useEmojiStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the custom (animated) emoji registry fresh for the active server.
  useEffect(() => {
    if (selectedServer?.id) loadServerEmojis(selectedServer.id);
  }, [selectedServer?.id, loadServerEmojis]);

  const voice = useVoiceRecorder();

  // Build the custom (animated) emoji list for the active server.
  const serverEmojis = useMemo(() => {
    const map = selectedServer?.id ? byServer[selectedServer.id] : undefined;
    if (!map) return [];
    return Object.entries(map).map(([name, url]) => ({ name, url }));
  }, [selectedServer?.id, byServer]);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  // Exposes the active recorder so the global Vox shortcut can toggle it.
  useEffect(() => {
    (window as any).__voxVoiceToggle = async () => {
      if (voice.recording) {
        const rec = await voice.stop();
        if (rec) await handleVoiceRecording(rec, true);
      } else {
        await startRecording();
      }
    };
    return () => {
      delete (window as any).__voxVoiceToggle;
    };
  }, [voice, voice.recording]);

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

  // Slash command detection
  const slashState = (() => {
    const m = content.match(/^\/([A-Za-z0-9_-]*)$/);
    if (!m) return { open: false, query: '', start: 0 };
    return { open: true, query: m[1], start: 0 };
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
    // User IDs may contain underscores, so we can't split on '_'.
    // Remove our own ID from the dmId string and strip leading/trailing separators.
    return dmId.replace(myId, '').replace(/^_+|_+$/g, '') || dmId;
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (channelId && content.length > 0) stopTyping(channelId);
      if (dmId && content.length > 0) {
        const rid = resolveRecipientId();
        if (rid) stopDmTyping(rid);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [content, channelId, dmId, stopTyping, stopDmTyping]);

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
      status: 'uploading'
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

  const updateNickname = async (nickname: string) => {
    try {
      const { selectedServer } = useServerStore();
      const { user } = useAuthStore();
      if (!selectedServer?.id || !user?.id) return;

      // Get token from localStorage as a fallback
      const token = localStorage.getItem('vox_token') || '';
      
      const res = await fetch(`${API_BASE}/api/servers/${selectedServer.id}/members/${user.id}/nickname`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? {} : {})
        },
        body: JSON.stringify({ nickname })
      });

      if (!res.ok) {
        throw new Error(`Failed to update nickname: ${res.status}`);
      }

      addToast('Nickname updated successfully', 'success');
    } catch (error: any) {
      addToast(`Failed to update nickname: ${error.message}`, 'error');
    }
  };

  const removePending = (id: string) =>
    setPending((prev) => prev.filter((p) => p.id !== id));

  const clearDone = () => setPending((prev) => prev.filter((p) => p.status !== 'done'));

  const startRecording = async () => {
    if (busy) return;
    setRecordingError(null);
    const ok = await voice.start();
    if (!ok) setRecordingError(voice.error || 'Could not start recording.');
  };

  const stopRecording = async (autoSend = false) => {
    const rec = await voice.stop();
    if (rec) await handleVoiceRecording(rec, autoSend);
  };

  const handleVoiceRecording = async (rec: VoiceRecording, autoSend = false) => {
    if (!rec.blob || rec.blob.size === 0) return;
    const ext = rec.mime.includes('mp4') ? 'm4a' : rec.mime.includes('mpeg') ? 'mp3' : rec.mime.includes('ogg') ? 'ogg' : 'webm';
    const file = new File([rec.blob], `voice-note.${ext}`, { type: rec.mime || 'audio/webm' });
    const entry: PendingAttachment = {
      id: `voice-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: `Voice note (${Math.round(rec.duration)}s)`,
      status: 'uploading'
    };
    setPending((prev) => [...prev, entry]);
    try {
      const attachment = await uploadChatAttachment(file);
      setPending((prev) =>
        prev.map((p) =>
          p.id === entry.id
            ? { ...p, status: 'done', attachment: { ...attachment, name: `Voice note (${Math.round(rec.duration)}s)` } }
            : p,
        ),
      );
      if (autoSend) {
        // Voice notes usually send immediately, with no text body required.
        const onErr = (err: any) => {
          playError();
          addToast(err?.message || 'Failed to send voice note.', 'error');
        };
        if (channelId) {
          sendMessageHTTP(channelId, '', replyingTo?.id, [{ ...attachment, name: `Voice note (${Math.round(rec.duration)}s)` }])
            .then((data) => { if (data?.message) useMessageStore.getState().addMessage(channelId, data.message); playMessageSend(); })
            .catch(onErr);
          stopTyping(channelId);
        } else if (dmId) {
          const rid = resolveRecipientId();
          if (rid) stopDmTyping(rid);
          sendDM(rid, '', [{ ...attachment, name: `Voice note (${Math.round(rec.duration)}s)` }]);
          playMessageSend();
        }
        setContent('');
        clearDone();
        if (replyingTo) setReplyingTo(null);
      }
    } catch (e: any) {
      setPending((prev) =>
        prev.map((p) =>
          p.id === entry.id ? { ...p, status: 'error', error: e?.message || 'Upload failed' } : p,
        ),
      );
      addToast('Failed to upload voice note.', 'error');
    }
  };

  // Listen for drag-drop file upload events from MessageArea
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.files && detail?.channelId === channelId) {
        addFiles(detail.files);
      }
    };
    window.addEventListener('vox:upload-files', handler);
    return () => window.removeEventListener('vox:upload-files', handler);
  }, [channelId]);

  const handleSlashCommand = async (cmd: SlashCommand) => {
    if (cmd.handleInParent) {
      setContent('');
      return;
    }

    if (cmd.args && cmd.args.length > 0) {
      // Command requires arguments
      const inputs: Record<string, string> = {};
      
      for (const arg of cmd.args) {
        const value = prompt(`${arg.label}: ${arg.placeholder}${arg.required ? ' *' : ''}`);
        if (arg.required && (!value || value.trim() === '')) {
          addToast(`${arg.label} is required`, 'error');
          setContent('');
          return;
        }
        inputs[arg.label.toLowerCase()] = value || '';
      }
      
      try {
        const result = await cmd.action('');
        if (result && typeof result === 'string') {
          if (result.startsWith('/')) {
            // Handle special commands like /nickname
            if (result.startsWith('/nickname ') && channelId) {
              const nickname = result.substring(10); // Remove '/nickname '
               await updateNickname(nickname);
            }
          } else {
            setContent(`${result}`);
          }
        }
      } catch (error) {
        addToast(`Error executing command: ${(error as Error)?.message}`, 'error');
      }
    } else {
      // Command doesn't require arguments
      try {
        const result = await cmd.action('');
        if (result && typeof result === 'string') {
          setContent(`${result}`);
        }
      } catch (error) {
        addToast(`Error executing command: ${(error as Error)?.message}`, 'error');
      }
    }
    
    setContent('');
  };

  const send = () => {
    if (!canSend) return;
    const text = content.trim();
    const attachments = readyAttachments;

    const onError = (err: any) => {
      playError();
      if (err?.rateLimited) {
        addToast(err.message || "You're doing that too fast. Slow down!", 'warning', { duration: 5000 });
      } else {
        addToast(err?.message || 'Message failed to send.', 'error');
      }
    };

    if (channelId) {
      sendMessageHTTP(channelId, text, replyingTo?.id, attachments)
        .then((data) => {
          if (data?.message) {
            useMessageStore.getState().addMessage(channelId, data.message);
          }
          playMessageSend();
        })
        .catch(onError);
      stopTyping(channelId);
    } else if (dmId) {
      const rid = resolveRecipientId();
      if (rid) stopDmTyping(rid);

      const onDmError = (err: any) => {
        playError();
        addToast(err?.message || 'Failed to send message.', 'error');
      };

      // Prefer socket; fall back to HTTP if the socket is not connected.
      const { connected } = useSocketStore.getState();
      if (connected) {
        const myId = (() => {
          try { return JSON.parse(localStorage.getItem('vox_user') || '{}')?.id || ''; } catch { return ''; }
        })();
        const recipientId = dmId.replace(myId, '').replace(/^_+|_+$/g, '') || dmId;
        sendDM(recipientId, text, attachments.length ? attachments : undefined);
        playMessageSend();
      } else {
        sendDMHTTP(dmId, text, attachments.length ? attachments : undefined)
          .then((data) => {
            if (data?.message) {
              useDMStore.getState().addMessage(data.message);
            }
            playMessageSend();
            setContent('');
            clearDone();
            if (replyingTo) setReplyingTo(null);
          })
          .catch(onDmError);
        return;
      }
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
    
    // Handle slash commands
    if (e.key === 'Enter' && !e.shiftKey && slashState.open) {
      e.preventDefault();
      const cmd = COMMANDS.find(c => c.id === slashState.query || c.name.toLowerCase() === slashState.query.toLowerCase());
      if (cmd) {
        handleSlashCommand(cmd);
      } else {
        // If no command found, treat as regular message
        send();
      }
      return;
    }
    
    if (e.key === 'Escape' && (mentionState.open || slashState.open)) {
      // Close mention or slash dropdown on Escape
      setContent(content.slice(0, mentionState.start)); // Reset content to before mention/slash
      return;
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    } else if (channelId) {
      startTyping(channelId);
    } else if (dmId) {
      const rid = resolveRecipientId();
      if (rid) startDmTyping(rid);
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = '';
  };

  return (
    <div className="message-input-wrapper" style={{ position: 'relative', overflow: 'visible' }}>
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
            color: 'var(--ash)'
          }}
        >
          <span style={{ color: 'var(--chaos)', lineHeight: 1 }}>↩️</span>
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
              lineHeight: 1
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
      
      {slashState.open && (
        <SlashCommandMenu
          query={slashState.query}
          onSelect={handleSlashCommand}
          onClose={() => {
            // Close slash command menu by resetting content to before the slash
            setContent(content.slice(0, slashState.start));
          }}
        />
      )}

      {voice.recording && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 12px',
            marginBottom: '6px',
            background: 'var(--obsidian)',
            border: '1px solid var(--blood, #c0392b)',
            borderRadius: '8px'
          }}
        >
          <span style={{ fontSize: '10px', color: '#ff6b6b', animation: 'vox-pulse 1.2s infinite' }}>🔴</span>
          <span style={{ color: 'var(--ghost-white)' }}>Recording…</span>
          <span style={{ fontFamily: "'Share Tech Mono', monospace", color: 'var(--ash)' }}>
            {Math.floor(voice.elapsed / 60)}:{String(Math.floor(voice.elapsed % 60)).padStart(2, '0')}
          </span>
          <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, (voice.elapsed / 300) * 100)}%`,
                background: 'var(--blood, #c0392b)',
                transition: 'width 0.2s linear'
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => voice.cancel()}
            title="Discard recording"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--ash)',
              cursor: 'pointer',
              fontSize: '16px'
            }}
            aria-label="Discard recording"
          >
            ✕
          </button>
          <button
            type="button"
            onClick={() => stopRecording(true)}
            style={{
              background: 'var(--phantom)',
              color: 'var(--shadow)',
              border: '1px solid var(--rim)',
              borderRadius: '4px',
              padding: '4px 10px',
              cursor: 'pointer',
              fontFamily: "'Bebas Neue', sans-serif",
              letterSpacing: '0.05em'
            }}
          >
            SEND
          </button>
        </div>
      )}

      {recordingError && (
        <div style={{ padding: '4px 12px', color: '#ff6b6b', fontSize: 12 }}>{recordingError}</div>
      )}

      <EmojiPicker
        open={emojiOpen}
        onClose={() => setEmojiOpen(false)}
        onSelect={insertEmoji}
        serverEmojis={serverEmojis}
      />

      {pending.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            padding: '6px 10px 0'
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
                maxWidth: '220px'
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
                  color: p.status === 'error' ? '#ff6b6b' : undefined
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
                  lineHeight: 1
                }}
                aria-label={`Remove ${p.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          className="angular-input"
          placeholder={channelId ? 'Message #channel' : 'Send a direct message...'}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label={channelId ? `Message #${selectedServer?.name || 'channel'}` : 'Send a direct message'}
          style={{ paddingRight: '96px' }}
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
          right: '80px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: emojiOpen ? 'var(--chaos)' : 'var(--ash, #8a93a3)',
          fontSize: '18px',
          padding: 0
        }}
      >
        😊
      </button>

      <button
        type="button"
        onClick={() => (voice.recording ? stopRecording() : startRecording())}
        className="input-action-btn"
        title={voice.recording ? 'Stop recording' : 'Record a voice note (Vox shortcut)'}
        aria-label={voice.recording ? 'Stop recording' : 'Record a voice note'}
        style={{
          position: 'absolute',
          right: '56px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: voice.recording ? 'var(--blood, #c0392b)' : 'none',
          border: 'none',
          cursor: 'pointer',
          color: voice.recording ? '#fff' : 'var(--ash, #8a93a3)',
          fontSize: '18px',
          padding: 0,
          animation: voice.recording ? 'vox-pulse 1.2s infinite' : 'none'
        }}
      >
        🎤
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
          right: '32px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          cursor: busy ? 'wait' : 'pointer',
          color: 'var(--ash, #8a93a3)',
          fontSize: '18px',
          padding: 0,
          opacity: busy ? 0.5 : 1
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
            transition: 'color 0.2s ease'
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
          transition: 'background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease'
        }}
      >
        ➤
      </button>
      </div>

    </div>
  );
});

export default MessageInput;
