import React from 'react';
import { useUiStore } from '../../stores/uiStore';
import { AnimatePresence } from 'framer-motion';
import Toast from './Toast';

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUiStore();

  // Max 4 visible. Older toasts get pushed out.
  const visibleToasts = toasts.slice(-4);

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
