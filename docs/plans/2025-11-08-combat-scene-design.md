# Combat Scene Design Document

**Date**: 2025-11-08
**Status**: Approved
**Estimated Timeline**: 6 weeks

## Overview

The Combat Scene implements turn-based party combat using a command queue architecture with authentic Wizardry 1 mechanics. This is the core combat experience where parties face randomly encountered monsters and fixed boss battles, with full spell casting, item usage, and strategic action selection.

## Design Decisions

### Core Mechanics

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Architecture** | Command Queue Pattern | Actions as command objects, sorted by initiative, executed sequentially. Flexible, testable, supports undo/replay. |
| **Turn Structure** | Original Wizardry (all select first) | All party members choose actions upfront, then resolve by initiative. Authentic to Wizardry 1, requires planning. |
| **Monster HP** | Roll each time (authentic) | Each encounter rolls HP from min/max range. Authentic variety, true to original. |
| **Fixed Encounters** | Full tracking with defeatedEncounters[] | Updates GameState after victory, prevents respawns, supports boss battles. |
| **Services** | Pure functions (MonsterService, CombatService, SpellService) | 100% testable, no side effects, immutable state updates. |
| **Combat Actions** | All 6 Wizardry actions | Fight, Cast Spell, Parry, Run, Use Item, Dispel - complete authentic combat. |
| **UI Layout** | 40/60 split (monsters left, party right) | Monsters prominently displayed, party with action selectors, combat log below. |

## Architecture

### Type System

**Location**: `src/types/Combat.ts`

```typescript
// Combat command (action in queue)
interface CombatCommand {
  id: string
  actor: Combatant  // Character | MonsterInstance
  type: 'ATTACK' | 'CAST_SPELL' | 'USE_ITEM' | 'PARRY' | 'RUN' | 'DISPEL'
  initiative: number  // Rolled at creation
  target?: Combatant | Combatant[]
  data?: any  // Spell ID, item ID, etc.
}

// Monster instance (rolled HP)
interface MonsterInstance {
  id: string  // Unique instance ID
  monsterId: string  // Reference to monster JSON
  name: string
  hp: number  // Rolled from template min/max
  maxHp: number
  ac: number
  damage: DiceRoll[]
  xp: number
  status: 'ALIVE' | 'DEAD' | 'ASLEEP' | 'PARALYZED'
}

// Combat state (stored in GameState.combat)
interface CombatState {
  monsters: MonsterInstance[]
  commandQueue: CombatCommand[]
  roundNumber: number
  combatLog: string[]  // Last 10 messages
  canFlee: boolean  // False for fixed encounters
}

// Union type for combatants
type Combatant = Character | MonsterInstance

// Attack result
interface AttackResult {
  hit: boolean
  damage: number
  critical: boolean
  message: string
}

// Spell effect result
interface SpellEffect {
  damage?: number[]  // Damage per target
  healing?: number[]  // Healing per target
  status?: StatusEffect[]
  message: string
}

// Combat victory result
interface CombatVictoryResult {
  xpPerCharacter: Map<string, number>
  gold: number
  items?: string[]
}
```

### Service Layer (All Pure Functions)

#### 1. MonsterService

**Responsibility**: Monster data loading and instance creation

```typescript
class MonsterService {
  // Load monster template from JSON
  static loadMonster(monsterId: string): MonsterTemplate

  // Create monster instance with rolled HP
  static createMonsterInstance(monsterId: string): MonsterInstance {
    const template = loadMonster(monsterId)
    const hp = rollInRange(template.hp.min, template.hp.max)
    return {
      ...template,
      hp,
      maxHp: hp,
      id: generateId(),
      status: 'ALIVE'
    }
  }

  // Generate monster group from encounter
  static generateMonsterGroup(monsterId: string): MonsterInstance[] {
    const template = loadMonster(monsterId)
    const count = rollInRange(
      template.numberAppearing.min,
      template.numberAppearing.max
    )
    return Array.from({ length: count }, () =>
      createMonsterInstance(monsterId)
    )
  }
}
```

**Key Features**:
- Loads from `data/monsters/*.json` (100+ monster files)
- Rolls HP from min/max range (authentic variance)
- Generates groups based on numberAppearing range
- Pure function - no side effects

#### 2. CombatService

**Responsibility**: Core combat mechanics (initiative, attacks, damage, rounds)

```typescript
class CombatService {
  // Initialize combat from encounter
  static initiateCombat(
    monsterId: string,
    party: Character[],
    canFlee: boolean
  ): CombatState {
    const monsters = MonsterService.generateMonsterGroup(monsterId)
    return {
      monsters,
      commandQueue: [],
      roundNumber: 1,
      combatLog: [],
      canFlee
    }
  }

  // Calculate initiative
  static calculateInitiative(combatant: Combatant): number {
    // Formula: random(0-9) + AGI_modifier (min 1)
    const agi = combatant.agility || 10
    const agiMod = Math.floor((agi - 10) / 2)
    return Math.max(1, Math.floor(Math.random() * 10) + agiMod)
  }

  // Create command from character action
  static createCommand(
    actor: Character,
    action: ActionType,
    target?: Combatant,
    data?: any
  ): CombatCommand {
    return {
      id: generateId(),
      actor,
      type: action,
      initiative: calculateInitiative(actor),
      target,
      data
    }
  }

  // Monster AI: Select action
  static selectMonsterAction(
    monster: MonsterInstance,
    party: Character[]
  ): CombatCommand {
    // Basic AI: Always attack random front row member
    const frontRow = party.filter(c =>
      party.formation.frontRow.includes(c.id) && c.hp > 0
    )
    const target = frontRow[Math.floor(Math.random() * frontRow.length)]

    return createCommand(monster, 'ATTACK', target)
  }

  // Resolve attack
  static resolveAttack(
    attacker: Combatant,
    defender: Combatant
  ): AttackResult {
    // Hit chance: (attackBonus + defenderAC + 29) × 5% (capped at 95%)
    const attackBonus = getAttackBonus(attacker)
    const hitChance = Math.min(95, (attackBonus + defender.ac + 29) * 5)
    const roll = Math.random() * 100

    if (roll >= hitChance) {
      return { hit: false, damage: 0, critical: false, message: 'Miss!' }
    }

    // Roll damage
    const baseDamage = rollDamage(attacker)
    const strMod = getStrengthModifier(attacker)
    const damage = Math.max(1, baseDamage + strMod)

    // Critical hit on natural 95+
    const critical = roll >= 95
    const finalDamage = critical ? damage * 2 : damage

    return {
      hit: true,
      damage: finalDamage,
      critical,
      message: critical ? 'Critical Hit!' : `${finalDamage} damage!`
    }
  }

  // Execute single command
  static executeCommand(
    state: CombatState,
    command: CombatCommand
  ): { newState: CombatState; message: string } {
    // Handle ATTACK, CAST_SPELL, etc.
    // Return updated state + message
  }

  // Execute full round
  static executeRound(state: CombatState): {
    newState: CombatState
    messages: string[]
    victory: boolean
    defeat: boolean
  } {
    // Sort queue by initiative (descending)
    const sortedQueue = [...state.commandQueue].sort(
      (a, b) => b.initiative - a.initiative
    )

    let currentState = { ...state, commandQueue: [] }
    const messages: string[] = []

    // Execute each command
    for (const command of sortedQueue) {
      // Skip if actor is dead
      if (command.actor.status === 'DEAD') continue

      const result = executeCommand(currentState, command)
      currentState = result.newState
      messages.push(result.message)

      // Check victory/defeat after each action
      const allMonstersDead = currentState.monsters.every(m => m.status === 'DEAD')
      const allPartyDead = /* check party */

      if (allMonstersDead) return { newState: currentState, messages, victory: true, defeat: false }
      if (allPartyDead) return { newState: currentState, messages, victory: false, defeat: true }
    }

    return {
      newState: { ...currentState, roundNumber: currentState.roundNumber + 1 },
      messages,
      victory: false,
      defeat: false
    }
  }
}
```

**Key Features**:
- Initiative: `random(0-9) + AGI_modifier` (min 1)
- Hit chance: `(attackBonus + defenderAC + 29) × 5%` (capped at 95%)
- Damage: `weaponDice + STR_modifier`
- Critical hits on 95+ roll (double damage)
- Command queue execution with victory/defeat detection

#### 3. SpellService

**Responsibility**: Spell casting validation, point management, effect resolution

```typescript
class SpellService {
  // Validate spell can be cast
  static canCastSpell(caster: Character, spellId: string): {
    canCast: boolean
    reason?: string
  } {
    const spell = loadSpell(spellId)
    const spellPoints = caster.spellPoints?.[spell.level] || 0

    if (spellPoints < 1) {
      return { canCast: false, reason: 'Insufficient spell points' }
    }

    if (caster.status === 'ASLEEP' || caster.status === 'PARALYZED') {
      return { canCast: false, reason: 'Cannot cast while incapacitated' }
    }

    return { canCast: true }
  }

  // Deduct spell points
  static deductSpellPoints(caster: Character, spellId: string): Character {
    const spell = loadSpell(spellId)
    const newSpellPoints = { ...caster.spellPoints }
    newSpellPoints[spell.level] = (newSpellPoints[spell.level] || 0) - 1

    return { ...caster, spellPoints: newSpellPoints }
  }

  // Resolve spell effect
  static resolveSpellEffect(
    spell: Spell,
    caster: Character,
    targets: Combatant[]
  ): SpellEffect {
    if (spell.type === 'offensive') {
      const damage = targets.map(() => rollDice(spell.damage))
      return {
        damage,
        message: `${spell.name} deals ${damage.join(', ')} damage!`
      }
    }

    // Handle healing, buffs, debuffs, etc.
  }
}
```

**Key Features**:
- Spell point validation (per level pools)
- Status effect checking (can't cast if asleep/paralyzed)
- Damage/healing resolution
- Effect type handling (offensive, defensive, utility)

### Component Layer

#### CombatComponent

**Location**: `src/app/combat/combat.component.ts`

**Responsibility**: Main combat scene orchestrator

**State Management**:
```typescript
class CombatComponent {
  // Signals from GameStateService
  readonly combatState = computed(() => this.gameState.state().combat)
  readonly party = computed(() => this.gameState.state().party)
  readonly partyCharacters = computed(() => /* map to Characters */)
  readonly monsters = computed(() => this.combatState()?.monsters || [])

  // Local UI state
  readonly selectedActions = signal<Map<string, CombatCommand>>(new Map())
  readonly combatLog = signal<string[]>([])
  readonly showingResults = signal<boolean>(false)
  readonly isExecutingRound = signal<boolean>(false)

  // Computed
  readonly allActionsSelected = computed(() =>
    this.partyCharacters().every(char => this.selectedActions().has(char.id))
  )

  readonly canExecuteRound = computed(() =>
    this.allActionsSelected() && !this.isExecutingRound()
  )
}
```

**Key Methods**:
```typescript
// Handle action selection for character
selectAction(charId: string, action: ActionType, target?: Combatant, data?: any): void {
  const char = this.partyCharacters().find(c => c.id === charId)
  const command = CombatService.createCommand(char, action, target, data)

  this.selectedActions.update(actions => {
    const newActions = new Map(actions)
    newActions.set(charId, command)
    return newActions
  })
}

// Execute combat round
executeRound(): void {
  this.isExecutingRound.set(true)

  const state = this.combatState()!
  const allCommands = [
    ...Array.from(this.selectedActions().values()),
    ...state.monsters.map(m => CombatService.selectMonsterAction(m, this.partyCharacters()))
  ]

  const newState = { ...state, commandQueue: allCommands }
  const result = CombatService.executeRound(newState)

  // Update game state
  this.gameState.updateState(s => ({ ...s, combat: result.newState }))

  // Update combat log
  this.combatLog.update(log => [...log, ...result.messages].slice(-10))

  // Clear selections
  this.selectedActions.set(new Map())
  this.isExecutingRound.set(false)

  // Check victory/defeat
  if (result.victory) this.handleVictory()
  if (result.defeat) this.handleDefeat()
}

// Handle victory
handleVictory(): void {
  const xp = this.monsters().reduce((sum, m) => sum + m.xp, 0)
  const xpPerChar = Math.floor(xp / this.partyCharacters().length)
  const gold = this.monsters().reduce((sum, m) => sum + (m.gold || 0), 0)

  this.gameState.updateState(state => {
    const newRoster = new Map(state.roster)

    // Distribute XP
    state.party.members.forEach(charId => {
      const char = newRoster.get(charId)!
      newRoster.set(charId, { ...char, xp: char.xp + xpPerChar })
    })

    // Add gold
    const newParty = { ...state.party, gold: state.party.gold + gold }

    // Track defeated fixed encounter
    let defeatedEncounters = state.dungeon.defeatedEncounters
    if (state.encounterMetadata?.isFixed) {
      const key = `${state.encounterMetadata.position.x}_${state.encounterMetadata.position.y}`
      defeatedEncounters = [...defeatedEncounters, key]
    }

    return {
      ...state,
      roster: newRoster,
      party: newParty,
      dungeon: { ...state.dungeon, defeatedEncounters },
      combat: undefined,
      encounterMetadata: undefined
    }
  })

  // Show victory modal
  this.showVictoryModal({ xpPerCharacter: xpPerChar, gold, items: [] })

  // Return to maze after 2 seconds
  setTimeout(() => this.router.navigate(['/maze']), 2000)
}

// Handle defeat (party wipe)
handleDefeat(): void {
  this.gameState.updateState(state => {
    const newRoster = new Map(state.roster)

    // Mark all party members as dead
    state.party.members.forEach(charId => {
      const char = newRoster.get(charId)!
      newRoster.set(charId, { ...char, status: 'DEAD', hp: 0 })
    })

    return {
      ...state,
      roster: newRoster,
      combat: undefined,
      encounterMetadata: undefined
    }
  })

  // Navigate to temple for resurrection
  this.router.navigate(['/temple'])
}
```

### UI Layout

```
┌─────────────────────────────────────────────────────┐
│ COMBAT - ROUND 3                                    │
├──────────────────────────┬──────────────────────────┤
│ MONSTERS (40%)           │ PARTY (60%)              │
│                          │                          │
│ 🔴 Kobold #1 (5/7 HP)    │ [Char 1] HP: 12/15  AC:5│
│ 🔴 Kobold #2 (3/7 HP)    │ ⚔️  Fight → Kobold #1   │
│ 🔴 Kobold #3 (7/7 HP)    │                          │
│ ⚫ Kobold #4 (DEAD)      │ [Char 2] HP: 10/12  AC:6│
│                          │ 🛡️  Parry                │
│                          │                          │
│                          │ [Char 3] HP: 8/10   AC:4│
│                          │ ✨ HALITO → All enemies │
├──────────────────────────┴──────────────────────────┤
│ Combat Log:                                         │
│ > Char 1 attacks Kobold #1 for 4 damage!           │
│ > Kobold #2 attacks Char 1 for 2 damage!           │
│ > Char 3 casts HALITO for 6 damage to all!         │
│ > Kobold #3 dies!                                   │
│ (Last 10 messages, auto-scroll)                    │
├─────────────────────────────────────────────────────┤
│ [Execute Round] [Run Away]                          │
└─────────────────────────────────────────────────────┘
```

**Key UI Components**:
- `MonsterListComponent`: Monster display with HP bars
- `CombatCharacterCardComponent`: Character with action selector
- `ActionSelectorComponent`: Fight/Cast/Parry/Run/Item/Dispel menu
- `CombatLogComponent`: Scrolling message log

## Data Flow & Integration

### Encounter → Combat Flow

**In maze.component.ts**:
```typescript
private checkForEncounter(): void {
  const encounterOccurs = EncounterService.rollRandomEncounter()
  if (!encounterOccurs) return

  const table = EncounterService.getEncounterTable(this.currentLevel())
  const monsterId = EncounterService.selectMonster(table)

  // Initialize combat state
  this.gameState.updateState(state => ({
    ...state,
    combat: CombatService.initiateCombat(
      monsterId,
      this.partyCharacters(),
      true  // canFlee = true for random encounters
    ),
    encounterMetadata: {
      monsterId,
      isFixed: false,
      position: state.dungeon.position
    }
  }))

  // Navigate to combat
  this.router.navigate(['/combat'])
}
```

### Combat Victory → GameState Update

**See handleVictory() above** - Updates XP, gold, defeatedEncounters[]

### Combat Defeat → Temple Navigation

**See handleDefeat() above** - Marks party dead, navigates to temple

## Testing Strategy

### Service Unit Tests (100% Coverage)

**MonsterService.spec.ts**:
```typescript
describe('MonsterService', () => {
  it('loads monster template from JSON', () => {
    const kobold = MonsterService.loadMonster('kobold')
    expect(kobold.id).toBe('kobold')
    expect(kobold.ac).toBe(8)
    expect(kobold.hp).toEqual({ min: 3, max: 7 })
  })

  it('rolls HP within min/max range', () => {
    const instances = Array.from({ length: 100 }, () =>
      MonsterService.createMonsterInstance('kobold')
    )
    instances.forEach(m => {
      expect(m.hp).toBeGreaterThanOrEqual(3)
      expect(m.hp).toBeLessThanOrEqual(7)
      expect(m.maxHp).toBe(m.hp)
    })
  })

  it('generates correct group size', () => {
    // Kobold: 3-5 monsters
    const group = MonsterService.generateMonsterGroup('kobold')
    expect(group.length).toBeGreaterThanOrEqual(3)
    expect(group.length).toBeLessThanOrEqual(5)
  })
})
```

**CombatService.spec.ts** (30+ tests):
```typescript
describe('CombatService', () => {
  describe('initiative', () => {
    it('calculates with AGI modifier', () => {
      const char = createTestCharacter({ agility: 18 })  // +4 mod
      const results = Array.from({ length: 100 }, () =>
        CombatService.calculateInitiative(char)
      )
      results.forEach(init => {
        expect(init).toBeGreaterThanOrEqual(5)  // min 1, but +4 mod
        expect(init).toBeLessThanOrEqual(13)    // max 9 + 4
      })
    })

    it('has minimum of 1', () => {
      const char = createTestCharacter({ agility: 3 })  // -4 mod
      const init = CombatService.calculateInitiative(char)
      expect(init).toBeGreaterThanOrEqual(1)
    })
  })

  describe('attack resolution', () => {
    it('calculates hit chance correctly', () => {
      const attacker = createTestCharacter({ level: 5 })  // Attack bonus ~5
      const defender = createMonsterInstance('kobold')    // AC 8

      // Hit chance: (5 + 8 + 29) × 5% = 42 × 5% = 210% → capped at 95%
      // This is wrong formula - need to check docs
    })

    it('caps hit chance at 95%', () => {
      // Test with very high attack bonus
    })

    it('applies critical hits correctly', () => {
      // Test damage doubling on critical
    })
  })

  describe('round execution', () => {
    it('executes commands in initiative order', () => {
      const state = createTestCombatState()
      const cmd1 = { ...createTestCommand(), initiative: 5 }
      const cmd2 = { ...createTestCommand(), initiative: 10 }
      const cmd3 = { ...createTestCommand(), initiative: 7 }

      state.commandQueue = [cmd1, cmd2, cmd3]
      const result = CombatService.executeRound(state)

      // Verify execution order in messages: cmd2, cmd3, cmd1
    })

    it('skips dead combatants', () => {
      const state = createTestCombatState()
      const deadChar = { ...createTestCharacter(), status: 'DEAD' }
      const cmd = { ...createTestCommand(), actor: deadChar }

      state.commandQueue = [cmd]
      const result = CombatService.executeRound(state)

      expect(result.messages).toHaveLength(0)
    })

    it('detects victory when all monsters dead', () => {
      const state = createTestCombatState()
      state.monsters = state.monsters.map(m => ({ ...m, status: 'DEAD' }))

      const result = CombatService.executeRound(state)
      expect(result.victory).toBe(true)
    })
  })
})
```

### Integration Tests

```typescript
describe('Combat Flow Integration', () => {
  it('completes full combat from encounter to victory', async () => {
    // 1. Start in maze
    // 2. Trigger encounter
    // 3. Navigate to combat
    // 4. Select actions for all party members
    // 5. Execute rounds until victory
    // 6. Verify XP/gold distributed
    // 7. Return to maze
  })

  it('tracks defeated fixed encounter', async () => {
    // 1. Trigger fixed encounter (Murphy's Ghost)
    // 2. Win combat
    // 3. Verify defeatedEncounters[] updated
    // 4. Return to same position
    // 5. Verify no re-encounter
  })

  it('handles party wipe', async () => {
    // 1. Enter combat
    // 2. Let monsters kill all party
    // 3. Verify defeat detected
    // 4. Navigate to temple
    // 5. Verify all characters marked dead
  })
})
```

### Performance Requirements

- Test suite: <3 seconds total
- Combat round execution: <100ms per round
- Initiative calculation: <10ms for 11 combatants
- Monster group generation: <50ms

## Error Handling & Edge Cases

1. **Party member dies during action selection**
   → Disable their action selector, auto-skip their turn

2. **All party members die (party wipe)**
   → Detect in executeRound(), navigate to temple

3. **All monsters killed mid-round**
   → Detect in executeRound(), trigger victory

4. **Spell casting with insufficient points**
   → Validate before creating command, show error

5. **Fleeing from un-fleeable encounter**
   → Disable Run button when canFlee: false

6. **Invalid target selection (dead monster)**
   → Filter dead combatants from target list

7. **Monster data missing**
   → Throw error in MonsterService.loadMonster()

## Implementation Phases

### Phase 1: Type System & Monster Service (Week 1)
- Create `src/types/Combat.ts`
- Implement `MonsterService.ts` with 100% test coverage
- Target: 50+ passing tests

### Phase 2: CombatService Core (Week 2)
- Initiative calculation
- Attack resolution (hit chance, damage)
- Round execution
- Target: 100+ passing tests

### Phase 3: SpellService & Effects (Week 3)
- Spell casting mechanics
- Spell point management
- Spell effect resolution
- Target: 150+ passing tests

### Phase 4: Combat Component UI (Week 4)
- Replace combat-stub
- Monster list, action selectors
- Combat log
- Target: Basic combat playable

### Phase 5: Polish & Integration (Week 5)
- Victory/defeat modals
- XP/gold distribution
- Fixed encounter tracking
- Run/flee mechanics

### Phase 6: Testing & Performance (Week 6)
- Integration tests
- Edge cases
- Performance optimization
- Bug fixes

## Success Criteria

- [ ] All services at 100% test coverage
- [ ] 200+ tests passing in <3 seconds
- [ ] Complete combat: encounter → victory/defeat
- [ ] XP/gold distribution working
- [ ] Fixed encounter tracking (defeatedEncounters[])
- [ ] All 6 actions functional (Fight/Cast/Parry/Run/Item/Dispel)
- [ ] Original turn structure (all select, resolve by initiative)
- [ ] Transitions: maze ↔️ combat ↔️ temple
- [ ] Monster HP rolled authentically
- [ ] Party wipe handled correctly

---

**Document Status**: Approved for implementation
**Next Steps**: Create detailed implementation plan, then execute with subagent-driven development
