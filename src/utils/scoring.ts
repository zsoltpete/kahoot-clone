/** Kahoot-like scoring: correct answers get base points + speed bonus. */

const BASE = 1000

/**
 * Faster answers score higher. At t=0 → 1000, at timeLimit → 500.
 * Wrong / timeout → 0.
 */
export function scoreAnswer(
  correct: boolean,
  elapsedMs: number,
  timeLimitSec: number,
): number {
  if (!correct) return 0
  const limitMs = Math.max(1, timeLimitSec * 1000)
  const ratio = Math.min(1, Math.max(0, elapsedMs / limitMs))
  return Math.round(BASE * (1 - ratio * 0.5))
}

export function rankPlayers<T extends { score: number }>(players: T[]): T[] {
  return [...players].sort((a, b) => b.score - a.score)
}
