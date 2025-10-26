/**
 * CastleMenuScene - Central hub for all town services and dungeon access
 */

import { Scene } from '../Scene'
import { SceneType } from '../../types/SceneType'
import { SceneTransitionData } from '../../services/SceneNavigationService'
import { SceneInputManager } from '../../ui/managers/InputManager'
import { ButtonState } from '../../types/ButtonState'
import { ButtonRenderer } from '../../ui/renderers/ButtonRenderer'
import { COLORS, BUTTON_SIZES } from '../../ui/theme'
import { AssetLoadingService } from '../../services/AssetLoadingService'
import { NavigateToTavernCommand } from './commands/NavigateToTavernCommand'
import { NavigateToTempleCommand } from './commands/NavigateToTempleCommand'
import { NavigateToShopCommand } from './commands/NavigateToShopCommand'
import { NavigateToInnCommand } from './commands/NavigateToInnCommand'
import { NavigateToEdgeOfTownCommand } from './commands/NavigateToEdgeOfTownCommand'

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

    // Calculate button layout
    const BUTTON_SPACING = 20
    const BUTTON_WIDTH = BUTTON_SIZES.SMALL.width   // 150
    const BUTTON_HEIGHT = BUTTON_SIZES.SMALL.height // 40
    const BOTTOM_MARGIN = 40

    const totalWidth = (BUTTON_WIDTH * 5) + (BUTTON_SPACING * 4)
    const startX = (canvas.width - totalWidth) / 2
    const buttonY = canvas.height - BOTTOM_MARGIN - BUTTON_HEIGHT

    // Position each button
    this.buttons.forEach((button, index) => {
      button.x = startX + (index * (BUTTON_WIDTH + BUTTON_SPACING))
      button.y = buttonY
    })

    // Load background image
    try {
      this.backgroundImage = await AssetLoadingService.loadCastleMenuAssets()
    } catch (error) {
      console.error('Failed to load castle menu background:', error)
    }

    // Register keyboard shortcuts
    this.buttons.forEach(button => {
      this.inputManager.onKeyPress(button.key, () => this.handleNavigation(button.key))
    })

    // Register mouse handlers
    this.inputManager.onMouseMove(canvas, (x, y) => {
      this.mouseX = x
      this.mouseY = y
    })
    this.inputManager.onMouseClick(canvas, (x, y) => this.handleMouseClick(x, y))
  }

  enter(_data?: SceneTransitionData): void {
    this.mode = 'READY'
  }

  update(_deltaTime: number): void {
    // Update hover states based on mouse position
    this.buttons.forEach(button => {
      button.hovered = this.isPointInButton(this.mouseX, this.mouseY, button)
    })
  }

  private isPointInButton(x: number, y: number, button: ButtonState): boolean {
    return x >= button.x &&
           x <= button.x + button.width &&
           y >= button.y &&
           y <= button.y + button.height
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
        showPulse: false  // No pulse animation for menu buttons
      })
    })
  }

  /**
   * Draw the background image with proper aspect ratio scaling
   */
  private drawBackground(ctx: CanvasRenderingContext2D): void {
    if (!this.backgroundImage) return

    // Scale to fit entire image within canvas while maintaining aspect ratio (contain behavior)
    const canvasAspect = this.canvas.width / this.canvas.height
    const imageAspect = this.backgroundImage.width / this.backgroundImage.height

    let width: number
    let height: number
    let x: number
    let y: number

    if (imageAspect > canvasAspect) {
      // Image is wider than canvas - fit to width
      width = this.canvas.width
      height = width / imageAspect
      x = 0
      y = (this.canvas.height - height) / 2
    } else {
      // Image is taller than canvas - fit to height
      height = this.canvas.height
      width = height * imageAspect
      x = (this.canvas.width - width) / 2
      y = 0
    }

    // Use nearest-neighbor scaling for pixel art
    ctx.imageSmoothingEnabled = false

    ctx.drawImage(
      this.backgroundImage,
      x,
      y,
      width,
      height
    )
  }

  private async handleNavigation(key: string): Promise<void> {
    if (this.mode === 'TRANSITIONING') return

    this.mode = 'TRANSITIONING'

    const result = await this.executeNavigationCommand(key)

    if (!result.success) {
      console.error('Navigation failed:', result.error)
      this.mode = 'READY'
    }
  }

  private async executeNavigationCommand(key: string) {
    const context = { mode: this.mode }

    switch (key) {
      case 'g': return NavigateToTavernCommand.execute(context)
      case 't': return NavigateToTempleCommand.execute(context)
      case 'b': return NavigateToShopCommand.execute(context)
      case 'a': return NavigateToInnCommand.execute(context)
      case 'e': return NavigateToEdgeOfTownCommand.execute(context)
      default: return { success: false, nextScene: SceneType.CASTLE_MENU, error: 'Unknown key' }
    }
  }

  private handleMouseClick(x: number, y: number): void {
    const clickedButton = this.buttons.find(btn =>
      this.isPointInButton(x, y, btn) && !btn.disabled
    )

    if (clickedButton) {
      this.handleNavigation(clickedButton.key)
    }
  }

  destroy(): void {
    this.inputManager?.destroy()
  }
}
