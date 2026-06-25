import React, { useEffect, useState, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useSocketStore } from './stores/socketStore';
import { useServerStore } from './stores/serverStore';
import { useFriendStore } from './stores/friendStore';
import { useProfileStore } from './stores/profileStore';
import { useUiStore } from './stores/uiStore';

// We will implement these components next
import ServerRail from './components/server/ServerRail';
import Sidebar from './components/ui/Sidebar';
import MainContent from './components/ui/MainContent';
import MemberPanel from './components/ui/MemberPanel';
import ToastContainer from './components/ui/ToastContainer';
import TitleBar from './components/layout/TitleBar';
import OfflineBanner from './components/ui/OfflineBanner';
import ErrorBoundary from './components/ui/ErrorBoundary';
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
import SplashScreen from './components/ui/SplashScreen';
import InviteModal from './components/server/InviteModal';
import CustomStatusModal from './components/ui/CustomStatusModal';
import NotificationCenter from './components/ui/NotificationCenter';
import OnboardingFlow from './components/onboarding/OnboardingFlow';

const Discover = lazy(() => import('./pages/Discover'));
const ServerInsights = lazy(() => import('./pages/ServerInsights'));
const Settings = lazy(() => import('./pages/Settings'));
const Account = lazy(() => import('./pages/settings/Account'));
const Privacy = lazy(() => import('./pages/settings/Privacy'));
const Social = lazy(() => import('./pages/settings/Social'));
const Devices = lazy(() => import('./pages/settings/Devices'));
const AuthorizedApps = lazy(() => import('./pages/settings/AuthorizedApps'));
const FamilyCenter = lazy(() => import('./pages/settings/FamilyCenter'));
const Appearance = lazy(() => import('./pages/settings/Appearance'));
const Voice = lazy(() => import('./pages/settings/Voice'));
const Notifications = lazy(() => import('./pages/settings/Notifications'));
const Chat = lazy(() => import('./pages/settings/Chat'));
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useRipple } from './hooks/useRipple';
import { useNotificationStore } from './stores/notificationStore';

const AppLayout = () => {
  const { connect, disconnect } = useSocketStore();
  const { fetchServers } = useServerStore();
  const { fetchFriends } = useFriendStore();
  const { hydrateFromUser } = useProfileStore();
  const ui = useUiStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Activate ripple effects globally
  useRipple();

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
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        <ServerRail />
        
        <Suspense fallback={<div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center'}}><div className="spinner" /></div>}>
          <Routes>
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/dm/:dmId" element={<DMConversation />} />
        <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/account" element={<Account />} />
            <Route path="/settings/privacy" element={<Privacy />} />
            <Route path="/settings/social" element={<Social />} />
            <Route path="/settings/devices" element={<Devices />} />
            <Route path="/settings/apps" element={<AuthorizedApps />} />
            <Route path="/settings/family" element={<FamilyCenter />} />
            <Route path="/settings/appearance" element={<Appearance />} />
            <Route path="/settings/voice" element={<Voice />} />
            <Route path="/settings/notifications" element={<Notifications />} />
            <Route path="/settings/chat" element={<Chat />} />
            <Route path="/channels/:serverId/:channelId" element={
          <>
            <Sidebar onOpenThemes={() => setThemeOpen(true)} />
            <MainContent />
            <MemberPanel />
          </>
        } />
            {/* Default route */}
            <Route path="/" element={<div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center'}}>Select a server or friends.</div>} />
          </Routes>
        </Suspense>
      </div>

      <ToastContainer />
      <ProfilePopup />
      <CreateServerModal />
      <CreateChannelModal />
      <ThemeSwitcher open={themeOpen} onClose={() => setThemeOpen(false)} />
      <QuickSwitcher open={quickOpen} onClose={() => setQuickOpen(false)} />
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {/* Day 10-11 advanced overlays */}
      <Suspense fallback={null}>
        <Discover />
      </Suspense>
      <InviteModal />
      <CustomStatusModal />
      <NotificationCenter />
      
      {/* Onboarding */}
      {showOnboarding && <OnboardingFlow username={JSON.parse(localStorage.getItem('vox_user') || '{}').username || 'Operative'} onComplete={() => setShowOnboarding(false)} />}
    </div>
  );
};

function App() {
  const [isBooting, setIsBooting] = useState(true);

  // The splash screen drives boot completion via its onComplete callback below.
  if (isBooting) {
    return <SplashScreen onComplete={() => setIsBooting(false)} />;
  }

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginDummy />} />
        <Route path="/*" element={<AppLayout />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
