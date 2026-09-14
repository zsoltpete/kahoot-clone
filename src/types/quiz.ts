/** Quiz and game domain types (English comments). */

export interface Answer {
  text: string
  correct: boolean
}

export interface Question {
  id: string
  text: string
  answers: Answer[] // 2–4 answers
  timeLimit: number // seconds, default 20
}

export interface Quiz {
  id: string
  title: string
  questions: Question[]
  randomizeAnswers: boolean
}

export interface PlayerInfo {
  id: string
  nickname: string
  score: number
  connected: boolean
}

export type HostPhase =
  | 'lobby'
  | 'question'
  | 'lock'
  | 'reveal'
  | 'leaderboard'
  | 'final'

export interface QuestionPublic {
  index: number
  total: number
  text: string
  answers: string[] // texts only, possibly shuffled
  timeLimit: number
  /** Maps display index → original answer index (host-only use on host). */
  orderMap?: number[]
}

export interface ScoreEntry {
  id: string
  nickname: string
  score: number
  lastDelta?: number
  correct?: boolean
}
