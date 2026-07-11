import React, { useEffect, useState, lazy, Suspense, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useSocketStore } from './stores/socketStore';
import { useServerStore } from './stores/serverStore';
import { useFriendStore } from './stores/friendStore';
import { useProfileStore } from './stores/profileStore';
import { useUiStore } from './stores/uiStore';
import { useThemeStore } from './stores/themeStore';

// We will implement these components next
import ServerRail from './components/server/ServerRail';
import Sidebar from './components/ui/Sidebar';
import MainContent from './components/ui/MainContent';
import MemberPanel from './components/ui/MemberPanel';
import ToastContainer from './components/ui/ToastContainer';
import TitleBar from './components/layout/TitleBar';
import OfflineBanner from './components/ui/OfflineBanner';
import ErrorBoundary from './components/ui/ErrorBoundary';
import PanelErrorBoundary from './components/ui/PanelErrorBoundary';
import ProfilePopup from './components/ui/ProfilePopup';
import CreateServerModal from './components/server/CreateServerModal';
import CreateChannelModal from './components/server/CreateChannelModal';
import ThemeSwitcher from './components/ui/ThemeSwitcher';
import QuickSwitcher from './components/ui/QuickSwitcher';
import ShortcutsModal from './components/ui/ShortcutsModal';
import FriendsPage from './components/friends/FriendsPage';
import DMConversation from './components/friends/DMConversation';
import LoginDummy from './components/ui/LoginDummy';
import Profile from './pages/Profile';
import RegisterPage from './pages/Register';
import SplashScreen from './components/ui/SplashScreen';
import InviteModal from './components/server/InviteModal';
import InviteAccept from './pages/InviteAccept';
import CustomStatusModal from './components/ui/CustomStatusModal';
import NotificationCenter from './components/ui/NotificationCenter';
import ServerSettings from './components/server/ServerSettings';
import VoiceChannelPanel from './components/voice/VoiceChannelPanel';
import ScreenShareOverlay from './components/voice/ScreenShareOverlay';
import ScreenSourcePicker from './components/voice/ScreenSourcePicker';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import { TurboModal } from './components/turbo/TurboModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useRipple } from './hooks/useRipple';
import { useNotificationStore } from './stores/notificationStore';

const Discover = lazy(() => import('./pages/Discover'));
const ServerInsights = lazy(() => import('./pages/ServerInsights'));
const ServerProfile = lazy(() => import('./pages/ServerProfile'));
const Settings = lazy(() => import('./pages/Settings'));
const Account = lazy(() => import('./pages/settings/Account'));
const Privacy = lazy(() => import('./pages/settings/Privacy'));
const Social = lazy(() => import('./pages/settings/Social'));
const Devices = lazy(() => import('./pages/settings/Devices'));
const Sessions = lazy(() => import('./pages/settings/Sessions'));
const AuthorizedApps = lazy(() => import('./pages/settings/AuthorizedApps'));
const FamilyCenter = lazy(() => import('./pages/settings/FamilyCenter'));
const Appearance = lazy(() => import('./pages/settings/Appearance'));
const Voice = lazy(() => import('./pages/settings/Voice'));
const Notifications = lazy(() => import('./pages/settings/Notifications'));
const Chat = lazy(() => import('./pages/settings/Chat'));

const AppLayout = () => {
  const { connect, disconnect } = useSocketStore();
  const { fetchServers, selectedServer } = useServerStore();
  const { fetchFriends } = useFriendStore();
  const { applyServerTheme } = useThemeStore();
  const location = useLocation();
  const { hydrateFromUser } = useProfileStore();
  const ui = useUiStore();
  const navigate = useNavigate();
  const deferredPrompt = useRef<any>(null);
  const [canInstall, setCanInstall] = useState(false);

  // Activate ripple effects globally
  useRipple();

  // PWA install prompt — fired by browser when criteria are met
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt.current) return;
    deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    if (outcome === 'accepted') setCanInstall(false);
    deferredPrompt.current = null;
  };

  // Switch theme to server vibe override when navigating between servers.
  // Falls back to the user's global theme for DMs, friends, and settings.
  useEffect(() => {
    const serverId = selectedServer?.id ?? null;
    applyServerTheme(serverId);
  }, [location.pathname, selectedServer?.id, applyServerTheme]);

  // Global overlay state: theme switcher, quick switcher (Ctrl+K), and the
  // keyboard-shortcuts help (Ctrl+/). Lives at the layout root so they render
  // above every view and any component can trigger the theme switcher via ui.
  const [themeOpen, setThemeOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Expose a setter on the UI store so the ShortcutsModal toggle from the
  // keyboard hook (Ctrl+/) can flip this local state.
  useEffect(() => {
    (ui as any).setShortcutsOpen = setShortcutsOpen;
  }, [ui]);

  // Post-registration redirect: SplashScreen delays AppLayout mount, so we use a
  // session flag instead of direct navigation from RegisterPage.
  useEffect(() => {
    if (sessionStorage.getItem('vox_just_registered') === '1') {
      sessionStorage.removeItem('vox_just_registered');
      navigate('/friends');
      return;
    }
    // If at root "/" and already logged in, go to friends (new users have no servers).
    if (location.pathname === '/') {
      navigate('/friends');
    }
  }, [navigate, location.pathname]);

  // Close everything (Escape) and open quick switcher (Ctrl+K) via the hook.
  useKeyboardShortcuts({
    openQuickSwitcher: () => setQuickOpen(true),
    closeAll: () => {
      setThemeOpen(false);
      setQuickOpen(false);
      setShortcutsOpen(false);
      ui.closeProfilePopup();
      ui.setCreateServerOpen(false);
      ui.setCreateChannelOpen(false);
    },
  });

  useEffect(() => {
    const token = localStorage.getItem('vox_token');
    if (!token && location.pathname !== '/login') {
      navigate('/login');
      return;
    }

    if (token) {
      const cachedUser = localStorage.getItem('vox_user');
      if (cachedUser) {
        try {
          hydrateFromUser(JSON.parse(cachedUser));
        } catch {
          localStorage.removeItem('vox_user');
        }
      }
      connect(token);
      fetchServers().then(() => {
        const servers = useServerStore.getState().servers;
        if (servers && servers.length === 0 && !localStorage.getItem('vox_onboarding_done')) {
          setShowOnboarding(true);
          localStorage.setItem('vox_onboarding_done', 'true');
        }
      });
      fetchFriends();
    }

    return () => disconnect();
  }, [connect, disconnect, fetchServers, fetchFriends, hydrateFromUser, navigate, location.pathname]);

  return (
    <div className="app-container">
      <TitleBar />
      <OfflineBanner />
      {/* PWA install banner — only shown when browser fires beforeinstallprompt */}
      {canInstall && (
        <div style={{
          background: 'var(--discord-blurple)',
          color: '#fff',
          textAlign: 'center',
          padding: '8px 16px',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
        }}>
          <span>Install VOX for a better experience.</span>
          <button
            onClick={handleInstallPWA}
            style={{ background: '#fff', color: 'var(--discord-blurple)', border: 'none', borderRadius: '4px', padding: '4px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
          >
            Install
          </button>
          <button
            onClick={() => setCanInstall(false)}
            aria-label="Dismiss install prompt"
            style={{ background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        <PanelErrorBoundary panelName="ServerRail">
          <ServerRail />
        </PanelErrorBoundary>

        <Suspense fallback={<div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center'}}><div className="spinner" /></div>}>
          <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={location.pathname}>
            <Route path="/invite/:code" element={<PanelErrorBoundary panelName="Invite"><InviteAccept /></PanelErrorBoundary>} />
            <Route path="/friends" element={<PanelErrorBoundary panelName="Friends"><FriendsPage /></PanelErrorBoundary>} />
            <Route path="/dm/:dmId" element={<PanelErrorBoundary panelName="DM"><DMConversation /></PanelErrorBoundary>} />
            <Route path="/profile" element={<PanelErrorBoundary panelName="Profile"><Profile /></PanelErrorBoundary>} />
            <Route path="/settings" element={<PanelErrorBoundary panelName="Settings"><Settings /></PanelErrorBoundary>} />
            <Route path="/settings/account" element={<PanelErrorBoundary panelName="Account"><Account /></PanelErrorBoundary>} />
            <Route path="/settings/privacy" element={<PanelErrorBoundary panelName="Privacy"><Privacy /></PanelErrorBoundary>} />
            <Route path="/settings/social" element={<PanelErrorBoundary panelName="Social"><Social /></PanelErrorBoundary>} />
            <Route path="/settings/devices" element={<PanelErrorBoundary panelName="Devices"><Devices /></PanelErrorBoundary>} />
            <Route path="/settings/sessions" element={<PanelErrorBoundary panelName="Sessions"><Sessions /></PanelErrorBoundary>} />
            <Route path="/settings/apps" element={<PanelErrorBoundary panelName="AuthorizedApps"><AuthorizedApps /></PanelErrorBoundary>} />
            <Route path="/settings/family" element={<PanelErrorBoundary panelName="FamilyCenter"><FamilyCenter /></PanelErrorBoundary>} />
            <Route path="/settings/appearance" element={<PanelErrorBoundary panelName="Appearance"><Appearance /></PanelErrorBoundary>} />
            <Route path="/settings/voice" element={<PanelErrorBoundary panelName="Voice"><Voice /></PanelErrorBoundary>} />
            <Route path="/settings/notifications" element={<PanelErrorBoundary panelName="Notifications"><Notifications /></PanelErrorBoundary>} />
            <Route path="/settings/chat" element={<PanelErrorBoundary panelName="Chat"><Chat /></PanelErrorBoundary>} />
            <Route path="/server-settings/:serverId" element={<PanelErrorBoundary panelName="ServerSettings"><ServerSettings /></PanelErrorBoundary>} />
            <Route path="/server-profile/:serverId" element={
              <PanelErrorBoundary panelName="ServerProfile">
                <Sidebar onOpenThemes={() => setThemeOpen(true)} />
                <ServerProfile />
                <MemberPanel />
              </PanelErrorBoundary>
            } />
            <Route path="/channels/:serverId/:channelId" element={
              <PanelErrorBoundary panelName="ChannelView">
                <Sidebar onOpenThemes={() => setThemeOpen(true)} />
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                  <MainContent />
                  <VoiceChannelPanel />
                </div>
                <MemberPanel />
              </PanelErrorBoundary>
            } />
            <Route path="/" element={<div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center'}}>Select a server or friends.</div>} />
          </Routes>
          </AnimatePresence>
        </Suspense>
      </div>

      <ToastContainer />
      <ProfilePopup />
      {/* Source picker — the Electron main process stashes getDisplayMedia
          callbacks and asks us to pick a screen/window. The picker fetches
          sources via IPC and calls back with the chosen id. */}
      <ScreenSourcePicker />
      {/* Floating screen-share viewer — only renders when a local or remote
          screen stream is active, so it stays out of the way during normal use. */}
      <ScreenShareOverlay />
      <CreateServerModal />
      <CreateChannelModal />
      <ThemeSwitcher open={themeOpen} onClose={() => setThemeOpen(false)} />
      <QuickSwitcher open={quickOpen} onClose={() => setQuickOpen(false)} />
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {/* Day 10-11 advanced overlays */}
      <Suspense fallback={null}>
        <PanelErrorBoundary panelName="Discover">
          <Discover />
        </PanelErrorBoundary>
      </Suspense>
      <InviteModal />
      <CustomStatusModal />
      <NotificationCenter />
      <TurboModal />

      {/* Onboarding */}
      {showOnboarding && <OnboardingFlow username={JSON.parse(localStorage.getItem('vox_user') || '{}').username || 'Operative'} onComplete={() => setShowOnboarding(false)} />}
    </div>
  );
};

function App() {
  const [isBooting, setIsBooting] = useState(true);
  
  // Always require fresh login (clear cached token on app start)
  // Remove this line if you want to restore auto-login in the future
  localStorage.removeItem('vox_token');
  localStorage.removeItem('vox_user');
  
  const storedToken = localStorage.getItem('vox_token');

  // The splash screen drives boot completion via its onComplete callback below.
  // Since token is cleared, SplashScreen will always show the full 2s delay.
  if (isBooting) {
    return <SplashScreen onComplete={() => setIsBooting(false)} token={storedToken} />;
  }

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginDummy />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/*" element={<AppLayout />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
