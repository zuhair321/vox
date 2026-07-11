import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import ErrorBoundary from './components/ui/ErrorBoundary'
import './index.css'
import './styles/settings.css'
import './styles/themes.css'
import './styles/polish.css'
import './styles/advanced.css'
import './styles/micro-interactions.css'
import './styles/animations.css'

// Request browser notification permission on load
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

// Register service worker for offline support + push notifications.
// The one-time reset of any stale SW + cache wipe is handled inline in
// index.html so it runs before this bundle even loads.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('[SW] Registered:', reg.scope);
    }).catch((err) => {
      console.warn('[SW] Registration failed:', err);
    });

    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, channelId, messageId } = event.data || {};
      if (type === 'NOTIFICATION_CLICK' && channelId) {
        window.location.hash = `#/channels/${channelId}`;
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
