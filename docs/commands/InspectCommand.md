# InspectCommand

**Command for inspecting the current dungeon tile for details.**

## Responsibility

Examines the current tile and surrounding area, providing information about tile type, doors, stairs, special effects, and nearby features.

## Command Flow

### Preconditions
1. Party must be in NAVIGATION mode

### Services Called
- `DungeonService.getTile(level, position)` - Get current tile
- `DungeonService.getTileEffects(tile)` - Get tile special effects
- `DungeonService.isStairs(tile)` - Check for stairs
- `DungeonService.isDarknessZone(level, position)` - Check darkness
- `DungeonService.isAntiMagicZone(level, position)` - Check anti-magic
- `DoorService.getDoorsInRange(state, level, position, facing)` - Get visible doors

### Events Created
- `INSPECT_TILE` event with tile information

### State Changes
- No state changes (read-only operation)
- Information displayed to player

## API Reference

```typescript
function execute(state: GameState): GameState
```

**Parameters**:
- `state`: Current game state (must be in NAVIGATION mode)

**Returns**: New game state with inspection event logged (state unchanged)

**Throws**:
- `InvalidStateTransitionError` if not in navigation mode

**Example**:
```typescript
const state = createGameState({
  mode: 'NAVIGATION',
  party: { position: { x: 5, y: 10, level: 1, facing: 'north' } }
})

const result = InspectCommand.execute(state)
// result.eventLog includes INSPECT_TILE with tile details
// result.party.position unchanged (read-only)
```

## Preconditions

### State Validation
```typescript
// Must be in navigation mode
if (state.mode !== 'NAVIGATION') {
  throw new InvalidStateTransitionError('Can only inspect in dungeon')
}
```

## Services Used

### DungeonService
- `getTile(level, x, y)` - Get tile at current position
  - Returns: `{ type: TileType, effects: TileEffect[] }`
- `getTileEffects(tile)` - Get special tile effects
  - Returns: Array of effects (TELEPORTER, SPINNER, DARKNESS, ANTI_MAGIC, CHUTE)
- `isStairs(tile)` - Check for stairs
  - Returns: 'UP' | 'DOWN' | null
- `isDarknessZone(level, position)` - Check if in darkness zone
- `isAntiMagicZone(level, position)` - Check if in anti-magic zone
- `getMessage(level, position)` - Get message tile text (if any)

### DoorService
- `getDoorsInRange(state, level, position, facing)` - Get visible doors
  - Returns: Array of doors with states (open, closed, locked, secret)

## Events Created

```typescript
{
  type: 'INSPECT_TILE',
  timestamp: Date.now(),
  data: {
    position: { x: 5, y: 10, level: 1, facing: 'north' },
    tileType: 'FLOOR',
    effects: ['DARKNESS'],
    stairs: null, // or 'UP' or 'DOWN'
    doors: [
      { position: { x: 5, y: 11 }, state: 'closed', locked: false, direction: 'front' },
      { position: { x: 4, y: 10 }, state: 'open', locked: false, direction: 'left' }
    ],
    zones: {
      darkness: true,
      antiMagic: false
    },
    message: null, // or "TREBOR SUX" etc.
    description: "You are in a dark corridor. There is a closed door ahead and an open door to your left."
  }
}
```

## Testing

**Key test cases**:
```typescript
describe('InspectCommand', () => {
  it('returns tile type information', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 5, y: 10, level: 1, facing: 'north' } }
    })
    const result = InspectCommand.execute(state)
    const event = result.eventLog[result.eventLog.length - 1]
    expect(event.type).toBe('INSPECT_TILE')
    expect(event.data.tileType).toBeDefined()
  })

  it('detects stairs up', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 5, y: 5, level: 2, facing: 'north' } }
    })
    // Mock stairs up at position
    const result = InspectCommand.execute(state)
    const event = result.eventLog[result.eventLog.length - 1]
    if (event.data.stairs) {
      expect(event.data.stairs).toBe('UP')
    }
  })

  it('detects stairs down', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 0, y: 10, level: 1, facing: 'north' } }
    })
    // Mock stairs down at position
    const result = InspectCommand.execute(state)
    const event = result.eventLog[result.eventLog.length - 1]
    if (event.data.stairs) {
      expect(event.data.stairs).toBe('DOWN')
    }
  })

  it('detects nearby doors', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 5, y: 10, level: 1, facing: 'north' } },
      dungeon: {
        doors: {
          1: { "5,11": { state: 'closed', locked: false, secret: false } }
        }
      }
    })
    const result = InspectCommand.execute(state)
    const event = result.eventLog[result.eventLog.length - 1]
    expect(event.data.doors).toBeDefined()
    expect(event.data.doors.length).toBeGreaterThan(0)
  })

  it('detects darkness zones', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 5, y: 10, level: 1, facing: 'north' } }
    })
    // Mock darkness zone
    const result = InspectCommand.execute(state)
    const event = result.eventLog[result.eventLog.length - 1]
    expect(event.data.zones.darkness).toBeDefined()
  })

  it('detects anti-magic zones', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 5, y: 10, level: 1, facing: 'north' } }
    })
    // Mock anti-magic zone
    const result = InspectCommand.execute(state)
    const event = result.eventLog[result.eventLog.length - 1]
    expect(event.data.zones.antiMagic).toBeDefined()
  })

  it('detects teleporter tiles', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 5, y: 9, level: 1, facing: 'north' } }
    })
    // Mock teleporter at position
    const result = InspectCommand.execute(state)
    const event = result.eventLog[result.eventLog.length - 1]
    if (event.data.effects) {
      expect(event.data.effects).toContain('TELEPORTER')
    }
  })

  it('detects spinner tiles', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 10, y: 10, level: 1, facing: 'north' } }
    })
    // Mock spinner at position
    const result = InspectCommand.execute(state)
    const event = result.eventLog[result.eventLog.length - 1]
    if (event.data.effects) {
      expect(event.data.effects).toContain('SPINNER')
    }
  })

  it('detects chute tiles', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 15, y: 5, level: 5, facing: 'north' } }
    })
    // Mock chute at position
    const result = InspectCommand.execute(state)
    const event = result.eventLog[result.eventLog.length - 1]
    if (event.data.effects) {
      expect(event.data.effects).toContain('CHUTE')
    }
  })

  it('shows message tiles', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 0, y: 0, level: 10, facing: 'north' } }
    })
    // Mock message tile "TREBOR SUX"
    const result = InspectCommand.execute(state)
    const event = result.eventLog[result.eventLog.length - 1]
    if (event.data.message) {
      expect(event.data.message).toBe('TREBOR SUX')
    }
  })

  it('throws error if not in navigation mode', () => {
    const state = createGameState({ mode: 'TOWN' })
    expect(() => InspectCommand.execute(state))
      .toThrow(InvalidStateTransitionError)
  })

  it('does not modify game state (read-only)', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 5, y: 10, level: 1, facing: 'north' } }
    })
    const originalPosition = { ...state.party.position }
    const result = InspectCommand.execute(state)
    expect(result.party.position).toEqual(originalPosition)
  })

  it('can be called multiple times without side effects', () => {
    let state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 5, y: 10, level: 1, facing: 'north' } }
    })

    state = InspectCommand.execute(state)
    const firstEventCount = state.eventLog.length

    state = InspectCommand.execute(state)
    const secondEventCount = state.eventLog.length

    expect(secondEventCount).toBe(firstEventCount + 1)
  })

  it('provides directional information for doors', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 5, y: 10, level: 1, facing: 'north' } },
      dungeon: {
        doors: {
          1: {
            "5,11": { state: 'closed', locked: false, secret: false }, // Front
            "4,10": { state: 'open', locked: false, secret: false },   // Left
            "6,10": { state: 'closed', locked: true, secret: false }   // Right
          }
        }
      }
    })
    const result = InspectCommand.execute(state)
    const event = result.eventLog[result.eventLog.length - 1]
    const frontDoor = event.data.doors.find(d => d.direction === 'front')
    const leftDoor = event.data.doors.find(d => d.direction === 'left')
    const rightDoor = event.data.doors.find(d => d.direction === 'right')

    expect(frontDoor).toBeDefined()
    expect(leftDoor).toBeDefined()
    expect(rightDoor).toBeDefined()
  })
})
```

## Related

**Services**:
- [DungeonService](../services/DungeonService.md) - Tile and effect data
- [DoorService](../services/DoorService.md) - Door information

**Commands**:
- [SearchCommand](./SearchCommand.md) - Search for secret doors
- [OpenDoorCommand](./OpenDoorCommand.md) - Open discovered doors
- [MoveForwardCommand](./MoveForwardCommand.md) - Navigate dungeon

**Research**:
- [Dungeon Maps Reference](../research/dungeon-maps-reference.md) - All tile types and special zones

**Systems**:
- [Dungeon System](../systems/dungeon-system.md) - Exploration mechanics
