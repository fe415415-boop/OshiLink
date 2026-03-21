'use client'

import dynamic from 'next/dynamic'
import type { Template, FontStyle, EditorNode, EditorEdge } from '@/store/diagramStore'

const DiagramThumbnail = dynamic(() => import('./DiagramThumbnail'), { ssr: false })

interface Props {
  nodes: EditorNode[]
  edges: EditorEdge[]
  template: Template
  fontStyle: FontStyle
  thumbnail: string | null
}

export default function DiagramThumbnailWrapper({ thumbnail, ...props }: Props) {
  if (thumbnail) {
    return <img src={thumbnail} alt="サムネイル" className="w-full h-full object-contain" />
  }
  return <DiagramThumbnail {...props} />
}
