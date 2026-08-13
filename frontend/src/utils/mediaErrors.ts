// Diagnoses getUserMedia/getDisplayMedia errors into user-friendly messages
// with per-OS fix instructions. Used by the voice preview modal AND by
// joinChannel's catch block so users get actionable help instead of raw
// DOMException text.

export type ErrorKind =
  | 'permission_denied'    // User clicked "Block" or OS-level privacy is off
  | 'device_in_use'        // NotReadableError — another app holds the device
  | 'no_device'            // NotFoundError — no mic/cam present
  | 'overconstrained'      // Resolution / constraints not satisfiable
  | 'aborted'              // User cancelled the picker
  | 'insecure_context'     // getUserMedia requires HTTPS or localhost
  | 'unsupported'          // Browser doesn't expose mediaDevices at all
  | 'unknown';

export interface MediaErrorInfo {
  kind: ErrorKind;
  title: string;
  /** Short one-line summary for toasts / inline status. */
  short: string;
  /** Single-line, most-actionable fix for this specific error. */
  fix: string;
  /** Multi-line explanation (markdown-ish) shown inside the modal. */
  detail: string;
  /** Ordered fix steps for the current OS. */
  steps: string[];
  /** Recoverable: user can retry without changing global settings. */
  recoverable: boolean;
}

/**
 * Detect host platform so the fix-steps are tailored (Windows / macOS / Linux).
 * Falls back to generic instructions if we can't tell.
 */
function detectOS(): 'windows' | 'macos' | 'linux' | 'unknown' {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent || '';
  if (/Windows/i.test(ua)) return 'windows';
  if (/Mac/i.test(ua) && !/iPhone|iPad|iPod/i.test(ua)) return 'macos';
  if (/Linux/i.test(ua)) return 'linux';
  return 'unknown';
}

function stepsFor(kind: ErrorKind, os: 'windows' | 'macos' | 'linux' | 'unknown'): string[] {
  if (kind === 'permission_denied') {
    const win = [
      'Open Windows Settings (Win + I) → Privacy & security → Microphone.',
      'Make sure "Microphone access" is turned ON.',
      'Make sure "Let desktop apps access your microphone" is turned ON.',
      'Reopen VOX — the permission prompt should appear again.',
    ];
    const mac = [
      'Open System Settings → Privacy & Security → Microphone.',
      'Tick the checkbox next to VOX (or Electron).',
      'Quit and reopen VOX so the OS grants the new permission.',
    ];
    const linux = [
      'Make sure your user is in the `audio` group: `sudo usermod -aG audio $USER`.',
      'Sign out and back in (or reboot) for the group change to take effect.',
      'PulseAudio/PipeWire: ensure default source is configured in `pavucontrol`.',
    ];
    const generic = [
      'Open your operating system\'s privacy / microphone settings.',
      'Allow desktop apps (and Electron / VOX) to access the microphone.',
      'Restart VOX after granting the permission.',
    ];
    return os === 'windows' ? win : os === 'macos' ? mac : os === 'linux' ? linux : generic;
  }

  if (kind === 'device_in_use') {
    return [
      'Another application is currently using your microphone or camera.',
      'Close other apps that could be holding it: Zoom, Discord, a browser tab with mic access, OBS, etc.',
      'If nothing obvious is using it, unplug and replug the device (or run `pulseaudio -k` on Linux).',
      'Click "Try again" once the device is free.',
    ];
  }

  if (kind === 'no_device') {
    return [
      'No microphone or camera was detected on this machine.',
      'Check that the device is plugged in / powered on.',
      'On Windows: Settings → System → Sound → ensure your input device is listed and enabled.',
      'On macOS: System Settings → Sound → Input → confirm a device is selected.',
    ];
  }

  if (kind === 'overconstrained') {
    return [
      'The selected device can\'t satisfy the requested resolution / frame rate.',
      'Pick "System default" in the device dropdown, or choose a lower resolution.',
      'Click "Try again" after changing the selection.',
    ];
  }

  if (kind === 'insecure_context') {
    return [
      'Microphone access requires a secure context (HTTPS) so the browser refuses to expose mediaDevices.',
      'In VOX this should be automatic (the bundled backend serves on https://127.0.0.1).',
      'If you launched via `http://...`, switch to `https://...` or use the desktop app.',
    ];
  }

  if (kind === 'unsupported') {
    return [
      'Your browser / runtime does not expose `navigator.mediaDevices`.',
      'If you\'re using an old browser, update to Chrome 74+ / Firefox 66+ / Edge 79+.',
      'On Linux, make sure the WebRTC stack is intact.',
    ];
  }

  return [
    'An unexpected error occurred while accessing the device.',
    'Restart VOX and try again.',
    'If the problem persists, check VOX logs in `%APPDATA%/VOX/logs`.',
  ];
}

/**
 * Translate any thrown value (DOMException, Error, unknown) into a
 * user-friendly MediaErrorInfo. Pure, side-effect free.
 */
export function classifyMediaError(err: unknown): MediaErrorInfo {
  const os = detectOS();

  // Pre-flight: mediaDevices itself may be missing.
  if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
    return {
      kind: 'unsupported',
      title: 'Media devices not supported',
      short: 'Your environment doesn\'t expose a microphone or camera.',
      fix: 'Update your browser or use the desktop app.',
      detail: '`navigator.mediaDevices` is unavailable. This usually means you\'re in an insecure context or on a runtime that hasn\'t shipped WebRTC.',
      steps: stepsFor('unsupported', os),
      recoverable: false,
    };
  }

  const name = (err as DOMException | undefined)?.name || '';
  const message = (err as Error | undefined)?.message || String(err);

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || /permission|denied/i.test(message)) {
    return {
      kind: 'permission_denied',
      title: 'Microphone access blocked',
      short: 'VOX can\'t access your microphone because the permission is blocked.',
      fix: 'Allow microphone access in your OS privacy settings, then reopen VOX.',
      detail:
        'Either you clicked "Block" on the browser permission prompt, the operating system ' +
        'is preventing desktop apps from accessing the microphone, or the Electron session ' +
        'denied the request. The fix is below; no code changes are needed.',
      steps: stepsFor('permission_denied', os),
      recoverable: true,
    };
  }

  if (name === 'NotReadableError' || /already in use|tracked|busy/i.test(message)) {
    return {
      kind: 'device_in_use',
      title: 'Microphone is busy',
      short: 'Your microphone is in use by another application.',
      fix: 'Close Zoom / Discord / browser tabs / OBS, then try again.',
      detail: 'Browsers refuse to share a microphone that another process is currently reading. Close the other app first, then retry.',
      steps: stepsFor('device_in_use', os),
      recoverable: true,
    };
  }

  if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'DevicesNotFoundError') {
    if (/constraint|resolution|width|height|fps/i.test(message) || name === 'OverconstrainedError') {
      return {
        kind: 'overconstrained',
        title: 'Unsupported device settings',
        short: 'The selected resolution / frame rate isn\'t supported by this device.',
        fix: 'Pick "System default" device or lower the resolution, then retry.',
        detail: 'The browser could not satisfy the requested constraints. Lowering the resolution or using the default device usually fixes it.',
        steps: stepsFor('overconstrained', os),
        recoverable: true,
      };
    }
    return {
      kind: 'no_device',
      title: 'No microphone detected',
      short: 'No microphone was found on this machine.',
      fix: 'Plug in a microphone or check OS audio input settings.',
      detail: 'The browser could not find any audio input device. This may also mean permissions are blocked at the OS level.',
      steps: stepsFor('no_device', os),
      recoverable: false,
    };
  }

  if (name === 'AbortError' || /abort|cancelled|canceled/i.test(message)) {
    return {
      kind: 'aborted',
      title: 'Cancelled',
      short: 'You cancelled the microphone permission prompt.',
      fix: 'Click "Try again" to re-trigger the permission prompt.',
      detail: 'No panic — you can try again whenever you\'re ready.',
      steps: ['Click "Try again" to re-trigger the permission prompt.'],
      recoverable: true,
    };
  }

  if (/secure|insecure|https/i.test(message)) {
    return {
      kind: 'insecure_context',
      title: 'Insecure connection',
      short: 'Microphone access requires a secure (HTTPS) context.',
      fix: 'Use the desktop app or connect via HTTPS.',
      detail: '`getUserMedia` cannot run on plain HTTP origins.',
      steps: stepsFor('insecure_context', os),
      recoverable: false,
    };
  }

  return {
    kind: 'unknown',
    title: 'Media error',
    short: message || 'An unknown error occurred while accessing your microphone or camera.',
    fix: 'Restart VOX and try again. If it persists, share the logs.',
    detail: 'No classification matched this error. The raw message is shown above.',
    steps: stepsFor('unknown', os),
    recoverable: false,
  };
}

/**
 * Returns 'granted' | 'denied' | 'prompt' | null for the microphone.
 * Uses the Permissions API. Returns null if unavailable (older browsers / non-secure contexts).
 */
export async function queryMicrophonePermission(): Promise<'granted' | 'denied' | 'prompt' | null> {
  try {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return null;
    const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    if (status.state === 'granted' || status.state === 'denied' || status.state === 'prompt') {
      return status.state;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Returns 'granted' | 'denied' | 'prompt' | null for the camera.
 */
export async function queryCameraPermission(): Promise<'granted' | 'denied' | 'prompt' | null> {
  try {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return null;
    const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
    if (status.state === 'granted' || status.state === 'denied' || status.state === 'prompt') {
      return status.state;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Convenience: synchronously ask the Electron host OS to surface a deep link
 * to the OS-level privacy page for the requested device.
 *
 * Returns the deep link URL the OS opened (or null on a non-Electron runtime).
 * Useful from a "Open system settings" button inside permission-denied panels.
 */
export async function openOSDeviceSettings(kind: 'microphone' | 'camera'): Promise<string | null> {
  try {
    const w = window as unknown as { electronAPI?: { openDeviceSettings?: (k: string) => Promise<string | null> } };
    if (w.electronAPI?.openDeviceSettings) {
      return await w.electronAPI.openDeviceSettings(kind);
    }
  } catch {
    /* fall through */
  }
  return null;
}
