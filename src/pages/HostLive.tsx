import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Quiz } from '../types/quiz'
import { HostEngine, type HostSnapshot } from '../peer/HostEngine'
import { AnswerButtons } from '../components/AnswerButtons'
import { TimerBar } from '../components/TimerBar'
import { Leaderboard } from '../components/Leaderboard'
import { PlayerChips } from '../components/PlayerChips'
import { SoundToggle } from '../components/SoundToggle'
import { useSound } from '../hooks/useSound'

export function HostLive() {
  const nav = useNavigate()
  const quiz = useMemo(() => {
    try {
      const raw = sessionStorage.getItem('kviz-launch')
      return raw ? (JSON.parse(raw) as Quiz) : null
    } catch {
      return null
    }
  }, [])

  const engineRef = useRef<HostEngine | null>(null)
  const [snap, setSnap] = useState<HostSnapshot | null>(null)
  const { enabled, toggle, play } = useSound()
  const prevPlayerCount = useRef(0)

  useEffect(() => {
    if (!quiz) {
      nav('/host', { replace: true })
      return
    }
    const engine = new HostEngine(quiz)
    engineRef.current = engine
    const unsub = engine.subscribe(setSnap)
    void engine.start().catch(() => {
      /* error in snapshot */
    })
    return () => {
      unsub()
      engine.destroy()
      engineRef.current = null
    }
  }, [quiz, nav])

  useEffect(() => {
    if (!snap) return
    if (snap.players.length > prevPlayerCount.current) play('join')
    prevPlayerCount.current = snap.players.length
  }, [snap?.players.length, play, snap])

  useEffect(() => {
    if (snap?.phase === 'question') play('start')
    if (snap?.phase === 'reveal') {
      /* host doesn't know individual — soft tick */
    }
  }, [snap?.phase, play])

  if (!quiz || !snap) {
    return (
      <div className="page center">
        <p>Betöltés…</p>
      </div>
    )
  }

  const engine = engineRef.current!
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  const joinPath = `${window.location.origin}${base}/#/join?pin=${snap.pin}`

  if (snap.peerError) {
    return (
      <div className="page center">
        <h2>Kapcsolódási hiba</h2>
        <p>{snap.peerError}</p>
        <Link to="/host" className="btn btn-primary">
          Vissza
        </Link>
      </div>
    )
  }

  if (!snap.peerReady) {
    return (
      <div className="page center">
        <div className="spinner" />
        <p>PeerJS kapcsolat indítása…</p>
      </div>
    )
  }

  return (
    <div className={`page host-live phase-${snap.phase}`}>
      <header className="topbar">
        <div className="topbar-left">
          <SoundToggle enabled={enabled} onToggle={toggle} />
          <span className="quiz-title-sm">{quiz.title}</span>
        </div>
        {snap.phase === 'lobby' && (
          <Link to="/host" className="btn btn-ghost btn-sm">
            Kilépés
          </Link>
        )}
      </header>

      {snap.phase === 'lobby' && (
        <div className="lobby-host">
          <div className="pin-box">
            <p className="pin-label">Játék PIN</p>
            <p className="pin-code">{snap.pin}</p>
            <p className="pin-join">
              Csatlakozás: <strong>{joinPath}</strong>
            </p>
            <p className="warn-banner">
              ⚠️ Tartsd nyitva ezt a lapot — a házigazda a játék szervere!
            </p>
          </div>

          <div className="lobby-controls">
            <label className="check-row">
              <input
                type="checkbox"
                checked={snap.joiningLocked}
                onChange={(e) => engine.setJoiningLocked(e.target.checked)}
              />
              Csatlakozás lezárása
            </label>
            <button
              type="button"
              className="btn btn-accent btn-xl"
              disabled={snap.players.length === 0}
              onClick={() => {
                play('start')
                engine.startGame()
              }}
            >
              Játék indítása ({snap.players.length})
            </button>
          </div>

          <h2>Játékosok ({snap.players.length})</h2>
          <PlayerChips players={snap.players} onKick={(id) => engine.kick(id)} />
        </div>
      )}

      {(snap.phase === 'question' || snap.phase === 'lock') && snap.publicQuestion && (
        <div className="host-question">
          <div className="q-meta">
            Kérdés {snap.publicQuestion.index + 1} / {snap.publicQuestion.total}
            <span className="answered-count">
              {snap.answerCounts.reduce((a, b) => a + b, 0)} / {snap.players.length} válaszolt
            </span>
          </div>
          <h2 className="q-text">{snap.publicQuestion.text}</h2>
          {snap.phase === 'question' && (
            <TimerBar
              endsAt={snap.endsAt}
              timeLimit={snap.publicQuestion.timeLimit}
              onTick={(r) => {
                if (r > 0 && r <= 5 && Math.ceil(r) !== Math.ceil(r + 0.1)) play('tick')
              }}
            />
          )}
          {snap.phase === 'lock' && <p className="lock-msg">Válaszok lezárva…</p>}
          <AnswerButtons answers={snap.publicQuestion.answers} disabled />
          {snap.phase === 'question' && (
            <button type="button" className="btn btn-ghost" onClick={() => engine.lockAnswers()}>
              Idő lejárta / Lezárás
            </button>
          )}
        </div>
      )}

      {snap.phase === 'reveal' && snap.publicQuestion && (
        <div className="host-question">
          <div className="q-meta">
            Kérdés {snap.publicQuestion.index + 1} / {snap.publicQuestion.total}
          </div>
          <h2 className="q-text">{snap.publicQuestion.text}</h2>
          <p className="reveal-label">Helyes válasz</p>
          <AnswerButtons
            answers={snap.publicQuestion.answers}
            correctIndex={snap.correctDisplayIndex}
            showResults
            counts={snap.answerCounts}
            disabled
          />
        </div>
      )}

      {snap.phase === 'leaderboard' && (
        <div className="host-lb">
          <Leaderboard entries={snap.leaderboard} title="Ranglista" showDelta />
          <button
            type="button"
            className="btn btn-primary btn-xl"
            onClick={() => engine.continueFromLeaderboard()}
          >
            {snap.questionIndex >= quiz.questions.length - 1 ? 'Végeredmény' : 'Következő kérdés'}
          </button>
        </div>
      )}

      {snap.phase === 'final' && (
        <div className="host-final">
          <Leaderboard entries={snap.leaderboard} title="Dobogó" podium />
          <Leaderboard entries={snap.leaderboard} title="Teljes ranglista" />
          <div className="toolbar">
            <button
              type="button"
              className="btn btn-accent btn-xl"
              onClick={() => engine.playAgain()}
            >
              Újra játszás
            </button>
            <Link to="/host" className="btn btn-ghost">
              Kilépés
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
