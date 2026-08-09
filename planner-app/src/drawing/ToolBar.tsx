import type { DrawTool } from './types'
import './ToolBar.css'

const COLORS = ['#3b2a22', '#8b3a3a', '#2f5d50', '#3a4f8b', '#c9a227']

type Props = {
  tool: DrawTool
  color: string
  width: number
  onToolChange: (tool: DrawTool) => void
  onColorChange: (color: string) => void
  onWidthChange: (width: number) => void
  onClearPage: () => void
}

export function ToolBar({
  tool,
  color,
  width,
  onToolChange,
  onColorChange,
  onWidthChange,
  onClearPage,
}: Props) {
  return (
    <header className="tool-bar" aria-label="Writing tools">
      <div className="tool-group">
        <button
          type="button"
          className={tool === 'navigate' ? 'active' : ''}
          onClick={() => onToolChange('navigate')}
        >
          Navigate
        </button>
        <button
          type="button"
          className={tool === 'pen' ? 'active' : ''}
          onClick={() => onToolChange('pen')}
        >
          Pen
        </button>
        <button
          type="button"
          className={tool === 'highlighter' ? 'active' : ''}
          onClick={() => onToolChange('highlighter')}
        >
          Highlighter
        </button>
        <button
          type="button"
          className={tool === 'eraser' ? 'active' : ''}
          onClick={() => onToolChange('eraser')}
        >
          Eraser
        </button>
      </div>

      <div className="tool-group colors" aria-label="Ink color">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className={`swatch${color === c ? ' active' : ''}`}
            style={{ background: c }}
            aria-label={`Color ${c}`}
            onClick={() => onColorChange(c)}
            disabled={tool === 'navigate' || tool === 'eraser'}
          />
        ))}
      </div>

      <label className="width-control">
        Size
        <input
          type="range"
          min={2}
          max={18}
          value={width}
          onChange={(e) => onWidthChange(Number(e.target.value))}
          disabled={tool === 'navigate'}
        />
      </label>

      <button
        type="button"
        className="clear-btn"
        onClick={onClearPage}
        disabled={tool === 'navigate'}
      >
        Clear page
      </button>
    </header>
  )
}
