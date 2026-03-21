import type { ReactNode } from 'react'

interface Props {
  className?: string
  children: ReactNode
}

// PC: スクロールバー表示 / スマホ: スクロールバー非表示
export default function HScrollList({ className = '', children }: Props) {
  return (
    <div className={`flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:[scrollbar-width:auto] md:[&::-webkit-scrollbar]:block ${className}`}>
      {children}
    </div>
  )
}
