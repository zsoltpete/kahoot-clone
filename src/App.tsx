import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Home } from './pages/Home'
import { HostSetup } from './pages/HostSetup'
import { HostLive } from './pages/HostLive'
import { PlayerApp } from './pages/PlayerApp'

/**
 * HashRouter works reliably on GitHub Pages without a 404 fallback for SPA paths.
 * URLs look like /kahoot-clone/#/join
 */
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/host" element={<HostSetup />} />
        <Route path="/host/live" element={<HostLive />} />
        <Route path="/join" element={<PlayerApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
