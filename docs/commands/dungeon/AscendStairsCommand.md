# AscendStairsCommand

**Command for ascending stairs to a higher dungeon level.**

## Responsibility

Moves party up one dungeon level via stairs, validates stairs exist at current position, and updates party position to destination coordinates.

## Command Flow

### Preconditions
1. Party must be in NAVIGATION mode
2. Current tile must have stairs up
3. Destination level must be valid (levels 1-10)

### Services Called
- `DungeonService.getTile(level, position)` - Get current tile
- `DungeonService.isStairs(tile)` - Check for stairs
- `DungeonService.getStairsDestination(level, position, 'UP')` - Get destination

### Events Created
- `ASCEND_STAIRS` event with from/to positions

### State Changes
- `state.party.position.level` decreases by 1
- `state.party.position.x` and `state.party.position.y` set to destination coordinates
- `state.party.position.facing` preserved

## API Reference

```typescript
function execute(state: GameState): GameState
```

**Parameters**:
- `state`: Current game state (must be in NAVIGATION mode)

**Returns**: New game state with party on higher level

**Throws**:
- `InvalidStateTransitionError` if not in navigation mode
- `NoStairsError` if no stairs up at current position
- `InvalidLevelError` if already on level 1 (use EnterTownCommand instead)

**Example**:
```typescript
const state = createGameState({
  mode: 'NAVIGATION',
  party: {
    position: { x: 5, y: 5, level: 2, facing: 'south' }
  }
})
// Assume stairs up exist at (5, 5, 2) leading to (0, 10, 1)

const result = AscendStairsCommand.execute(state)
// result.party.position === { x: 0, y: 10, level: 1, facing: 'south' }
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
// Current tile must have stairs up
const currentTile = DungeonService.getTile(
  state.dungeon.levels[state.party.position.level],
  state.party.position.x,
  state.party.position.y
)

const stairsDirection = DungeonService.isStairs(currentTile)
if (stairsDirection !== 'UP') {
  throw new NoStairsError('No stairs up at current position')
}
```

### Level Validation
```typescript
// Cannot ascend from level 1 (use EnterTownCommand instead)
if (state.party.position.level <= 1) {
  throw new InvalidLevelError('Already on level 1. Use EnterTownCommand to return to town.')
}
```

## Services Used

### DungeonService
- `getTile(level, x, y)` - Get tile at current position
- `isStairs(tile)` - Check if tile has stairs ('UP' | 'DOWN' | null)
- `getStairsDestination(level, position, 'UP')` - Get destination coordinates
  - Returns: `{ x: number, y: number, level: number, facing: Direction }`

## Events Created

```typescript
{
  type: 'ASCEND_STAIRS',
  timestamp: Date.now(),
  data: {
    fromPosition: { x: 5, y: 5, level: 2, facing: 'south' },
    toPosition: { x: 0, y: 10, level: 1, facing: 'south' },
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
describe('AscendStairsCommand', () => {
  it('moves party up one level', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 5, y: 5, level: 2, facing: 'south' } }
    })
    // Mock stairs at (5, 5, 2) → (0, 10, 1)
    const result = AscendStairsCommand.execute(state)
    expect(result.party.position.level).toBe(1)
  })

  it('updates x,y coordinates to destination', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 5, y: 5, level: 2, facing: 'south' } }
    })
    // Mock stairs destination
    const result = AscendStairsCommand.execute(state)
    expect(result.party.position.x).toBeDefined()
    expect(result.party.position.y).toBeDefined()
  })

  it('preserves facing direction', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 5, y: 5, level: 2, facing: 'west' } }
    })
    const result = AscendStairsCommand.execute(state)
    expect(result.party.position.facing).toBe('west')
  })

  it('throws error if no stairs at position', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 10, y: 10, level: 2, facing: 'north' } }
    })
    // No stairs at (10, 10, 2)
    expect(() => AscendStairsCommand.execute(state))
      .toThrow(NoStairsError)
  })

  it('throws error if stairs go down not up', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 0, y: 10, level: 1, facing: 'north' } }
    })
    // Stairs DOWN at this position
    expect(() => AscendStairsCommand.execute(state))
      .toThrow(NoStairsError)
  })

  it('throws error if on level 1 (use EnterTownCommand)', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 0, y: 0, level: 1, facing: 'north' } }
    })
    expect(() => AscendStairsCommand.execute(state))
      .toThrow(InvalidLevelError)
  })

  it('throws error if not in navigation mode', () => {
    const state = createGameState({ mode: 'TOWN' })
    expect(() => AscendStairsCommand.execute(state))
      .toThrow(InvalidStateTransitionError)
  })

  it('creates ASCEND_STAIRS event', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 5, y: 5, level: 2, facing: 'south' } }
    })
    const result = AscendStairsCommand.execute(state)
    const event = result.eventLog[result.eventLog.length - 1]
    expect(event.type).toBe('ASCEND_STAIRS')
  })

  it('can ascend multiple levels sequentially', () => {
    let state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 5, y: 5, level: 3, facing: 'south' } }
    })

    // Level 3 → 2
    state = AscendStairsCommand.execute(state)
    expect(state.party.position.level).toBe(2)

    // Navigate to next stairs and ascend 2 → 1
    state.party.position = { x: 5, y: 5, level: 2, facing: 'south' }
    state = AscendStairsCommand.execute(state)
    expect(state.party.position.level).toBe(1)
  })

  it('can descend then ascend back to same level', () => {
    let state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 0, y: 10, level: 1, facing: 'north' } }
    })

    // Descend 1 → 2
    state = DescendStairsCommand.execute(state)
    const level2Pos = state.party.position

    // Ascend back 2 → 1
    state.party.position = level2Pos // Assume stairs up at same location
    state = AscendStairsCommand.execute(state)
    expect(state.party.position.level).toBe(1)
  })
})
```

## Related

**Services**:
- [DungeonService](../services/DungeonService.md) - Stairs and tile data
- [NavigationService](../services/NavigationService.md) - Movement validation

**Commands**:
- [DescendStairsCommand](./DescendStairsCommand.md) - Go down stairs
- [EnterTownCommand](../meta/EnterTownCommand.md) - Return to town from level 1
- [MoveForwardCommand](./MoveForwardCommand.md) - Navigate to stairs

**Research**:
- [Dungeon Maps Reference](../research/dungeon-maps-reference.md) - Stairs locations

**Systems**:
- [Dungeon System](../systems/dungeon-system.md) - Level progression
