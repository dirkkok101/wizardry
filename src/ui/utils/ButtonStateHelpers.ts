/**
 * ButtonStateHelpers - Utilities for managing button state
 */

import { ButtonState } from '../../types/ButtonState'
import { ButtonRenderer } from '../renderers/ButtonRenderer'

export const ButtonStateHelpers = {
  /**
   * Update hover state for one or more buttons based on mouse position
   * Handles both single button and button arrays
   */
  updateHoverState(
    buttons: ButtonState | ButtonState[],
    mouseX: number,
    mouseY: number
  ): void {
    const btnArray = Array.isArray(buttons) ? buttons : [buttons]

    btnArray.forEach(btn => {
      btn.hovered = ButtonRenderer.isPointInButton(mouseX, mouseY, btn) && !btn.disabled
    })
  },

  /**
   * Apply button layout to button state objects
   * Useful when using LayoutHelpers to calculate positions
   */
  applyLayout(
    buttons: ButtonState[],
    layouts: Array<{ x: number, y: number, width: number, height: number }>
  ): void {
    buttons.forEach((button, index) => {
      if (layouts[index]) {
        button.x = layouts[index].x
        button.y = layouts[index].y
        button.width = layouts[index].width
        button.height = layouts[index].height
      }
    })
  },

  /**
   * Enable/disable a button
   */
  setEnabled(button: ButtonState, enabled: boolean): void {
    button.disabled = !enabled
    if (button.disabled) {
      button.hovered = false
    }
  },

  /**
   * Enable/disable multiple buttons
   */
  setEnabledAll(buttons: ButtonState[], enabled: boolean): void {
    buttons.forEach(btn => this.setEnabled(btn, enabled))
  }
}
