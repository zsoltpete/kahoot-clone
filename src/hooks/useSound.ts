import { useCallback, useEffect, useRef, useState } from 'react'

type SoundKind = 'correct' | 'wrong' | 'tick' | 'start' | 'join'

/** Simple Web Audio beeps — no external assets required. */
function playTone(
  ctx: AudioContext,
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  gain = 0.08,
) {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.value = gain
  osc.connect(g)
  g.connect(ctx.destination)
  const now = ctx.currentTime
  g.gain.setValueAtTime(gain, now)
  g.gain.exponentialRampToValueAtTime(0.001, now + duration)
  osc.start(now)
  osc.stop(now + duration)
}

export function useSound() {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem('kviz-sound') !== 'off'
    } catch {
      return true
    }
  })
  const ctxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem('kviz-sound', enabled ? 'on' : 'off')
    } catch {
      /* ignore */
    }
  }, [enabled])

  const ensureCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext()
    }
    if (ctxRef.current.state === 'suspended') {
      void ctxRef.current.resume()
    }
    return ctxRef.current
  }, [])

  const play = useCallback(
    (kind: SoundKind) => {
      if (!enabled) return
      try {
        const ctx = ensureCtx()
        switch (kind) {
          case 'correct':
            playTone(ctx, 523, 0.12)
            setTimeout(() => playTone(ctx, 659, 0.12), 100)
            setTimeout(() => playTone(ctx, 784, 0.2), 200)
            break
          case 'wrong':
            playTone(ctx, 200, 0.25, 'square', 0.06)
            break
          case 'tick':
            playTone(ctx, 880, 0.05, 'triangle', 0.04)
            break
          case 'start':
            playTone(ctx, 392, 0.1)
            setTimeout(() => playTone(ctx, 523, 0.15), 120)
            break
          case 'join':
            playTone(ctx, 660, 0.08, 'triangle', 0.05)
            break
        }
      } catch {
        /* autoplay / audio unavailable */
      }
    },
    [enabled, ensureCtx],
  )

  const toggle = useCallback(() => setEnabled((v) => !v), [])

  return { enabled, toggle, play }
}
