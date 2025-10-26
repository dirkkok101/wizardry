# StrafeRightCommand

**Command for strafing party right one tile.**

## Responsibility

Moves the party one tile to the right (perpendicular to facing direction) without changing facing direction. Validates movement is valid, updates party position, triggers tile effects, and checks for random encounters.

## Command Flow

**Preconditions**:
- Game mode must be `NAVIGATION` (not in combat or town)
- Right tile must be walkable (not a wall)
- Position must be within dungeon bounds

**Services Called**:
1. `NavigationService.canStrafeRight()` - Validate movement
2. `NavigationService.strafeRight()` - Calculate new position
3. `TileService.getTileEffects()` - Check for special tiles
4. `EncounterService.checkEncounter()` - Roll for random encounter
5. `MapService.markExplored()` - Update automap

**Events Created**:
- `PartyMovedEvent` - Party position changed
- `TileDiscoveredEvent` - New tile explored
- `EncounterTriggeredEvent` - If encounter occurs
- `TileEffectTriggeredEvent` - If special tile

**State Changes**:
- `party.position` updated to new coordinates (right relative to facing)
- `map.explored[]` updated with new tile
- `gameState.mode` → `COMBAT` if encounter triggered
- Party facing unchanged (strafing = sidestep)

## API Reference

### execute

Execute strafe right command.

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
const command = new StrafeRightCommand()
const newState = command.execute(state)

// If successful (facing north):
// newState.party.position.x = oldPosition.x + 1 (moved east)
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
const canMove = NavigationService.canStrafeRight(
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
const newPos = NavigationService.strafeRight(
  state.party.position,
  state.party.facing
)

if (!NavigationService.isValidPosition(newPos)) {
  throw new InvalidMoveError('Out of bounds')
}
```

## Services Used

**NavigationService**:
- `canStrafeRight()` - Validate strafe movement
- `strafeRight()` - Calculate new position
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
class StrafeRightCommand implements Command {
  execute(state: GameState): GameState {
    // Precondition: Check game mode
    if (state.mode !== 'NAVIGATION') {
      throw new InvalidGameModeError('Must be in dungeon to move')
    }

    // Precondition: Check if strafe right is valid
    const canMove = NavigationService.canStrafeRight(
      state.dungeonData,
      state.currentLevel,
      state.party.position,
      state.party.facing
    )

    if (!canMove) {
      throw new InvalidMoveError('Wall blocks movement')
    }

    // Calculate new position (right perpendicular to facing)
    const newPosition = NavigationService.strafeRight(
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

## Movement Direction Examples

**Facing North**:
- Strafe Right → Move East (x + 1)

**Facing East**:
- Strafe Right → Move South (y - 1)

**Facing South**:
- Strafe Right → Move West (x - 1)

**Facing West**:
- Strafe Right → Move North (y + 1)

## Testing

See [StrafeRightCommand.test.ts](../../tests/commands/StrafeRightCommand.test.ts)

**Key test cases**:
- Strafe right in open corridor (success)
- Strafe right into wall (throws error)
- Strafe right out of bounds (throws error)
- Strafe right triggers encounter
- Strafe right onto teleporter
- Strafe right onto spinner
- Facing direction unchanged after strafe
- Correct position update for all 4 facing directions
- Cannot strafe in TOWN mode
- Cannot strafe in COMBAT mode

## Related

**Services**:
- [NavigationService](../services/NavigationService.md)
- [TileService](../services/TileService.md)
- [EncounterService](../services/EncounterService.md)
- [MapService](../services/MapService.md)

**Commands**:
- [MoveForwardCommand](./MoveForwardCommand.md)
- [MoveBackwardCommand](./MoveBackwardCommand.md)
- [StrafeLeftCommand](./StrafeLeftCommand.md)

**Game Design**:
- [Dungeon Exploration](../game-design/06-dungeon.md)

**Research**:
- [Dungeon Maps Reference](../research/dungeon-maps-reference.md)
