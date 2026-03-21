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
  isReadOnly?: boolean
}

interface DrawingState {
  startScreenX: number
  startScreenY: number
  currentScreenX: number
  currentScreenY: number
  startModelX: number
  startModelY: number
}

type HandleKey = 'nw' | 'ne' | 'sw' | 'se'

interface ResizeState {
  id: string
  type: 'node' | 'box'
  handle: HandleKey
  // ノード用: リサイズ開始時の中心スクリーン座標と元サイズ
  startSize: number
  centerScreenX: number
  centerScreenY: number
  // ボックス用: ピン留めする反対角のモデル座標
  pinnedModelX: number
  pinnedModelY: number
}

export default function CytoscapeGraph({ onCyReady, isReadOnly = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Core | null>(null)
  const needsFitRef = useRef(true)   // 保存済みロード時に一度だけ fit
  const prevEdgeCountRef = useRef(0) // エッジ追加検出用

  const [connection, setConnection] = useState<{ sourceId: string; targetId: string } | null>(null)
  const [editingEdge, setEditingEdge] = useState<{ edgeId: string; sourceId: string; targetId: string; tag: string; direction: EdgeDirection; edgeColor?: string; edgeWidth?: number } | null>(null)
  const [editingBox, setEditingBox] = useState<{ boxId: string; color: string; opacity: number; text: string; textAlign?: 'left' | 'center' | 'right' } | null>(null)

  // リサイズ対象ノード/ボックスID（クリック時に表示、リサイズ完了・接続時に非表示）
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const resizeRef = useRef<ResizeState | null>(null)

  // Cytoscapeビューポート（ボックスラベルHTML描画用）
  const [viewport, setViewport] = useState({ px: 0, py: 0, zoom: 1 })

  // isReadOnly を ref で保持（init useEffect 内のイベントハンドラで参照）
  const isReadOnlyRef = useRef(isReadOnly)
  useEffect(() => { isReadOnlyRef.current = isReadOnly }, [isReadOnly])

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
  const updateBoxPosition = useDiagramStore((s) => s.updateBoxPosition)
  const updateBoxSize = useDiagramStore((s) => s.updateBoxSize)
  const updateNodeSize = useDiagramStore((s) => s.updateNodeSize)
  const autoLayout = useDiagramStore((s) => s.autoLayout)


  const theme = THEMES[template]
  const fontFamily = FONT_FAMILIES[fontStyle]

  // drawMode 変化時に ref を同期 & Cytoscape パン制御
  useEffect(() => {
    drawModeRef.current = drawMode
    const cy = cyRef.current
    if (cy) cy.userPanningEnabled(!drawMode)
  }, [drawMode])

  // ESC でドローモードキャンセル / Ctrl+Z Ctrl+Y で undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawModeRef.current) {
        setDrawMode(false)
        setDrawing(null)
        drawingRef.current = null
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault()
        useDiagramStore.getState().undo()
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault()
        useDiagramStore.getState().redo()
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
        'background-opacity': 'data(boxOpacity)' as never,
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

    // ノードクリック → 接続操作 or ボックス選択（リサイズハンドル表示）
    cy.on('tap', 'node', (e) => {
      if (isReadOnlyRef.current) return
      const node = e.target as NodeSingular

      // ボックスノードはクリックでリサイズハンドル表示
      if (node.data('nodeType') === 'box') {
        const storeId = node.data('storeId') as string
        setSelectedId(storeId)
        return
      }

      const clickedId = node.data('storeId') as string
      const current = useDiagramStore.getState().connectingFromId

      setSelectedId(clickedId)

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
        setSelectedId(null)  // 接続完了でハンドル非表示
      }
    })

    // エッジクリック → 編集モーダル
    cy.on('tap', 'edge', (e) => {
      if (isReadOnlyRef.current) return
      const edge = e.target as EdgeSingular
      const edgeStoreId = edge.data('storeId') as string
      const storeEdge = useDiagramStore.getState().edges.find((ed) => ed.id === edgeStoreId)
      if (storeEdge) {
        setEditingEdge({ edgeId: edgeStoreId, sourceId: storeEdge.sourceId, targetId: storeEdge.targetId, tag: storeEdge.tag, direction: storeEdge.direction, edgeColor: storeEdge.edgeColor, edgeWidth: storeEdge.edgeWidth })
      }
    })

    // 背景クリック → 接続キャンセル・ハンドル非表示
    cy.on('tap', (e) => {
      if (e.target === cy) {
        setSelectedId(null)
        if (!isReadOnlyRef.current) {
          setConnectingFrom(null)
          cy.nodes().removeClass('connecting-source connecting-target')
        }
      }
    })

    // ノードドラッグ開始前にhistory保存・ハンドル非表示
    cy.on('grab', 'node', () => {
      if (isReadOnlyRef.current) return
      useDiagramStore.getState().pushHistory()
      setSelectedId(null)
    })

    // ノードドラッグ → 位置保存
    cy.on('dragfree', 'node', (e) => {
      if (isReadOnlyRef.current) return
      const node = e.target as NodeSingular
      const pos = node.position()
      const storeId = node.data('storeId') as string
      if (node.data('nodeType') === 'box') {
        updateBoxPosition(storeId, pos.x, pos.y)
      } else {
        updateNodePosition(storeId, pos.x, pos.y)
      }
    })

    // エッジ右クリック → 削除
    cy.on('cxttap', 'edge', (e) => {
      if (isReadOnlyRef.current) return
      const edge = e.target as EdgeSingular
      useDiagramStore.getState().removeEdge(edge.data('storeId'))
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
        if (node.size && node.size !== 80) {
          el.style({ width: node.size, height: node.size })
        }
        if (node.imageUrl) {
          el.style({
            'background-image': node.imageUrl,
            'background-fit': 'cover',
            'background-clip': 'node',
            'background-opacity': 1,
          })
        }
        if (isReadOnly) el.lock()
      }

      // 既存ノードの位置・サイズをstoreと同期（undo/redo後の反映）
      cy.nodes('[nodeType!="box"]').forEach((cn) => {
        const storeNode = nodes.find((n) => n.id === cn.data('storeId'))
        if (!storeNode) return
        if (storeNode.x || storeNode.y) {
          const pos = cn.position()
          if (Math.abs(pos.x - storeNode.x) > 0.5 || Math.abs(pos.y - storeNode.y) > 0.5) {
            cn.position({ x: storeNode.x, y: storeNode.y })
          }
        }
        const expectedSize = storeNode.size ?? 80
        const currentW = parseFloat(String(cn.style('width')))
        if (isNaN(currentW) || Math.abs(currentW - expectedSize) > 0.5) {
          cn.style({ width: expectedSize, height: expectedSize })
        }
      })

      // 新規エッジ
      for (const edge of edges) {
        const finalColor = edge.edgeColor ?? TAG_COLORS[edge.tag] ?? theme.edgeDefault
        const finalWidth = edge.edgeWidth ?? 2
        if (!cy.edges().some((ce) => ce.data('storeId') === edge.id)) {
          const srcEl = cy.nodes().filter((n) => n.data('storeId') === edge.sourceId)
          const tgtEl = cy.nodes().filter((n) => n.data('storeId') === edge.targetId)
          if (!srcEl.length || !tgtEl.length) continue
          cy.add({
            group: 'edges',
            data: {
              id: `cy-${edge.id}`,
              storeId: edge.id,
              source: srcEl.id(),
              target: tgtEl.id(),
              tag: edge.tag,
              direction: edge.direction,
              color: finalColor,
              edgeWidth: finalWidth,
            },
          })
        } else {
          const el = cy.edges().filter((ce) => ce.data('storeId') === edge.id)
          el.data('tag', edge.tag)
          el.data('direction', edge.direction)
          el.data('color', finalColor)
          el.data('edgeWidth', finalWidth)
        }
      }
    })

    // 新規ノードがあればレイアウト（ボックスはlockして対象外に）
    const newNodeCount = nodes.filter((n) => !n.x && !n.y).length
    const newEdgeAdded = edges.length > prevEdgeCountRef.current
    prevEdgeCountRef.current = edges.length

    // autoLayout OFF: 重ならない位置を割り当て + パン
    const autoLayout = useDiagramStore.getState().autoLayout
    if (!autoLayout && newNodeCount > 0) {
      requestAnimationFrame(() => {
        const c = cyRef.current
        if (!c || c.destroyed()) return
        const newStoreNodes = nodes.filter((n) => !n.x && !n.y)
        newStoreNodes.forEach((n, i) => {
          const cn = c.nodes().filter((el) => el.data('storeId') === n.id)
          if (!cn.length) return
          const others = c.nodes('[nodeType!="box"]').not(cn)
          let x = 0, y = 0
          if (others.length > 0) {
            const bb = others.boundingBox()
            const cx = (bb.x1 + bb.x2) / 2
            const cy2 = (bb.y1 + bb.y2) / 2
            const angle = ((others.length + i) * 137.508) * (Math.PI / 180)
            const radius = 150 + (others.length + i) * 20
            x = cx + Math.cos(angle) * radius
            y = cy2 + Math.sin(angle) * radius
          } else if (i > 0) {
            const angle = (i * 137.508) * (Math.PI / 180)
            x = Math.cos(angle) * (120 + i * 20)
            y = Math.sin(angle) * (120 + i * 20)
          }
          cn.position({ x, y })
          useDiagramStore.getState().updateNodePosition(n.id, x, y)
        })
        c.fit(undefined, 40)
      })
    }

    // 保存済みデータからの復元（全ノード位置あり）→ レイアウト不要、一度だけ fit
    if (nodes.length > 0 && newNodeCount === 0 && needsFitRef.current) {
      needsFitRef.current = false
      requestAnimationFrame(() => {
        if (!cyRef.current || cyRef.current.destroyed()) return
        cyRef.current.fit(undefined, 40)
      })
    }

    if (autoLayout && nodes.length > 0 && (newNodeCount > 0 || (newEdgeAdded && !needsFitRef.current))) {
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
              boxOpacity: box.opacity ?? 0.5,
              borderColor: theme.boxBorderColor,
            },
            position: { x: box.x, y: box.y },
          })
          el.style({ width: box.width, height: box.height })
        } else {
          // 既存ボックス更新（色・透明度・サイズ・位置）
          existing.data('boxColor', box.color)
          existing.data('boxOpacity', box.opacity ?? 0.5)
          existing.data('borderColor', theme.boxBorderColor)
          existing.style({ width: box.width, height: box.height })
          const pos = existing.position()
          if (Math.abs(pos.x - box.x) > 0.5 || Math.abs(pos.y - box.y) > 0.5) {
            existing.position({ x: box.x, y: box.y })
          }
        }
      }
    })
  }, [boxes, theme])

  // 自動整列ON時: 接続数に応じてノードサイズをスケーリング（接続2以上から1つごとに+10%）
  useEffect(() => {
    const cy = cyRef.current
    if (!cy || cy.destroyed()) return
    const SCALE_PER_DEGREE = 0.10  // 接続1本追加ごとに +10%
    cy.nodes('[nodeType!="box"]').forEach((n) => {
      const storeId = n.data('storeId') as string
      const storeNode = nodes.find((nd) => nd.id === storeId)
      if (!storeNode) return
      const baseSize = storeNode.size ?? 80
      if (autoLayout) {
        const degree = edges.filter(
          (e) => e.sourceId === storeId || e.targetId === storeId
        ).length
        const scaleFactor = degree >= 2 ? 1 + (degree - 1) * SCALE_PER_DEGREE : 1
        n.style({ width: baseSize * scaleFactor, height: baseSize * scaleFactor })
      } else {
        // autoLayout OFF: base size に戻す
        n.style({ width: baseSize, height: baseSize })
      }
    })
  }, [nodes, edges, autoLayout])

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

  // リサイズハンドル: グローバル pointermove / pointerup
  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      const r = resizeRef.current
      if (!r) return
      const cy = cyRef.current
      if (!cy || cy.destroyed()) return

      if (r.type === 'node') {
        // 中心からのユークリッド距離 → 新しい半径
        const dx = e.clientX - r.centerScreenX
        const dy = e.clientY - r.centerScreenY
        const newRadius = Math.sqrt(dx * dx + dy * dy) / cy.zoom()
        const newSize = Math.max(40, newRadius * 2)
        const cn = cy.nodes().filter((n) => n.data('storeId') === r.id)
        cn.style({ width: newSize, height: newSize })
      } else {
        // ボックス: ピン角から現在ポインタ位置までの矩形
        const container = containerRef.current
        if (!container) return
        const rect = container.getBoundingClientRect()
        const screenX = e.clientX - rect.left
        const screenY = e.clientY - rect.top
        const modelX = (screenX - cy.pan().x) / cy.zoom()
        const modelY = (screenY - cy.pan().y) / cy.zoom()
        const MIN_W = 60, MIN_H = 40

        let newW: number, newH: number, newCX: number, newCY: number
        if (r.handle === 'se') {
          newW = Math.max(MIN_W, modelX - r.pinnedModelX)
          newH = Math.max(MIN_H, modelY - r.pinnedModelY)
          newCX = r.pinnedModelX + newW / 2; newCY = r.pinnedModelY + newH / 2
        } else if (r.handle === 'sw') {
          newW = Math.max(MIN_W, r.pinnedModelX - modelX)
          newH = Math.max(MIN_H, modelY - r.pinnedModelY)
          newCX = r.pinnedModelX - newW / 2; newCY = r.pinnedModelY + newH / 2
        } else if (r.handle === 'ne') {
          newW = Math.max(MIN_W, modelX - r.pinnedModelX)
          newH = Math.max(MIN_H, r.pinnedModelY - modelY)
          newCX = r.pinnedModelX + newW / 2; newCY = r.pinnedModelY - newH / 2
        } else { // nw
          newW = Math.max(MIN_W, r.pinnedModelX - modelX)
          newH = Math.max(MIN_H, r.pinnedModelY - modelY)
          newCX = r.pinnedModelX - newW / 2; newCY = r.pinnedModelY - newH / 2
        }
        const cn = cy.nodes().filter((n) => n.data('storeId') === r.id)
        cn.style({ width: newW, height: newH })
        cn.position({ x: newCX, y: newCY })
      }
    }

    function onPointerUp() {
      const r = resizeRef.current
      if (!r) return
      const cy = cyRef.current
      if (!cy || cy.destroyed()) return

      const cn = cy.nodes().filter((n) => n.data('storeId') === r.id)
      if (r.type === 'node') {
        const newSize = parseFloat(String(cn.style('width')))
        if (!isNaN(newSize)) updateNodeSize(r.id, newSize)
      } else {
        const pos = cn.position()
        const newW = parseFloat(String(cn.style('width')))
        const newH = parseFloat(String(cn.style('height')))
        if (!isNaN(newW) && !isNaN(newH)) {
          updateBoxSize(r.id, newW, newH)
          useDiagramStore.getState().updateBoxPosition(r.id, pos.x, pos.y)
        }
      }

      resizeRef.current = null
      setSelectedId(null)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [updateNodeSize, updateBoxSize])

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

      {/* ボックスラベル HTMLオーバーレイ（図形上辺の少し上に表示） */}
      {boxes.map((box) => {
        if (!box.text) return null
        // モデル座標 → スクリーン座標変換
        const screenLeft = (box.x - box.width / 2) * viewport.zoom + viewport.px
        const screenTop  = (box.y - box.height / 2) * viewport.zoom + viewport.py
        const fontSize   = Math.max(10, 13 * viewport.zoom)
        const boxWidth   = box.width * viewport.zoom
        return (
          <div
            key={box.id}
            className="absolute pointer-events-none font-bold leading-tight whitespace-pre-wrap"
            style={{
              left: screenLeft,
              top: screenTop - fontSize * 1.4 - 2,
              width: boxWidth,
              fontSize,
              color: theme.boxTextColor,
              lineHeight: 1.4,
              textAlign: box.textAlign ?? 'left',
            }}
          >
            {box.text}
          </div>
        )
      })}

      {/* リサイズハンドルオーバーレイ */}
      {selectedId && !drawMode && !isReadOnly && (() => {
        const HS = 16  // ハンドルサイズ px
        const vp = viewport

        const node = nodes.find((n) => n.id === selectedId)
        if (node) {
          const r = (node.size ?? 80) / 2
          const cx = node.x * vp.zoom + vp.px
          const cy_s = node.y * vp.zoom + vp.py
          const hr = r * vp.zoom
          const HANDLES: { key: HandleKey; x: number; y: number; cursor: string; px: number; py: number }[] = [
            { key: 'nw', x: cx - hr, y: cy_s - hr, cursor: 'nw-resize', px: cx, py: cy_s },
            { key: 'ne', x: cx + hr, y: cy_s - hr, cursor: 'ne-resize', px: cx, py: cy_s },
            { key: 'sw', x: cx - hr, y: cy_s + hr, cursor: 'sw-resize', px: cx, py: cy_s },
            { key: 'se', x: cx + hr, y: cy_s + hr, cursor: 'se-resize', px: cx, py: cy_s },
          ]
          return (
            <>
              <div
                className="absolute pointer-events-none border-2 border-dashed border-violet-400/60 rounded-full"
                style={{ left: cx - hr - 3, top: cy_s - hr - 3, width: (hr + 3) * 2, height: (hr + 3) * 2 }}
              />
              {HANDLES.map((h) => (
                <div
                  key={h.key}
                  className="absolute z-30 bg-white border-2 border-violet-500 rounded-sm shadow-lg"
                  style={{ left: h.x - HS / 2, top: h.y - HS / 2, width: HS, height: HS, cursor: h.cursor, touchAction: 'none' }}
                  onPointerDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    useDiagramStore.getState().pushHistory()
                    resizeRef.current = {
                      id: node.id, type: 'node', handle: h.key,
                      startSize: node.size ?? 80,
                      centerScreenX: h.px, centerScreenY: h.py,
                      pinnedModelX: 0, pinnedModelY: 0,
                    }
                  }}
                />
              ))}
            </>
          )
        }

        const box = boxes.find((b) => b.id === selectedId)
        if (box) {
          const sl = (box.x - box.width / 2) * vp.zoom + vp.px
          const st = (box.y - box.height / 2) * vp.zoom + vp.py
          const sr = (box.x + box.width / 2) * vp.zoom + vp.px
          const sb = (box.y + box.height / 2) * vp.zoom + vp.py
          const BOX_HANDLES: { key: HandleKey; x: number; y: number; cursor: string; pinMX: number; pinMY: number }[] = [
            { key: 'nw', x: sl, y: st, cursor: 'nw-resize', pinMX: box.x + box.width / 2, pinMY: box.y + box.height / 2 },
            { key: 'ne', x: sr, y: st, cursor: 'ne-resize', pinMX: box.x - box.width / 2, pinMY: box.y + box.height / 2 },
            { key: 'sw', x: sl, y: sb, cursor: 'sw-resize', pinMX: box.x + box.width / 2, pinMY: box.y - box.height / 2 },
            { key: 'se', x: sr, y: sb, cursor: 'se-resize', pinMX: box.x - box.width / 2, pinMY: box.y - box.height / 2 },
          ]
          return (
            <>
              <div
                className="absolute pointer-events-none border-2 border-dashed border-violet-400/60"
                style={{ left: sl - 2, top: st - 2, width: sr - sl + 4, height: sb - st + 4 }}
              />
              {/* 編集ボタン */}
              <button
                className="absolute z-30 bg-white/90 text-violet-700 text-xs font-bold px-2 py-0.5 rounded shadow-lg"
                style={{ left: (sl + sr) / 2 - 16, top: st - 26 }}
                onClick={() => {
                  const storeBox = useDiagramStore.getState().boxes.find((b) => b.id === box.id)
                  if (storeBox) setEditingBox({ boxId: storeBox.id, color: storeBox.color, opacity: storeBox.opacity ?? 0.5, text: storeBox.text, textAlign: storeBox.textAlign })
                }}
              >
                編集
              </button>
              {BOX_HANDLES.map((h) => (
                <div
                  key={h.key}
                  className="absolute z-30 bg-white border-2 border-violet-500 rounded-sm shadow-lg"
                  style={{ left: h.x - HS / 2, top: h.y - HS / 2, width: HS, height: HS, cursor: h.cursor, touchAction: 'none' }}
                  onPointerDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    useDiagramStore.getState().pushHistory()
                    resizeRef.current = {
                      id: box.id, type: 'box', handle: h.key,
                      startSize: 0,
                      centerScreenX: 0, centerScreenY: 0,
                      pinnedModelX: h.pinMX, pinnedModelY: h.pinMY,
                    }
                  }}
                />
              ))}
            </>
          )
        }

        return null
      })()}

      {/* 選択ノードの × 削除ボタン */}
      {(() => {
        if (!connectingFromId) return null
        const selectedNode = nodes.find((n) => n.id === connectingFromId)
        if (!selectedNode) return null
        // モデル座標 → スクリーン座標（ノード上端・水平中央）
        const nodeRadius = (selectedNode.size ?? 80) / 2
        const screenCX = selectedNode.x * viewport.zoom + viewport.px
        const screenCY = selectedNode.y * viewport.zoom + viewport.py
        const btnX = screenCX - 10
        const btnY = screenCY - nodeRadius * viewport.zoom - 22
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
      {drawMode && !isReadOnly && (
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

      {drawMode && !isReadOnly && (
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
          initialEdgeColor={editingEdge.edgeColor}
          initialEdgeWidth={editingEdge.edgeWidth}
          onClose={() => setEditingEdge(null)}
        />
      )}

      {editingBox && (
        <BoxModal
          boxId={editingBox.boxId}
          initialColor={editingBox.color}
          initialOpacity={editingBox.opacity}
          initialText={editingBox.text}
          initialTextAlign={editingBox.textAlign}
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
    width: 'data(edgeWidth)' as never,
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
