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
