import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ButtonRenderer } from '../../../src/ui/renderers/ButtonRenderer'
import { COLORS, BUTTON_SIZES } from '../../../src/ui/theme'

describe('ButtonRenderer', () => {
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    ctx = canvas.getContext('2d')!
  })

  describe('renderButton', () => {
    it('should render button in normal state', () => {
      const fillTextSpy = vi.spyOn(ctx, 'fillText')

      ButtonRenderer.renderButton(ctx, {
        x: 100,
        y: 100,
        width: BUTTON_SIZES.LARGE.width,
        height: BUTTON_SIZES.LARGE.height,
        text: 'Click Me',
        state: 'normal'
      })

      expect(fillTextSpy).toHaveBeenCalledWith('Click Me', 100 + 250/2, 100 + 60/2)
      expect(ctx.textAlign).toBe('center')
      expect(ctx.textBaseline).toBe('middle')
    })

    it('should use hover background for hover state', () => {
      let fillStyleDuringBackground = ''
      const originalFillRect = ctx.fillRect.bind(ctx)
      ctx.fillRect = vi.fn((x, y, w, h) => {
        fillStyleDuringBackground = ctx.fillStyle
        originalFillRect(x, y, w, h)
      })

      ButtonRenderer.renderButton(ctx, {
        x: 0,
        y: 0,
        width: 200,
        height: 50,
        text: 'Hover',
        state: 'hover'
      })

      expect(fillStyleDuringBackground).toBe(COLORS.BUTTON_HOVER_BG)
    })

    it('should use disabled background for disabled state', () => {
      let fillStyleDuringBackground = ''
      const originalFillRect = ctx.fillRect.bind(ctx)
      ctx.fillRect = vi.fn((x, y, w, h) => {
        fillStyleDuringBackground = ctx.fillStyle
        originalFillRect(x, y, w, h)
      })

      ButtonRenderer.renderButton(ctx, {
        x: 0,
        y: 0,
        width: 200,
        height: 50,
        text: 'Disabled',
        state: 'disabled'
      })

      expect(fillStyleDuringBackground).toBe(COLORS.BUTTON_DISABLED_BG)
    })

    it('should use disabled text color for disabled state', () => {
      const fillTextSpy = vi.spyOn(ctx, 'fillText')

      ButtonRenderer.renderButton(ctx, {
        x: 100,
        y: 100,
        width: 200,
        height: 50,
        text: 'Disabled',
        state: 'disabled'
      })

      expect(fillTextSpy).toHaveBeenCalled()
      expect(ctx.fillStyle).toBe(COLORS.TEXT_DISABLED)
    })
  })
})
