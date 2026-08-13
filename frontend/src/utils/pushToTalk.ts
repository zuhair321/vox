// Push-to-talk controller. Listens for a key/mouse button being held and
// toggles a `setActive(boolean)` callback while the bound input is pressed.
//
// Designed to be created once on voice join, disposed on voice leave.
type Active = (active: boolean) => void;

interface Options {
  key?: string;           // default ' ' (space)
  mouseButton?: number;   // default 0 (left)
  active: Active;
}

let cleanupFn: (() => void) | null = null;

function hasModifier(e: KeyboardEvent): boolean {
  return e.ctrlKey || e.altKey || e.metaKey;
}

export function startPushToTalk({ key = ' ', mouseButton = 0, active }: Options): () => void {
  stopPushToTalk();
  let down = false;

  const onKeyDown = (e: KeyboardEvent) => {
    if (hasModifier(e)) return;
    if (e.repeat) return;
    if (e.code !== key && e.key !== key) return;
    // ignore space inside text inputs unless voice is focused
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }
    e.preventDefault();
    down = true;
    active(true);
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code !== key && e.key !== key) return;
    if (!down) return;
    down = false;
    active(false);
  };

  const onMouseDown = (e: MouseEvent) => {
    if (e.button !== mouseButton) return;
    down = true;
    active(true);
  };

  const onMouseUp = (e: MouseEvent) => {
    if (e.button !== mouseButton) return;
    if (!down) return;
    down = false;
    active(false);
  };

  const onBlur = () => {
    if (!down) return;
    down = false;
    active(false);
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('blur', onBlur);

  cleanupFn = () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('blur', onBlur);
  };
  return cleanupFn;
}

export function stopPushToTalk(): void {
  if (cleanupFn) {
    cleanupFn();
    cleanupFn = null;
  }
}
