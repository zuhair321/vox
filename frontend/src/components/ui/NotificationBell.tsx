import React, { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotificationStore } from '../../stores/notificationStore';

const NotificationBell: React.FC = () => {
  const { unreadCount, isOpen, toggle } = useNotificationStore();
  const [pulse, setPulse] = useState(false);
  const prevCount = useRef(unreadCount);

  useEffect(() => {
    if (unreadCount > prevCount.current) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 1500);
      return () => clearTimeout(t);
    }
    prevCount.current = unreadCount;
  }, [unreadCount]);

  return (
    <button
      type="button"
      className="vox-panel-icon"
      onClick={(e) => {
        e.stopPropagation();
        toggle();
      }}
      title="Notifications"
      aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      style={{ position: 'relative', color: isOpen ? 'var(--chaos)' : undefined }}
    >
      <Bell size={16} strokeWidth={1.5} className={pulse ? 'vox-notif-pulse' : ''} />
      <AnimatePresence>
        {unreadCount > 0 && (
          <motion.span
            key={unreadCount}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            className="vox-notif-badge"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
};

export default NotificationBell;
