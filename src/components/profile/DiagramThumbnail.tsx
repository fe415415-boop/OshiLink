'use client'

import { useEffect, useRef } from 'react'
import cytoscape from 'cytoscape'
import { THEMES, FONT_FAMILIES, TAG_COLORS } from '@/lib/themes'
import type { Theme, FontStyle, EditorNode, EditorEdge } from '@/store/diagramStore'

interface Props {
  nodes: EditorNode[]
  edges: EditorEdge[]
  theme: Theme
  fontStyle: FontStyle
}

export default function DiagramThumbnail({ nodes, edges, theme: selectedTheme, fontStyle }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return
    const theme = THEMES[selectedTheme]
    const fontFamily = FONT_FAMILIES[fontStyle]

    const elements: cytoscape.ElementDefinition[] = [
      ...nodes.map((n) => ({
        group: 'nodes' as const,
        data: { id: n.id, label: n.label, imageUrl: n.imageUrl },
        position: { x: n.x, y: n.y },  // 常に渡す（0,0 でも）
      })),
      ...edges.map((e) => ({
        group: 'edges' as const,
        data: {
          id: e.id,
          source: e.sourceId,
          target: e.targetId,
          tag: e.tag,
          direction: e.direction,
          color: TAG_COLORS[e.tag] ?? theme.edgeDefault,
        },
      })),
    ]

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': theme.nodeBg,
            'border-color': theme.nodeBorder,
            'border-width': 2,
            color: theme.nodeText,
            label: 'data(label)',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-margin-y': 3,
            'font-family': fontFamily,
            'font-size': '11px',
            'text-outline-color': theme.nodeBg,
            'text-outline-width': 2,
            width: 40,
            height: 40,
            shape: 'ellipse',
          },
        },
        {
          selector: 'edge[direction="right"]',
          style: edgeStyle('none', 'triangle', theme),
        },
        {
          selector: 'edge[direction="left"]',
          style: edgeStyle('triangle', 'none', theme),
        },
        {
          selector: 'edge[direction="both"]',
          style: edgeStyle('triangle', 'triangle', theme),
        },
        {
          selector: 'edge[direction="none"]',
          style: edgeStyle('none', 'none', theme),
        },
      ],
      userZoomingEnabled: false,
      userPanningEnabled: false,
      boxSelectionEnabled: false,
      autounselectify: true,
      autoungrabify: true,
    })

    // 画像を適用
    cy.nodes().forEach((n) => {
      const imageUrl = n.data('imageUrl')
      if (imageUrl) {
        n.style({
          'background-image': imageUrl,
          'background-fit': 'cover',
          'background-clip': 'node',
          'background-opacity': 1,
        })
      }
    })

    // 保存済み座標があれば位置を再現、なければ自動整列
    const hasSavedPositions = nodes.some((n) => n.x !== 0 || n.y !== 0)
    if (hasSavedPositions) {
      requestAnimationFrame(() => { cy.fit(undefined, 12) })
    } else {
      cy.layout({ name: 'cose', animate: false, fit: true, padding: 12 }).run()
    }

    return () => { cy.destroy() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (nodes.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-3xl opacity-20">📊</span>
      </div>
    )
  }

  return <div ref={containerRef} className="w-full h-full" />
}

function edgeStyle(sourceArrow: string, targetArrow: string, theme: { edgeDefault: string; labelText: string; labelBg: string }) {
  return {
    width: 1.5,
    'line-color': 'data(color)',
    'target-arrow-color': 'data(color)',
    'target-arrow-shape': targetArrow as never,
    'source-arrow-color': 'data(color)',
    'source-arrow-shape': sourceArrow as never,
    'curve-style': 'bezier' as never,
    label: 'data(tag)',
    'font-size': '9px',
    color: theme.labelText,
    'text-background-color': theme.labelBg,
    'text-background-opacity': 0.8,
    'text-background-padding': '2px',
  }
}
