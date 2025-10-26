/**
 * CastleMenuScene - Central hub for all town services and dungeon access
 */

import { Scene } from '../Scene'
import { SceneType } from '../../types/SceneType'
import { SceneTransitionData } from '../../services/SceneNavigationService'
import { SceneInputManager } from '../../ui/managers/InputManager'
import { MenuRenderer, MenuItem } from '../../ui/renderers/MenuRenderer'
import { TextRenderer } from '../../ui/renderers/TextRenderer'
import { COLORS, TYPOGRAPHY } from '../../ui/theme'
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

  private menuItems: MenuItem[] = [
    { key: 'g', label: "(G)ILGAMESH'S TAVERN" },
    { key: 't', label: "(T)EMPLE OF CANT" },
    { key: 'b', label: "(B)OLTAC'S TRADING POST" },
    { key: 'a', label: "(A)DVENTURER'S INN" },
    { key: 'e', label: "(E)DGE OF TOWN" }
  ]

  async init(canvas: HTMLCanvasElement, _ctx: CanvasRenderingContext2D): Promise<void> {
    this.canvas = canvas
    this.inputManager = new SceneInputManager()

    // Load background image
    try {
      this.backgroundImage = await AssetLoadingService.loadCastleMenuAssets()
    } catch (error) {
      console.error('Failed to load castle menu background:', error)
    }

    // Register keyboard shortcuts
    this.menuItems.forEach(item => {
      this.inputManager.onKeyPress(item.key, () => this.handleNavigation(item.key))
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
    this.updateHoverStates()
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Clear screen with background color
    ctx.fillStyle = COLORS.BACKGROUND
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // Draw background image if loaded
    if (this.backgroundImage) {
      this.drawBackground(ctx)
    }

    // Draw title
    TextRenderer.renderText(ctx, {
      text: 'CASTLE',
      x: this.canvas.width / 2,
      y: 80,
      fontSize: TYPOGRAPHY.SIZES.TITLE,
      color: COLORS.TEXT_PRIMARY,
      align: 'center',
      baseline: 'middle'
    })

    // Draw menu
    MenuRenderer.renderMenu(ctx, {
      x: this.canvas.width / 2,
      y: 200,
      items: this.menuItems,
      itemHeight: 50,
      fontSize: TYPOGRAPHY.SIZES.MENU,
      alignment: 'center',
      showKeys: true
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
    const clickedItem = this.getMenuItemAtPosition(x, y)
    if (clickedItem) {
      this.handleNavigation(clickedItem.key)
    }
  }

  private updateHoverStates(): void {
    const hoveredItem = this.getMenuItemAtPosition(this.mouseX, this.mouseY)

    // NOTE: Direct mutation of MenuItem.hovered is acceptable here as MenuItems are
    // UI-local state (not part of GameState). For GameState objects, use immutable updates.
    this.menuItems.forEach(item => {
      item.hovered = item === hoveredItem
    })
  }

  private getMenuItemAtPosition(x: number, y: number): MenuItem | null {
    const menuX = this.canvas.width / 2
    const menuY = 200
    const itemHeight = 50

    for (let i = 0; i < this.menuItems.length; i++) {
      const itemY = menuY + i * itemHeight

      // Check if point is within item bounds (approximate based on text width)
      if (y >= itemY - itemHeight/2 && y <= itemY + itemHeight/2) {
        // Simple horizontal check (could be refined with text measurement)
        if (Math.abs(x - menuX) < 200) {
          return this.menuItems[i]
        }
      }
    }

    return null
  }

  destroy(): void {
    this.inputManager?.destroy()
  }
}
