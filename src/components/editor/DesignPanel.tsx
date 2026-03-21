'use client'

import { useState } from 'react'
import { useDiagramStore, Template, FontStyle } from '@/store/diagramStore'
import { TEMPLATE_LABELS, FONT_LABELS, FONT_FAMILIES, THEMES } from '@/lib/themes'

const TEMPLATES: Template[] = ['stylish', 'pink', 'simple', 'night', 'sunset', 'mint']
const FONTS: FontStyle[] = ['cool', 'pop', 'emo', 'elegant']

export default function DesignPanel() {
  const template = useDiagramStore((s) => s.template)
  const fontStyle = useDiagramStore((s) => s.fontStyle)
  const drawMode = useDiagramStore((s) => s.drawMode)
  const setTemplate = useDiagramStore((s) => s.setTemplate)
  const setFontStyle = useDiagramStore((s) => s.setFontStyle)
  const setDrawMode = useDiagramStore((s) => s.setDrawMode)
  const theme = THEMES[template]

  const [designOpen, setDesignOpen] = useState(false)
  const [fontOpen, setFontOpen] = useState(false)

  const btnBase = 'h-8 px-2.5 rounded-lg text-xs font-bold transition-all border flex items-center justify-center whitespace-nowrap'

  return (
    <div className="flex flex-col items-end gap-1">
      {/* 横並びボタン行 */}
      <div className="flex gap-1">
        {/* 囲む */}
        <button
          onClick={() => setDrawMode(!drawMode)}
          title={drawMode ? '図形描画中（ESCでキャンセル）' : '図形を追加'}
          className={`${btnBase} ${
            drawMode
              ? 'bg-violet-600 border-violet-400 text-white'
              : 'bg-white/5 border-white/10 opacity-60 hover:opacity-90'
          }`}
          style={{ color: drawMode ? undefined : theme.nodeText }}
        >
          囲む
        </button>

        {/* デザイン */}
        <button
          onClick={() => { setDesignOpen((v) => !v); setFontOpen(false) }}
          className={`${btnBase} border-white/10 ${designOpen ? 'bg-violet-600/30 border-violet-400/50 opacity-100' : 'bg-white/5 opacity-60 hover:opacity-90'}`}
          style={{ color: theme.nodeText }}
        >
          デザイン
        </button>

        {/* フォント */}
        <button
          onClick={() => { setFontOpen((v) => !v); setDesignOpen(false) }}
          className={`${btnBase} border-white/10 ${fontOpen ? 'bg-violet-600/30 border-violet-400/50 opacity-100' : 'bg-white/5 opacity-60 hover:opacity-90'}`}
          style={{ color: theme.nodeText }}
        >
          フォント
        </button>
      </div>

      {/* デザイン展開 */}
      {designOpen && (
        <div className="flex gap-1 flex-wrap rounded-xl p-1.5 backdrop-blur-sm shadow-xl" style={{ background: `${theme.panelBg}dd` }}>
          {TEMPLATES.map((t) => {
            const th = THEMES[t]
            const isActive = template === t
            return (
              <button
                key={t}
                onClick={() => setTemplate(t)}
                title={TEMPLATE_LABELS[t]}
                className={`w-9 h-8 rounded-lg flex items-center justify-center transition-all border ${
                  isActive ? 'border-violet-400 ring-2 ring-violet-500/50' : 'border-white/10 opacity-60 hover:opacity-90'
                }`}
                style={{ background: isActive ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)' }}
              >
                <span
                  className="w-5 h-5 rounded-full block"
                  style={{ background: th.nodeBg, border: `2.5px solid ${th.nodeBorder}` }}
                />
              </button>
            )
          })}
        </div>
      )}

      {/* フォント展開 */}
      {fontOpen && (
        <div className="flex gap-1 rounded-xl p-1.5 backdrop-blur-sm shadow-xl" style={{ background: `${theme.panelBg}dd` }}>
          {FONTS.map((f) => {
            const isActive = fontStyle === f
            return (
              <button
                key={f}
                onClick={() => setFontStyle(f)}
                title={FONT_LABELS[f]}
                className={`w-9 h-8 rounded-lg flex items-center justify-center transition-all border text-base ${
                  isActive ? 'border-violet-400 ring-2 ring-violet-500/50' : 'border-white/10 opacity-60 hover:opacity-90'
                }`}
                style={{
                  background: isActive ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)',
                  fontFamily: FONT_FAMILIES[f],
                  color: theme.nodeText,
                }}
              >
                あ
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
