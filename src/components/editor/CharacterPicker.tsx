'use client'

import { useRef } from 'react'
import { useDiagramStore } from '@/store/diagramStore'
import { THEMES } from '@/lib/themes'
import type { TemplateCharacter } from '@/lib/supabase/types'

export default function CharacterPicker() {
  const characters = useDiagramStore((s) => s.characters)
  const nodes = useDiagramStore((s) => s.nodes)
  const template = useDiagramStore((s) => s.template)
  const addNode = useDiagramStore((s) => s.addNode)
  const theme = THEMES[template]

  const scrollRef = useRef<HTMLDivElement>(null)
  const hasDragged = useRef(false)
  const startX = useRef(0)
  const scrollLeftStart = useRef(0)

  function handleMouseDown(e: React.MouseEvent) {
    if (!scrollRef.current) return
    const el = scrollRef.current
    hasDragged.current = false
    startX.current = e.pageX
    scrollLeftStart.current = el.scrollLeft
    el.style.cursor = 'grabbing'

    const onMove = (ev: MouseEvent) => {
      const dx = ev.pageX - startX.current
      if (Math.abs(dx) > 3) hasDragged.current = true
      el.scrollLeft = scrollLeftStart.current - dx
    }
    const onUp = () => {
      el.style.cursor = 'grab'
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const addedIds = new Set(nodes.map((n) => n.characterId))
  const sorted = [...characters].sort((a, b) => {
    const aAdded = addedIds.has(a.id) ? 1 : 0
    const bAdded = addedIds.has(b.id) ? 1 : 0
    if (aAdded !== bAdded) return aAdded - bAdded
    return a.name.localeCompare(b.name, 'ja')
  })

  if (characters.length === 0) return null

  return (
    <div
      ref={scrollRef}
      className="flex items-start gap-2 overflow-x-auto px-3 py-2 h-full scrollbar-hide select-none md:cursor-grab"
      onMouseDown={handleMouseDown}
    >
      {sorted.map((c: TemplateCharacter) => {
        const added = addedIds.has(c.id)
        return (
          <button
            key={c.id}
            onClick={() => { if (hasDragged.current) return; if (!added) addNode(c) }}
            disabled={added}
            title={c.name}
            className={`flex flex-col items-center gap-1 shrink-0 rounded-xl px-2 py-1.5 transition-colors ${
              added
                ? 'opacity-30 cursor-not-allowed'
                : 'hover:bg-white/10 active:bg-white/15 md:cursor-pointer'
            }`}
          >
            <div
              className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold border"
              style={{
                background: theme.nodeBg,
                borderColor: added ? theme.panelBorder : theme.nodeBorder,
                color: theme.nodeText,
              }}
            >
              {c.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
              ) : (
                c.name.slice(0, 2)
              )}
            </div>
            <span
              className="text-[11px] w-14 text-center leading-tight line-clamp-2"
              style={{ color: theme.nodeText, opacity: added ? 0.5 : 0.8 }}
            >
              {c.name}
            </span>
            {added && (
              <span className="text-[10px] text-white/30">✓</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
