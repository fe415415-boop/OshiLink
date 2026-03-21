'use client'

import { useState } from 'react'
import { useDiagramStore, EdgeDirection } from '@/store/diagramStore'

const TAG_SUGGESTIONS = ['親友', '相棒', 'ライバル', 'てぇてぇ', '師弟', '尊敬', '不仲', '仲間', 'ビジネス', 'ハート', '敵']

const DIRECTION_OPTIONS: { value: EdgeDirection; label: string; desc: string }[] = [
  { value: 'right', label: '→', desc: '右矢印' },
  { value: 'left',  label: '←', desc: '左矢印' },
  { value: 'both',  label: '↔', desc: '両矢印' },
  { value: 'none',  label: '—', desc: '通常線' },
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
  onClose: () => void
}

type Props = ConnectProps | EditProps

export default function ConnectionModal(props: Props) {
  const nodes = useDiagramStore((s) => s.nodes)
  const edges = useDiagramStore((s) => s.edges)
  const addEdge = useDiagramStore((s) => s.addEdge)
  const updateEdge = useDiagramStore((s) => s.updateEdge)

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

  // connect モード: 使用可能な最初の方向を初期値に。全使用済みなら 'right'（どうせ disabled）
  // edit モード: initialDirection
  const firstAvailable = DIRECTION_OPTIONS.find((o) => !usedDirections.includes(o.value))?.value ?? 'right'
  const initialDir: EdgeDirection = isEdit ? props.initialDirection : firstAvailable

  const [tag, setTag]           = useState(isEdit ? props.initialTag : '')
  const [direction, setDirection] = useState<EdgeDirection>(initialDir)

  const sourceNode = nodes.find((n) => n.id === sourceId)
  const targetNode = nodes.find((n) => n.id === targetId)
  const sourceLabel = sourceNode?.label
  const targetLabel = targetNode?.label

  function handleConfirm() {
    const t = tag.trim()
    if (!t) return
    if (isEdit) {
      updateEdge(edgeId!, t, direction)
    } else {
      addEdge(sourceId, targetId, t, direction)
    }
    props.onClose()
  }

  function appendTag(t: string) {
    setTag((prev) => prev ? `${prev}・${t}` : t)
  }

  // 方向の表示ルール
  // edit モード: 使用済み（他エッジが使用中）は非表示
  // connect モード: 全使用済みなら全部 disabled で表示、一部なら使用済みを非表示
  function getDisplayedOptions() {
    if (isEdit) {
      return DIRECTION_OPTIONS.filter((o) => !usedDirections.includes(o.value))
    }
    if (allDirectionsTaken) {
      return DIRECTION_OPTIONS // 全て表示（全 disabled）
    }
    return DIRECTION_OPTIONS.filter((o) => !usedDirections.includes(o.value))
  }

  const displayedOptions = getDisplayedOptions()

  // 追加ボタンの有効条件
  // edit: タグが空でなければOK
  // connect: タグが空でない かつ 選択中の方向が使用可能
  const canSubmit = tag.trim().length > 0 &&
    (isEdit || !usedDirections.includes(direction))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) props.onClose() }}
    >
      <div className="w-full max-w-sm mx-4 rounded-2xl bg-[#1a1a2e] border border-white/10 p-5 shadow-2xl">
        {/* タイトル（アバター＋名前） */}
        <div className="flex items-center justify-center gap-3 mb-4">
          {/* ソース */}
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

          {/* ターゲット */}
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
        <div className="mb-4">
          <p className="text-xs text-white/40 mb-2">リンクの種類</p>
          <div className={`grid gap-1.5 ${displayedOptions.length === 4 ? 'grid-cols-4' : displayedOptions.length === 3 ? 'grid-cols-3' : displayedOptions.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {displayedOptions.map((opt) => {
              const isDisabled = usedDirections.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  onClick={() => !isDisabled && setDirection(opt.value)}
                  disabled={isDisabled}
                  className={`flex flex-col items-center gap-0.5 py-2 rounded-lg border text-sm font-bold transition-colors ${
                    isDisabled
                      ? 'bg-white/3 border-white/5 text-white/20 cursor-not-allowed'
                      : direction === opt.value
                      ? 'bg-violet-600 border-violet-400 text-white'
                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                  }`}
                >
                  <span className="text-base">{opt.label}</span>
                </button>
              )
            })}
          </div>
          {/* 全方向使用済みの案内（connect モードのみ） */}
          {!isEdit && allDirectionsTaken && (
            <p className="text-xs text-white/30 mt-2 text-center">全種類のリンクが設定済みです</p>
          )}
        </div>

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
          {/* connect で全使用済みの場合はボタンを隠す */}
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
