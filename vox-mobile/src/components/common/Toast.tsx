// Vox Mobile — Toast component

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useUIStore, Toast as ToastType } from '../../stores/uiStore';
import { colors, spacing, fontSize, borderRadius } from '../../utils/theme';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react-native';

const ICONS = {
  info: Info,
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
};

const TOAST_COLORS = {
  info: colors.info,
  success: colors.success,
  error: colors.danger,
  warning: colors.warning,
};

export function ToastContainer() {
  const toasts = useUIStore(s => s.toasts);
  const removeToast = useUIStore(s => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <View style={styles.container}>
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </View>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastType; onDismiss: () => void }) {
  const Icon = ICONS[toast.type];
  const toastColor = TOAST_COLORS[toast.type];

  return (
    <View style={[styles.toast, { borderLeftColor: toastColor }]}>
      <Icon size={18} color={toastColor} />
      <Text style={styles.message}>{toast.message}</Text>
      <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
        <X size={16} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: spacing.md,
    right: spacing.md,
    gap: spacing.sm,
    zIndex: 9999,
    elevation: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.bgTertiary,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  message: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
});
