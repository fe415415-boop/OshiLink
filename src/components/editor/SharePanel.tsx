'use client'

import { useState } from 'react'
import { Core } from 'cytoscape'
import { useDiagramStore } from '@/store/diagramStore'
import { THEMES } from '@/lib/themes'
import { exportToPng } from '@/lib/imageExport'
import EditorIconButton from './EditorIconButton'

interface Props {
  cyRef: React.RefObject<Core | null>
  diagramId?: string
}

export default function SharePanel({ cyRef, diagramId }: Props) {
  const [shareOpen, setShareOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [copied, setCopied] = useState(false)

  const title = useDiagramStore((s) => s.title)
  const selectedTheme = useDiagramStore((s) => s.theme)
  const fontStyle = useDiagramStore((s) => s.fontStyle)
  const theme = THEMES[selectedTheme]

  const canShare = !!diagramId
  const xLogoSrc = selectedTheme === 'dark' ? '/icons/x-logo-white.png' : '/icons/x-logo-black.png'

  async function handleDownload() {
    if (!cyRef.current) return
    setExporting(true)
    try {
      await exportToPng({ cy: cyRef.current, title, theme: selectedTheme, fontStyle })
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

  return (
    <div className="flex flex-col-reverse gap-1">
      {/* 共有ボタン（DOM先頭 → flex-col-reverse で視覚的に下） */}
      <EditorIconButton
        onClick={() => setShareOpen((v) => !v)}
        open={shareOpen}
        icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="14" cy="3" r="1.5"/><circle cx="14" cy="15" r="1.5"/><circle cx="4" cy="9" r="1.5"/><line x1="5.5" y1="8.1" x2="12.5" y2="4.1"/><line x1="5.5" y1="9.9" x2="12.5" y2="13.9"/></svg>}
        label="共有"
        style={{ color: theme.nodeText, backgroundColor: theme.inputBg, borderColor: theme.panelBorder }}
      />

      {/* 展開パネル（DOM後 → flex-col-reverse で視覚的に上） */}
      <div className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${shareOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="flex flex-col gap-1 pb-1">
            <ShareItem
              onClick={handleDownload}
              disabled={exporting}
              label={exporting ? '生成中...' : '画像で保存'}
              nodeText={theme.nodeText}
              inputBg={theme.inputBg}
              panelBorder={theme.panelBorder}
            >
              <span className="text-base leading-none">📷</span>
            </ShareItem>
            <ShareItem
              onClick={handleCopyLink}
              disabled={!canShare}
              label={copied ? 'コピー済み' : 'URLコピー'}
              nodeText={theme.nodeText}
              inputBg={theme.inputBg}
              panelBorder={theme.panelBorder}
            >
              <span className="text-base leading-none">🔗</span>
            </ShareItem>
            <ShareItem
              onClick={handleShareX}
              disabled={!canShare}
              label="Xでポスト"
              nodeText={theme.nodeText}
              inputBg={theme.inputBg}
              panelBorder={theme.panelBorder}
            >
              <img src={xLogoSrc} alt="X" width={16} height={16} />
            </ShareItem>
          </div>
        </div>
      </div>
    </div>
  )
}

function ShareItem({
  children,
  label,
  onClick,
  disabled,
  nodeText,
  inputBg,
  panelBorder,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  nodeText: string
  inputBg: string
  panelBorder: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-14 py-1.5 rounded-lg flex flex-col items-center gap-0.5 transition-all border opacity-60 hover:opacity-90 disabled:opacity-20"
      style={{ color: nodeText, backgroundColor: inputBg, borderColor: panelBorder }}
    >
      <span className="flex items-center justify-center h-5">{children}</span>
      <span className="text-[10px] whitespace-nowrap">{label}</span>
    </button>
  )
}
