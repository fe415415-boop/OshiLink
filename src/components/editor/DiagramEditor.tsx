'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Core } from 'cytoscape'
import { useDiagramStore } from '@/store/diagramStore'
import { THEMES, FONT_FAMILIES } from '@/lib/themes'
import { createClient } from '@/lib/supabase/client'
import CharacterPicker from './CharacterPicker'
import DesignPanel from './DesignPanel'
import EditorIconButton from './EditorIconButton'
import SaveDownloadModal from './SaveDownloadModal'
import ShareSheet from './ShareSheet'
const CytoscapeGraph = dynamic(() => import('./CytoscapeGraph'), { ssr: false })

interface Props {
  diagramId?: string
  initialIsPublic?: boolean
}

export default function DiagramEditor({ diagramId, initialIsPublic = false }: Props) {
  const cyRef = useRef<Core | null>(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showShareSheet, setShowShareSheet] = useState(false)
  const [isPublic, setIsPublic] = useState(initialIsPublic)
  const [togglingPublic, setTogglingPublic] = useState(false)

  const nodes = useDiagramStore((s) => s.nodes)
  const template = useDiagramStore((s) => s.template)
  const fontStyle = useDiagramStore((s) => s.fontStyle)
  const past = useDiagramStore((s) => s.past)
  const future = useDiagramStore((s) => s.future)
  const undo = useDiagramStore((s) => s.undo)
  const redo = useDiagramStore((s) => s.redo)
  const autoLayout = useDiagramStore((s) => s.autoLayout)
  const setAutoLayout = useDiagramStore((s) => s.setAutoLayout)
  const pushHistory = useDiagramStore((s) => s.pushHistory)

  const theme = THEMES[template]
  const fontFamily = FONT_FAMILIES[fontStyle]

  const handleCyReady = useCallback((cy: Core) => { cyRef.current = cy }, [])

  const handleToggleAutoLayout = useCallback(() => {
    pushHistory()
    if (!autoLayout) {
      setAutoLayout(true)
      const c = cyRef.current
      if (!c || c.destroyed() || c.nodes('[nodeType!="box"]').length === 0) return
      const boxNodes = c.nodes('[nodeType="box"]')
      boxNodes.lock()
      try {
        const layout = c.layout({
          name: 'fcose',
          animate: true,
          animationDuration: 400,
          randomize: false,
          nodeRepulsion: 6000,
          idealEdgeLength: 150,
          nodeDimensionsIncludeLabels: true,
          fit: false,
        } as Parameters<Core['layout']>[0])
        layout.one('layoutstop', () => {
          boxNodes.unlock()
          c.fit(undefined, 40)
          c.nodes('[nodeType!="box"]').forEach((n) => {
            const pos = n.position()
            useDiagramStore.getState().updateNodePosition(n.data('storeId'), pos.x, pos.y)
          })
        })
        layout.run()
      } catch {
        boxNodes.unlock()
      }
    } else {
      setAutoLayout(false)
    }
  }, [autoLayout, setAutoLayout, pushHistory])

  async function handleTogglePublic() {
    if (!diagramId || togglingPublic) return
    setTogglingPublic(true)
    const supabase = createClient()
    const next = !isPublic
    await supabase.from('diagrams').update({ is_public: next }).eq('id', diagramId)
    setIsPublic(next)
    setTogglingPublic(false)
  }

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
        {/* Undo/Redo ボタン（左上） */}
        <div className="absolute top-3 left-3 z-10 flex gap-1">
          <EditorIconButton
            onClick={undo}
            disabled={past.length === 0}
            title="元に戻す (Ctrl+Z)"
            icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9a6 6 0 1 0 1.5-4H3M3 3v4h4"/></svg>}
            label="戻る"
            style={{ color: theme.nodeText }}
          />
          <EditorIconButton
            onClick={redo}
            disabled={future.length === 0}
            title="やり直す (Ctrl+Y)"
            icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 9a6 6 0 1 1-1.5-4H15M15 3v4h-4"/></svg>}
            label="進む"
            style={{ color: theme.nodeText }}
          />
        </div>

        {/* デザイン切り替え（右上フローティング） */}
        <div className="absolute top-3 right-3 z-10">
          <DesignPanel />
        </div>

        {/* 共有・保存ボタン（左下） */}
        <div className="absolute bottom-4 left-4 z-10 flex gap-1">
          <EditorIconButton
            onClick={() => setShowShareSheet(true)}
            icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="14" cy="3" r="1.5"/><circle cx="14" cy="15" r="1.5"/><circle cx="4" cy="9" r="1.5"/><line x1="5.5" y1="8.1" x2="12.5" y2="4.1"/><line x1="5.5" y1="9.9" x2="12.5" y2="13.9"/></svg>}
            label="共有"
            style={{ color: theme.nodeText }}
          />
          <EditorIconButton
            onClick={() => setShowSaveModal(true)}
            disabled={nodes.length === 0}
            active
            icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h8l3 3v9a1 1 0 0 1-1 1Z"/><path d="M12 14v-5H6v5M6 2v4h5"/></svg>}
            label="保存"
          />
        </div>

        {/* 右下トグルボタン群 */}
        <div className="absolute bottom-4 right-4 z-10 flex gap-1">
          {/* 公開/非公開トグル - 既存相関図のみ */}
          {diagramId && (
            <button
              onClick={handleTogglePublic}
              disabled={togglingPublic}
              className={`w-14 py-1.5 rounded-lg font-bold transition-all border flex flex-col items-center gap-0.5 shadow-lg ${
                isPublic
                  ? 'bg-green-600 border-green-400 text-white'
                  : 'bg-white/5 border-white/10 opacity-60 hover:opacity-90'
              } disabled:opacity-30`}
              style={{ color: isPublic ? undefined : theme.nodeText }}
            >
              <span className="h-5 flex items-center justify-center text-xs font-bold">
                {isPublic ? '公開中' : '非公開'}
              </span>
              <span className="text-[10px]">ステータス</span>
            </button>
          )}

          {/* 自動整列トグル */}
          <button
            onClick={handleToggleAutoLayout}
            title={autoLayout ? '自動整列 ON（クリックで OFF）' : '自動整列 OFF（クリックで ON）'}
            className={`w-14 py-1.5 rounded-lg font-bold transition-all border flex flex-col items-center gap-0.5 shadow-lg ${
              autoLayout
                ? 'bg-violet-600 border-violet-400 text-white'
                : 'bg-white/5 border-white/10 opacity-60 hover:opacity-90'
            }`}
            style={{ color: autoLayout ? undefined : theme.nodeText }}
          >
            <span className="h-5 flex items-center justify-center text-xs font-bold">
              {autoLayout ? '有効' : '無効'}
            </span>
            <span className="text-[10px]">自動整列</span>
          </button>
        </div>

        <CytoscapeGraph onCyReady={handleCyReady} />
      </main>

      {/* 人物フッター */}
      <footer
        className="shrink-0 border-t overflow-hidden"
        style={{
          background: theme.panelBg,
          borderColor: theme.panelBorder,
          height: '96px',
        }}
      >
        <CharacterPicker />
      </footer>

      {showSaveModal && (
        <SaveDownloadModal onClose={() => setShowSaveModal(false)} />
      )}

      {showShareSheet && (
        <ShareSheet cyRef={cyRef} diagramId={diagramId} onClose={() => setShowShareSheet(false)} />
      )}

    </div>
  )
}
