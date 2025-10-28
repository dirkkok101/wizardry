/**
 * EdgeOfTownScene - Gateway between Castle and Training Grounds/Dungeon
 */

import { Scene } from '../Scene'
import { SceneType } from '../../types/SceneType'
import { SceneTransitionData } from '../../services/SceneNavigationService'
import { SceneInputManager } from '../../ui/managers/InputManager'
import { ButtonState } from '../../types/ButtonState'
import { Character } from '../../types/Character'
import { CharacterStatus } from '../../types/CharacterStatus'
import { ButtonRenderer } from '../../ui/renderers/ButtonRenderer'
import { PartyRosterRenderer } from '../../ui/renderers/PartyRosterRenderer'
import { COLORS, BUTTON_SIZES } from '../../ui/theme'
import { EnterTrainingGroundsCommand } from './commands/EnterTrainingGroundsCommand'
import { EnterMazeCommand } from './commands/EnterMazeCommand'
import { ReturnToCastleCommand } from './commands/ReturnToCastleCommand'
import { ButtonStateHelpers } from '../../ui/utils/ButtonStateHelpers'
import { LayoutHelpers } from '../../ui/utils/LayoutHelpers'
import { MenuSceneHelpers } from '../../ui/utils/MenuSceneHelpers'
import { GameInitializationService } from '../../services/GameInitializationService'

type EdgeOfTownMode = 'READY' | 'TRANSITIONING'

export class EdgeOfTownScene implements Scene {
  readonly type = SceneType.EDGE_OF_TOWN

  private canvas!: HTMLCanvasElement
  private inputManager!: SceneInputManager
  private mode: EdgeOfTownMode = 'READY'
  private mouseX = 0
  private mouseY = 0

  private buttons: ButtonState[] = [
    { x: 0, y: 0, width: BUTTON_SIZES.MEDIUM.width, height: BUTTON_SIZES.MEDIUM.height, text: '(T)RAINING GROUNDS', key: 't', disabled: false, hovered: false },
    { x: 0, y: 0, width: BUTTON_SIZES.MEDIUM.width, height: BUTTON_SIZES.MEDIUM.height, text: '(M)AZE', key: 'm', disabled: false, hovered: false },
    { x: 0, y: 0, width: BUTTON_SIZES.MEDIUM.width, height: BUTTON_SIZES.MEDIUM.height, text: '(C)ASTLE', key: 'c', disabled: false, hovered: false }
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

    // Register button keyboard handlers
    MenuSceneHelpers.registerButtonHandlers(
      this.inputManager,
      this.buttons,
      (key) => this.handleNavigation(key)
    )

    // Register mouse handlers
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
    this.updateButtonStates()
  }

  update(_deltaTime: number): void {
    // Update hover states based on mouse position
    ButtonStateHelpers.updateHoverState(this.buttons, this.mouseX, this.mouseY)

    // Update button disabled states based on game state
    this.updateButtonStates()
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Clear screen with background color
    ctx.fillStyle = COLORS.BACKGROUND
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // Draw title
    ctx.fillStyle = COLORS.TEXT_PRIMARY
    ctx.font = '32px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('EDGE OF TOWN', this.canvas.width / 2, 100)

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

    // Draw party roster in bottom section
    const gameState = GameInitializationService.getGameState()
    if (gameState?.party) {
      // Resolve party member IDs to Character objects
      const partyMembers = gameState.party.members
        .map(id => gameState.roster.get(id))
        .filter((c): c is Character => c !== undefined)

      PartyRosterRenderer.render(ctx, {
        characters: partyMembers,
        x: 50,
        y: 450,
        maxWidth: this.canvas.width - 100
      })
    }
  }

  private updateButtonStates(): void {
    const gameState = GameInitializationService.getGameState()

    // Training and Castle always enabled
    ButtonStateHelpers.setEnabled(this.buttons[0], true) // Training
    ButtonStateHelpers.setEnabled(this.buttons[2], true) // Castle

    // Maze button: disabled if no party or party has dead members
    if (!gameState?.party || gameState.party.members.length === 0) {
      ButtonStateHelpers.setEnabled(this.buttons[1], false)
    } else {
      // Resolve party member IDs to Character objects
      const partyMembers = gameState.party.members
        .map(id => gameState.roster.get(id))
        .filter((c): c is Character => c !== undefined)

      const hasDeadMembers = partyMembers.some(m =>
        m.status === CharacterStatus.DEAD ||
        m.status === CharacterStatus.ASHES ||
        m.status === CharacterStatus.LOST_FOREVER
      )
      ButtonStateHelpers.setEnabled(this.buttons[1], !hasDeadMembers)
    }
  }

  private async handleNavigation(key: string): Promise<void> {
    if (this.mode === 'TRANSITIONING') return

    // Create context with current mode (READY) BEFORE changing to TRANSITIONING
    const gameState = GameInitializationService.getGameState()
    const context = {
      mode: this.mode,
      gameState
    }
    this.mode = 'TRANSITIONING'

    const result = await this.executeNavigationCommand(key, context)

    if (!result.success) {
      console.error('Navigation failed:', result.error)
      this.mode = 'READY'
    }
  }

  private async executeNavigationCommand(key: string, context: { mode: 'READY' | 'TRANSITIONING', gameState: any }) {
    switch (key) {
      case 't': return EnterTrainingGroundsCommand.execute(context)
      case 'm': return EnterMazeCommand.execute(context)
      case 'c': return ReturnToCastleCommand.execute(context)
      default: return { success: false, nextScene: SceneType.EDGE_OF_TOWN, error: 'Unknown key' }
    }
  }

  destroy(): void {
    this.inputManager?.destroy()
  }
}
