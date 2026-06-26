import { useEffect } from 'react';

/**
 * Global ripple effect for all clickable elements.
 * Attach by calling `useRipple()` once at the app root.
 *
 * On mousedown inside a `.ripple-container` (or `.btn`, `.angular-button`,
 * `.server-icon`, `.channel-item`, `.member-item`), a square wave is spawned
 * at the click point, scales to 3×, fades out, and is removed after 500 ms.
 */
export function useRipple() {
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest?.(
        '.ripple-container, .btn, .angular-button, .server-icon, .channel-item, .member-item, .connection-row, .vox-panel-icon'
      ) as HTMLElement | null;
      if (!target) return;

      // Ignore if the element is disabled
      if ((target as any).disabled) return;

      const rect = target.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2.5;
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      const wave = document.createElement('span');
      wave.className = 'ripple-wave';
      wave.style.cssText = `
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        width: ${size}px;
        height: ${size}px;
        pointer-events: none;
      `;

      target.style.position = target.style.position || 'relative';
      target.style.overflow = 'hidden';
      target.appendChild(wave);

      // Force reflow so the animation triggers
      void wave.getBoundingClientRect();

      const onEnd = () => {
        wave.removeEventListener('animationend', onEnd);
        wave.remove();
      };
      wave.addEventListener('animationend', onEnd);

      // Safety cleanup
      setTimeout(() => wave.remove(), 550);
    };

    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);
}
