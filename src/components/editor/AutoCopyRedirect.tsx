'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Theme, FontStyle, EditorNode, EditorEdge } from '@/store/diagramStore'
import type { TemplateCharacter } from '@/lib/supabase/types'

interface Props {
  data: {
    templateId: string
    templateTitle: string
    characters: TemplateCharacter[]
    title: string
    theme: Theme
    fontStyle: FontStyle
    nodes: EditorNode[]
    edges: EditorEdge[]
  }
}

export default function AutoCopyRedirect({ data }: Props) {
  const router = useRouter()

  useEffect(() => {
    sessionStorage.setItem('oshilink_copy_draft', JSON.stringify(data))
    router.push(`/editor/${data.templateId}`)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex items-center justify-center h-full text-white/60 text-sm">
      読み込み中...
    </div>
  )
}
