/**
 * CampScene - Dungeon entry staging area
 *
 * TODO: Full implementation
 * - Party roster display
 * - Inspect character action
 * - Cast spell action
 * - Leave camp to maze action
 * - Return to Edge of Town action
 */

import { Scene } from '../Scene'
import { SceneType } from '../../types/SceneType'
import { SceneTransitionData, SceneNavigationService } from '../../services/SceneNavigationService'
import { SceneInputManager } from '../../ui/managers/InputManager'
import { ButtonState } from '../../types/ButtonState'
import { ButtonRenderer } from '../../ui/renderers/ButtonRenderer'
import { COLORS, BUTTON_SIZES } from '../../ui/theme'
import { LayoutHelpers } from '../../ui/utils/LayoutHelpers'

type CampMode = 'READY' | 'TRANSITIONING'

export class CampScene implements Scene {
  readonly type = SceneType.CAMP

  private canvas!: HTMLCanvasElement
  private inputManager!: SceneInputManager
  private mode: CampMode = 'READY'

  private buttons: ButtonState[] = [
    { x: 0, y: 0, width: BUTTON_SIZES.LARGE.width, height: BUTTON_SIZES.LARGE.height, text: '(L)EAVE', key: 'l', disabled: false, hovered: false }
  ]

  async init(canvas: HTMLCanvasElement, _ctx: CanvasRenderingContext2D): Promise<void> {
    this.canvas = canvas
    this.inputManager = new SceneInputManager()

    // Center the single button
    const pos = LayoutHelpers.centerRectangle(
      canvas.width,
      canvas.height,
      BUTTON_SIZES.LARGE.width,
      BUTTON_SIZES.LARGE.height + 100 // Offset below title
    )
    this.buttons[0].x = pos.x
    this.buttons[0].y = pos.y + 100

    // Register leave handler
    this.inputManager.onKeyPress('l', () => this.handleLeave())
  }

  enter(_data?: SceneTransitionData): void {
    this.mode = 'READY'
  }

  update(_deltaTime: number): void {
    // TODO: Update hover states when mouse support added
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Clear screen
    ctx.fillStyle = COLORS.BACKGROUND
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // Draw title
    ctx.fillStyle = COLORS.TEXT_PRIMARY
    ctx.font = '32px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('CAMP', this.canvas.width / 2, 100)

    // Draw "Under Construction" message
    ctx.font = '20px monospace'
    ctx.fillStyle = COLORS.TEXT_SECONDARY
    ctx.fillText('(Under Construction)', this.canvas.width / 2, 140)

    // Draw leave button
    ButtonRenderer.renderButton(ctx, {
      x: this.buttons[0].x,
      y: this.buttons[0].y,
      width: this.buttons[0].width,
      height: this.buttons[0].height,
      text: this.buttons[0].text,
      state: 'normal'
    })
  }

  private async handleLeave(): Promise<void> {
    if (this.mode === 'TRANSITIONING') return
    this.mode = 'TRANSITIONING'

    await SceneNavigationService.transitionTo(SceneType.EDGE_OF_TOWN, {
      direction: 'fade'
    })
  }

  destroy(): void {
    this.inputManager?.destroy()
  }
}
