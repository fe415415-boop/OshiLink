'use client'

import { useState } from 'react'
import { useDiagramStore } from '@/store/diagramStore'
import { useAuthStore } from '@/store/authStore'
import { createClient } from '@/lib/supabase/client'
import AuthModal from '@/components/auth/AuthModal'

interface Props {
  onClose: () => void
}

export default function SaveDownloadModal({ onClose }: Props) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showAuth, setShowAuth] = useState(false)

  const storeTitle = useDiagramStore((s) => s.title)
  const setTitle = useDiagramStore((s) => s.setTitle)
  const [title, setLocalTitle] = useState(storeTitle)
  const templateId = useDiagramStore((s) => s.templateId)
  const nodes = useDiagramStore((s) => s.nodes)
  const edges = useDiagramStore((s) => s.edges)
  const theme = useDiagramStore((s) => s.theme)
  const fontStyle = useDiagramStore((s) => s.fontStyle)
  const user = useAuthStore((s) => s.user)

  async function handleSave() {
    if (!user) { setShowAuth(true); return }
    if (!templateId || nodes.length === 0) return
    setTitle(title)
    setSaving(true)
    setSaveError(null)
    const supabase = createClient()

    const { data: diag, error: diagErr } = await supabase
      .from('diagrams')
      .insert({ user_id: user.id, template_id: templateId, title, theme, font_style: fontStyle })
      .select()
      .single()

    if (diagErr || !diag) {
      setSaveError('保存に失敗しました。再度お試しください。')
      setSaving(false)
      return
    }

    const nodeRows = nodes.map((n) => ({ diagram_id: diag.id, character_id: n.characterId, pos_x: n.x, pos_y: n.y }))
    const { data: insertedNodes, error: nodesErr } = await supabase.from('diagram_nodes').insert(nodeRows).select()
    if (nodesErr) console.error('diagram_nodes insert error:', nodesErr)

    if (insertedNodes) {
      const nodeIdMap = new Map<string, string>()
      nodes.forEach((n, i) => { if (insertedNodes[i]) nodeIdMap.set(n.id, insertedNodes[i].id) })
      const edgeRows = edges
        .map((e) => ({ diagram_id: diag.id, source_node_id: nodeIdMap.get(e.sourceId), target_node_id: nodeIdMap.get(e.targetId), tag: e.tag, direction: e.direction }))
        .filter((e) => e.source_node_id && e.target_node_id)
      if (edgeRows.length > 0) {
        const { error: edgesErr } = await supabase.from('diagram_edges').insert(edgeRows)
        if (edgesErr) console.error('diagram_edges insert error:', edgesErr)
      }
    }

    await supabase.rpc('increment_usage_count', { template_id: templateId })
    setSaving(false)
    setSaved(true)
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="w-full max-w-sm mx-4 mb-4 sm:mb-0 rounded-2xl bg-[#1a1a2e] border border-white/10 overflow-hidden shadow-2xl">
          <div className="p-4 flex flex-col gap-3">

            {/* タイトル入力 */}
            <input
              type="text"
              value={title}
              onChange={(e) => setLocalTitle(e.target.value)}
              placeholder="相関図タイトルを入力..."
              className="w-full rounded-xl px-3 py-2.5 bg-white/5 border border-white/10 text-white text-sm font-bold outline-none focus:border-violet-500 placeholder:text-white/25"
            />

            {/* 保存エリア */}
            {user ? (
              saved ? (
                <p className="text-center text-sm text-green-400 font-bold">✓ 保存しました</p>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving || nodes.length === 0}
                    className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold disabled:opacity-40 transition-colors"
                  >
                    {saving ? '保存中...' : '保存'}
                  </button>
                  {saveError && <p className="text-center text-xs text-red-400">{saveError}</p>}
                </>
              )
            ) : (
              <p className="text-center text-sm text-white/50">
                <button onClick={() => setShowAuth(true)} className="text-violet-400 hover:text-violet-300 underline">
                  ログイン
                </button>
                {' '}して保存
              </p>
            )}

          </div>
        </div>
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  )
}
