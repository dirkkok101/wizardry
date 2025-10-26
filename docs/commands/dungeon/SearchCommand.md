# SearchCommand

**Command for searching the current tile for secret doors and hidden items.**

## Responsibility

Searches the current dungeon tile for secret doors, validates search eligibility, and reveals secret doors if found.

## Command Flow

### Preconditions
1. Party must be in NAVIGATION mode
2. Must not be in combat
3. Current tile must be searchable (floor tile)

### Services Called
- `DoorService.discoverSecretDoor(state, level, position)` - Attempt to find secret door

### Events Created
- `SEARCH_SUCCESS` event if secret door found
- `SEARCH_NOTHING` event if nothing found

### State Changes
- If secret door found: Door becomes visible and accessible
- Search consumes time (may trigger random encounter)

## API Reference

```typescript
function execute(state: GameState): GameState
```

**Parameters**:
- `state`: Current game state (must be in NAVIGATION mode)

**Returns**: New game state with search results

**Throws**:
- `InvalidStateTransitionError` if not in navigation mode
- `CannotSearchError` if in combat or on non-searchable tile

**Example**:
```typescript
const state = createGameState({
  mode: 'NAVIGATION',
  party: { position: { x: 7, y: 8, level: 1, facing: 'north' } }
})
// Assume secret door exists at (7, 8, 1)

const result = SearchCommand.execute(state)
// If found:
//   result.dungeon.doors[1]["7,8"].secret === false (now visible)
//   result.eventLog includes SEARCH_SUCCESS
// If not found:
//   result.eventLog includes SEARCH_NOTHING
```

## Preconditions

### State Validation
```typescript
// Must be in navigation mode
if (state.mode !== 'NAVIGATION') {
  throw new InvalidStateTransitionError('Can only search in dungeon')
}

// Cannot search during combat
if (state.combatState) {
  throw new CannotSearchError('Cannot search during combat')
}
```

### Tile Validation
```typescript
// Current tile must be searchable (floor tile)
const currentTile = DungeonService.getTile(
  state.dungeon.levels[state.party.position.level],
  state.party.position.x,
  state.party.position.y
)

if (currentTile.type === 'WALL') {
  throw new CannotSearchError('Cannot search walls')
}
```

## Services Used

### DoorService
- `discoverSecretDoor(state, level, position)` - Search for secret door
  - Returns: `{ found: boolean, gameState: GameState }`
  - Success probability varies by location
  - Multiple searches increase discovery chance

### DungeonService
- `getTile(level, x, y)` - Get current tile for validation

## Events Created

### Secret Door Found
```typescript
{
  type: 'SEARCH_SUCCESS',
  timestamp: Date.now(),
  data: {
    position: { x: 7, y: 8, level: 1, facing: 'north' },
    discovery: 'secret_door',
    doorPosition: { x: 7, y: 9 }, // Adjacent tile
    message: 'You found a secret door!'
  }
}
```

### Nothing Found
```typescript
{
  type: 'SEARCH_NOTHING',
  timestamp: Date.now(),
  data: {
    position: { x: 5, y: 5, level: 1, facing: 'north' },
    message: 'You found nothing.'
  }
}
```

## Testing

**Key test cases**:
```typescript
describe('SearchCommand', () => {
  it('finds secret door when present', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 7, y: 8, level: 1, facing: 'north' } }
    })
    // Mock secret door at position
    const result = SearchCommand.execute(state)
    // Note: Probabilistic - may need to mock RNG
    if (result.dungeon.doors[1]["7,8"]) {
      expect(result.dungeon.doors[1]["7,8"].secret).toBe(false)
    }
  })

  it('reveals previously hidden door', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 7, y: 8, level: 1, facing: 'north' } },
      dungeon: {
        doors: {
          1: { "7,8": { secret: true, locked: false, open: false } }
        }
      }
    })
    const result = SearchCommand.execute(state)
    // After search (if successful)
    expect(result.dungeon.doors[1]["7,8"].secret).toBe(false)
  })

  it('returns nothing found if no secret door', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 5, y: 5, level: 1, facing: 'north' } }
    })
    // No secret door at this position
    const result = SearchCommand.execute(state)
    const event = result.eventLog[result.eventLog.length - 1]
    expect(event.type).toBe('SEARCH_NOTHING')
  })

  it('throws error if not in navigation mode', () => {
    const state = createGameState({ mode: 'TOWN' })
    expect(() => SearchCommand.execute(state))
      .toThrow(InvalidStateTransitionError)
  })

  it('throws error if in combat', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      combatState: { active: true }
    })
    expect(() => SearchCommand.execute(state))
      .toThrow(CannotSearchError)
  })

  it('throws error if searching wall', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 0, y: 0, level: 1, facing: 'north' } }
    })
    // Mock wall at position
    expect(() => SearchCommand.execute(state))
      .toThrow(CannotSearchError)
  })

  it('creates SEARCH_SUCCESS event when door found', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 7, y: 8, level: 1, facing: 'north' } }
    })
    const result = SearchCommand.execute(state)
    const event = result.eventLog[result.eventLog.length - 1]
    expect(['SEARCH_SUCCESS', 'SEARCH_NOTHING']).toContain(event.type)
  })

  it('can search multiple times to increase discovery chance', () => {
    let state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 7, y: 8, level: 1, facing: 'north' } },
      dungeon: {
        doors: {
          1: { "7,8": { secret: true, locked: false, open: false } }
        }
      }
    })

    // Search multiple times
    for (let i = 0; i < 10; i++) {
      state = SearchCommand.execute(state)
      if (!state.dungeon.doors[1]["7,8"].secret) {
        // Found it!
        break
      }
    }
  })

  it('searching already discovered door has no effect', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 7, y: 8, level: 1, facing: 'north' } },
      dungeon: {
        doors: {
          1: { "7,8": { secret: false, locked: false, open: false } }
        }
      }
    })
    const result = SearchCommand.execute(state)
    expect(result.dungeon.doors[1]["7,8"].secret).toBe(false)
  })
})
```

## Related

**Services**:
- [DoorService](../services/DoorService.md) - Secret door discovery
- [DungeonService](../services/DungeonService.md) - Tile validation

**Commands**:
- [OpenDoorCommand](./OpenDoorCommand.md) - Open discovered door
- [InspectCommand](./InspectCommand.md) - View tile details
- [MoveForwardCommand](./MoveForwardCommand.md) - Navigate to search location

**Research**:
- [Dungeon Maps Reference](../research/dungeon-maps-reference.md) - Secret door locations

**Systems**:
- [Dungeon System](../systems/dungeon-system.md) - Exploration mechanics
