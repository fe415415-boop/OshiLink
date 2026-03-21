'use client'

import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import cytoscape, { Core, NodeSingular, EdgeSingular, StylesheetStyle } from 'cytoscape'
// @ts-expect-error: no types
import fcose from 'cytoscape-fcose'
import { useDiagramStore } from '@/store/diagramStore'
import { THEMES, FONT_FAMILIES, TAG_COLORS } from '@/lib/themes'
import ConnectionModal from './ConnectionModal'
import BoxModal from './BoxModal'
import type { EdgeDirection } from '@/store/diagramStore'

let fcoseRegistered = false
function registerFcose() {
  if (!fcoseRegistered) { cytoscape.use(fcose); fcoseRegistered = true }
}

interface Props {
  onCyReady?: (cy: Core) => void
}

interface DrawingState {
  startScreenX: number
  startScreenY: number
  currentScreenX: number
  currentScreenY: number
  startModelX: number
  startModelY: number
}

export default function CytoscapeGraph({ onCyReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Core | null>(null)
  const needsFitRef = useRef(true)   // 保存済みロード時に一度だけ fit
  const prevEdgeCountRef = useRef(0) // エッジ追加検出用

  const [connection, setConnection] = useState<{ sourceId: string; targetId: string } | null>(null)
  const [editingEdge, setEditingEdge] = useState<{ edgeId: string; sourceId: string; targetId: string; tag: string; direction: EdgeDirection } | null>(null)
  const [editingBox, setEditingBox] = useState<{ boxId: string; color: string; text: string } | null>(null)

  // Cytoscapeビューポート（ボックスラベルHTML描画用）
  const [viewport, setViewport] = useState({ px: 0, py: 0, zoom: 1 })

  // 図形描画モード（store から参照）
  const drawMode = useDiagramStore((s) => s.drawMode)
  const setDrawMode = useDiagramStore((s) => s.setDrawMode)
  const drawModeRef = useRef(false)
  const [drawing, setDrawing] = useState<DrawingState | null>(null)
  const drawingRef = useRef<DrawingState | null>(null)

  const nodes = useDiagramStore((s) => s.nodes)
  const edges = useDiagramStore((s) => s.edges)
  const boxes = useDiagramStore((s) => s.boxes)
  const template = useDiagramStore((s) => s.template)
  const fontStyle = useDiagramStore((s) => s.fontStyle)
  const connectingFromId = useDiagramStore((s) => s.connectingFromId)
  const setConnectingFrom = useDiagramStore((s) => s.setConnectingFrom)
  const updateNodePosition = useDiagramStore((s) => s.updateNodePosition)
  const removeNode = useDiagramStore((s) => s.removeNode)
  const addBox = useDiagramStore((s) => s.addBox)
  const updateBox = useDiagramStore((s) => s.updateBox)
  const removeBox = useDiagramStore((s) => s.removeBox)

  const theme = THEMES[template]
  const fontFamily = FONT_FAMILIES[fontStyle]

  // drawMode 変化時に ref を同期 & Cytoscape パン制御
  useEffect(() => {
    drawModeRef.current = drawMode
    const cy = cyRef.current
    if (cy) cy.userPanningEnabled(!drawMode)
  }, [drawMode])

  // ESC でドローモードキャンセル
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawModeRef.current) {
        setDrawMode(false)
        setDrawing(null)
        drawingRef.current = null
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const buildStyle = useCallback((): StylesheetStyle[] => [
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
        'text-margin-y': 4,
        'font-family': fontFamily,
        'font-size': '13px',
        'text-wrap': 'wrap',
        'text-max-width': '80px',
        width: 80,
        height: 80,
        shape: 'ellipse',
        'text-outline-color': theme.nodeBg,
        'text-outline-width': 2,
        'z-index': 10,
        'z-index-compare': 'manual' as never,
      },
    },
    {
      // ボックスノード（背景図形）- テキストはHTMLオーバーレイで描画
      selector: 'node[nodeType="box"]',
      style: {
        shape: 'rectangle' as never,
        'background-color': 'data(boxColor)',
        'border-color': 'data(borderColor)',
        'border-width': 1,
        'border-opacity': 0.6,
        label: '',
        'z-index': 0,
        'z-index-compare': 'manual' as never,
      },
    },
    {
      selector: 'node.connecting-source',
      style: {
        'border-color': '#3b82f6',
        'border-width': 4,
        'background-color': '#1e3a5f',
      },
    },
    {
      selector: 'node.connecting-target',
      style: {
        'border-color': '#60a5fa',
        'border-width': 3,
        opacity: 0.85,
      },
    },
    {
      selector: 'edge[direction="right"]',
      style: buildEdgeStyle('none', 'triangle', theme, fontFamily),
    },
    {
      selector: 'edge[direction="left"]',
      style: buildEdgeStyle('triangle', 'none', theme, fontFamily),
    },
    {
      selector: 'edge[direction="both"]',
      style: buildEdgeStyle('triangle', 'triangle', theme, fontFamily),
    },
    {
      selector: 'edge[direction="none"]',
      style: buildEdgeStyle('none', 'none', theme, fontFamily),
    },
  ], [theme, fontFamily])

  // 初期化
  useEffect(() => {
    if (!containerRef.current) return
    registerFcose()

    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: buildStyle(),
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      autounselectify: true,
    })

    // ノードクリック → 接続操作 or ボックス編集
    cy.on('tap', 'node', (e) => {
      const node = e.target as NodeSingular

      // ボックスノードはクリックで編集
      if (node.data('nodeType') === 'box') {
        const storeId = node.data('storeId') as string
        const box = useDiagramStore.getState().boxes.find((b) => b.id === storeId)
        if (box) setEditingBox({ boxId: storeId, color: box.color, text: box.text })
        return
      }

      const clickedId = node.data('storeId') as string
      const current = useDiagramStore.getState().connectingFromId

      if (!current) {
        setConnectingFrom(clickedId)
        cy.nodes('[nodeType!="box"]').removeClass('connecting-source connecting-target')
        node.addClass('connecting-source')
        cy.nodes('[nodeType!="box"]').forEach((n) => {
          if (n.data('storeId') !== clickedId) n.addClass('connecting-target')
        })
      } else if (current === clickedId) {
        setConnectingFrom(null)
        cy.nodes().removeClass('connecting-source connecting-target')
      } else {
        cy.nodes().removeClass('connecting-source connecting-target')
        setConnection({ sourceId: current, targetId: clickedId })
        setConnectingFrom(null)
      }
    })

    // エッジクリック → 編集モーダル
    cy.on('tap', 'edge', (e) => {
      const edge = e.target as EdgeSingular
      const edgeStoreId = edge.data('storeId') as string
      const storeEdge = useDiagramStore.getState().edges.find((ed) => ed.id === edgeStoreId)
      if (storeEdge) {
        setEditingEdge({ edgeId: edgeStoreId, sourceId: storeEdge.sourceId, targetId: storeEdge.targetId, tag: storeEdge.tag, direction: storeEdge.direction })
      }
    })

    // 背景クリック → 接続キャンセル
    cy.on('tap', (e) => {
      if (e.target === cy) {
        setConnectingFrom(null)
        cy.nodes().removeClass('connecting-source connecting-target')
      }
    })

    // ノードドラッグ → 位置保存
    cy.on('dragfree', 'node', (e) => {
      const node = e.target as NodeSingular
      const pos = node.position()
      const storeId = node.data('storeId') as string
      if (node.data('nodeType') === 'box') {
        updateBox(storeId, { x: pos.x, y: pos.y })
      } else {
        updateNodePosition(storeId, pos.x, pos.y)
      }
    })

    // エッジ右クリック → 削除
    cy.on('cxttap', 'edge', (e) => {
      const edge = e.target as EdgeSingular
      useDiagramStore.getState().removeEdge(edge.data('storeId'))
    })

    // ノード右クリック → ボックスのみ削除（通常ノードは × ボタンで削除）
    cy.on('cxttap', 'node', (e) => {
      const node = e.target as NodeSingular
      if (node.data('nodeType') === 'box') {
        removeBox(node.data('storeId'))
      }
    })

    // ビューポート変化でボックスラベルを再配置
    const syncVp = () => {
      const p = cy.pan()
      setViewport({ px: p.x, py: p.y, zoom: cy.zoom() })
    }
    cy.on('pan zoom', syncVp)
    syncVp()

    cyRef.current = cy
    if (onCyReady) onCyReady(cy)

    return () => { cy.destroy(); cyRef.current = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // スタイル更新
  useEffect(() => {
    cyRef.current?.style(buildStyle())
  }, [buildStyle])

  // ノード・エッジ同期
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return

    cy.batch(() => {
      // 削除されたノード（ボックス以外）
      cy.nodes('[nodeType!="box"]').forEach((n) => {
        if (!nodes.find((nd) => nd.id === n.data('storeId'))) cy.remove(n)
      })
      // 削除されたエッジ
      cy.edges().forEach((e) => {
        if (!edges.find((ed) => ed.id === e.data('storeId'))) cy.remove(e)
      })

      // 新規ノード
      const newNodes = nodes.filter((n) => !cy.nodes().some((cn) => cn.data('storeId') === n.id))
      for (const node of newNodes) {
        const el = cy.add({
          group: 'nodes',
          data: {
            id: `cy-${node.id}`,
            storeId: node.id,
            label: node.label,
          },
          // 保存済み座標があれば使用、なければ Cytoscape デフォルト（レイアウトで配置）
          ...(node.x || node.y ? { position: { x: node.x, y: node.y } } : {}),
        })
        if (node.imageUrl) {
          el.style({
            'background-image': node.imageUrl,
            'background-fit': 'cover',
            'background-clip': 'node',
            'background-opacity': 1,
          })
        }
      }

      // 新規エッジ
      for (const edge of edges) {
        if (!cy.edges().some((ce) => ce.data('storeId') === edge.id)) {
          const srcEl = cy.nodes().filter((n) => n.data('storeId') === edge.sourceId)
          const tgtEl = cy.nodes().filter((n) => n.data('storeId') === edge.targetId)
          if (!srcEl.length || !tgtEl.length) continue
          const color = TAG_COLORS[edge.tag] ?? theme.edgeDefault
          cy.add({
            group: 'edges',
            data: {
              id: `cy-${edge.id}`,
              storeId: edge.id,
              source: srcEl.id(),
              target: tgtEl.id(),
              tag: edge.tag,
              direction: edge.direction,
              color,
            },
          })
        } else {
          const el = cy.edges().filter((ce) => ce.data('storeId') === edge.id)
          el.data('tag', edge.tag)
          el.data('direction', edge.direction)
          el.data('color', TAG_COLORS[edge.tag] ?? theme.edgeDefault)
        }
      }
    })

    // 新規ノードがあればレイアウト（ボックスはlockして対象外に）
    const newNodeCount = nodes.filter((n) => !n.x && !n.y).length
    const newEdgeAdded = edges.length > prevEdgeCountRef.current
    prevEdgeCountRef.current = edges.length

    // 保存済みデータからの復元（全ノード位置あり）→ レイアウト不要、一度だけ fit
    if (nodes.length > 0 && newNodeCount === 0 && needsFitRef.current) {
      needsFitRef.current = false
      requestAnimationFrame(() => {
        if (!cyRef.current || cyRef.current.destroyed()) return
        cyRef.current.fit(undefined, 40)
      })
    }

    if (nodes.length > 0 && (newNodeCount > 0 || (newEdgeAdded && !needsFitRef.current))) {
      requestAnimationFrame(() => {
        const c = cyRef.current
        if (!c || c.destroyed()) return
        const boxNodes = c.nodes('[nodeType="box"]')
        boxNodes.lock()
        try {
          const layout = c.layout({
            name: 'fcose',
            animate: true,
            animationDuration: 300,
            randomize: false,
            nodeRepulsion: 6000,
            idealEdgeLength: 150,
            nodeDimensionsIncludeLabels: true,
            fit: false,
          } as Parameters<Core['layout']>[0])
          layout.one('layoutstop', () => {
            boxNodes.unlock()
            c.fit(undefined, 40)
            // レイアウト後の実座標を store に保存（次回保存時に正しい位置が書き込まれる）
            c.nodes('[nodeType!="box"]').forEach((n) => {
              const pos = n.position()
              useDiagramStore.getState().updateNodePosition(n.data('storeId'), pos.x, pos.y)
            })
          })
          layout.run()
        } catch {
          boxNodes.unlock()
          try {
            const layout2 = c.layout({ name: 'cose', animate: true, fit: false })
            layout2.one('layoutstop', () => {
              boxNodes.unlock()
              c.fit(undefined, 40)
              c.nodes('[nodeType!="box"]').forEach((n) => {
                const pos = n.position()
                useDiagramStore.getState().updateNodePosition(n.data('storeId'), pos.x, pos.y)
              })
            })
            layout2.run()
          } catch { boxNodes.unlock() }
        }
      })
    }
  }, [nodes, edges, theme])

  // ボックス同期
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return

    cy.batch(() => {
      // 削除されたボックス
      cy.nodes('[nodeType="box"]').forEach((n) => {
        if (!boxes.find((b) => b.id === n.data('storeId'))) cy.remove(n)
      })

      for (const box of boxes) {
        const existing = cy.nodes().filter((n) => n.data('storeId') === box.id)
        if (!existing.length) {
          // 新規ボックス追加（最背面）
          const el = cy.add({
            group: 'nodes',
            data: {
              id: `cy-${box.id}`,
              storeId: box.id,
              nodeType: 'box',
              label: '',          // テキストはHTMLオーバーレイで描画
              boxColor: box.color,
              borderColor: theme.boxBorderColor,
            },
            position: { x: box.x, y: box.y },
          })
          el.style({ width: box.width, height: box.height })
        } else {
          // 既存ボックス更新（色・サイズ）
          existing.data('boxColor', box.color)
          existing.data('borderColor', theme.boxBorderColor)
          existing.style({ width: box.width, height: box.height })
        }
      }
    })
  }, [boxes, theme])

  // connectingFromId ハイライト同期
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    cy.nodes().removeClass('connecting-source connecting-target')
    if (connectingFromId) {
      cy.nodes('[nodeType!="box"]').forEach((n) => {
        if (n.data('storeId') === connectingFromId) {
          n.addClass('connecting-source')
        } else {
          n.addClass('connecting-target')
        }
      })
    }
  }, [connectingFromId])

  // ラバーバンド描画ハンドラー
  function handleDrawMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    const cy = cyRef.current
    if (!cy) return
    const rect = e.currentTarget.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top
    const modelX = (screenX - cy.pan().x) / cy.zoom()
    const modelY = (screenY - cy.pan().y) / cy.zoom()
    const state: DrawingState = {
      startScreenX: screenX,
      startScreenY: screenY,
      currentScreenX: screenX,
      currentScreenY: screenY,
      startModelX: modelX,
      startModelY: modelY,
    }
    drawingRef.current = state
    setDrawing(state)
  }

  function handleDrawMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!drawingRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top
    const updated = { ...drawingRef.current, currentScreenX: screenX, currentScreenY: screenY }
    drawingRef.current = updated
    setDrawing(updated)
  }

  function handleDrawMouseUp(e: React.MouseEvent<HTMLDivElement>) {
    const cy = cyRef.current
    const d = drawingRef.current
    if (!cy || !d) return

    const rect = e.currentTarget.getBoundingClientRect()
    const endScreenX = e.clientX - rect.left
    const endScreenY = e.clientY - rect.top

    const screenW = Math.abs(endScreenX - d.startScreenX)
    const screenH = Math.abs(endScreenY - d.startScreenY)

    // 最小サイズ（30px）未満ならキャンセル
    if (screenW > 30 && screenH > 30) {
      const endModelX = (endScreenX - cy.pan().x) / cy.zoom()
      const endModelY = (endScreenY - cy.pan().y) / cy.zoom()
      const cx = (d.startModelX + endModelX) / 2
      const cy2 = (d.startModelY + endModelY) / 2
      const mw = Math.abs(endModelX - d.startModelX)
      const mh = Math.abs(endModelY - d.startModelY)
      addBox(cx, cy2, mw, mh, theme.boxDefaultColor)
    }

    drawingRef.current = null
    setDrawing(null)
    setDrawMode(false)
  }

  // タッチ: タッチ開始でそのままドロー開始（図形ボタン押下後なので長押し不要）
  function handleDrawTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    e.preventDefault()
    const cy = cyRef.current
    if (!cy) return
    const touch = e.touches[0]
    const rect = e.currentTarget.getBoundingClientRect()
    const screenX = touch.clientX - rect.left
    const screenY = touch.clientY - rect.top
    const modelX = (screenX - cy.pan().x) / cy.zoom()
    const modelY = (screenY - cy.pan().y) / cy.zoom()
    const state: DrawingState = {
      startScreenX: screenX, startScreenY: screenY,
      currentScreenX: screenX, currentScreenY: screenY,
      startModelX: modelX, startModelY: modelY,
    }
    drawingRef.current = state
    setDrawing(state)
  }

  function handleDrawTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (!drawingRef.current) return
    e.preventDefault()
    const touch = e.touches[0]
    const rect = e.currentTarget.getBoundingClientRect()
    const screenX = touch.clientX - rect.left
    const screenY = touch.clientY - rect.top
    const updated = { ...drawingRef.current, currentScreenX: screenX, currentScreenY: screenY }
    drawingRef.current = updated
    setDrawing(updated)
  }

  function handleDrawTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    const cy = cyRef.current
    const d = drawingRef.current
    if (!cy || !d) return
    e.preventDefault()

    const screenW = Math.abs(d.currentScreenX - d.startScreenX)
    const screenH = Math.abs(d.currentScreenY - d.startScreenY)

    if (screenW > 30 && screenH > 30) {
      const endModelX = (d.currentScreenX - cy.pan().x) / cy.zoom()
      const endModelY = (d.currentScreenY - cy.pan().y) / cy.zoom()
      const cx = (d.startModelX + endModelX) / 2
      const cy2 = (d.startModelY + endModelY) / 2
      const mw = Math.abs(endModelX - d.startModelX)
      const mh = Math.abs(endModelY - d.startModelY)
      addBox(cx, cy2, mw, mh, theme.boxDefaultColor)
    }

    drawingRef.current = null
    setDrawing(null)
    setDrawMode(false)
  }

  // ラバーバンド表示用の矩形計算
  const rubberBand = drawing ? {
    left: Math.min(drawing.startScreenX, drawing.currentScreenX),
    top: Math.min(drawing.startScreenY, drawing.currentScreenY),
    width: Math.abs(drawing.currentScreenX - drawing.startScreenX),
    height: Math.abs(drawing.currentScreenY - drawing.startScreenY),
  } : null

  return (
    <>
      <div
        ref={containerRef}
        style={{ background: theme.background }}
        className="w-full h-full"
      />

      {/* ボックスラベル HTMLオーバーレイ（図形の外・左上に表示） */}
      {boxes.map((box) => {
        if (!box.text) return null
        // モデル座標 → スクリーン座標変換
        const screenLeft = (box.x - box.width / 2) * viewport.zoom + viewport.px
        const screenTop  = (box.y - box.height / 2) * viewport.zoom + viewport.py
        const fontSize   = Math.max(10, 13 * viewport.zoom)
        return (
          <div
            key={box.id}
            className="absolute pointer-events-none font-bold leading-tight whitespace-pre-wrap"
            style={{
              left: screenLeft,
              top: screenTop - fontSize * 1.4 - 2,  // 図形上辺の少し上
              maxWidth: box.width * viewport.zoom,
              fontSize,
              color: theme.boxTextColor,
              lineHeight: 1.4,
            }}
          >
            {box.text}
          </div>
        )
      })}

      {/* 選択ノードの × 削除ボタン */}
      {(() => {
        if (!connectingFromId) return null
        const selectedNode = nodes.find((n) => n.id === connectingFromId)
        if (!selectedNode) return null
        // モデル座標 → スクリーン座標（ノード中心 + 右上オフセット）
        const nodeRadius = 40 // ノード半径 (model px)
        const screenCX = selectedNode.x * viewport.zoom + viewport.px
        const screenCY = selectedNode.y * viewport.zoom + viewport.py
        const btnX = screenCX + nodeRadius * viewport.zoom - 8
        const btnY = screenCY - nodeRadius * viewport.zoom - 8
        return (
          <button
            key={connectingFromId}
            onClick={(e) => {
              e.stopPropagation()
              removeNode(connectingFromId)
              setConnectingFrom(null)
              cyRef.current?.nodes().removeClass('connecting-source connecting-target')
            }}
            className="absolute z-20 w-5 h-5 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center text-xs leading-none shadow-lg transition-colors"
            style={{ left: btnX, top: btnY }}
            aria-label="ノードを削除"
          >
            ✕
          </button>
        )
      })()}

      {/* 図形描画モード用オーバーレイ */}
      {drawMode && (
        <div
          className="absolute inset-0 cursor-crosshair"
          onMouseDown={handleDrawMouseDown}
          onMouseMove={handleDrawMouseMove}
          onMouseUp={handleDrawMouseUp}
          onTouchStart={handleDrawTouchStart}
          onTouchMove={handleDrawTouchMove}
          onTouchEnd={handleDrawTouchEnd}
        />
      )}

      {/* ラバーバンドプレビュー */}
      {rubberBand && rubberBand.width > 4 && rubberBand.height > 4 && (
        <div
          className="absolute pointer-events-none border-2 border-dashed border-violet-400/80 bg-violet-400/10"
          style={{
            left: rubberBand.left,
            top: rubberBand.top,
            width: rubberBand.width,
            height: rubberBand.height,
          }}
        />
      )}

      {/* 操作ヒント */}
      {nodes.length === 0 && !drawMode && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-white/20 text-sm text-center">
            下のバーからアイコンをタップして追加！
          </p>
        </div>
      )}

      {connectingFromId && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-blue-600/80 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
            接続先のノードをクリック（背景クリックでキャンセル）
          </div>
        </div>
      )}

      {drawMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="bg-violet-600/80 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
            ドラッグで図形を作成（ESCでキャンセル）
          </div>
        </div>
      )}



      {connection && (
        <ConnectionModal
          mode="connect"
          sourceId={connection.sourceId}
          targetId={connection.targetId}
          onClose={() => setConnection(null)}
        />
      )}

      {editingEdge && (
        <ConnectionModal
          mode="edit"
          edgeId={editingEdge.edgeId}
          sourceId={editingEdge.sourceId}
          targetId={editingEdge.targetId}
          initialTag={editingEdge.tag}
          initialDirection={editingEdge.direction}
          onClose={() => setEditingEdge(null)}
        />
      )}

      {editingBox && (
        <BoxModal
          boxId={editingBox.boxId}
          initialColor={editingBox.color}
          initialText={editingBox.text}
          onClose={() => setEditingBox(null)}
        />
      )}
    </>
  )
}

function buildEdgeStyle(
  sourceArrow: string,
  targetArrow: string,
  theme: { labelText: string; labelBg: string },
  fontFamily: string
) {
  return {
    width: 2,
    'line-color': 'data(color)',
    'target-arrow-color': 'data(color)',
    'target-arrow-shape': targetArrow as never,
    'source-arrow-color': 'data(color)',
    'source-arrow-shape': sourceArrow as never,
    'curve-style': 'bezier' as never,
    label: 'data(tag)',
    'font-family': fontFamily,
    'font-size': '11px',
    color: theme.labelText,
    'text-background-color': theme.labelBg,
    'text-background-opacity': 0.85,
    'text-background-padding': '3px',
    'z-index': 5,
    'z-index-compare': 'manual' as never,
  }
}
