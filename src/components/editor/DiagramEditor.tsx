'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Core } from 'cytoscape'
import { useDiagramStore } from '@/store/diagramStore'
import { useAuthStore } from '@/store/authStore'
import { THEMES, FONT_FAMILIES } from '@/lib/themes'
import { createClient } from '@/lib/supabase/client'
import CharacterPicker from './CharacterPicker'
import ThemePanel from './ThemePanel'
import EditorIconButton from './EditorIconButton'
import SharePanel from './SharePanel'
import AuthModal from '@/components/auth/AuthModal'
const CytoscapeGraph = dynamic(() => import('./CytoscapeGraph'), { ssr: false })

interface Props {
  diagramId?: string
  initialIsPublic?: boolean
}

export default function DiagramEditor({ diagramId, initialIsPublic = false }: Props) {
  const cyRef = useRef<Core | null>(null)
  const [isPublic, setIsPublic] = useState(initialIsPublic)
  const [togglingPublic, setTogglingPublic] = useState(false)
  const [savedDiagramId, setSavedDiagramId] = useState<string | undefined>(diagramId)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [labelFading, setLabelFading] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [pendingSaveAfterAuth, setPendingSaveAfterAuth] = useState(false)

  const nodes = useDiagramStore((s) => s.nodes)
  const edges = useDiagramStore((s) => s.edges)
  const selectedTheme = useDiagramStore((s) => s.theme)
  const fontStyle = useDiagramStore((s) => s.fontStyle)
  const title = useDiagramStore((s) => s.title)
  const templateId = useDiagramStore((s) => s.templateId)
  const past = useDiagramStore((s) => s.past)
  const future = useDiagramStore((s) => s.future)
  const undo = useDiagramStore((s) => s.undo)
  const redo = useDiagramStore((s) => s.redo)
  const autoLayout = useDiagramStore((s) => s.autoLayout)
  const setAutoLayout = useDiagramStore((s) => s.setAutoLayout)
  const pushHistory = useDiagramStore((s) => s.pushHistory)

  const user = useAuthStore((s) => s.user)

  const theme = THEMES[selectedTheme]
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
    if (!savedDiagramId || togglingPublic) return
    setTogglingPublic(true)
    const supabase = createClient()
    const next = !isPublic
    await supabase.from('diagrams').update({ is_public: next }).eq('id', savedDiagramId)
    setIsPublic(next)
    setTogglingPublic(false)
  }

  async function handleSave(userIdOverride?: string) {
    const userId = userIdOverride ?? user?.id
    if (!userId) { setPendingSaveAfterAuth(true); setShowAuthModal(true); return }
    if (nodes.length === 0) return
    setSaving(true)
    setSaveStatus('saving')
    const supabase = createClient()

    try {
      if (!savedDiagramId) {
        // 新規 INSERT
        const { data: diag } = await supabase
          .from('diagrams')
          .insert({ user_id: userId, template_id: templateId, title, theme: selectedTheme, font_style: fontStyle })
          .select()
          .single()
        if (!diag) throw new Error('insert failed')
        setSavedDiagramId(diag.id)

        const nodeRows = nodes.map((n) => ({ diagram_id: diag.id, character_id: n.characterId, pos_x: n.x, pos_y: n.y }))
        const { data: insertedNodes } = await supabase.from('diagram_nodes').insert(nodeRows).select()
        if (insertedNodes) {
          const nodeIdMap = new Map(nodes.map((n, i) => [n.id, insertedNodes[i]?.id]))
          const edgeRows = edges
            .map((e) => ({ diagram_id: diag.id, source_node_id: nodeIdMap.get(e.sourceId), target_node_id: nodeIdMap.get(e.targetId), tag: e.tag, direction: e.direction }))
            .filter((e) => e.source_node_id && e.target_node_id)
          if (edgeRows.length > 0) await supabase.from('diagram_edges').insert(edgeRows)
        }
        await supabase.rpc('increment_usage_count', { template_id: templateId })
      } else {
        // 既存 UPDATE
        await supabase.from('diagrams').update({ title, theme: selectedTheme, font_style: fontStyle }).eq('id', savedDiagramId)
        await supabase.from('diagram_nodes').delete().eq('diagram_id', savedDiagramId)

        const nodeRows = nodes.map((n) => ({ diagram_id: savedDiagramId, character_id: n.characterId, pos_x: n.x, pos_y: n.y }))
        const { data: insertedNodes } = await supabase.from('diagram_nodes').insert(nodeRows).select()
        if (insertedNodes) {
          const nodeIdMap = new Map(nodes.map((n, i) => [n.id, insertedNodes[i]?.id]))
          const edgeRows = edges
            .map((e) => ({ diagram_id: savedDiagramId, source_node_id: nodeIdMap.get(e.sourceId), target_node_id: nodeIdMap.get(e.targetId), tag: e.tag, direction: e.direction }))
            .filter((e) => e.source_node_id && e.target_node_id)
          if (edgeRows.length > 0) await supabase.from('diagram_edges').insert(edgeRows)
        }
      }

      setSaveStatus('saved')
      setTimeout(() => setLabelFading(true), 1500)
      setTimeout(() => { setSaveStatus('idle'); setLabelFading(false) }, 1700)
    } finally {
      setSaving(false)
    }
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
        {/* 保存中のインタラクションブロック */}
        {saving && <div className="absolute inset-0 z-20" />}

        {/* Undo/Redo ボタン（左上） */}
        <div className="absolute top-3 left-3 z-10 flex gap-1">
          <EditorIconButton
            onClick={undo}
            disabled={past.length === 0}
            title="元に戻す (Ctrl+Z)"
            icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9a6 6 0 1 0 1.5-4H3M3 3v4h4"/></svg>}
            label="戻る"
            style={{ color: theme.nodeText, backgroundColor: theme.inputBg, borderColor: theme.panelBorder }}
          />
          <EditorIconButton
            onClick={redo}
            disabled={future.length === 0}
            title="やり直す (Ctrl+Y)"
            icon={<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 9a6 6 0 1 1-1.5-4H15M15 3v4h-4"/></svg>}
            label="進む"
            style={{ color: theme.nodeText, backgroundColor: theme.inputBg, borderColor: theme.panelBorder }}
          />
        </div>

        {/* テーマ切り替え（右上フローティング） */}
        <div className="absolute top-3 right-3 z-10">
          <ThemePanel />
        </div>

        {/* 共有・保存ボタン（左下） */}
        <div className="absolute bottom-4 left-4 z-10 flex items-end gap-1">
          <SharePanel cyRef={cyRef} diagramId={savedDiagramId} />
          <button
            onClick={handleSave}
            disabled={nodes.length === 0 || saving}
            className="w-14 py-1.5 rounded-lg font-bold transition-all border flex flex-col items-center gap-0.5 shadow-lg bg-violet-600 border-violet-400 text-white disabled:opacity-30"
          >
            <span className="flex items-center justify-center h-5">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h8l3 3v9a1 1 0 0 1-1 1Z"/><path d="M12 14v-5H6v5M6 2v4h5"/></svg>
            </span>
            <span className={`text-[10px] transition-opacity duration-200 ${labelFading ? 'opacity-0' : 'opacity-100'}`}>
              {saveStatus === 'saving' ? '保存中' : saveStatus === 'saved' ? '完了' : '保存'}
            </span>
          </button>
        </div>

        {/* 右下トグルボタン群 */}
        <div className="absolute bottom-4 right-4 z-10 flex gap-1">
          {/* 公開/非公開トグル - 既存相関図のみ */}
          {savedDiagramId && (
            <button
              onClick={handleTogglePublic}
              disabled={togglingPublic}
              className={`w-14 py-1.5 rounded-lg font-bold transition-all border flex flex-col items-center gap-0.5 shadow-lg ${
                isPublic
                  ? 'bg-green-600 border-green-400 text-white'
                  : 'opacity-60 hover:opacity-90'
              } disabled:opacity-30`}
              style={isPublic ? undefined : { color: theme.nodeText, backgroundColor: theme.inputBg, borderColor: theme.panelBorder }}
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
                : 'opacity-60 hover:opacity-90'
            }`}
            style={autoLayout ? undefined : { color: theme.nodeText, backgroundColor: theme.inputBg, borderColor: theme.panelBorder }}
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

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={(userId: string) => {
            setShowAuthModal(false)
            if (pendingSaveAfterAuth) {
              setPendingSaveAfterAuth(false)
              handleSave(userId)
            }
          }}
        />
      )}
    </div>
  )
}
