const COLORS = [
  { bg: '#e21b3c', shape: '▲', name: 'red' },
  { bg: '#1368ce', shape: '◆', name: 'blue' },
  { bg: '#d89e00', shape: '●', name: 'yellow' },
  { bg: '#26890c', shape: '■', name: 'green' },
] as const

interface Props {
  answers: string[]
  selected?: number | null
  correctIndex?: number | null
  disabled?: boolean
  showResults?: boolean
  counts?: number[]
  onSelect?: (index: number) => void
  large?: boolean
}

export function AnswerButtons({
  answers,
  selected = null,
  correctIndex = null,
  disabled,
  showResults,
  counts,
  onSelect,
  large,
}: Props) {
  return (
    <div className={`answer-grid ${large ? 'answer-grid--large' : ''}`}>
      {answers.map((text, i) => {
        const c = COLORS[i % 4]
        let extra = ''
        if (showResults) {
          if (i === correctIndex) extra = 'answer--correct'
          else if (selected === i) extra = 'answer--wrong'
          else extra = 'answer--dim'
        } else if (selected === i) {
          extra = 'answer--selected'
        }
        return (
          <button
            key={i}
            type="button"
            className={`answer-btn ${extra}`}
            style={{ background: c.bg }}
            disabled={disabled || showResults}
            onClick={() => onSelect?.(i)}
          >
            <span className="answer-shape" aria-hidden>
              {c.shape}
            </span>
            <span className="answer-text">{text}</span>
            {counts && showResults && (
              <span className="answer-count">{counts[i] ?? 0}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export { COLORS as ANSWER_COLORS }
