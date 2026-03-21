'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import DiagramThumbnailWrapper from './DiagramThumbnailWrapper'
import type { Template, FontStyle, EditorNode, EditorEdge } from '@/store/diagramStore'

interface Props {
  id: string
  title: string
  templateTitle: string
  createdAt: string
  nodes: EditorNode[]
  edges: EditorEdge[]
  template: Template
  fontStyle: FontStyle
  thumbnail: string | null
}

export default function DiagramCard({ id, title, templateTitle, createdAt, nodes, edges, template, fontStyle, thumbnail }: Props) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('diagrams').delete().eq('id', id)
    if (error) {
      console.error('diagram delete error:', error)
      setDeleting(false)
      setConfirming(false)
      return
    }
    router.refresh()
  }

  return (
    <div className="group relative rounded-xl bg-white/5 border border-white/10 hover:border-violet-500/50 overflow-hidden transition-all">
      {/* 削除ボタン（ホバー時表示） */}
      {!confirming && (
        <button
          onClick={(e) => { e.preventDefault(); setConfirming(true) }}
          className="absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-full bg-black/60 text-white/60 hover:text-white hover:bg-red-600/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-xs leading-none"
          aria-label="削除"
        >
          ✕
        </button>
      )}

      {/* 削除確認オーバーレイ */}
      {confirming && (
        <div className="absolute inset-0 z-20 bg-black/80 flex flex-col items-center justify-center gap-2 p-3">
          <p className="text-xs text-white text-center">この相関図を削除しますか？</p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold disabled:opacity-50 transition-colors"
            >
              {deleting ? '削除中...' : '削除'}
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      <Link href={`/diagram/${id}`} className="block">
        {/* サムネイル */}
        <div className="aspect-video bg-[#0a0a14] overflow-hidden">
          <DiagramThumbnailWrapper
            nodes={nodes}
            edges={edges}
            template={template}
            fontStyle={fontStyle}
            thumbnail={thumbnail}
          />
        </div>

        {/* 情報 */}
        <div className="p-2.5">
          <p className="text-sm font-bold text-white group-hover:text-violet-300 transition-colors truncate">
            {title || '（タイトルなし）'}
          </p>
          <p className="text-xs text-white/30 mt-0.5 truncate">{templateTitle}</p>
          <p className="text-xs text-white/20 mt-0.5">
            {new Date(createdAt).toLocaleDateString('ja-JP')}
          </p>
        </div>
      </Link>
    </div>
  )
}
