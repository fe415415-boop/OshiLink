'use client'

import { useState } from 'react'
import { useDiagramStore, EdgeDirection } from '@/store/diagramStore'

const TAG_SUGGESTIONS = ['親友', '相棒', 'ライバル', 'ビジネス', '♥']

const DIRECTION_OPTIONS: { value: EdgeDirection; label: string; desc: string }[] = [
  { value: 'right', label: '→', desc: '右矢印' },
  { value: 'left',  label: '←', desc: '左矢印' },
  { value: 'both',  label: '↔', desc: '両矢印' },
  { value: 'none',  label: '—', desc: '通常線' },
]

const EDGE_COLOR_PRESETS = ['#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#10b981', '#ec4899', '#ffffff', '#94a3b8']
const EDGE_WIDTH_OPTIONS: { label: string; value: number }[] = [
  { label: '細', value: 1.5 },
  { label: '普通', value: 2.5 },
  { label: '太', value: 4.5 },
]

// 新規接続モード
interface ConnectProps {
  mode: 'connect'
  sourceId: string
  targetId: string
  onClose: () => void
}

// 既存エッジ編集モード
interface EditProps {
  mode: 'edit'
  edgeId: string
  sourceId: string
  targetId: string
  initialTag: string
  initialDirection: EdgeDirection
  initialEdgeColor?: string
  initialEdgeWidth?: number
  onClose: () => void
}

type Props = ConnectProps | EditProps

export default function ConnectionModal(props: Props) {
  const nodes = useDiagramStore((s) => s.nodes)
  const edges = useDiagramStore((s) => s.edges)
  const addEdge = useDiagramStore((s) => s.addEdge)
  const updateEdge = useDiagramStore((s) => s.updateEdge)
  const tagHistory = useDiagramStore((s) => s.tagHistory)

  const isEdit = props.mode === 'edit'
  const sourceId = props.sourceId
  const targetId = props.targetId
  const edgeId   = isEdit ? props.edgeId : undefined

  // このペア間の他のエッジが使用済みの方向（edit時は自分自身を除外）
  const usedDirections = edges
    .filter((e) => {
      const inPair =
        (e.sourceId === sourceId && e.targetId === targetId) ||
        (e.sourceId === targetId && e.targetId === sourceId)
      if (!inPair) return false
      if (isEdit && e.id === edgeId) return false
      return true
    })
    .map((e) => e.direction)

  const allDirectionsTaken = usedDirections.length >= DIRECTION_OPTIONS.length

  const firstAvailable = DIRECTION_OPTIONS.find((o) => !usedDirections.includes(o.value))?.value ?? 'right'
  const initialDir: EdgeDirection = isEdit ? props.initialDirection : firstAvailable

  const [tag, setTag]             = useState(isEdit ? props.initialTag : '')
  const [direction, setDirection] = useState<EdgeDirection>(initialDir)
  const [edgeColor, setEdgeColor] = useState<string | undefined>(isEdit ? props.initialEdgeColor : undefined)
  const [edgeWidth, setEdgeWidth] = useState<number | undefined>(isEdit ? props.initialEdgeWidth : undefined)
  const [showStylePanel, setShowStylePanel] = useState(false)

  const sourceNode = nodes.find((n) => n.id === sourceId)
  const targetNode = nodes.find((n) => n.id === targetId)
  const sourceLabel = sourceNode?.label
  const targetLabel = targetNode?.label

  function handleConfirm() {
    const t = tag.trim()
    if (!t) return
    if (isEdit) {
      updateEdge(edgeId!, t, direction, edgeColor, edgeWidth)
    } else {
      addEdge(sourceId, targetId, t, direction, edgeColor, edgeWidth)
    }
    // デフォルトタグに存在しないものは履歴に追加
    if (!TAG_SUGGESTIONS.includes(t)) {
      useDiagramStore.getState().addTagHistory(t)
    }
    props.onClose()
  }

  function appendTag(t: string) {
    setTag((prev) => prev ? `${prev}・${t}` : t)
  }

  function getDisplayedOptions() {
    if (isEdit) {
      return DIRECTION_OPTIONS.filter((o) => !usedDirections.includes(o.value))
    }
    if (allDirectionsTaken) {
      return DIRECTION_OPTIONS
    }
    return DIRECTION_OPTIONS.filter((o) => !usedDirections.includes(o.value))
  }

  const displayedOptions = getDisplayedOptions()

  const canSubmit = tag.trim().length > 0 &&
    (isEdit || !usedDirections.includes(direction))

  const gridCols = displayedOptions.length === 4 ? 'grid-cols-4'
    : displayedOptions.length === 3 ? 'grid-cols-3'
    : displayedOptions.length === 2 ? 'grid-cols-2'
    : 'grid-cols-1'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) props.onClose() }}
    >
      <div className="w-full max-w-sm mx-4 rounded-2xl bg-[#1a1a2e] border border-white/10 p-5 shadow-2xl">
        {/* タイトル（アバター＋名前） */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20 bg-white/10 flex items-center justify-center shrink-0">
              {sourceNode?.imageUrl
                ? <img src={sourceNode.imageUrl} alt={sourceLabel} className="w-full h-full object-cover" />
                : <span className="text-xs font-bold text-white/60">{sourceLabel?.slice(0, 1)}</span>
              }
            </div>
            <span className="text-xs font-bold text-white/80 max-w-16 text-center truncate">{sourceLabel}</span>
          </div>

          <span className="text-white/30 text-sm pb-4">と</span>

          <div className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20 bg-white/10 flex items-center justify-center shrink-0">
              {targetNode?.imageUrl
                ? <img src={targetNode.imageUrl} alt={targetLabel} className="w-full h-full object-cover" />
                : <span className="text-xs font-bold text-white/60">{targetLabel?.slice(0, 1)}</span>
              }
            </div>
            <span className="text-xs font-bold text-white/80 max-w-16 text-center truncate">{targetLabel}</span>
          </div>
        </div>
        <p className="text-xs text-white/40 text-center -mt-2 mb-4">の関係を設定</p>

        {/* リンク種別 */}
        <div className="mb-3">
          <p className="text-xs text-white/40 mb-2">リンクの種類</p>
          <div className={`grid gap-1.5 ${gridCols}`}>
            {displayedOptions.map((opt) => {
              const isDisabled = usedDirections.includes(opt.value)
              const isSelected = direction === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => !isDisabled && setDirection(opt.value)}
                  disabled={isDisabled}
                  className={`relative flex flex-col items-center gap-0.5 py-2 rounded-lg border text-sm font-bold transition-colors ${
                    isDisabled
                      ? 'bg-white/3 border-white/5 text-white/20 cursor-not-allowed'
                      : isSelected
                      ? 'bg-violet-600 border-violet-400 text-white'
                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                  }`}
                >
                  <span className="text-base">{opt.label}</span>
                  {isSelected && !isDisabled && (
                    <span
                      onClick={(e) => { e.stopPropagation(); setShowStylePanel((v) => !v) }}
                      className="absolute top-0.5 right-1 text-white/70 hover:text-white text-xs leading-none cursor-pointer"
                      title="色・太さを設定"
                      role="button"
                      aria-label="色・太さを設定"
                    >
                      ⚙
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          {!isEdit && allDirectionsTaken && (
            <p className="text-xs text-white/30 mt-2 text-center">全種類のリンクが設定済みです</p>
          )}
        </div>

        {/* エッジスタイルパネル */}
        {showStylePanel && (
          <div className="mb-3 p-3 rounded-xl bg-white/5 border border-white/10">
            {/* 色 */}
            <div className="mb-2">
              <p className="text-xs text-white/40 mb-1.5">線の色</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {EDGE_COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setEdgeColor(c)}
                    className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 shrink-0"
                    style={{
                      background: c,
                      borderColor: edgeColor === c ? '#a78bfa' : 'transparent',
                      outline: edgeColor === c ? '1px solid #a78bfa' : 'none',
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={edgeColor ?? '#8b5cf6'}
                  onChange={(e) => setEdgeColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent shrink-0"
                  title="カスタムカラー"
                />
                {edgeColor && (
                  <button
                    onClick={() => setEdgeColor(undefined)}
                    className="text-xs text-white/30 hover:text-white/60 ml-1"
                  >
                    リセット
                  </button>
                )}
              </div>
            </div>
            {/* 太さ */}
            <div>
              <p className="text-xs text-white/40 mb-1.5">線の太さ</p>
              <div className="flex gap-1.5">
                {EDGE_WIDTH_OPTIONS.map((w) => (
                  <button
                    key={w.value}
                    onClick={() => setEdgeWidth(edgeWidth === w.value ? undefined : w.value)}
                    className={`flex-1 py-1 rounded-lg text-xs font-bold border transition-colors ${
                      edgeWidth === w.value
                        ? 'bg-violet-600 border-violet-400 text-white'
                        : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 関係性タグ */}
        <div className="mb-3">
          <p className="text-xs text-white/40 mb-2">関係性</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {TAG_SUGGESTIONS.map((t) => (
              <button
                key={t}
                onClick={() => appendTag(t)}
                className="px-2.5 py-1 rounded-full text-xs font-bold border bg-white/5 border-white/10 text-white/60 hover:bg-white/10 active:bg-violet-700 transition-colors"
              >
                {t}
              </button>
            ))}
          </div>
          {/* 入力履歴 */}
          {tagHistory.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2 items-center">
              {tagHistory.map((t) => (
                <button
                  key={t}
                  onClick={() => appendTag(t)}
                  className="px-2.5 py-1 rounded-full text-xs font-bold border bg-white/3 border-white/8 text-white/40 hover:bg-white/10 transition-colors"
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          <input
            type="text"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
            placeholder="自由入力..."
            autoFocus
            className="w-full rounded-lg px-3 py-2 bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-violet-500 placeholder:text-white/25"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={props.onClose}
            className="flex-1 py-2 rounded-lg bg-white/5 text-white/50 text-sm hover:bg-white/10 transition-colors"
          >
            キャンセル
          </button>
          {(!(!isEdit && allDirectionsTaken)) && (
            <button
              onClick={handleConfirm}
              disabled={!canSubmit}
              className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold disabled:opacity-50 transition-colors"
            >
              {isEdit ? '更新' : '追加'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
