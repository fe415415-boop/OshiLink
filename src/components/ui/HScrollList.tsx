'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

interface Props {
  className?: string
  children: React.ReactNode
}

export default function HScrollList({ className = '', children }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const hasDragged = useRef(false)
  const startX = useRef(0)
  const scrollLeftStart = useRef(0)
  const animFrame = useRef<number | null>(null)
  const [showLeft, setShowLeft] = useState(false)
  const [showRight, setShowRight] = useState(false)

  const updateIndicators = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setShowLeft(el.scrollLeft > 1)
    setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateIndicators()
    el.addEventListener('scroll', updateIndicators, { passive: true })
    const ro = new ResizeObserver(updateIndicators)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', updateIndicators)
      ro.disconnect()
    }
  }, [updateIndicators])

  function handleMouseDown(e: React.MouseEvent) {
    if (!scrollRef.current) return
    const el = scrollRef.current

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
      el.style.cursor = ''
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

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div className="relative">
      {showLeft && (
        <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center pointer-events-none">
          <span className="text-white/40 text-2xl font-light leading-none pl-0.5 drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]">‹</span>
        </div>
      )}
      {showRight && (
        <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center pointer-events-none">
          <span className="text-white/40 text-2xl font-light leading-none pr-0.5 drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]">›</span>
        </div>
      )}
      <div
        ref={scrollRef}
        className={`flex overflow-x-auto scrollbar-hide select-none md:cursor-grab ${className}`}
        onMouseDown={handleMouseDown}
        onClickCapture={(e) => { if (hasDragged.current) { e.stopPropagation(); e.preventDefault() } }}
      >
        {children}
      </div>
    </div>
  )
}
