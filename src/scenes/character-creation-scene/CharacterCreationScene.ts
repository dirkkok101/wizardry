/**
 * CharacterCreationScene - Single-screen character creation wizard
 */

import { Scene } from '../Scene'
import { SceneType } from '../../types/SceneType'
import { SceneTransitionData, SceneNavigationService } from '../../services/SceneNavigationService'
import { SceneInputManager } from '../../ui/managers/InputManager'
import { ButtonState } from '../../types/ButtonState'
import { TextRenderer } from '../../ui/renderers/TextRenderer'
import { ButtonRenderer } from '../../ui/renderers/ButtonRenderer'
import { COLORS, BUTTON_SIZES } from '../../ui/theme'
import { GameInitializationService } from '../../services/GameInitializationService'
import { CharacterService } from '../../services/CharacterService'
import { Race } from '../../types/Race'
import { CharacterClass } from '../../types/CharacterClass'
import { Alignment } from '../../types/Alignment'
import { ButtonStateHelpers } from '../../ui/utils/ButtonStateHelpers'
import { LayoutHelpers } from '../../ui/utils/LayoutHelpers'
import { MenuSceneHelpers } from '../../ui/utils/MenuSceneHelpers'

type CharacterCreationMode = 'READY' | 'TRANSITIONING'
type InputMode = 'MENU' | 'NAME_ENTRY'

interface RolledStats {
  strength: number
  intelligence: number
  piety: number
  vitality: number
  agility: number
  luck: number
}

export class CharacterCreationScene implements Scene {
  readonly type = SceneType.CHARACTER_CREATION

  private canvas!: HTMLCanvasElement
  private inputManager!: SceneInputManager
  private mode: CharacterCreationMode = 'READY'
  private inputMode: InputMode = 'MENU'
  private mouseX = 0
  private mouseY = 0
  private buttons: ButtonState[] = []

  // Character creation state
  private rolledStats: RolledStats | null = null
  private selectedName: string = ''
  private selectedRace: Race | null = null
  private selectedClass: CharacterClass | null = null
  private selectedAlignment: Alignment | null = null

  async init(canvas: HTMLCanvasElement, _ctx: CanvasRenderingContext2D): Promise<void> {
    this.canvas = canvas
    this.inputManager = new SceneInputManager()
    this.mode = 'READY'
  }

  enter(_data?: SceneTransitionData): void {
    this.mode = 'READY'
    this.inputMode = 'MENU'

    // Reset selections
    this.selectedName = ''
    this.selectedRace = null
    this.selectedClass = null
    this.selectedAlignment = null

    // Roll initial stats
    this.rollNewStats()

    // Build UI buttons
    this.buildButtons()

    // Register input handlers
    this.registerInputHandlers()
  }

  private rollNewStats(): void {
    // Use CharacterService.createCharacter with temporary values to get fresh rolled stats
    const state = GameInitializationService.getGameState()
    const result = CharacterService.createCharacter(state, {
      name: `temp_${Date.now()}`,
      race: Race.HUMAN,
      class: CharacterClass.FIGHTER,
      alignment: Alignment.NEUTRAL,
      password: ''
    })

    const tempChar = result.character

    this.rolledStats = {
      strength: tempChar.strength,
      intelligence: tempChar.intelligence,
      piety: tempChar.piety,
      vitality: tempChar.vitality,
      agility: tempChar.agility,
      luck: tempChar.luck
    }
  }

  private buildButtons(): void {
    this.buttons = [
      {
        x: 0,
        y: 0,
        width: BUTTON_SIZES.SMALL.width,
        height: BUTTON_SIZES.SMALL.height,
        text: 'REROLL (SPACE)',
        key: ' ',
        disabled: false,
        hovered: false
      },
      {
        x: 0,
        y: 0,
        width: BUTTON_SIZES.SMALL.width,
        height: BUTTON_SIZES.SMALL.height,
        text: 'CREATE (ENTER)',
        key: 'enter',
        disabled: false,
        hovered: false
      },
      {
        x: 0,
        y: 0,
        width: BUTTON_SIZES.SMALL.width,
        height: BUTTON_SIZES.SMALL.height,
        text: 'CANCEL (ESC)',
        key: 'escape',
        disabled: false,
        hovered: false
      }
    ]

    // Calculate horizontal button layout at bottom
    const layouts = LayoutHelpers.calculateHorizontalButtonLayout({
      canvasWidth: this.canvas.width,
      canvasHeight: this.canvas.height,
      buttonCount: this.buttons.length,
      buttonHeight: BUTTON_SIZES.SMALL.height,
      bottomMargin: 40,
      sideMargin: 100,
      spacing: 20
    })

    ButtonStateHelpers.applyLayout(this.buttons, layouts)
  }

  private registerInputHandlers(): void {
    // Clear previous handlers
    this.inputManager.destroy()
    this.inputManager = new SceneInputManager()

    // Register button keyboard handlers
    MenuSceneHelpers.registerButtonHandlers(
      this.inputManager,
      this.buttons,
      (key) => this.handleButtonPress(key)
    )

    // Register SPACE for reroll
    this.inputManager.onKeyPress(' ', () => {
      if (this.mode === 'READY') {
        this.rollNewStats()
      }
    })

    // Register ENTER for create
    this.inputManager.onKeyPress('enter', () => {
      if (this.mode === 'READY') {
        this.handleCreateCharacter()
      }
    })

    // Register ESC for cancel
    this.inputManager.onKeyPress('escape', () => {
      if (this.mode === 'READY') {
        this.handleCancel()
      }
    })

    // Register number keys for race selection (1-5)
    for (let i = 1; i <= 5; i++) {
      this.inputManager.onKeyPress(String(i), () => {
        if (this.mode === 'READY') {
          this.handleRaceSelection(this.getRaceByIndex(i - 1))
        }
      })
    }

    // Register letter keys for class selection (F, M, P, T, B, S, L, N)
    const classKeys = [
      { key: 'f', class: CharacterClass.FIGHTER },
      { key: 'm', class: CharacterClass.MAGE },
      { key: 'p', class: CharacterClass.PRIEST },
      { key: 't', class: CharacterClass.THIEF },
      { key: 'b', class: CharacterClass.BISHOP },
      { key: 's', class: CharacterClass.SAMURAI },
      { key: 'l', class: CharacterClass.LORD },
      { key: 'n', class: CharacterClass.NINJA }
    ]

    classKeys.forEach(({ key, class: characterClass }) => {
      this.inputManager.onKeyPress(key, () => {
        if (this.mode === 'READY' && this.inputMode === 'MENU') {
          this.handleClassSelection(characterClass)
        }
      })
    })

    // Register alignment keys (G, N, E)
    this.inputManager.onKeyPress('g', () => {
      if (this.mode === 'READY' && this.inputMode === 'MENU') {
        this.handleAlignmentSelection(Alignment.GOOD)
      }
    })
    this.inputManager.onKeyPress('n', () => {
      if (this.mode === 'READY' && this.inputMode === 'MENU') {
        this.handleAlignmentSelection(Alignment.NEUTRAL)
      }
    })
    this.inputManager.onKeyPress('e', () => {
      if (this.mode === 'READY' && this.inputMode === 'MENU') {
        this.handleAlignmentSelection(Alignment.EVIL)
      }
    })

    // Register text input for name (alphanumeric and backspace)
    for (let i = 97; i <= 122; i++) {
      const char = String.fromCharCode(i)
      this.inputManager.onKeyPress(char, () => {
        if (this.mode === 'READY' && this.inputMode === 'NAME_ENTRY' && this.selectedName.length < 15) {
          this.handleNameInput(this.selectedName + char.toUpperCase())
        }
      })
    }

    this.inputManager.onKeyPress('backspace', () => {
      if (this.mode === 'READY' && this.inputMode === 'NAME_ENTRY' && this.selectedName.length > 0) {
        this.handleNameInput(this.selectedName.slice(0, -1))
      }
    })

    // Register TAB for toggling input mode
    this.inputManager.onKeyPress('tab', () => {
      if (this.mode === 'READY') {
        this.inputMode = this.inputMode === 'MENU' ? 'NAME_ENTRY' : 'MENU'
      }
    })

    // Register mouse handlers
    MenuSceneHelpers.registerMouseHandlers(
      this.inputManager,
      this.canvas,
      this.buttons,
      (x, y) => {
        this.mouseX = x
        this.mouseY = y
      },
      (button) => this.handleButtonPress(button.key)
    )
  }

  private handleButtonPress(key: string): void {
    switch (key) {
      case ' ':
        this.rollNewStats()
        break
      case 'enter':
        this.handleCreateCharacter()
        break
      case 'escape':
        this.handleCancel()
        break
    }
  }

  private getRaceByIndex(index: number): Race {
    const races = [Race.HUMAN, Race.ELF, Race.DWARF, Race.GNOME, Race.HOBBIT]
    return races[index] || Race.HUMAN
  }

  private handleRaceSelection(race: Race): void {
    this.selectedRace = race
  }

  private handleClassSelection(characterClass: CharacterClass): void {
    // Validate class eligibility if stats are rolled
    if (this.rolledStats && this.selectedAlignment) {
      const eligible = CharacterService.validateClassEligibility(characterClass, {
        ...this.rolledStats,
        alignment: this.selectedAlignment
      })

      if (eligible) {
        this.selectedClass = characterClass
      } else {
        console.log('Character stats do not meet class requirements')
      }
    } else {
      this.selectedClass = characterClass
    }
  }

  private handleAlignmentSelection(alignment: Alignment): void {
    this.selectedAlignment = alignment

    // Revalidate class if already selected
    if (this.selectedClass && this.rolledStats) {
      const eligible = CharacterService.validateClassEligibility(this.selectedClass, {
        ...this.rolledStats,
        alignment
      })

      if (!eligible) {
        this.selectedClass = null
      }
    }
  }

  private handleNameInput(name: string): void {
    this.selectedName = name
  }

  private async handleCreateCharacter(): Promise<void> {
    if (this.mode === 'TRANSITIONING') return

    // Validate all selections are complete
    if (!this.selectedName || this.selectedName.trim() === '') {
      console.log('Must enter a name')
      return
    }

    if (!this.selectedRace) {
      console.log('Must select a race')
      return
    }

    if (!this.selectedClass) {
      console.log('Must select a class')
      return
    }

    if (!this.selectedAlignment) {
      console.log('Must select an alignment')
      return
    }

    if (!this.rolledStats) {
      console.log('No stats available')
      return
    }

    this.mode = 'TRANSITIONING'

    // Create character with selected options and rolled stats
    const state = GameInitializationService.getGameState()

    // Create character using CharacterService but override stats with rolled values
    const result = CharacterService.createCharacter(state, {
      name: this.selectedName.trim(),
      race: this.selectedRace,
      class: this.selectedClass,
      alignment: this.selectedAlignment,
      password: '' // Stub for now
    })

    // Override stats with our rolled values
    const character = {
      ...result.character,
      strength: this.rolledStats.strength,
      intelligence: this.rolledStats.intelligence,
      piety: this.rolledStats.piety,
      vitality: this.rolledStats.vitality,
      agility: this.rolledStats.agility,
      luck: this.rolledStats.luck
    }

    // Add to roster
    const updatedState = {
      ...result.state,
      roster: new Map(result.state.roster).set(character.id, character)
    }

    GameInitializationService.updateGameState(updatedState)

    await SceneNavigationService.transitionTo(SceneType.TRAINING_GROUNDS, { direction: 'fade' })
  }

  private async handleCancel(): Promise<void> {
    if (this.mode === 'TRANSITIONING') return

    this.mode = 'TRANSITIONING'
    await SceneNavigationService.transitionTo(SceneType.TRAINING_GROUNDS, { direction: 'fade' })
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
      text: 'CHARACTER CREATION',
      x: this.canvas.width / 2,
      y: 40,
      fontSize: 28,
      color: COLORS.TEXT_PRIMARY,
      align: 'center',
      baseline: 'middle',
      weight: 'bold'
    })

    // Draw rolled stats (left side)
    if (this.rolledStats) {
      const statsX = 80
      const statsY = 100

      TextRenderer.renderText(ctx, {
        text: 'ROLLED STATS',
        x: statsX,
        y: statsY,
        fontSize: 18,
        color: COLORS.TEXT_PRIMARY,
        align: 'left',
        baseline: 'top',
        weight: 'bold'
      })

      const statsList = [
        `STR: ${this.rolledStats.strength}`,
        `INT: ${this.rolledStats.intelligence}`,
        `PIE: ${this.rolledStats.piety}`,
        `VIT: ${this.rolledStats.vitality}`,
        `AGI: ${this.rolledStats.agility}`,
        `LUC: ${this.rolledStats.luck}`
      ]

      statsList.forEach((stat, index) => {
        TextRenderer.renderText(ctx, {
          text: stat,
          x: statsX,
          y: statsY + 35 + index * 25,
          fontSize: 16,
          color: COLORS.TEXT_SECONDARY,
          align: 'left',
          baseline: 'top'
        })
      })
    }

    // Draw name input (center-left)
    const nameX = 80
    const nameY = 300

    TextRenderer.renderText(ctx, {
      text: 'NAME',
      x: nameX,
      y: nameY,
      fontSize: 16,
      color: COLORS.TEXT_PRIMARY,
      align: 'left',
      baseline: 'top',
      weight: 'bold'
    })

    TextRenderer.renderText(ctx, {
      text: this.selectedName || '_',
      x: nameX,
      y: nameY + 25,
      fontSize: 16,
      color: this.selectedName ? COLORS.TEXT_PRIMARY : COLORS.TEXT_DISABLED,
      align: 'left',
      baseline: 'top'
    })

    // Show input mode indicator
    const modeText = this.inputMode === 'NAME_ENTRY'
      ? '[TYPING - Press TAB to exit]'
      : '[Press TAB to type name]'
    TextRenderer.renderText(ctx, {
      text: modeText,
      x: nameX,
      y: nameY + 50,
      fontSize: 12,
      color: COLORS.TEXT_DISABLED,
      align: 'left',
      baseline: 'top'
    })

    // Draw race selection (right side top)
    const raceX = this.canvas.width - 250
    const raceY = 100

    TextRenderer.renderText(ctx, {
      text: 'RACE (1-5)',
      x: raceX,
      y: raceY,
      fontSize: 16,
      color: COLORS.TEXT_PRIMARY,
      align: 'left',
      baseline: 'top',
      weight: 'bold'
    })

    const races = [
      { index: 1, race: Race.HUMAN },
      { index: 2, race: Race.ELF },
      { index: 3, race: Race.DWARF },
      { index: 4, race: Race.GNOME },
      { index: 5, race: Race.HOBBIT }
    ]

    races.forEach(({ index, race }) => {
      const isSelected = this.selectedRace === race
      TextRenderer.renderText(ctx, {
        text: `${index}. ${race}`,
        x: raceX,
        y: raceY + 25 + (index - 1) * 20,
        fontSize: 14,
        color: isSelected ? COLORS.TEXT_PRIMARY : COLORS.TEXT_SECONDARY,
        align: 'left',
        baseline: 'top',
        weight: isSelected ? 'bold' : 'normal'
      })
    })

    // Draw class selection (right side middle)
    const classX = raceX
    const classY = 250

    TextRenderer.renderText(ctx, {
      text: 'CLASS (F/M/P/T/B/S/L/N)',
      x: classX,
      y: classY,
      fontSize: 16,
      color: COLORS.TEXT_PRIMARY,
      align: 'left',
      baseline: 'top',
      weight: 'bold'
    })

    const classes = [
      { key: 'F', class: CharacterClass.FIGHTER },
      { key: 'M', class: CharacterClass.MAGE },
      { key: 'P', class: CharacterClass.PRIEST },
      { key: 'T', class: CharacterClass.THIEF },
      { key: 'B', class: CharacterClass.BISHOP },
      { key: 'S', class: CharacterClass.SAMURAI },
      { key: 'L', class: CharacterClass.LORD },
      { key: 'N', class: CharacterClass.NINJA }
    ]

    classes.forEach(({ key, class: characterClass }, index) => {
      const isSelected = this.selectedClass === characterClass

      // Check if class is eligible
      let isEligible = true
      if (this.rolledStats && this.selectedAlignment) {
        isEligible = CharacterService.validateClassEligibility(characterClass, {
          ...this.rolledStats,
          alignment: this.selectedAlignment
        })
      }

      TextRenderer.renderText(ctx, {
        text: `${key}. ${characterClass}`,
        x: classX,
        y: classY + 25 + index * 20,
        fontSize: 14,
        color: isSelected ? COLORS.TEXT_PRIMARY : (isEligible ? COLORS.TEXT_SECONDARY : COLORS.TEXT_DISABLED),
        align: 'left',
        baseline: 'top',
        weight: isSelected ? 'bold' : 'normal'
      })
    })

    // Draw alignment selection (bottom center)
    const alignX = nameX
    const alignY = 370

    TextRenderer.renderText(ctx, {
      text: 'ALIGNMENT (G/N/E)',
      x: alignX,
      y: alignY,
      fontSize: 16,
      color: COLORS.TEXT_PRIMARY,
      align: 'left',
      baseline: 'top',
      weight: 'bold'
    })

    const alignments = [
      { key: 'G', alignment: Alignment.GOOD },
      { key: 'N', alignment: Alignment.NEUTRAL },
      { key: 'E', alignment: Alignment.EVIL }
    ]

    alignments.forEach(({ key, alignment }, index) => {
      const isSelected = this.selectedAlignment === alignment
      TextRenderer.renderText(ctx, {
        text: `${key}. ${alignment}`,
        x: alignX + index * 120,
        y: alignY + 25,
        fontSize: 14,
        color: isSelected ? COLORS.TEXT_PRIMARY : COLORS.TEXT_SECONDARY,
        align: 'left',
        baseline: 'top',
        weight: isSelected ? 'bold' : 'normal'
      })
    })

    // Draw buttons at bottom
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
