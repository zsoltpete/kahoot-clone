interface Props {
  enabled: boolean
  onToggle: () => void
}

export function SoundToggle({ enabled, onToggle }: Props) {
  return (
    <button
      type="button"
      className="icon-btn"
      onClick={onToggle}
      title={enabled ? 'Hang ki' : 'Hang be'}
      aria-label={enabled ? 'Hang ki' : 'Hang be'}
    >
      {enabled ? '🔊' : '🔇'}
    </button>
  )
}
