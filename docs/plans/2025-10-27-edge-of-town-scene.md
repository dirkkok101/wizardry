# Edge of Town Scene Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement Edge of Town as the gateway scene between Castle Menu and Training Grounds/Dungeon, with party validation and a reusable party roster display component.

**Architecture:** Edge of Town follows the established scene pattern (vertical button layout like TrainingGrounds) with three navigation commands. A new PartyRosterRenderer utility provides reusable party display across multiple scenes. EnterMazeCommand validates party health before dungeon entry. CampScene is a minimal placeholder for future dungeon implementation.

**Tech Stack:** TypeScript, HTML5 Canvas, Vitest (testing), existing scene infrastructure (ButtonRenderer, LayoutHelpers, MenuSceneHelpers)

---

## Task 1: Add SceneType Enum Values

**Files:**
- Modify: `src/types/SceneType.ts:10-16`

**Step 1: Add EDGE_OF_TOWN to SceneType enum**

Add after line 10 (after TRAINING_GROUNDS):

```typescript
  EDGE_OF_TOWN = 'EDGE_OF_TOWN',
```

**Step 2: Verify CAMP already exists**

Check line 16 - CAMP should already be defined in the enum. If not present, add it to the "Dungeon Scenes" section.

**Step 3: Commit**

```bash
git add src/types/SceneType.ts
git commit -m "feat: add EDGE_OF_TOWN scene type"
```

---

## Task 2: Create PartyRosterRenderer Utility

**Files:**
- Create: `src/ui/renderers/PartyRosterRenderer.ts`
- Create: `tests/ui/renderers/PartyRosterRenderer.test.ts`

**Step 1: Write the failing test for empty party**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { PartyRosterRenderer } from '../../../src/ui/renderers/PartyRosterRenderer'
import { createEmptyParty } from '../../helpers/test-factories'

describe('PartyRosterRenderer', () => {
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    ctx = canvas.getContext('2d')!
  })

  describe('render', () => {
    it('should render empty party message', () => {
      const party = createEmptyParty()

      // Should not throw
      expect(() => {
        PartyRosterRenderer.render(ctx, {
          party,
          x: 50,
          y: 400,
          maxWidth: 700
        })
      }).not.toThrow()

      // Visual verification would require checking canvas pixels
      // For now, just verify it doesn't crash
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- PartyRosterRenderer`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal PartyRosterRenderer implementation**

```typescript
import { Party } from '../../types/Party'
import { COLORS } from '../theme'
import { CharacterStatus } from '../../types/CharacterStatus'

export interface PartyRosterRenderOptions {
  party: Party
  x: number
  y: number
  maxWidth: number
  showTitle?: boolean
  fontSize?: number
  lineHeight?: number
  highlightIndex?: number
}

export class PartyRosterRenderer {
  static render(
    ctx: CanvasRenderingContext2D,
    options: PartyRosterRenderOptions
  ): void {
    const {
      party,
      x,
      y,
      maxWidth,
      showTitle = true,
      fontSize = 16,
      lineHeight = 20,
      highlightIndex = -1
    } = options

    let currentY = y

    // Render title
    if (showTitle) {
      ctx.fillStyle = COLORS.TEXT
      ctx.font = `${fontSize}px monospace`
      ctx.textAlign = 'left'
      ctx.fillText('CURRENT PARTY:', x, currentY)
      currentY += lineHeight + 5
    }

    // Render empty party message
    if (party.members.length === 0) {
      ctx.fillStyle = COLORS.TEXT_DIM
      ctx.font = `${fontSize}px monospace`
      ctx.fillText('No party formed', x, currentY)
      return
    }

    // Render each party member
    party.members.forEach((member, index) => {
      const isHighlighted = index === highlightIndex

      // Format member line
      const line = `${index + 1}. ${member.name.padEnd(12)} ${member.class.padEnd(8)} Lvl ${member.level}  ${member.status}`

      // Determine color based on status
      const color = this.getStatusColor(member.status, isHighlighted)

      ctx.fillStyle = color
      ctx.font = `${fontSize}px monospace`
      ctx.fillText(line, x, currentY)

      currentY += lineHeight
    })
  }

  private static getStatusColor(status: CharacterStatus, highlighted: boolean): string {
    if (highlighted) {
      return COLORS.HIGHLIGHT
    }

    switch (status) {
      case CharacterStatus.OK:
        return COLORS.TEXT
      case CharacterStatus.WOUNDED:
        return '#FFFF00' // Yellow
      case CharacterStatus.POISONED:
        return '#00FF00' // Green
      case CharacterStatus.PARALYZED:
        return '#808080' // Gray
      case CharacterStatus.DEAD:
        return '#FF0000' // Red
      case CharacterStatus.ASHES:
        return '#8B0000' // Dark red
      case CharacterStatus.LOST:
        return '#8B0000' // Dark red
      default:
        return COLORS.TEXT
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- PartyRosterRenderer`
Expected: PASS

**Step 5: Add test for party with members**

```typescript
it('should render party with members', () => {
  const party = createFullParty()

  expect(() => {
    PartyRosterRenderer.render(ctx, {
      party,
      x: 50,
      y: 400,
      maxWidth: 700
    })
  }).not.toThrow()
})

it('should render without title when showTitle=false', () => {
  const party = createEmptyParty()

  expect(() => {
    PartyRosterRenderer.render(ctx, {
      party,
      x: 50,
      y: 400,
      maxWidth: 700,
      showTitle: false
    })
  }).not.toThrow()
})
```

**Step 6: Run tests to verify they pass**

Run: `npm test -- PartyRosterRenderer`
Expected: All tests PASS

**Step 7: Commit**

```bash
git add src/ui/renderers/PartyRosterRenderer.ts tests/ui/renderers/PartyRosterRenderer.test.ts
git commit -m "feat: add PartyRosterRenderer for reusable party display"
```

---

## Task 3: Create EnterTrainingGroundsCommand

**Files:**
- Create: `src/scenes/edge-of-town-scene/commands/EnterTrainingGroundsCommand.ts`

**Step 1: Create command file**

```typescript
/**
 * EnterTrainingGroundsCommand - Navigate from Edge of Town to Training Grounds
 */

import { SceneType } from '../../../types/SceneType'
import { SceneNavigationService } from '../../../services/SceneNavigationService'

export interface EnterTrainingGroundsContext {
  mode: 'READY' | 'TRANSITIONING'
}

export interface NavigateCommandResult {
  success: boolean
  nextScene: SceneType
  error?: string
}

async function execute(context: EnterTrainingGroundsContext): Promise<NavigateCommandResult> {
  // Validate not already transitioning
  if (context.mode === 'TRANSITIONING') {
    return {
      success: false,
      nextScene: SceneType.EDGE_OF_TOWN,
      error: 'Transition already in progress'
    }
  }

  try {
    await SceneNavigationService.transitionTo(SceneType.TRAINING_GROUNDS, {
      direction: 'fade'
    })

    return { success: true, nextScene: SceneType.TRAINING_GROUNDS }
  } catch (error) {
    return {
      success: false,
      nextScene: SceneType.EDGE_OF_TOWN,
      error: error instanceof Error ? error.message : 'Navigation failed'
    }
  }
}

export const EnterTrainingGroundsCommand = { execute }
```

**Step 2: Commit**

```bash
git add src/scenes/edge-of-town-scene/commands/EnterTrainingGroundsCommand.ts
git commit -m "feat: add EnterTrainingGroundsCommand"
```

---

## Task 4: Create ReturnToCastleCommand

**Files:**
- Create: `src/scenes/edge-of-town-scene/commands/ReturnToCastleCommand.ts`

**Step 1: Create command file**

```typescript
/**
 * ReturnToCastleCommand - Navigate from Edge of Town to Castle Menu
 */

import { SceneType } from '../../../types/SceneType'
import { SceneNavigationService } from '../../../services/SceneNavigationService'

export interface ReturnToCastleContext {
  mode: 'READY' | 'TRANSITIONING'
}

export interface NavigateCommandResult {
  success: boolean
  nextScene: SceneType
  error?: string
}

async function execute(context: ReturnToCastleContext): Promise<NavigateCommandResult> {
  // Validate not already transitioning
  if (context.mode === 'TRANSITIONING') {
    return {
      success: false,
      nextScene: SceneType.EDGE_OF_TOWN,
      error: 'Transition already in progress'
    }
  }

  try {
    await SceneNavigationService.transitionTo(SceneType.CASTLE_MENU, {
      direction: 'fade'
    })

    return { success: true, nextScene: SceneType.CASTLE_MENU }
  } catch (error) {
    return {
      success: false,
      nextScene: SceneType.EDGE_OF_TOWN,
      error: error instanceof Error ? error.message : 'Navigation failed'
    }
  }
}

export const ReturnToCastleCommand = { execute }
```

**Step 2: Commit**

```bash
git add src/scenes/edge-of-town-scene/commands/ReturnToCastleCommand.ts
git commit -m "feat: add ReturnToCastleCommand"
```

---

## Task 5: Create EnterMazeCommand with Validation

**Files:**
- Create: `src/scenes/edge-of-town-scene/commands/EnterMazeCommand.ts`
- Create: `tests/scenes/edge-of-town-scene/commands/EnterMazeCommand.test.ts`

**Step 1: Write failing test for party validation**

```typescript
import { describe, it, expect } from 'vitest'
import { EnterMazeCommand } from '../../../../src/scenes/edge-of-town-scene/commands/EnterMazeCommand'
import { createEmptyParty, createTestCharacter, createFullParty } from '../../../helpers/test-factories'
import { CharacterStatus } from '../../../../src/types/CharacterStatus'
import { SceneType } from '../../../../src/types/SceneType'

describe('EnterMazeCommand', () => {
  describe('validation', () => {
    it('should fail with empty party', async () => {
      const context = {
        mode: 'READY' as const,
        party: createEmptyParty()
      }

      const result = await EnterMazeCommand.execute(context)

      expect(result.success).toBe(false)
      expect(result.error).toContain('need a party')
    })

    it('should fail with dead party member', async () => {
      const party = createFullParty()
      party.members[0].status = CharacterStatus.DEAD

      const context = {
        mode: 'READY' as const,
        party
      }

      const result = await EnterMazeCommand.execute(context)

      expect(result.success).toBe(false)
      expect(result.error).toContain('dead')
    })

    it('should fail when already transitioning', async () => {
      const context = {
        mode: 'TRANSITIONING' as const,
        party: createFullParty()
      }

      const result = await EnterMazeCommand.execute(context)

      expect(result.success).toBe(false)
      expect(result.error).toContain('in progress')
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- EnterMazeCommand`
Expected: FAIL with "Cannot find module"

**Step 3: Write EnterMazeCommand implementation**

```typescript
/**
 * EnterMazeCommand - Navigate from Edge of Town to Camp (dungeon entry)
 * Validates party exists and has no dead members
 */

import { SceneType } from '../../../types/SceneType'
import { SceneNavigationService } from '../../../services/SceneNavigationService'
import { Party } from '../../../types/Party'
import { CharacterStatus } from '../../../types/CharacterStatus'

export interface EnterMazeContext {
  mode: 'READY' | 'TRANSITIONING'
  party: Party
}

export interface NavigateCommandResult {
  success: boolean
  nextScene: SceneType
  error?: string
}

async function execute(context: EnterMazeContext): Promise<NavigateCommandResult> {
  // 1. Validate not already transitioning
  if (context.mode === 'TRANSITIONING') {
    return {
      success: false,
      nextScene: SceneType.EDGE_OF_TOWN,
      error: 'Transition already in progress'
    }
  }

  // 2. Validate party exists
  if (context.party.members.length === 0) {
    return {
      success: false,
      nextScene: SceneType.EDGE_OF_TOWN,
      error: 'You need a party to enter the maze (visit Tavern)'
    }
  }

  // 3. Validate party health (no DEAD/ASHES/LOST members)
  const hasDeadMembers = context.party.members.some(m =>
    m.status === CharacterStatus.DEAD ||
    m.status === CharacterStatus.ASHES ||
    m.status === CharacterStatus.LOST
  )

  if (hasDeadMembers) {
    return {
      success: false,
      nextScene: SceneType.EDGE_OF_TOWN,
      error: 'Some party members are dead (visit Temple)'
    }
  }

  // 4. Navigate to Camp
  try {
    await SceneNavigationService.transitionTo(SceneType.CAMP, {
      direction: 'fade'
    })

    return { success: true, nextScene: SceneType.CAMP }
  } catch (error) {
    return {
      success: false,
      nextScene: SceneType.EDGE_OF_TOWN,
      error: error instanceof Error ? error.message : 'Navigation failed'
    }
  }
}

export const EnterMazeCommand = { execute }
```

**Step 4: Run test to verify it passes**

Run: `npm test -- EnterMazeCommand`
Expected: PASS

**Step 5: Add success test case**

Add to test file:

```typescript
it('should succeed with healthy party', async () => {
  const context = {
    mode: 'READY' as const,
    party: createFullParty() // All members OK by default
  }

  const result = await EnterMazeCommand.execute(context)

  expect(result.success).toBe(true)
  expect(result.nextScene).toBe(SceneType.CAMP)
})
```

**Step 6: Run tests to verify all pass**

Run: `npm test -- EnterMazeCommand`
Expected: All tests PASS

**Step 7: Commit**

```bash
git add src/scenes/edge-of-town-scene/commands/EnterMazeCommand.ts tests/scenes/edge-of-town-scene/commands/EnterMazeCommand.test.ts
git commit -m "feat: add EnterMazeCommand with party validation"
```

---

## Task 6: Create EdgeOfTownScene

**Files:**
- Create: `src/scenes/edge-of-town-scene/EdgeOfTownScene.ts`
- Create: `tests/scenes/edge-of-town-scene/EdgeOfTownScene.test.ts`

**Step 1: Write failing test for scene initialization**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { EdgeOfTownScene } from '../../../src/scenes/edge-of-town-scene/EdgeOfTownScene'
import { SceneType } from '../../../src/types/SceneType'

describe('EdgeOfTownScene', () => {
  let scene: EdgeOfTownScene
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    ctx = canvas.getContext('2d')!
    scene = new EdgeOfTownScene()
  })

  afterEach(() => {
    scene.destroy?.()
  })

  describe('initialization', () => {
    it('should have correct scene type', () => {
      expect(scene.type).toBe(SceneType.EDGE_OF_TOWN)
    })

    it('should initialize canvas and input manager', async () => {
      await scene.init(canvas, ctx)
      expect(scene['canvas']).toBe(canvas)
      expect(scene['inputManager']).toBeDefined()
    })

    it('should have 3 buttons', async () => {
      await scene.init(canvas, ctx)
      expect(scene['buttons'].length).toBe(3)
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- EdgeOfTownScene`
Expected: FAIL with "Cannot find module"

**Step 3: Write EdgeOfTownScene implementation**

```typescript
/**
 * EdgeOfTownScene - Gateway between Castle and Training Grounds/Dungeon
 */

import { Scene } from '../Scene'
import { SceneType } from '../../types/SceneType'
import { SceneTransitionData } from '../../services/SceneNavigationService'
import { SceneInputManager } from '../../ui/managers/InputManager'
import { ButtonState } from '../../types/ButtonState'
import { ButtonRenderer } from '../../ui/renderers/ButtonRenderer'
import { PartyRosterRenderer } from '../../ui/renderers/PartyRosterRenderer'
import { COLORS, BUTTON_SIZES } from '../../ui/theme'
import { EnterTrainingGroundsCommand } from './commands/EnterTrainingGroundsCommand'
import { EnterMazeCommand } from './commands/EnterMazeCommand'
import { ReturnToCastleCommand } from './commands/ReturnToCastleCommand'
import { ButtonStateHelpers } from '../../ui/utils/ButtonStateHelpers'
import { LayoutHelpers } from '../../ui/utils/LayoutHelpers'
import { MenuSceneHelpers } from '../../ui/utils/MenuSceneHelpers'
import { GameStateManager } from '../../services/GameStateManager'

type EdgeOfTownMode = 'READY' | 'TRANSITIONING'

export class EdgeOfTownScene implements Scene {
  readonly type = SceneType.EDGE_OF_TOWN

  private canvas!: HTMLCanvasElement
  private inputManager!: SceneInputManager
  private mode: EdgeOfTownMode = 'READY'
  private mouseX = 0
  private mouseY = 0
  private backgroundImage: HTMLImageElement | null = null

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
    ctx.fillStyle = COLORS.TEXT
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
    const gameState = GameStateManager.getState()
    if (gameState?.party) {
      PartyRosterRenderer.render(ctx, {
        party: gameState.party,
        x: 50,
        y: 450,
        maxWidth: this.canvas.width - 100
      })
    }
  }

  private updateButtonStates(): void {
    const gameState = GameStateManager.getState()

    // Training and Castle always enabled
    ButtonStateHelpers.setEnabled(this.buttons[0], true) // Training
    ButtonStateHelpers.setEnabled(this.buttons[2], true) // Castle

    // Maze button: disabled if no party or party has dead members
    if (!gameState?.party || gameState.party.members.length === 0) {
      ButtonStateHelpers.setEnabled(this.buttons[1], false)
    } else {
      const hasDeadMembers = gameState.party.members.some(m =>
        m.status === 'DEAD' || m.status === 'ASHES' || m.status === 'LOST'
      )
      ButtonStateHelpers.setEnabled(this.buttons[1], !hasDeadMembers)
    }
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
    const gameState = GameStateManager.getState()
    const context = {
      mode: this.mode,
      party: gameState?.party
    }

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
```

**Step 4: Run test to verify it passes**

Run: `npm test -- EdgeOfTownScene`
Expected: PASS

**Step 5: Commit**

```bash
git add src/scenes/edge-of-town-scene/EdgeOfTownScene.ts tests/scenes/edge-of-town-scene/EdgeOfTownScene.test.ts
git commit -m "feat: add EdgeOfTownScene with party validation"
```

---

## Task 7: Create CampScene Placeholder

**Files:**
- Create: `src/scenes/camp-scene/CampScene.ts`

**Step 1: Create placeholder scene**

```typescript
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
import { SceneTransitionData } from '../../services/SceneNavigationService'
import { SceneInputManager } from '../../ui/managers/InputManager'
import { ButtonState } from '../../types/ButtonState'
import { ButtonRenderer } from '../../ui/renderers/ButtonRenderer'
import { COLORS, BUTTON_SIZES } from '../../ui/theme'
import { LayoutHelpers } from '../../ui/utils/LayoutHelpers'
import { SceneNavigationService } from '../../services/SceneNavigationService'

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
    ctx.fillStyle = COLORS.TEXT
    ctx.font = '32px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('CAMP', this.canvas.width / 2, 100)

    // Draw "Under Construction" message
    ctx.font = '20px monospace'
    ctx.fillStyle = COLORS.TEXT_DIM
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
```

**Step 2: Commit**

```bash
git add src/scenes/camp-scene/CampScene.ts
git commit -m "feat: add CampScene placeholder"
```

---

## Task 8: Register Scenes in SceneManager

**Files:**
- Modify: `src/managers/SceneManager.ts`

**Step 1: Add imports**

Add after existing scene imports:

```typescript
import { EdgeOfTownScene } from '../scenes/edge-of-town-scene/EdgeOfTownScene'
import { CampScene } from '../scenes/camp-scene/CampScene'
```

**Step 2: Register scenes in sceneRegistry**

Add to the sceneRegistry Map:

```typescript
[SceneType.EDGE_OF_TOWN, new EdgeOfTownScene()],
[SceneType.CAMP, new CampScene()],
```

**Step 3: Commit**

```bash
git add src/managers/SceneManager.ts
git commit -m "feat: register EdgeOfTown and Camp scenes in SceneManager"
```

---

## Task 9: Update Castle Menu Navigation Command

**Files:**
- Modify: `src/scenes/castle-menu-scene/commands/NavigateToEdgeOfTownCommand.ts`

**Step 1: Verify command exists and navigates correctly**

Check that the file exists and transitions to `SceneType.EDGE_OF_TOWN`. The existing command should already work, but verify it follows the pattern:

```typescript
await SceneNavigationService.transitionTo(SceneType.EDGE_OF_TOWN, {
  fadeTime: 300,
  data: { fromCastle: true }
})
```

**Step 2: If command needs updates, commit changes**

```bash
git add src/scenes/castle-menu-scene/commands/NavigateToEdgeOfTownCommand.ts
git commit -m "fix: ensure NavigateToEdgeOfTownCommand uses correct scene type"
```

---

## Task 10: Run Full Test Suite

**Step 1: Run all tests**

Run: `npm test -- --run`
Expected: All tests PASS, runtime < 2.5s

**Step 2: If tests fail, fix issues**

Common issues:
- Missing imports
- Type errors with GameStateManager
- Scene registration order

Fix any failures and rerun tests.

**Step 3: Run tests with coverage (optional)**

Run: `npm test -- --coverage`
Check coverage for new files.

---

## Task 11: Manual Navigation Testing

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Test navigation flow**

1. Start game → Castle Menu
2. Press E → Edge of Town
3. Verify 3 buttons displayed
4. Verify party roster shown (or "No party formed")
5. Press T → Training Grounds
6. Press L → Edge of Town
7. Press C → Castle Menu
8. Press E → Edge of Town
9. Press M (should fail with "need a party" message)

**Step 3: Test Maze validation**

1. Form a party at Tavern (if implemented)
2. Navigate to Edge of Town
3. Press M → Camp
4. Verify Camp placeholder loads
5. Press L → Edge of Town

**Step 4: Document any issues**

If navigation fails, check browser console for errors.

---

## Task 12: Final Commit and Cleanup

**Step 1: Run final test suite**

Run: `npm test -- --run`
Expected: All PASS

**Step 2: Check git status**

Run: `git status`
Verify all changes committed.

**Step 3: Create summary commit (if needed)**

If any small fixes were made during testing:

```bash
git add .
git commit -m "test: verify Edge of Town navigation flow"
```

**Step 4: Review implementation**

Confirm all components built:
- ✅ PartyRosterRenderer
- ✅ EdgeOfTownScene
- ✅ 3 navigation commands
- ✅ CampScene placeholder
- ✅ Scene registration
- ✅ All tests passing

---

## Success Criteria

- [ ] All tests passing (<2.5s runtime)
- [ ] Navigation flow works: Castle → Edge → Training → Edge → Castle
- [ ] Maze button validates party state correctly
- [ ] Party roster displays properly (empty and with members)
- [ ] Camp placeholder accessible via Maze button
- [ ] No console errors during navigation

## Notes

**Dependencies:**
- Requires GameStateManager.getState() to return current party
- Assumes CharacterStatus enum exists with DEAD/ASHES/LOST values
- Uses existing ButtonRenderer, LayoutHelpers, MenuSceneHelpers

**Future Enhancements:**
- Background images for Edge of Town and Camp
- Confirmation dialog for dangerous actions
- Full Camp scene implementation with party management
- Maze scene implementation

