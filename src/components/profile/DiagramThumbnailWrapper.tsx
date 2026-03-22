'use client'

import dynamic from 'next/dynamic'
import type { Theme, FontStyle, EditorNode, EditorEdge } from '@/store/diagramStore'

const DiagramThumbnail = dynamic(() => import('./DiagramThumbnail'), { ssr: false })

interface Props {
  nodes: EditorNode[]
  edges: EditorEdge[]
  theme: Theme
  fontStyle: FontStyle
  thumbnail: string | null
}

export default function DiagramThumbnailWrapper({ thumbnail, ...props }: Props) {
  if (thumbnail) {
    return <img src={thumbnail} alt="サムネイル" className="w-full h-full object-contain" />
  }
  return <DiagramThumbnail {...props} />
}
