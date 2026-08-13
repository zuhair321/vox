import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchForumPosts, createForumPost, fetchForumPost, replyToForumPost, deleteForumPost, type ForumPost, type ForumReply } from '../../api/forums';
import { useUiStore } from '../../stores/uiStore';
import { useSocketStore } from '../../stores/socketStore';
import { useAuthStore } from '../../stores/authStore';
import { MessageSquare, Trash2, ArrowLeft, CornerDownRight, Send, Tag } from 'lucide-react';

const ForumView: React.FC<{ channelId: string }> = ({ channelId }) => {
  const { addToast } = useUiStore();
  const socket = useSocketStore();
  const myId = useAuthStore((s) => s.user?.id);

  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);

  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ post: ForumPost; replies: ForumReply[] } | null>(null);
  const [opening, setOpening] = useState(false);
  const [replyDraft, setReplyDraft] = useState('');
  const [replying, setReplying] = useState(false);

  // `silent` is used for realtime refreshes so the list doesn't flash its
  // loading state on every live post/reply event.
  const loadPosts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await fetchForumPosts(channelId);
      setPosts(data.posts || []);
    } catch {
      if (!silent) addToast('Failed to load forum posts.', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [channelId, addToast]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Live refresh: new posts for THIS channel arrive via socket. Filter by
  // channelId so events from other channels don't trigger useless refetches.
  useEffect(() => {
    if (!socket.socket) return;
    const handler = (payload: { post?: { channelId?: string } }) => {
      if (!payload?.post?.channelId || payload.post.channelId === channelId) {
        loadPosts(true);
      }
    };
    socket.socket.on('forum:post', handler);
    return () => {
      socket.socket?.off('forum:post', handler);
    };
  }, [socket.socket, loadPosts, channelId]);

  const handleCreate = async () => {
    const body = draft.trim();
    if (!body) return;
    setPosting(true);
    try {
      await createForumPost(channelId, body);
      setDraft('');
      await loadPosts();
      addToast('Post published.', 'success');
    } catch {
      addToast('Failed to publish post.', 'error');
    } finally {
      setPosting(false);
    }
  };

  // Guard against out-of-order responses when the user clicks posts in quick
  // succession: only the most recent open request may write the detail state.
  const openSeq = useRef(0);
  const openPost = useCallback(async (postId: string) => {
    const seq = ++openSeq.current;
    setOpenPostId(postId);
    setOpening(true);
    try {
      const data = await fetchForumPost(postId);
      if (seq !== openSeq.current) return;
      setDetail(data);
    } catch {
      if (seq !== openSeq.current) return;
      addToast('Failed to load post.', 'error');
      setOpenPostId(null);
    } finally {
      if (seq === openSeq.current) setOpening(false);
    }
  }, [addToast]);

  const handleReply = async () => {
    const body = replyDraft.trim();
    if (!body || !openPostId) return;
    setReplying(true);
    try {
      await replyToForumPost(openPostId, body);
      setReplyDraft('');
      const data = await fetchForumPost(openPostId);
      setDetail(data);
      loadPosts();
    } catch {
      addToast('Failed to send reply.', 'error');
    } finally {
      setReplying(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!window.confirm('Delete this post and all replies?')) return;
    try {
      await deleteForumPost(postId);
      addToast('Post deleted.', 'info');
      if (openPostId === postId) {
        setOpenPostId(null);
        setDetail(null);
      }
      await loadPosts();
    } catch {
      addToast('Failed to delete post.', 'error');
    }
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(iso).toLocaleDateString();
  };

  const Avatar = ({ url, name }: { url?: string | null; name: string }) => (
    <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--obsidian)', border: '1px solid var(--rim)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--chaos)', fontWeight: 700, fontSize: 14 }}>
      {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : name?.charAt(0)?.toUpperCase()}
    </div>
  );

  if (openPostId && (detail || opening)) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <button
            type="button"
            onClick={() => { setOpenPostId(null); setDetail(null); }}
            style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid var(--rim)', borderRadius: 4, color: 'var(--ash)', padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontFamily: "'Share Tech Mono', monospace" }}
          >
            <ArrowLeft size={14} /> BACK TO POSTS
          </button>

        {opening && !detail ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : null}

        {/* Post + replies (rendered once the detail fetch resolves) */}
        {detail && (<>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="vox-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <Avatar url={detail.post.author?.avatarUrl} name={detail.post.author?.displayName || detail.post.author?.username || '?'} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--ghost-white)', fontWeight: 700, fontSize: 14 }}>
                    {detail.post.author?.displayName || detail.post.author?.username || 'Unknown'}
                  </span>
                  <span style={{ color: 'var(--shadow)', fontSize: 11 }}>{timeAgo(detail.post.createdAt)}</span>
                  {detail.post.edited && <span style={{ color: 'var(--shadow)', fontSize: 10 }}>(edited)</span>}
                  {detail.post.tags?.map((t) => (
                    <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--chaos)', border: '1px solid rgba(216,74,90,0.3)', background: 'rgba(216,74,90,0.08)', padding: '2px 8px', borderRadius: 10 }}>
                      <Tag size={9} /> {t}
                    </span>
                  ))}
                  {detail.post.author?.id === myId && (
                    <button
                      type="button"
                      onClick={() => handleDelete(detail.post.id)}
                      title="Delete post"
                      style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--blood)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
                    >
                      <Trash2 size={13} /> DELETE
                    </button>
                  )}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginTop: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {detail.post.body}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Replies */}
          <div style={{ fontSize: 12, color: 'var(--ash)', fontWeight: 700, letterSpacing: '0.08em' }}>
            {detail.replies.length} REPL{detail.replies.length === 1 ? 'Y' : 'IES'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {detail.replies.length === 0 && <div style={{ color: 'var(--shadow)', fontSize: 13 }}>No replies yet. Be the first.</div>}
            {detail.replies.map((r) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--dark-matter)', border: '1px solid var(--rim)', borderRadius: 8, padding: '12px 14px' }}>
                <Avatar url={r.author?.avatarUrl} name={r.author?.displayName || r.author?.username || '?'} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--ghost-white)', fontWeight: 600, fontSize: 13 }}>{r.author?.displayName || r.author?.username || 'Unknown'}</span>
                    <span style={{ color: 'var(--shadow)', fontSize: 11 }}>{timeAgo(r.createdAt)}</span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5, marginTop: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{r.body}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Reply box */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', paddingTop: 4 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: 'var(--dark-matter)', border: '1px solid var(--rim)', borderRadius: 8, padding: '10px 14px' }}>
              <CornerDownRight size={14} color="var(--ash)" />
              <textarea
                value={replyDraft}
                onChange={(e) => setReplyDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                placeholder="Reply to this post..."
                rows={2}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--ghost-white)', fontSize: 13, resize: 'none', fontFamily: 'inherit' }}
              />
              <button
                type="button"
                onClick={handleReply}
                disabled={replying || !replyDraft.trim()}
                className="angular-button primary"
                style={{ padding: '6px 14px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, opacity: replying || !replyDraft.trim() ? 0.5 : 1 }}
              >
                <Send size={12} /> {replying ? 'SENDING...' : 'REPLY'}
              </button>
            </div>
          </div>
          </>)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Create box */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--dark-matter)', border: '1px solid var(--rim)', borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--ash)', fontWeight: 700, letterSpacing: '0.08em' }}>NEW POST</div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCreate(); } }}
            placeholder="Start a discussion..."
            rows={3}
            style={{ width: '100%', background: 'var(--obsidian)', border: '1px solid var(--rim)', borderRadius: 6, color: 'var(--ghost-white)', fontSize: 13, padding: '10px 12px', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleCreate}
              disabled={posting || !draft.trim()}
              className="angular-button primary"
              style={{ padding: '7px 18px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, opacity: posting || !draft.trim() ? 0.5 : 1 }}
            >
              <MessageSquare size={12} /> {posting ? 'POSTING...' : 'PUBLISH POST'}
            </button>
          </div>
        </div>

        {/* Post list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--shadow)', padding: 40, fontSize: 13 }}>
            No posts yet. Start the first discussion above.
          </div>
        ) : (
          posts.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
              className="vox-card"
              onClick={() => openPost(p.id)}
              style={{ padding: 16, cursor: 'pointer', border: '1px solid var(--rim)', transition: 'border-color 0.15s, transform 0.15s' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <Avatar url={p.author?.avatarUrl} name={p.author?.displayName || p.author?.username || '?'} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--ghost-white)', fontWeight: 600, fontSize: 13 }}>
                      {p.author?.displayName || p.author?.username || 'Unknown'}
                    </span>
                    <span style={{ color: 'var(--shadow)', fontSize: 11 }}>{timeAgo(p.createdAt)}</span>
                    {p.tags?.map((t) => (
                      <span key={t} style={{ fontSize: 10, color: 'var(--chaos)', border: '1px solid rgba(216,74,90,0.3)', background: 'rgba(216,74,90,0.08)', padding: '1px 8px', borderRadius: 10 }}>{t}</span>
                    ))}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5, marginTop: 6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {p.body}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, color: 'var(--ash)', fontSize: 11 }}>
                    <MessageSquare size={12} /> {p._count?.threadMessages ?? 0} replies
                  </div>
                </div>
                {p.author?.id === myId && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                    title="Delete post"
                    style={{ background: 'transparent', border: 'none', color: 'var(--blood)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default ForumView;
