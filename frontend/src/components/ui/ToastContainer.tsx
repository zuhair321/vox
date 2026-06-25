import React from 'react';
import { useUiStore } from '../../stores/uiStore';
import { AnimatePresence } from 'framer-motion';
import Toast from './Toast';

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUiStore();

  // Max 5 visible. Store already caps at 5, but we slice for safety.
  const visibleToasts = toasts.slice(-5);

  return (
    <div className="toast-container">
      <AnimatePresence initial={false} mode="popLayout">
        {visibleToasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ToastContainer;
