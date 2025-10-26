# DescendStairsCommand

**Command for descending stairs to a deeper dungeon level.**

## Responsibility

Moves party down one dungeon level via stairs, validates stairs exist at current position, and updates party position to destination coordinates.

## Command Flow

### Preconditions
1. Party must be in NAVIGATION mode
2. Current tile must have stairs down
3. Destination level must be valid (levels 1-10)

### Services Called
- `DungeonService.getTile(level, position)` - Get current tile
- `DungeonService.isStairs(tile)` - Check for stairs
- `DungeonService.getStairsDestination(level, position, 'DOWN')` - Get destination

### Events Created
- `DESCEND_STAIRS` event with from/to positions

### State Changes
- `state.party.position.level` increases by 1
- `state.party.position.x` and `state.party.position.y` set to destination coordinates
- `state.party.position.facing` preserved

## API Reference

```typescript
function execute(state: GameState): GameState
```

**Parameters**:
- `state`: Current game state (must be in NAVIGATION mode)

**Returns**: New game state with party on lower level

**Throws**:
- `InvalidStateTransitionError` if not in navigation mode
- `NoStairsError` if no stairs down at current position
- `InvalidLevelError` if already on level 10 (deepest level)

**Example**:
```typescript
const state = createGameState({
  mode: 'NAVIGATION',
  party: {
    position: { x: 0, y: 10, level: 1, facing: 'north' }
  }
})
// Assume stairs down exist at (0, 10, 1) leading to (5, 5, 2)

const result = DescendStairsCommand.execute(state)
// result.party.position === { x: 5, y: 5, level: 2, facing: 'north' }
```

## Preconditions

### State Validation
```typescript
// Must be in navigation mode
if (state.mode !== 'NAVIGATION') {
  throw new InvalidStateTransitionError('Must be in dungeon to use stairs')
}
```

### Stairs Validation
```typescript
// Current tile must have stairs down
const currentTile = DungeonService.getTile(
  state.dungeon.levels[state.party.position.level],
  state.party.position.x,
  state.party.position.y
)

const stairsDirection = DungeonService.isStairs(currentTile)
if (stairsDirection !== 'DOWN') {
  throw new NoStairsError('No stairs down at current position')
}
```

### Level Validation
```typescript
// Cannot descend past level 10
if (state.party.position.level >= 10) {
  throw new InvalidLevelError('Already on deepest level')
}
```

## Services Used

### DungeonService
- `getTile(level, x, y)` - Get tile at current position
- `isStairs(tile)` - Check if tile has stairs ('UP' | 'DOWN' | null)
- `getStairsDestination(level, position, 'DOWN')` - Get destination coordinates
  - Returns: `{ x: number, y: number, level: number, facing: Direction }`

## Events Created

```typescript
{
  type: 'DESCEND_STAIRS',
  timestamp: Date.now(),
  data: {
    fromPosition: { x: 0, y: 10, level: 1, facing: 'north' },
    toPosition: { x: 5, y: 5, level: 2, facing: 'north' },
    partyHP: [
      { characterId: 'char1', hp: 45, maxHP: 50 },
      { characterId: 'char2', hp: 28, maxHP: 30 }
    ]
  }
}
```

## Testing

**Key test cases**:
```typescript
describe('DescendStairsCommand', () => {
  it('moves party down one level', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 0, y: 10, level: 1, facing: 'north' } }
    })
    // Mock stairs at (0, 10, 1) → (5, 5, 2)
    const result = DescendStairsCommand.execute(state)
    expect(result.party.position.level).toBe(2)
  })

  it('updates x,y coordinates to destination', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 0, y: 10, level: 1, facing: 'north' } }
    })
    // Mock stairs destination
    const result = DescendStairsCommand.execute(state)
    expect(result.party.position.x).toBeDefined()
    expect(result.party.position.y).toBeDefined()
  })

  it('preserves facing direction', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 0, y: 10, level: 1, facing: 'east' } }
    })
    const result = DescendStairsCommand.execute(state)
    expect(result.party.position.facing).toBe('east')
  })

  it('throws error if no stairs at position', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 5, y: 5, level: 1, facing: 'north' } }
    })
    // No stairs at (5, 5, 1)
    expect(() => DescendStairsCommand.execute(state))
      .toThrow(NoStairsError)
  })

  it('throws error if stairs go up not down', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 10, y: 10, level: 2, facing: 'north' } }
    })
    // Stairs UP at this position
    expect(() => DescendStairsCommand.execute(state))
      .toThrow(NoStairsError)
  })

  it('throws error if already on level 10', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 0, y: 0, level: 10, facing: 'north' } }
    })
    expect(() => DescendStairsCommand.execute(state))
      .toThrow(InvalidLevelError)
  })

  it('throws error if not in navigation mode', () => {
    const state = createGameState({ mode: 'TOWN' })
    expect(() => DescendStairsCommand.execute(state))
      .toThrow(InvalidStateTransitionError)
  })

  it('creates DESCEND_STAIRS event', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 0, y: 10, level: 1, facing: 'north' } }
    })
    const result = DescendStairsCommand.execute(state)
    const event = result.eventLog[result.eventLog.length - 1]
    expect(event.type).toBe('DESCEND_STAIRS')
  })

  it('can descend multiple levels sequentially', () => {
    let state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 0, y: 10, level: 1, facing: 'north' } }
    })

    // Level 1 → 2
    state = DescendStairsCommand.execute(state)
    expect(state.party.position.level).toBe(2)

    // Navigate to next stairs and descend 2 → 3
    state.party.position = { x: 0, y: 15, level: 2, facing: 'north' }
    state = DescendStairsCommand.execute(state)
    expect(state.party.position.level).toBe(3)
  })
})
```

## Related

**Services**:
- [DungeonService](../services/DungeonService.md) - Stairs and tile data
- [NavigationService](../services/NavigationService.md) - Movement validation

**Commands**:
- [AscendStairsCommand](./AscendStairsCommand.md) - Go up stairs
- [MoveForwardCommand](./MoveForwardCommand.md) - Navigate to stairs
- [EnterDungeonCommand](./EnterDungeonCommand.md) - Enter dungeon

**Research**:
- [Dungeon Maps Reference](../research/dungeon-maps-reference.md) - Stairs locations

**Systems**:
- [Dungeon System](../systems/dungeon-system.md) - Level progression
