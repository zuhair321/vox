import type { CapacitorConfig } from '@capacitor/core';

// VOX Android (Capacitor) configuration.
//
// The Android shell loads the built Vite web app (frontend/dist). The web app
// already resolves its backend base at runtime via window.__VOX_CONFIG.apiBase
// (see frontend/src/api/client.ts), falling back to VITE_API_BASE at build
// time. We point `server.url` at the dev/preview server so `cap sync`
// can pull the built assets, but the REAL backend used by the shipped APK is
// whatever VITE_API_BASE / __VOX_CONFIG.apiBase resolves to.
//
// For a production APK, build the web app with:
//   VITE_API_BASE=https://your-railway-backend.up.railway.app npm run build
// then `npx cap sync android`.
const API_BASE = process.env.VITE_API_BASE || 'http://10.0.2.2:4000';

const config: CapacitorConfig = {
  appId: 'com.vox.android',
  appName: 'VOX',
  webDir: 'dist',
  server: {
    // 10.0.2.2 is the Android emulator's loopback to the host machine.
    // On a real device you must use a reachable LAN/prod URL. This is only
    // used by `cap sync` to fetch the bundle; the runtime base comes from
    // VITE_API_BASE / window.__VOX_CONFIG.
    url: API_BASE,
    androidScheme: 'https',
  },
  android: {
    // Allow cleartext (http) to the backend during dev/self-hosted.
    allowMixedContent: true,
    capturingPermission: 'microphone',
  },
  plugins: {
    // We rely on the browser/WebVew for audio + WebRTC, so no extra
    // Capacitor plugins are required for voice (LiveKit works in WebVew).
  },
};

export default config;
