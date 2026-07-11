import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';

interface PaginationProps {
  page: number;
  pages: number;
  onChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, pages, onChange, className }: PaginationProps) {
  if (pages <= 1) return null;

  const getPages = () => {
    const arr: (number | '...')[] = [];
    if (pages <= 7) {
      for (let i = 1; i <= pages; i++) arr.push(i);
    } else {
      arr.push(1);
      if (page > 3) arr.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) {
        arr.push(i);
      }
      if (page < pages - 2) arr.push('...');
      arr.push(pages);
    }
    return arr;
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="btn-ghost p-2 disabled:opacity-30"
      >
        <ChevronLeft size={16} />
      </button>
      {getPages().map((p, i) =>
        p === '...' ? (
          <span key={`dots-${i}`} className="px-2 text-gray-500">...</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p as number)}
            className={cn(
              'w-9 h-9 rounded-lg text-sm font-medium transition-all',
              p === page
                ? 'bg-accent text-white shadow-lg shadow-accent/30'
                : 'text-gray-400 hover:text-white hover:bg-surface-4'
            )}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === pages}
        className="btn-ghost p-2 disabled:opacity-30"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
