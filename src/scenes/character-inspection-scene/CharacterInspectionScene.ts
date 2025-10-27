/**
 * CharacterInspectionScene - Detailed character view with mode-based actions
 */

import { Scene } from '../Scene'
import { SceneType } from '../../types/SceneType'
import { SceneTransitionData } from '../../services/SceneNavigationService'
import { SceneInputManager } from '../../ui/managers/InputManager'
import { ButtonState } from '../../types/ButtonState'
import { Character } from '../../types/Character'
import { ButtonRenderer } from '../../ui/renderers/ButtonRenderer'
import { TextRenderer } from '../../ui/renderers/TextRenderer'
import { COLORS, BUTTON_SIZES } from '../../ui/theme'
import { SceneNavigationService } from '../../services/SceneNavigationService'
import { ButtonStateHelpers } from '../../ui/utils/ButtonStateHelpers'
import { LayoutHelpers } from '../../ui/utils/LayoutHelpers'
import { MenuSceneHelpers } from '../../ui/utils/MenuSceneHelpers'
import { CharacterStatus } from '../../types/CharacterStatus'

type CharacterInspectionMode = 'READY' | 'TRANSITIONING'
type ViewMode = 'view' | 'inspect' | 'trade' | 'drop'

export class CharacterInspectionScene implements Scene {
  readonly type = SceneType.CHARACTER_INSPECTION

  private canvas!: HTMLCanvasElement
  private inputManager!: SceneInputManager
  private mode: CharacterInspectionMode = 'READY'
  private mouseX = 0
  private mouseY = 0
  private buttons: ButtonState[] = []

  // Configuration from transition data
  private character: Character | null = null
  private viewMode: ViewMode = 'view'
  private returnTo: SceneType = SceneType.TRAINING_GROUNDS

  async init(canvas: HTMLCanvasElement, _ctx: CanvasRenderingContext2D): Promise<void> {
    this.canvas = canvas
    this.inputManager = new SceneInputManager()
  }

  enter(data?: SceneTransitionData): void {
    // Reset mode
    this.mode = 'READY'

    // Extract configuration from transition data
    if (data?.data) {
      if (data.data.character !== undefined) {
        this.character = data.data.character as Character
      }
      if (data.data.mode !== undefined) {
        this.viewMode = data.data.mode as ViewMode
      }

      // Determine returnTo based on mode if not provided
      if (data.data.returnTo !== undefined) {
        this.returnTo = data.data.returnTo as SceneType
      } else {
        // Set defaults based on mode
        switch (this.viewMode) {
          case 'view':
          case 'inspect':
            this.returnTo = SceneType.CHARACTER_LIST
            break
          case 'trade':
          case 'drop':
            this.returnTo = SceneType.TRAINING_GROUNDS
            break
        }
      }
    }

    // Build mode-specific buttons
    this.buildButtons()

    // Register input handlers
    this.registerInputHandlers()
  }

  private buildButtons(): void {
    this.buttons = []

    // Mode-specific action buttons
    switch (this.viewMode) {
      case 'trade':
        this.buttons.push({
          x: 0,
          y: 0,
          width: BUTTON_SIZES.SMALL.width,
          height: BUTTON_SIZES.SMALL.height,
          text: '(T)RADE',
          key: 't',
          disabled: false,
          hovered: false
        })
        break
      case 'drop':
        this.buttons.push({
          x: 0,
          y: 0,
          width: BUTTON_SIZES.MEDIUM.width,
          height: BUTTON_SIZES.MEDIUM.height,
          text: '(D)ROP FROM PARTY',
          key: 'd',
          disabled: false,
          hovered: false
        })
        break
      // 'view' and 'inspect' modes have no action buttons
    }

    // Always add BACK button
    this.buttons.push({
      x: 0,
      y: 0,
      width: BUTTON_SIZES.SMALL.width,
      height: BUTTON_SIZES.SMALL.height,
      text: '(ESC) BACK',
      key: 'escape',
      disabled: false,
      hovered: false
    })

    // Calculate layout for buttons
    if (this.buttons.length > 0) {
      const layouts = LayoutHelpers.calculateHorizontalButtonLayout({
        canvasWidth: this.canvas.width,
        canvasHeight: this.canvas.height,
        buttonCount: this.buttons.length,
        buttonHeight: BUTTON_SIZES.SMALL.height,
        bottomMargin: 50,
        sideMargin: 20,
        spacing: 20
      })

      ButtonStateHelpers.applyLayout(this.buttons, layouts)
    }
  }

  private registerInputHandlers(): void {
    // Clear previous handlers
    this.inputManager.destroy()
    this.inputManager = new SceneInputManager()

    // Register button keyboard handlers using MenuSceneHelpers
    MenuSceneHelpers.registerButtonHandlers(
      this.inputManager,
      this.buttons,
      (key) => this.handleAction(key)
    )

    // Register mouse handlers using MenuSceneHelpers
    MenuSceneHelpers.registerMouseHandlers(
      this.inputManager,
      this.canvas,
      this.buttons,
      (x, y) => {
        this.mouseX = x
        this.mouseY = y
      },
      (button) => this.handleAction(button.key)
    )
  }

  private async handleAction(key: string): Promise<void> {
    if (this.mode === 'TRANSITIONING') return

    this.mode = 'TRANSITIONING'

    if (key === 'escape') {
      await SceneNavigationService.transitionTo(this.returnTo, { direction: 'fade' })
      return
    }

    if (key === 't' && this.viewMode === 'trade') {
      console.log('[TRADE] Stub: Would open trade interface for', this.character?.name)
      this.mode = 'READY' // Reset mode since we're not transitioning
      return
    }

    if (key === 'd' && this.viewMode === 'drop') {
      console.log('[DROP] Stub: Would drop character from party:', this.character?.name)
      this.mode = 'READY' // Reset mode since we're not transitioning
      return
    }

    this.mode = 'READY'
  }

  private renderCharacterSheet(ctx: CanvasRenderingContext2D): void {
    if (!this.character) return

    const char = this.character
    const x = 50
    let y = 80

    // Name
    TextRenderer.renderText(ctx, {
      text: `NAME: ${char.name.toUpperCase()}`,
      x,
      y,
      color: COLORS.TEXT_PRIMARY,
      fontSize: 20,
      align: 'left'
    })
    y += 40

    // Race, Class, Level
    TextRenderer.renderText(ctx, {
      text: `RACE: ${char.race}    CLASS: ${char.class}    LEVEL: ${char.level}`,
      x,
      y,
      color: COLORS.TEXT_PRIMARY,
      fontSize: 16,
      align: 'left'
    })
    y += 30

    // Status
    const statusColor = char.status === CharacterStatus.GOOD ? COLORS.TEXT_PRIMARY : COLORS.TEXT_SECONDARY
    TextRenderer.renderText(ctx, {
      text: `STATUS: ${char.status}`,
      x,
      y,
      color: statusColor,
      fontSize: 16,
      align: 'left'
    })
    y += 40

    // Attributes header
    TextRenderer.renderText(ctx, {
      text: 'ATTRIBUTES:',
      x,
      y,
      color: COLORS.TEXT_SECONDARY,
      fontSize: 16,
      align: 'left'
    })
    y += 25

    // Stats (two rows)
    TextRenderer.renderText(ctx, {
      text: `  STR: ${char.strength.toString().padStart(2, ' ')}  INT: ${char.intelligence.toString().padStart(2, ' ')}  PIE: ${char.piety.toString().padStart(2, ' ')}`,
      x,
      y,
      color: COLORS.TEXT_PRIMARY,
      fontSize: 14,
      align: 'left'
    })
    y += 20

    TextRenderer.renderText(ctx, {
      text: `  VIT: ${char.vitality.toString().padStart(2, ' ')}  AGI: ${char.agility.toString().padStart(2, ' ')}  LUC: ${char.luck.toString().padStart(2, ' ')}`,
      x,
      y,
      color: COLORS.TEXT_PRIMARY,
      fontSize: 14,
      align: 'left'
    })
    y += 35

    // HP, AC, EXP
    TextRenderer.renderText(ctx, {
      text: `HP: ${char.hp}/${char.maxHp}    AC: ${char.ac}    EXP: ${char.experience}`,
      x,
      y,
      color: COLORS.TEXT_PRIMARY,
      fontSize: 16,
      align: 'left'
    })
    y += 40

    // Equipment header
    TextRenderer.renderText(ctx, {
      text: 'EQUIPMENT:',
      x,
      y,
      color: COLORS.TEXT_SECONDARY,
      fontSize: 16,
      align: 'left'
    })
    y += 25

    // Equipment list
    if (char.inventory.length === 0) {
      TextRenderer.renderText(ctx, {
        text: '  (Empty)',
        x,
        y,
        color: COLORS.TEXT_SECONDARY,
        fontSize: 14,
        align: 'left'
      })
    } else {
      char.inventory.forEach(item => {
        TextRenderer.renderText(ctx, {
          text: `  ${item}`,
          x,
          y,
          color: COLORS.TEXT_PRIMARY,
          fontSize: 14,
          align: 'left'
        })
        y += 20
      })
    }
  }

  update(_deltaTime: number): void {
    // Update hover states based on mouse position
    ButtonStateHelpers.updateHoverState(this.buttons, this.mouseX, this.mouseY)
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Clear screen with background color
    ctx.fillStyle = COLORS.BACKGROUND
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // Draw character sheet
    this.renderCharacterSheet(ctx)

    // Draw action buttons
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
        fontSize: 14
      })
    })
  }

  destroy(): void {
    this.inputManager?.destroy()
  }
}
