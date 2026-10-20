import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { FamilyViewer } from './features/LiveSharing'
import './styles.css'
import './accessibility.css'
import './product.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {location.hash.match(/^#family\/([a-z0-9-]+)\/([A-Za-z0-9_-]+)$/)?<FamilyViewer id={location.hash.split('/')[1]} token={location.hash.split('/')[2]}/>:<App />}
  </StrictMode>,
)

// Cache the application shell only. User records remain governed by category consent.
if (import.meta.env.PROD && window.isSecureContext && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {
      // OfflineWorkspace reports the actual registration status; online use stays available.
    })
  })
}
