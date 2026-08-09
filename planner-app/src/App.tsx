import { useCallback, useEffect, useRef, useState } from 'react'
import { DrawingCanvas } from './drawing/DrawingCanvas'
import { ToolBar } from './drawing/ToolBar'
import { savePageStrokes } from './drawing/store'
import type { DrawTool } from './drawing/types'
import type { PlannerManifest } from './types'
import './App.css'

const PREFETCH_RADIUS = 2
const HIT_PAD = 0.01
const SWIPE_THRESHOLD_PX = 72
const SWIPE_LOCK_PX = 10
const SLIDE_MS = 380
const SNAP_MS = 180
type SlideDir = 'left' | 'right'

function App() {
  const [manifest, setManifest] = useState<PlannerManifest | null>(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [motion, setMotion] = useState<'none' | 'slide' | 'snap'>('none')
  const [anim, setAnim] = useState<{ dir: SlideDir; to: number } | null>(null)
  const [tool, setTool] = useState<DrawTool>('navigate')
  const [inkColor, setInkColor] = useState('#3b2a22')
  const [inkWidth, setInkWidth] = useState(4)
  const [drawKey, setDrawKey] = useState(0)

  const pointerIdRef = useRef<number | null>(null)
  const startXRef = useRef(0)
  const startYRef = useRef(0)
  const dragXRef = useRef(0)
  const swipingRef = useRef(false)
  const suppressClicksUntilRef = useRef(0)
  const pageIndexRef = useRef(0)
  const animatingRef = useRef(false)
  const frameWidthRef = useRef(1)
  const toolRef = useRef<DrawTool>('navigate')

  const clicksSuppressed = () =>
    animatingRef.current || Date.now() < suppressClicksUntilRef.current

  useEffect(() => {
    pageIndexRef.current = pageIndex
  }, [pageIndex])

  useEffect(() => {
    toolRef.current = tool
  }, [tool])

  useEffect(() => {
    let cancelled = false
    fetch('/planner.json')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load planner.json (${res.status})`)
        return res.json() as Promise<PlannerManifest>
      })
      .then((data) => {
        if (!cancelled) setManifest(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load planner')
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const goTo = useCallback(
    (index: number, direction?: SlideDir) => {
      if (!manifest || animatingRef.current) return
      const next = Math.max(0, Math.min(manifest.pageCount - 1, index))
      if (next === pageIndexRef.current) return

      if (!direction) {
        setPageIndex(next)
        setAnim(null)
        setDragX(0)
        setMotion('none')
        return
      }

      animatingRef.current = true
      setDragX(0)
      setMotion('slide')
      setAnim({ dir: direction, to: next })
      window.setTimeout(() => {
        setPageIndex(next)
        setAnim(null)
        setMotion('none')
        animatingRef.current = false
        suppressClicksUntilRef.current = Date.now() + 80
      }, SLIDE_MS)
    },
    [manifest],
  )

  useEffect(() => {
    if (!manifest) return
    for (let offset = -PREFETCH_RADIUS; offset <= PREFETCH_RADIUS; offset += 1) {
      const idx = pageIndex + offset
      if (idx < 0 || idx >= manifest.pageCount) continue
      const img = new Image()
      img.src = manifest.pages[idx].image
    }
  }, [manifest, pageIndex])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (toolRef.current !== 'navigate') return
      if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault()
        goTo(pageIndexRef.current + 1, 'left')
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault()
        goTo(pageIndexRef.current - 1, 'right')
      } else if (event.key === 'Home') {
        event.preventDefault()
        goTo(0)
      } else if (event.key === 'End' && manifest) {
        event.preventDefault()
        goTo(manifest.pageCount - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goTo, manifest])

  const clampDrag = (dx: number) => {
    const atStart = pageIndexRef.current === 0
    const atEnd = !!manifest && pageIndexRef.current >= manifest.pageCount - 1
    if (dx > 0 && atStart) return 0
    if (dx < 0 && atEnd) return 0
    const max = (frameWidthRef.current || 1) * 0.95
    return Math.max(-max, Math.min(max, dx))
  }

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (toolRef.current !== 'navigate') return
    if (event.button !== 0 || animatingRef.current) return
    const target = event.target as HTMLElement
    if (target.closest('.book-nav') || target.closest('.hotspot') || target.closest('.tool-bar')) {
      return
    }

    frameWidthRef.current = event.currentTarget.clientWidth || 1
    pointerIdRef.current = event.pointerId
    startXRef.current = event.clientX
    startYRef.current = event.clientY
    dragXRef.current = 0
    swipingRef.current = false
    setMotion('none')
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (toolRef.current !== 'navigate') return
    if (pointerIdRef.current !== event.pointerId) return

    const dx = event.clientX - startXRef.current
    const dy = event.clientY - startYRef.current

    if (!swipingRef.current) {
      if (Math.abs(dx) < SWIPE_LOCK_PX) return
      if (Math.abs(dx) < Math.abs(dy)) {
        pointerIdRef.current = null
        setIsDragging(false)
        setDragX(0)
        return
      }
      swipingRef.current = true
    }

    const next = clampDrag(dx)
    dragXRef.current = next
    setDragX(next)
  }

  const endPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (toolRef.current !== 'navigate') return
    if (pointerIdRef.current !== event.pointerId) return
    pointerIdRef.current = null
    setIsDragging(false)

    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* already released */
    }

    const dx = dragXRef.current
    const didSwipe = swipingRef.current
    dragXRef.current = 0
    swipingRef.current = false

    if (didSwipe) {
      suppressClicksUntilRef.current = Date.now() + 350
    }

    if (!didSwipe || Math.abs(dx) < SWIPE_THRESHOLD_PX) {
      if (dx !== 0) {
        setMotion('snap')
        setDragX(0)
        window.setTimeout(() => setMotion('none'), SNAP_MS)
      } else {
        setDragX(0)
        setMotion('none')
      }
      return
    }

    setDragX(0)
    if (dx < 0) goTo(pageIndexRef.current + 1, 'left')
    else goTo(pageIndexRef.current - 1, 'right')
  }

  const clearPage = async () => {
    await savePageStrokes(pageIndex, [])
    setDrawKey((k) => k + 1)
  }

  if (error) {
    return (
      <div className="shell">
        <p className="status error">{error}</p>
      </div>
    )
  }

  if (!manifest) {
    return (
      <div className="shell">
        <p className="status">Loading planner…</p>
      </div>
    )
  }

  const page = manifest.pages[pageIndex]
  const aspect = manifest.pageWidth / manifest.pageHeight
  const atStart = pageIndex === 0
  const atEnd = pageIndex >= manifest.pageCount - 1
  const drawing = tool !== 'navigate'

  const peekIndex =
    anim?.to ??
    (dragX < -8
      ? Math.min(manifest.pageCount - 1, pageIndex + 1)
      : dragX > 8
        ? Math.max(0, pageIndex - 1)
        : null)

  const peekPage =
    peekIndex !== null && peekIndex !== pageIndex
      ? manifest.pages[peekIndex]
      : null

  const outgoingX = anim
    ? anim.dir === 'left'
      ? '-100%'
      : '100%'
    : `${dragX}px`

  return (
    <div className={`shell${drawing ? ' drawing-mode' : ''}`}>
      <ToolBar
        tool={tool}
        color={inkColor}
        width={inkWidth}
        onToolChange={setTool}
        onColorChange={setInkColor}
        onWidthChange={setInkWidth}
        onClearPage={() => {
          void clearPage()
        }}
      />

      {/* Even floral fill: same page art, cover + soft blur (book stays sharp on top) */}
      <div
        className="floral-layer"
        style={{ backgroundImage: `url(${page.image})` }}
        aria-hidden
      />

      <main className="stage">
        <div
          className={`page-frame${isDragging ? ' dragging' : ''}`}
          style={{
            width: `min(100vw, calc((100svh - 3.4rem) * ${aspect}))`,
            height: `min(calc(100svh - 3.4rem), calc(100vw / ${aspect}))`,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
        >
          {peekPage && (
            <img
              className="page-image page-under"
              src={peekPage.image}
              alt=""
              draggable={false}
            />
          )}

          <div
            className={`page-front motion-${motion}`}
            style={{ transform: `translate3d(${outgoingX}, 0, 0)` }}
          >
            <img
              className="page-image"
              src={page.image}
              alt={`Planner page ${pageIndex + 1} of ${manifest.pageCount}`}
              draggable={false}
            />

            <DrawingCanvas
              key={`${pageIndex}-${drawKey}`}
              pageIndex={pageIndex}
              tool={tool}
              color={inkColor}
              width={inkWidth}
              enabled={drawing}
            />

            {!drawing &&
              page.links.map((link, idx) => (
                <button
                  key={`${pageIndex}-${idx}-${link.toPage}`}
                  type="button"
                  className="hotspot"
                  style={{
                    left: `${(link.x - HIT_PAD) * 100}%`,
                    top: `${(link.y - HIT_PAD * 0.5) * 100}%`,
                    width: `${(link.w + HIT_PAD * 2) * 100}%`,
                    height: `${(link.h + HIT_PAD) * 100}%`,
                  }}
                  aria-label={`Go to page ${link.toPage + 1}`}
                  onPointerDown={(event) => {
                    event.stopPropagation()
                  }}
                  onClick={(event) => {
                    if (clicksSuppressed()) {
                      event.preventDefault()
                      event.stopPropagation()
                      return
                    }
                    goTo(link.toPage)
                  }}
                />
              ))}
          </div>

          <nav className="book-nav" aria-label="Page navigation">
            <button
              type="button"
              className="book-nav-btn"
              onClick={() => goTo(0)}
              disabled={atStart || !!anim}
            >
              First
            </button>
            <button
              type="button"
              className="book-nav-btn"
              onClick={() => goTo(pageIndex - 1, 'right')}
              disabled={atStart || !!anim}
            >
              Prev
            </button>
            <span className="page-pill" aria-live="polite">
              {pageIndex + 1} / {manifest.pageCount}
            </span>
            <button
              type="button"
              className="book-nav-btn"
              onClick={() => goTo(pageIndex + 1, 'left')}
              disabled={atEnd || !!anim}
            >
              Next
            </button>
            <button
              type="button"
              className="book-nav-btn"
              onClick={() => goTo(manifest.pageCount - 1)}
              disabled={atEnd || !!anim}
            >
              Last
            </button>
          </nav>
        </div>
      </main>
    </div>
  )
}

export default App
