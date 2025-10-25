# NavigationService

**Pure function service for movement validation and position updates.**

## Responsibility

Validates party movement, handles position updates, checks for walls and obstacles, and calculates new positions based on movement direction.

## API Reference

### canMoveForward

Check if party can move forward one tile.

**Signature**:
```typescript
function canMoveForward(
  dungeonData: DungeonData,
  level: number,
  position: Position,
  facing: Direction
): boolean
```

**Parameters**:
- `dungeonData`: Dungeon map data
- `level`: Current dungeon level
- `position`: Current party position
- `facing`: Current facing direction

**Returns**: `true` if forward movement is valid, `false` if blocked

**Example**:
```typescript
const canMove = NavigationService.canMoveForward(
  dungeonData,
  1,
  { x: 0, y: 0 },
  "north"
)
// canMove === true if no wall at (0, 1)
```

### moveForward

Calculate new position after moving forward.

**Signature**:
```typescript
function moveForward(
  position: Position,
  facing: Direction
): Position
```

**Parameters**:
- `position`: Current position
- `facing`: Current facing direction

**Returns**: New position one tile forward

**Throws**:
- Never throws (validation should be done with `canMoveForward` first)

**Example**:
```typescript
const newPos = NavigationService.moveForward({ x: 5, y: 10 }, "north")
// newPos === { x: 5, y: 11 }
```

### moveBackward

Calculate new position after moving backward.

**Signature**:
```typescript
function moveBackward(
  position: Position,
  facing: Direction
): Position
```

**Parameters**:
- `position`: Current position
- `facing`: Current facing direction

**Returns**: New position one tile backward

**Example**:
```typescript
const newPos = NavigationService.moveBackward({ x: 5, y: 10 }, "north")
// newPos === { x: 5, y: 9 }
```

### strafeLeft

Calculate new position after strafing left.

**Signature**:
```typescript
function strafeLeft(
  position: Position,
  facing: Direction
): Position
```

**Parameters**:
- `position`: Current position
- `facing`: Current facing direction

**Returns**: New position one tile to the left

**Example**:
```typescript
const newPos = NavigationService.strafeLeft({ x: 5, y: 10 }, "north")
// newPos === { x: 4, y: 10 } (west)
```

### strafeRight

Calculate new position after strafing right.

**Signature**:
```typescript
function strafeRight(
  position: Position,
  facing: Direction
): Position
```

**Parameters**:
- `position`: Current position
- `facing`: Current facing direction

**Returns**: New position one tile to the right

**Example**:
```typescript
const newPos = NavigationService.strafeRight({ x: 5, y: 10 }, "north")
// newPos === { x: 6, y: 10 } (east)
```

### turnLeft

Calculate new facing direction after turning left 90°.

**Signature**:
```typescript
function turnLeft(facing: Direction): Direction
```

**Parameters**:
- `facing`: Current facing direction

**Returns**: New facing direction after 90° left turn

**Example**:
```typescript
const newFacing = NavigationService.turnLeft("north")
// newFacing === "west"
```

### turnRight

Calculate new facing direction after turning right 90°.

**Signature**:
```typescript
function turnRight(facing: Direction): Direction
```

**Parameters**:
- `facing`: Current facing direction

**Returns**: New facing direction after 90° right turn

**Example**:
```typescript
const newFacing = NavigationService.turnRight("north")
// newFacing === "east"
```

### isValidPosition

Check if a position is within the dungeon grid.

**Signature**:
```typescript
function isValidPosition(position: Position): boolean
```

**Parameters**:
- `position`: Position to validate

**Returns**: `true` if within 20×20 grid (0-19, 0-19), `false` otherwise

**Example**:
```typescript
const valid = NavigationService.isValidPosition({ x: 5, y: 10 })
// valid === true

const invalid = NavigationService.isValidPosition({ x: -1, y: 5 })
// invalid === false

const outOfBounds = NavigationService.isValidPosition({ x: 20, y: 10 })
// outOfBounds === false
```

### canMoveToPosition

Check if movement to a specific position is valid.

**Signature**:
```typescript
function canMoveToPosition(
  dungeonData: DungeonData,
  level: number,
  position: Position
): boolean
```

**Parameters**:
- `dungeonData`: Dungeon map data
- `level`: Dungeon level
- `position`: Target position

**Returns**: `true` if position is walkable (not wall, within bounds)

**Throws**:
- `InvalidLevelError` if level invalid

**Example**:
```typescript
const canMove = NavigationService.canMoveToPosition(
  dungeonData,
  1,
  { x: 5, y: 10 }
)
// canMove === true if tile is floor/door/stairs (not wall)
```

### getOppositeDirection

Get opposite facing direction (180° turn).

**Signature**:
```typescript
function getOppositeDirection(facing: Direction): Direction
```

**Parameters**:
- `facing`: Current facing direction

**Returns**: Opposite direction

**Example**:
```typescript
const opposite = NavigationService.getOppositeDirection("north")
// opposite === "south"
```

## Dependencies

Uses:
- `DungeonService` (get tile data)
- `MapService` (check walls)
- `ValidationService` (validate positions)

## Testing

See [NavigationService.test.ts](../../tests/services/NavigationService.test.ts)

**Key test cases**:
- Move forward when no wall (valid)
- Move forward into wall (blocked)
- Move backward
- Strafe left and right
- Turn left and right (all 4 directions)
- Position validation (valid, negative, out of bounds)
- Move to wall blocked
- Move to floor allowed
- Get opposite direction (all 4 directions)
- Edge of map boundary checks (0, 19)

## Related

- [MoveForwardCommand](../commands/MoveForwardCommand.md) - Uses this service
- [TurnCommand](../commands/TurnCommand.md) - Uses turn methods
- [StrafeCommand](../commands/StrafeCommand.md) - Uses strafe methods
- [MapService](./MapService.md) - Provides wall data
- [TileService](./TileService.md) - Handles special tile effects
- [Dungeon Maps Reference](../research/dungeon-maps-reference.md) - Movement mechanics
