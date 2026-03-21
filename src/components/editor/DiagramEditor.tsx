'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Core } from 'cytoscape'
import { useDiagramStore } from '@/store/diagramStore'
import { THEMES, FONT_FAMILIES } from '@/lib/themes'
import { createClient } from '@/lib/supabase/client'
import CharacterPicker from './CharacterPicker'
import DesignPanel from './DesignPanel'
import SaveDownloadModal from './SaveDownloadModal'
const CytoscapeGraph = dynamic(() => import('./CytoscapeGraph'), { ssr: false })

interface Props {
  diagramId?: string
  isOwner?: boolean         // デフォルト true（新規作成時）
  initialIsPublic?: boolean // デフォルト false
  viewerUserId?: string | null
}

export default function DiagramEditor({ diagramId, isOwner = true, initialIsPublic = false, viewerUserId }: Props) {
  const router = useRouter()
  const cyRef = useRef<Core | null>(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [isPublic, setIsPublic] = useState(initialIsPublic)
  const [togglingPublic, setTogglingPublic] = useState(false)
  const [copying, setCopying] = useState(false)

  const isReadOnly = isOwner === false

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
  const storeTitle = useDiagramStore((s) => s.title)
  const storeTemplateId = useDiagramStore((s) => s.templateId)

  const theme = THEMES[template]
  const fontFamily = FONT_FAMILIES[fontStyle]

  const handleCyReady = useCallback((cy: Core) => { cyRef.current = cy }, [])

  const handleToggleAutoLayout = useCallback(() => {
    if (isReadOnly) return
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
  }, [autoLayout, setAutoLayout, pushHistory, isReadOnly])

  async function handleTogglePublic() {
    if (!diagramId || togglingPublic) return
    setTogglingPublic(true)
    const supabase = createClient()
    const next = !isPublic
    await supabase.from('diagrams').update({ is_public: next }).eq('id', diagramId)
    setIsPublic(next)
    setTogglingPublic(false)
  }

  // 認証済みユーザー: DB にコピーして /diagram/{id} に遷移
  async function doCopy(userId: string) {
    if (!diagramId) return
    setCopying(true)
    const supabase = createClient()

    const [{ data: origNodes }, { data: origEdges }] = await Promise.all([
      supabase.from('diagram_nodes').select('*').eq('diagram_id', diagramId),
      supabase.from('diagram_edges').select('*').eq('diagram_id', diagramId),
    ])

    const { data: newDiag } = await supabase
      .from('diagrams')
      .insert({
        user_id: userId,
        template_id: storeTemplateId,
        title: storeTitle,
        design_template: template,
        font_style: fontStyle,
        is_public: false,
      })
      .select()
      .single()

    if (!newDiag) { setCopying(false); return }

    const nodeRows = (origNodes ?? []).map((n) => ({
      diagram_id: newDiag.id,
      character_id: n.character_id,
      pos_x: n.pos_x,
      pos_y: n.pos_y,
    }))
    const { data: newNodes } = await supabase.from('diagram_nodes').insert(nodeRows).select()

    if (newNodes && origEdges && origNodes) {
      const nodeIdMap = new Map<string, string>()
      origNodes.forEach((n, i) => { if (newNodes[i]) nodeIdMap.set(n.id, newNodes[i].id) })
      const edgeRows = origEdges
        .map((e) => ({
          diagram_id: newDiag.id,
          source_node_id: nodeIdMap.get(e.source_node_id),
          target_node_id: nodeIdMap.get(e.target_node_id),
          tag: e.tag,
          direction: e.direction,
        }))
        .filter((e) => e.source_node_id && e.target_node_id)
      if (edgeRows.length > 0) {
        await supabase.from('diagram_edges').insert(edgeRows)
      }
    }

    router.push(`/diagram/${newDiag.id}`)
  }

  // 未ログインユーザー: store データを sessionStorage に保存して editor に遷移
  function doCopyLocal() {
    const state = useDiagramStore.getState()
    const draft = {
      templateId: state.templateId,
      templateTitle: state.templateTitle,
      characters: state.characters,
      title: state.title,
      template: state.template,
      fontStyle: state.fontStyle,
      nodes: state.nodes,
      edges: state.edges,
    }
    sessionStorage.setItem('oshilink_copy_draft', JSON.stringify(draft))
    router.push(`/editor/${state.templateId}`)
  }

  function handleCopyAndEdit() {
    if (!diagramId) return
    if (!viewerUserId) { doCopyLocal(); return }
    doCopy(viewerUserId)
  }

  useEffect(() => {
    if (nodes.length === 0 || isReadOnly) return
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
  }, [nodes.length, isReadOnly])

  return (
    <div
      className="flex flex-col h-full w-full overflow-hidden"
      style={{ color: theme.nodeText, background: theme.background, fontFamily }}
    >
      {/* グラフエリア */}
      <main className="flex-1 relative overflow-hidden min-h-0">
        {/* Undo/Redo ボタン（左上）- 編集可能時のみ */}
        {!isReadOnly && (
          <div className="absolute top-3 left-3 z-10 flex gap-1">
            <button
              onClick={undo}
              disabled={past.length === 0}
              title="元に戻す (Ctrl+Z)"
              className="h-8 px-2.5 rounded-lg text-xs font-bold border transition-all bg-white/5 border-white/10 disabled:opacity-20 hover:opacity-90"
              style={{ color: theme.nodeText }}
            >
              ↩
            </button>
            <button
              onClick={redo}
              disabled={future.length === 0}
              title="やり直す (Ctrl+Y)"
              className="h-8 px-2.5 rounded-lg text-xs font-bold border transition-all bg-white/5 border-white/10 disabled:opacity-20 hover:opacity-90"
              style={{ color: theme.nodeText }}
            >
              ↪
            </button>
          </div>
        )}

        {/* デザイン切り替え（右上フローティング）- 編集可能時のみ */}
        {!isReadOnly && (
          <div className="absolute top-3 right-3 z-10">
            <DesignPanel />
          </div>
        )}

        {/* 保存/ダウンロードボタン（左下）- 編集可能時のみ */}
        {!isReadOnly && (
          <button
            onClick={() => setShowSaveModal(true)}
            disabled={nodes.length === 0}
            className="absolute bottom-4 left-4 z-10 flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold disabled:opacity-30 transition-colors shadow-lg"
          >
            <span>↓</span>
            <span>保存 / ダウンロード</span>
          </button>
        )}

        {/* コピーして編集ボタン（左下）- 公開かつ非所有者 */}
        {isPublic && isReadOnly && (
          <button
            onClick={handleCopyAndEdit}
            disabled={copying}
            className="absolute bottom-4 left-4 z-10 flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold disabled:opacity-50 transition-colors shadow-lg"
          >
            {copying ? 'コピー中...' : 'コピーして編集'}
          </button>
        )}

        {/* 公開/非公開トグル（右下・自動整列の左隣）- 所有者かつ既存相関図のみ */}
        {diagramId && !isReadOnly && (
          <button
            onClick={handleTogglePublic}
            disabled={togglingPublic}
            className={`absolute bottom-4 z-10 px-3 py-2 rounded-xl text-sm font-bold border transition-colors shadow-lg ${
              isPublic
                ? 'bg-green-600 border-green-400 text-white'
                : 'border-white/10 opacity-50 hover:opacity-80'
            }`}
            style={{
              right: 'calc(5.5rem + 1rem)',
              background: isPublic ? undefined : theme.panelBg,
              color: isPublic ? undefined : theme.nodeText,
            }}
          >
            {isPublic ? '公開中' : '非公開'}
          </button>
        )}

        {/* 自動整列トグル（右下） */}
        <button
          onClick={handleToggleAutoLayout}
          disabled={isReadOnly}
          title={autoLayout ? '自動整列 ON（クリックで OFF）' : '自動整列 OFF（クリックで ON）'}
          className={`absolute bottom-4 right-4 z-10 px-3 py-2 rounded-xl text-sm font-bold border transition-colors shadow-lg ${
            autoLayout
              ? 'bg-violet-600 border-violet-400 text-white'
              : 'border-white/10 opacity-50 hover:opacity-80'
          } ${isReadOnly ? 'hidden' : ''}`}
          style={{ background: autoLayout ? undefined : theme.panelBg, color: autoLayout ? undefined : theme.nodeText }}
        >
          自動整列
        </button>

        <CytoscapeGraph onCyReady={handleCyReady} isReadOnly={isReadOnly} />
      </main>

      {/* 人物フッター - 編集可能時のみ */}
      {!isReadOnly && (
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
      )}

      {showSaveModal && (
        <SaveDownloadModal cyRef={cyRef} onClose={() => setShowSaveModal(false)} />
      )}

    </div>
  )
}
