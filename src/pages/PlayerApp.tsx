import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { HostToClient } from '../peer/protocol'
import type { PlayerInfo, QuestionPublic, ScoreEntry } from '../types/quiz'
import { connectToHost, type PlayerSession } from '../peer/playerConnect'
import { AnswerButtons } from '../components/AnswerButtons'
import { TimerBar } from '../components/TimerBar'
import { Leaderboard } from '../components/Leaderboard'
import { SoundToggle } from '../components/SoundToggle'
import { useSound } from '../hooks/useSound'

type Phase =
  | 'form'
  | 'connecting'
  | 'lobby'
  | 'question'
  | 'lock'
  | 'reveal'
  | 'leaderboard'
  | 'final'
  | 'kicked'
  | 'error'

export function PlayerApp() {
  const [params] = useSearchParams()
  const [pin, setPin] = useState(params.get('pin') ?? '')
  const [nickname, setNickname] = useState('')
  const [phase, setPhase] = useState<Phase>('form')
  const [error, setError] = useState<string | null>(null)
  const [quizTitle, setQuizTitle] = useState('')
  const [players, setPlayers] = useState<PlayerInfo[]>([])
  const [joiningLocked, setJoiningLocked] = useState(false)
  const [question, setQuestion] = useState<QuestionPublic | null>(null)
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [reveal, setReveal] = useState<{
    correctIndex: number
    yourAnswer: number | null
    correct: boolean
    delta: number
    yourScore: number
    yourRank: number
  } | null>(null)
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([])
  const [podium, setPodium] = useState<ScoreEntry[]>([])
  const sessionRef = useRef<PlayerSession | null>(null)
  const { enabled, toggle, play } = useSound()
  const playRef = useRef(play)
  playRef.current = play

  const cleanup = useCallback(() => {
    sessionRef.current?.close()
    sessionRef.current = null
  }, [])

  useEffect(() => () => cleanup(), [cleanup])

  const handleMessage = useCallback(
    (msg: HostToClient) => {
      switch (msg.type) {
        case 'welcome':
          setQuizTitle(msg.quizTitle)
          setPhase('lobby')
          break
        case 'lobby':
          setPlayers(msg.players)
          setJoiningLocked(msg.joiningLocked)
          setQuizTitle(msg.quizTitle)
          setPhase((p) => (p === 'form' || p === 'connecting' ? 'lobby' : p === 'lobby' ? 'lobby' : p))
          // Always update lobby data; force lobby phase only when waiting
          setPhase((p) => {
            if (p === 'form' || p === 'connecting' || p === 'lobby') return 'lobby'
            return p
          })
          break
        case 'error':
          setError(msg.message)
          setPhase('error')
          cleanup()
          break
        case 'kicked':
          setError(msg.reason)
          setPhase('kicked')
          cleanup()
          break
        case 'question':
          setQuestion(msg.question)
          setEndsAt(msg.endsAt)
          setSelected(null)
          setReveal(null)
          setPhase('question')
          playRef.current('start')
          break
        case 'lock':
          setPhase('lock')
          break
        case 'reveal':
          setReveal({
            correctIndex: msg.correctIndex,
            yourAnswer: msg.yourAnswer,
            correct: msg.correct,
            delta: msg.delta,
            yourScore: msg.yourScore,
            yourRank: msg.yourRank,
          })
          setPhase('reveal')
          playRef.current(msg.correct ? 'correct' : 'wrong')
          break
        case 'leaderboard':
          setLeaderboard(msg.entries)
          setPhase('leaderboard')
          break
        case 'final':
          setPodium(msg.podium)
          setLeaderboard(msg.entries)
          setPhase('final')
          break
        case 'play_again':
          setQuizTitle(msg.quizTitle)
          setQuestion(null)
          setReveal(null)
          setSelected(null)
          setPhase('lobby')
          break
        default:
          break
      }
    },
    [cleanup],
  )

  const join = async () => {
    const p = pin.replace(/\D/g, '').slice(0, 6)
    const nick = nickname.trim()
    if (p.length !== 6) {
      setError('A PIN 6 számjegy')
      return
    }
    if (!nick) {
      setError('Add meg a beceneved')
      return
    }
    setError(null)
    setPhase('connecting')
    cleanup()
    try {
      const session = await connectToHost(
        p,
        (msg) => handleMessage(msg),
        () => {
          setError('A kapcsolat megszakadt (a házigazda bezárhatta a lapot).')
          setPhase('error')
        },
        (m) => {
          setError(m)
          setPhase('error')
        },
      )
      sessionRef.current = session
      session.send({ type: 'join', nickname: nick })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Csatlakozási hiba')
      setPhase('error')
    }
  }

  // Stable handler for late messages after reconnect of closure
  const handleMessageRef = useRef(handleMessage)
  handleMessageRef.current = handleMessage

  const answer = (index: number) => {
    if (phase !== 'question' || selected !== null || !question) return
    setSelected(index)
    sessionRef.current?.send({
      type: 'answer',
      questionIndex: question.index,
      answerIndex: index,
    })
  }

  const resetForm = () => {
    cleanup()
    setPhase('form')
    setError(null)
    setQuestion(null)
    setReveal(null)
  }

  if (phase === 'form' || phase === 'connecting') {
    return (
      <div className="page player-join">
        <header className="topbar">
          <Link to="/" className="back">
            ← Kezdőlap
          </Link>
          <SoundToggle enabled={enabled} onToggle={toggle} />
        </header>
        <h1>Csatlakozás</h1>
        <label className="field">
          <span>PIN kód</span>
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            className="pin-input"
            disabled={phase === 'connecting'}
          />
        </label>
        <label className="field">
          <span>Becenév</span>
          <input
            value={nickname}
            maxLength={20}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="A neved"
            disabled={phase === 'connecting'}
            onKeyDown={(e) => e.key === 'Enter' && void join()}
          />
        </label>
        {error && <p className="error-msg">{error}</p>}
        <button
          type="button"
          className="btn btn-accent btn-xl"
          disabled={phase === 'connecting'}
          onClick={() => void join()}
        >
          {phase === 'connecting' ? 'Csatlakozás…' : 'Belépés'}
        </button>
      </div>
    )
  }

  if (phase === 'error' || phase === 'kicked') {
    return (
      <div className="page center">
        <h2>{phase === 'kicked' ? 'Kirúgtak' : 'Hiba'}</h2>
        <p>{error}</p>
        <button type="button" className="btn btn-primary" onClick={resetForm}>
          Újra
        </button>
      </div>
    )
  }

  if (phase === 'lobby') {
    return (
      <div className="page player-lobby">
        <header className="topbar">
          <SoundToggle enabled={enabled} onToggle={toggle} />
        </header>
        <h1>{quizTitle || 'Lobby'}</h1>
        <p className="muted">Várakozás a házigazdára…</p>
        {joiningLocked && <p className="warn-banner">A csatlakozás le van zárva</p>}
        <div className="player-chips">
          {players.map((p) => (
            <div key={p.id} className="chip">
              {p.nickname}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if ((phase === 'question' || phase === 'lock') && question) {
    return (
      <div className="page player-game">
        <div className="q-meta">
          {question.index + 1}/{question.total}
          <SoundToggle enabled={enabled} onToggle={toggle} />
        </div>
        <h2 className="q-text q-text-player">{question.text}</h2>
        {phase === 'question' && <TimerBar endsAt={endsAt} timeLimit={question.timeLimit} />}
        {phase === 'lock' && (
          <p className="lock-msg">
            {selected === null ? 'Lejárt az idő!' : 'Válasz rögzítve — várj…'}
          </p>
        )}
        <AnswerButtons
          answers={question.answers}
          selected={selected}
          disabled={phase === 'lock' || selected !== null}
          onSelect={answer}
          large
        />
      </div>
    )
  }

  if (phase === 'reveal' && question && reveal) {
    return (
      <div className={`page player-reveal ${reveal.correct ? 'ok' : 'bad'}`}>
        <h2>{reveal.correct ? 'Helyes! 🎉' : 'Nem talált 😅'}</h2>
        <p className="delta">{reveal.correct ? `+${reveal.delta}` : '0'} pont</p>
        <p className="muted">
          Pontszám: {reveal.yourScore} · Helyezés: #{reveal.yourRank}
        </p>
        <AnswerButtons
          answers={question.answers}
          selected={reveal.yourAnswer}
          correctIndex={reveal.correctIndex}
          showResults
          large
        />
      </div>
    )
  }

  if (phase === 'leaderboard') {
    return (
      <div className="page player-lb">
        <Leaderboard entries={leaderboard} title="Ranglista" showDelta />
        <p className="muted center-text">Várj a következő kérdésre…</p>
      </div>
    )
  }

  if (phase === 'final') {
    return (
      <div className="page player-final">
        <Leaderboard entries={podium.length ? podium : leaderboard} title="Dobogó" podium />
        <Leaderboard entries={leaderboard} title="Ranglista" />
        <p className="muted center-text">A házigazda indíthat újra játszást.</p>
        <button type="button" className="btn btn-ghost" onClick={resetForm}>
          Kilépés
        </button>
      </div>
    )
  }

  return null
}
