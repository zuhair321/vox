import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Search, Trash2, Pin, Hash, Globe,
  AlertCircle, Clock
} from 'lucide-react';
import { useAdminStore } from '../stores/adminStore';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { SearchInput } from '../components/ui/SearchInput';
import { Pagination } from '../components/ui/Pagination';
import { Modal } from '../components/ui/Modal';
import { formatDate, formatRelative, truncate } from '../utils/formatters';
import { useToastStore } from '../components/ui/Toast';

export function MessagesPage() {
  const {
    messages, messagesTotal, messagesPage, messagesPages,
    loading, fetchMessages, deleteMessage
  } = useAdminStore();
  const { addToast } = useToastStore();

  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => fetchMessages({ search }), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDelete = async (id: string) => {
    setConfirmDelete(null);
    try {
      await deleteMessage(id);
      addToast('success', 'Message deleted');
    } catch (e: any) {
      addToast('error', e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Messages</h1>
        <p className="text-sm text-gray-400 mt-1">Search and moderate messages across all servers</p>
      </div>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search message content..."
        className="max-w-lg"
      />

      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-4/50 bg-surface-2/50">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Author</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Content</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Channel</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Server</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Sent</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {messages.map((msg, i) => (
                  <motion.tr
                    key={msg.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="table-row"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar src={msg.author?.avatarUrl} alt={msg.author?.username} size="sm" />
                        <div>
                          <p className="text-sm text-white">{msg.author?.displayName || msg.authorOverride || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">@{msg.author?.username || 'webhook'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <p className="text-sm text-gray-300 truncate">{truncate(msg.body, 100)}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {msg.edited && <Badge variant="default">edited</Badge>}
                        {msg.pinned && <Badge variant="accent"><Pin size={8} className="mr-0.5" /> pinned</Badge>}
                        {msg.deleted && <Badge variant="danger">deleted</Badge>}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <Hash size={12} className="text-gray-500" />
                        <span className="text-sm text-gray-400">{msg.channel.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-400">
                      {msg.channel.server?.name || 'DM'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-400 whitespace-nowrap">
                      {formatRelative(msg.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setConfirmDelete(msg.id)}
                        className="btn-ghost p-1.5 text-gray-500 hover:text-danger"
                        title="Delete message"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {messages.length === 0 && !loading.messages && (
          <div className="text-center py-16">
            <MessageSquare size={48} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-500">{search ? 'No messages match your search' : 'No messages found'}</p>
          </div>
        )}

        {loading.messages && (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <Pagination
        page={messagesPage}
        pages={messagesPages}
        onChange={p => fetchMessages({ search, page: p })}
        className="justify-center"
      />

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Message"
        size="sm"
      >
        <p className="text-sm text-gray-300 mb-4">
          This will permanently delete this message. Continue?
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setConfirmDelete(null)} className="btn-ghost">Cancel</button>
          <button onClick={() => handleDelete(confirmDelete!)} className="btn-danger">Delete</button>
        </div>
      </Modal>
    </div>
  );
}
