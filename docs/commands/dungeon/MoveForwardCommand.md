# MoveForwardCommand

**Command for moving party forward one tile.**

## Responsibility

Moves the party forward one tile in the current facing direction. Validates movement is valid (no walls, within bounds), updates party position, triggers tile effects, and checks for random encounters.

## Command Flow

**Preconditions**:
- Game mode must be `NAVIGATION` (not in combat or town)
- Forward tile must be walkable (not a wall)
- Position must be within dungeon bounds

**Services Called**:
1. `NavigationService.canMoveForward()` - Validate movement
2. `NavigationService.moveForward()` - Calculate new position
3. `TileService.getTileEffects()` - Check for special tiles
4. `EncounterService.checkEncounter()` - Roll for random encounter
5. `MapService.markExplored()` - Update automap

**Events Created**:
- `PartyMovedEvent` - Party position changed
- `TileDiscoveredEvent` - New tile explored
- `EncounterTriggeredEvent` - If encounter occurs
- `TileEffectTriggeredEvent` - If special tile (teleporter, spinner, etc.)

**State Changes**:
- `party.position` updated to new coordinates
- `map.explored[]` updated with new tile
- `gameState.mode` → `COMBAT` if encounter triggered
- Party facing may change (if spinner)
- Party position may change (if teleporter)

## API Reference

### execute

Execute movement command.

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
const command = new MoveForwardCommand()
const newState = command.execute(state)

// If successful:
// newState.party.position.y = oldPosition.y + 1 (if facing north)
// newState.eventLog contains PartyMovedEvent

// If wall blocks:
// Throws InvalidMoveError
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
const canMove = NavigationService.canMoveForward(
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
const newPos = NavigationService.moveForward(
  state.party.position,
  state.party.facing
)

if (!NavigationService.isValidPosition(newPos)) {
  throw new InvalidMoveError('Out of bounds')
}
```

## Services Used

**NavigationService**:
- `canMoveForward()` - Validate movement
- `moveForward()` - Calculate new position
- `isValidPosition()` - Bounds checking

**TileService**:
- `getTileEffects()` - Get special tile effects
- `applyTileEffect()` - Execute teleporter, spinner, etc.

**EncounterService**:
- `checkEncounter()` - Random encounter roll
- `generateEncounter()` - Create monster groups

**MapService**:
- `markExplored()` - Update automap
- `getTileType()` - Check tile type

**EventService**:
- `createPartyMovedEvent()` - Log movement
- `createEncounterEvent()` - Log encounter

## Implementation Example

```typescript
class MoveForwardCommand implements Command {
  execute(state: GameState): GameState {
    // Precondition: Check game mode
    if (state.mode !== 'NAVIGATION') {
      throw new InvalidGameModeError('Must be in dungeon to move')
    }

    // Precondition: Check if movement is valid
    const canMove = NavigationService.canMoveForward(
      state.dungeonData,
      state.currentLevel,
      state.party.position,
      state.party.facing
    )

    if (!canMove) {
      throw new InvalidMoveError('Wall blocks movement')
    }

    // Calculate new position
    const newPosition = NavigationService.moveForward(
      state.party.position,
      state.party.facing
    )

    // Update party position
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

    // Check for special tile effects (teleporter, spinner, etc.)
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

See [MoveForwardCommand.test.ts](../../tests/commands/MoveForwardCommand.test.ts)

**Key test cases**:
- Move forward in open corridor (success)
- Move forward into wall (throws error)
- Move forward out of bounds (throws error)
- Move forward triggers encounter (mode → COMBAT)
- Move forward onto teleporter (position changes)
- Move forward onto spinner (facing changes)
- Move forward marks tile as explored
- Cannot move in TOWN mode (throws error)
- Cannot move in COMBAT mode (throws error)

## Related

**Services**:
- [NavigationService](../services/NavigationService.md)
- [TileService](../services/TileService.md)
- [EncounterService](../services/EncounterService.md)
- [MapService](../services/MapService.md)

**Commands**:
- [MoveBackwardCommand](./MoveBackwardCommand.md)
- [StrafeLeftCommand](./StrafeLeftCommand.md)
- [StrafeRightCommand](./StrafeRightCommand.md)

**Game Design**:
- [Dungeon Exploration](../game-design/06-dungeon.md)

**Research**:
- [Dungeon Maps Reference](../research/dungeon-maps-reference.md)
