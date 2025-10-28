/**
 * TrainingGroundsScene - Character creation and management hub
 */

import { Scene } from '../Scene'
import { SceneType } from '../../types/SceneType'
import { SceneTransitionData } from '../../services/SceneNavigationService'
import { SceneInputManager } from '../../ui/managers/InputManager'
import { ButtonState } from '../../types/ButtonState'
import { ButtonRenderer } from '../../ui/renderers/ButtonRenderer'
import { ImageRenderer } from '../../ui/renderers/ImageRenderer'
import { COLORS, BUTTON_SIZES } from '../../ui/theme'
import { AssetLoadingService } from '../../services/AssetLoadingService'
import { NavigateToCharacterCreationCommand } from './commands/NavigateToCharacterCreationCommand'
import { NavigateToCharacterListCommand } from './commands/NavigateToCharacterListCommand'
import { ShowRosterCommand } from './commands/ShowRosterCommand'
import { LeaveTrainingGroundsCommand } from './commands/LeaveTrainingGroundsCommand'
import { ButtonStateHelpers } from '../../ui/utils/ButtonStateHelpers'
import { LayoutHelpers } from '../../ui/utils/LayoutHelpers'
import { MenuSceneHelpers } from '../../ui/utils/MenuSceneHelpers'

type TrainingGroundsMode = 'READY' | 'TRANSITIONING'

export class TrainingGroundsScene implements Scene {
  readonly type = SceneType.TRAINING_GROUNDS

  private canvas!: HTMLCanvasElement
  private inputManager!: SceneInputManager
  private mode: TrainingGroundsMode = 'READY'
  private mouseX = 0
  private mouseY = 0
  private backgroundImage: HTMLImageElement | null = null

  private buttons: ButtonState[] = [
    { x: 0, y: 0, width: BUTTON_SIZES.MEDIUM.width, height: BUTTON_SIZES.MEDIUM.height, text: '(C)REATE CHARACTER', key: 'c', disabled: false, hovered: false },
    { x: 0, y: 0, width: BUTTON_SIZES.MEDIUM.width, height: BUTTON_SIZES.MEDIUM.height, text: '(I)NSPECT CHARACTER', key: 'i', disabled: false, hovered: false },
    { x: 0, y: 0, width: BUTTON_SIZES.MEDIUM.width, height: BUTTON_SIZES.MEDIUM.height, text: '(R)OSTER', key: 'r', disabled: false, hovered: false },
    { x: 0, y: 0, width: BUTTON_SIZES.MEDIUM.width, height: BUTTON_SIZES.MEDIUM.height, text: '(L)EAVE', key: 'l', disabled: false, hovered: false }
  ]

  async init(canvas: HTMLCanvasElement, _ctx: CanvasRenderingContext2D): Promise<void> {
    this.canvas = canvas
    this.inputManager = new SceneInputManager()

    // Calculate vertical button layout (centered column)
    const layouts = LayoutHelpers.calculateVerticalButtonLayout({
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      buttonCount: this.buttons.length,
      buttonWidth: BUTTON_SIZES.MEDIUM.width,
      topMargin: 200,
      spacing: 20
    })

    // Apply calculated layouts to buttons
    ButtonStateHelpers.applyLayout(this.buttons, layouts)

    // Load background image
    try {
      this.backgroundImage = await AssetLoadingService.loadTrainingGroundsAssets()
    } catch (error) {
      console.error('Failed to load training grounds background:', error)
    }

    // Register button keyboard handlers using MenuSceneHelpers
    MenuSceneHelpers.registerButtonHandlers(
      this.inputManager,
      this.buttons,
      (key) => this.handleNavigation(key)
    )

    // Register mouse handlers using MenuSceneHelpers
    MenuSceneHelpers.registerMouseHandlers(
      this.inputManager,
      canvas,
      this.buttons,
      (x, y) => {
        this.mouseX = x
        this.mouseY = y
      },
      (button) => this.handleNavigation(button.key)
    )
  }

  enter(_data?: SceneTransitionData): void {
    this.mode = 'READY'
  }

  update(_deltaTime: number): void {
    // Update hover states based on mouse position
    ButtonStateHelpers.updateHoverState(this.buttons, this.mouseX, this.mouseY)
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Clear screen with background color
    ctx.fillStyle = COLORS.BACKGROUND
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // Draw background image if loaded
    if (this.backgroundImage) {
      this.drawBackground(ctx)
    }

    // Draw buttons
    this.buttons.forEach(button => {
      const state = button.disabled ? 'disabled' : (button.hovered ? 'hover' : 'normal')

      ButtonRenderer.renderButton(ctx, {
        x: button.x,
        y: button.y,
        width: button.width,
        height: button.height,
        text: button.text,
        state,
        showPulse: false,
        fontSize: 18
      })
    })
  }

  /**
   * Draw the background image with proper aspect ratio scaling
   */
  private drawBackground(ctx: CanvasRenderingContext2D): void {
    if (!this.backgroundImage) return

    ImageRenderer.renderBackgroundImage(ctx, {
      image: this.backgroundImage,
      canvasWidth: this.canvas.width,
      canvasHeight: this.canvas.height,
      fit: 'contain',
      pixelArt: true
    })
  }

  private async handleNavigation(key: string): Promise<void> {
    if (this.mode === 'TRANSITIONING') return

    // Create context with current mode (READY) BEFORE changing to TRANSITIONING
    const context = { mode: this.mode }
    this.mode = 'TRANSITIONING'

    const result = await this.executeNavigationCommand(key, context)

    if (!result.success) {
      console.error('Navigation failed:', result.error)
      this.mode = 'READY'
    }
  }

  private async executeNavigationCommand(key: string, context: { mode: 'READY' | 'TRANSITIONING' }) {
    switch (key) {
      case 'c': return NavigateToCharacterCreationCommand.execute(context)
      case 'i': return NavigateToCharacterListCommand.execute(context)
      case 'r': return ShowRosterCommand.execute(context)
      case 'l': return LeaveTrainingGroundsCommand.execute(context)
      default: return { success: false, nextScene: SceneType.TRAINING_GROUNDS, error: 'Unknown key' }
    }
  }

  destroy(): void {
    this.inputManager?.destroy()
  }
}
