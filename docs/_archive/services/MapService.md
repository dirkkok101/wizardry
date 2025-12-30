# MapService

**Pure function service for automap, exploration tracking, and dungeon visualization.**

## Responsibility

Manages the automap system, tracks explored tiles, handles coordinate mapping, and provides dungeon visualization data for the blueprint-style automap display.

## API Reference

### markTileExplored

Mark a tile as explored on the automap.

**Signature**:
```typescript
function markTileExplored(
  mapState: MapState,
  level: number,
  position: Position
): MapState
```

**Parameters**:
- `mapState`: Current automap state
- `level`: Dungeon level (1-10)
- `position`: Tile coordinates (x, y)

**Returns**: New map state with tile marked explored

**Throws**:
- `InvalidLevelError` if level < 1 or level > 10
- `InvalidPositionError` if coordinates outside 20×20 grid

**Example**:
```typescript
const mapState = createEmptyMapState()
const position = { x: 5, y: 10 }

const newMapState = MapService.markTileExplored(mapState, 1, position)
// newMapState.levels[1].exploredTiles.has("5,10") === true
```

### getTileType

Get the tile type at a specific position.

**Signature**:
```typescript
function getTileType(
  dungeonData: DungeonData,
  level: number,
  position: Position
): TileType
```

**Parameters**:
- `dungeonData`: Static dungeon map data
- `level`: Dungeon level (1-10)
- `position`: Tile coordinates

**Returns**: Tile type ("floor", "wall", "door", "stairs_up", "stairs_down", "teleporter", "spinner", etc.)

**Throws**:
- `InvalidLevelError` if level invalid
- `InvalidPositionError` if position outside grid

**Example**:
```typescript
const dungeonData = loadDungeonData()
const tileType = MapService.getTileType(dungeonData, 1, { x: 0, y: 0 })
// tileType === "stairs_up" (castle entrance)
```

### isWall

Check if a position contains a wall.

**Signature**:
```typescript
function isWall(
  dungeonData: DungeonData,
  level: number,
  position: Position
): boolean
```

**Parameters**:
- `dungeonData`: Dungeon map data
- `level`: Dungeon level
- `position`: Coordinates to check

**Returns**: `true` if wall, `false` otherwise

**Example**:
```typescript
const isBlocked = MapService.isWall(dungeonData, 1, { x: 1, y: 0 })
// isBlocked === true (wall adjacent to stairs)
```

### getVisibleTiles

Get all tiles visible from current position (3 tiles ahead).

**Signature**:
```typescript
function getVisibleTiles(
  dungeonData: DungeonData,
  level: number,
  position: Position,
  facing: Direction
): VisibleTile[]
```

**Parameters**:
- `dungeonData`: Dungeon map data
- `level`: Current level
- `position`: Party position
- `facing`: Party facing direction ("north", "south", "east", "west")

**Returns**: Array of visible tiles with types and coordinates

**Example**:
```typescript
const visible = MapService.getVisibleTiles(
  dungeonData,
  1,
  { x: 0, y: 0 },
  "north"
)
// visible = [
//   { x: 0, y: 1, distance: 1, type: "floor" },
//   { x: 0, y: 2, distance: 2, type: "floor" },
//   { x: 0, y: 3, distance: 3, type: "door" }
// ]
```

### getAutomapData

Get automap rendering data for current level.

**Signature**:
```typescript
function getAutomapData(
  mapState: MapState,
  dungeonData: DungeonData,
  level: number
): AutomapData
```

**Parameters**:
- `mapState`: Current exploration state
- `dungeonData`: Static dungeon data
- `level`: Level to render

**Returns**: Automap data with explored tiles, walls, doors, special tiles

**Example**:
```typescript
const automapData = MapService.getAutomapData(mapState, dungeonData, 1)
// automapData = {
//   level: 1,
//   exploredTiles: Set<string>,
//   walls: Position[],
//   doors: Position[],
//   stairs: { up: Position[], down: Position[] },
//   special: { teleporters: Position[], spinners: Position[] }
// }
```

### isExplored

Check if a tile has been explored.

**Signature**:
```typescript
function isExplored(
  mapState: MapState,
  level: number,
  position: Position
): boolean
```

**Parameters**:
- `mapState`: Current exploration state
- `level`: Dungeon level
- `position`: Tile coordinates

**Returns**: `true` if explored, `false` otherwise

**Example**:
```typescript
const explored = MapService.isExplored(mapState, 1, { x: 5, y: 10 })
// explored === true if party has visited this tile
```

### getCoordinates

Get current coordinates as string (for DUMAPIC spell).

**Signature**:
```typescript
function getCoordinates(position: Position, facing: Direction): string
```

**Parameters**:
- `position`: Current position
- `facing`: Current facing direction

**Returns**: Formatted coordinate string

**Example**:
```typescript
const coords = MapService.getCoordinates({ x: 5, y: 10 }, "north")
// coords === "5 East, 10 North, Facing North"
```

### resetMapState

Create new empty map state (for new game).

**Signature**:
```typescript
function resetMapState(): MapState
```

**Returns**: Empty map state with all levels unexplored

**Example**:
```typescript
const mapState = MapService.resetMapState()
// mapState.levels[1].exploredTiles.size === 0
```

## Dependencies

Uses:
- `DungeonService` (load dungeon map data)
- `ValidationService` (validate positions and levels)

## Testing

See [MapService.test.ts](../../tests/services/MapService.test.ts)

**Key test cases**:
- Mark tile as explored
- Mark same tile twice (idempotent)
- Get tile type for various special tiles
- Check wall detection
- Get visible tiles with obstacles
- Get visible tiles with walls blocking view
- Automap data generation
- Check explored tiles
- Coordinate string formatting (DUMAPIC)
- Invalid level throws error
- Invalid position throws error

## Related

- [AutomapService](./AutomapService.md) - Rendering logic
- [NavigationService](./NavigationService.md) - Uses map data for movement
- [DungeonService](./DungeonService.md) - Provides dungeon map data
- [DUMAPIC Spell](../research/spell-reference.md) - Shows coordinates
- [Dungeon Maps Reference](../research/dungeon-maps-reference.md) - Map structure
