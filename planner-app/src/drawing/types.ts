export type DrawTool = 'navigate' | 'pen' | 'highlighter' | 'eraser'

export type Point = {
  x: number
  y: number
  p?: number
}

export type Stroke = {
  id: string
  tool: 'pen' | 'highlighter' | 'eraser'
  color: string
  width: number
  points: Point[]
}

export type PageDrawing = {
  pageIndex: number
  strokes: Stroke[]
  updatedAt: number
}
