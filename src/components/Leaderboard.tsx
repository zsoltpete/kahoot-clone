import type { ScoreEntry } from '../types/quiz'

interface Props {
  entries: ScoreEntry[]
  title?: string
  showDelta?: boolean
  podium?: boolean
}

export function Leaderboard({ entries, title, showDelta, podium }: Props) {
  if (podium) {
    const top = entries.slice(0, 3)
    const order = [1, 0, 2] // 2nd, 1st, 3rd visual order
    return (
      <div className="podium">
        {title && <h2>{title}</h2>}
        <div className="podium-row">
          {order.map((idx) => {
            const e = top[idx]
            if (!e) return <div key={idx} className="podium-slot empty" />
            const place = idx + 1
            return (
              <div key={e.id} className={`podium-slot place-${place}`}>
                <div className="podium-medal">
                  {place === 1 ? '🥇' : place === 2 ? '🥈' : '🥉'}
                </div>
                <div className="podium-name">{e.nickname}</div>
                <div className="podium-score">{e.score}</div>
                <div className={`podium-block h${place}`} />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="leaderboard">
      {title && <h2>{title}</h2>}
      <ol>
        {entries.map((e, i) => (
          <li key={e.id}>
            <span className="lb-rank">{i + 1}.</span>
            <span className="lb-name">{e.nickname}</span>
            {showDelta && e.lastDelta != null && (
              <span className={`lb-delta ${e.correct ? 'up' : 'zero'}`}>
                {e.correct ? `+${e.lastDelta}` : '0'}
              </span>
            )}
            <span className="lb-score">{e.score}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
