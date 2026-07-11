import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Server, Search, MoreVertical, Trash2, Eye, Users,
  MessageSquare, Hash, Volume2, Globe, Lock, Calendar
} from 'lucide-react';
import { useAdminStore } from '../stores/adminStore';
import { Avatar } from '../components/ui/Avatar';
import { Badge, RoleBadge } from '../components/ui/Badge';
import { SearchInput } from '../components/ui/SearchInput';
import { Pagination } from '../components/ui/Pagination';
import { Modal } from '../components/ui/Modal';
import { formatDate, formatNumber } from '../utils/formatters';
import { useToastStore } from '../components/ui/Toast';

export function ServersPage() {
  const {
    servers, serversTotal, serversPage, serversPages, selectedServer,
    loading, fetchServers, fetchServer, deleteServer
  } = useAdminStore();
  const { addToast } = useToastStore();

  const [search, setSearch] = useState('');
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => { fetchServers({ search }); }, [search]);

  const handleDelete = async (id: string) => {
    setConfirmDelete(null);
    try {
      await deleteServer(id);
      addToast('success', 'Server deleted');
      if (selectedServerId === id) setSelectedServerId(null);
    } catch (e: any) {
      addToast('error', e.message);
    }
  };

  const openDetail = (id: string) => {
    setSelectedServerId(id);
    fetchServer(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Servers</h1>
          <p className="text-sm text-gray-400 mt-1">{formatNumber(serversTotal)} servers</p>
        </div>
      </div>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search servers by name..."
        className="max-w-md"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence>
          {servers.map((server, i) => (
            <motion.div
              key={server.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: i * 0.03 }}
              className="glass-panel-hover p-5 cursor-pointer group"
              onClick={() => openDetail(server.id)}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-purple-600/20 border border-accent/20 flex items-center justify-center text-lg font-bold text-accent flex-shrink-0">
                  {server.icon ? (
                    <img src={server.icon} alt="" className="w-full h-full rounded-xl object-cover" />
                  ) : (
                    server.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white truncate">{server.name}</h3>
                    {server.isPublic ? (
                      <Globe size={12} className="text-gray-500 flex-shrink-0" />
                    ) : (
                      <Lock size={12} className="text-gray-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{server.category}</p>
                </div>
              </div>

              {server.description && (
                <p className="text-xs text-gray-400 mb-3 line-clamp-2">{server.description}</p>
              )}

              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Users size={12} /> {server._count?.members || 0}
                </span>
                <span className="flex items-center gap-1">
                  <Hash size={12} /> {server._count?.channels || 0}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare size={12} /> {server._count?.messages || 0}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-surface-4/50">
                <Avatar src={server.owner.avatarUrl} alt={server.owner.username} size="sm" />
                <div>
                  <p className="text-xs text-gray-400">{server.owner.displayName || server.owner.username}</p>
                  <p className="text-[10px] text-gray-600">Owner</p>
                </div>
                <span className="ml-auto text-[10px] text-gray-600">{formatDate(server.createdAt)}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {servers.length === 0 && !loading.servers && (
        <div className="text-center py-16">
          <Server size={48} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-500">No servers found</p>
        </div>
      )}

      <Pagination
        page={serversPage}
        pages={serversPages}
        onChange={p => fetchServers({ search, page: p })}
        className="justify-center"
      />

      {/* Server Detail Modal */}
      <Modal
        open={!!selectedServerId}
        onClose={() => setSelectedServerId(null)}
        title="Server Details"
        size="xl"
      >
        {selectedServer ? (
          <ServerDetailPanel server={selectedServer} onDelete={handleDelete} />
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        )}
      </Modal>

      {/* Confirm Delete */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Server"
        size="sm"
      >
        <p className="text-sm text-gray-300 mb-4">
          This will permanently delete this server, all its channels, messages, and member data. This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setConfirmDelete(null)} className="btn-ghost">Cancel</button>
          <button onClick={() => handleDelete(confirmDelete!)} className="btn-danger">Delete Server</button>
        </div>
      </Modal>
    </div>
  );
}

function ServerDetailPanel({ server, onDelete }: { server: any; onDelete: (id: string) => void }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-purple-600/20 border border-accent/20 flex items-center justify-center text-2xl font-bold text-accent">
          {server.icon ? (
            <img src={server.icon} alt="" className="w-full h-full rounded-2xl object-cover" />
          ) : (
            server.name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-white">{server.name}</h3>
            {server.isPublic ? <Badge variant="info">Public</Badge> : <Badge variant="default">Private</Badge>}
          </div>
          <p className="text-sm text-gray-400 mt-1">{server.description || 'No description'}</p>
          <p className="text-xs text-gray-500 mt-1">Category: {server.category}</p>
        </div>
        <button onClick={() => onDelete(server.id)} className="btn-danger text-sm">
          <Trash2 size={14} className="mr-1 inline" /> Delete
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 rounded-lg bg-surface-3/50">
          <p className="text-xl font-bold text-accent">{server.members?.length || 0}</p>
          <p className="text-xs text-gray-500">Members</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-surface-3/50">
          <p className="text-xl font-bold text-purple-400">{server.channels?.length || 0}</p>
          <p className="text-xs text-gray-500">Channels</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-surface-3/50">
          <p className="text-xl font-bold text-pink-400">{server.invites?.length || 0}</p>
          <p className="text-xs text-gray-500">Invites</p>
        </div>
      </div>

      {/* Owner */}
      <div className="p-3 rounded-lg bg-surface-3/50">
        <p className="text-xs text-gray-500 uppercase mb-2">Owner</p>
        <div className="flex items-center gap-3">
          <Avatar src={server.owner.avatarUrl} alt={server.owner.username} size="sm" />
          <div>
            <p className="text-sm font-medium text-white">{server.owner.displayName || server.owner.username}</p>
            <p className="text-xs text-gray-500">@{server.owner.username}</p>
          </div>
        </div>
      </div>

      {/* Channels */}
      <div>
        <h4 className="text-sm font-semibold text-white mb-2">Channels</h4>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {server.channels?.sort((a: any, b: any) => a.position - b.position).map((ch: any) => (
            <div key={ch.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-3/30">
              {ch.type === 'TEXT' ? <Hash size={14} className="text-gray-500" /> : <Volume2 size={14} className="text-gray-500" />}
              <span className="text-sm text-gray-300">{ch.name}</span>
              <Badge variant="default" className="ml-auto">{ch.type}</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Members */}
      <div>
        <h4 className="text-sm font-semibold text-white mb-2">Members ({server.members?.length || 0})</h4>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {server.members?.slice(0, 20).map((m: any) => (
            <div key={m.user.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-3/30">
              <Avatar src={m.user.avatarUrl} alt={m.user.username} size="sm" status={m.user.status} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{m.user.displayName || m.user.username}</p>
                <p className="text-xs text-gray-500">@{m.user.username}</p>
              </div>
              <RoleBadge role={m.role} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
