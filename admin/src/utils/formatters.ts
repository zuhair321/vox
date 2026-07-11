import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';

export function formatDate(date: string | Date) {
  const d = new Date(date);
  if (isToday(d)) return `Today at ${format(d, 'h:mm a')}`;
  if (isYesterday(d)) return `Yesterday at ${format(d, 'h:mm a')}`;
  return format(d, 'MMM d, yyyy');
}

export function formatRelative(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export function getStatusColor(status: string) {
  switch (status?.toUpperCase()) {
    case 'ONLINE': return 'bg-success';
    case 'IDLE': return 'bg-warning';
    case 'DND': return 'bg-danger';
    default: return 'bg-gray-500';
  }
}

export function getRoleColor(role: string) {
  switch (role?.toUpperCase()) {
    case 'FOUNDER': return 'text-yellow-400';
    case 'ADMIN': return 'text-red-400';
    case 'MODERATOR': return 'text-blue-400';
    default: return 'text-gray-400';
  }
}

export function truncate(str: string, len: number) {
  return str.length > len ? str.slice(0, len) + '...' : str;
}
