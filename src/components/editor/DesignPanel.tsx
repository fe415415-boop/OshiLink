'use client'

import { useState } from 'react'
import { useDiagramStore, Template, FontStyle } from '@/store/diagramStore'
import { TEMPLATE_LABELS, FONT_LABELS, FONT_FAMILIES, THEMES } from '@/lib/themes'
import type { Core } from 'cytoscape'

const TEMPLATES: Template[] = ['stylish', 'pink', 'simple', 'night', 'sunset', 'mint']
const FONTS: FontStyle[] = ['cool', 'pop', 'emo', 'elegant']

interface Props {
  cyRef: React.RefObject<Core | null>
}

export default function DesignPanel({ cyRef }: Props) {
  const template = useDiagramStore((s) => s.template)
  const fontStyle = useDiagramStore((s) => s.fontStyle)
  const nodes = useDiagramStore((s) => s.nodes)
  const drawMode = useDiagramStore((s) => s.drawMode)
  const setTemplate = useDiagramStore((s) => s.setTemplate)
  const setFontStyle = useDiagramStore((s) => s.setFontStyle)
  const setDrawMode = useDiagramStore((s) => s.setDrawMode)
  const theme = THEMES[template]

  const [designOpen, setDesignOpen] = useState(false)
  const [fontOpen, setFontOpen] = useState(false)

  function handleAutoLayout() {
    const c = cyRef.current
    if (!c || c.destroyed()) return
    const boxNodes = c.nodes('[nodeType="box"]')
    boxNodes.lock()
    try {
      const layout = c.layout({
        name: 'fcose',
        animate: true,
        animationDuration: 400,
        randomize: false,
        nodeRepulsion: 6000,
        idealEdgeLength: 150,
        nodeDimensionsIncludeLabels: true,
        fit: false,
      } as Parameters<Core['layout']>[0])
      layout.one('layoutstop', () => {
        boxNodes.unlock()
        c.fit(undefined, 40)
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
  }

  const btnBase = 'h-8 px-2.5 rounded-lg text-xs font-bold transition-all border flex items-center justify-center whitespace-nowrap'

  return (
    <div
      className="rounded-xl border backdrop-blur-sm p-1.5 flex flex-col gap-1 shadow-xl"
      style={{ background: `${theme.panelBg}dd`, borderColor: theme.panelBorder }}
    >
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

        {/* 整列 */}
        <button
          onClick={handleAutoLayout}
          disabled={nodes.length === 0}
          title="自動整列"
          className={`${btnBase} bg-white/5 border-white/10 opacity-60 hover:opacity-90 disabled:opacity-20`}
          style={{ color: theme.nodeText }}
        >
          整列
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
        <div className="flex gap-1 flex-wrap">
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
        <div className="flex gap-1">
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
