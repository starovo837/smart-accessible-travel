import { StrictMode,useEffect,useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { assetUrl } from './app/assetUrl'
import { isPages } from './app/deployment'
import { copyDictionary } from './app/copyDictionary'
import { FamilyViewer } from './features/LiveSharing'
import {LiveHelpViewer} from './features/living/LiveHelp'
import { ReadingFallback } from './features/ReadingFallback'
import { CampusScene } from './components/CampusScene'
import './styles.css'
import './accessibility.css'
import './product.css'
import './nature.css'
import './support.css'
import './living-services.css'
import './living-hub.css'
import './campus-theme.css'

function RootView(){
 const [hash,setHash]=useState(location.hash)
 useEffect(()=>{const change=()=>setHash(location.hash);window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change)},[])
 if (isPages && /^#(?:help|family)\//.test(hash)) return <main className="app-shell"><div className="app-frame"><section className="screen"><h1>{copyDictionary.pagesHeader}</h1><p>{copyDictionary.pagesBackendUnavailable}</p><a href="#home">{copyDictionary.cf9e02d3c13aaa72c}</a></section></div></main>
 if(hash.match(/^#help\/(help-[a-f0-9]{24})\/([A-Za-z0-9_-]+)$/))return <><CampusScene/><LiveHelpViewer id={hash.split('/')[1]} token={hash.split('/')[2]}/></>
 if(hash.match(/^#family\/([a-z0-9-]+)\/([A-Za-z0-9_-]+)$/))return <><CampusScene/><FamilyViewer id={hash.split('/')[1]} token={hash.split('/')[2]}/></>
 return <App/>
}
const root = createRoot(document.getElementById('root')!)
if (import.meta.env.DEV && new URLSearchParams(location.search).get('calibrate') === 'fountain') {
  void import('./components/FountainCalibration').then(({ default: Calibration }) => root.render(<Calibration/>))
} else {
  root.render(<StrictMode><RootView/><ReadingFallback/></StrictMode>)
}

// Cache the application shell only. User records remain governed by category consent.
if (import.meta.env.PROD && window.isSecureContext && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(assetUrl('sw.js'), { updateViaCache: 'none' }).catch(() => {
      // OfflineWorkspace reports the actual registration status; online use stays available.
    })
  })
}
