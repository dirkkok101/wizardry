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

type CastleMenuMode = 'READY' | 'TRANSITIONING'

export class CastleMenuScene implements Scene {
  readonly type = SceneType.CASTLE_MENU

  private canvas!: HTMLCanvasElement
  private inputManager!: SceneInputManager
  private mode: CastleMenuMode = 'READY'
  private mouseX = 0
  private mouseY = 0

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
    // Clear screen
    ctx.fillStyle = COLORS.BACKGROUND
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

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

  private async handleNavigation(_key: string): Promise<void> {
    // TODO: Implement navigation commands
  }

  private handleMouseClick(_x: number, _y: number): void {
    // TODO: Implement mouse click handling
  }

  private updateHoverStates(): void {
    // TODO: Implement hover state updates
  }

  destroy(): void {
    this.inputManager?.destroy()
  }
}
