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
  size?: number        // ノードサイズ（diameter）、デフォルト 80
}

// エディター上の背景ボックス（グループ枠）
export interface EditorBox {
  id: string
  x: number      // Cytoscape モデル座標（中心）
  y: number
  width: number
  height: number
  color: string
  opacity: number  // 0〜1、デフォルト 0.5
  text: string
  textAlign?: 'left' | 'center' | 'right'  // デフォルト 'left'
}

// エディター上のエッジ
export interface EditorEdge {
  id: string           // ローカルID
  sourceId: string     // EditorNode.id
  targetId: string     // EditorNode.id
  tag: string
  direction: EdgeDirection
  edgeColor?: string   // カスタム色（未設定なら TAG_COLORS か theme.edgeDefault）
  edgeWidth?: number   // カスタム太さ（未設定なら 2）
}


interface HistorySnapshot {
  nodes: EditorNode[]
  edges: EditorEdge[]
  boxes: EditorBox[]
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

  // 自動整列
  autoLayout: boolean

  // 入力履歴（カスタムタグ、相関図ごと max 5件）
  tagHistory: string[]
  addTagHistory: (tag: string) => void

  // undo/redo
  past: HistorySnapshot[]
  future: HistorySnapshot[]

  // actions
  pushHistory: () => void
  undo: () => void
  redo: () => void
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
  addEdge: (sourceId: string, targetId: string, tag: string, direction: EdgeDirection, edgeColor?: string, edgeWidth?: number) => void
  updateEdge: (id: string, tag: string, direction: EdgeDirection, edgeColor?: string, edgeWidth?: number) => void
  removeEdge: (id: string) => void
  addBox: (x: number, y: number, width: number, height: number, color: string) => void
  updateBox: (id: string, updates: Partial<Pick<EditorBox, 'color' | 'opacity' | 'text' | 'textAlign' | 'x' | 'y'>>) => void
  updateBoxPosition: (id: string, x: number, y: number) => void
  updateBoxSize: (id: string, width: number, height: number) => void
  removeBox: (id: string) => void
  updateNodeSize: (id: string, size: number) => void
  setDrawMode: (v: boolean) => void
  setAutoLayout: (v: boolean) => void
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
  autoLayout: false,

  tagHistory: [],

  past: [],
  future: [],

  pushHistory: () => {
    const { nodes, edges, boxes, past } = get()
    const snapshot: HistorySnapshot = {
      nodes: nodes.map((n) => ({ ...n })),
      edges: edges.map((e) => ({ ...e })),
      boxes: boxes.map((b) => ({ ...b })),
    }
    set({ past: [...past.slice(-49), snapshot], future: [] })
  },

  undo: () => {
    const { past, nodes, edges, boxes, future } = get()
    if (past.length === 0) return
    const prev = past[past.length - 1]
    const current: HistorySnapshot = {
      nodes: nodes.map((n) => ({ ...n })),
      edges: edges.map((e) => ({ ...e })),
      boxes: boxes.map((b) => ({ ...b })),
    }
    set({
      nodes: prev.nodes,
      edges: prev.edges,
      boxes: prev.boxes,
      past: past.slice(0, -1),
      future: [current, ...future.slice(0, 49)],
      connectingFromId: null,
    })
  },

  redo: () => {
    const { past, nodes, edges, boxes, future } = get()
    if (future.length === 0) return
    const next = future[0]
    const current: HistorySnapshot = {
      nodes: nodes.map((n) => ({ ...n })),
      edges: edges.map((e) => ({ ...e })),
      boxes: boxes.map((b) => ({ ...b })),
    }
    set({
      nodes: next.nodes,
      edges: next.edges,
      boxes: next.boxes,
      past: [...past.slice(-49), current],
      future: future.slice(1),
      connectingFromId: null,
    })
  },

  setDrawMode: (v) => set({ drawMode: v }),
  setAutoLayout: (v) => set({ autoLayout: v }),

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
    get().pushHistory()
    const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const newNode: EditorNode = {
      id,
      characterId: character.id,
      label: character.name,
      imageUrl: character.image_url,
      x: 0,
      y: 0,
    }
    set({ nodes: [...get().nodes, newNode] })
  },

  removeNode: (id) => {
    get().pushHistory()
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.sourceId !== id && e.targetId !== id),
      connectingFromId: state.connectingFromId === id ? null : state.connectingFromId,
    }))
  },

  updateNodePosition: (id, x, y) =>
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
    })),

  setConnectingFrom: (id) => set({ connectingFromId: id }),

  addEdge: (sourceId, targetId, tag, direction, edgeColor?, edgeWidth?) => {
    const { edges } = get()
    const pairEdges = edges.filter((e) =>
      (e.sourceId === sourceId && e.targetId === targetId) ||
      (e.sourceId === targetId && e.targetId === sourceId)
    )
    if (pairEdges.some((e) => e.direction === direction)) return
    if (pairEdges.length >= 4) return
    get().pushHistory()
    const id = `edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    set({
      edges: [...get().edges, { id, sourceId, targetId, tag, direction, edgeColor, edgeWidth }],
      connectingFromId: null,
    })
  },

  updateEdge: (id, tag, direction, edgeColor?, edgeWidth?) => {
    get().pushHistory()
    set((state) => ({
      edges: state.edges.map((e) => (e.id === id ? { ...e, tag, direction, edgeColor, edgeWidth } : e)),
    }))
  },

  addTagHistory: (tag) => {
    const { tagHistory } = get()
    if (tagHistory.includes(tag)) return
    set({ tagHistory: [tag, ...tagHistory].slice(0, 5) })
  },

  removeEdge: (id) => {
    get().pushHistory()
    set((state) => ({ edges: state.edges.filter((e) => e.id !== id) }))
  },

  addBox: (x, y, width, height, color) => {
    get().pushHistory()
    const id = `box-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    set((state) => ({ boxes: [...state.boxes, { id, x, y, width, height, color, opacity: 0.5, text: '' }] }))
  },

  updateBox: (id, updates) => {
    get().pushHistory()
    set((state) => ({
      boxes: state.boxes.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    }))
  },

  updateBoxPosition: (id, x, y) =>
    set((state) => ({
      boxes: state.boxes.map((b) => (b.id === id ? { ...b, x, y } : b)),
    })),

  updateBoxSize: (id, width, height) =>
    set((state) => ({
      boxes: state.boxes.map((b) => (b.id === id ? { ...b, width, height } : b)),
    })),

  removeBox: (id) => {
    get().pushHistory()
    set((state) => ({ boxes: state.boxes.filter((b) => b.id !== id) }))
  },

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
      autoLayout: false,
      tagHistory: [],
      past: [],
      future: [],
    }),

  updateNodeSize: (id, size) =>
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, size } : n)),
    })),

  syncFromDb: (nodes, edges) => set({ nodes, edges }),
}))
