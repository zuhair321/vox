import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, MoreVertical, Shield, Ban, Trash2,
  Mail, Calendar, Key, Globe, ChevronRight, X,
  Eye, EyeOff, UserCheck, Clock, Server as ServerIcon
} from 'lucide-react';
import { useAdminStore } from '../stores/adminStore';
import { Avatar } from '../components/ui/Avatar';
import { Badge, StatusBadge, RoleBadge } from '../components/ui/Badge';
import { SearchInput } from '../components/ui/SearchInput';
import { Pagination } from '../components/ui/Pagination';
import { Modal } from '../components/ui/Modal';
import { formatDate, formatRelative, formatNumber } from '../utils/formatters';
import { useToastStore } from '../components/ui/Toast';
import type { User, UserDetail } from '../api/admin';

export function UsersPage() {
  const {
    users, usersTotal, usersPage, usersPages, selectedUser,
    loading, fetchUsers, fetchUser, updateUser, banUser, unbanUser, deleteUser
  } = useAdminStore();
  const { addToast } = useToastStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ userId: string; x: number; y: number } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: string; userId: string } | null>(null);

  useEffect(() => {
    fetchUsers({ search, status: statusFilter, role: roleFilter });
  }, [search, statusFilter, roleFilter]);

  useEffect(() => {
    const handler = () => setContextMenu(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  const handleAction = async (type: string, userId: string) => {
    setConfirmAction(null);
    try {
      switch (type) {
        case 'ban':
          await banUser(userId);
          addToast('success', 'User banned');
          break;
        case 'unban':
          await unbanUser(userId);
          addToast('success', 'User unbanned');
          break;
        case 'delete':
          await deleteUser(userId);
          addToast('success', 'User deleted');
          break;
        case 'promote':
          await updateUser(userId, { role: 'ADMIN' });
          addToast('success', 'User promoted to admin');
          break;
        case 'demote':
          await updateUser(userId, { role: 'MEMBER' });
          addToast('success', 'User demoted to member');
          break;
      }
    } catch (e: any) {
      addToast('error', e.message);
    }
  };

  const openDetail = (userId: string) => {
    setSelectedUserId(userId);
    fetchUser(userId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-sm text-gray-400 mt-1">{formatNumber(usersTotal)} registered users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by username, email, or display name..."
          className="flex-1 min-w-[250px]"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-surface-2 border border-surface-4 rounded-xl px-3 py-2.5 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="ONLINE">Online</option>
          <option value="IDLE">Idle</option>
          <option value="DND">Do Not Disturb</option>
          <option value="OFFLINE">Offline</option>
        </select>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="bg-surface-2 border border-surface-4 rounded-xl px-3 py-2.5 text-sm"
        >
          <option value="">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="MEMBER">Member</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-4/50 bg-surface-2/50">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">User</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Email</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Role</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">2FA</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Joined</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {users.map((user, i) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="table-row cursor-pointer"
                    onClick={() => openDetail(user.id)}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar src={user.avatarUrl} alt={user.username} size="sm" status={user.status} />
                        <div>
                          <p className="text-sm font-medium text-white">{user.displayName || user.username}</p>
                          <p className="text-xs text-gray-500">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-400">{user.email}</td>
                    <td className="py-3 px-4"><RoleBadge role={user.role} /></td>
                    <td className="py-3 px-4"><StatusBadge status={user.status} /></td>
                    <td className="py-3 px-4">
                      {user.twoFactorEnabled ? (
                        <Badge variant="success"><Shield size={10} className="mr-1" /> Enabled</Badge>
                      ) : (
                        <Badge variant="default">Disabled</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-400">{formatDate(user.createdAt)}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setContextMenu({ userId: user.id, x: e.clientX, y: e.clientY });
                        }}
                        className="btn-ghost p-1.5"
                      >
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {users.length === 0 && !loading.users && (
          <div className="text-center py-12">
            <Users size={40} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-500">No users found</p>
          </div>
        )}

        {loading.users && (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Pagination */}
      <Pagination
        page={usersPage}
        pages={usersPages}
        onChange={p => fetchUsers({ search, status: statusFilter, role: roleFilter, page: p })}
        className="justify-center"
      />

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed glass-panel shadow-2xl shadow-black/40 py-2 w-48 z-50"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => { openDetail(contextMenu.userId); setContextMenu(null); }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-surface-3"
            >
              <Eye size={14} /> View Details
            </button>
            <button
              onClick={() => { setConfirmAction({ type: 'promote', userId: contextMenu.userId }); setContextMenu(null); }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-surface-3"
            >
              <Shield size={14} /> Promote to Admin
            </button>
            <button
              onClick={() => { setConfirmAction({ type: 'demote', userId: contextMenu.userId }); setContextMenu(null); }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-surface-3"
            >
              <UserCheck size={14} /> Demote to Member
            </button>
            <div className="border-t border-surface-4 my-1" />
            <button
              onClick={() => { setConfirmAction({ type: 'ban', userId: contextMenu.userId }); setContextMenu(null); }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-warning hover:bg-warning/5"
            >
              <Ban size={14} /> Ban User
            </button>
            <button
              onClick={() => { setConfirmAction({ type: 'delete', userId: contextMenu.userId }); setContextMenu(null); }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-danger/5"
            >
              <Trash2 size={14} /> Delete User
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Modal */}
      <Modal
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title="Confirm Action"
        size="sm"
      >
        <p className="text-sm text-gray-300 mb-4">
          Are you sure you want to {confirmAction?.type} this user? This action may be irreversible.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setConfirmAction(null)} className="btn-ghost">Cancel</button>
          <button
            onClick={() => confirmAction && handleAction(confirmAction.type, confirmAction.userId)}
            className={confirmAction?.type === 'delete' ? 'btn-danger' : 'btn-primary'}
          >
            Confirm
          </button>
        </div>
      </Modal>

      {/* User Detail Modal */}
      <Modal
        open={!!selectedUserId}
        onClose={() => { setSelectedUserId(null); }}
        title="User Details"
        size="xl"
      >
        {selectedUser ? (
          <UserDetailPanel user={selectedUser} />
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        )}
      </Modal>
    </div>
  );
}

function UserDetailPanel({ user }: { user: UserDetail }) {
  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="flex items-start gap-4">
        <Avatar src={user.avatarUrl} alt={user.username} size="xl" status={user.status} />
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white">{user.displayName || user.username}</h3>
          <p className="text-sm text-gray-400">@{user.username}</p>
          <div className="flex items-center gap-2 mt-2">
            <RoleBadge role={user.role} />
            <StatusBadge status={user.status} />
            {user.twoFactorEnabled && <Badge variant="success">2FA</Badge>}
            {user.emailVerified && <Badge variant="info">Verified</Badge>}
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2.5 p-3 rounded-lg bg-surface-3/50">
          <Mail size={16} className="text-gray-500" />
          <div>
            <p className="text-[10px] text-gray-500 uppercase">Email</p>
            <p className="text-sm text-white">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 p-3 rounded-lg bg-surface-3/50">
          <Calendar size={16} className="text-gray-500" />
          <div>
            <p className="text-[10px] text-gray-500 uppercase">Joined</p>
            <p className="text-sm text-white">{formatDate(user.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 p-3 rounded-lg bg-surface-3/50">
          <Clock size={16} className="text-gray-500" />
          <div>
            <p className="text-[10px] text-gray-500 uppercase">Last Login</p>
            <p className="text-sm text-white">{user.lastLoginAt ? formatRelative(user.lastLoginAt) : 'Never'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 p-3 rounded-lg bg-surface-3/50">
          <Globe size={16} className="text-gray-500" />
          <div>
            <p className="text-[10px] text-gray-500 uppercase">Status</p>
            <p className="text-sm text-white">{user.status}</p>
          </div>
        </div>
      </div>

      {/* Bio */}
      {user.bio && (
        <div className="p-3 rounded-lg bg-surface-3/50">
          <p className="text-[10px] text-gray-500 uppercase mb-1">Bio</p>
          <p className="text-sm text-gray-300">{user.bio}</p>
        </div>
      )}

      {/* Stats */}
      {user._count && (
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-surface-3/50">
            <p className="text-xl font-bold text-accent">{formatNumber(user._count.channelMessages)}</p>
            <p className="text-xs text-gray-500">Messages</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-surface-3/50">
            <p className="text-xl font-bold text-purple-400">{formatNumber(user._count.serverMembers)}</p>
            <p className="text-xs text-gray-500">Servers</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-surface-3/50">
            <p className="text-xl font-bold text-pink-400">{formatNumber(user._count.dmsSent)}</p>
            <p className="text-xs text-gray-500">DMs</p>
          </div>
        </div>
      )}

      {/* Owned Servers */}
      {user.ownedServers?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-white mb-2">Owned Servers</h4>
          <div className="space-y-2">
            {user.ownedServers.map(server => (
              <div key={server.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-3/50">
                <div className="w-8 h-8 rounded-lg bg-surface-4 flex items-center justify-center text-xs font-bold text-accent">
                  {server.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{server.name}</p>
                  <p className="text-xs text-gray-500">{formatDate(server.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sessions */}
      {user.refreshTokens?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-white mb-2">Active Sessions</h4>
          <div className="space-y-2">
            {user.refreshTokens.filter(s => !s.revoked).map(session => (
              <div key={session.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-3/50">
                <Globe size={16} className="text-gray-500" />
                <div className="flex-1">
                  <p className="text-sm text-white">{session.deviceInfo || 'Unknown device'}</p>
                  <p className="text-xs text-gray-500">{session.ipAddress || 'Unknown IP'} - {formatRelative(session.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
