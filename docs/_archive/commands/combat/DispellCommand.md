# DispellCommand

**Pure command for dispelling undead enemies (Turn Undead mechanic).**

## Responsibility

Attempts to instantly destroy a group of undead enemies using divine power. Available only to Priest, Bishop, and Lord classes. This is the classic "Turn Undead" mechanic from D&D adapted to Wizardry.

## Command Flow

**Preconditions** → **Services Called** → **Events Created** → **State Changes**

1. Validate character can use DISPELL (Priest/Bishop/Lord only)
2. Validate target is undead group
3. Calculate dispell success chance based on caster level vs undead level
4. Roll for success
5. On success: Remove undead group from combat (no XP, no treasure)
6. On failure: No effect, action wasted
7. Create DispellEvent
8. Return updated combat state

## API Reference

```typescript
class DispellCommand {
  constructor(
    characterIndex: number,
    targetGroupIndex: number
  )

  execute(state: GameState): GameState
}
```

**Parameters**:
- `characterIndex`: Index of character attempting to dispell (0-5)
- `targetGroupIndex`: Index of undead group to target (0-3)

**Returns**: New GameState with dispell results applied

**Throws**:
- `InvalidModeError` - Not in COMBAT mode
- `InvalidClassError` - Character is not Priest, Bishop, or Lord
- `InvalidTargetError` - Target group is not undead
- `CharacterDeadError` - Character is dead/ashes/lost
- `CharacterParalyzedError` - Character is paralyzed/asleep/petrified

## Preconditions

### 1. Game Mode Validation
```typescript
if (state.mode !== 'COMBAT') {
  throw new InvalidModeError('DISPELL can only be used in combat')
}
```

### 2. Class Restriction Validation
```typescript
const character = state.party.members[characterIndex]

const canDispell = ['Priest', 'Bishop', 'Lord'].includes(character.class)
if (!canDispell) {
  throw new InvalidClassError('Only Priest, Bishop, and Lord can use DISPELL')
}
```

### 3. Character Status Validation
```typescript
if (character.status.includes('dead') ||
    character.status.includes('ashes') ||
    character.status.includes('lost')) {
  throw new CharacterDeadError('Dead characters cannot act')
}

if (character.status.includes('paralyzed') ||
    character.status.includes('asleep') ||
    character.status.includes('petrified')) {
  throw new CharacterParalyzedError('Character cannot act')
}
```

### 4. Target Validation
```typescript
const targetGroup = state.combat.enemyGroups[targetGroupIndex]

if (!targetGroup || targetGroup.monsters.length === 0) {
  throw new InvalidTargetError('Target group is empty or invalid')
}

// Check if target group is undead
const isUndead = DispellService.isUndeadGroup(targetGroup)
if (!isUndead) {
  throw new InvalidTargetError('DISPELL only affects undead enemies')
}
```

## Services Used

### DispellService
```typescript
// Check if group is undead
const isUndead = DispellService.isUndeadGroup(targetGroup)

// Calculate success chance
const successChance = DispellService.calculateDispellChance(
  character.level,
  targetGroup.averageLevel
)

// Attempt to dispell
const success = DispellService.attemptDispell(
  character.level,
  targetGroup.averageLevel,
  state.randomSeed
)
```

### CombatService
```typescript
// Remove undead group from combat on success
const newCombatState = CombatService.removeEnemyGroup(
  state.combat,
  targetGroupIndex
)

// Check if combat is over (all enemies dispelled/defeated)
const combatOver = CombatService.isCombatOver(newCombatState)
```

### EventService
```typescript
const event = EventService.createDispellEvent({
  characterId: character.id,
  characterName: character.name,
  targetGroup: targetGroup.name,
  success: success,
  timestamp: state.timestamp
})
```

## Implementation Example

```typescript
export class DispellCommand implements Command {
  constructor(
    private characterIndex: number,
    private targetGroupIndex: number
  ) {}

  execute(state: GameState): GameState {
    // Validate preconditions
    this.validateMode(state)
    const character = this.validateCharacter(state)
    const targetGroup = this.validateTarget(state)

    // Calculate dispell success
    const success = DispellService.attemptDispell(
      character.level,
      targetGroup.averageLevel,
      state.randomSeed
    )

    // Create combat log entry
    const logEntry = success
      ? `${character.name} dispels ${targetGroup.name}! The undead flee!`
      : `${character.name} fails to dispel ${targetGroup.name}.`

    // Update combat state
    let newCombat = {
      ...state.combat,
      log: [...state.combat.log, logEntry]
    }

    // Remove group if successful
    if (success) {
      newCombat = CombatService.removeEnemyGroup(
        newCombat,
        this.targetGroupIndex
      )
    }

    // Create event
    const event = EventService.createDispellEvent({
      characterId: character.id,
      characterName: character.name,
      targetGroup: targetGroup.name,
      success: success,
      timestamp: state.timestamp
    })

    // Check if combat ends
    const combatOver = CombatService.isCombatOver(newCombat)
    const newMode = combatOver ? 'NAVIGATION' : state.mode

    return {
      ...state,
      mode: newMode,
      combat: newCombat,
      eventLog: [...state.eventLog, event],
      randomSeed: state.randomSeed + 1
    }
  }

  private validateMode(state: GameState): void {
    if (state.mode !== 'COMBAT') {
      throw new InvalidModeError('DISPELL can only be used in combat')
    }
  }

  private validateCharacter(state: GameState): Character {
    const character = state.party.members[this.characterIndex]

    if (!character) {
      throw new InvalidCharacterError('Character not found')
    }

    const canDispell = ['Priest', 'Bishop', 'Lord'].includes(character.class)
    if (!canDispell) {
      throw new InvalidClassError('Only Priest, Bishop, and Lord can use DISPELL')
    }

    if (character.status.includes('dead')) {
      throw new CharacterDeadError('Dead characters cannot act')
    }

    return character
  }

  private validateTarget(state: GameState): EnemyGroup {
    const targetGroup = state.combat.enemyGroups[this.targetGroupIndex]

    if (!targetGroup || targetGroup.monsters.length === 0) {
      throw new InvalidTargetError('Target group is empty')
    }

    if (!DispellService.isUndeadGroup(targetGroup)) {
      throw new InvalidTargetError('DISPELL only affects undead')
    }

    return targetGroup
  }
}
```

## DISPELL Success Formula

```typescript
// From DispellService
DispellChance = (CasterLevel - UndeadLevel) × 10%

// Clamped to 5% - 95% range
const clampedChance = Math.max(5, Math.min(95, baseChance))
```

**Examples**:
- Level 5 Priest vs Level 3 Zombies: (5-3) × 10% = 20%
- Level 10 Lord vs Level 5 Ghouls: (10-5) × 10% = 50%
- Level 15 Bishop vs Level 10 Wraiths: (15-10) × 10% = 50%
- Level 8 Priest vs Level 12 Vampire: (8-12) × 10% = -40% → 5% (minimum)

## Undead Monster Types

DISPELL affects these undead enemies only:

### Common Undead (Levels 1-5)
- **Zombies** (Level 1-2) - Easy to dispel
- **Ghouls** (Level 3-4) - Moderate difficulty
- **Creeping Coins** (Level 2-3) - Cursed treasure
- **Gas Cloud** (Level 4-5) - Incorporeal

### Powerful Undead (Levels 6-10)
- **Spectres** (Level 7-8) - Hard to dispel
- **Wraiths** (Level 8-9) - Very hard to dispel

### Boss Undead (Levels 10+)
- **Vampire** (Level 8-10) - Extremely hard
- **Vampire Lord** (Level 10+) - Nearly impossible (5% chance)

**Non-Undead**: DISPELL has NO effect on living, demonic, or mechanical enemies.

## Effects on Success

### Undead Group Destroyed
- All monsters in target group instantly removed from combat
- **No XP awarded** (dispelled, not defeated in combat)
- **No treasure** (bodies disintegrate/flee)
- Combat log shows: `{character} dispels {group}! The undead flee!`

### Combat May End
If all enemy groups are dispelled/defeated:
- Combat ends immediately
- Party returns to navigation mode
- No victory XP (since dispelled enemies don't count)

## Effects on Failure

- No effect on target group
- Action wasted for this combat round
- Combat log shows: `{character} fails to dispel {group}.`
- Character cannot attempt again this round

## Testing

**Test File**: `tests/commands/DispellCommand.test.ts`

**Key Test Cases**:

1. **Successful dispell removes undead group**
   ```typescript
   test('DispellCommand removes undead group on success', () => {
     const state = createCombatState({ enemyGroups: [zombieGroup] })
     const command = new DispellCommand(0, 0) // Priest at index 0

     // Mock success
     jest.spyOn(DispellService, 'attemptDispell').mockReturnValue(true)

     const result = command.execute(state)

     expect(result.combat.enemyGroups[0].monsters).toHaveLength(0)
   })
   ```

2. **Failed dispell has no effect**
   ```typescript
   test('DispellCommand has no effect on failure', () => {
     const state = createCombatState({ enemyGroups: [zombieGroup] })
     const command = new DispellCommand(0, 0)

     jest.spyOn(DispellService, 'attemptDispell').mockReturnValue(false)

     const result = command.execute(state)

     expect(result.combat.enemyGroups[0].monsters.length)
       .toBe(state.combat.enemyGroups[0].monsters.length)
   })
   ```

3. **Class restriction enforced**
   ```typescript
   test('DispellCommand throws for non-divine classes', () => {
     const state = createCombatState({
       party: createParty([createMage()]) // Mage cannot dispell
     })
     const command = new DispellCommand(0, 0)

     expect(() => command.execute(state))
       .toThrow(InvalidClassError)
   })
   ```

4. **Undead-only restriction**
   ```typescript
   test('DispellCommand throws for non-undead targets', () => {
     const state = createCombatState({
       enemyGroups: [orcGroup] // Orcs are not undead
     })
     const command = new DispellCommand(0, 0) // Priest

     expect(() => command.execute(state))
       .toThrow(InvalidTargetError)
   })
   ```

5. **Success chance based on level difference**
   ```typescript
   test('DispellCommand higher level = better success', () => {
     const lowLevelPriest = createPriest({ level: 3 })
     const highLevelPriest = createPriest({ level: 15 })
     const zombieGroup = createUndeadGroup('Zombies', 2)

     const lowChance = DispellService.calculateDispellChance(3, 2)
     const highChance = DispellService.calculateDispellChance(15, 2)

     expect(highChance).toBeGreaterThan(lowChance)
   })
   ```

6. **Dispell ends combat when all enemies removed**
   ```typescript
   test('DispellCommand ends combat when all groups dispelled', () => {
     const state = createCombatState({
       enemyGroups: [zombieGroup] // Only one group
     })
     const command = new DispellCommand(0, 0)

     jest.spyOn(DispellService, 'attemptDispell').mockReturnValue(true)

     const result = command.execute(state)

     expect(result.mode).toBe('NAVIGATION')
   })
   ```

## Related

**Services**:
- [DispellService](../services/DispellService.md) - Dispell calculation logic
- [CombatService](../services/CombatService.md) - Combat state management
- [EventService](../services/EventService.md) - Event creation

**Commands**:
- [AttackCommand](./AttackCommand.md) - Physical attack alternative
- [CastSpellCommand](./CastSpellCommand.md) - Spell alternative
- [ParryCommand](./ParryCommand.md) - Defensive alternative

**Systems**:
- [Combat System](../systems/combat-system.md) - Combat mechanics overview

**Game Design**:
- [Combat](../game-design/05-combat.md) - Player-facing combat guide

**Research**:
- [Combat Formulas](../research/combat-formulas.md) - Validated formulas
- [Combat Actions Validation](../research/combat-actions-validation.md) - Original game actions
- [Monster Reference](../research/monster-reference.md) - All 96 monsters (undead marked)
