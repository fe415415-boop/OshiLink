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
  const template = useDiagramStore((s) => s.template)
  const fontStyle = useDiagramStore((s) => s.fontStyle)

  async function handleDownload() {
    if (!cyRef.current) return
    setExporting(true)
    try {
      await exportToPng({ cy: cyRef.current, title, template, fontStyle })
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
    const url = encodeURIComponent(`${window.location.origin}/diagram/${diagramId}`)
    const text = encodeURIComponent(title || '推しリンク')
    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank')
  }

  const canShare = !!diagramId

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-xs mx-4 mb-4 sm:mb-0 rounded-2xl bg-[#1a1a2e] border border-white/10 overflow-hidden shadow-2xl p-6">
        <div className="flex justify-around">

          {/* 画像を保存 */}
          <button
            onClick={handleDownload}
            disabled={exporting}
            className="flex flex-col items-center gap-2 opacity-90 hover:opacity-100 disabled:opacity-40 transition-opacity"
          >
            <span className="text-3xl">📷</span>
            <span className="text-xs text-white/70">{exporting ? '生成中...' : '画像を保存'}</span>
          </button>

          {/* リンクをコピー */}
          <button
            onClick={handleCopyLink}
            disabled={!canShare}
            title={canShare ? undefined : '先に保存してください'}
            className="flex flex-col items-center gap-2 opacity-90 hover:opacity-100 disabled:opacity-30 transition-opacity"
          >
            <span className="text-3xl">🔗</span>
            <span className="text-xs text-white/70">{copied ? 'コピーしました' : 'リンクをコピー'}</span>
          </button>

          {/* X でシェア */}
          <button
            onClick={handleShareX}
            disabled={!canShare}
            title={canShare ? undefined : '先に保存してください'}
            className="flex flex-col items-center gap-2 opacity-90 hover:opacity-100 disabled:opacity-30 transition-opacity"
          >
            <span className="text-3xl font-bold text-white leading-none">𝕏</span>
            <span className="text-xs text-white/70">X</span>
          </button>

        </div>
      </div>
    </div>
  )
}
