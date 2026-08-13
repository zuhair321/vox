// Tiny client-side navigation bus so non-React modules (e.g. logout() in
// utils/auth.ts) can navigate through React Router instead of doing a hard
// `window.location.href` change. Under the packaged Electron app the renderer
// runs from a file:// URL, where a full reload to "/login" resolves to
// "file:///D:/login" and dies with ERR_FILE_NOT_FOUND. Using React Router's
// navigate() keeps everything inside the SPA and works under file://.

type NavFn = (to: string) => void;

let navigateFn: NavFn | null = null;

export function registerNavigate(fn: NavFn) {
  navigateFn = fn;
}

export function navigateTo(to: string) {
  if (navigateFn) {
    navigateFn(to);
    return;
  }
  // Fallback (e.g. before the app mounts) — use the hash so it still works
  // under the file:// protocol rather than a bare path that 404s.
  window.location.hash = `#${to}`;
}
