import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useUiStore } from '../stores/uiStore';
import {
  fetchAdminStats,
  fetchAllUsers,
  fetchAllServers,
  banUserGlobally,
  unbanUserGlobally,
  deleteUser,
  deleteServer,
  updateUserRole,
  type AdminStats,
  type AdminUser,
  type AdminServer,
} from '../api/admin';
import { ShieldAlert, Users, Server, Radio, Activity, Search, X, Ban, Trash2, RotateCcw } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  ONLINE: 'var(--toxic)',
  IDLE: '#d9c98d',
  DND: 'var(--blood)',
  OFFLINE: 'var(--shadow)',
};

const ROLE_OPTIONS = ['MEMBER', 'MODERATOR', 'ADMIN'];

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div
      className="vox-card"
      style={{
        padding: '16px 20px',
        borderLeft: `2px solid ${accent}`,
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: '10px', color: 'var(--ash)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--ghost-white)', fontFamily: "'Share Tech Mono', monospace", marginTop: 4 }}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useUiStore();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user && ['ADMIN', 'FOUNDER'].includes(user.role as string);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [tab, setTab] = useState<'USERS' | 'SERVERS'>('USERS');
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [servers, setServers] = useState<AdminServer[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const loadStats = useCallback(() => {
    fetchAdminStats().then(setStats).catch(() => addToast('Failed to load admin stats.', 'error'));
  }, [addToast]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Debounce search so we don't fire a request per keystroke.
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  // Guard against stale responses: rapid tab/page/search changes can leave
  // multiple fetches in flight; only the latest one may write state.
  const loadSeq = useRef(0);
  const loadTab = useCallback(async () => {
    const seq = ++loadSeq.current;
    setLoading(true);
    try {
      if (tab === 'USERS') {
        const data = await fetchAllUsers(page, debouncedQuery || undefined);
        if (seq !== loadSeq.current) return;
        setUsers(data.users);
        setPages(data.pages);
        setTotal(data.total);
      } else {
        const data = await fetchAllServers(page, debouncedQuery || undefined);
        if (seq !== loadSeq.current) return;
        setServers(data.servers);
        setPages(data.pages);
        setTotal(data.total);
      }
    } catch {
      if (seq === loadSeq.current) addToast('Failed to load admin data.', 'error');
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [tab, debouncedQuery, page, addToast]);

  useEffect(() => {
    loadTab();
  }, [loadTab]);

  const runAction = async (action: Promise<unknown>, okMsg: string) => {
    try {
      await action;
      addToast(okMsg, 'success');
      loadStats();
      loadTab();
    } catch {
      addToast('Action failed.', 'error');
    }
  };

  const maxDayCount = useMemo(() => Math.max(1, ...(stats?.usersByDay || []).map((d: { date: string; count: number }) => d.count)), [stats]);

  if (!isAdmin) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ash)' }}>
        <div style={{ textAlign: 'center' }}>
          <ShieldAlert size={48} style={{ color: 'var(--blood)', marginBottom: 12 }} />
          <div style={{ color: 'var(--ghost-white)', fontSize: 18, fontWeight: 700 }}>ACCESS DENIED</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Admin clearance required.</div>
        </div>
      </div>
    );
  }

  return (
    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', background: 'var(--abyss)' }}>
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 20px',
          borderBottom: '1px solid var(--rim)',
          background: 'var(--obsidian)',
        }}
      >
        <button type="button" onClick={() => navigate('/friends')} aria-label="Close admin" style={{ background: 'none', border: 'none', color: 'var(--ash)', cursor: 'pointer' }}>
          <X size={20} />
        </button>
        <ShieldAlert size={18} color="var(--blood)" />
        <h1 style={{ fontSize: 16, color: 'var(--ghost-white)', fontFamily: "'Share Tech Mono', monospace", margin: 0 }}>ADMIN OVERWATCH</h1>
        <span style={{ fontSize: 11, color: 'var(--ash)', background: 'rgba(216,74,90,0.12)', border: '1px solid rgba(216,74,90,0.3)', padding: '2px 8px', borderRadius: 4 }}>
          {user?.role}
        </span>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          <StatCard label="Users" value={stats?.totalUsers || 0} accent="var(--toxic)" />
          <StatCard label="Servers" value={stats?.totalServers || 0} accent="var(--void-purple)" />
          <StatCard label="Messages" value={stats?.totalMessages || 0} accent="var(--chaos)" />
          <StatCard label="Online" value={stats?.onlineUsers || 0} accent="#4af3ff" />
          <StatCard label="DMs" value={stats?.totalDms || 0} accent="#d9c98d" />
          <StatCard label="Active servers" value={stats?.activeServers || 0} accent="var(--discord-blurple)" />
        </div>

        {/* Growth chart */}
        {stats && stats.usersByDay.length > 0 && (
          <div className="vox-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--ash)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 12 }}>
              NEW USERS — LAST 30 DAYS
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 64 }}>
              {stats.usersByDay.map((d: { date: string; count: number }) => (
                <div
                  key={d.date}
                  title={`${d.date}: ${d.count}`}
                  style={{
                    flex: 1,
                    height: `${Math.max(4, (d.count / maxDayCount) * 100)}%`,
                    background: d.count > 0 ? 'var(--toxic)' : 'rgba(74,194,82,0.15)',
                    minWidth: 2,
                    borderRadius: '1px 1px 0 0',
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tabs + table */}
        <div className="vox-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['USERS', 'SERVERS'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setTab(t); setPage(1); setQuery(''); }}
                  style={{
                    padding: '6px 14px',
                    background: tab === t ? 'rgba(216,74,90,0.12)' : 'transparent',
                    border: tab === t ? '1px solid rgba(216,74,90,0.4)' : '1px solid var(--rim)',
                    borderRadius: 4,
                    color: tab === t ? 'var(--chaos)' : 'var(--ash)',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: "'Share Tech Mono', monospace",
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {t === 'USERS' ? <Users size={12} /> : <Server size={12} />}
                  {t} ({total.toLocaleString()})
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', minWidth: 220 }}>
              <Search size={14} color="var(--ash)" />
              <input
                className="angular-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${tab === 'USERS' ? 'users' : 'servers'}...`}
                style={{ flex: 1 }}
              />
            </div>
          </div>

          {loading && <div style={{ textAlign: 'center', padding: 24 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>}

          {!loading && tab === 'USERS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {users.length === 0 && <div style={{ color: 'var(--ash)', fontSize: 13, textAlign: 'center', padding: 24 }}>No users found.</div>}
              {users.map((u) => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--dark-matter)', border: '1px solid var(--rim)', borderRadius: 6, flexWrap: 'wrap' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: u.avatarUrl ? 'transparent' : 'var(--obsidian)', overflow: 'hidden', flexShrink: 0, border: `1px solid ${STATUS_COLORS[u.status] || 'var(--rim)'}` }}>
                    {u.avatarUrl ? <img src={u.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                  </div>
                  <div style={{ minWidth: 0, flex: '1 1 160px' }}>
                    <div style={{ color: 'var(--ghost-white)', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.displayName || u.username}
                      <span style={{ color: 'var(--shadow)', fontWeight: 400 }}> @{u.username}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ash)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--ash)' }}>
                    <Radio size={11} /> {u.status}
                  </div>
                  <select
                    value={u.role}
                    disabled={busy === u.id}
                    onChange={(e) => {
                      const next = e.target.value;
                      if (next === u.role) return;
                      setBusy(u.id);
                      runAction(updateUserRole(u.id, next), `Role → ${next}`).finally(() => setBusy(null));
                    }}
                    style={{
                      background: 'var(--obsidian)', border: '1px solid var(--rim)', borderRadius: 4,
                      color: 'var(--ghost-white)', fontSize: 11, padding: '4px 6px', cursor: 'pointer',
                    }}
                  >
                    {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <div style={{ fontSize: 11, color: 'var(--shadow)' }}>{u._count?.serverMembers ?? 0} servers · {u._count?.channelMessages ?? 0} msgs</div>
                  <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                    <button
                      type="button"
                      title={u.status === 'OFFLINE' ? 'Unban' : 'Ban (100-year lockout)'}
                      disabled={busy === u.id}
                      onClick={() => {
                        setBusy(u.id);
                        const act = u.status === 'OFFLINE' ? unbanUserGlobally(u.id) : banUserGlobally(u.id);
                        runAction(act, u.status === 'OFFLINE' ? 'Unbanned.' : 'Banned.').finally(() => setBusy(null));
                      }}
                      style={{
                        padding: '5px 10px', background: 'transparent', border: '1px solid var(--rim)', borderRadius: 4,
                        color: 'var(--ash)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      {u.status === 'OFFLINE' ? <RotateCcw size={12} /> : <Ban size={12} />}
                      {u.status === 'OFFLINE' ? 'UNBAN' : 'BAN'}
                    </button>
                    <button
                      type="button"
                      title="Delete user permanently"
                      disabled={busy === u.id}
                      onClick={() => {
                        if (!window.confirm(`Permanently delete @${u.username}? This cannot be undone.`)) return;
                        setBusy(u.id);
                        runAction(deleteUser(u.id), 'User deleted.').finally(() => setBusy(null));
                      }}
                      style={{
                        padding: '5px 10px', background: 'transparent', border: '1px solid var(--blood)', borderRadius: 4,
                        color: 'var(--blood)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      <Trash2 size={12} /> DEL
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && tab === 'SERVERS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {servers.length === 0 && <div style={{ color: 'var(--ash)', fontSize: 13, textAlign: 'center', padding: 24 }}>No servers found.</div>}
              {servers.map((s) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--dark-matter)', border: '1px solid var(--rim)', borderRadius: 6, flexWrap: 'wrap' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--obsidian)', border: '1px solid var(--rim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--chaos)', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                    {s.name?.charAt(0)?.toUpperCase() || '#'}
                  </div>
                  <div style={{ minWidth: 0, flex: '1 1 180px' }}>
                    <div style={{ color: 'var(--ghost-white)', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ash)' }}>
                      owner <strong style={{ color: 'var(--text-secondary)' }}>{s.owner?.username}</strong> · created {new Date(s.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ash)' }}>
                    <Activity size={11} /> {s._count?.members ?? 0} members · {s._count?.channels ?? 0} channels · {s._count?.messages ?? 0} messages
                  </div>
                  <button
                    type="button"
                    disabled={busy === s.id}
                    onClick={() => {
                      if (!window.confirm(`Delete server "${s.name}"? This cannot be undone.`)) return;
                      setBusy(s.id);
                      runAction(deleteServer(s.id), 'Server deleted.').finally(() => setBusy(null));
                    }}
                    style={{
                      padding: '5px 10px', marginLeft: 'auto', background: 'transparent', border: '1px solid var(--blood)', borderRadius: 4,
                      color: 'var(--blood)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    <Trash2 size={12} /> DEL
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{ padding: '4px 10px', background: 'transparent', border: '1px solid var(--rim)', borderRadius: 4, color: 'var(--ash)', cursor: page <= 1 ? 'not-allowed' : 'pointer', fontSize: 11 }}
              >
                ←
              </button>
              <span style={{ fontSize: 11, color: 'var(--ash)' }}>PAGE {page} / {pages}</span>
              <button
                type="button"
                disabled={page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                style={{ padding: '4px 10px', background: 'transparent', border: '1px solid var(--rim)', borderRadius: 4, color: 'var(--ash)', cursor: page >= pages ? 'not-allowed' : 'pointer', fontSize: 11 }}
              >
                →
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default Admin;
