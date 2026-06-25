import { useState, useEffect } from 'react';

interface UseVirtualListProps {
  containerRef: React.RefObject<HTMLElement>;
  totalCount: number;
  itemHeight: number;
  buffer?: number;
}

interface VirtualListResult {
  startIndex: number;
  endIndex: number;
  offsetY: number;
  totalHeight: number;
}

export function useVirtualList({
  containerRef,
  totalCount,
  itemHeight,
  buffer = 3,
}: UseVirtualListProps): VirtualListResult {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    const updateHeight = () => {
      setContainerHeight(container.clientHeight);
    };

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    updateHeight();
    ro.observe(container);
    container.addEventListener('scroll', handleScroll);

    return () => {
      ro.disconnect();
      container.removeEventListener('scroll', handleScroll);
    };
  }, [containerRef]);

  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
  const endIndex = Math.min(totalCount, startIndex + visibleCount + buffer * 2);
  const offsetY = startIndex * itemHeight;
  const totalHeight = totalCount * itemHeight;

  return { startIndex, endIndex, offsetY, totalHeight };
}
