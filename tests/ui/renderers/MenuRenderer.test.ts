import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MenuRenderer, MenuItem } from '../../../src/ui/renderers/MenuRenderer'
import { COLORS, TYPOGRAPHY } from '../../../src/ui/theme'

describe('MenuRenderer', () => {
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    ctx = canvas.getContext('2d')!
  })

  describe('renderMenu', () => {
    it('should render all menu items', () => {
      const fillTextSpy = vi.spyOn(ctx, 'fillText')

      const items: MenuItem[] = [
        { key: 'a', label: '(A) First Option' },
        { key: 'b', label: '(B) Second Option' },
        { key: 'c', label: '(C) Third Option' }
      ]

      MenuRenderer.renderMenu(ctx, {
        x: 400,
        y: 200,
        items,
        itemHeight: 50,
        fontSize: TYPOGRAPHY.SIZES.MENU,
        alignment: 'center',
        showKeys: true
      })

      expect(fillTextSpy).toHaveBeenCalledTimes(3)
      expect(fillTextSpy).toHaveBeenCalledWith('(A) First Option', 400, 200)
      expect(fillTextSpy).toHaveBeenCalledWith('(B) Second Option', 400, 250)
      expect(fillTextSpy).toHaveBeenCalledWith('(C) Third Option', 400, 300)
    })

    it('should use TEXT_DISABLED color for disabled items', () => {
      const items: MenuItem[] = [
        { key: 'a', label: 'Enabled', disabled: false },
        { key: 'b', label: 'Disabled', disabled: true }
      ]

      MenuRenderer.renderMenu(ctx, {
        x: 400,
        y: 200,
        items,
        itemHeight: 50,
        fontSize: 24,
        alignment: 'center',
        showKeys: true
      })

      // Check that fillStyle changes for disabled item
      expect(ctx.fillStyle).toContain('0.4') // TEXT_DISABLED has alpha 0.4
    })

    it('should use TEXT_PRIMARY color for hovered items', () => {
      const items: MenuItem[] = [
        { key: 'a', label: 'Normal' },
        { key: 'b', label: 'Hovered', hovered: true }
      ]

      MenuRenderer.renderMenu(ctx, {
        x: 400,
        y: 200,
        items,
        itemHeight: 50,
        fontSize: 24,
        alignment: 'center',
        showKeys: true
      })

      expect(ctx.fillStyle).toBe(COLORS.TEXT_PRIMARY)
    })

    it('should apply left alignment', () => {
      const items: MenuItem[] = [{ key: 'a', label: 'Left' }]

      MenuRenderer.renderMenu(ctx, {
        x: 100,
        y: 200,
        items,
        itemHeight: 50,
        fontSize: 24,
        alignment: 'left',
        showKeys: true
      })

      expect(ctx.textAlign).toBe('left')
    })

    it('should apply right alignment', () => {
      const items: MenuItem[] = [{ key: 'a', label: 'Right' }]

      MenuRenderer.renderMenu(ctx, {
        x: 700,
        y: 200,
        items,
        itemHeight: 50,
        fontSize: 24,
        alignment: 'right',
        showKeys: true
      })

      expect(ctx.textAlign).toBe('right')
    })
  })
})
