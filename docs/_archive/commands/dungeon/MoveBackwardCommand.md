# MoveBackwardCommand

**Command for moving party backward one tile.**

## Responsibility

Moves the party backward one tile (opposite of facing direction). Validates movement is valid, updates party position, triggers tile effects, and checks for random encounters.

## Command Flow

**Preconditions**:
- Game mode must be `NAVIGATION` (not in combat or town)
- Backward tile must be walkable (not a wall)
- Position must be within dungeon bounds

**Services Called**:
1. `NavigationService.canMoveBackward()` - Validate movement
2. `NavigationService.moveBackward()` - Calculate new position
3. `TileService.getTileEffects()` - Check for special tiles
4. `EncounterService.checkEncounter()` - Roll for random encounter
5. `MapService.markExplored()` - Update automap

**Events Created**:
- `PartyMovedEvent` - Party position changed
- `TileDiscoveredEvent` - New tile explored (if not already explored)
- `EncounterTriggeredEvent` - If encounter occurs
- `TileEffectTriggeredEvent` - If special tile

**State Changes**:
- `party.position` updated to new coordinates
- `map.explored[]` updated with new tile
- `gameState.mode` → `COMBAT` if encounter triggered
- Party facing unchanged (still facing same direction)

## API Reference

### execute

Execute backward movement command.

**Signature**:
```typescript
function execute(state: GameState): GameState
```

**Parameters**:
- `state`: Current game state

**Returns**: New game state with updated position

**Throws**:
- `InvalidMoveError` if movement blocked by wall
- `InvalidGameModeError` if not in NAVIGATION mode

**Example**:
```typescript
const command = new MoveBackwardCommand()
const newState = command.execute(state)

// If successful (facing north):
// newState.party.position.y = oldPosition.y - 1
// newState.party.facing = 'north' (unchanged)
```

## Preconditions

1. **Game Mode Check**:
```typescript
if (state.mode !== 'NAVIGATION') {
  throw new InvalidGameModeError('Must be in dungeon to move')
}
```

2. **Wall Check**:
```typescript
const canMove = NavigationService.canMoveBackward(
  state.dungeonData,
  state.currentLevel,
  state.party.position,
  state.party.facing
)

if (!canMove) {
  throw new InvalidMoveError('Wall blocks movement')
}
```

3. **Bounds Check**:
```typescript
const newPos = NavigationService.moveBackward(
  state.party.position,
  state.party.facing
)

if (!NavigationService.isValidPosition(newPos)) {
  throw new InvalidMoveError('Out of bounds')
}
```

## Services Used

**NavigationService**:
- `canMoveBackward()` - Validate backward movement
- `moveBackward()` - Calculate new position
- `isValidPosition()` - Bounds checking

**TileService**:
- `getTileEffects()` - Get special tile effects
- `applyTileEffect()` - Execute tile effects

**EncounterService**:
- `checkEncounter()` - Random encounter roll
- `generateEncounter()` - Create monster groups

**MapService**:
- `markExplored()` - Update automap
- `getTileType()` - Check tile type

**EventService**:
- `createPartyMovedEvent()` - Log movement

## Implementation Example

```typescript
class MoveBackwardCommand implements Command {
  execute(state: GameState): GameState {
    // Precondition: Check game mode
    if (state.mode !== 'NAVIGATION') {
      throw new InvalidGameModeError('Must be in dungeon to move')
    }

    // Precondition: Check if backward movement is valid
    const canMove = NavigationService.canMoveBackward(
      state.dungeonData,
      state.currentLevel,
      state.party.position,
      state.party.facing
    )

    if (!canMove) {
      throw new InvalidMoveError('Wall blocks movement')
    }

    // Calculate new position (backward = opposite direction)
    const newPosition = NavigationService.moveBackward(
      state.party.position,
      state.party.facing
    )

    // Update party position (facing unchanged)
    let newState = {
      ...state,
      party: {
        ...state.party,
        position: newPosition
      }
    }

    // Mark tile as explored
    newState = MapService.markExplored(newState, newPosition)

    // Add movement event
    newState = EventService.addEvent(
      newState,
      EventService.createPartyMovedEvent(newPosition, state.party.facing)
    )

    // Check for special tile effects
    const tileEffects = TileService.getTileEffects(
      state.dungeonData,
      state.currentLevel,
      newPosition
    )

    if (tileEffects) {
      newState = TileService.applyTileEffect(newState, tileEffects)
    }

    // Check for random encounter
    const encounter = EncounterService.checkEncounter(
      state.currentLevel,
      newPosition
    )

    if (encounter) {
      newState = {
        ...newState,
        mode: 'COMBAT',
        combat: EncounterService.generateEncounter(encounter, newState.party)
      }

      newState = EventService.addEvent(
        newState,
        EventService.createEncounterEvent(encounter)
      )
    }

    return newState
  }
}
```

## Testing

See [MoveBackwardCommand.test.ts](../../tests/commands/MoveBackwardCommand.test.ts)

**Key test cases**:
- Move backward in open corridor (success)
- Move backward into wall (throws error)
- Move backward out of bounds (throws error)
- Move backward triggers encounter
- Move backward onto teleporter
- Move backward onto spinner
- Facing direction unchanged after backward movement
- Cannot move backward in TOWN mode
- Cannot move backward in COMBAT mode

## Related

**Services**:
- [NavigationService](../services/NavigationService.md)
- [TileService](../services/TileService.md)
- [EncounterService](../services/EncounterService.md)
- [MapService](../services/MapService.md)

**Commands**:
- [MoveForwardCommand](./MoveForwardCommand.md)
- [StrafeLeftCommand](./StrafeLeftCommand.md)
- [StrafeRightCommand](./StrafeRightCommand.md)

**Game Design**:
- [Dungeon Exploration](../game-design/06-dungeon.md)

**Research**:
- [Dungeon Maps Reference](../research/dungeon-maps-reference.md)
