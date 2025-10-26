import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TextRenderer } from '../../../src/ui/renderers/TextRenderer'

describe('TextRenderer', () => {
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    ctx = canvas.getContext('2d')!
  })

  describe('renderText', () => {
    it('should render text with basic options', () => {
      const spy = vi.spyOn(ctx, 'fillText')

      TextRenderer.renderText(ctx, {
        text: 'Hello World',
        x: 400,
        y: 300,
        fontSize: 24,
        color: '#fff',
        align: 'center'
      })

      expect(spy).toHaveBeenCalledWith('Hello World', 400, 300)
      expect(ctx.font).toContain('24px')
      expect(ctx.fillStyle).toBe('#fff')
      expect(ctx.textAlign).toBe('center')
    })

    it('should use default font family when not specified', () => {
      TextRenderer.renderText(ctx, {
        text: 'Test',
        x: 0,
        y: 0,
        fontSize: 16,
        color: '#000',
        align: 'left'
      })

      expect(ctx.font).toContain('monospace')
    })

    it('should apply bold weight when specified', () => {
      TextRenderer.renderText(ctx, {
        text: 'Bold Text',
        x: 0,
        y: 0,
        fontSize: 20,
        color: '#fff',
        align: 'center',
        weight: 'bold'
      })

      expect(ctx.font).toContain('bold')
    })

    it('should set baseline when specified', () => {
      TextRenderer.renderText(ctx, {
        text: 'Test',
        x: 0,
        y: 0,
        fontSize: 16,
        color: '#000',
        align: 'left',
        baseline: 'middle'
      })

      expect(ctx.textBaseline).toBe('middle')
    })
  })
})
