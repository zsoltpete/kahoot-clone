import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// No StrictMode: PeerJS host peer id must not be double-registered on mount.
createRoot(document.getElementById('root')!).render(<App />)
