# TurnLeftCommand

**Command for turning party 90 degrees to the left.**

## Responsibility

Rotates the party 90 degrees counterclockwise (to the left) without changing position. Updates facing direction only. No tile effects or encounters triggered (turning in place).

## Command Flow

**Preconditions**:
- Game mode must be `NAVIGATION` (not in combat or town)
- No other preconditions (can always turn)

**Services Called**:
1. `NavigationService.turnLeft()` - Calculate new facing direction

**Events Created**:
- `PartyTurnedEvent` - Party facing changed

**State Changes**:
- `party.facing` updated to new direction
- `party.position` unchanged (turning in place)
- No encounter check (turning doesn't trigger encounters)
- No tile effects (not moving to new tile)

## API Reference

### execute

Execute turn left command.

**Signature**:
```typescript
function execute(state: GameState): GameState
```

**Parameters**:
- `state`: Current game state

**Returns**: New game state with updated facing direction

**Throws**:
- `InvalidGameModeError` if not in NAVIGATION mode

**Example**:
```typescript
const command = new TurnLeftCommand()
const newState = command.execute(state)

// If facing north:
// newState.party.facing = 'west'
// newState.party.position = unchanged
```

## Preconditions

1. **Game Mode Check**:
```typescript
if (state.mode !== 'NAVIGATION') {
  throw new InvalidGameModeError('Must be in dungeon to turn')
}
```

**Note**: No wall check needed (turning in place)

## Services Used

**NavigationService**:
- `turnLeft()` - Calculate new facing direction

**EventService**:
- `createPartyTurnedEvent()` - Log turn action

## Implementation Example

```typescript
class TurnLeftCommand implements Command {
  execute(state: GameState): GameState {
    // Precondition: Check game mode
    if (state.mode !== 'NAVIGATION') {
      throw new InvalidGameModeError('Must be in dungeon to turn')
    }

    // Calculate new facing direction (90° left)
    const newFacing = NavigationService.turnLeft(state.party.facing)

    // Update party facing (position unchanged)
    let newState = {
      ...state,
      party: {
        ...state.party,
        facing: newFacing
      }
    }

    // Add turn event
    newState = EventService.addEvent(
      newState,
      EventService.createPartyTurnedEvent(newFacing)
    )

    return newState
  }
}
```

## Turn Direction Examples

**Starting Facing → Turn Left → Result**:

- North → Turn Left → West
- West → Turn Left → South
- South → Turn Left → East
- East → Turn Left → North

## Coordinate System

```
        North (y+1)
           ↑
           |
West ←─────+─────→ East
(x-1)      |      (x+1)
           |
           ↓
       South (y-1)
```

**Turn Left = Counterclockwise 90°**:
- N → W → S → E → N (cycle)

## Testing

See [TurnLeftCommand.test.ts](../../tests/commands/TurnLeftCommand.test.ts)

**Key test cases**:
- Turn left from north → west
- Turn left from west → south
- Turn left from south → east
- Turn left from east → north
- Position unchanged after turn
- No encounter triggered by turning
- Cannot turn in TOWN mode
- Cannot turn in COMBAT mode
- Multiple turns complete 360° cycle

## Related

**Services**:
- [NavigationService](../services/NavigationService.md)

**Commands**:
- [TurnRightCommand](./TurnRightCommand.md)
- [MoveForwardCommand](./MoveForwardCommand.md)
- [MoveBackwardCommand](./MoveBackwardCommand.md)

**Game Design**:
- [Dungeon Exploration](../game-design/06-dungeon.md)
- [Controls](../game-design/12-controls.md)

**Research**:
- [Dungeon Maps Reference](../research/dungeon-maps-reference.md)
