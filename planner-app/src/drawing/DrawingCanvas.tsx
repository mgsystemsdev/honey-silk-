import { useEffect, useRef } from 'react'
import { loadPageStrokes, savePageStrokes } from './store'
import type { DrawTool, Point, Stroke } from './types'
import './DrawingCanvas.css'

type Props = {
  pageIndex: number
  tool: DrawTool
  color: string
  width: number
  enabled: boolean
}

function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  canvasW: number,
  canvasH: number,
) {
  if (stroke.points.length === 0) return
  ctx.save()
  if (stroke.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.strokeStyle = 'rgba(0,0,0,1)'
    ctx.lineWidth = stroke.width
  } else if (stroke.tool === 'highlighter') {
    ctx.globalCompositeOperation = 'multiply'
    ctx.strokeStyle = stroke.color
    ctx.globalAlpha = 0.35
    ctx.lineWidth = stroke.width
  } else {
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = stroke.color
    ctx.globalAlpha = 1
    ctx.lineWidth = stroke.width
  }
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  stroke.points.forEach((pt, i) => {
    const x = pt.x * canvasW
    const y = pt.y * canvasH
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.stroke()
  ctx.restore()
}

function redrawAll(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  w: number,
  h: number,
) {
  ctx.clearRect(0, 0, w, h)
  for (const stroke of strokes) drawStroke(ctx, stroke, w, h)
}

export function DrawingCanvas({
  pageIndex,
  tool,
  color,
  width,
  enabled,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const strokesRef = useRef<Stroke[]>([])
  const activeRef = useRef<Stroke | null>(null)
  const pointerIdRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const rect = parent.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      const ctx = canvas.getContext('2d')
      if (ctx) redrawAll(ctx, strokesRef.current, canvas.width, canvas.height)
    }

    loadPageStrokes(pageIndex).then((strokes) => {
      if (cancelled) return
      strokesRef.current = strokes
      resize()
    })

    resize()
    const ro = new ResizeObserver(resize)
    if (canvas.parentElement) ro.observe(canvas.parentElement)
    return () => {
      cancelled = true
      ro.disconnect()
    }
  }, [pageIndex])

  const toNorm = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
      p: event.pressure > 0 ? event.pressure : 0.5,
    }
  }

  const paint = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    redrawAll(ctx, strokesRef.current, canvas.width, canvas.height)
    if (activeRef.current) {
      drawStroke(ctx, activeRef.current, canvas.width, canvas.height)
    }
  }

  const persist = () => {
    void savePageStrokes(pageIndex, strokesRef.current)
  }

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!enabled || tool === 'navigate') return
    event.preventDefault()
    event.stopPropagation()
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setPointerCapture(event.pointerId)
    pointerIdRef.current = event.pointerId

    activeRef.current = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tool,
      color,
      width:
        tool === 'highlighter'
          ? width * 3.2
          : tool === 'eraser'
            ? width * 2.4
            : width * (0.6 + (event.pressure || 0.5)),
      points: [toNorm(event)],
    }
    paint()
  }

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current !== event.pointerId || !activeRef.current) return
    event.preventDefault()
    event.stopPropagation()
    activeRef.current.points.push(toNorm(event))
    paint()
  }

  const endStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current !== event.pointerId) return
    pointerIdRef.current = null
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* ignore */
    }
    if (activeRef.current && activeRef.current.points.length > 0) {
      strokesRef.current = [...strokesRef.current, activeRef.current]
      activeRef.current = null
      paint()
      persist()
    } else {
      activeRef.current = null
    }
  }

  return (
    <canvas
      ref={canvasRef}
      className={`drawing-canvas${enabled ? ' active' : ''}`}
      aria-hidden={!enabled}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endStroke}
      onPointerCancel={endStroke}
    />
  )
}
