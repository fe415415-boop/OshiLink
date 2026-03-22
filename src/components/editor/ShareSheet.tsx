'use client'

import { useState } from 'react'
import { Core } from 'cytoscape'
import { useDiagramStore } from '@/store/diagramStore'
import { exportToPng } from '@/lib/imageExport'

interface Props {
  cyRef: React.RefObject<Core | null>
  diagramId?: string
  onClose: () => void
}

export default function ShareSheet({ cyRef, diagramId, onClose }: Props) {
  const [exporting, setExporting] = useState(false)
  const [copied, setCopied] = useState(false)

  const title = useDiagramStore((s) => s.title)
  const theme = useDiagramStore((s) => s.theme)
  const fontStyle = useDiagramStore((s) => s.fontStyle)

  async function handleDownload() {
    if (!cyRef.current) return
    setExporting(true)
    try {
      await exportToPng({ cy: cyRef.current, title, theme, fontStyle })
    } finally {
      setExporting(false)
    }
  }

  async function handleCopyLink() {
    if (!diagramId) return
    const url = `${window.location.origin}/diagram/${diagramId}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleShareX() {
    if (!diagramId) return
    const diagramUrl = encodeURIComponent(`${window.location.origin}/diagram/${diagramId}`)
    const text = encodeURIComponent(title || '')
    window.open(`https://x.com/intent/tweet?text=${text}&url=${diagramUrl}`, '_blank')
  }

  const canShare = !!diagramId

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-xs mx-4 mb-4 sm:mb-0 rounded-2xl bg-[#1a1a2e] border border-white/10 overflow-hidden shadow-2xl p-6">
        <div className="flex justify-center gap-8">

          <ShareButton onClick={handleDownload} disabled={exporting} label={exporting ? '生成中...' : '画像を保存'}>
            <span className="text-2xl leading-none">📷</span>
          </ShareButton>

          <ShareButton onClick={handleCopyLink} disabled={!canShare} label={copied ? 'コピーしました' : 'リンクをコピー'}>
            <span className="text-2xl leading-none">🔗</span>
          </ShareButton>

          <ShareButton onClick={handleShareX} disabled={!canShare} label="Xでポスト">
            <img src="/icons/x-logo.svg" alt="X" width={24} height={24} />
          </ShareButton>

        </div>
      </div>
    </div>
  )
}

function ShareButton({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-2 opacity-90 hover:opacity-100 disabled:opacity-30 transition-opacity"
    >
      <div className="h-9 w-9 flex items-center justify-center">
        {children}
      </div>
      <span className="text-xs text-white/70 whitespace-nowrap">{label}</span>
    </button>
  )
}
