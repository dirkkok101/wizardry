# AttackCommand

**Command for executing physical attack in combat.**

## Responsibility

Queues a physical attack action for a character during combat. Validates character can attack (alive, not paralyzed, in front row or has ranged weapon), selects target monster group, and adds attack to round action queue.

## Command Flow

**Preconditions**:
- Game mode must be `COMBAT`
- Character must be alive (HP > 0)
- Character must not be paralyzed or asleep
- Front row characters can always melee attack
- Back row characters need ranged weapon to attack
- Target monster group must exist and have living monsters

**Services Called**:
1. `CombatService.validateAttacker()` - Check character can attack
2. `CombatService.validateTarget()` - Check target is valid
3. `CombatService.queueAction()` - Add attack to action queue

**Events Created**:
- `AttackQueuedEvent` - Attack action added to queue

**State Changes**:
- `combat.actionQueue` updated with attack action
- No immediate combat resolution (happens in resolution phase)
- Once all characters/monsters queue actions → resolution phase begins

## API Reference

### constructor

Create attack command.

**Signature**:
```typescript
constructor(characterId: string, targetGroupIndex: number)
```

**Parameters**:
- `characterId`: ID of attacking character
- `targetGroupIndex`: Index of target monster group (0-3)

### execute

Execute attack command (queue action).

**Signature**:
```typescript
function execute(state: GameState): GameState
```

**Parameters**:
- `state`: Current game state

**Returns**: New game state with queued attack

**Throws**:
- `InvalidGameModeError` if not in COMBAT mode
- `InvalidCharacterError` if character invalid/dead/paralyzed
- `InvalidTargetError` if target group invalid
- `InvalidActionError` if back row character without ranged weapon

**Example**:
```typescript
const command = new AttackCommand('char-1', 0) // Character 1 attacks group 0
const newState = command.execute(state)

// newState.combat.actionQueue contains attack action
// Resolution happens when all actions queued
```

## Preconditions

1. **Game Mode Check**:
```typescript
if (state.mode !== 'COMBAT') {
  throw new InvalidGameModeError('Must be in combat to attack')
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

3. **Row and Weapon Check**:
```typescript
const row = PartyService.getCharacterRow(state.party, characterId)

if (row === 'BACK') {
  const weapon = character.equipment.weapon

  if (!weapon || !weapon.ranged) {
    throw new InvalidActionError('Back row character needs ranged weapon')
  }
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
- `validateAttacker()` - Check character can attack
- `validateTarget()` - Check target is valid
- `queueAction()` - Add to action queue

**PartyService**:
- `getCharacterRow()` - Check if character in front/back row

**EventService**:
- `createAttackQueuedEvent()` - Log attack queued

## Implementation Example

```typescript
class AttackCommand implements Command {
  constructor(
    private characterId: string,
    private targetGroupIndex: number
  ) {}

  execute(state: GameState): GameState {
    // Precondition: Check game mode
    if (state.mode !== 'COMBAT') {
      throw new InvalidGameModeError('Must be in combat to attack')
    }

    // Precondition: Validate attacker
    const character = state.party.members.find(m => m.id === this.characterId)

    if (!character) {
      throw new InvalidCharacterError('Character not found')
    }

    CombatService.validateAttacker(character, state.party)

    // Precondition: Validate target
    CombatService.validateTarget(state.combat, this.targetGroupIndex)

    // Create attack action
    const attackAction: CombatAction = {
      type: 'ATTACK',
      actorId: this.characterId,
      targetGroupIndex: this.targetGroupIndex,
      weapon: character.equipment.weapon
    }

    // Queue action
    let newState = CombatService.queueAction(state, attackAction)

    // Add event
    newState = EventService.addEvent(
      newState,
      EventService.createAttackQueuedEvent(this.characterId, this.targetGroupIndex)
    )

    // Check if all actions queued → start resolution
    if (CombatService.allActionsQueued(newState.combat)) {
      newState = CombatService.resolveRound(newState)
    }

    return newState
  }
}
```

## Attack Resolution

**Resolution happens after all actions queued**:

1. **Initiative Phase**: Calculate initiative for all combatants
2. **Sort by Initiative**: Fastest acts first
3. **Execute Actions**: For each combatant in initiative order:
   - Roll to-hit (see CombatService.calculateHitChance)
   - If hit: Roll damage (see CombatService.calculateDamage)
   - Apply damage to target
   - Check for critical hit / decapitation (Ninja)
   - Update combat log

4. **Check Combat End**: All monsters dead = victory, all party dead = defeat

## Multiple Attacks

Some classes get multiple attacks per round:

```typescript
// Fighter/Samurai/Lord: 1 + floor(level/5), max 10
// Ninja: 2 + floor(level/5), max 10
// Others: 1 attack

const attacks = CombatService.getAttacksPerRound(character)

// Each attack queued and resolved separately in initiative order
```

## Testing

See [AttackCommand.test.ts](../../tests/commands/AttackCommand.test.ts)

**Key test cases**:
- Front row character attacks (success)
- Back row character with ranged weapon attacks (success)
- Back row character without ranged weapon (throws error)
- Dead character cannot attack (throws error)
- Paralyzed character cannot attack (throws error)
- Attack queued correctly
- Multiple attacks per round (high-level fighter)
- Target invalid group (throws error)
- Attack outside combat mode (throws error)

## Related

**Services**:
- [CombatService](../services/CombatService.md)
- [AttackService](../services/AttackService.md)
- [DamageService](../services/DamageService.md)
- [InitiativeService](../services/InitiativeService.md)

**Commands**:
- [CastSpellCommand](./CastSpellCommand.md)
- [DefendCommand](./DefendCommand.md)
- [ParryCommand](./ParryCommand.md)
- [FleeCommand](./FleeCommand.md)

**Game Design**:
- [Combat](../game-design/05-combat.md)

**Systems**:
- [Combat System](../systems/combat-system.md)

**Research**:
- [Combat Formulas](../research/combat-formulas.md)
