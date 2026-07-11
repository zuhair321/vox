import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, Filter, Clock, User, Server, ChevronRight,
  MessageSquare, Trash2, Edit, Shield, Settings
} from 'lucide-react';
import { useAdminStore } from '../stores/adminStore';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Pagination } from '../components/ui/Pagination';
import { formatDate, formatRelative } from '../utils/formatters';

const actionIcons: Record<string, typeof Activity> = {
  MESSAGE_EDIT: Edit,
  MESSAGE_DELETE: Trash2,
  MEMBER_KICK: Shield,
  MEMBER_BAN: Shield,
  CHANNEL_CREATE: Settings,
  CHANNEL_UPDATE: Settings,
  CHANNEL_DELETE: Trash2,
  SERVER_UPDATE: Settings,
  ROLE_CREATE: Shield,
  ROLE_UPDATE: Shield,
  ROLE_DELETE: Trash2,
};

const actionColors: Record<string, string> = {
  MESSAGE_EDIT: 'text-info',
  MESSAGE_DELETE: 'text-danger',
  MEMBER_KICK: 'text-warning',
  MEMBER_BAN: 'text-danger',
  CHANNEL_CREATE: 'text-success',
  CHANNEL_UPDATE: 'text-info',
  CHANNEL_DELETE: 'text-danger',
  SERVER_UPDATE: 'text-accent',
  ROLE_CREATE: 'text-success',
  ROLE_UPDATE: 'text-info',
  ROLE_DELETE: 'text-danger',
};

export function AuditPage() {
  const {
    auditLogs, auditTotal, auditPage, auditPages,
    loading, fetchAuditLogs
  } = useAdminStore();

  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => { fetchAuditLogs({ action: actionFilter }); }, [actionFilter]);

  const actionTypes = ['', 'MESSAGE_EDIT', 'MESSAGE_DELETE', 'MEMBER_KICK', 'MEMBER_BAN', 'CHANNEL_CREATE', 'CHANNEL_UPDATE', 'CHANNEL_DELETE', 'SERVER_UPDATE', 'ROLE_CREATE', 'ROLE_UPDATE', 'ROLE_DELETE'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Log</h1>
          <p className="text-sm text-gray-400 mt-1">{auditTotal} total entries</p>
        </div>
        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          className="bg-surface-2 border border-surface-4 rounded-xl px-3 py-2 text-sm"
        >
          <option value="">All Actions</option>
          {actionTypes.filter(Boolean).map(a => (
            <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {auditLogs.map((log, i) => {
          const Icon = actionIcons[log.action] || Activity;
          const color = actionColors[log.action] || 'text-gray-400';

          return (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="glass-panel p-4 flex items-start gap-4"
            >
              <div className={`p-2.5 rounded-xl bg-surface-3 ${color}`}>
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="accent">{log.action.replace(/_/g, ' ')}</Badge>
                  <span className="text-xs text-gray-500">{formatRelative(log.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Avatar src={log.user.avatarUrl} size="sm" />
                  <span className="text-sm text-white">{log.user.displayName || log.user.username}</span>
                  <ChevronRight size={12} className="text-gray-600" />
                  <span className="text-sm text-gray-400">{log.server.name}</span>
                </div>
                {log.details && (
                  <p className="text-xs text-gray-500 mt-2 font-mono bg-surface-3/50 rounded px-2 py-1 inline-block">
                    {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                  </p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-gray-500">{formatDate(log.createdAt)}</p>
              </div>
            </motion.div>
          );
        })}

        {auditLogs.length === 0 && !loading.audit && (
          <div className="text-center py-16">
            <Activity size={48} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-500">No audit logs found</p>
          </div>
        )}

        {loading.audit && (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <Pagination
        page={auditPage}
        pages={auditPages}
        onChange={p => fetchAuditLogs({ action: actionFilter, page: p })}
        className="justify-center"
      />
    </div>
  );
}
