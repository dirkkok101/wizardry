# CastSpellCommand

**Command for casting spell in combat.**

## Responsibility

Queues a spell casting action for a character during combat. Validates character can cast spells, has spell in spell book, has spell points available, and target is valid. Adds spell casting to round action queue.

## Command Flow

**Preconditions**:
- Game mode must be `COMBAT`
- Character must be alive (HP > 0)
- Character must not be silenced, paralyzed, or asleep
- Character must have spell in spell book
- Character must have at least 1 spell point in spell's level
- Spell must be castable in combat (not utility-only)
- Target must be valid for spell's targeting type

**Services Called**:
1. `SpellService.validateCaster()` - Check character can cast
2. `SpellService.hasSpell()` - Check spell in spell book
3. `SpellService.hasSpellPoints()` - Check spell points available
4. `SpellService.validateTarget()` - Check target valid for spell
5. `CombatService.queueAction()` - Add spell to action queue

**Events Created**:
- `SpellQueuedEvent` - Spell casting queued

**State Changes**:
- `combat.actionQueue` updated with spell action
- Spell points NOT deducted yet (deducted during resolution)
- Once all actions queued → resolution phase begins

## API Reference

### constructor

Create cast spell command.

**Signature**:
```typescript
constructor(
  characterId: string,
  spellId: string,
  targetType: TargetType,
  targetIndex?: number
)
```

**Parameters**:
- `characterId`: ID of casting character
- `spellId`: ID of spell to cast (e.g., "halito", "dios")
- `targetType`: "single_enemy", "enemy_group", "all_enemies", "single_ally", "party"
- `targetIndex`: Optional target index (for single target spells)

### execute

Execute cast spell command (queue action).

**Signature**:
```typescript
function execute(state: GameState): GameState
```

**Parameters**:
- `state`: Current game state

**Returns**: New game state with queued spell

**Throws**:
- `InvalidGameModeError` if not in COMBAT mode
- `InvalidCharacterError` if character invalid/dead/silenced
- `SpellNotLearnedError` if spell not in spell book
- `InsufficientSpellPointsError` if no spell points for spell level
- `InvalidTargetError` if target invalid for spell
- `InvalidSpellError` if spell not castable in combat

**Example**:
```typescript
// Cast HALITO (fire spell) on monster group 0
const command = new CastSpellCommand('char-1', 'halito', 'enemy_group', 0)
const newState = command.execute(state)

// newState.combat.actionQueue contains spell action
// Spell points deducted during resolution
```

## Preconditions

1. **Game Mode Check**:
```typescript
if (state.mode !== 'COMBAT') {
  throw new InvalidGameModeError('Must be in combat to cast spell')
}
```

2. **Character Validation**:
```typescript
const character = state.party.members.find(m => m.id === characterId)

if (!character) {
  throw new InvalidCharacterError('Character not found')
}

if (character.hp <= 0) {
  throw new InvalidCharacterError('Character is dead')
}

if (character.status.includes('SILENCED')) {
  throw new InvalidCharacterError('Character is silenced')
}

if (character.status.includes('PARALYZED') || character.status.includes('ASLEEP')) {
  throw new InvalidCharacterError('Character cannot act')
}
```

3. **Spell Book Check**:
```typescript
const hasSpell = SpellService.hasSpell(character, spellId)

if (!hasSpell) {
  throw new SpellNotLearnedError(`Character has not learned ${spellId}`)
}
```

4. **Spell Points Check**:
```typescript
const spell = SpellService.getSpell(spellId)
const hasPoints = SpellService.hasSpellPoints(character, spell.level)

if (!hasPoints) {
  throw new InsufficientSpellPointsError(
    `No spell points for level ${spell.level}`
  )
}
```

5. **Combat Castability Check**:
```typescript
const spell = SpellService.getSpell(spellId)

if (!spell.castableIn.includes('combat')) {
  throw new InvalidSpellError(`${spellId} cannot be cast in combat`)
}
```

6. **Target Validation**:
```typescript
SpellService.validateTarget(
  state.combat,
  spell.target,
  targetType,
  targetIndex
)
```

## Services Used

**SpellService**:
- `validateCaster()` - Check character can cast
- `hasSpell()` - Check spell learned
- `hasSpellPoints()` - Check spell points
- `getSpell()` - Get spell data
- `validateTarget()` - Check target valid
- `deductSpellPoints()` - Deduct points (during resolution)

**CombatService**:
- `queueAction()` - Add to action queue
- `resolveRound()` - Execute queued actions

**SpellCastingService**:
- `resolveSpell()` - Execute spell effect (during resolution)

**EventService**:
- `createSpellQueuedEvent()` - Log spell queued

## Implementation Example

```typescript
class CastSpellCommand implements Command {
  constructor(
    private characterId: string,
    private spellId: string,
    private targetType: TargetType,
    private targetIndex?: number
  ) {}

  execute(state: GameState): GameState {
    // Precondition: Check game mode
    if (state.mode !== 'COMBAT') {
      throw new InvalidGameModeError('Must be in combat to cast spell')
    }

    // Precondition: Validate caster
    const character = state.party.members.find(m => m.id === this.characterId)

    if (!character) {
      throw new InvalidCharacterError('Character not found')
    }

    SpellService.validateCaster(character)

    // Precondition: Check spell learned
    if (!SpellService.hasSpell(character, this.spellId)) {
      throw new SpellNotLearnedError(`Character has not learned ${this.spellId}`)
    }

    // Get spell data
    const spell = SpellService.getSpell(this.spellId)

    // Precondition: Check spell points
    if (!SpellService.hasSpellPoints(character, spell.level)) {
      throw new InsufficientSpellPointsError(
        `No spell points for level ${spell.level}`
      )
    }

    // Precondition: Check combat castability
    if (!spell.castableIn.includes('combat')) {
      throw new InvalidSpellError(`${this.spellId} cannot be cast in combat`)
    }

    // Precondition: Validate target
    SpellService.validateTarget(
      state.combat,
      spell.target,
      this.targetType,
      this.targetIndex
    )

    // Create spell action
    const spellAction: CombatAction = {
      type: 'CAST_SPELL',
      actorId: this.characterId,
      spellId: this.spellId,
      targetType: this.targetType,
      targetIndex: this.targetIndex
    }

    // Queue action
    let newState = CombatService.queueAction(state, spellAction)

    // Add event
    newState = EventService.addEvent(
      newState,
      EventService.createSpellQueuedEvent(
        this.characterId,
        this.spellId,
        this.targetType
      )
    )

    // Check if all actions queued → start resolution
    if (CombatService.allActionsQueued(newState.combat)) {
      newState = CombatService.resolveRound(newState)
    }

    return newState
  }
}
```

## Spell Resolution

**Resolution happens after all actions queued**:

1. **Initiative Phase**: Spell casters act in initiative order
2. **Deduct Spell Points**: Remove 1 point from spell's level
3. **Apply Spell Effect**: Based on spell type:
   - **Offensive**: Deal damage to target(s)
   - **Healing**: Restore HP to target(s)
   - **Buff**: Add status effect (KALKI, PORFIC, etc.)
   - **Debuff**: Add negative status (KATINO sleep, MORLIS paralyze)
4. **Update Combat Log**: Record spell cast and effect

## Common Combat Spells

**Mage Spells**:
- **HALITO** (L1): 1d8 fire damage to group
- **KATINO** (L1): Sleep single enemy group
- **MAHALITO** (L4): 4d6 fire damage to group
- **TILTOWAIT** (L6): 8d8 fire damage to group
- **HAMAN** (L3): Instant kill 1-4 monsters

**Priest Spells**:
- **DIOS** (L1): Heal 1d8 HP to single ally
- **DIAL** (L2): Heal 2d8 HP to party
- **KALKI** (L2): -1 AC to party
- **PORFIC** (L4): -4 AC to single ally
- **BADIOS** (L3): 2d6+2 holy damage to undead group
- **MATU** (L5): -2 AC to party

## Testing

See [CastSpellCommand.test.ts](../../tests/commands/CastSpellCommand.test.ts)

**Key test cases**:
- Cast offensive spell (HALITO) on enemy group
- Cast healing spell (DIOS) on ally
- Cast buff spell (KALKI) on party
- Cast without spell learned (throws error)
- Cast without spell points (throws error)
- Cast while silenced (throws error)
- Cast utility spell in combat (throws error - DUMAPIC, MALOR)
- Invalid target (throws error)
- Spell points deducted during resolution
- Multiple spells queued same round

## Related

**Services**:
- [SpellService](../services/SpellService.md)
- [SpellCastingService](../services/SpellCastingService.md)
- [CombatService](../services/CombatService.md)

**Commands**:
- [AttackCommand](./AttackCommand.md)
- [CastUtilitySpellCommand](./CastUtilitySpellCommand.md) - Non-combat spells

**Game Design**:
- [Spells](../game-design/04-spells.md)
- [Combat](../game-design/05-combat.md)

**Systems**:
- [Spell System](../systems/spell-system.md)
- [Combat System](../systems/combat-system.md)

**Research**:
- [Spell Reference](../research/spell-reference.md)
- [Combat Formulas](../research/combat-formulas.md)
