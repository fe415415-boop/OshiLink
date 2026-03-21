'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Core } from 'cytoscape'
import { useDiagramStore } from '@/store/diagramStore'
import { THEMES, FONT_FAMILIES } from '@/lib/themes'
import CharacterPicker from './CharacterPicker'
import DesignPanel from './DesignPanel'
import SaveDownloadModal from './SaveDownloadModal'

const CytoscapeGraph = dynamic(() => import('./CytoscapeGraph'), { ssr: false })

export default function DiagramEditor() {
  const cyRef = useRef<Core | null>(null)
  const [showSaveModal, setShowSaveModal] = useState(false)

  const nodes = useDiagramStore((s) => s.nodes)
  const template = useDiagramStore((s) => s.template)
  const fontStyle = useDiagramStore((s) => s.fontStyle)

  const theme = THEMES[template]
  const fontFamily = FONT_FAMILIES[fontStyle]

  const handleCyReady = useCallback((cy: Core) => { cyRef.current = cy }, [])

  useEffect(() => {
    if (nodes.length === 0) return
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    const originalPushState = history.pushState.bind(history)
    history.pushState = function(state, unused, url) {
      const targetPath = typeof url === 'string' ? url : url?.toString() ?? ''
      const isLeavingEditor = window.location.pathname.startsWith('/editor/') && !targetPath.startsWith('/editor/')
      if (isLeavingEditor) {
        if (!window.confirm('未保存の編集があります。ページを離れますか？')) return
      }
      originalPushState(state, unused, url)
    }
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      history.pushState = originalPushState
    }
  }, [nodes.length])

  return (
    <div
      className="flex flex-col h-full w-full overflow-hidden"
      style={{ color: theme.nodeText, background: theme.background, fontFamily }}
    >
      {/* グラフエリア */}
      <main className="flex-1 relative overflow-hidden min-h-0">
        {/* デザイン切り替え（右上フローティング） */}
        <div className="absolute top-3 right-3 z-10">
          <DesignPanel cyRef={cyRef} />
        </div>

        {/* 保存/ダウンロードボタン（左下） */}
        <button
          onClick={() => setShowSaveModal(true)}
          disabled={nodes.length === 0}
          className="absolute bottom-4 left-4 z-10 flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold disabled:opacity-30 transition-colors shadow-lg"
        >
          <span>↓</span>
          <span>保存 / ダウンロード</span>
        </button>

        <CytoscapeGraph onCyReady={handleCyReady} />
      </main>

      {/* 人物フッター */}
      <footer
        className="shrink-0 border-t overflow-hidden"
        style={{
          background: theme.panelBg,
          borderColor: theme.panelBorder,
          height: '88px',
        }}
      >
        <CharacterPicker />
      </footer>

      {showSaveModal && (
        <SaveDownloadModal cyRef={cyRef} onClose={() => setShowSaveModal(false)} />
      )}
    </div>
  )
}
