'use client'

import { useEffect } from 'react'
import { useDiagramStore } from '@/store/diagramStore'
import type { TemplateWithCharacters } from '@/lib/supabase/types'

interface Props {
  template: TemplateWithCharacters
}

export default function EditorInitializer({ template }: Props) {
  const loadTemplate = useDiagramStore((s) => s.loadTemplate)

  useEffect(() => {
    loadTemplate(template.id, template.title, template.template_characters)
  }, [template, loadTemplate])

  return null
}
