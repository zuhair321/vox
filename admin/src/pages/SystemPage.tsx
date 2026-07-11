import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Heart, Database, Cpu, HardDrive, Clock,
  Wifi, WifiOff, CheckCircle, XCircle, Server,
  Users, MessageSquare, Hash
} from 'lucide-react';
import { useAdminStore } from '../stores/adminStore';
import { formatBytes, formatDuration, formatNumber } from '../utils/formatters';
import { LoadingScreen } from '../components/ui/LoadingScreen';

export function SystemPage() {
  const { health, loading, fetchHealth } = useAdminStore();

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading.health && !health) return <LoadingScreen />;
  if (!health) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">System Health</h1>
        <p className="text-sm text-gray-400 mt-1">Real-time system status and diagnostics</p>
      </div>

      {/* Service Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2.5 rounded-xl ${health.database.connected ? 'bg-success/10' : 'bg-danger/10'}`}>
              <Database size={20} className={health.database.connected ? 'text-success' : 'text-danger'} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Database</h3>
              <p className="text-xs text-gray-500">MySQL</p>
            </div>
            <div className="ml-auto">
              {health.database.connected ? (
                <CheckCircle size={20} className="text-success" />
              ) : (
                <XCircle size={20} className="text-danger" />
              )}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Status</span>
              <span className={health.database.connected ? 'text-success' : 'text-danger'}>
                {health.database.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Latency</span>
              <span className="text-white">{health.database.latency}ms</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Version</span>
              <span className="text-white">{health.database.version}</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-panel p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2.5 rounded-xl ${health.redis.connected ? 'bg-success/10' : 'bg-danger/10'}`}>
              {health.redis.connected ? (
                <Wifi size={20} className="text-success" />
              ) : (
                <WifiOff size={20} className="text-danger" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Redis</h3>
              <p className="text-xs text-gray-500">Cache & Pub/Sub</p>
            </div>
            <div className="ml-auto">
              {health.redis.connected ? (
                <CheckCircle size={20} className="text-success" />
              ) : (
                <XCircle size={20} className="text-danger" />
              )}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Status</span>
              <span className={health.redis.connected ? 'text-success' : 'text-danger'}>
                {health.redis.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Latency</span>
              <span className="text-white">{health.redis.latency}ms</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Memory</span>
              <span className="text-white">{health.redis.memory}</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-accent/10">
              <Cpu size={20} className="text-accent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Server</h3>
              <p className="text-xs text-gray-500">Node.js {health.server.nodeVersion}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Uptime</span>
              <span className="text-white">{formatDuration(health.server.uptime)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Memory Used</span>
              <span className="text-white">{formatBytes(health.server.memory.used)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Memory Total</span>
              <span className="text-white">{formatBytes(health.server.memory.total)}</span>
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">Memory Usage</span>
                <span className="text-white">{Math.round(health.server.memory.used / health.server.memory.total * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-surface-4 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-accent to-purple-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(health.server.memory.used / health.server.memory.total * 100)}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Data Counts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Users', value: health.counts.users, icon: Users, color: 'accent' },
          { label: 'Servers', value: health.counts.servers, icon: Server, color: 'violet-400' },
          { label: 'Messages', value: health.counts.messages, icon: MessageSquare, color: 'sky-400' },
          { label: 'Channels', value: health.counts.channels, icon: Hash, color: 'emerald-400' },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.05 }}
            className="glass-panel p-5 text-center"
          >
            <item.icon size={24} className={`mx-auto mb-2 text-${item.color}`} />
            <p className="text-2xl font-bold text-white">{formatNumber(item.value)}</p>
            <p className="text-xs text-gray-500 mt-1">{item.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
