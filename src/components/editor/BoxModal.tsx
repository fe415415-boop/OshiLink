'use client'

import { useState } from 'react'
import { useDiagramStore } from '@/store/diagramStore'

const COLOR_PRESETS = [
  // ダーク系
  '#1e1e3a', '#2a1a3a', '#1a2a3a', '#1a3a2a', '#3a1a1a', '#3a2a1a',
  // ミディアム系
  '#2d3a6e', '#6e2d3a', '#2d6e3a', '#6e6e2d', '#2d6e6e', '#6e2d6e',
  // ライト系（simple テンプレート向け）
  '#e8eaf6', '#fce4ec', '#e8f5e9', '#fff8e1', '#e0f7fa', '#f3e5f5',
]

type TextAlign = 'left' | 'center' | 'right'

interface Props {
  boxId: string
  initialColor: string
  initialOpacity: number
  initialText: string
  initialTextAlign?: TextAlign
  onClose: () => void
}

export default function BoxModal({ boxId, initialColor, initialOpacity, initialText, initialTextAlign = 'left', onClose }: Props) {
  const updateBox = useDiagramStore((s) => s.updateBox)
  const removeBox = useDiagramStore((s) => s.removeBox)

  const [color, setColor] = useState(initialColor)
  const [opacity, setOpacity] = useState(initialOpacity)
  const [text, setText] = useState(initialText)
  const [textAlign, setTextAlign] = useState<TextAlign>(initialTextAlign)

  function handleConfirm() {
    updateBox(boxId, { color, opacity, text, textAlign })
    onClose()
  }

  function handleDelete() {
    removeBox(boxId)
    onClose()
  }

  const ALIGN_OPTIONS: { value: TextAlign; label: string }[] = [
    { value: 'left',   label: '左揃え' },
    { value: 'center', label: '中央揃え' },
    { value: 'right',  label: '右揃え' },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) { handleConfirm(); onClose() } }}
    >
      <div className="w-full max-w-sm mx-4 rounded-2xl bg-[#1a1a2e] border border-white/10 p-5 shadow-2xl">
        <p className="text-sm text-white/50 mb-4 text-center">図形を編集</p>

        {/* 背景色 */}
        <div className="mb-4">
          <p className="text-xs text-white/40 mb-2">背景色</p>
          <div className="grid grid-cols-6 gap-1.5 mb-2">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-full aspect-square rounded-md border-2 transition-transform hover:scale-110"
                style={{
                  background: c,
                  borderColor: color === c ? '#a78bfa' : 'transparent',
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-white/40">カスタム</span>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
            />
            <span className="text-xs text-white/30 font-mono">{color}</span>
          </div>
        </div>

        {/* 透明度 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-white/40">透明度</p>
            <span className="text-xs text-white/30 font-mono">{Math.round(opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(opacity * 100)}
            onChange={(e) => setOpacity(Number(e.target.value) / 100)}
            className="w-full accent-violet-500"
          />
        </div>

        {/* テキスト */}
        <div className="mb-3">
          <p className="text-xs text-white/40 mb-2">テキスト</p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="グループ名など..."
            rows={3}
            autoFocus
            className="w-full rounded-lg px-3 py-2 bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-violet-500 placeholder:text-white/25 resize-none"
            style={{ textAlign }}
          />
        </div>

        {/* テキスト揃え */}
        <div className="mb-4 flex gap-1.5">
          {ALIGN_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTextAlign(opt.value)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                textAlign === opt.value
                  ? 'bg-violet-600 border-violet-400 text-white'
                  : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            className="px-3 py-2 rounded-lg bg-red-600/20 text-red-400 text-sm hover:bg-red-600/40 transition-colors"
          >
            削除
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-white/5 text-white/50 text-sm hover:bg-white/10 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors"
          >
            適用
          </button>
        </div>
      </div>
    </div>
  )
}
