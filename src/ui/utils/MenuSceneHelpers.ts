/**
 * MenuSceneHelpers - Common patterns for menu-based scenes
 */

import { SceneInputManager } from '../managers/InputManager'
import { ButtonState } from '../../types/ButtonState'
import { ButtonRenderer } from '../renderers/ButtonRenderer'

export const MenuSceneHelpers = {
  /**
   * Register keyboard handlers for all buttons in a menu
   * Each button's key triggers the onNavigate callback with the button's key
   */
  registerButtonHandlers(
    inputManager: SceneInputManager,
    buttons: ButtonState[],
    onNavigate: (key: string) => void
  ): void {
    buttons.forEach(button => {
      inputManager.onKeyPress(button.key, () => onNavigate(button.key))
    })
  },

  /**
   * Handle mouse click on button array
   * Finds the clicked button and calls onClick with it
   */
  handleButtonClick(
    x: number,
    y: number,
    buttons: ButtonState[],
    onClick: (button: ButtonState) => void
  ): void {
    const clicked = ButtonRenderer.findButtonAtPoint(x, y, buttons)
    if (clicked && !clicked.disabled) {
      onClick(clicked)
    }
  },

  /**
   * Register standard mouse handlers for button menus
   * Handles both hover state updates and click handling
   */
  registerMouseHandlers(
    inputManager: SceneInputManager,
    canvas: HTMLCanvasElement,
    buttons: ButtonState[],
    onMouseMove: (x: number, y: number) => void,
    onClick: (button: ButtonState) => void
  ): void {
    // Mouse move handler
    inputManager.onMouseMove(canvas, (x, y) => onMouseMove(x, y))

    // Mouse click handler
    inputManager.onMouseClick(canvas, (x, y) => {
      this.handleButtonClick(x, y, buttons, onClick)
    })
  }
}
