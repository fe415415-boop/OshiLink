import type { ReactNode, CSSProperties } from 'react'

interface Props {
  onClick: () => void
  disabled?: boolean
  /** 完全アクティブ（囲む ON など） */
  active?: boolean
  /** パネル展開中（デザイン・フォント） */
  open?: boolean
  title?: string
  icon: ReactNode
  label: string
  style?: CSSProperties
}

export default function EditorIconButton({ onClick, disabled, active, open, title, icon, label, style }: Props) {
  const base = 'w-14 py-1.5 rounded-lg font-bold transition-all border flex flex-col items-center gap-0.5'
  const variant = active
    ? 'bg-violet-600 border-violet-400 text-white'
    : open
    ? 'bg-violet-600/30 border-violet-400/50 opacity-100'
    : 'bg-white/5 border-white/10 opacity-60 hover:opacity-90'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${base} ${variant} disabled:opacity-20`}
      style={style}
    >
      <span className="flex items-center justify-center h-5">{icon}</span>
      <span className="text-[10px]">{label}</span>
    </button>
  )
}
