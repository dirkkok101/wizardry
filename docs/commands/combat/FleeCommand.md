# FleeCommand

**Command for attempting to flee combat.**

## Responsibility

Attempts to escape from combat encounter. Entire party flees together (not individual characters). Success depends on party vs monster speed, encounter type (fixed encounters cannot be fled), and luck. On success, returns to previous position before encounter. On failure, monsters get free attack round.

## Command Flow

**Preconditions**:
- Game mode must be `COMBAT`
- At least one party member must be alive and conscious
- Cannot flee from fixed encounters (Murphy's Ghosts, Level 10 guardians, Werdna)
- Cannot flee if party is surrounded

**Services Called**:
1. `CombatService.canFlee()` - Check if flee is possible
2. `CombatService.calculateFleeChance()` - Calculate success probability
3. `CombatService.attemptFlee()` - Execute flee attempt
4. `NavigationService.returnToPreviousPosition()` - If successful

**Events Created**:
- `FleeAttemptedEvent` - Party attempted to flee
- `FleeSuccessEvent` - Flee succeeded
- `FleeFailedEvent` - Flee failed

**State Changes**:
- **Success**: `gameState.mode` → `NAVIGATION`, return to previous position
- **Failure**: Monsters get free attack round, combat continues

## API Reference

### execute

Execute flee command.

**Signature**:
```typescript
function execute(state: GameState): GameState
```

**Parameters**:
- `state`: Current game state

**Returns**: New game state (either NAVIGATION mode or continued COMBAT)

**Throws**:
- `InvalidGameModeError` if not in COMBAT mode
- `CannotFleeError` if fixed encounter or surrounded
- `AllDeadError` if entire party dead/paralyzed

**Example**:
```typescript
const command = new FleeCommand()
const newState = command.execute(state)

// If successful:
// newState.mode === 'NAVIGATION'
// newState.party.position === previous position

// If failed:
// newState.mode === 'COMBAT'
// Monsters attacked party
```

## Preconditions

1. **Game Mode Check**:
```typescript
if (state.mode !== 'COMBAT') {
  throw new InvalidGameModeError('Must be in combat to flee')
}
```

2. **Party Conscious Check**:
```typescript
const hasConsciousMembers = state.party.members.some(
  m => m.hp > 0 &&
       !m.status.includes('PARALYZED') &&
       !m.status.includes('ASLEEP')
)

if (!hasConsciousMembers) {
  throw new AllDeadError('No conscious party members to flee')
}
```

3. **Fixed Encounter Check**:
```typescript
if (state.combat.encounterType === 'FIXED') {
  throw new CannotFleeError('Cannot flee from this encounter')
}
```

4. **Surrounded Check**:
```typescript
if (state.combat.surrounded) {
  throw new CannotFleeError('Party is surrounded, cannot flee')
}
```

## Services Used

**CombatService**:
- `canFlee()` - Check if flee possible
- `calculateFleeChance()` - Calculate success rate
- `attemptFlee()` - Execute flee attempt
- `applyFleePenalty()` - Monsters attack if failed

**NavigationService**:
- `returnToPreviousPosition()` - Return to pre-encounter position

**EventService**:
- `createFleeAttemptedEvent()` - Log flee attempt
- `createFleeSuccessEvent()` - Log success
- `createFleeFailedEvent()` - Log failure

## Implementation Example

```typescript
class FleeCommand implements Command {
  execute(state: GameState): GameState {
    // Precondition: Check game mode
    if (state.mode !== 'COMBAT') {
      throw new InvalidGameModeError('Must be in combat to flee')
    }

    // Precondition: Check if can flee
    if (!CombatService.canFlee(state.combat)) {
      throw new CannotFleeError('Cannot flee from this encounter')
    }

    // Precondition: Check party has conscious members
    const hasConsciousMembers = state.party.members.some(
      m => m.hp > 0 && !m.status.includes('PARALYZED')
    )

    if (!hasConsciousMembers) {
      throw new AllDeadError('No conscious party members')
    }

    // Add flee attempted event
    let newState = EventService.addEvent(
      state,
      EventService.createFleeAttemptedEvent()
    )

    // Calculate flee chance
    const fleeChance = CombatService.calculateFleeChance(
      newState.party,
      newState.combat
    )

    // Attempt to flee
    const fleeResult = CombatService.attemptFlee(fleeChance)

    if (fleeResult.success) {
      // Success: Exit combat, return to previous position
      newState = {
        ...newState,
        mode: 'NAVIGATION',
        combat: null,
        party: {
          ...newState.party,
          position: newState.combat.previousPosition
        }
      }

      newState = EventService.addEvent(
        newState,
        EventService.createFleeSuccessEvent()
      )
    } else {
      // Failure: Monsters get free attack round
      newState = CombatService.applyFleePenalty(newState)

      newState = EventService.addEvent(
        newState,
        EventService.createFleeFailedEvent()
      )
    }

    return newState
  }
}
```

## Flee Chance Formula

```typescript
// Base flee chance calculation
const partySpeed = calculatePartySpeed(party) // Average AGI
const monsterSpeed = calculateMonsterSpeed(combat.monsters) // Average AGI

const speedDifference = partySpeed - monsterSpeed

// Base chance: 50%
let fleeChance = 50

// Adjust by speed difference
fleeChance += speedDifference * 5 // ±5% per point difference

// Luck factor (average party LUC)
const avgLuck = calculateAverageLuck(party)
fleeChance += (avgLuck - 10) * 2 // ±2% per LUC point above/below 10

// Clamp to 10-90%
fleeChance = Math.max(10, Math.min(90, fleeChance))
```

**Examples**:
- Fast party (AGI 15) vs slow monsters (AGI 8): ~85% flee chance
- Slow party (AGI 8) vs fast monsters (AGI 15): ~15% flee chance
- Equal speed: ~50% flee chance

## Fixed Encounters (Cannot Flee)

**Encounters that prevent fleeing**:
- **Murphy's Ghosts** (Level 1): Fixed encounter, no escape
- **Level 10 Guardians**: All room guardians, must fight
- **Werdna** (Final Boss): Cannot flee from final battle
- **Surrounded Encounters**: Special scripted events

## Flee Failure Penalty

**When flee fails**:
1. Monsters get free attack round (no party actions)
2. All monsters attack with normal initiative
3. Party takes damage without retaliating
4. Combat continues after penalty round
5. Can attempt to flee again next round

## Strategic Considerations

**When to Flee**:
- Party severely weakened (low HP across party)
- Encounter too tough for current level
- Low on spell points/resources
- Death likely if fight continues

**When NOT to Flee**:
- Fixed encounter (will fail)
- Nearly defeated monsters (finish fight)
- High flee failure chance (penalty round dangerous)
- Need XP/treasure from encounter

**Flee vs Fight to Death**:
- Fleeing preserves party (can return to town)
- Fighting may give XP but risks TPK (total party kill)
- Dead characters need resurrection (expensive)

## Testing

See [FleeCommand.test.ts](../../tests/commands/FleeCommand.test.ts)

**Key test cases**:
- Flee from random encounter (success)
- Flee from random encounter (failure)
- Cannot flee from fixed encounter (throws error)
- Cannot flee when surrounded (throws error)
- All party dead cannot flee (throws error)
- Flee success returns to previous position
- Flee failure applies penalty round
- Flee chance calculation based on AGI difference
- Multiple flee attempts in same combat

## Related

**Services**:
- [CombatService](../services/CombatService.md)
- [NavigationService](../services/NavigationService.md)
- [EncounterService](../services/EncounterService.md)

**Commands**:
- [AttackCommand](./AttackCommand.md)
- [DefendCommand](./DefendCommand.md)
- [CastSpellCommand](./CastSpellCommand.md)

**Game Design**:
- [Combat](../game-design/05-combat.md)
- [Dungeon Exploration](../game-design/06-dungeon.md)

**Systems**:
- [Combat System](../systems/combat-system.md)

**Research**:
- [Combat Formulas](../research/combat-formulas.md)
- [Dungeon Maps Reference](../research/dungeon-maps-reference.md)
