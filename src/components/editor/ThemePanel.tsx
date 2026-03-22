'use client'

import { useState } from 'react'
import { useDiagramStore, Theme, FontStyle } from '@/store/diagramStore'
import { THEME_LABELS, FONT_LABELS, FONT_FAMILIES, THEMES } from '@/lib/themes'
import EditorIconButton from './EditorIconButton'

const THEME_KEYS: Theme[] = ['dark', 'pink', 'simple', 'night', 'sunset', 'mint']
const FONTS: FontStyle[] = ['cool', 'pop', 'emo', 'elegant']

export default function ThemePanel() {
  const selectedTheme = useDiagramStore((s) => s.theme)
  const fontStyle = useDiagramStore((s) => s.fontStyle)
  const drawMode = useDiagramStore((s) => s.drawMode)
  const setTheme = useDiagramStore((s) => s.setTheme)
  const setFontStyle = useDiagramStore((s) => s.setFontStyle)
  const setDrawMode = useDiagramStore((s) => s.setDrawMode)
  const theme = THEMES[selectedTheme]

  const [themeOpen, setThemeOpen] = useState(false)
  const [fontOpen, setFontOpen] = useState(false)

  return (
    <div className="flex items-start gap-1">
      {/* 囲む */}
      <EditorIconButton
        onClick={() => { setDrawMode(!drawMode); setThemeOpen(false); setFontOpen(false) }}
        title={drawMode ? '図形描画中（ESCでキャンセル）' : '図形を追加'}
        active={drawMode}
        icon={<svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="1" width="16" height="12" rx="2" /></svg>}
        label="囲む"
        style={{ color: drawMode ? undefined : theme.nodeText, backgroundColor: theme.inputBg, borderColor: theme.panelBorder }}
      />

      {/* テーマ列 */}
      <div className="flex flex-col gap-1">
        <EditorIconButton
          onClick={() => { setThemeOpen((v) => !v); setFontOpen(false) }}
          open={themeOpen}
          icon={<span className="w-5 h-5 rounded-full block" style={{ background: theme.nodeBg, border: `2.5px solid ${theme.nodeBorder}` }} />}
          label="テーマ"
          style={{ color: theme.nodeText, backgroundColor: theme.inputBg, borderColor: theme.panelBorder }}
        />
        <div className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${themeOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="overflow-hidden">
            <div className="flex flex-col gap-1">
              {THEME_KEYS.map((t) => {
                const th = THEMES[t]
                const isActive = selectedTheme === t
                return (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    title={THEME_LABELS[t]}
                    className={`w-14 py-1.5 rounded-lg flex flex-col items-center gap-0.5 transition-all border ${
                      isActive ? 'border-violet-400 ring-2 ring-violet-500/50' : 'border-white/10 opacity-60 hover:opacity-90'
                    }`}
                    style={{ background: isActive ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)' }}
                  >
                    <span className="flex items-center justify-center h-5">
                      <span className="w-5 h-5 rounded-full block" style={{ background: th.nodeBg, border: `2.5px solid ${th.nodeBorder}` }} />
                    </span>
                    <span className="text-[10px]">{THEME_LABELS[t]}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* フォント列 */}
      <div className="flex flex-col gap-1">
        <EditorIconButton
          onClick={() => { setFontOpen((v) => !v); setThemeOpen(false) }}
          open={fontOpen}
          icon={<span className="text-base leading-none" style={{ fontFamily: FONT_FAMILIES[fontStyle] }}>あ</span>}
          label="フォント"
          style={{ color: theme.nodeText, backgroundColor: theme.inputBg, borderColor: theme.panelBorder }}
        />
        <div className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${fontOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="overflow-hidden">
            <div className="flex flex-col gap-1">
              {FONTS.map((f) => {
                const isActive = fontStyle === f
                return (
                  <button
                    key={f}
                    onClick={() => setFontStyle(f)}
                    title={FONT_LABELS[f]}
                    className={`w-14 py-1.5 rounded-lg flex flex-col items-center gap-0.5 transition-all border ${
                      isActive ? 'border-violet-400 ring-2 ring-violet-500/50' : 'border-white/10 opacity-60 hover:opacity-90'
                    }`}
                    style={{
                      background: isActive ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)',
                      fontFamily: FONT_FAMILIES[f],
                      color: theme.nodeText,
                    }}
                  >
                    <span className="flex items-center justify-center h-5 text-base">あ</span>
                    <span className="text-[10px]">{FONT_LABELS[f]}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
