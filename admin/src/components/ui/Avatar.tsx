import { User } from 'lucide-react';
import { cn } from '../../utils/cn';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  status?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

const statusColors: Record<string, string> = {
  ONLINE: 'bg-success',
  IDLE: 'bg-warning',
  DND: 'bg-danger',
  OFFLINE: 'bg-gray-500',
};

export function Avatar({ src, alt, size = 'md', className, status }: AvatarProps) {
  return (
    <div className={cn('relative flex-shrink-0', className)}>
      <div className={cn(
        'rounded-full overflow-hidden flex items-center justify-center bg-surface-4',
        sizeClasses[size]
      )}>
        {src ? (
          <img src={src} alt={alt} className="w-full h-full object-cover" />
        ) : (
          <User size={size === 'sm' ? 14 : size === 'md' ? 16 : size === 'lg' ? 20 : 24} className="text-gray-500" />
        )}
      </div>
      {status && (
        <div className={cn(
          'absolute bottom-0 right-0 rounded-full border-2 border-surface-2',
          statusColors[status] || 'bg-gray-500',
          size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'
        )} />
      )}
    </div>
  );
}
