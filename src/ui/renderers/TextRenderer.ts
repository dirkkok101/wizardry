/**
 * TextRenderer - Simple text rendering with alignment and styling
 */

export interface TextRenderOptions {
  text: string
  x: number
  y: number
  fontSize: number
  color: string
  align: 'left' | 'center' | 'right'
  baseline?: 'top' | 'middle' | 'bottom' | 'alphabetic'
  font?: string
  weight?: 'normal' | 'bold'
}

export const TextRenderer = {
  renderText(ctx: CanvasRenderingContext2D, options: TextRenderOptions): void {
    const {
      text,
      x,
      y,
      fontSize,
      color,
      align,
      baseline = 'alphabetic',
      font = 'monospace',
      weight = 'normal'
    } = options

    // Set font properties
    ctx.font = `${weight} ${fontSize}px ${font}`
    ctx.fillStyle = color
    ctx.textAlign = align
    ctx.textBaseline = baseline

    // Draw text
    ctx.fillText(text, x, y)
  }
}
