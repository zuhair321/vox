# VOX Mobile — Launch Readiness Guide

This document turns the VOX mobile app into a Google Play-ready release.

## What was fixed for launch
- `app.json`: removed invalid `id` field; `targetSdkVersion` raised to **35** (Play requirement).
- `android/gradle.properties`: `targetSdkVersion=35`, Gradle JVM heap raised to **4 GB** (the previous release build OOM-crashed at 2 GB).
- `eas.json`: production profile now builds an **AAB** (`buildType: "app-bundle"`, `distribution: "store"`) — Play requires AAB for new apps.
- `src/api/client.ts`: backend default is now a public **HTTPS** URL (`https://api.vox.app`), overridable at build time via `EXPO_PUBLIC_API_URL` and at runtime via in-app Settings. Removed the hardcoded private IP.
- `android/app/build.gradle`: release is now signed with a real **upload keystore** (falls back to debug only if creds are absent), and **R8 minification + resource shrinking** are enabled.
- Added `PRIVACY-POLICY.md`, `DATA-SAFETY.md`, `STORE-LISTING.md` for Play Console.
- Added `ErrorBoundary` + global error handlers so crashes show a recoverable screen instead of a white screen.

## ⚠️ IMPORTANT — Upload key (secret)
A release keystore was generated at `android/app/vox-release.keystore`
(alias `vox-release`). Credentials live in the gitignored `android/local.properties`.

- **Back it up now** (e.g. encrypted USB / password manager). If lost, you can never
  update the app on Play under the same package name.
- The password in `local.properties` is a placeholder (`VoxRelease2026!`) — change it
  before any real release.
- `*.keystore` is gitignored; never commit it.

For EAS cloud builds you can instead let EAS manage the key: `eas credentials -p android`.

## Build & release steps
```bash
cd D:\vox\vox-mobile

# 1) Install deps (if needed)
npm install

# 2) Cloud production build (recommended — produces the AAB for Play)
eas login
eas build -p android --profile production
# Download the .aab from the EAS dashboard, then upload in Play Console.

# OR local release AAB (requires the keystore + local.properties above):
npx expo prebuild -p android --clean
cd android && ./gradlew assembleRelease && cd ..
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

## Play Console checklist
- [ ] Create app, set package `com.vox.mobile`, name "VOX".
- [ ] Upload the AAB (App bundle) from the build above.
- [ ] Complete **App content → Data safety** using `DATA-SAFETY.md`.
- [ ] Add **Privacy Policy URL** (host `PRIVACY-POLICY.md` at https://vox.app/privacy).
- [ ] Fill **Store listing** from `STORE-LISTING.md` (screenshots, feature graphic, icon).
- [ ] Complete **Content rating** questionnaire.
- [ ] Set up **App signing by Google Play** (recommended) or upload your own key.
- [ ] Internal / closed testing track before production.
- [ ] Production release + rollout.

## Required launch items — status
- [x] **Privacy policy hosted at a real URL** — backend now serves it at `GET /privacy` (and `/privacy-policy`) returning HTML. Enter `https://api.vox.app/privacy` in Play Console. The in-app Settings → Legal → Privacy Policy opens the same URL (`PRIVACY_POLICY_URL`, overridable via `EXPO_PUBLIC_PRIVACY_URL`).
- [x] **Backend CORS for native mobile** — `backend/src/lib/env.js` now allows `Origin: null` (React Native) and the production API origin, so the app can talk to the public backend.
- [x] **Crash reporting** — backend `POST /api/client/crash` (rate-limited, no auth) receives reports. `ErrorBoundary` and the global error/unhandled-rejection handlers in `App.tsx` now call `reportCrash(...)`. Logs land in `backend/logs/client-crash.log`.
- [x] **Push token store** — backend `POST /api/notifications/register` (auth required) persists FCM/APNs tokens to `backend/data/push-tokens.json`. Wire this from the mobile once a push provider is configured.
- [x] **R8 minify + shrink** enabled in release build.
- [ ] **Back up the upload keystore** — `android/app/vox-release.keystore` is generated and gitignored. Copy it to an encrypted location now; the placeholder password is `VoxRelease2026!` (change it before release).
- [ ] **Point `api.vox.app` DNS at your live HTTPS backend** (external) and verify CORS/HTTPS.

## Implemented since first pass
- [x] **Real WebRTC voice** — added `react-native-webrtc`, `src/services/voiceRTC.ts` (mesh peer connections, mic permission, mute/deafen), wired the `voice:offer/answer/ice-candidate` + `voice:existing-peers/user-joined/user-left` signaling in `socketStore`, rendered remote audio via `RTCView` in `VoiceChannelScreen`, and made mute/deafen drive the local mic in `VoiceControls`.
- [x] **Push notifications** — added `expo-notifications` (+ app.json plugin), `src/services/notifications.ts` (permission → Expo push token → `POST /api/notifications/register`), and call it from `App.tsx` on login.
- [x] **Upload keystore backed up** to `C:\Users\Zuhair Ahmed\vox-release-keystore-BACKUP\vox-release.keystore` (outside the repo).

## Remaining external steps (cannot be done in code alone)
- **Native prebuild** — because `react-native-webrtc` + `expo-notifications` are new native modules, the next build must regenerate native code: `eas build` does this automatically; for a local build run `npx expo prebuild -p android --clean` before `cd android && ./gradlew assembleRelease`.
- **Push delivery** — token storage exists; actual sending needs a push sender on the backend (Expo push API using the stored Expo token, or Firebase FCM). The backend currently only stores tokens in `data/push-tokens.json`.
- **DNS** — point `api.vox.app` at your live HTTPS backend; verify CORS/HTTPS.
- **Keystore password** — change the placeholder `VoxRelease2026!` in `android/local.properties` + the backup; keep the backup secret.
- **Play Console** — Data Safety (`DATA-SAFETY.md`), content rating, store listing (`STORE-LISTING.md`), App Signing by Google Play, then submit via `eas submit -p android`.
