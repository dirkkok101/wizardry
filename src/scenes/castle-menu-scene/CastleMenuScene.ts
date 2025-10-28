/**
 * CastleMenuScene - Central hub for all town services and dungeon access
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
import { NavigateToTavernCommand } from './commands/NavigateToTavernCommand'
import { NavigateToTempleCommand } from './commands/NavigateToTempleCommand'
import { NavigateToShopCommand } from './commands/NavigateToShopCommand'
import { NavigateToInnCommand } from './commands/NavigateToInnCommand'
import { NavigateToEdgeOfTownCommand } from './commands/NavigateToEdgeOfTownCommand'
import { ButtonStateHelpers } from '../../ui/utils/ButtonStateHelpers'
import { LayoutHelpers } from '../../ui/utils/LayoutHelpers'
import { MenuSceneHelpers } from '../../ui/utils/MenuSceneHelpers'

type CastleMenuMode = 'READY' | 'TRANSITIONING'

export class CastleMenuScene implements Scene {
  readonly type = SceneType.CASTLE_MENU

  private canvas!: HTMLCanvasElement
  private inputManager!: SceneInputManager
  private mode: CastleMenuMode = 'READY'
  private mouseX = 0
  private mouseY = 0
  private backgroundImage: HTMLImageElement | null = null

  private buttons: ButtonState[] = [
    { x: 0, y: 0, width: BUTTON_SIZES.SMALL.width, height: BUTTON_SIZES.SMALL.height, text: '(G)TAVERN', key: 'g', disabled: false, hovered: false },
    { x: 0, y: 0, width: BUTTON_SIZES.SMALL.width, height: BUTTON_SIZES.SMALL.height, text: '(T)EMPLE', key: 't', disabled: false, hovered: false },
    { x: 0, y: 0, width: BUTTON_SIZES.SMALL.width, height: BUTTON_SIZES.SMALL.height, text: '(B)SHOP', key: 'b', disabled: false, hovered: false },
    { x: 0, y: 0, width: BUTTON_SIZES.SMALL.width, height: BUTTON_SIZES.SMALL.height, text: '(A)INN', key: 'a', disabled: false, hovered: false },
    { x: 0, y: 0, width: BUTTON_SIZES.SMALL.width, height: BUTTON_SIZES.SMALL.height, text: '(E)DGE', key: 'e', disabled: false, hovered: false }
  ]

  async init(canvas: HTMLCanvasElement, _ctx: CanvasRenderingContext2D): Promise<void> {
    this.canvas = canvas
    this.inputManager = new SceneInputManager()

    // Calculate responsive button layout using LayoutHelpers
    const layouts = LayoutHelpers.calculateHorizontalButtonLayout({
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      buttonCount: this.buttons.length,
      buttonHeight: BUTTON_SIZES.SMALL.height,
      bottomMargin: 40,
      sideMargin: 20,
      spacing: 20
    })

    // Apply calculated layouts to buttons
    ButtonStateHelpers.applyLayout(this.buttons, layouts)

    // Load background image
    try {
      this.backgroundImage = await AssetLoadingService.loadCastleMenuAssets()
    } catch (error) {
      console.error('Failed to load castle menu background:', error)
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

    // Draw buttons (NO title text)
    this.buttons.forEach(button => {
      const state = button.disabled ? 'disabled' : (button.hovered ? 'hover' : 'normal')

      ButtonRenderer.renderButton(ctx, {
        x: button.x,
        y: button.y,
        width: button.width,
        height: button.height,
        text: button.text,
        state,
        showPulse: false,  // No pulse animation for menu buttons
        fontSize: 16  // Smaller font size for narrower responsive buttons
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
      case 'g': return NavigateToTavernCommand.execute(context)
      case 't': return NavigateToTempleCommand.execute(context)
      case 'b': return NavigateToShopCommand.execute(context)
      case 'a': return NavigateToInnCommand.execute(context)
      case 'e': return NavigateToEdgeOfTownCommand.execute(context)
      default: return { success: false, nextScene: SceneType.CASTLE_MENU, error: 'Unknown key' }
    }
  }


  destroy(): void {
    this.inputManager?.destroy()
  }
}
