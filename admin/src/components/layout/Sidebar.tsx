import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Users, Server, MessageSquare, Flag,
  Activity, Settings, Shield, ChevronLeft, ChevronRight,
  Zap, Heart
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useState } from 'react';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/users', icon: Users, label: 'Users' },
  { path: '/servers', icon: Server, label: 'Servers' },
  { path: '/messages', icon: MessageSquare, label: 'Messages' },
  { path: '/reports', icon: Flag, label: 'Reports' },
  { path: '/audit', icon: Activity, label: 'Audit Log' },
  { path: '/system', icon: Heart, label: 'System Health' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="h-screen bg-surface-1 border-r border-surface-4/50 flex flex-col relative flex-shrink-0"
    >
      {/* Logo */}
      <div className="p-4 flex items-center gap-3 border-b border-surface-4/50 h-16">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-accent/20">
          <Zap size={20} className="text-white" />
        </div>
        <motion.div
          animate={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : 'auto' }}
          className="overflow-hidden whitespace-nowrap"
        >
          <h1 className="text-lg font-bold text-white">VOX</h1>
          <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">Admin Portal</p>
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const isActive = location.pathname === item.path || 
            (item.path !== '/' && location.pathname.startsWith(item.path));
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative',
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-gray-400 hover:text-white hover:bg-surface-3'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-accent rounded-r-full"
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                />
              )}
              <item.icon size={20} className="flex-shrink-0" />
              <motion.span
                animate={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : 'auto' }}
                className="overflow-hidden whitespace-nowrap text-sm font-medium"
              >
                {item.label}
              </motion.span>
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-surface-3 border border-surface-4 flex items-center justify-center text-gray-400 hover:text-white hover:bg-accent hover:border-accent transition-all z-10"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Footer */}
      <div className="p-3 border-t border-surface-4/50">
        <div className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-xl',
          collapsed ? 'justify-center' : ''
        )}>
          <Shield size={16} className="text-accent flex-shrink-0" />
          <motion.span
            animate={{ opacity: collapsed ? 0 : 1 }}
            className="text-xs text-gray-500 overflow-hidden whitespace-nowrap"
          >
            v1.0.0
          </motion.span>
        </div>
      </div>
    </motion.aside>
  );
}
