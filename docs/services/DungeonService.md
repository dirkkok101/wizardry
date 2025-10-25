# DungeonService

**Pure function service for dungeon map loading and tile resolution.**

## Responsibility

Manages dungeon map data, tile lookups, special tile effects, and level transitions. Loads map data from JSON files and resolves tile properties.

## API Reference

### loadLevel

Load dungeon level map data.

**Signature**:
```typescript
function loadLevel(levelNumber: number): DungeonLevel
```

**Parameters**:
- `levelNumber`: Level number (1-10)

**Returns**: Dungeon level data with tile grid

**Throws**:
- `InvalidLevelError` if level < 1 or > 10

**Example**:
```typescript
const level1 = DungeonService.loadLevel(1)
// level1.grid: 20x20 tile array
// level1.encounters: Fixed encounter definitions
// level1.specialTiles: Teleporters, spinners, etc.
```

### getTile

Get tile at specific coordinates.

**Signature**:
```typescript
function getTile(
  level: DungeonLevel,
  x: number,
  y: number
): Tile
```

**Parameters**:
- `level`: Dungeon level data
- `x`: East coordinate (0-19)
- `y`: North coordinate (0-19)

**Returns**: Tile at coordinates

**Throws**:
- `OutOfBoundsError` if coordinates invalid

**Example**:
```typescript
const tile = DungeonService.getTile(level1, 5, 10)
// tile.type: 'FLOOR' | 'WALL' | 'DOOR' | 'STAIRS_UP' | 'STAIRS_DOWN'
// tile.effects: ['TELEPORTER'] | ['SPINNER'] | ['DARKNESS']
```

### getTileEffects

Get special effects for tile.

**Signature**:
```typescript
function getTileEffects(tile: Tile): TileEffect[]
```

**Parameters**:
- `tile`: Tile to check

**Returns**: Array of tile effects

**Example**:
```typescript
const effects = DungeonService.getTileEffects(tile)
// effects might include: TELEPORTER, SPINNER, DARKNESS, ANTI_MAGIC, CHUTE
```

### resolveTeleporter

Resolve teleporter destination.

**Signature**:
```typescript
function resolveTeleporter(
  level: DungeonLevel,
  position: Position
): Position
```

**Parameters**:
- `level`: Current dungeon level
- `position`: Current position

**Returns**: Destination position after teleport

**Throws**:
- `NotATeleporterError` if tile has no teleporter

**Example**:
```typescript
const destination = DungeonService.resolveTeleporter(
  level1,
  { x: 5, y: 9, level: 1, facing: 'north' }
)
// destination: { x: 15, y: 4, level: 1, facing: 'north' }
```

### resolveSpinner

Resolve spinner effect (randomize facing).

**Signature**:
```typescript
function resolveSpinner(currentFacing: Direction): Direction
```

**Parameters**:
- `currentFacing`: Current facing direction

**Returns**: New random facing direction

**Example**:
```typescript
const newFacing = DungeonService.resolveSpinner('north')
// newFacing: random direction (north/south/east/west)
```

### resolveChute

Resolve chute effect (forced descent).

**Signature**:
```typescript
function resolveChute(
  level: DungeonLevel,
  position: Position
): Position
```

**Parameters**:
- `level`: Current dungeon level
- `position`: Current position

**Returns**: Position after falling through chute

**Example**:
```typescript
const fallen = DungeonService.resolveChute(level5, position)
// fallen.level = original level + 1 (descended one level)
```

### isWall

Check if tile is wall.

**Signature**:
```typescript
function isWall(tile: Tile): boolean
```

**Parameters**:
- `tile`: Tile to check

**Returns**: True if tile is wall

**Example**:
```typescript
if (DungeonService.isWall(tile)) {
  // Cannot move through wall
}
```

### isDoor

Check if tile is door.

**Signature**:
```typescript
function isDoor(tile: Tile): boolean
```

**Parameters**:
- `tile`: Tile to check

**Returns**: True if tile is door

**Example**:
```typescript
if (DungeonService.isDoor(tile)) {
  // Can open door
}
```

### isStairs

Check if tile has stairs.

**Signature**:
```typescript
function isStairs(tile: Tile): 'UP' | 'DOWN' | null
```

**Parameters**:
- `tile`: Tile to check

**Returns**: Stairs direction or null

**Example**:
```typescript
const stairs = DungeonService.isStairs(tile)
if (stairs === 'DOWN') {
  // Can descend to next level
}
```

### getStairsDestination

Get destination of stairs.

**Signature**:
```typescript
function getStairsDestination(
  level: DungeonLevel,
  position: Position,
  direction: 'UP' | 'DOWN'
): Position
```

**Parameters**:
- `level`: Current dungeon level
- `position`: Current position
- `direction`: Stairs direction

**Returns**: Destination position on other level

**Example**:
```typescript
const dest = DungeonService.getStairsDestination(
  level1,
  { x: 0, y: 10, level: 1, facing: 'north' },
  'DOWN'
)
// dest: { x: ?, y: ?, level: 2, facing: 'north' }
```

### isDarknessZone

Check if tile is in darkness zone.

**Signature**:
```typescript
function isDarknessZone(
  level: DungeonLevel,
  position: Position
): boolean
```

**Parameters**:
- `level`: Current dungeon level
- `position`: Position to check

**Returns**: True if in darkness zone (light spells don't work)

**Example**:
```typescript
if (DungeonService.isDarknessZone(level1, position)) {
  // Cannot use MILWA/LOMILWA here
}
```

### isAntiMagicZone

Check if tile is in anti-magic zone.

**Signature**:
```typescript
function isAntiMagicZone(
  level: DungeonLevel,
  position: Position
): boolean
```

**Parameters**:
- `level`: Current dungeon level
- `position`: Position to check

**Returns**: True if in anti-magic zone (no spells work)

**Example**:
```typescript
if (DungeonService.isAntiMagicZone(level, position)) {
  // Cannot cast any spells
}
```

### getFixedEncounter

Get fixed encounter at position (if any).

**Signature**:
```typescript
function getFixedEncounter(
  level: DungeonLevel,
  position: Position
): MonsterGroup[] | null
```

**Parameters**:
- `level`: Current dungeon level
- `position`: Position to check

**Returns**: Fixed encounter or null

**Example**:
```typescript
const encounter = DungeonService.getFixedEncounter(
  level1,
  { x: 13, y: 5, level: 1, facing: 'north' }
)
// encounter: Murphy's Ghosts (fixed Level 1 encounter)
```

### getMessage

Get message tile text (if any).

**Signature**:
```typescript
function getMessage(
  level: DungeonLevel,
  position: Position
): string | null
```

**Parameters**:
- `level`: Current dungeon level
- `position`: Position to check

**Returns**: Message text or null

**Example**:
```typescript
const msg = DungeonService.getMessage(level10, { x: 0, y: 0, level: 10, facing: 'north' })
// msg: "TREBOR SUX" (Latin clue on Level 10)
```

## Dependencies

Uses:
- `maps.json` - Dungeon map data (10 levels)
- `RandomService` - RNG for spinner directions

## Testing

See [DungeonService.test.ts](../../tests/services/DungeonService.test.ts)

**Key test cases**:
- Loading all 10 levels
- Tile lookups (valid coordinates)
- Out-of-bounds throws error
- Teleporter resolution
- Spinner randomization
- Chute descent
- Wall/door/stairs detection
- Darkness zone detection
- Anti-magic zone detection
- Fixed encounter retrieval (Murphy's Ghosts)
- Message tile retrieval

## Related

- [Dungeon System](../systems/dungeon-system.md) - System overview
- [Dungeon Maps Reference](../research/dungeon-maps-reference.md) - All 10 levels
- [MoveForwardCommand](../commands/MoveForwardCommand.md) - Uses this service
- [DescendStairsCommand](../commands/DescendStairsCommand.md) - Uses this service
