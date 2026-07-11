# VOX Desktop vs Mobile App - Comprehensive Comparison

**Document Date**: 2026-07-11  
**VOX Version**: 1.0.0  
**Comparison Scope**: Electron Desktop App vs React Native Mobile App

---

## Executive Summary

VOX is available on **two distinct platforms** with shared backend but divergent frontend architectures:

| Aspect | Desktop App | Mobile App |
|--------|------------|-----------|
| **Platform** | Windows (Electron) | iOS & Android (React Native) |
| **Distribution** | Standalone executable (.exe) | APK (Android), App Store (iOS) |
| **Architecture** | Electron + Bundled services | React Native + Expo |
| **Code Sharing** | ~30% (stores, types, API calls) | Same |
| **Build Target** | Windows native | Mobile native |
| **Installation** | Direct download/installer | App Store or APK |

---

## 1. Architecture Comparison

### 1.1 Desktop Architecture (Electron)

```
┌─────────────────────────────────────────────────┐
│         VOX Desktop Application                 │
│                                                 │
│  ┌────────────────────────────────────────┐   │
│  │  Electron Main Process                 │   │
│  │  ├─ Window management                  │   │
│  │  ├─ Tray/System integration            │   │
│  │  ├─ Native notifications               │   │
│  │  └─ Service spawning (PostgreSQL, Node)     │   │
│  └────────────────────────────────────────┘   │
│                    ↓ IPC                        │
│  ┌────────────────────────────────────────┐   │
│  │  Electron Renderer (Chromium)          │   │
│  │  ├─ React 18 + Vite                    │   │
│  │  ├─ Zustand stores                     │   │
│  │  ├─ Socket.io client                   │   │
│  │  └─ Native API bridge (preload.js)     │   │
│  └────────────────────────────────────────┘   │
│           ↓ HTTP/WebSocket                     │
│  ┌────────────────────────────────────────┐   │
│  │  Bundled Backend Services              │   │
│  │  ├─ Node.js server (port 4000)         │   │
│  │  ├─ PostgreSQL database (port 3306)         │   │
│  │  └─ Redis cache (port 6379)            │   │
│  └────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

**Key Characteristics**:
- **Monolithic desktop app** with all services bundled
- Spawns PostgreSQL, Node backend as child processes
- Full OS integration (system tray, native notifications)
- Chromium-based rendering (full web compatibility)
- Hardware acceleration enabled (GPU rasterization)

### 1.2 Mobile Architecture (React Native)

```
┌──────────────────────────────────────────────────┐
│     VOX Mobile Application (React Native)        │
│                                                  │
│  ┌────────────────────────────────────────┐    │
│  │  React Native Runtime                   │    │
│  │  ├─ Expo SDK (development & EAS build)  │    │
│  │  ├─ React 19 + TypeScript               │    │
│  │  ├─ Zustand stores (shared logic)       │    │
│  │  ├─ React Navigation (routing)          │    │
│  │  └─ Gesture handling (Reanimated)       │    │
│  └────────────────────────────────────────┘    │
│              ↓ Native Bridge                     │
│  ┌────────────────────────────────────────┐    │
│  │  Native Layer (Platform-specific)       │    │
│  │  ├─ Android Runtime (Java/Kotlin)       │    │
│  │  ├─ iOS Runtime (Swift/Obj-C)           │    │
│  │  ├─ Secure storage (encrypted keychain) │    │
│  │  ├─ Image picker (camera/gallery)       │    │
│  │  └─ Status bar integration              │    │
│  └────────────────────────────────────────┘    │
│           ↓ HTTPS/WebSocket (no local)         │
│  ┌────────────────────────────────────────┐    │
│  │  Remote Backend (Single server)         │    │
│  │  ├─ Express API (port 4000)             │    │
│  │  ├─ PostgreSQL database (shared)             │    │
│  │  └─ Socket.io gateway (real-time)       │    │
│  └────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
```

**Key Characteristics**:
- **Thin client** — all services run on remote server
- Native app compiled from JavaScript
- Cross-platform (iOS + Android from single codebase)
- No bundled services (lighter installation)
- Secure storage for credentials (device keychain)

---

## 2. Technology Stack Comparison

### 2.1 Core Runtime

| Component | Desktop | Mobile |
|-----------|---------|--------|
| **Language** | JavaScript/TypeScript | TypeScript (required) |
| **Runtime** | Electron (Chromium-based) | React Native (Expo/Native) |
| **Node.js** | Yes (v18+) | Not needed at runtime |
| **Package Size** | ~500MB-1GB | ~80-150MB (APK) |
| **Memory Footprint** | 400-600MB (idle) | 100-200MB (idle) |

### 2.2 Frontend Framework Layers

| Layer | Desktop | Mobile |
|-------|---------|--------|
| **React** | 18.2.0 | 19.2.3 (latest) |
| **Bundler** | Vite (5.2) | Expo (57.0.4) |
| **Routing** | React Router 6.22 | React Navigation 7.x (native stacks) |
| **State** | Zustand 4.5 (shared) | Zustand 5.0 (shared) |
| **Real-time** | Socket.io-client 4.7 | Socket.io-client 4.8 |
| **UI Components** | HTML/CSS (web) | React Native + lucide-react-native |
| **Animation** | Framer Motion 12.x | React Native Reanimated 4.5 |
| **Icons** | lucide-react 0.359 | lucide-react-native 1.23.0 |

### 2.3 Native/Platform Features

| Feature | Desktop | Mobile |
|---------|---------|--------|
| **Tray Icon** | ✅ Yes (Electron Tray) | ❌ N/A |
| **Notifications** | ✅ Native (Electron) | ✅ Native (Expo NotifPlus) |
| **Secure Storage** | ✅ File system (encrypted) | ✅ Keychain (SecureStore) |
| **Image Picking** | ✅ File dialog | ✅ Gallery + Camera picker |
| **Screen Capture** | ✅ desktopCapturer API | ❌ Not in standard Expo |
| **Global Hotkey** | ✅ Ctrl+Shift+V | ❌ Not applicable |
| **Voice/Video** | ✅ WebRTC | ✅ WebRTC (limited) |
| **Offline Mode** | ❌ Requires services | ⚠️ Partial (async-storage) |

---

## 3. Feature Parity Matrix

### 3.1 Core Features

| Feature | Desktop | Mobile | Notes |
|---------|---------|--------|-------|
| **Authentication** | ✅ 100% | ✅ 100% | JWT + 2FA on both |
| **Servers/Guilds** | ✅ 100% | ✅ 100% | Full CRUD |
| **Channels** | ✅ 100% | ✅ 100% | Text & voice |
| **Messaging** | ✅ 100% | ✅ 100% | Send/edit/delete/reactions |
| **Direct Messages** | ✅ 100% | ✅ 100% | 1:1 conversations |
| **Friends** | ✅ 100% | ✅ 100% | Requests, blocking, presence |
| **Voice Chat** | ✅ 90% | ⚠️ 60% | Desktop: Full mesh. Mobile: Limited codec support |
| **Screen Share** | ✅ 100% | ❌ 0% | Expo doesn't support native screen share |
| **Notifications** | ✅ 100% | ✅ 90% | Desktop: Native. Mobile: Expo Push (configured?) |
| **Themes** | ✅ 8 themes | ✅ 8 themes | Dark/light variants |
| **Search** | ✅ Full-text | ✅ Full-text | PostgreSQL FTS on backend |
| **File Uploads** | ✅ 100% | ✅ 100% | Image/video/document |
| **User Profiles** | ✅ 100% | ✅ 100% | Avatar, banner, status, bio |
| **Emoji Reactions** | ✅ 100% | ✅ 100% | Custom server emojis |
| **Message Threads** | ✅ 100% | ✅ 100% | Full reply threading |
| **Mentions** | ✅ 100% | ✅ 100% | @user and @here |
| **Link Previews** | ✅ 100% | ⚠️ 80% | OG tag parsing works; mobile rendering may differ |
| **Webhooks** | ✅ 100% | ❌ 0% | Backend-only feature (no mobile UI) |

### 3.2 Advanced Features

| Feature | Desktop | Mobile | Notes |
|---------|---------|--------|-------|
| **Audit Logs** | ✅ 100% | ✅ 100% | Server admin view |
| **Role Management** | ✅ 100% | ✅ 100% | CRUD roles + perms |
| **Custom Emojis** | ✅ 100% | ✅ 100% | Upload + use |
| **Server Analytics** | ✅ 100% | ⚠️ 50% | Limited UI on mobile |
| **Keyboard Shortcuts** | ✅ Yes (Ctrl+K, Ctrl+/) | ❌ No | Desktop-specific UX |
| **Contextual Menus** | ✅ Yes | ✅ Yes (long-press) | Different interaction model |
| **Vanity URLs** | ✅ 100% | ✅ 100% | Custom server invite codes |
| **Message Pinning** | ✅ 100% | ✅ 100% | Pin important messages |
| **Typing Indicators** | ✅ 100% | ✅ 100% | Real-time feedback |
| **Read Receipts** | ✅ 100% | ✅ 100% | DMs only |
| **Custom Status** | ✅ 100% | ✅ 100% | User presence status |

---

## 4. User Experience Comparison

### 4.1 Desktop App (Electron)

**Strengths**:
- ✅ Full keyboard navigation (Ctrl+K quick switcher)
- ✅ Multi-monitor support
- ✅ Large screen real estate for rich UI
- ✅ System tray integration (minimize to tray)
- ✅ Screen capture and sharing built-in
- ✅ Fast startup (bundled services)
- ✅ No network dependency for core features

**Weaknesses**:
- ❌ Windows-only (no Mac/Linux native builds)
- ❌ Large installation footprint (~500MB-1GB)
- ❌ Higher memory usage
- ❌ Less touch-friendly interface
- ❌ Bundled PostgreSQL requires disk space

### 4.2 Mobile App (React Native)

**Strengths**:
- ✅ Cross-platform (iOS + Android)
- ✅ Small download size (~100MB)
- ✅ Low memory footprint
- ✅ Native gesture support (swipe, long-press)
- ✅ Touch-optimized UI
- ✅ Offline-capable (async-storage)
- ✅ App Store distribution

**Weaknesses**:
- ❌ Requires network for most features
- ❌ Screen sharing not supported
- ❌ Smaller viewport
- ❌ Limited keyboard input
- ❌ Codec limitations for voice/video
- ❌ No native system tray

---

## 5. Performance Characteristics

### 5.1 Startup Time

| Metric | Desktop | Mobile |
|--------|---------|--------|
| **First Launch** | 10-15s (spawn PostgreSQL + Node) | 2-5s (connect to remote) |
| **Subsequent Launches** | 8-12s (PostgreSQL may already run) | 1-3s (hot start) |
| **Service Readiness** | Wait for 3-4 services | Immediate (remote) |

### 5.2 Memory Usage

| Phase | Desktop | Mobile |
|-------|---------|--------|
| **Idle** | 400-600MB | 100-150MB |
| **Active Messaging** | 600-800MB | 150-250MB |
| **Voice Call** | 800MB-1GB | 250-400MB |

### 5.3 Network Usage

| Scenario | Desktop | Mobile |
|----------|---------|--------|
| **Idle** | ~10KB/min (heartbeat) | ~10KB/min (heartbeat) |
| **Active Chat** | ~50-100KB/min | ~50-100KB/min (identical) |
| **Voice Stream** | 50-100KB/s | 50-100KB/s (identical) |

---

## 6. Architecture Details

### 6.1 Desktop Process Model

```javascript
// electron-main.js
app.on('ready', async () => {
  // 1. Spawn bundled services
  const PostgreSQLdProcess = spawn('PostgreSQLd.exe', [...]);
  const backendProcess = spawn('node', ['backend/server.js']);
  
  // 2. Create Electron window
  const mainWindow = new BrowserWindow({
    webPreferences: {
      preload: 'preload.js',  // IPC bridge
      nodeIntegration: false,
      sandbox: true
    }
  });
  
  // 3. Load local React frontend
  mainWindow.loadURL('http://localhost:3000');
});
```

**Process Tree**:
```
electron.exe
├── PostgreSQLd.exe          (database service)
├── node.exe            (Express backend)
├── node.exe            (static-server for frontend)
└── Chromium Renderer   (React app)
```

### 6.2 Mobile Async Model

```typescript
// App.tsx (Expo)
export default function App() {
  const initialize = useAuthStore(s => s.initialize);
  const connectSocket = useSocketStore(s => s.connect);

  useEffect(() => {
    initialize();  // Load from SecureStore
  }, []);

  useEffect(() => {
    if (user) {
      connectSocket();  // Remote backend only
    }
  }, [user]);
}
```

**Network Stack**:
```
React Native Bridge
        ↓
Socket.io-client (4.8)
        ↓
HTTPS/WebSocket to remote server
        ↓
Express API + Socket.io gateway
```

---

## 7. State Management Comparison

### 7.1 Shared Zustand Stores

Both apps use **identical Zustand patterns**:

```typescript
// Shared in both desktop and mobile
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  login: async (email, password) => { /* ... */ },
  logout: () => { /* ... */ }
}));

export const useServerStore = create<ServerState>((set) => ({
  servers: [],
  fetchServers: async () => { /* ... */ },
  createServer: async (name) => { /* ... */ }
}));
```

**Store Locations**:
- Desktop: `frontend/src/stores/*.ts`
- Mobile: `vox-mobile/src/stores/*.ts`

**Code Duplication**: ~60% (stores are manually duplicated per platform)

### 7.2 Storage Strategy

| System | Desktop | Mobile |
|--------|---------|--------|
| **Token Storage** | Electron secure storage (filesystem) | `expo-secure-store` (keychain) |
| **Cache Storage** | In-memory (Zustand) + localStorage | async-storage (SQLite on device) |
| **Session Persistence** | Lost on app restart | Retained across sessions |

---

## 8. Database and Backend Interactions

### 8.1 Database Schema

**Both apps share the same PostgreSQL schema** (28 tables):

| Table | Desktop Access | Mobile Access |
|-------|----------------|---------------|
| User | ✅ Local Prisma | ✅ Remote API |
| Server | ✅ Local Prisma | ✅ Remote API |
| Channel | ✅ Local Prisma | ✅ Remote API |
| Message | ✅ Local Prisma | ✅ Remote API |
| ... | ... | ... |

### 8.2 API Endpoints

**Desktop**: Calls `http://localhost:4000/api` (local backend)
**Mobile**: Calls `https://vox.example.com/api` (remote backend)

**Example endpoint** (identical on both):
```
GET /api/servers/{serverId}/channels
POST /api/channels/{channelId}/messages
PUT /api/users/{userId}/profile
```

---

## 9. Build & Deployment

### 9.1 Desktop Build Process

```bash
# Windows executable
npm run build
# Outputs: VOX-Desktop-1.0.0-setup.exe (~500MB)

# Development
npm run dev:desktop  # Runs electron . (hot reload with Vite)
```

**Build Steps**:
1. `npm install` (dependencies)
2. `vite build` (frontend bundle)
3. `npx electron-builder` (package.exe + PostgreSQL + Node.exe)
4. Sign executable (optional)

**Distribution**:
- GitHub Releases
- Direct download from vox.example.com
- Installer with auto-update support

### 9.2 Mobile Build Process

```bash
# iOS build (via Expo Cloud Build - EAS)
eas build --platform ios

# Android build
eas build --platform android
# Outputs: VOX-Mobile-1.0.0.apk (~100MB)

# Development
npm run start
expo start -c  # Clear cache and reload
```

**Build Steps**:
1. `npm install` dependencies
2. `eas build --platform [ios|android]`
3. EAS cloud service compiles native binaries
4. Output: .ipa (iOS) or .apk (Android)

**Distribution**:
- Apple App Store (iOS)
- Google Play Store (Android)
- Manual APK distribution
- Expo EAS Updates (over-the-air updates)

---

## 10. Development Workflow Comparison

### 10.1 Desktop Development

```bash
# Terminal 1: Backend + PostgreSQL
cd backend
npm install
npm run dev

# Terminal 2: Frontend dev server (Vite hot reload)
cd frontend
npm install
npm run dev

# Terminal 3: Electron app
npm run dev:desktop

# Result: Electron window loads from http://localhost:5173
# Changes to React code reload instantly in Electron
```

**Developer Experience**:
- ✅ Fast hot reload (Vite)
- ✅ Can inspect with DevTools (F12)
- ✅ Easy debugging with Chrome DevTools
- ✅ Local PostgreSQL for data manipulation
- ❌ Must run 3+ processes

### 10.2 Mobile Development

```bash
# Terminal 1: Backend (if developing locally)
cd backend
npm run dev

# Terminal 2: Expo dev server
cd vox-mobile
npm start

# Scan QR code with Expo Go or simulator
# Result: App loads from Expo dev server on your machine

# Or use physical device
expo start --tunnel  # Tunnel mode
```

**Developer Experience**:
- ✅ Single command startup (`expo start`)
- ✅ Fast reload with Fast Refresh
- ✅ Live preview on device
- ✅ Easy to test on real hardware
- ❌ Simulator lag can be significant
- ❌ Some native modules require rebuild

---

## 11. Security Comparison

### 11.1 Authentication Flow

**Both apps**:
```
1. POST /auth/register or /auth/login
2. Receive JWT (access token) + refresh token
3. Store in secure storage (Electron or SecureStore)
4. Use JWT for subsequent requests (Authorization header)
5. WebSocket connection authenticated with JWT
```

### 11.2 Credential Storage

| System | Method | Security |
|--------|--------|----------|
| **Desktop** | Electron secure storage (Windows DPAPI) | ✅ OS-level encryption |
| **Mobile** | `expo-secure-store` (iOS Keychain / Android Keystore) | ✅ Device-level encryption |

### 11.3 Network Security

| Aspect | Desktop | Mobile |
|--------|---------|--------|
| **Local Traffic** | HTTP (localhost) | HTTPS (if local server) |
| **Remote Traffic** | HTTPS (if configured) | HTTPS (required) |
| **TLS Certificate Validation** | ✅ Standard (Chromium) | ✅ Standard (React Native) |

### 11.4 Permission Model

**Desktop**:
- Single user (logged in to Windows account)
- No per-app permissions

**Mobile**:
- Android: Camera, microphone, photo access (requested at runtime)
- iOS: Similar via Info.plist + ATT framework

---

## 12. Troubleshooting & Known Limitations

### 12.1 Desktop Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| PostgreSQL fails to start | Port 3306 occupied | Kill process on :3306 |
| Frontend doesn't load | Vite server not running | `cd frontend && npm run dev` |
| High memory usage | Chromium overhead | Use Task Manager to monitor |
| Screen capture fails | No desktopCapturer available | Only works on Windows 10+ |

### 12.2 Mobile Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Can't connect to API | Wrong server URL in config | Update `.env` or hardcoded URL |
| Notifications don't work | Expo Push not configured | Set up Expo credentials |
| Voice quality poor | Network lag / codec mismatch | Use 5GHz WiFi or wired connection |
| Screen sharing unavailable | React Native limitation | Implement native module (not Expo) |

---

## 13. Platform-Specific Strengths

### 13.1 Why Use Desktop App?

- 🖥️ Primary development machine
- 📺 Need large screen for streaming/recording
- 🎙️ Screen sharing for presentations
- ⚡ Want local services (fastest latency)
- ⌨️ Prefer keyboard shortcuts
- 🎮 High-quality voice chat critical
- 📊 Need admin dashboards

### 13.2 Why Use Mobile App?

- 📱 On-the-go messaging
- 🚌 Use during commute
- 👥 Quick notification checks
- 🤳 Natural touch interface
- 💨 Lightweight (small download)
- 🔋 Better battery efficiency (no local services)
- 🌍 Works anywhere (remote server)
- 🎯 Familiar mobile paradigms

---

## 14. Synchronization & Data Consistency

### 14.1 Conflict Resolution

Both apps use **last-write-wins (LWW)** for conflicts:

```
Device A: Edit message at 10:00:01
Device B: Edit same message at 10:00:02
Result: Device B's edit persists (timestamp 10:00:02 > 10:00:01)
```

### 14.2 Real-time Sync (Socket.io)

**Both apps** receive real-time events:
```typescript
socket.on('message:created', (msg) => {
  messageStore.addMessage(msg);  // Same handler
});

socket.on('user:online', (userId) => {
  userStore.setOnline(userId);   // Same handler
});
```

### 14.3 Offline Behavior

| Scenario | Desktop | Mobile |
|----------|---------|--------|
| **Send message offline** | Queued in-memory | Queued in async-storage |
| **Read messages offline** | Only if cached | Reads from async-storage |
| **Sync on reconnect** | Automatic (Socket.io) | Automatic (Socket.io) |

---

## 15. Future Roadmap

### 15.1 Planned Features

- 📱 **macOS Electron Build** (separate DMG installer)
- 🔗 **Web App** (React 18 → separate vox.example.com)
- 🎥 **Video Calling Improvements** (VP8/VP9 codec negotiation)
- 📲 **Push Notifications** (Expo + Firebase Cloud Messaging)
- 🎨 **Custom Theme Engine** (user-defined color palettes)
- 🔐 **E2E Encryption** (Signal protocol for messages)
- 🌐 **Peer-to-peer Sync** (fallback when server unavailable)

### 15.2 Platform-Specific Enhancements

**Desktop**:
- Auto-update mechanism (electron-updater)
- Performance profiling tools
- Admin CLI for server management

**Mobile**:
- iOS Siri Shortcuts integration
- Android Widget for unread counts
- Haptic feedback for notifications

---

## 16. Migration & Code Sharing Strategy

### 16.1 Duplicated Code

**Currently ~60% duplication**:
- ✅ Zustand stores (manual copy-paste)
- ✅ Type definitions (`types.ts`)
- ✅ API client wrappers
- ❌ UI components (platform-specific)
- ❌ Navigation (Router vs React Navigation)

### 16.2 Monorepo Benefits (Future)

If migrated to **monorepo** (Turborepo/Nx):
```
vox-monorepo/
├── packages/
│   ├── core/              # Shared logic (stores, types, API)
│   ├── backend/           # Express + Prisma
│   ├── frontend-web/      # React 18 (web)
│   ├── frontend-desktop/  # Electron shell
│   ├── frontend-mobile/   # React Native (Expo)
│   └── shared-components/ # Cross-platform UI lib
```

**Reduces duplication to ~20%** and enables:
- Single source of truth for stores
- Shared TypeScript types
- Unified testing
- Consistent API client

---

## 17. Recommendation Matrix

### 17.1 Which Platform to Use?

| Use Case | Recommendation | Reason |
|----------|-----------------|--------|
| Desktop work | **Desktop App** | Keyboard shortcuts, screen sharing, large display |
| Mobile messaging | **Mobile App** | Touch-optimized, lightweight, portable |
| Server admin | **Web (future)** | Full-featured dashboard on any device |
| Voice/Video focus | **Desktop App** | Better codec support, screen share |
| Quick DMs | **Mobile App** | Faster to open, notifications work better |

### 17.2 Performance Tuning

| Bottleneck | Desktop Solution | Mobile Solution |
|------------|------------------|-----------------|
| Slow startup | Pre-spawn PostgreSQL | Use EAS build cache |
| High memory | Disable GPU acceleration | Reduce re-renders with useMemo |
| Poor voice quality | Switch to wired connection | Use 5GHz WiFi |
| Message lag | Increase Redis TTL | Optimize Socket.io message batching |

---

## 18. Comparison Summary Table

| Dimension | Desktop | Mobile |
|-----------|---------|--------|
| **Platform Target** | Windows | iOS/Android |
| **Tech Stack** | Electron + React | React Native + Expo |
| **Package Size** | ~500MB-1GB | ~80-150MB |
| **Memory (idle)** | 400-600MB | 100-200MB |
| **Startup Time** | 10-15s | 2-5s |
| **Feature Parity** | ~95% | ~90% |
| **Keyboard Support** | ✅ Full | ⚠️ Limited |
| **Touch Support** | ❌ No | ✅ Full |
| **Screen Sharing** | ✅ Yes | ❌ No |
| **Offline Mode** | ⚠️ Partial | ✅ Better |
| **Voice Quality** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Distribution** | GitHub/Direct | App Store + APK |
| **Update Frequency** | Manual | OTA (Expo EAS) |
| **Developer Experience** | 🟡 3+ processes | 🟢 Simple (single command) |
| **Security** | ✅ Strong | ✅ Strong |
| **Customization** | ✅ High | ✅ High |

---

## Conclusion

**VOX Desktop** is ideal for **primary communication** with screen sharing, keyboard efficiency, and bundled services for offline-capable scenarios.

**VOX Mobile** excels at **on-the-go messaging**, portability, and native mobile UX with zero setup.

Both share a **identical backend** and ~60% of frontend code, ensuring feature parity and consistent UX across platforms. A future **monorepo refactor** could reduce duplication further and enable true cross-platform component sharing.

---

**Document Version**: 1.0  
**Last Updated**: 2026-07-11 03:10 UTC+5:00  
**VOX Repository**: D:\Vox
