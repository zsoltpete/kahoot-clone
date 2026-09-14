import { useEffect, useState } from 'react'

interface Props {
  endsAt: number | null
  timeLimit: number
  onTick?: (remaining: number) => void
}

export function TimerBar({ endsAt, timeLimit, onTick }: Props) {
  const [remaining, setRemaining] = useState(timeLimit)

  useEffect(() => {
    if (!endsAt) {
      setRemaining(timeLimit)
      return
    }
    const tick = () => {
      const r = Math.max(0, (endsAt - Date.now()) / 1000)
      setRemaining(r)
      onTick?.(r)
    }
    tick()
    const id = setInterval(tick, 100)
    return () => clearInterval(id)
  }, [endsAt, timeLimit, onTick])

  const pct = timeLimit > 0 ? (remaining / timeLimit) * 100 : 0
  const urgent = remaining <= 5

  return (
    <div className="timer-wrap">
      <div className={`timer-bar ${urgent ? 'timer-bar--urgent' : ''}`}>
        <div className="timer-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="timer-num">{Math.ceil(remaining)}</span>
    </div>
  )
}
