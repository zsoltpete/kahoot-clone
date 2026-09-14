import type { PlayerInfo } from '../types/quiz'

interface Props {
  players: PlayerInfo[]
  onKick?: (id: string) => void
}

export function PlayerChips({ players, onKick }: Props) {
  return (
    <div className="player-chips">
      {players.map((p) => (
        <div key={p.id} className={`chip ${p.connected ? '' : 'chip--off'}`}>
          <span>{p.nickname}</span>
          {onKick && (
            <button
              type="button"
              className="chip-kick"
              onClick={() => onKick(p.id)}
              title="Kirúgás"
            >
              ×
            </button>
          )}
        </div>
      ))}
      {players.length === 0 && (
        <p className="muted">Még senki sem csatlakozott…</p>
      )}
    </div>
  )
}
