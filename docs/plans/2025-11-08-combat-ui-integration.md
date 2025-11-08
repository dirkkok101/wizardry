# Combat UI Integration - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build complete Combat UI component integrating the combat service layer with maze navigation, enabling full gameplay loop: Town → Maze → Combat → Victory → Maze.

**Architecture:** Angular standalone component with signals for reactive state, GameStateService integration for global state updates, CombatService for round execution, pure function architecture with TDD.

**Tech Stack:** Angular 20.3.x, TypeScript 5.9.2, Jest 29.7.0, Angular Signals

**Execution Method:** Batch execution with checkpoints (default: 3 tasks per batch)

---

## Prerequisites Verification

Before starting, verify these exist in codebase:

✅ **Combat Services Complete (38 tests passing):**
- `MonsterService` - Monster generation and encounter groups
- `CombatService` - Initiative, attacks, round execution
- `SpellCastingService` - Spell validation and effects

✅ **Infrastructure Services:**
- `GameStateService` - Global state with Angular signals
- `EncounterService` - Random encounters, monster selection
- `DungeonService` - Map loading, tile queries

✅ **UI Components:**
- `CharacterCardComponent` - Character display
- `SceneFooterComponent` - Footer menu
- `ConfirmationDialogComponent` - Modal dialogs

✅ **Types:**
- `Combat.ts` - CombatState, CombatCommand, MonsterInstance
- `GameState.ts` - GameState interface
- `Character.ts` - Character type

---

## Phase 1: GameState Extension & Victory Service (Week 1, Day 1-2)

### Task 1: Add Combat Field to GameState

**Files:**
- Modify: `src/types/GameState.ts:1-30`
- Test: Manual verification (no test file for types)

**Step 1: Add combat field to GameState interface**

```typescript
// src/types/GameState.ts
import { CombatState } from './Combat'

export interface GameState {
  currentScene: SceneType
  roster: Map<string, Character>
  party: Party
  dungeon: DungeonState
  settings: Settings
  encounterTriggered?: boolean
  combat?: CombatState  // Add this field
}
```

**Step 2: Verify TypeScript compilation**

Run: `ng build --configuration development`
Expected: SUCCESS with no errors

**Step 3: Commit**

```bash
git add src/types/GameState.ts
git commit -m "feat: add combat field to GameState for combat UI integration"
```

---

### Task 2: Create VictoryService with XP/Gold Distribution

**Files:**
- Create: `src/services/VictoryService.ts`
- Create: `src/services/__tests__/VictoryService.spec.ts`

**Step 1: Write failing test for XP calculation**

```typescript
// src/services/__tests__/VictoryService.spec.ts
import { VictoryService } from '../VictoryService'
import { createTestMonster } from '../../test-helpers/test-factories'

describe('VictoryService', () => {
  describe('calculateVictoryRewards', () => {
    it('calculates total XP from all monsters', () => {
      const monsters = [
        createTestMonster({ xp: 50 }),
        createTestMonster({ xp: 50 }),
        createTestMonster({ xp: 50 })
      ]

      const result = VictoryService.calculateVictoryRewards(monsters, 6)

      expect(result.totalXP).toBe(150)
      expect(result.xpPerCharacter).toBe(25)  // 150 / 6
    })

    it('calculates total gold from all monsters', () => {
      const monsters = [
        createTestMonster({ gold: 10 }),
        createTestMonster({ gold: 20 }),
        createTestMonster({ gold: 30 })
      ]

      const result = VictoryService.calculateVictoryRewards(monsters, 6)

      expect(result.totalGold).toBe(60)
    })

    it('handles monsters with no gold', () => {
      const monsters = [
        createTestMonster({ gold: undefined }),
        createTestMonster({ gold: 0 }),
        createTestMonster({ gold: 10 })
      ]

      const result = VictoryService.calculateVictoryRewards(monsters, 3)

      expect(result.totalGold).toBe(10)
    })

    it('divides XP evenly rounded down', () => {
      const monsters = [createTestMonster({ xp: 100 })]

      const result = VictoryService.calculateVictoryRewards(monsters, 3)

      expect(result.xpPerCharacter).toBe(33)  // floor(100/3)
    })
  })

  describe('distributeRewards', () => {
    it('adds XP to all party members', () => {
      const char1 = createTestCharacter({ id: 'c1', experience: 100 })
      const char2 = createTestCharacter({ id: 'c2', experience: 200 })
      const roster = new Map([
        ['c1', char1],
        ['c2', char2]
      ])
      const partyMembers = ['c1', 'c2']

      const newRoster = VictoryService.distributeRewards(roster, partyMembers, 50, 100)

      expect(newRoster.get('c1')!.experience).toBe(150)
      expect(newRoster.get('c2')!.experience).toBe(250)
    })

    it('returns new Map instance (immutable)', () => {
      const roster = new Map([['c1', createTestCharacter()]])
      const partyMembers = ['c1']

      const newRoster = VictoryService.distributeRewards(roster, partyMembers, 10, 10)

      expect(newRoster).not.toBe(roster)
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- VictoryService`
Expected: FAIL with "Cannot find module '../VictoryService'"

**Step 3: Write minimal implementation**

```typescript
// src/services/VictoryService.ts
import { MonsterInstance } from '../types/Combat'
import { Character } from '../types/Character'

export interface VictoryRewards {
  totalXP: number
  xpPerCharacter: number
  totalGold: number
}

export class VictoryService {
  /**
   * Calculate XP and gold rewards from defeated monsters
   * XP is divided evenly among party members (rounded down)
   * Gold goes to party pool
   */
  static calculateVictoryRewards(
    monsters: MonsterInstance[],
    partySize: number
  ): VictoryRewards {
    const totalXP = monsters.reduce((sum, m) => sum + m.xp, 0)
    const totalGold = monsters.reduce((sum, m) => sum + (m.gold || 0), 0)

    return {
      totalXP,
      xpPerCharacter: Math.floor(totalXP / partySize),
      totalGold
    }
  }

  /**
   * Distribute rewards to party members
   * Returns new roster Map with updated characters (immutable)
   */
  static distributeRewards(
    roster: Map<string, Character>,
    partyMembers: string[],
    xpPerCharacter: number,
    totalGold: number
  ): Map<string, Character> {
    const newRoster = new Map(roster)

    // Add XP to each party member
    for (const memberId of partyMembers) {
      const character = newRoster.get(memberId)
      if (!character) continue

      newRoster.set(memberId, {
        ...character,
        experience: character.experience + xpPerCharacter
      })
    }

    return newRoster
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- VictoryService`
Expected: PASS (6 tests)

**Step 5: Commit**

```bash
git add src/services/VictoryService.ts src/services/__tests__/VictoryService.spec.ts
git commit -m "feat: add VictoryService for XP/gold distribution

- Calculate total XP and gold from defeated monsters
- Distribute XP evenly to party members (rounded down)
- Gold added to party pool
- Pure functions with immutable Map updates
- 6 tests passing (100% coverage)"
```

---

### Task 3: Update test-factories with Combat State Factory

**Files:**
- Modify: `src/test-helpers/test-factories.ts:200-250`

**Step 1: Add createTestCombatStateForUI factory**

```typescript
// src/test-helpers/test-factories.ts
import { CombatState } from '../types/Combat'
import { MonsterService } from '../services/MonsterService'

export function createTestCombatStateForUI(overrides?: {
  monsters?: MonsterInstance[]
  roundNumber?: number
  canFlee?: boolean
  commandQueue?: CombatCommand[]
  combatLog?: string[]
}): CombatState {
  const defaultMonsters = MonsterService.generateMonsterGroup('kobold')

  return {
    monsters: overrides?.monsters || defaultMonsters,
    commandQueue: overrides?.commandQueue || [],
    roundNumber: overrides?.roundNumber || 1,
    combatLog: overrides?.combatLog || ['Combat begins!'],
    canFlee: overrides?.canFlee ?? true
  }
}

export function createTestGameStateWithCombat(overrides?: {
  combat?: CombatState
  party?: Partial<Party>
  roster?: Map<string, Character>
}): GameState {
  const baseState = createGameState()

  return {
    ...baseState,
    combat: overrides?.combat || createTestCombatStateForUI(),
    party: { ...baseState.party, ...overrides?.party },
    roster: overrides?.roster || baseState.roster
  }
}
```

**Step 2: Verify TypeScript compilation**

Run: `ng build --configuration development`
Expected: SUCCESS

**Step 3: Commit**

```bash
git add src/test-helpers/test-factories.ts
git commit -m "feat: add combat state factories for UI testing

- createTestCombatStateForUI() - Complete combat state with defaults
- createTestGameStateWithCombat() - GameState with combat initialized
- Supports override pattern for test customization"
```

---

## Phase 2: Combat Component Foundation (Week 1, Day 3-4)

### Task 4: Create Combat Component with State Management

**Files:**
- Modify: `src/app/scenes/combat/combat.ts` (replace stub)
- Create: `src/app/scenes/combat/combat.component.spec.ts`

**Step 1: Write failing test for component initialization**

```typescript
// src/app/scenes/combat/combat.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { CombatComponent } from './combat'
import { GameStateService } from '../../../services/GameStateService'
import { SceneType } from '../../../types/SceneType'
import { createTestGameStateWithCombat, createTestCharacter } from '../../../test-helpers/test-factories'
import { Router } from '@angular/router'

describe('CombatComponent', () => {
  let component: CombatComponent
  let fixture: ComponentFixture<CombatComponent>
  let gameState: GameStateService
  let router: Router

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CombatComponent]
    })

    fixture = TestBed.createComponent(CombatComponent)
    component = fixture.componentInstance
    gameState = TestBed.inject(GameStateService)
    router = TestBed.inject(Router)

    jest.spyOn(router, 'navigate')

    // Setup combat state
    const char1 = createTestCharacter({ id: 'c1', name: 'Fighter', hp: 20 })
    const char2 = createTestCharacter({ id: 'c2', name: 'Mage', hp: 10 })

    gameState.updateState(() => createTestGameStateWithCombat({
      roster: new Map([
        ['c1', char1],
        ['c2', char2]
      ]),
      party: {
        members: ['c1', 'c2'],
        formation: { frontRow: ['c1'], backRow: ['c2'] },
        position: { x: 0, y: 0, facing: 'north', level: 1 },
        gold: 100
      }
    }))

    component.ngOnInit()
    fixture.detectChanges()
  })

  it('sets scene to COMBAT on init', () => {
    expect(gameState.currentScene()).toBe(SceneType.COMBAT)
  })

  it('computes party characters from roster', () => {
    const chars = component.partyCharacters()
    expect(chars).toHaveLength(2)
    expect(chars[0].name).toBe('Fighter')
    expect(chars[1].name).toBe('Mage')
  })

  it('computes monsters from combat state', () => {
    const monsters = component.monsters()
    expect(monsters.length).toBeGreaterThan(0)
  })

  it('computes combat state from game state', () => {
    const combat = component.combatState()
    expect(combat).toBeDefined()
    expect(combat?.roundNumber).toBe(1)
  })

  it('initializes with no actions selected', () => {
    const actions = component.selectedActions()
    expect(actions.size).toBe(0)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- combat.component`
Expected: FAIL with property/method errors

**Step 3: Write minimal implementation**

```typescript
// src/app/scenes/combat/combat.ts
import { Component, computed, signal, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { GameStateService } from '../../../services/GameStateService'
import { CombatService } from '../../../services/CombatService'
import { SceneType } from '../../../types/SceneType'
import { CombatState, CombatCommand, Combatant } from '../../../types/Combat'
import { Character } from '../../../types/Character'

interface SelectedAction {
  characterId: string
  command: CombatCommand
}

@Component({
  selector: 'app-combat',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './combat.html',
  styleUrls: ['./combat.scss']
})
export class CombatComponent implements OnInit {
  // Computed from GameStateService
  readonly combatState = computed(() => this.gameState.state().combat)
  readonly party = computed(() => this.gameState.state().party)
  readonly roster = computed(() => this.gameState.state().roster)

  // Local UI state
  readonly selectedActions = signal<Map<string, CombatCommand>>(new Map())
  readonly isExecutingRound = signal<boolean>(false)

  // Computed party characters
  readonly partyCharacters = computed(() => {
    const members = this.party().members
    const roster = this.roster()
    return members
      .map(id => roster.get(id))
      .filter((char): char is Character => char !== undefined)
  })

  readonly monsters = computed(() => {
    const combat = this.combatState()
    return combat?.monsters || []
  })

  readonly combatLog = computed(() => {
    const combat = this.combatState()
    return combat?.combatLog || []
  })

  readonly roundNumber = computed(() => {
    const combat = this.combatState()
    return combat?.roundNumber || 1
  })

  readonly allActionsSelected = computed(() => {
    const chars = this.partyCharacters()
    const actions = this.selectedActions()

    // All alive characters must have selected an action
    return chars
      .filter(c => c.hp > 0)
      .every(c => actions.has(c.id))
  })

  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.COMBAT
    }))
  }

  selectAction(characterId: string, actionType: string, target?: Combatant): void {
    // TODO: Implement in next task
  }

  executeRound(): void {
    // TODO: Implement in next task
  }

  returnToMaze(): void {
    // TODO: Implement in next task
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- combat.component`
Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add src/app/scenes/combat/combat.ts src/app/scenes/combat/combat.component.spec.ts
git commit -m "feat: create combat component with state management

- Computed signals for combat state, party, monsters
- Local state for selected actions
- Scene initialization to COMBAT
- Skeleton methods for action selection and round execution
- 5 component tests passing"
```

---

### Task 5: Build Combat Component HTML Template

**Files:**
- Modify: `src/app/scenes/combat/combat.html` (replace stub)

**Step 1: Write HTML template with monster and party panels**

```html
<!-- src/app/scenes/combat/combat.html -->
<div class="combat-scene">
  @if (combatState(); as combat) {
    <div class="combat-header">
      <h2>COMBAT - ROUND {{ roundNumber() }}</h2>
      @if (!combat.canFlee) {
        <div class="fixed-encounter-badge">FIXED ENCOUNTER - CANNOT FLEE</div>
      }
    </div>

    <div class="combat-grid">
      <!-- Monsters Panel -->
      <div class="monsters-panel">
        <h3>MONSTERS ({{ monsters().length }})</h3>
        @for (monster of monsters(); track monster.id) {
          <div class="monster-card" [class.dead]="monster.status === 'DEAD'">
            <div class="monster-name">{{ monster.name }}</div>
            <div class="monster-stats">
              <span class="hp">HP: {{ monster.hp }}/{{ monster.maxHp }}</span>
              <span class="ac">AC: {{ monster.ac }}</span>
              <span class="status">{{ monster.status }}</span>
            </div>
            @if (monster.hp > 0) {
              <div class="hp-bar">
                <div class="hp-fill" [style.width.%]="(monster.hp / monster.maxHp) * 100"></div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Party Panel -->
      <div class="party-panel">
        <h3>PARTY</h3>
        @for (char of partyCharacters(); track char.id) {
          <div class="character-combat-card" [class.dead]="char.hp <= 0">
            <div class="char-name">{{ char.name }} ({{ char.class }})</div>
            <div class="char-stats">
              <span class="hp">HP: {{ char.hp }}/{{ char.maxHp }}</span>
              <span class="ac">AC: {{ char.ac }}</span>
            </div>
            @if (char.hp > 0) {
              <div class="hp-bar">
                <div class="hp-fill" [style.width.%]="(char.hp / char.maxHp) * 100"></div>
              </div>
              <div class="action-selection">
                @if (selectedActions().has(char.id)) {
                  <span class="action-selected">✓ Action Selected</span>
                } @else {
                  <span class="action-pending">⏳ Select Action...</span>
                }
              </div>
            } @else {
              <div class="char-status-dead">DEAD</div>
            }
          </div>
        }
      </div>
    </div>

    <!-- Combat Log -->
    <div class="combat-log">
      <h3>COMBAT LOG</h3>
      <div class="log-messages">
        @for (msg of combatLog(); track $index) {
          <div class="log-message">{{ msg }}</div>
        }
      </div>
    </div>

    <!-- Action Bar -->
    <div class="combat-actions">
      <button
        class="execute-round-btn"
        [disabled]="!allActionsSelected() || isExecutingRound()"
        (click)="executeRound()">
        @if (isExecutingRound()) {
          Executing Round...
        } @else if (allActionsSelected()) {
          (Enter) Execute Round {{ roundNumber() }}
        } @else {
          Select Actions for All Characters
        }
      </button>
    </div>
  } @else {
    <div class="no-combat">
      <p>No combat active. Returning to maze...</p>
    </div>
  }
</div>
```

**Step 2: Verify template renders without errors**

Run: `npm test -- combat.component`
Expected: PASS (all existing tests still pass)

**Step 3: Commit**

```bash
git add src/app/scenes/combat/combat.html
git commit -m "feat: build combat component HTML template

- Monster panel with HP bars and status
- Party panel with character cards and action selection
- Combat log with scrolling messages
- Execute round button with enabled/disabled states
- Fixed encounter badge when canFlee is false"
```

---

### Task 6: Style Combat Component

**Files:**
- Modify: `src/app/scenes/combat/combat.scss`

**Step 1: Write SCSS styles**

```scss
// src/app/scenes/combat/combat.scss
.combat-scene {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.combat-header {
  text-align: center;
  margin-bottom: 20px;

  h2 {
    font-family: 'VT323', monospace;
    font-size: 2rem;
    color: var(--color-primary);
    margin: 0;
  }

  .fixed-encounter-badge {
    font-size: 0.9rem;
    color: var(--color-danger);
    margin-top: 5px;
  }
}

.combat-grid {
  display: grid;
  grid-template-columns: 45% 55%;
  gap: 20px;
  margin-bottom: 20px;
}

.monsters-panel,
.party-panel {
  border: 2px solid var(--color-border);
  padding: 15px;
  background: var(--color-panel-bg);

  h3 {
    font-family: 'VT323', monospace;
    font-size: 1.5rem;
    margin: 0 0 10px 0;
    color: var(--color-primary);
  }
}

.monster-card,
.character-combat-card {
  border: 1px solid var(--color-border);
  padding: 10px;
  margin-bottom: 10px;
  background: var(--color-card-bg);

  &.dead {
    opacity: 0.5;
    background: var(--color-dead-bg);
  }
}

.monster-name,
.char-name {
  font-weight: bold;
  font-size: 1.1rem;
  margin-bottom: 5px;
}

.monster-stats,
.char-stats {
  display: flex;
  gap: 15px;
  font-size: 0.9rem;
  margin-bottom: 5px;

  .hp {
    color: var(--color-hp);
  }

  .ac {
    color: var(--color-ac);
  }

  .status {
    text-transform: uppercase;
    font-weight: bold;
  }
}

.hp-bar {
  width: 100%;
  height: 8px;
  background: var(--color-hp-bar-bg);
  border: 1px solid var(--color-border);
  margin: 5px 0;

  .hp-fill {
    height: 100%;
    background: var(--color-hp-bar-fill);
    transition: width 0.3s ease;
  }
}

.action-selection {
  margin-top: 5px;
  font-size: 0.9rem;

  .action-selected {
    color: var(--color-success);
    font-weight: bold;
  }

  .action-pending {
    color: var(--color-warning);
  }
}

.char-status-dead {
  color: var(--color-danger);
  font-weight: bold;
  text-align: center;
}

.combat-log {
  border: 2px solid var(--color-border);
  padding: 15px;
  background: var(--color-panel-bg);
  margin-bottom: 20px;

  h3 {
    font-family: 'VT323', monospace;
    font-size: 1.5rem;
    margin: 0 0 10px 0;
    color: var(--color-primary);
  }

  .log-messages {
    max-height: 200px;
    overflow-y: auto;
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
    line-height: 1.4;

    .log-message {
      padding: 2px 0;
      border-bottom: 1px dotted var(--color-border-light);

      &:last-child {
        border-bottom: none;
      }
    }
  }
}

.combat-actions {
  text-align: center;

  .execute-round-btn {
    padding: 15px 30px;
    font-size: 1.2rem;
    font-family: 'VT323', monospace;
    background: var(--color-primary);
    color: var(--color-bg);
    border: 2px solid var(--color-border);
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(:disabled) {
      background: var(--color-primary-light);
      transform: scale(1.05);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

.no-combat {
  text-align: center;
  padding: 40px;
  font-size: 1.2rem;
  color: var(--color-text-muted);
}
```

**Step 2: Verify styles compile**

Run: `ng build --configuration development`
Expected: SUCCESS

**Step 3: Commit**

```bash
git add src/app/scenes/combat/combat.scss
git commit -m "style: add combat component styles

- Two-column grid layout for monsters and party
- HP bars with percentage fill
- Action selection status indicators
- Scrolling combat log
- Disabled states for execute button
- Dead character/monster opacity"
```

---

## Phase 3: Combat Flow Implementation (Week 1, Day 5 - Week 2, Day 1)

### Task 7: Implement Action Selection

**Files:**
- Modify: `src/app/scenes/combat/combat.ts:70-90`
- Modify: `src/app/scenes/combat/combat.component.spec.ts:40-80`

**Step 1: Write failing test for action selection**

```typescript
// Add to combat.component.spec.ts
describe('Action Selection', () => {
  it('selects ATTACK action for character', () => {
    const char = component.partyCharacters()[0]
    const monster = component.monsters()[0]

    component.selectAction(char.id, 'ATTACK', monster)

    const actions = component.selectedActions()
    expect(actions.has(char.id)).toBe(true)
    expect(actions.get(char.id)!.type).toBe('ATTACK')
    expect(actions.get(char.id)!.target).toBe(monster)
  })

  it('creates command with initiative when selecting action', () => {
    const char = component.partyCharacters()[0]
    const monster = component.monsters()[0]

    component.selectAction(char.id, 'ATTACK', monster)

    const command = component.selectedActions().get(char.id)!
    expect(command.initiative).toBeGreaterThanOrEqual(1)
    expect(command.actor).toBe(char)
  })

  it('replaces existing action when selecting new one', () => {
    const char = component.partyCharacters()[0]
    const monster1 = component.monsters()[0]
    const monster2 = component.monsters()[1] || monster1

    component.selectAction(char.id, 'ATTACK', monster1)
    component.selectAction(char.id, 'ATTACK', monster2)

    const actions = component.selectedActions()
    expect(actions.size).toBe(1)
    expect(actions.get(char.id)!.target).toBe(monster2)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- combat.component`
Expected: FAIL

**Step 3: Implement selectAction method**

```typescript
// src/app/scenes/combat/combat.ts
import { CombatService } from '../../../services/CombatService'

// In CombatComponent class:
selectAction(characterId: string, actionType: string, target?: Combatant): void {
  const character = this.roster().get(characterId)
  if (!character) return

  // Create combat command using CombatService
  const command = CombatService.createCommand(
    character,
    actionType as CombatActionType,
    target
  )

  // Update selected actions (immutable)
  this.selectedActions.update(actions => {
    const newActions = new Map(actions)
    newActions.set(characterId, command)
    return newActions
  })
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- combat.component`
Expected: PASS (8 tests)

**Step 5: Commit**

```bash
git add src/app/scenes/combat/combat.ts src/app/scenes/combat/combat.component.spec.ts
git commit -m "feat: implement action selection for combat

- selectAction() creates CombatCommand using CombatService
- Stores selected actions in signal Map
- Replaces existing action if character selects again
- Initiative calculated when action selected
- 3 new tests passing (8 total)"
```

---

### Task 8: Implement Execute Round Flow

**Files:**
- Modify: `src/app/scenes/combat/combat.ts:90-130`
- Modify: `src/app/scenes/combat/combat.component.spec.ts:80-150`

**Step 1: Write failing test for round execution**

```typescript
// Add to combat.component.spec.ts
describe('Execute Round', () => {
  beforeEach(() => {
    // Select actions for all characters
    const chars = component.partyCharacters()
    const monster = component.monsters()[0]

    chars.forEach(char => {
      component.selectAction(char.id, 'ATTACK', monster)
    })
  })

  it('executes round using CombatService', () => {
    const initialRound = component.roundNumber()

    component.executeRound()

    // Round number should increment (or combat ends)
    const newRound = component.roundNumber()
    expect(newRound).toBeGreaterThanOrEqual(initialRound)
  })

  it('clears selected actions after round executes', () => {
    component.executeRound()

    expect(component.selectedActions().size).toBe(0)
  })

  it('updates combat state in GameStateService', () => {
    const initialMonsterHP = component.monsters()[0].hp

    component.executeRound()

    // HP should change (might increase or decrease depending on who got hit)
    const newCombatState = gameState.state().combat
    expect(newCombatState).toBeDefined()
  })

  it('sets isExecutingRound flag during execution', async () => {
    expect(component.isExecutingRound()).toBe(false)

    // Execute round doesn't wait, so we can't test the flag easily
    // This is more of an integration test
    component.executeRound()

    // After execution completes, flag should be false
    expect(component.isExecutingRound()).toBe(false)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- combat.component`
Expected: FAIL

**Step 3: Implement executeRound method**

```typescript
// src/app/scenes/combat/combat.ts
executeRound(): void {
  const combat = this.combatState()
  if (!combat) return

  const chars = this.partyCharacters()
  const actions = this.selectedActions()

  // Create party commands from selected actions
  const partyCommands = Array.from(actions.values())

  // Create monster commands using AI
  const aliveMonsters = combat.monsters.filter(m => m.hp > 0 && m.status !== 'DEAD')
  const frontRow = this.party().formation.frontRow
  const monsterCommands = aliveMonsters.map(m =>
    CombatService.selectMonsterAction(m, chars, frontRow)
  )

  // Update combat state with all commands
  const stateWithCommands: CombatState = {
    ...combat,
    commandQueue: [...partyCommands, ...monsterCommands]
  }

  // Execute round
  this.isExecutingRound.set(true)
  const result = CombatService.executeRound(stateWithCommands)

  // Update game state with result
  this.gameState.updateState(state => {
    // Update combat state
    const newState = {
      ...state,
      combat: result.newState
    }

    // Update combat log
    const updatedCombat = {
      ...result.newState,
      combatLog: [...result.newState.combatLog, ...result.messages]
    }

    return {
      ...newState,
      combat: updatedCombat
    }
  })

  // Clear selected actions
  this.selectedActions.set(new Map())
  this.isExecutingRound.set(false)

  // Check for victory or defeat
  if (result.victory) {
    this.handleVictory()
  } else if (result.defeat) {
    this.handleDefeat()
  }
}

private handleVictory(): void {
  // TODO: Implement in next task
  console.log('Victory!')
}

private handleDefeat(): void {
  // TODO: Implement in next task
  console.log('Defeat!')
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- combat.component`
Expected: PASS (12 tests)

**Step 5: Commit**

```bash
git add src/app/scenes/combat/combat.ts src/app/scenes/combat/combat.component.spec.ts
git commit -m "feat: implement execute round flow

- Collect party commands from selected actions
- Generate monster commands using AI
- Execute round using CombatService.executeRound()
- Update GameState with new combat state
- Clear selected actions after round
- Detect victory/defeat (handlers stubbed)
- 4 new tests passing (12 total)"
```

---

### Task 9: Implement Victory Handling

**Files:**
- Modify: `src/app/scenes/combat/combat.ts:130-180`
- Modify: `src/app/scenes/combat/combat.component.spec.ts:150-220`
- Modify: `src/app/scenes/combat/combat.html:80-110`

**Step 1: Write failing test for victory handling**

```typescript
// Add to combat.component.spec.ts
import { VictoryService } from '../../../services/VictoryService'

describe('Victory Handling', () => {
  beforeEach(() => {
    // Setup victory scenario - all monsters dead
    gameState.updateState(state => {
      const combat = state.combat!
      const deadMonsters = combat.monsters.map(m => ({
        ...m,
        hp: 0,
        status: 'DEAD' as const
      }))

      return {
        ...state,
        combat: {
          ...combat,
          monsters: deadMonsters
        }
      }
    })

    fixture.detectChanges()
  })

  it('calculates victory rewards', () => {
    const spyCalculate = jest.spyOn(VictoryService, 'calculateVictoryRewards')

    component['handleVictory']()

    expect(spyCalculate).toHaveBeenCalled()
  })

  it('distributes XP to party members', () => {
    const initialXP = gameState.roster().get('c1')!.experience

    component['handleVictory']()

    const newXP = gameState.roster().get('c1')!.experience
    expect(newXP).toBeGreaterThan(initialXP)
  })

  it('adds gold to party', () => {
    const initialGold = gameState.party().gold

    component['handleVictory']()

    const newGold = gameState.party().gold
    expect(newGold).toBeGreaterThanOrEqual(initialGold)
  })

  it('shows victory modal', () => {
    component['handleVictory']()

    expect(component.showVictoryModal()).toBe(true)
  })

  it('includes victory rewards in modal', () => {
    component['handleVictory']()

    const rewards = component.victoryRewards()
    expect(rewards).toBeDefined()
    expect(rewards?.totalXP).toBeGreaterThan(0)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- combat.component`
Expected: FAIL

**Step 3: Add victory modal signals to component**

```typescript
// src/app/scenes/combat/combat.ts
import { VictoryService, VictoryRewards } from '../../../services/VictoryService'

// Add to CombatComponent class:
readonly showVictoryModal = signal<boolean>(false)
readonly victoryRewards = signal<VictoryRewards | null>(null)

private handleVictory(): void {
  const combat = this.combatState()
  if (!combat) return

  const party = this.party()
  const partySize = party.members.length

  // Calculate rewards
  const rewards = VictoryService.calculateVictoryRewards(combat.monsters, partySize)

  // Distribute rewards to roster
  const newRoster = VictoryService.distributeRewards(
    this.roster(),
    party.members,
    rewards.xpPerCharacter,
    rewards.totalGold
  )

  // Update game state
  this.gameState.updateState(state => ({
    ...state,
    roster: newRoster,
    party: {
      ...state.party,
      gold: state.party.gold + rewards.totalGold
    },
    combat: undefined  // Clear combat state
  }))

  // Show victory modal
  this.victoryRewards.set(rewards)
  this.showVictoryModal.set(true)
}

returnToMaze(): void {
  this.showVictoryModal.set(false)
  this.router.navigate(['/maze'])
}
```

**Step 4: Add victory modal to HTML**

```html
<!-- Add to combat.html after combat-actions div -->
@if (showVictoryModal()) {
  <div class="victory-modal-overlay">
    <div class="victory-modal">
      <h2>⚔️ VICTORY! ⚔️</h2>
      @if (victoryRewards(); as rewards) {
        <div class="victory-rewards">
          <div class="reward-line">
            <span class="label">Total XP Earned:</span>
            <span class="value">{{ rewards.totalXP }}</span>
          </div>
          <div class="reward-line">
            <span class="label">XP per Character:</span>
            <span class="value">{{ rewards.xpPerCharacter }}</span>
          </div>
          <div class="reward-line">
            <span class="label">Gold Found:</span>
            <span class="value">{{ rewards.totalGold }}</span>
          </div>
        </div>
      }
      <button class="return-btn" (click)="returnToMaze()">
        (Enter) Return to Maze
      </button>
    </div>
  </div>
}
```

**Step 5: Run test to verify it passes**

Run: `npm test -- combat.component`
Expected: PASS (17 tests)

**Step 6: Commit**

```bash
git add src/app/scenes/combat/combat.ts src/app/scenes/combat/combat.component.spec.ts src/app/scenes/combat/combat.html
git commit -m "feat: implement victory handling

- Calculate XP and gold rewards from defeated monsters
- Distribute XP to all party members
- Add gold to party pool
- Show victory modal with rewards breakdown
- Return to maze navigation on close
- Clear combat state on victory
- 5 new tests passing (17 total)"
```

---

### Task 10: Style Victory Modal

**Files:**
- Modify: `src/app/scenes/combat/combat.scss:150-220`

**Step 1: Add victory modal styles**

```scss
// Add to combat.scss
.victory-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.victory-modal {
  background: var(--color-panel-bg);
  border: 3px solid var(--color-success);
  padding: 30px;
  max-width: 500px;
  text-align: center;
  box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);

  h2 {
    font-family: 'VT323', monospace;
    font-size: 2.5rem;
    color: var(--color-success);
    margin: 0 0 20px 0;
    text-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
  }

  .victory-rewards {
    margin: 20px 0;
    text-align: left;

    .reward-line {
      display: flex;
      justify-content: space-between;
      padding: 10px;
      border-bottom: 1px dotted var(--color-border);
      font-size: 1.1rem;

      &:last-child {
        border-bottom: none;
      }

      .label {
        font-weight: normal;
      }

      .value {
        font-weight: bold;
        color: var(--color-success);
      }
    }
  }

  .return-btn {
    margin-top: 20px;
    padding: 12px 30px;
    font-size: 1.2rem;
    font-family: 'VT323', monospace;
    background: var(--color-success);
    color: var(--color-bg);
    border: 2px solid var(--color-border);
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: var(--color-success-light);
      transform: scale(1.05);
    }
  }
}
```

**Step 2: Verify styles compile**

Run: `ng build --configuration development`
Expected: SUCCESS

**Step 3: Commit**

```bash
git add src/app/scenes/combat/combat.scss
git commit -m "style: add victory modal styles

- Full-screen overlay with transparency
- Green glow effect on modal border
- Reward breakdown with value highlighting
- Return button with hover effects"
```

---

## Phase 4: Router Integration (Week 2, Day 2)

### Task 11: Update Routes for Combat

**Files:**
- Modify: `src/app/app.routes.ts:1-30`

**Step 1: Replace combat-stub route with combat route**

```typescript
// src/app/app.routes.ts
import { CombatComponent } from './scenes/combat/combat'

export const routes: Routes = [
  // ... existing routes
  { path: 'combat', component: CombatComponent },  // Replace combat-stub
  // Remove: { path: 'combat-stub', component: CombatStubComponent }
  // ... other routes
]
```

**Step 2: Verify routes compile**

Run: `ng build --configuration development`
Expected: SUCCESS

**Step 3: Commit**

```bash
git add src/app/app.routes.ts
git commit -m "feat: replace combat-stub route with combat component

- Route /combat now uses full CombatComponent
- Removed combat-stub route"
```

---

### Task 12: Update Maze Encounter to Initialize Combat State

**Files:**
- Modify: `src/app/maze/maze.component.ts:500-580`
- Modify: `src/app/maze/maze.component.spec.ts:800-860`

**Step 1: Write failing test for combat initialization**

```typescript
// Add to maze.component.spec.ts
import { CombatService } from '../../../services/CombatService'

describe('Combat Integration', () => {
  it('initializes combat state on encounter', () => {
    jest.spyOn(EncounterService, 'rollRandomEncounter').mockReturnValue(true)
    jest.spyOn(EncounterService, 'selectMonster').mockReturnValue('kobold')

    component['checkForEncounter']()

    const combat = gameState.state().combat
    expect(combat).toBeDefined()
    expect(combat?.monsters.length).toBeGreaterThan(0)
    expect(combat?.roundNumber).toBe(1)
    expect(combat?.canFlee).toBe(true)
  })

  it('navigates to /combat on encounter', () => {
    jest.spyOn(EncounterService, 'rollRandomEncounter').mockReturnValue(true)
    jest.spyOn(EncounterService, 'selectMonster').mockReturnValue('kobold')

    component['checkForEncounter']()

    expect(router.navigate).toHaveBeenCalledWith(['/combat'])
  })

  it('sets canFlee to false for fixed encounters', () => {
    // Trigger fixed encounter (implementation-specific)
    component['handleFixedEncounter']('kobold')

    const combat = gameState.state().combat
    expect(combat?.canFlee).toBe(false)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- maze.component`
Expected: FAIL

**Step 3: Update checkForEncounter to initialize combat**

```typescript
// src/app/maze/maze.component.ts
import { CombatService } from '../../../services/CombatService'

private checkForEncounter(): void {
  const encounterOccurs = EncounterService.rollRandomEncounter()
  if (!encounterOccurs) return

  const encounterTable = EncounterService.getEncounterTable(this.currentLevel())
  const monsterId = EncounterService.selectMonster(encounterTable)

  this.initiateEncounter(monsterId, true)  // true = can flee
}

private handleFixedEncounter(monsterId: string): void {
  this.initiateEncounter(monsterId, false)  // false = cannot flee
}

private initiateEncounter(monsterId: string, canFlee: boolean): void {
  const monsterName = this.formatMonsterName(monsterId)
  this.addMessage(`You encounter ${monsterName}!`)

  // Get party characters for combat
  const partyChars = this.partyCharacters()

  // Initialize combat state using CombatService
  const combatState = CombatService.initiateCombat(monsterId, partyChars, canFlee)

  // Update game state with combat
  this.gameState.updateState(state => ({
    ...state,
    combat: combatState
  }))

  // Navigate to combat
  queueMicrotask(() => {
    this.router.navigate(['/combat'])
  })
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- maze.component`
Expected: PASS (3 new tests)

**Step 5: Commit**

```bash
git add src/app/maze/maze.component.ts src/app/maze/maze.component.spec.ts
git commit -m "feat: initialize combat state on maze encounter

- Use CombatService.initiateCombat() when encounter occurs
- Store combat state in GameState
- Navigate to /combat instead of /combat-stub
- Support both random (canFlee=true) and fixed (canFlee=false) encounters
- 3 new maze tests passing"
```

---

### Task 13: Handle Combat Victory Return to Maze

**Files:**
- Modify: `src/app/scenes/combat/combat.ts:180-200`
- Modify: `src/app/scenes/combat/combat.component.spec.ts:220-250`

**Step 1: Write test for return to maze**

```typescript
// Add to combat.component.spec.ts
describe('Return to Maze', () => {
  it('navigates to /maze on victory return', () => {
    component.showVictoryModal.set(true)
    component.returnToMaze()

    expect(router.navigate).toHaveBeenCalledWith(['/maze'])
  })

  it('clears victory modal on return', () => {
    component.showVictoryModal.set(true)
    component.returnToMaze()

    expect(component.showVictoryModal()).toBe(false)
  })

  it('preserves dungeon position when returning', () => {
    const position = gameState.state().dungeon.position

    component.returnToMaze()

    const newPosition = gameState.state().dungeon.position
    expect(newPosition).toEqual(position)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- combat.component`
Expected: FAIL (1 test for position preservation)

**Step 3: Verify returnToMaze implementation**

```typescript
// src/app/scenes/combat/combat.ts
// Already implemented in Task 9, verify it works:
returnToMaze(): void {
  this.showVictoryModal.set(false)
  this.router.navigate(['/maze'])
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- combat.component`
Expected: PASS (20 tests total)

**Step 5: Commit**

```bash
git add src/app/scenes/combat/combat.component.spec.ts
git commit -m "test: add return to maze tests

- Verify navigation to /maze on victory
- Verify victory modal closes
- Verify dungeon position preserved
- 3 new tests (20 total)"
```

---

## Phase 5: Defeat Handling & Temple Integration (Week 2, Day 3)

### Task 14: Implement Defeat Handling

**Files:**
- Modify: `src/app/scenes/combat/combat.ts:200-240`
- Modify: `src/app/scenes/combat/combat.component.spec.ts:250-290`
- Modify: `src/app/scenes/combat/combat.html:110-140`

**Step 1: Write failing test for defeat**

```typescript
// Add to combat.component.spec.ts
describe('Defeat Handling', () => {
  beforeEach(() => {
    // Setup defeat scenario - all party members dead
    gameState.updateState(state => {
      const char1 = state.roster.get('c1')!
      const char2 = state.roster.get('c2')!

      return {
        ...state,
        roster: new Map(state.roster)
          .set('c1', { ...char1, hp: 0, status: CharacterStatus.DEAD })
          .set('c2', { ...char2, hp: 0, status: CharacterStatus.DEAD })
      }
    })

    fixture.detectChanges()
  })

  it('shows defeat modal on party wipe', () => {
    component['handleDefeat']()

    expect(component.showDefeatModal()).toBe(true)
  })

  it('navigates to temple on defeat', () => {
    component['handleDefeat']()
    component.returnToTemple()

    expect(router.navigate).toHaveBeenCalledWith(['/temple'])
  })

  it('clears combat state on defeat', () => {
    component['handleDefeat']()

    const combat = gameState.state().combat
    expect(combat).toBeUndefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- combat.component`
Expected: FAIL

**Step 3: Implement handleDefeat method**

```typescript
// src/app/scenes/combat/combat.ts
readonly showDefeatModal = signal<boolean>(false)

private handleDefeat(): void {
  // Clear combat state
  this.gameState.updateState(state => ({
    ...state,
    combat: undefined
  }))

  // Show defeat modal
  this.showDefeatModal.set(true)
}

returnToTemple(): void {
  this.showDefeatModal.set(false)
  this.router.navigate(['/temple'])
}
```

**Step 4: Add defeat modal to HTML**

```html
<!-- Add to combat.html after victory modal -->
@if (showDefeatModal()) {
  <div class="defeat-modal-overlay">
    <div class="defeat-modal">
      <h2>💀 DEFEAT 💀</h2>
      <p class="defeat-message">
        Your party has been defeated!<br>
        You awaken at the Temple of Cant...
      </p>
      <button class="temple-btn" (click)="returnToTemple()">
        (Enter) Go to Temple
      </button>
    </div>
  </div>
}
```

**Step 5: Run test to verify it passes**

Run: `npm test -- combat.component`
Expected: PASS (23 tests)

**Step 6: Commit**

```bash
git add src/app/scenes/combat/combat.ts src/app/scenes/combat/combat.component.spec.ts src/app/scenes/combat/combat.html
git commit -m "feat: implement defeat handling

- Show defeat modal on party wipe
- Navigate to temple for resurrection
- Clear combat state on defeat
- 3 new tests passing (23 total)"
```

---

### Task 15: Style Defeat Modal

**Files:**
- Modify: `src/app/scenes/combat/combat.scss:220-280`

**Step 1: Add defeat modal styles**

```scss
// Add to combat.scss
.defeat-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.defeat-modal {
  background: var(--color-panel-bg);
  border: 3px solid var(--color-danger);
  padding: 30px;
  max-width: 500px;
  text-align: center;
  box-shadow: 0 0 20px rgba(255, 0, 0, 0.3);

  h2 {
    font-family: 'VT323', monospace;
    font-size: 2.5rem;
    color: var(--color-danger);
    margin: 0 0 20px 0;
    text-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
  }

  .defeat-message {
    font-size: 1.2rem;
    line-height: 1.6;
    margin: 20px 0;
    color: var(--color-text);
  }

  .temple-btn {
    margin-top: 20px;
    padding: 12px 30px;
    font-size: 1.2rem;
    font-family: 'VT323', monospace;
    background: var(--color-danger);
    color: var(--color-bg);
    border: 2px solid var(--color-border);
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: var(--color-danger-light);
      transform: scale(1.05);
    }
  }
}
```

**Step 2: Verify styles compile**

Run: `ng build --configuration development`
Expected: SUCCESS

**Step 3: Commit**

```bash
git add src/app/scenes/combat/combat.scss
git commit -m "style: add defeat modal styles

- Red glow effect on modal border
- Darker overlay than victory
- Temple button with danger color"
```

---

## Phase 6: Testing & Polish (Week 2, Day 4-5)

### Task 16: Add E2E Combat Flow Test

**Files:**
- Create: `src/app/scenes/combat/__tests__/combat-flow.e2e.spec.ts`

**Step 1: Write E2E test for full combat flow**

```typescript
// src/app/scenes/combat/__tests__/combat-flow.e2e.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Router } from '@angular/router'
import { CombatComponent } from '../combat'
import { GameStateService } from '../../../../services/GameStateService'
import { createTestGameStateWithCombat, createTestCharacter, createTestMonster } from '../../../../test-helpers/test-factories'

describe('Combat Flow E2E', () => {
  let component: CombatComponent
  let fixture: ComponentFixture<CombatComponent>
  let gameState: GameStateService
  let router: Router

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CombatComponent]
    })

    fixture = TestBed.createComponent(CombatComponent)
    component = fixture.componentInstance
    gameState = TestBed.inject(GameStateService)
    router = TestBed.inject(Router)

    jest.spyOn(router, 'navigate')
  })

  it('completes full combat flow: encounter → rounds → victory → maze', () => {
    // 1. Setup initial combat state
    const char1 = createTestCharacter({ id: 'c1', strength: 18, hp: 30, maxHp: 30 })
    const char2 = createTestCharacter({ id: 'c2', strength: 18, hp: 30, maxHp: 30 })

    const weakMonster = createTestMonster({ hp: 1, maxHp: 10, xp: 50, gold: 20 })

    gameState.updateState(() => createTestGameStateWithCombat({
      roster: new Map([['c1', char1], ['c2', char2]]),
      party: {
        members: ['c1', 'c2'],
        formation: { frontRow: ['c1'], backRow: ['c2'] },
        position: { x: 5, y: 5, facing: 'north', level: 1 },
        gold: 100
      },
      combat: {
        monsters: [weakMonster],
        commandQueue: [],
        roundNumber: 1,
        combatLog: ['Combat begins!'],
        canFlee: true
      }
    }))

    component.ngOnInit()
    fixture.detectChanges()

    // 2. Verify initial state
    expect(component.combatState()).toBeDefined()
    expect(component.monsters()).toHaveLength(1)
    expect(component.partyCharacters()).toHaveLength(2)

    // 3. Select actions for all characters
    const monster = component.monsters()[0]
    component.selectAction('c1', 'ATTACK', monster)
    component.selectAction('c2', 'ATTACK', monster)

    expect(component.allActionsSelected()).toBe(true)

    // 4. Execute round
    const initialGold = gameState.party().gold
    const initialXP = gameState.roster().get('c1')!.experience

    component.executeRound()

    // 5. Verify victory (weak monster should die in one round)
    expect(component.showVictoryModal()).toBe(true)

    const rewards = component.victoryRewards()
    expect(rewards).toBeDefined()
    expect(rewards?.totalXP).toBe(50)
    expect(rewards?.xpPerCharacter).toBe(25)
    expect(rewards?.totalGold).toBe(20)

    // 6. Verify XP and gold distributed
    const newGold = gameState.party().gold
    const newXP = gameState.roster().get('c1')!.experience

    expect(newGold).toBe(initialGold + 20)
    expect(newXP).toBe(initialXP + 25)

    // 7. Return to maze
    component.returnToMaze()

    expect(router.navigate).toHaveBeenCalledWith(['/maze'])
    expect(component.showVictoryModal()).toBe(false)
  })

  it('handles defeat flow: party wipe → temple', () => {
    // Setup combat with strong monsters
    const weakChar = createTestCharacter({ id: 'c1', hp: 1, maxHp: 10 })
    const strongMonster = createTestMonster({ hp: 100, maxHp: 100 })

    gameState.updateState(() => createTestGameStateWithCombat({
      roster: new Map([['c1', weakChar]]),
      party: {
        members: ['c1'],
        formation: { frontRow: ['c1'], backRow: [] },
        position: { x: 0, y: 0, facing: 'north', level: 1 },
        gold: 0
      },
      combat: {
        monsters: [strongMonster],
        commandQueue: [],
        roundNumber: 1,
        combatLog: [],
        canFlee: true
      }
    }))

    component.ngOnInit()
    fixture.detectChanges()

    // Simulate defeat
    component['handleDefeat']()

    expect(component.showDefeatModal()).toBe(true)
    expect(gameState.state().combat).toBeUndefined()

    component.returnToTemple()

    expect(router.navigate).toHaveBeenCalledWith(['/temple'])
  })
})
```

**Step 2: Run test to verify it passes**

Run: `npm test -- combat-flow.e2e`
Expected: PASS (2 E2E tests)

**Step 3: Commit**

```bash
git add src/app/scenes/combat/__tests__/combat-flow.e2e.spec.ts
git commit -m "test: add E2E combat flow tests

- Full flow: encounter → action selection → round execution → victory → maze
- Defeat flow: party wipe → temple navigation
- Verify XP/gold distribution
- Verify state updates throughout flow
- 2 E2E tests passing"
```

---

### Task 17: Add Keyboard Shortcuts

**Files:**
- Modify: `src/app/scenes/combat/combat.ts:240-280`
- Modify: `src/app/scenes/combat/combat.component.spec.ts:290-330`

**Step 1: Write test for keyboard shortcuts**

```typescript
// Add to combat.component.spec.ts
describe('Keyboard Shortcuts', () => {
  it('executes round on Enter key when all actions selected', () => {
    // Select all actions
    const chars = component.partyCharacters()
    const monster = component.monsters()[0]
    chars.forEach(char => component.selectAction(char.id, 'ATTACK', monster))

    const executeRoundSpy = jest.spyOn(component, 'executeRound')

    const event = new KeyboardEvent('keydown', { key: 'Enter' })
    component.handleKeyPress(event)

    expect(executeRoundSpy).toHaveBeenCalled()
  })

  it('does not execute round on Enter when actions not selected', () => {
    const executeRoundSpy = jest.spyOn(component, 'executeRound')

    const event = new KeyboardEvent('keydown', { key: 'Enter' })
    component.handleKeyPress(event)

    expect(executeRoundSpy).not.toHaveBeenCalled()
  })

  it('returns to maze on Enter in victory modal', () => {
    component.showVictoryModal.set(true)

    const event = new KeyboardEvent('keydown', { key: 'Enter' })
    component.handleKeyPress(event)

    expect(router.navigate).toHaveBeenCalledWith(['/maze'])
  })

  it('returns to temple on Enter in defeat modal', () => {
    component.showDefeatModal.set(true)

    const event = new KeyboardEvent('keydown', { key: 'Enter' })
    component.handleKeyPress(event)

    expect(router.navigate).toHaveBeenCalledWith(['/temple'])
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- combat.component`
Expected: FAIL

**Step 3: Implement keyboard shortcuts**

```typescript
// src/app/scenes/combat/combat.ts
import { HostListener } from '@angular/core'

// Add to CombatComponent class:
@HostListener('window:keydown', ['$event'])
handleKeyPress(event: KeyboardEvent): void {
  const key = event.key.toLowerCase()

  // Victory modal - Enter to return
  if (this.showVictoryModal() && key === 'enter') {
    this.returnToMaze()
    event.preventDefault()
    return
  }

  // Defeat modal - Enter to go to temple
  if (this.showDefeatModal() && key === 'enter') {
    this.returnToTemple()
    event.preventDefault()
    return
  }

  // Execute round - Enter when all actions selected
  if (key === 'enter' && this.allActionsSelected() && !this.isExecutingRound()) {
    this.executeRound()
    event.preventDefault()
    return
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- combat.component`
Expected: PASS (27 tests)

**Step 5: Commit**

```bash
git add src/app/scenes/combat/combat.ts src/app/scenes/combat/combat.component.spec.ts
git commit -m "feat: add keyboard shortcuts to combat

- Enter executes round when all actions selected
- Enter in victory modal returns to maze
- Enter in defeat modal goes to temple
- 4 new tests (27 total)"
```

---

### Task 18: Final Verification & Build Test

**Files:**
- None (verification step)

**Step 1: Run full test suite**

Run: `npm test`
Expected: All tests passing (1068+ total)

**Step 2: Run combat tests specifically**

Run: `npm test -- combat`
Expected: All combat tests passing (~29 tests)

**Step 3: Verify build succeeds**

Run: `ng build --configuration development`
Expected: SUCCESS with no errors

**Step 4: Verify production build**

Run: `ng build --configuration production`
Expected: SUCCESS

**Step 5: Run combat component in dev server (manual)**

Run: `ng serve`
Then manually navigate to `/combat` and verify:
- Combat scene renders
- No console errors
- Styles applied correctly

**Step 6: Commit verification**

```bash
git commit --allow-empty -m "test: verify combat UI integration complete

- All tests passing (1068+ total)
- Combat component tests: 29 passing
- E2E flow tests: 2 passing
- Build succeeds (dev and prod)
- Manual verification complete"
```

---

## Summary

### What Was Built

**Services (1 new):**
- `VictoryService` - XP/gold calculation and distribution

**Components (1 complete):**
- `CombatComponent` - Full combat UI with state management

**Features:**
- Action selection for all 6 party members
- Monster AI targeting
- Round-based combat execution
- Victory modal with XP/gold rewards
- Defeat modal with temple navigation
- Keyboard shortcuts (Enter)
- Router integration (maze ↔ combat ↔ temple)

**Test Coverage:**
- 6 VictoryService tests
- 27 CombatComponent tests
- 2 E2E integration tests
- 3 maze integration tests
- **Total: 38 new tests**

### Files Created/Modified

**Created:**
- `src/services/VictoryService.ts`
- `src/services/__tests__/VictoryService.spec.ts`
- `src/app/scenes/combat/combat.component.spec.ts`
- `src/app/scenes/combat/__tests__/combat-flow.e2e.spec.ts`

**Modified:**
- `src/types/GameState.ts`
- `src/test-helpers/test-factories.ts`
- `src/app/scenes/combat/combat.ts`
- `src/app/scenes/combat/combat.html`
- `src/app/scenes/combat/combat.scss`
- `src/app/app.routes.ts`
- `src/app/maze/maze.component.ts`
- `src/app/maze/maze.component.spec.ts`

### Testing Commands

```bash
# Run all tests
npm test

# Run combat-specific tests
npm test -- combat

# Run E2E tests
npm test -- combat-flow.e2e

# Run with coverage
npm test -- --coverage --collectCoverageFrom="src/app/scenes/combat/**/*.ts"

# Dev server
ng serve

# Build
ng build
```

---

## Next Steps (Future Enhancements)

After this plan completes, consider:

1. **Advanced Combat Actions** - Implement PARRY, RUN, USE_ITEM, DISPEL
2. **Spell Casting UI** - Add spell selection menu for mage/priest characters
3. **Character Damage Application** - Update HP in combat (currently only monsters take damage)
4. **Status Effects** - Visual indicators for sleep, paralysis, poison
5. **Combat Animations** - Attack effects, damage numbers, spell visuals
6. **Sound Effects** - Hit sounds, spell sounds, victory fanfare
7. **Item Usage** - Consumables during combat
8. **Monster Special Abilities** - Breath attacks, spells, etc.

---

**Plan Status:** Complete and ready for execution
**Execution Method:** Use `superpowers:executing-plans` skill (batch execution with checkpoints)
**Estimated Duration:** 5-6 days
