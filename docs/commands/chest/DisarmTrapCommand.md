# DisarmTrapCommand

**Command to disarm identified trap on treasure chest.**

## Responsibility

Allows character to attempt disarming a trap after it has been identified (via inspection or CALFO spell). Uses TrapService to calculate success rate based on character level with significant bonus for Thieves/Ninjas.

## Command Structure

```typescript
class DisarmTrapCommand implements Command {
  constructor(
    characterIndex: number,
    chestId: string,
    trapType: TrapType
  )

  execute(state: GameState): GameState
}
```

## Parameters

**characterIndex**: Index of character in party (0-5)
**chestId**: Unique identifier of chest with trap
**trapType**: Type of trap character is attempting to disarm

## Validation

### Preconditions

**Character Exists**:
```typescript
if (characterIndex < 0 || characterIndex >= party.members.length) {
  throw new InvalidCharacterError('Character index out of range')
}
```

**Character Is Alive**:
```typescript
if (character.hp <= 0) {
  throw new CharacterDeadError('Dead characters cannot disarm traps')
}
```

**Chest Exists**:
```typescript
const chest = findChest(state, chestId)
if (!chest) {
  throw new ChestNotFoundError('No chest at this location')
}
```

**Chest Is Trapped**:
```typescript
if (!chest.trapped) {
  throw new NoTrapError('Chest has no trap to disarm')
}
```

**Chest Not Already Opened**:
```typescript
if (chest.opened) {
  throw new ChestAlreadyOpenedError('Chest is already open')
}
```

**Valid Trap Type**:
```typescript
const validTypes = TrapService.getTrapTypes()
if (!validTypes.includes(trapType)) {
  throw new InvalidTrapTypeError(`Invalid trap type: ${trapType}`)
}
```

**Not In Combat**:
```typescript
if (state.combatState) {
  throw new InvalidStateError('Cannot disarm traps during combat')
}
```

## Execution

### 1. Calculate Disarm Chance

```typescript
const disarmChance = TrapService.calculateDisarmChance(
  character,
  chest.trapDifficulty
)

// Level 1 Thief: effectiveLevel = 1 + 50 = 51
// Level 51 Fighter: effectiveLevel = 51 + 0 = 51
// Same disarm ability!
```

### 2. Attempt Disarm

```typescript
const result = TrapService.attemptDisarm(
  character,
  trapType,
  chest.trapType,
  chest.trapDifficulty,
  state.randomSeed
)
```

### 3. Handle Result

**Success - Trap Disarmed**:
```typescript
if (result.success) {
  message = `${character.name} successfully disarmed the ${trapType} trap!`
  chest.trapped = false
  chest.trapType = null
  // Chest now safe to open
}
```

**Failure - Wrong Trap Type**:
```typescript
if (result.wrongType) {
  message = `${character.name} chose the wrong trap type!`
  // High chance to trigger
  if (result.triggered) {
    applyTrapEffects(state, character, chest.trapType)
  }
}
```

**Failure - Can Retry**:
```typescript
if (!result.success && !result.triggered && !result.wrongType) {
  message = `${character.name} failed to disarm the trap.`
  // Can retry same trap type
  // This means trap type was CORRECT
}
```

**Critical Failure - Trap Triggered**:
```typescript
if (result.triggered && !result.wrongType) {
  message = `${character.name} triggered the trap while disarming!`
  applyTrapEffects(state, character, chest.trapType)
  chest.trapped = false  // Trap is now sprung
}
```

## State Changes

### Update Chest State

```typescript
if (result.success) {
  newState.chests[chestId] = {
    ...chest,
    trapped: false,
    trapType: null,
    disarmed: true,
    disarmedBy: character.id
  }
} else if (result.triggered) {
  newState.chests[chestId] = {
    ...chest,
    trapped: false,  // Trap sprung
    trapType: null
  }
}
```

### Create Event

```typescript
const event = {
  type: 'TRAP_DISARM_ATTEMPT',
  characterId: character.id,
  chestId,
  trapType,
  actualTrapType: chest.trapType,
  success: result.success,
  triggered: result.triggered,
  wrongType: result.wrongType,
  timestamp: Date.now()
}
```

## Examples

### Example 1: Thief Disarms Successfully

```typescript
const state = {
  party: {
    members: [
      { id: 'thief-1', name: 'Lockpick', class: 'Thief', level: 5, hp: 20 }
    ]
  },
  chests: {
    'chest-1': {
      trapped: true,
      trapType: 'POISON_NEEDLE',
      trapDifficulty: 3,
      trapRevealed: true
    }
  }
}

const command = new DisarmTrapCommand(0, 'chest-1', 'POISON_NEEDLE')
const newState = command.execute(state)

// Effective level = 5 + 50 = 55
// Disarm chance = (55 - 3) × 5 = 260% → capped at 95%
// Output: "Lockpick successfully disarmed the POISON_NEEDLE trap!"
// newState.chests['chest-1'].trapped === false
```

### Example 2: Wrong Trap Type Selected

```typescript
const state = {
  party: {
    members: [
      { id: 'thief-1', name: 'Confused', class: 'Thief', level: 5, hp: 20 }
    ]
  },
  chests: {
    'chest-1': {
      trapped: true,
      trapType: 'GAS_BOMB',  // Actual trap
      trapDifficulty: 5
    }
  }
}

const command = new DisarmTrapCommand(0, 'chest-1', 'POISON_NEEDLE')  // Wrong!
const newState = command.execute(state)

// Output: "Confused chose the wrong trap type!"
// Likely triggered: "GAS_BOMB trap triggered!"
// Party takes 2d6 poison damage
```

### Example 3: Fighter Disarms at High Level

```typescript
const state = {
  party: {
    members: [
      { id: 'fighter-1', name: 'Veteran', class: 'Fighter', level: 51, hp: 200 }
    ]
  },
  chests: {
    'chest-1': {
      trapped: true,
      trapType: 'CROSSBOW_BOLT',
      trapDifficulty: 5
    }
  }
}

const command = new DisarmTrapCommand(0, 'chest-1', 'CROSSBOW_BOLT')
const newState = command.execute(state)

// Effective level = 51 + 0 = 51 (same as Level 1 Thief!)
// Disarm chance = (51 - 5) × 5 = 230% → capped at 95%
// Output: "Veteran successfully disarmed the CROSSBOW_BOLT trap!"
```

### Example 4: Retry After Failure

```typescript
const state = {
  party: {
    members: [
      { id: 'thief-1', name: 'Persistent', class: 'Thief', level: 3, hp: 15 }
    ]
  },
  chests: {
    'chest-1': {
      trapped: true,
      trapType: 'STUNNER',
      trapDifficulty: 8  // Very hard
    }
  }
}

// Attempt 1
const command1 = new DisarmTrapCommand(0, 'chest-1', 'STUNNER')
const state2 = command1.execute(state)
// Effective level = 3 + 50 = 53
// Disarm chance = (53 - 8) × 5 = 225% → 95%
// Suppose it fails without triggering

// Output: "Persistent failed to disarm the trap."
// Chest still trapped, but correct trap type confirmed

// Attempt 2 (retry)
const command2 = new DisarmTrapCommand(0, 'chest-1', 'STUNNER')
const state3 = command2.execute(state2)
// Another roll, might succeed this time
// Output: "Persistent successfully disarmed the STUNNER trap!"
```

## Key Mechanics

### Level-Based Success

**Formula**:
```typescript
effectiveLevel = character.level + (isThiefOrNinja ? 50 : 0)
disarmChance% = (effectiveLevel - trapDifficulty) × 5
finalChance% = max(5, min(95, disarmChance))
```

**Implications**:
- **Level 1 Thief** = **Level 51 Fighter** in disarm ability
- Thieves are best early game
- Fighters catch up at very high levels
- Everyone has at least 5% chance (minimum)
- No one has 100% success (max 95%)

### Retry Strategy

**Failed Without Triggering**:
- Means you selected **correct trap type**
- Can retry indefinitely
- Each retry has same success chance
- Small risk of critical failure (trigger)

**Triggered**:
- Trap is now sprung (no longer trapped)
- Cannot retry (trap is gone)
- Chest can now be opened safely

**Wrong Type**:
- High chance to trigger
- Should not retry with same type
- Try different trap type or use CALFO

### Trap Difficulty Scale

| Difficulty | Disarm Chance (L1 Thief) | Disarm Chance (L10 Thief) |
|-----------|--------------------------|---------------------------|
| 1 (Easy) | 95% (capped) | 95% (capped) |
| 3 (Medium) | 95% (capped) | 95% (capped) |
| 5 (Hard) | 95% (capped) | 95% (capped) |
| 8 (Very Hard) | 95% (capped) | 95% (capped) |
| 10 (Extreme) | 95% (capped) | 95% (capped) |

**Note**: Thieves with +50 bonus almost always have 95% success rate!

| Difficulty | Disarm Chance (L1 Fighter) | Disarm Chance (L25 Fighter) |
|-----------|----------------------------|----------------------------|
| 1 (Easy) | 5% (minimum) | 65% |
| 3 (Medium) | 5% (minimum) | 55% |
| 5 (Hard) | 5% (minimum) | 50% |
| 8 (Very Hard) | 5% (minimum) | 40% |
| 10 (Extreme) | 5% (minimum) | 35% |

## Strategic Considerations

### Who Should Disarm?

**Best**: Thief or Ninja (any level, +50 bonus)
**Acceptable**: High-level Fighter (50+)
**Poor**: Low-level non-Thief

### When to Disarm?

✅ **Always Disarm**:
- TELEPORTER (too dangerous to trigger)
- MAGE_BLASTER / PRIEST_BLASTER (can kill casters)
- Party is low HP

⚠️ **Sometimes Disarm**:
- Medium traps (POISON_NEEDLE, GAS_BOMB)
- Have Thief available (95% success)

❌ **Consider Just Opening**:
- Low-risk trap (POISON_NEEDLE)
- High-level party (can tank damage)
- No Thief and trap is uncertain

### Confidence Strategy

**High Confidence** (Inspect + CALFO agree):
- Both identify same trap type
- Disarm with that type
- 95% success for Thief

**Medium Confidence** (Only one source):
- Thief inspect only → Use that type
- CALFO only → Use that type
- Be prepared for possible trigger

**Low Confidence** (Disagree or uncertain):
- Try Thief's result first (higher AGI = better)
- If fails without trigger → correct type, retry
- If triggers → was wrong, learn from it

## Error Handling

**Character Index Out of Range**:
```typescript
throw new InvalidCharacterError(
  `Character index ${characterIndex} out of range`
)
```

**Dead Character**:
```typescript
throw new CharacterDeadError(
  `${character.name} is dead and cannot disarm traps`
)
```

**No Trap**:
```typescript
throw new NoTrapError(
  'Chest has no trap to disarm'
)
```

**Invalid Trap Type**:
```typescript
throw new InvalidTrapTypeError(
  `"${trapType}" is not a valid trap type. Valid types: ${validTypes.join(', ')}`
)
```

## Related

**Services**:
- [TrapService](../services/TrapService.md) - Disarm calculations
- [ChestService](../services/ChestService.md) - Chest data

**Commands**:
- [InspectChestCommand](./InspectChestCommand.md) - Identify trap type
- [OpenChestCommand](./OpenChestCommand.md) - Open after disarming
- [CastSpellCommand](../combat/CastSpellCommand.md) - CALFO for identification

**Game Design**:
- [Traps & Chests](../game-design/08-traps-chests.md) - Player guide

**Research**:
- [Trap Mechanics Validation](../research/trap-mechanics-validation.md) - Disarm formulas
