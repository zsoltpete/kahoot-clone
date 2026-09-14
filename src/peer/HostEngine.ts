/**
 * Host-side realtime authority using PeerJS.
 * The host browser must stay open — it is the game server.
 */

import Peer, { type DataConnection } from 'peerjs'
import type { PlayerInfo, Quiz, QuestionPublic, ScoreEntry, HostPhase } from '../types/quiz'
import {
  type ClientToHost,
  type HostToClient,
  generatePin,
  peerIdFromPin,
} from './protocol'
import { scoreAnswer, rankPlayers } from '../utils/scoring'
import { shuffleWithMap, invertMap } from '../utils/shuffle'

export interface HostSnapshot {
  pin: string
  peerReady: boolean
  peerError: string | null
  phase: HostPhase
  players: PlayerInfo[]
  joiningLocked: boolean
  questionIndex: number
  publicQuestion: QuestionPublic | null
  endsAt: number | null
  correctDisplayIndex: number | null
  answerCounts: number[]
  leaderboard: ScoreEntry[]
  lastDeltas: Record<string, { correct: boolean; delta: number }>
}

type Listener = (snap: HostSnapshot) => void

interface ConnMeta {
  conn: DataConnection
  playerId: string
  nickname: string
}

export class HostEngine {
  private peer: Peer | null = null
  private pin = ''
  private quiz: Quiz
  private listeners = new Set<Listener>()
  private conns = new Map<string, ConnMeta>() // playerId → meta
  private byPeer = new Map<string, string>() // peer connection id → playerId
  private phase: HostPhase = 'lobby'
  private joiningLocked = false
  private questionIndex = -1
  private publicQuestion: QuestionPublic | null = null
  private orderMap: number[] = []
  private endsAt: number | null = null
  private questionStartedAt = 0
  private answers = new Map<string, { displayIndex: number; at: number }>()
  private scores = new Map<string, number>()
  private lastDeltas: Record<string, { correct: boolean; delta: number }> = {}
  private correctDisplayIndex: number | null = null
  private peerReady = false
  private peerError: string | null = null
  private timers: ReturnType<typeof setTimeout>[] = []

  constructor(quiz: Quiz) {
    this.quiz = structuredClone(quiz)
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    fn(this.snapshot())
    return () => this.listeners.delete(fn)
  }

  private emit() {
    const snap = this.snapshot()
    this.listeners.forEach((fn) => fn(snap))
  }

  snapshot(): HostSnapshot {
    return {
      pin: this.pin,
      peerReady: this.peerReady,
      peerError: this.peerError,
      phase: this.phase,
      players: this.playerList(),
      joiningLocked: this.joiningLocked,
      questionIndex: this.questionIndex,
      publicQuestion: this.publicQuestion,
      endsAt: this.endsAt,
      correctDisplayIndex: this.correctDisplayIndex,
      answerCounts: this.countAnswers(),
      leaderboard: this.buildLeaderboard(),
      lastDeltas: { ...this.lastDeltas },
    }
  }

  private playerList(): PlayerInfo[] {
    return [...this.conns.values()].map((m) => ({
      id: m.playerId,
      nickname: m.nickname,
      score: this.scores.get(m.playerId) ?? 0,
      connected: m.conn.open,
    }))
  }

  private buildLeaderboard(): ScoreEntry[] {
    return rankPlayers(
      this.playerList().map((p) => ({
        id: p.id,
        nickname: p.nickname,
        score: p.score,
        lastDelta: this.lastDeltas[p.id]?.delta,
        correct: this.lastDeltas[p.id]?.correct,
      })),
    )
  }

  private countAnswers(): number[] {
    const n = this.publicQuestion?.answers.length ?? 0
    const counts = Array(n).fill(0)
    this.answers.forEach((a) => {
      if (a.displayIndex >= 0 && a.displayIndex < n) counts[a.displayIndex]++
    })
    return counts
  }

  async start(): Promise<string> {
    // Retry a few PINs if peer id is taken
    for (let attempt = 0; attempt < 5; attempt++) {
      const pin = generatePin()
      try {
        await this.openPeer(pin)
        this.pin = pin
        this.peerReady = true
        this.emit()
        return pin
      } catch (e) {
        this.destroyPeerOnly()
        if (attempt === 4) {
          this.peerError = e instanceof Error ? e.message : 'PeerJS hiba'
          this.emit()
          throw e
        }
      }
    }
    throw new Error('Nem sikerült PeerJS kapcsolatot nyitni')
  }

  private openPeer(pin: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const id = peerIdFromPin(pin)
      const peer = new Peer(id, {
        debug: 0,
      })
      this.peer = peer

      const timeout = setTimeout(() => {
        reject(new Error('PeerJS időtúllépés — ellenőrizd a hálózatot'))
      }, 15000)

      peer.on('open', () => {
        clearTimeout(timeout)
        resolve()
      })
      peer.on('error', (err) => {
        clearTimeout(timeout)
        reject(err)
      })
      peer.on('connection', (conn) => this.onConnection(conn))
    })
  }

  private onConnection(conn: DataConnection) {
    conn.on('open', () => {
      // Wait for join message
    })
    conn.on('data', (raw) => {
      const msg = raw as ClientToHost
      this.handleClient(conn, msg)
    })
    conn.on('close', () => {
      const pid = this.byPeer.get(conn.connectionId)
      if (pid) {
        const meta = this.conns.get(pid)
        if (meta) {
          // Keep score but mark disconnected — remove from lobby if still lobby
          if (this.phase === 'lobby') {
            this.conns.delete(pid)
            this.scores.delete(pid)
          }
        }
        this.byPeer.delete(conn.connectionId)
        this.broadcastLobby()
        this.emit()
      }
    })
  }

  private handleClient(conn: DataConnection, msg: ClientToHost) {
    if (msg.type === 'join') {
      this.handleJoin(conn, msg.nickname)
      return
    }
    const pid = this.byPeer.get(conn.connectionId)
    if (!pid) return

    if (msg.type === 'answer') {
      this.handleAnswer(pid, msg.questionIndex, msg.answerIndex)
    }
  }

  private handleJoin(conn: DataConnection, nickname: string) {
    const nick = nickname.trim().slice(0, 20)
    if (!nick) {
      this.send(conn, { type: 'error', message: 'Add meg a beceneved!' })
      conn.close()
      return
    }
    if (this.joiningLocked || this.phase !== 'lobby') {
      this.send(conn, { type: 'error', message: 'A csatlakozás le van zárva.' })
      conn.close()
      return
    }
    // Unique nickname (case-insensitive)
    const taken = [...this.conns.values()].some(
      (m) => m.nickname.toLowerCase() === nick.toLowerCase(),
    )
    if (taken) {
      this.send(conn, { type: 'error', message: 'Ez a név már foglalt.' })
      conn.close()
      return
    }

    const playerId = crypto.randomUUID()
    this.conns.set(playerId, { conn, playerId, nickname: nick })
    this.byPeer.set(conn.connectionId, playerId)
    this.scores.set(playerId, 0)

    this.send(conn, {
      type: 'welcome',
      playerId,
      quizTitle: this.quiz.title,
    })
    this.broadcastLobby()
    this.emit()
  }

  private send(conn: DataConnection, msg: HostToClient) {
    if (conn.open) {
      try {
        conn.send(msg)
      } catch {
        /* ignore */
      }
    }
  }

  private broadcast(msg: HostToClient, except?: string) {
    this.conns.forEach((m) => {
      if (except && m.playerId === except) return
      this.send(m.conn, msg)
    })
  }

  private broadcastLobby() {
    const msg: HostToClient = {
      type: 'lobby',
      players: this.playerList(),
      joiningLocked: this.joiningLocked,
      quizTitle: this.quiz.title,
    }
    this.broadcast(msg)
  }

  setJoiningLocked(locked: boolean) {
    this.joiningLocked = locked
    this.broadcastLobby()
    this.emit()
  }

  kick(playerId: string) {
    const meta = this.conns.get(playerId)
    if (!meta) return
    this.send(meta.conn, { type: 'kicked', reason: 'A házigazda kirúgott.' })
    meta.conn.close()
    this.conns.delete(playerId)
    this.byPeer.delete(meta.conn.connectionId)
    this.scores.delete(playerId)
    this.broadcastLobby()
    this.emit()
  }

  startGame() {
    if (this.conns.size === 0) return
    this.clearTimers()
    this.joiningLocked = true
    this.questionIndex = -1
    this.broadcastLobby()
    this.nextQuestion()
  }

  nextQuestion() {
    this.clearTimers()
    this.questionIndex++
    if (this.questionIndex >= this.quiz.questions.length) {
      this.showFinal()
      return
    }

    const q = this.quiz.questions[this.questionIndex]
    let answers = q.answers.map((a) => a.text)
    let orderMap = answers.map((_, i) => i)
    if (this.quiz.randomizeAnswers) {
      const shuffled = shuffleWithMap(q.answers)
      answers = shuffled.items.map((a) => a.text)
      orderMap = shuffled.orderMap
    }
    this.orderMap = orderMap
    this.publicQuestion = {
      index: this.questionIndex,
      total: this.quiz.questions.length,
      text: q.text,
      answers,
      timeLimit: q.timeLimit,
    }
    this.answers.clear()
    this.lastDeltas = {}
    this.correctDisplayIndex = null
    this.questionStartedAt = Date.now()
    this.endsAt = this.questionStartedAt + q.timeLimit * 1000
    this.phase = 'question'

    this.broadcast({
      type: 'question',
      question: {
        index: this.questionIndex,
        total: this.quiz.questions.length,
        text: q.text,
        answers,
        timeLimit: q.timeLimit,
      },
      endsAt: this.endsAt,
    })
    this.emit()

    this.timers.push(
      setTimeout(() => this.lockAnswers(), q.timeLimit * 1000),
    )
  }

  private handleAnswer(playerId: string, questionIndex: number, answerIndex: number) {
    if (this.phase !== 'question') return
    if (questionIndex !== this.questionIndex) return
    if (this.answers.has(playerId)) return
    if (
      !this.publicQuestion ||
      answerIndex < 0 ||
      answerIndex >= this.publicQuestion.answers.length
    ) {
      return
    }
    this.answers.set(playerId, { displayIndex: answerIndex, at: Date.now() })
    this.emit()

    // Auto-lock when everyone answered
    if (this.answers.size >= this.conns.size) {
      this.lockAnswers()
    }
  }

  lockAnswers() {
    if (this.phase !== 'question') return
    this.clearTimers()
    this.phase = 'lock'
    this.broadcast({ type: 'lock' })
    this.emit()
    this.timers.push(setTimeout(() => this.reveal(), 1200))
  }

  private reveal() {
    if (this.phase !== 'lock' && this.phase !== 'question') return
    this.clearTimers()
    const q = this.quiz.questions[this.questionIndex]
    const correctOrig = q.answers.findIndex((a) => a.correct)
    const inv = invertMap(this.orderMap)
    this.correctDisplayIndex = inv[correctOrig] ?? correctOrig

    this.lastDeltas = {}
    const revealPayloads: {
      playerId: string
      displayIdx: number | null
      correct: boolean
      delta: number
      yourScore: number
    }[] = []

    this.conns.forEach((m) => {
      const ans = this.answers.get(m.playerId)
      const displayIdx = ans?.displayIndex ?? null
      const origIdx =
        displayIdx !== null ? (this.orderMap[displayIdx] ?? displayIdx) : -1
      const correct = origIdx === correctOrig
      const elapsed = ans ? ans.at - this.questionStartedAt : q.timeLimit * 1000
      const delta = scoreAnswer(correct, elapsed, q.timeLimit)
      const prev = this.scores.get(m.playerId) ?? 0
      const yourScore = prev + delta
      this.scores.set(m.playerId, yourScore)
      this.lastDeltas[m.playerId] = { correct, delta }
      revealPayloads.push({ playerId: m.playerId, displayIdx, correct, delta, yourScore })
    })

    const ranked = this.buildLeaderboard()
    revealPayloads.forEach((r) => {
      const meta = this.conns.get(r.playerId)
      if (!meta) return
      const rank = ranked.findIndex((e) => e.id === r.playerId) + 1
      this.send(meta.conn, {
        type: 'reveal',
        correctIndex: this.correctDisplayIndex!,
        yourAnswer: r.displayIdx,
        correct: r.correct,
        delta: r.delta,
        yourScore: r.yourScore,
        yourRank: rank || this.conns.size,
      })
    })

    this.phase = 'reveal'
    this.emit()
    this.timers.push(setTimeout(() => this.showLeaderboard(), 3500))
  }

  private showLeaderboard() {
    this.phase = 'leaderboard'
    const entries = this.buildLeaderboard()
    this.broadcast({
      type: 'leaderboard',
      entries,
      questionIndex: this.questionIndex,
      total: this.quiz.questions.length,
    })
    this.emit()
  }

  /** Host advances from leaderboard to next question / final. */
  continueFromLeaderboard() {
    if (this.phase !== 'leaderboard') return
    if (this.questionIndex >= this.quiz.questions.length - 1) {
      this.showFinal()
    } else {
      this.nextQuestion()
    }
  }

  private showFinal() {
    this.clearTimers()
    this.phase = 'final'
    const entries = this.buildLeaderboard()
    const podium = entries.slice(0, 3)
    this.broadcast({ type: 'final', podium, entries })
    this.emit()
  }

  playAgain() {
    this.clearTimers()
    this.scores.forEach((_, id) => this.scores.set(id, 0))
    this.questionIndex = -1
    this.publicQuestion = null
    this.answers.clear()
    this.lastDeltas = {}
    this.correctDisplayIndex = null
    this.endsAt = null
    this.joiningLocked = false
    this.phase = 'lobby'
    this.broadcast({ type: 'play_again', quizTitle: this.quiz.title })
    this.broadcastLobby()
    this.emit()
  }

  private clearTimers() {
    this.timers.forEach(clearTimeout)
    this.timers = []
  }

  private destroyPeerOnly() {
    if (this.peer) {
      this.peer.destroy()
      this.peer = null
    }
  }

  destroy() {
    this.clearTimers()
    this.conns.forEach((m) => {
      try {
        m.conn.close()
      } catch {
        /* ignore */
      }
    })
    this.conns.clear()
    this.destroyPeerOnly()
  }
}
