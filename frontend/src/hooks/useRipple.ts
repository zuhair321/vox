import { useEffect, useCallback } from 'react';

function spawnRipple(event: MouseEvent, target: HTMLElement) {
  const rect = target.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;

  const ripple = document.createElement('div');
  ripple.className = 'ripple-wave';
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;

  target.appendChild(ripple);

  const cleanup = () => {
    ripple.removeEventListener('animationend', cleanup);
    ripple.removeEventListener('animationcancel', cleanup);
    ripple.remove();
  };

  ripple.addEventListener('animationend', cleanup);
  ripple.addEventListener('animationcancel', cleanup);
}

export function useRipple() {
  useEffect(() => {
    const selector = '.btn, .angular-button, .server-icon, .channel-item, .member-row-polished, .member-list-item, .clickable-row, .ripple-container';

    const handleMouseDown = (event: MouseEvent) => {
      const target = (event.target as HTMLElement).closest(selector) as HTMLElement | null;
      if (!target) return;
      spawnRipple(event, target);
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);
}

export function useElementRipple() {
  const onMouseDown = useCallback((event: React.MouseEvent<HTMLElement>) => {
    spawnRipple(event.nativeEvent, event.currentTarget);
  }, []);

  return { onMouseDown };
}
