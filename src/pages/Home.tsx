import { Link } from 'react-router-dom'

export function Home() {
  return (
    <div className="page home">
      <div className="hero">
        <h1>
          <span className="logo-q">?</span> Kvíz Parti
        </h1>
        <p className="tagline">Élő kvíz – mint a Kahoot, a böngésződben</p>
      </div>
      <div className="home-actions">
        <Link to="/host" className="btn btn-primary btn-xl">
          🎮 Házigazda
        </Link>
        <Link to="/join" className="btn btn-accent btn-xl">
          📱 Csatlakozás
        </Link>
      </div>
      <p className="home-hint">
        A házigazda lapját tartsd nyitva — ő a játék szervere (PeerJS).
      </p>
    </div>
  )
}
