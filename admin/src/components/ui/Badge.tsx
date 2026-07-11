import { cn } from '../../utils/cn';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'default';
  children: React.ReactNode;
  className?: string;
}

const variants = {
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  info: 'badge-info',
  accent: 'badge-accent',
  default: 'bg-surface-4 text-gray-300 border border-surface-5',
};

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span className={cn('badge', variants[variant], className)}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    ONLINE: { variant: 'success', label: 'Online' },
    IDLE: { variant: 'warning', label: 'Idle' },
    DND: { variant: 'danger', label: 'DND' },
    OFFLINE: { variant: 'default', label: 'Offline' },
    pending: { variant: 'warning', label: 'Pending' },
    resolved: { variant: 'success', label: 'Resolved' },
    dismissed: { variant: 'default', label: 'Dismissed' },
  };
  const cfg = map[status] || { variant: 'default' as const, label: status };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

export function RoleBadge({ role }: { role: string }) {
  const map: Record<string, BadgeProps['variant']> = {
    FOUNDER: 'warning',
    ADMIN: 'danger',
    MODERATOR: 'info',
    MEMBER: 'default',
  };
  return <Badge variant={map[role] || 'default'}>{role}</Badge>;
}
