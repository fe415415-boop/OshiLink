import { create } from 'zustand'
import type { TemplateCharacter, EdgeDirection } from '@/lib/supabase/types'

export type { EdgeDirection }
export type Template = 'stylish' | 'pink' | 'simple' | 'night' | 'sunset' | 'mint'
export type FontStyle = 'cool' | 'pop' | 'emo' | 'elegant'

// エディター上のノード（キャンバス内配置済み人物）
export interface EditorNode {
  id: string           // ローカルID（DBのdiagram_node.idに対応）
  characterId: string  // template_characters.id
  label: string
  imageUrl: string | null
  x: number
  y: number
}

// エディター上の背景ボックス（グループ枠）
export interface EditorBox {
  id: string
  x: number      // Cytoscape モデル座標（中心）
  y: number
  width: number
  height: number
  color: string
  text: string
}

// エディター上のエッジ
export interface EditorEdge {
  id: string           // ローカルID
  sourceId: string     // EditorNode.id
  targetId: string     // EditorNode.id
  tag: string
  direction: EdgeDirection
}


export interface DiagramStore {
  // テンプレート情報（読み込み済み）
  templateId: string | null
  templateTitle: string
  characters: TemplateCharacter[]

  // エディター状態
  title: string
  nodes: EditorNode[]
  edges: EditorEdge[]
  boxes: EditorBox[]
  template: Template
  fontStyle: FontStyle

  // 接続操作状態
  connectingFromId: string | null  // クリック中のノードID

  // 図形描画モード
  drawMode: boolean

  // actions
  loadTemplate: (id: string, title: string, characters: TemplateCharacter[]) => void
  loadDiagram: (params: {
    templateId: string
    templateTitle: string
    characters: TemplateCharacter[]
    title: string
    template: Template
    fontStyle: FontStyle
    nodes: EditorNode[]
    edges: EditorEdge[]
  }) => void
  setTitle: (title: string) => void
  addNode: (character: TemplateCharacter) => void
  removeNode: (id: string) => void
  updateNodePosition: (id: string, x: number, y: number) => void
  setConnectingFrom: (id: string | null) => void
  addEdge: (sourceId: string, targetId: string, tag: string, direction: EdgeDirection) => void
  updateEdge: (id: string, tag: string, direction: EdgeDirection) => void
  removeEdge: (id: string) => void
  addBox: (x: number, y: number, width: number, height: number, color: string) => void
  updateBox: (id: string, updates: Partial<Pick<EditorBox, 'color' | 'text' | 'x' | 'y'>>) => void
  removeBox: (id: string) => void
  setDrawMode: (v: boolean) => void
  setTemplate: (template: Template) => void
  setFontStyle: (fontStyle: FontStyle) => void
  reset: () => void
  // DB保存済みのIDで上書き（保存後に呼ぶ）
  syncFromDb: (nodes: EditorNode[], edges: EditorEdge[]) => void
}

export const useDiagramStore = create<DiagramStore>((set, get) => ({
  templateId: null,
  templateTitle: '',
  characters: [],

  title: '',
  nodes: [],
  edges: [],
  boxes: [],
  template: 'stylish',
  fontStyle: 'cool',

  connectingFromId: null,
  drawMode: false,

  setDrawMode: (v) => set({ drawMode: v }),

  loadTemplate: (id, title, characters) =>
    set({ templateId: id, templateTitle: title, characters, nodes: [], edges: [] }),

  loadDiagram: (params) =>
    set({
      templateId: params.templateId,
      templateTitle: params.templateTitle,
      characters: params.characters,
      title: params.title,
      template: params.template,
      fontStyle: params.fontStyle,
      nodes: params.nodes,
      edges: params.edges,
      boxes: [],
      connectingFromId: null,
    }),

  setTitle: (title) => set({ title }),

  addNode: (character) => {
    const { nodes } = get()
    if (nodes.find((n) => n.characterId === character.id)) return  // 重複防止
    const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const newNode: EditorNode = {
      id,
      characterId: character.id,
      label: character.name,
      imageUrl: character.image_url,
      x: 0,
      y: 0,
    }
    set({ nodes: [...nodes, newNode] })
  },

  removeNode: (id) =>
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.sourceId !== id && e.targetId !== id),
      connectingFromId: state.connectingFromId === id ? null : state.connectingFromId,
    })),

  updateNodePosition: (id, x, y) =>
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
    })),

  setConnectingFrom: (id) => set({ connectingFromId: id }),

  addEdge: (sourceId, targetId, tag, direction) => {
    const { edges } = get()
    const pairEdges = edges.filter((e) =>
      (e.sourceId === sourceId && e.targetId === targetId) ||
      (e.sourceId === targetId && e.targetId === sourceId)
    )
    // 同一ペアに同じ方向タイプが既にある場合はブロック（各方向1本まで、最大4本）
    if (pairEdges.some((e) => e.direction === direction)) return
    if (pairEdges.length >= 4) return
    const id = `edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    set({
      edges: [...edges, { id, sourceId, targetId, tag, direction }],
      connectingFromId: null,
    })
  },

  updateEdge: (id, tag, direction) =>
    set((state) => ({
      edges: state.edges.map((e) => (e.id === id ? { ...e, tag, direction } : e)),
    })),

  removeEdge: (id) =>
    set((state) => ({ edges: state.edges.filter((e) => e.id !== id) })),

  addBox: (x, y, width, height, color) => {
    const id = `box-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    set((state) => ({ boxes: [...state.boxes, { id, x, y, width, height, color, text: '' }] }))
  },

  updateBox: (id, updates) =>
    set((state) => ({
      boxes: state.boxes.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    })),

  removeBox: (id) =>
    set((state) => ({ boxes: state.boxes.filter((b) => b.id !== id) })),

  setTemplate: (template) => set({ template }),
  setFontStyle: (fontStyle) => set({ fontStyle }),

  reset: () =>
    set({
      title: '',
      nodes: [],
      edges: [],
      boxes: [],
      template: 'stylish',
      fontStyle: 'cool',
      connectingFromId: null,
    }),

  syncFromDb: (nodes, edges) => set({ nodes, edges }),
}))
