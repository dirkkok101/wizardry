# ParryCommand

**Command for parrying incoming attack in combat.**

## Responsibility

Queues a parry action for a character during combat. Character focuses on parrying attacks from specific enemy, gaining AC bonus against that enemy's attacks. Unlike defend, parry is more focused and may allow other actions.

## Command Flow

**Preconditions**:
- Game mode must be `COMBAT`
- Character must be alive (HP > 0)
- Character must not be paralyzed or asleep
- Character must have weapon equipped (to parry with)
- Target enemy group must exist

**Services Called**:
1. `CombatService.validateParrier()` - Check character can parry
2. `CombatService.validateTarget()` - Check target valid
3. `CombatService.queueAction()` - Add parry to action queue

**Events Created**:
- `ParryQueuedEvent` - Parry action queued

**State Changes**:
- `combat.actionQueue` updated with parry action
- During resolution: Character gets AC bonus vs specified enemy
- AC bonus only applies to attacks from parried enemy

## API Reference

### constructor

Create parry command.

**Signature**:
```typescript
constructor(characterId: string, targetGroupIndex: number)
```

**Parameters**:
- `characterId`: ID of parrying character
- `targetGroupIndex`: Index of enemy group to parry (0-3)

### execute

Execute parry command (queue action).

**Signature**:
```typescript
function execute(state: GameState): GameState
```

**Parameters**:
- `state`: Current game state

**Returns**: New game state with queued parry action

**Throws**:
- `InvalidGameModeError` if not in COMBAT mode
- `InvalidCharacterError` if character invalid/dead/paralyzed
- `InvalidActionError` if no weapon equipped
- `InvalidTargetError` if target group invalid

**Example**:
```typescript
const command = new ParryCommand('char-1', 0) // Parry attacks from group 0
const newState = command.execute(state)

// newState.combat.actionQueue contains parry action
// Character gets AC bonus vs group 0 attacks
```

## Preconditions

1. **Game Mode Check**:
```typescript
if (state.mode !== 'COMBAT') {
  throw new InvalidGameModeError('Must be in combat to parry')
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

3. **Weapon Check**:
```typescript
if (!character.equipment.weapon) {
  throw new InvalidActionError('Must have weapon equipped to parry')
}
```

4. **Target Validation**:
```typescript
const targetGroup = state.combat.monsterGroups[targetGroupIndex]

if (!targetGroup || targetGroup.monsters.every(m => m.hp <= 0)) {
  throw new InvalidTargetError('Target group invalid or all dead')
}
```

## Services Used

**CombatService**:
- `validateParrier()` - Check character can parry
- `validateTarget()` - Check target valid
- `queueAction()` - Add to action queue
- `applyParryBonus()` - Apply AC bonus during resolution

**EventService**:
- `createParryQueuedEvent()` - Log parry queued

## Implementation Example

```typescript
class ParryCommand implements Command {
  constructor(
    private characterId: string,
    private targetGroupIndex: number
  ) {}

  execute(state: GameState): GameState {
    // Precondition: Check game mode
    if (state.mode !== 'COMBAT') {
      throw new InvalidGameModeError('Must be in combat to parry')
    }

    // Precondition: Validate parrier
    const character = state.party.members.find(m => m.id === this.characterId)

    if (!character) {
      throw new InvalidCharacterError('Character not found')
    }

    CombatService.validateParrier(character)

    // Precondition: Check weapon equipped
    if (!character.equipment.weapon) {
      throw new InvalidActionError('Must have weapon equipped to parry')
    }

    // Precondition: Validate target
    CombatService.validateTarget(state.combat, this.targetGroupIndex)

    // Create parry action
    const parryAction: CombatAction = {
      type: 'PARRY',
      actorId: this.characterId,
      targetGroupIndex: this.targetGroupIndex
    }

    // Queue action
    let newState = CombatService.queueAction(state, parryAction)

    // Add event
    newState = EventService.addEvent(
      newState,
      EventService.createParryQueuedEvent(
        this.characterId,
        this.targetGroupIndex
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

## Parry Mechanics

**AC Bonus vs Parried Enemy**:
```typescript
// During resolution, when enemy from parried group attacks
if (attacker.groupIndex === parryTargetGroupIndex) {
  const parryBonus = -3 // AC lower = better
  defender.ac = defender.ac + parryBonus // -3 AC bonus
}

// Attacks from other groups use normal AC
```

**Example**:
- Normal AC: 4
- Parrying Group 0: AC 1 vs Group 0 attacks, AC 4 vs other groups

**Duration**: Parry lasts for current round only

**Specificity**: Only applies to specified enemy group

## Parry vs Defend

**Parry**:
- Focused defense vs specific enemy
- Large AC bonus (-3) but only vs that enemy
- Requires weapon equipped
- Tactical choice (which enemy to parry)

**Defend** (see DefendCommand):
- General defensive stance
- Moderate AC bonus (-2) vs all enemies
- No weapon required
- Simpler choice

## When to Use Parry

**Strategic Uses**:
- Tough boss enemy hitting hard (focus parry on boss)
- Dragon/high-damage monster in group
- Tank character focusing on specific threat
- High-level fighter with good AGI (better parry chance)

**Not Recommended**:
- Multiple weak enemies (defend better)
- If no weapon equipped
- When need to attack that round

## Testing

See [ParryCommand.test.ts](../../tests/commands/ParryCommand.test.ts)

**Key test cases**:
- Parry queued successfully
- AC bonus applied vs parried enemy
- AC bonus NOT applied vs other enemies
- No weapon equipped (throws error)
- Dead character cannot parry (throws error)
- Paralyzed character cannot parry (throws error)
- Parry outside combat (throws error)
- Invalid target group (throws error)
- Parry bonus lasts only current round

## Related

**Services**:
- [CombatService](../services/CombatService.md)

**Commands**:
- [AttackCommand](./AttackCommand.md)
- [DefendCommand](./DefendCommand.md) - Alternative defensive action
- [CastSpellCommand](./CastSpellCommand.md)

**Game Design**:
- [Combat](../game-design/05-combat.md)

**Systems**:
- [Combat System](../systems/combat-system.md)

**Research**:
- [Combat Formulas](../research/combat-formulas.md)
