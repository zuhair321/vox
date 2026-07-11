import { useEffect, useRef } from 'react';

/**
 * Trap keyboard focus inside `containerRef` while `active` is true.
 * Useful for modals and drawers that need WCAG-compliant focus management.
 *
 * Usage:
 *   const containerRef = useRef<HTMLDivElement>(null);
 *   useFocusTrap(containerRef, isOpen);
 *   <div ref={containerRef} tabIndex={-1}>...</div>
 */
export function useFocusTrap(containerRef: React.RefObject<HTMLElement | null>, active: boolean = true) {
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    // Save the element that had focus before the trap opened.
    previousFocus.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const getFocusable = () => Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors));

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = getFocusable();
      if (focusable.length === 0) { e.preventDefault(); return; }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };

    // Focus the first focusable element when the trap activates.
    const initial = getFocusable()[0];
    initial?.focus();

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      // Restore focus when trap deactivates.
      if (previousFocus.current && !previousFocus.current.contains(document.activeElement)) {
        previousFocus.current.focus();
      }
    };
  }, [active, containerRef]);
}
