import React, { useCallback, useEffect, useState } from 'react';
import { StickyNote, Trash2, Check, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BackHeader from '../../components/settings/BackHeader';
import SectionHeader from '../../components/settings/SectionHeader';
import VoxCard from '../../components/settings/VoxCard';
import { useUiStore } from '../../stores/uiStore';
import { fetchMyNotes, setUserNote, deleteUserNote, type UserNote } from '../../api/notes';

const NotesPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useUiStore();
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await fetchMyNotes();
      setNotes(data.notes || []);
    } catch {
      addToast('Could not load your notes.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (note: UserNote) => {
    if (!draft.trim()) return;
    try {
      await setUserNote(note.targetId, draft);
      await load();
      setEditingId(null);
      addToast('Note updated.', 'success');
    } catch {
      addToast('Failed to save note.', 'error');
    }
  };

  const remove = async (note: UserNote) => {
    if (!window.confirm(`Delete your note about ${note.target?.displayName || note.target?.username || 'this user'}?`)) return;
    try {
      await deleteUserNote(note.targetId);
      await load();
      addToast('Note deleted.', 'info');
    } catch {
      addToast('Failed to delete note.', 'error');
    }
  };

  return (
    <main className="settings-page">
      <BackHeader title="MY NOTES" onBack={() => navigate('/settings')} />

      <div className="settings-content">
        <SectionHeader title="PRIVATE NOTES" />
        <p style={{ fontSize: 13, color: 'var(--ash)', margin: '0 0 16px', lineHeight: 1.5 }}>
          Notes are private to you and are shown when you open someone&apos;s profile. Add notes from any user&apos;s profile popup — this page lets you review, edit, and delete them all.
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : notes.length === 0 ? (
          <VoxCard>
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--ash)' }}>
              <StickyNote size={32} style={{ marginBottom: 10, color: 'var(--shadow)' }} />
              <div style={{ fontSize: 14, color: 'var(--ghost-white)', fontWeight: 600 }}>No notes yet.</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>Open a user&apos;s profile and tap &quot;Add a note&quot; to jot something down.</div>
            </div>
          </VoxCard>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {notes.map((n) => (
              <VoxCard key={n.id}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 4 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--obsidian)', border: '1px solid var(--rim)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--chaos)', fontWeight: 700 }}>
                    {n.target?.avatarUrl ? (
                      <img src={n.target.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      (n.target?.displayName || n.target?.username || '?').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: 'var(--ghost-white)', fontWeight: 600, fontSize: 14 }}>
                        {n.target?.displayName || n.target?.username || 'Unknown user'}
                      </span>
                      <span style={{ color: 'var(--shadow)', fontSize: 11 }}>
                        @{n.target?.username} · updated {new Date(n.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {editingId === n.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                        <textarea
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          rows={3}
                          maxLength={500}
                          autoFocus
                          style={{
                            width: '100%', background: 'var(--dark-matter)', border: '1px solid var(--rim)', borderRadius: 6,
                            color: 'var(--ghost-white)', fontSize: 13, padding: '10px 12px', resize: 'vertical', outline: 'none', fontFamily: 'inherit',
                          }}
                        />
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => { setEditingId(null); setDraft(''); }}
                            style={{ padding: '5px 12px', background: 'transparent', border: '1px solid var(--rim)', borderRadius: 4, color: 'var(--ash)', cursor: 'pointer', fontSize: 11 }}
                          >
                            CANCEL
                          </button>
                          <button
                            type="button"
                            onClick={() => save(n)}
                            disabled={!draft.trim()}
                            className="angular-button primary"
                            style={{ padding: '5px 14px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}
                          >
                            <Check size={12} /> SAVE
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 6 }}>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, flex: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{n.content}</p>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button
                            type="button"
                            title="Edit note"
                            onClick={() => { setEditingId(n.id); setDraft(n.content); }}
                            style={{ padding: '4px 8px', background: 'transparent', border: '1px solid var(--rim)', borderRadius: 4, color: 'var(--ash)', cursor: 'pointer', display: 'flex' }}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            title="Delete note"
                            onClick={() => remove(n)}
                            style={{ padding: '4px 8px', background: 'transparent', border: '1px solid var(--blood)', borderRadius: 4, color: 'var(--blood)', cursor: 'pointer', display: 'flex' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </VoxCard>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default NotesPage;
