# InspectChestCommand

**Command to inspect treasure chest for traps.**

## Responsibility

Allows character to inspect chest for traps before opening. Uses TrapService to calculate success rate based on character class and AGI. Thieves have best inspection ability.

## Command Structure

```typescript
class InspectChestCommand implements Command {
  constructor(
    characterIndex: number,
    chestId: string
  )

  execute(state: GameState): GameState
}
```

## Parameters

**characterIndex**: Index of character in party (0-5)
**chestId**: Unique identifier of chest to inspect

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
  throw new CharacterDeadError('Dead characters cannot inspect chests')
}
```

**Chest Exists**:
```typescript
const chest = findChest(state, chestId)
if (!chest) {
  throw new ChestNotFoundError('No chest at this location')
}
```

**Chest Not Already Opened**:
```typescript
if (chest.opened) {
  throw new ChestAlreadyOpenedError('Chest is already open')
}
```

**Not In Combat**:
```typescript
if (state.combatState) {
  throw new InvalidStateError('Cannot inspect chests during combat')
}
```

## Execution

### 1. Calculate Inspect Chance

```typescript
const inspectChance = TrapService.calculateInspectChance(character)
// Thief (AGI 16): 95%
// Ninja (AGI 24): 95%
// Others (AGI 18): 18%
```

### 2. Attempt Inspection

```typescript
const result = TrapService.attemptInspect(
  character,
  chest,
  state.randomSeed
)
```

### 3. Handle Result

**Success - Trap Identified**:
```typescript
if (result.success && chest.trapped) {
  message = `${character.name} detects a ${result.trapType} trap!`
  // Trap type revealed, can now attempt disarm
}
```

**Success - No Trap**:
```typescript
if (result.success && !chest.trapped) {
  message = `${character.name} finds no traps.`
  // Safe to open
}
```

**Failure - No Information**:
```typescript
if (!result.success && !result.triggered) {
  message = `${character.name} could not determine if trapped.`
  // Can retry or use CALFO
}
```

**Critical Failure - Trap Triggered**:
```typescript
if (result.triggered) {
  message = `${character.name} triggered the trap while inspecting!`
  // Apply trap damage/effects
  applyTrapEffects(state, character, chest.trapType)
}
```

## State Changes

### Update Chest State

```typescript
newState.chests[chestId] = {
  ...chest,
  inspected: true,
  inspectedBy: character.id,
  trapRevealed: result.success && chest.trapped,
  trapType: result.success ? chest.trapType : null
}
```

### Create Event

```typescript
const event = {
  type: 'CHEST_INSPECTED',
  characterId: character.id,
  chestId,
  success: result.success,
  trapFound: result.success && chest.trapped,
  trapType: result.trapType,
  triggered: result.triggered,
  timestamp: Date.now()
}
```

## Examples

### Example 1: Thief Inspects Successfully

```typescript
const state = {
  party: {
    members: [
      { id: 'thief-1', name: 'Lockpick', class: 'Thief', agility: 16, hp: 20 }
    ]
  },
  chests: {
    'chest-1': {
      trapped: true,
      trapType: 'POISON_NEEDLE',
      trapDifficulty: 3
    }
  }
}

const command = new InspectChestCommand(0, 'chest-1')
const newState = command.execute(state)

// Output: "Lockpick detects a POISON_NEEDLE trap!"
// newState.chests['chest-1'].trapRevealed === true
```

### Example 2: Fighter Fails Inspection

```typescript
const state = {
  party: {
    members: [
      { id: 'fighter-1', name: 'Bruiser', class: 'Fighter', agility: 10, hp: 50 }
    ]
  },
  chests: {
    'chest-1': {
      trapped: true,
      trapType: 'GAS_BOMB',
      trapDifficulty: 5
    }
  }
}

const command = new InspectChestCommand(0, 'chest-1')
const newState = command.execute(state)

// Output: "Bruiser could not determine if trapped."
// Inspect chance = 10 × 1 = 10% (likely failed)
```

### Example 3: Inspection Triggers Trap

```typescript
const state = {
  party: {
    members: [
      { id: 'thief-1', name: 'Unlucky', class: 'Thief', agility: 14, hp: 15 }
    ]
  },
  chests: {
    'chest-1': {
      trapped: true,
      trapType: 'CROSSBOW_BOLT',
      trapDifficulty: 7
    }
  }
}

const command = new InspectChestCommand(0, 'chest-1')
const newState = command.execute(state)

// Critical failure (2% chance for Thieves)
// Output: "Unlucky triggered the trap while inspecting!"
// Damage: 2d8 (crossbow bolt)
// newState.party.members[0].hp reduced
```

## Strategic Considerations

### Who Should Inspect?

**Best**: Thief with AGI 16+ (95% success)
**Good**: Ninja with AGI 24 (95% success)
**Poor**: Any other class (low AGI × 1 = poor chance)

### When to Inspect?

✅ **Always**: If you have a Thief with decent AGI
✅ **Before CALFO**: Thieves are free, CALFO costs spell point
⚠️ **Be Careful**: 1-2% chance to trigger trap even for Thieves
❌ **Skip If**: No Thief and low AGI party (use CALFO instead)

### Inspection vs. CALFO

**Inspection Advantages**:
- Free (no spell point cost)
- Can retry if failed (without trigger)
- Thief is available early game

**CALFO Advantages**:
- 95% success (vs. variable inspect chance)
- No trigger risk
- Works for any party member

**Best Strategy**: Use both for double confirmation
1. Thief inspects → "POISON_NEEDLE"
2. Priest casts CALFO → "POISON_NEEDLE"
3. Both agree → Very high confidence
4. Disarm with correct trap type

## Error Handling

**Character Index Out of Range**:
```typescript
throw new InvalidCharacterError(
  `Character index ${characterIndex} out of range (0-${party.members.length - 1})`
)
```

**Dead Character**:
```typescript
throw new CharacterDeadError(
  `${character.name} is dead and cannot inspect chests`
)
```

**Chest Not Found**:
```typescript
throw new ChestNotFoundError(
  `No chest found with ID: ${chestId}`
)
```

**Already Opened**:
```typescript
throw new ChestAlreadyOpenedError(
  'Cannot inspect an already opened chest'
)
```

**In Combat**:
```typescript
throw new InvalidStateError(
  'Cannot inspect chests during combat'
)
```

## Related

**Services**:
- [TrapService](../services/TrapService.md) - Inspection calculations
- [ChestService](../services/ChestService.md) - Chest data

**Commands**:
- [DisarmTrapCommand](./DisarmTrapCommand.md) - Disarm after inspection
- [OpenChestCommand](./OpenChestCommand.md) - Open chest
- [CastSpellCommand](./CastSpellCommand.md) - Cast CALFO spell

**Game Design**:
- [Traps & Chests](../game-design/08-traps-chests.md) - Player guide

**Research**:
- [Trap Mechanics Validation](../research/trap-mechanics-validation.md) - Inspect formulas
