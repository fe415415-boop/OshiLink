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
  const animFrame = useRef<number | null>(null)
  const activeOnMove = useRef<((ev: MouseEvent) => void) | null>(null)
  const activeOnUp = useRef<(() => void) | null>(null)

  function handleMouseDown(e: React.MouseEvent) {
    if (!scrollRef.current) return
    const el = scrollRef.current

    // 前回のドラッグリスナーが残っていれば先に解除
    if (activeOnMove.current) window.removeEventListener('mousemove', activeOnMove.current)
    if (activeOnUp.current) window.removeEventListener('mouseup', activeOnUp.current)
    if (animFrame.current !== null) {
      cancelAnimationFrame(animFrame.current)
      animFrame.current = null
    }

    hasDragged.current = false
    startX.current = e.pageX
    scrollLeftStart.current = el.scrollLeft
    el.style.cursor = 'grabbing'

    let prevX = e.pageX
    let prevTime = Date.now()
    let velocity = 0

    const onMove = (ev: MouseEvent) => {
      const dx = ev.pageX - startX.current
      if (Math.abs(dx) > 3) hasDragged.current = true
      el.scrollLeft = scrollLeftStart.current - dx

      const now = Date.now()
      const dt = now - prevTime
      if (dt >= 16) {
        velocity = Math.max(-3, Math.min(3, (prevX - ev.pageX) / dt))
        prevX = ev.pageX
        prevTime = now
      }
    }

    const onUp = () => {
      activeOnMove.current = null
      activeOnUp.current = null
      el.style.cursor = 'grab'
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)

      if (Math.abs(velocity) > 0.05) {
        let v = velocity * 16
        const step = () => {
          if (Math.abs(v) < 0.5) { animFrame.current = null; return }
          el.scrollLeft += v
          v *= 0.92
          animFrame.current = requestAnimationFrame(step)
        }
        animFrame.current = requestAnimationFrame(step)
      }
    }

    activeOnMove.current = onMove
    activeOnUp.current = onUp
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
