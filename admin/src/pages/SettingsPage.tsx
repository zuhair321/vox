import { motion } from 'framer-motion';
import { Settings, Globe, HardDrive, Shield, Bell, Palette } from 'lucide-react';

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-gray-400 mt-1">Platform configuration and preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          {
            icon: Globe,
            title: 'General',
            desc: 'Platform name, registration, maintenance mode',
            color: 'text-accent',
          },
          {
            icon: Shield,
            title: 'Security',
            desc: 'JWT settings, rate limits, 2FA requirements',
            color: 'text-success',
          },
          {
            icon: HardDrive,
            title: 'Storage',
            desc: 'Upload limits, file types, storage backend',
            color: 'text-warning',
          },
          {
            icon: Bell,
            title: 'Notifications',
            desc: 'Email templates, notification preferences',
            color: 'text-info',
          },
          {
            icon: Palette,
            title: 'Appearance',
            desc: 'Default theme, branding, customization',
            color: 'text-pink-400',
          },
          {
            icon: Settings,
            title: 'Advanced',
            desc: 'Database, Redis, logging, debug options',
            color: 'text-gray-400',
          },
        ].map((section, i) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-panel-hover p-5 cursor-pointer group"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-surface-3 group-hover:bg-accent/10 transition-colors">
                <section.icon size={22} className={section.color} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">{section.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{section.desc}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="glass-panel p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Platform Info</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Version', value: '0.2.0' },
            { label: 'Runtime', value: 'Node.js 18+' },
            { label: 'Database', value: 'PostgreSQL' },
            { label: 'ORM', value: 'Prisma 6.19' },
          ].map(item => (
            <div key={item.label} className="text-center p-3 rounded-lg bg-surface-3/50">
              <p className="text-sm font-medium text-white">{item.value}</p>
              <p className="text-xs text-gray-500">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
