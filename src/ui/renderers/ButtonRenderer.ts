/**
 * ButtonRenderer - Button rendering with states (normal, hover, disabled)
 */

import { COLORS, ANIMATION, TYPOGRAPHY } from '../theme'
import { ButtonState } from '../../types/ButtonState'

export interface ButtonRenderOptions {
  x: number
  y: number
  width: number
  height: number
  text: string
  state: 'normal' | 'hover' | 'disabled' | 'active'
  showPulse?: boolean
  pulseTime?: number
  fontSize?: number
}

export const ButtonRenderer = {
  renderButton(ctx: CanvasRenderingContext2D, options: ButtonRenderOptions): void {
    const { x, y, width, height, text, state, showPulse = false, pulseTime = 0, fontSize = TYPOGRAPHY.SIZES.BUTTON } = options

    // Draw background
    switch (state) {
      case 'disabled':
        ctx.fillStyle = COLORS.BUTTON_DISABLED_BG
        break
      case 'hover':
      case 'active':
        ctx.fillStyle = COLORS.BUTTON_HOVER_BG
        break
      default:
        ctx.fillStyle = COLORS.BUTTON_NORMAL_BG
    }
    ctx.fillRect(x, y, width, height)

    // Draw border
    ctx.strokeStyle = state === 'disabled' ? COLORS.BUTTON_BORDER_DISABLED : COLORS.BUTTON_BORDER_READY
    ctx.lineWidth = 3
    ctx.strokeRect(x, y, width, height)

    // Draw pulse effect if enabled
    if (showPulse && state === 'normal') {
      const pulseAlpha = ANIMATION.PULSE.BASE_ALPHA +
                         ANIMATION.PULSE.ALPHA_VARIATION * Math.sin(pulseTime / ANIMATION.PULSE.PERIOD)
      const pulseSize = ANIMATION.PULSE.BASE_SIZE +
                        ANIMATION.PULSE.SIZE_VARIATION * Math.sin(pulseTime / ANIMATION.PULSE.PERIOD)

      ctx.strokeStyle = `rgba(255, 255, 255, ${pulseAlpha})`
      ctx.lineWidth = 2
      ctx.strokeRect(x - pulseSize/2, y - pulseSize/2, width + pulseSize, height + pulseSize)
    }

    // Draw text
    ctx.fillStyle = state === 'disabled' ? COLORS.TEXT_DISABLED : COLORS.TEXT_PRIMARY
    ctx.font = `bold ${fontSize}px ${TYPOGRAPHY.FAMILIES.PRIMARY}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, x + width / 2, y + height / 2)
  },

  /**
   * Check if a point (x, y) is inside a button's bounds
   */
  isPointInButton(x: number, y: number, button: ButtonState): boolean {
    return x >= button.x &&
           x <= button.x + button.width &&
           y >= button.y &&
           y <= button.y + button.height
  },

  /**
   * Find the first button that contains the given point
   * Returns undefined if no button is found
   */
  findButtonAtPoint(x: number, y: number, buttons: ButtonState[]): ButtonState | undefined {
    return buttons.find(button => this.isPointInButton(x, y, button))
  }
}
