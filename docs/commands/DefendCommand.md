# DefendCommand

**Command for adopting defensive stance in combat.**

## Responsibility

Queues a defend action for a character during combat. Character takes defensive stance, improving armor class (harder to hit) but cannot attack this round. Validates character can defend and adds defend action to round queue.

## Command Flow

**Preconditions**:
- Game mode must be `COMBAT`
- Character must be alive (HP > 0)
- Character must not be paralyzed or asleep

**Services Called**:
1. `CombatService.validateDefender()` - Check character can defend
2. `CombatService.queueAction()` - Add defend to action queue

**Events Created**:
- `DefendQueuedEvent` - Defend action queued

**State Changes**:
- `combat.actionQueue` updated with defend action
- During resolution: Character gets AC bonus (harder to hit)
- Character cannot attack this round (defend is exclusive action)

## API Reference

### constructor

Create defend command.

**Signature**:
```typescript
constructor(characterId: string)
```

**Parameters**:
- `characterId`: ID of defending character

### execute

Execute defend command (queue action).

**Signature**:
```typescript
function execute(state: GameState): GameState
```

**Parameters**:
- `state`: Current game state

**Returns**: New game state with queued defend action

**Throws**:
- `InvalidGameModeError` if not in COMBAT mode
- `InvalidCharacterError` if character invalid/dead/paralyzed

**Example**:
```typescript
const command = new DefendCommand('char-1')
const newState = command.execute(state)

// newState.combat.actionQueue contains defend action
// Character gets AC bonus during resolution
```

## Preconditions

1. **Game Mode Check**:
```typescript
if (state.mode !== 'COMBAT') {
  throw new InvalidGameModeError('Must be in combat to defend')
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

if (character.status.includes('PARALYZED') || character.status.includes('ASLEEP')) {
  throw new InvalidCharacterError('Character cannot act')
}
```

## Services Used

**CombatService**:
- `validateDefender()` - Check character can defend
- `queueAction()` - Add to action queue
- `applyDefendBonus()` - Apply AC bonus during resolution

**EventService**:
- `createDefendQueuedEvent()` - Log defend queued

## Implementation Example

```typescript
class DefendCommand implements Command {
  constructor(private characterId: string) {}

  execute(state: GameState): GameState {
    // Precondition: Check game mode
    if (state.mode !== 'COMBAT') {
      throw new InvalidGameModeError('Must be in combat to defend')
    }

    // Precondition: Validate defender
    const character = state.party.members.find(m => m.id === this.characterId)

    if (!character) {
      throw new InvalidCharacterError('Character not found')
    }

    CombatService.validateDefender(character)

    // Create defend action
    const defendAction: CombatAction = {
      type: 'DEFEND',
      actorId: this.characterId
    }

    // Queue action
    let newState = CombatService.queueAction(state, defendAction)

    // Add event
    newState = EventService.addEvent(
      newState,
      EventService.createDefendQueuedEvent(this.characterId)
    )

    // Check if all actions queued → start resolution
    if (CombatService.allActionsQueued(newState.combat)) {
      newState = CombatService.resolveRound(newState)
    }

    return newState
  }
}
```

## Defend Mechanics

**AC Bonus**:
```typescript
// During resolution, defending character gets AC bonus
const defendBonus = -2 // AC is lower = better (D&D 1st edition)

// Applied before enemy attacks are resolved
character.ac = character.ac + defendBonus // -2 AC bonus
```

**Example**:
- Normal AC: 4
- Defending AC: 2 (harder to hit)

**Duration**: Defend lasts for current round only

**Tradeoff**: Cannot attack while defending

## Defend vs Parry

**Defend**:
- Full defensive stance
- Large AC bonus (-2)
- Cannot attack this round
- Available to all characters

**Parry** (see ParryCommand):
- Focused defense
- AC bonus vs single target
- Can still attack (separate action)
- May have class restrictions

## When to Use Defend

**Strategic Uses**:
- Low HP character needs to survive
- Tank character drawing attacks
- Waiting for healing spell
- Surviving tough encounter
- Priest protecting to heal next round

**Not Recommended**:
- High-damage dealers (better to attack)
- When party has overwhelming advantage
- When need to kill enemies quickly

## Testing

See [DefendCommand.test.ts](../../tests/commands/DefendCommand.test.ts)

**Key test cases**:
- Defend queued successfully
- AC bonus applied during resolution
- Dead character cannot defend (throws error)
- Paralyzed character cannot defend (throws error)
- Defend outside combat (throws error)
- Multiple characters defend same round
- Defend bonus lasts only current round
- Cannot attack while defending

## Related

**Services**:
- [CombatService](../services/CombatService.md)

**Commands**:
- [AttackCommand](./AttackCommand.md)
- [ParryCommand](./ParryCommand.md) - Alternative defensive action
- [CastSpellCommand](./CastSpellCommand.md)

**Game Design**:
- [Combat](../game-design/05-combat.md)

**Systems**:
- [Combat System](../systems/combat-system.md)

**Research**:
- [Combat Formulas](../research/combat-formulas.md)
