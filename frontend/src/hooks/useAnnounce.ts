import { useCallback, useEffect, useRef } from 'react';

/**
 * Announce messages to screen readers via a visually-hidden live region.
 * Usage:
 *   const announce = useAnnounce();
 *   announce('Message sent', 'polite');
 */
export function useAnnounce() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Mount the live region once.
    const el = document.createElement('div');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'true');
    // Keep it visually hidden but accessible.
    Object.assign(el.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0,0,0,0)',
      whiteSpace: 'nowrap',
      border: '0',
    });
    el.id = 'vox-announcer';
    document.body.appendChild(el);
    ref.current = el;
    return () => { el.remove(); };
  }, []);

  return useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!ref.current) return;
    ref.current.setAttribute('aria-live', priority);
    // Clear and re-set to ensure the browser re-announces even for identical text.
    ref.current.textContent = '';
    requestAnimationFrame(() => { if (ref.current) ref.current.textContent = message; });
  }, []);
}
