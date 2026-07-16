import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import ErrorBoundary from './components/ui/ErrorBoundary'
import './index.css'
import './styles/settings.css'
import './styles/themes.css'
import './styles/polish.css'
import './styles/advanced.css'
import './styles/micro-interactions.css'
import './styles/animations.css'

// Clear stale session token on startup so the login page always shows
// (getMe() will re-validate with the backend; if token is still valid the
// user goes straight to friends, if not they log in fresh).
try { sessionStorage.removeItem('vox_access'); } catch {}
try { sessionStorage.removeItem('vox_refresh'); } catch {}

// Force login page on startup — clear all auth tokens so the login screen
// always appears. The user can re-authenticate fresh.
try { sessionStorage.removeItem('vox_access'); } catch {}
try { localStorage.removeItem('vox_access'); } catch {}
try { localStorage.removeItem('vox_refresh'); } catch {}
try { localStorage.removeItem('vox_remember_me'); } catch {}
try { localStorage.removeItem('vox_user'); } catch {}

// Also clear auth cookies (HTTP-only cookies from the backend can otherwise
// silently re-authenticate the previous test/demo user on reload).
try {
  document.cookie = 'vox_access=; Path=/; Max-Age=0; SameSite=Lax';
  document.cookie = 'vox_refresh=; Path=/; Max-Age=0; SameSite=Lax';
} catch {}

// @ts-ignore — injected marker consumed by renderer.log reader
window.__VOX_START = Date.now();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
