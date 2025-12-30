# OpenDoorCommand

**Command for opening a door in the dungeon.**

## Responsibility

Opens a door at specified position, validates door state (not locked, not secret), and updates door state to open.

## Command Flow

### Preconditions
1. Party must be in NAVIGATION mode
2. Door must exist at target position
3. Door must not be locked
4. Door must not be secret (use SearchCommand first)

### Services Called
- `DoorService.getDoorState(state, level, position)` - Get door state
- `DoorService.openDoor(state, level, position)` - Open the door

### Events Created
- `OPEN_DOOR` event with door position

### State Changes
- Door state changes from `closed` to `open`
- Party can now pass through door tile

## API Reference

```typescript
function execute(
  state: GameState,
  doorPosition: Position
): GameState
```

**Parameters**:
- `state`: Current game state (must be in NAVIGATION mode)
- `doorPosition`: Position of door to open (x, y coordinates)

**Returns**: New game state with door opened

**Throws**:
- `InvalidStateTransitionError` if not in navigation mode
- `NoDoorError` if no door at specified position
- `DoorLockedError` if door is locked (requires unlocking first)
- `SecretDoorError` if secret door not yet discovered

**Example**:
```typescript
const state = createGameState({
  mode: 'NAVIGATION',
  party: { position: { x: 5, y: 10, level: 1, facing: 'north' } },
  dungeon: {
    doors: {
      1: { "5,11": { state: 'closed', locked: false, secret: false } }
    }
  }
})

const result = OpenDoorCommand.execute(state, { x: 5, y: 11 })
// result.dungeon.doors[1]["5,11"].state === 'open'
```

## Preconditions

### State Validation
```typescript
// Must be in navigation mode
if (state.mode !== 'NAVIGATION') {
  throw new InvalidStateTransitionError('Can only open doors in dungeon')
}
```

### Door Validation
```typescript
// Door must exist at position
const doorState = DoorService.getDoorState(
  state,
  state.party.position.level,
  doorPosition
)

if (!doorState) {
  throw new NoDoorError(`No door at position (${doorPosition.x}, ${doorPosition.y})`)
}

// Door must not be secret
if (doorState.secret) {
  throw new SecretDoorError('Door is hidden. Search to discover it first.')
}

// Door must not be locked
if (doorState.locked) {
  throw new DoorLockedError('Door is locked. Unlock it first.')
}

// Door is already open (warning, not error)
if (doorState.state === 'open') {
  console.warn('Door is already open')
}
```

## Services Used

### DoorService
- `getDoorState(state, level, position)` - Get door state
  - Returns: `{ state: 'open' | 'closed', locked: boolean, secret: boolean }` or `null`
- `openDoor(state, level, position)` - Open the door
  - Returns: New game state with door opened
- `isDoorOpen(state, level, position)` - Check if door is open

## Events Created

```typescript
{
  type: 'OPEN_DOOR',
  timestamp: Date.now(),
  data: {
    doorPosition: { x: 5, y: 11, level: 1 },
    partyPosition: { x: 5, y: 10, level: 1, facing: 'north' },
    doorWasLocked: false,
    doorWasSecret: false
  }
}
```

## Testing

**Key test cases**:
```typescript
describe('OpenDoorCommand', () => {
  it('opens closed door', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 5, y: 10, level: 1, facing: 'north' } },
      dungeon: {
        doors: {
          1: { "5,11": { state: 'closed', locked: false, secret: false } }
        }
      }
    })
    const result = OpenDoorCommand.execute(state, { x: 5, y: 11 })
    expect(result.dungeon.doors[1]["5,11"].state).toBe('open')
  })

  it('allows opening already open door (idempotent)', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      dungeon: {
        doors: {
          1: { "5,11": { state: 'open', locked: false, secret: false } }
        }
      }
    })
    const result = OpenDoorCommand.execute(state, { x: 5, y: 11 })
    expect(result.dungeon.doors[1]["5,11"].state).toBe('open')
  })

  it('throws error if no door at position', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 5, y: 10, level: 1, facing: 'north' } }
    })
    expect(() => OpenDoorCommand.execute(state, { x: 10, y: 10 }))
      .toThrow(NoDoorError)
  })

  it('throws error if door is locked', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      dungeon: {
        doors: {
          1: { "10,5": { state: 'closed', locked: true, secret: false } }
        }
      }
    })
    expect(() => OpenDoorCommand.execute(state, { x: 10, y: 5 }))
      .toThrow(DoorLockedError)
  })

  it('throws error if door is secret', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      dungeon: {
        doors: {
          1: { "7,8": { state: 'closed', locked: false, secret: true } }
        }
      }
    })
    expect(() => OpenDoorCommand.execute(state, { x: 7, y: 8 }))
      .toThrow(SecretDoorError)
  })

  it('throws error if not in navigation mode', () => {
    const state = createGameState({ mode: 'TOWN' })
    expect(() => OpenDoorCommand.execute(state, { x: 5, y: 11 }))
      .toThrow(InvalidStateTransitionError)
  })

  it('creates OPEN_DOOR event', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      dungeon: {
        doors: {
          1: { "5,11": { state: 'closed', locked: false, secret: false } }
        }
      }
    })
    const result = OpenDoorCommand.execute(state, { x: 5, y: 11 })
    const event = result.eventLog[result.eventLog.length - 1]
    expect(event.type).toBe('OPEN_DOOR')
  })

  it('allows movement through opened door', () => {
    let state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 5, y: 10, level: 1, facing: 'north' } },
      dungeon: {
        doors: {
          1: { "5,11": { state: 'closed', locked: false, secret: false } }
        }
      }
    })

    // Open door
    state = OpenDoorCommand.execute(state, { x: 5, y: 11 })

    // Move through door
    state = MoveForwardCommand.execute(state)
    expect(state.party.position.y).toBe(11)
  })

  it('can open multiple doors sequentially', () => {
    let state = createGameState({
      mode: 'NAVIGATION',
      dungeon: {
        doors: {
          1: {
            "5,11": { state: 'closed', locked: false, secret: false },
            "5,12": { state: 'closed', locked: false, secret: false }
          }
        }
      }
    })

    state = OpenDoorCommand.execute(state, { x: 5, y: 11 })
    expect(state.dungeon.doors[1]["5,11"].state).toBe('open')

    state = OpenDoorCommand.execute(state, { x: 5, y: 12 })
    expect(state.dungeon.doors[1]["5,12"].state).toBe('open')
  })

  it('door position can be in any direction from party', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      party: { position: { x: 5, y: 10, level: 1, facing: 'north' } },
      dungeon: {
        doors: {
          1: {
            "5,11": { state: 'closed', locked: false, secret: false }, // Front
            "4,10": { state: 'closed', locked: false, secret: false }, // Left
            "6,10": { state: 'closed', locked: false, secret: false }  // Right
          }
        }
      }
    })

    // Can open door in front
    let result = OpenDoorCommand.execute(state, { x: 5, y: 11 })
    expect(result.dungeon.doors[1]["5,11"].state).toBe('open')

    // Can open door to left
    result = OpenDoorCommand.execute(state, { x: 4, y: 10 })
    expect(result.dungeon.doors[1]["4,10"].state).toBe('open')

    // Can open door to right
    result = OpenDoorCommand.execute(state, { x: 6, y: 10 })
    expect(result.dungeon.doors[1]["6,10"].state).toBe('open')
  })
})
```

## Related

**Services**:
- [DoorService](../services/DoorService.md) - Door state management
- [NavigationService](../services/NavigationService.md) - Movement through doors

**Commands**:
- [SearchCommand](./SearchCommand.md) - Discover secret doors
- [MoveForwardCommand](./MoveForwardCommand.md) - Pass through opened door
- [InspectCommand](./InspectCommand.md) - View door state

**Research**:
- [Dungeon Maps Reference](../research/dungeon-maps-reference.md) - Door locations

**Systems**:
- [Dungeon System](../systems/dungeon-system.md) - Door mechanics
