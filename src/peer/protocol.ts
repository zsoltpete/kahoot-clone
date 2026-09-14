/** PeerJS message protocol between host (authority) and players. */

import type { PlayerInfo, QuestionPublic, ScoreEntry } from '../types/quiz'

export const PEER_PREFIX = 'kvizparti-'

export type ClientToHost =
  | { type: 'join'; nickname: string }
  | { type: 'answer'; questionIndex: number; answerIndex: number }
  | { type: 'ping' }

export type HostToClient =
  | { type: 'welcome'; playerId: string; quizTitle: string }
  | { type: 'lobby'; players: PlayerInfo[]; joiningLocked: boolean; quizTitle: string }
  | { type: 'kicked'; reason: string }
  | { type: 'error'; message: string }
  | { type: 'phase'; phase: 'question' | 'lock' | 'reveal' | 'leaderboard' | 'final' }
  | {
      type: 'question'
      question: QuestionPublic
      endsAt: number // Date.now() deadline on host clock (approx)
    }
  | { type: 'lock' }
  | {
      type: 'reveal'
      correctIndex: number
      yourAnswer: number | null
      correct: boolean
      delta: number
      yourScore: number
      yourRank: number
    }
  | { type: 'leaderboard'; entries: ScoreEntry[]; questionIndex: number; total: number }
  | { type: 'final'; podium: ScoreEntry[]; entries: ScoreEntry[] }
  | { type: 'play_again'; quizTitle: string }

export function peerIdFromPin(pin: string): string {
  return `${PEER_PREFIX}${pin}`
}

export function generatePin(): string {
  // 6-digit PIN, avoid leading zeros for display clarity
  return String(Math.floor(100000 + Math.random() * 900000))
}
