'use client'

import { useEffect } from 'react'
import { useDiagramStore, Theme, FontStyle, EditorNode, EditorEdge } from '@/store/diagramStore'
import type { TemplateCharacter, EdgeDirection } from '@/lib/supabase/types'

interface SavedDiagramData {
  templateId: string
  templateTitle: string
  characters: TemplateCharacter[]
  title: string
  theme: string
  fontStyle: string
  nodes: EditorNode[]
  edges: EditorEdge[]
}

interface Props {
  data: SavedDiagramData
}

export default function DiagramLoader({ data }: Props) {
  const loadDiagram = useDiagramStore((s) => s.loadDiagram)

  useEffect(() => {
    loadDiagram({
      ...data,
      theme: data.theme as Theme,
      fontStyle: data.fontStyle as FontStyle,
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
