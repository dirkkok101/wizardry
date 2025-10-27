/**
 * CharacterListScene - Reusable character list with filter and callback
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
import { GameInitializationService } from '../../services/GameInitializationService'
import { CharacterService } from '../../services/CharacterService'
import { ButtonStateHelpers } from '../../ui/utils/ButtonStateHelpers'
import { LayoutHelpers } from '../../ui/utils/LayoutHelpers'
import { MenuSceneHelpers } from '../../ui/utils/MenuSceneHelpers'

type CharacterListMode = 'READY' | 'TRANSITIONING'

export class CharacterListScene implements Scene {
  readonly type = SceneType.CHARACTER_LIST

  private canvas!: HTMLCanvasElement
  private inputManager!: SceneInputManager
  private mode: CharacterListMode = 'READY'
  private mouseX = 0
  private mouseY = 0
  private buttons: ButtonState[] = []

  // Configuration from transition data
  private title: string = 'CHARACTER LIST'
  private emptyMessage: string = 'No characters available'
  private filter?: (char: Character) => boolean
  private onSelect?: (char: Character) => void
  private returnTo: SceneType = SceneType.TRAINING_GROUNDS

  // Character data
  private characters: Character[] = []

  async init(canvas: HTMLCanvasElement, _ctx: CanvasRenderingContext2D): Promise<void> {
    this.canvas = canvas
    this.inputManager = new SceneInputManager()
  }

  enter(data?: SceneTransitionData): void {
    // Reset mode
    this.mode = 'READY'

    // Extract configuration from transition data
    if (data?.data) {
      if (data.data.title !== undefined) {
        this.title = data.data.title as string
      }
      if (data.data.emptyMessage !== undefined) {
        this.emptyMessage = data.data.emptyMessage as string
      }
      if (data.data.filter !== undefined) {
        this.filter = data.data.filter as (char: Character) => boolean
      }
      if (data.data.onSelect !== undefined) {
        this.onSelect = data.data.onSelect as (char: Character) => void
      }
      if (data.data.returnTo !== undefined) {
        this.returnTo = data.data.returnTo as SceneType
      }
    }

    // Load filtered characters from GameStateManager
    const state = GameInitializationService.getGameState()
    const allCharacters = CharacterService.getAllCharacters(state)
    this.characters = this.filter ? allCharacters.filter(this.filter) : allCharacters

    // Build button list from characters
    this.buildButtons()

    // Register input handlers
    this.registerInputHandlers()
  }

  private buildButtons(): void {
    this.buttons = this.characters.map((char, index) => {
      const text = `${index + 1}. ${char.name.toUpperCase()} (Level ${char.level} ${char.class})`
      return {
        x: 0,
        y: 0,
        width: BUTTON_SIZES.MEDIUM.width,
        height: BUTTON_SIZES.MEDIUM.height,
        text,
        key: String(index + 1),
        disabled: false,
        hovered: false
      }
    })

    // Calculate and apply layout
    if (this.buttons.length > 0) {
      const layouts = LayoutHelpers.calculateVerticalButtonLayout({
        canvasWidth: this.canvas.width,
        canvasHeight: this.canvas.height,
        buttonCount: this.buttons.length,
        buttonWidth: BUTTON_SIZES.MEDIUM.width,
        topMargin: 120,
        spacing: 15
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
      (key) => this.handleSelection(key)
    )

    // Register ESC handler
    this.inputManager.onKeyPress('escape', () => this.handleSelection('escape'))

    // Register mouse handlers using MenuSceneHelpers
    MenuSceneHelpers.registerMouseHandlers(
      this.inputManager,
      this.canvas,
      this.buttons,
      (x, y) => {
        this.mouseX = x
        this.mouseY = y
      },
      (button) => this.handleSelection(button.key)
    )
  }

  private async handleSelection(key: string): Promise<void> {
    if (this.mode === 'TRANSITIONING') return

    if (key === 'escape') {
      // Return to previous scene
      this.mode = 'TRANSITIONING'
      await SceneNavigationService.transitionTo(this.returnTo, { direction: 'fade' })
      return
    }

    // Handle number key selection
    const index = parseInt(key) - 1
    if (index >= 0 && index < this.characters.length) {
      const character = this.characters[index]
      this.mode = 'TRANSITIONING'
      if (this.onSelect) {
        this.onSelect(character)
      }
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

    // Draw title
    TextRenderer.renderText(ctx, {
      text: this.title,
      x: this.canvas.width / 2,
      y: 60,
      fontSize: 32,
      color: COLORS.TEXT_PRIMARY,
      align: 'center',
      baseline: 'middle',
      weight: 'bold'
    })

    if (this.characters.length === 0) {
      // Draw empty message
      TextRenderer.renderText(ctx, {
        text: this.emptyMessage,
        x: this.canvas.width / 2,
        y: this.canvas.height / 2,
        fontSize: 20,
        color: COLORS.TEXT_SECONDARY,
        align: 'center',
        baseline: 'middle'
      })
    } else {
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
          fontSize: 16
        })
      })
    }

    // Draw instructions at bottom
    TextRenderer.renderText(ctx, {
      text: 'ESC: Back',
      x: this.canvas.width / 2,
      y: this.canvas.height - 30,
      fontSize: 14,
      color: COLORS.TEXT_SECONDARY,
      align: 'center',
      baseline: 'middle'
    })
  }

  destroy(): void {
    this.inputManager?.destroy()
  }
}
