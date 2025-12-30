# DoorService

**Pure function service for door interactions (open, locked, secret door discovery).**

## Responsibility

Manages door state (closed, open, locked), handles door opening attempts, secret door discovery, and lock picking mechanics.

## API Reference

### getDoorState

Get the current state of a door.

**Signature**:
```typescript
function getDoorState(
  gameState: GameState,
  level: number,
  position: Position
): DoorState | null
```

**Parameters**:
- `gameState`: Current game state
- `level`: Dungeon level
- `position`: Door tile coordinates

**Returns**: Door state object, or `null` if no door at position

**Example**:
```typescript
const doorState = DoorService.getDoorState(gameState, 1, { x: 5, y: 10 })
// doorState = { type: "closed", locked: false, secret: false }

const noDoor = DoorService.getDoorState(gameState, 1, { x: 1, y: 1 })
// noDoor === null (no door at this position)
```

### openDoor

Attempt to open a door.

**Signature**:
```typescript
function openDoor(
  gameState: GameState,
  level: number,
  position: Position
): GameState
```

**Parameters**:
- `gameState`: Current game state
- `level`: Dungeon level
- `position`: Door position

**Returns**: New game state with door opened

**Throws**:
- `NoDoorError` if no door at position
- `DoorLockedError` if door is locked
- `SecretDoorError` if secret door not yet discovered

**Example**:
```typescript
const newState = DoorService.openDoor(gameState, 1, { x: 5, y: 10 })
// newState.doors[1]["5,10"].state === "open"
```

### unlockDoor

Attempt to unlock a locked door (requires thief or key).

**Signature**:
```typescript
function unlockDoor(
  gameState: GameState,
  level: number,
  position: Position,
  thiefSkill?: number
): { success: boolean; gameState: GameState }
```

**Parameters**:
- `gameState`: Current game state
- `level`: Dungeon level
- `position`: Door position
- `thiefSkill`: Optional thief AGI (for lock picking)

**Returns**: Success flag and new game state

**Example**:
```typescript
// Thief with AGI 15 attempts lock pick
const result = DoorService.unlockDoor(gameState, 2, { x: 10, y: 5 }, 15)
// result.success === true (50% chance with AGI 15)
// result.gameState.doors[2]["10,5"].locked === false

// Without thief (requires key)
const failed = DoorService.unlockDoor(gameState, 2, { x: 10, y: 5 })
// failed.success === false
```

### discoverSecretDoor

Attempt to discover a secret door (search action).

**Signature**:
```typescript
function discoverSecretDoor(
  gameState: GameState,
  level: number,
  position: Position
): { found: boolean; gameState: GameState }
```

**Parameters**:
- `gameState`: Current game state
- `level`: Dungeon level
- `position`: Tile to search

**Returns**: Found flag and new game state

**Example**:
```typescript
const result = DoorService.discoverSecretDoor(gameState, 1, { x: 7, y: 8 })
// result.found === true (secret door discovered)
// result.gameState.doors[1]["7,8"].secret === false (now visible)
```

### isDoorOpen

Check if a door is open.

**Signature**:
```typescript
function isDoorOpen(
  gameState: GameState,
  level: number,
  position: Position
): boolean
```

**Parameters**:
- `gameState`: Current game state
- `level`: Dungeon level
- `position`: Door position

**Returns**: `true` if door is open, `false` if closed/locked

**Example**:
```typescript
const isOpen = DoorService.isDoorOpen(gameState, 1, { x: 5, y: 10 })
// isOpen === true (door is open, can pass through)
```

### isDoorLocked

Check if a door is locked.

**Signature**:
```typescript
function isDoorLocked(
  gameState: GameState,
  level: number,
  position: Position
): boolean
```

**Parameters**:
- `gameState`: Current game state
- `level`: Dungeon level
- `position`: Door position

**Returns**: `true` if door is locked

**Example**:
```typescript
const isLocked = DoorService.isDoorLocked(gameState, 2, { x: 10, y: 5 })
// isLocked === true (requires key or thief to unlock)
```

### isSecretDoor

Check if a door is secret (not yet discovered).

**Signature**:
```typescript
function isSecretDoor(
  gameState: GameState,
  level: number,
  position: Position
): boolean
```

**Parameters**:
- `gameState`: Current game state
- `level`: Dungeon level
- `position`: Door position

**Returns**: `true` if secret door not yet discovered

**Example**:
```typescript
const isSecret = DoorService.isSecretDoor(gameState, 1, { x: 7, y: 8 })
// isSecret === true (must search to discover)
```

### canPassThroughDoor

Check if party can pass through a door.

**Signature**:
```typescript
function canPassThroughDoor(
  gameState: GameState,
  level: number,
  position: Position
): boolean
```

**Parameters**:
- `gameState`: Current game state
- `level`: Dungeon level
- `position`: Door position

**Returns**: `true` if door is open and can be passed

**Example**:
```typescript
const canPass = DoorService.canPassThroughDoor(gameState, 1, { x: 5, y: 10 })
// canPass === true (door is open)

const blocked = DoorService.canPassThroughDoor(gameState, 2, { x: 10, y: 5 })
// blocked === false (door is locked/closed)
```

### calculateLockPickChance

Calculate success chance for lock picking.

**Signature**:
```typescript
function calculateLockPickChance(
  thiefAgility: number,
  doorDifficulty: number
): number
```

**Parameters**:
- `thiefAgility`: Thief's AGI stat
- `doorDifficulty`: Door difficulty (1-10)

**Returns**: Success probability (0.0-1.0)

**Example**:
```typescript
const chance = DoorService.calculateLockPickChance(15, 5)
// chance = 0.50 (50% success rate)

const highChance = DoorService.calculateLockPickChance(18, 3)
// highChance = 0.75 (75% success rate)
```

### isDoorTrapped

Check if door has a trap.

**Signature**:
```typescript
function isDoorTrapped(
  gameState: GameState,
  level: number,
  position: Position
): boolean
```

**Parameters**:
- `gameState`: Current game state
- `level`: Dungeon level
- `position`: Door position

**Returns**: `true` if door has trap, `false` otherwise

**Example**:
```typescript
const trapped = DoorService.isDoorTrapped(gameState, 5, { x: 10, y: 15 })
// trapped === true (door has trap)
```

### inspectDoorTrap

Inspect door for traps (uses TrapService internally).

**Signature**:
```typescript
function inspectDoorTrap(
  gameState: GameState,
  character: Character,
  level: number,
  position: Position
): InspectResult
```

**Parameters**:
- `gameState`: Current game state
- `character`: Character inspecting
- `level`: Dungeon level
- `position`: Door position

**Returns**: Inspect result from TrapService

**Example**:
```typescript
const thief = { class: 'Thief', agility: 16 }
const result = DoorService.inspectDoorTrap(gameState, thief, 5, { x: 10, y: 15 })
// result = { success: true, trapType: 'ALARM', triggered: false }
```

### disarmDoorTrap

Disarm trap on door (uses TrapService internally).

**Signature**:
```typescript
function disarmDoorTrap(
  gameState: GameState,
  character: Character,
  trapType: TrapType,
  level: number,
  position: Position
): DisarmResult
```

**Parameters**:
- `gameState`: Current game state
- `character`: Character disarming
- `trapType`: Type of trap to disarm
- `level`: Dungeon level
- `position`: Door position

**Returns**: Disarm result from TrapService

**Example**:
```typescript
const thief = { class: 'Thief', level: 5 }
const result = DoorService.disarmDoorTrap(
  gameState,
  thief,
  'ALARM',
  5,
  { x: 10, y: 15 }
)
// result = { success: true, triggered: false, wrongType: false }
```

### getDoorTrapTypes

Get trap types that can appear on doors.

**Signature**:
```typescript
function getDoorTrapTypes(): TrapType[]
```

**Returns**: Array of door trap types

**Door Trap Types**:
- `ALARM` - Most common, triggers monster encounter
- `POISON_NEEDLE` - Uncommon, poisons character
- `STUNNER` - Uncommon, stuns/paralyzes character
- `TELEPORTER` - Rare, teleports party

**Example**:
```typescript
const trapTypes = DoorService.getDoorTrapTypes()
// ['ALARM', 'POISON_NEEDLE', 'STUNNER', 'TELEPORTER']
```

### getDoorsInRange

Get all doors within party's view range.

**Signature**:
```typescript
function getDoorsInRange(
  gameState: GameState,
  dungeonData: DungeonData,
  level: number,
  position: Position,
  facing: Direction
): DoorInfo[]
```

**Parameters**:
- `gameState`: Current game state
- `dungeonData`: Dungeon map data
- `level`: Current level
- `position`: Party position
- `facing`: Party facing direction

**Returns**: Array of visible doors with states

**Example**:
```typescript
const doors = DoorService.getDoorsInRange(
  gameState,
  dungeonData,
  1,
  { x: 5, y: 10 },
  "north"
)
// doors = [
//   { position: { x: 5, y: 11 }, state: "closed", locked: false },
//   { position: { x: 5, y: 13 }, state: "open", locked: false }
// ]
```

## Dependencies

Uses:
- `DungeonService` (get door data from dungeon maps)
- `RandomService` (RNG for lock picking attempts)
- `ValidationService` (validate positions)
- `TrapService` (door trap inspection, disarm mechanics)

## Testing

See [DoorService.test.ts](../../tests/services/DoorService.test.ts)

**Key test cases**:
- Get door state (closed, open, locked)
- Get door state for non-door tile (returns null)
- Open closed door (success)
- Open locked door (throws error)
- Open secret door not discovered (throws error)
- Unlock door with thief (success/failure)
- Unlock door without thief (failure)
- Discover secret door (success)
- Search non-secret location (not found)
- Check if door is open
- Check if door is locked
- Check if door is secret
- Can pass through open door
- Cannot pass through locked door
- Calculate lock pick chance (various AGI values)
- Get doors in range (visible doors)
- Invalid position throws error

## Related

**Services**:
- [TrapService](./TrapService.md) - Door trap mechanics
- [SearchService](./SearchService.md) - Secret door discovery
- [NavigationService](./NavigationService.md) - Checks door passage
- [DungeonService](./DungeonService.md) - Provides door data

**Commands**:
- [OpenDoorCommand](../commands/OpenDoorCommand.md) - Uses this service
- [SearchCommand](../commands/SearchCommand.md) - Uses discoverSecretDoor

**Research**:
- [Trap Mechanics Validation](../research/trap-mechanics-validation.md) - Door trap formulas
- [Dungeon Maps Reference](../research/dungeon-maps-reference.md) - Door locations
