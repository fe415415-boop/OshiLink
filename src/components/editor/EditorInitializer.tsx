'use client'

import { useEffect } from 'react'
import { useDiagramStore } from '@/store/diagramStore'
import type { TemplateWithCharacters } from '@/lib/supabase/types'

interface Props {
  template: TemplateWithCharacters
}

export default function EditorInitializer({ template }: Props) {
  const loadTemplate = useDiagramStore((s) => s.loadTemplate)
  const loadDiagram = useDiagramStore((s) => s.loadDiagram)

  useEffect(() => {
    const copyDraft = sessionStorage.getItem('oshilink_copy_draft')
    if (copyDraft) {
      try {
        const data = JSON.parse(copyDraft)
        loadDiagram(data)
        sessionStorage.removeItem('oshilink_copy_draft')
        return
      } catch { /* fall through */ }
    }
    loadTemplate(template.id, template.title, template.template_characters)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
