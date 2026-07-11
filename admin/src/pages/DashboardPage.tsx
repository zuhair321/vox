import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Server, MessageSquare, MessageCircle,
  UserPlus, Zap, Activity, Clock
} from 'lucide-react';
import { useAdminStore } from '../stores/adminStore';
import { StatCard } from '../components/ui/StatCard';
import { VoxAreaChart } from '../components/charts/AreaChart';
import { VoxBarChart } from '../components/charts/BarChart';
import { VoxDonutChart } from '../components/charts/DonutChart';
import { Avatar } from '../components/ui/Avatar';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { formatDate, formatRelative, formatNumber } from '../utils/formatters';
import { LoadingScreen } from '../components/ui/LoadingScreen';

export function DashboardPage() {
  const { stats, activity, loading, fetchDashboard } = useAdminStore();

  useEffect(() => { fetchDashboard(); }, []);

  if (loading.dashboard && !stats) return <LoadingScreen />;

  if (!stats) return null;

  const statusData = stats.usersByStatus.map(s => ({
    name: s.status.charAt(0) + s.status.slice(1).toLowerCase(),
    value: s.count,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">Overview of your VOX platform</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats.totalUsers} icon={Users} color="accent" delay={0} />
        <StatCard label="Total Servers" value={stats.totalServers} icon={Server} color="violet-500" delay={0.05} />
        <StatCard label="Total Messages" value={stats.totalMessages} icon={MessageSquare} color="sky-500" delay={0.1} />
        <StatCard label="Online Now" value={stats.onlineUsers} icon={Zap} color="success" delay={0.15} />
      </div>

      {/* Second row stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="DMs" value={stats.totalDms} icon={MessageCircle} color="pink-500" delay={0.2} />
        <StatCard label="New Users Today" value={stats.newUsersToday} icon={UserPlus} color="cyan-500" delay={0.25} />
        <StatCard label="Messages Today" value={stats.messagesToday} icon={Activity} color="orange-500" delay={0.3} />
        <StatCard label="Active Servers" value={stats.activeServers} icon={Server} color="emerald-500" delay={0.35} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Users Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-panel p-5 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">User Growth</h3>
              <p className="text-xs text-gray-500">New users over the last 30 days</p>
            </div>
            <Badge variant="accent">30 days</Badge>
          </div>
          <VoxAreaChart data={stats.usersByDay} xKey="date" yKey="count" color="#6366f1" />
        </motion.div>

        {/* Status Donut */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-panel p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-1">User Status</h3>
          <p className="text-xs text-gray-500 mb-2">Current online status distribution</p>
          <VoxDonutChart data={statusData} />
        </motion.div>
      </div>

      {/* Messages Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-panel p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Message Activity</h3>
            <p className="text-xs text-gray-500">Messages sent over the last 30 days</p>
          </div>
        </div>
        <VoxBarChart data={stats.messagesByDay} xKey="date" yKey="count" />
      </motion.div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Servers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="glass-panel p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-4">Top Servers</h3>
          <div className="space-y-3">
            {stats.topServers.map((server, i) => (
              <div key={server.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-3/50 transition-colors">
                <span className="text-xs font-bold text-gray-500 w-5">{i + 1}</span>
                <div className="w-10 h-10 rounded-xl bg-surface-4 flex items-center justify-center text-sm font-bold text-accent overflow-hidden">
                  {server.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{server.name}</p>
                  <p className="text-xs text-gray-500">{formatNumber(server.memberCount)} members</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{formatNumber(server.messageCount)}</p>
                  <p className="text-[10px] text-gray-500">messages</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-panel p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-4">Recent Activity</h3>
          <div className="space-y-3 max-h-[350px] overflow-y-auto">
            {activity.map((entry, i) => (
              <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-surface-3/50 transition-colors">
                <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300">{entry.description}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatRelative(entry.timestamp)}</p>
                </div>
              </div>
            ))}
            {activity.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Recent Users */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="glass-panel p-5"
      >
        <h3 className="text-sm font-semibold text-white mb-4">Recent Users</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-4/50">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">User</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Role</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">Joined</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentUsers.map(user => (
                <tr key={user.id} className="table-row">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <Avatar src={user.avatarUrl} alt={user.username} size="sm" status={user.status} />
                      <div>
                        <p className="text-sm font-medium text-white">{user.displayName || user.username}</p>
                        <p className="text-xs text-gray-500">@{user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4"><Badge variant={user.role === 'ADMIN' ? 'danger' : 'default'}>{user.role}</Badge></td>
                  <td className="py-3 px-4"><StatusBadge status={user.status} /></td>
                  <td className="py-3 px-4 text-sm text-gray-400">{formatDate(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
