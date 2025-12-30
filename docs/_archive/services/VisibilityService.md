# VisibilityService

**Pure function service for tile visibility, line of sight, and darkness calculations.**

## Responsibility

Determines which tiles are visible from a position considering facing direction, view distance, walls, doors, and light levels (MILWA spell).

## API Reference

### calculateVisibleTiles

Calculate all tiles visible from position and facing.

**Signature**:
```typescript
function calculateVisibleTiles(
  position: Position,
  facing: Direction,
  dungeon: DungeonLevel,
  viewDistance: number,
  hasLight: boolean
): VisibleTile[]
```

**Parameters**:
- `position`: Viewing position (party location)
- `facing`: Direction facing ("north", "south", "east", "west")
- `dungeon`: Current dungeon level map
- `viewDistance`: Max distance to see (1-5 tiles)
- `hasLight`: True if MILWA spell active, false for darkness

**Returns**: Array of visible tiles with depth and column offset

**Example**:
```typescript
const visible = VisibilityService.calculateVisibleTiles(
  { x: 10, y: 10, level: 1 },
  "north",
  level1,
  5,
  true
)
// visible = [
//   { x: 10, y: 11, depth: 1, column: 0 },
//   { x: 10, y: 12, depth: 2, column: 0 },
//   { x: 9, y: 11, depth: 1, column: -1 },
//   ...
// ]
```

### hasLineOfSight

Check if there's unobstructed line of sight between two positions.

**Signature**:
```typescript
function hasLineOfSight(
  from: Position,
  to: Position,
  dungeon: DungeonLevel,
  ignoreDoors: boolean
): boolean
```

**Parameters**:
- `from`: Starting position
- `to`: Target position
- `dungeon`: Dungeon level map
- `ignoreDoors`: True to treat doors as transparent

**Returns**: True if line of sight exists, false if blocked

**Example**:
```typescript
const canSee = VisibilityService.hasLineOfSight(
  partyPos,
  monsterPos,
  level1,
  false
)
// canSee = true (no walls between party and monster)
```

### isVisible

Check if specific tile is visible from position.

**Signature**:
```typescript
function isVisible(
  viewerPos: Position,
  targetPos: Position,
  facing: Direction,
  viewDistance: number,
  dungeon: DungeonLevel
): boolean
```

**Parameters**:
- `viewerPos`: Viewer position
- `targetPos`: Target tile position
- `facing`: Viewer facing direction
- `viewDistance`: Max view distance
- `dungeon`: Dungeon level map

**Returns**: True if target visible from viewer position

**Example**:
```typescript
const visible = VisibilityService.isVisible(
  partyPos,
  chestPos,
  "north",
  5,
  level1
)
// visible = false (chest behind party)
```

### getViewDistance

Get effective view distance based on light conditions.

**Signature**:
```typescript
function getViewDistance(
  hasLight: boolean,
  inDarkness: boolean
): number
```

**Parameters**:
- `hasLight`: True if MILWA spell active
- `inDarkness`: True if area has darkness attribute

**Returns**: View distance in tiles (1-5)

**Example**:
```typescript
const distance = VisibilityService.getViewDistance(false, true)
// distance = 1 (darkness without MILWA = 1 tile only)
```

### getVisibilityMask

Get visibility mask for rendering (which tiles to show).

**Signature**:
```typescript
function getVisibilityMask(
  position: Position,
  facing: Direction,
  dungeon: DungeonLevel,
  viewDistance: number
): Set<string>
```

**Parameters**:
- `position`: Viewer position
- `facing`: Facing direction
- `dungeon`: Dungeon level map
- `viewDistance`: Max view distance

**Returns**: Set of visible tile keys ("x,y")

**Example**:
```typescript
const mask = VisibilityService.getVisibilityMask(
  partyPos,
  "north",
  level1,
  5
)
// mask = Set(["10,11", "10,12", "9,11", "11,11", ...])
```

### isInFieldOfView

Check if position is within field of view cone.

**Signature**:
```typescript
function isInFieldOfView(
  viewerPos: Position,
  targetPos: Position,
  facing: Direction,
  fovAngle: number
): boolean
```

**Parameters**:
- `viewerPos`: Viewer position
- `targetPos`: Target position
- `facing`: Viewer facing direction
- `fovAngle`: Field of view angle in degrees (typically 90)

**Returns**: True if target in field of view

**Example**:
```typescript
const inFOV = VisibilityService.isInFieldOfView(
  partyPos,
  monsterPos,
  "north",
  90
)
// inFOV = true (monster within 90-degree cone ahead)
```

### blocksLineOfSight

Check if tile type blocks line of sight.

**Signature**:
```typescript
function blocksLineOfSight(
  tileType: TileType,
  ignoreDoors: boolean
): boolean
```

**Parameters**:
- `tileType`: Type of tile ("wall", "door", "floor", etc.)
- `ignoreDoors`: True to treat doors as transparent

**Returns**: True if tile blocks visibility

**Example**:
```typescript
const blocks = VisibilityService.blocksLineOfSight("wall", false)
// blocks = true (walls always block)

const blocks2 = VisibilityService.blocksLineOfSight("door", true)
// blocks2 = false (ignoring doors)
```

## Visibility Rules

### View Distance by Light Level

| Condition | View Distance | Notes |
|-----------|---------------|-------|
| Normal (no spell) | 3 tiles | Default in dark dungeons |
| MILWA active | 5 tiles | Light spell extends vision |
| Darkness zones | 1 tile | Special dark areas |
| MILWA in darkness | 3 tiles | Light helps but limited |

### Field of View
- **Cone Angle**: 90 degrees
- **Direction**: Forward from facing
- **Peripheral**: Limited (can't see behind)

### Line of Sight Blocking

**Always Blocks**:
- Walls
- Closed doors (unless ignoreDoors = true)

**Never Blocks**:
- Open doors
- Floor tiles
- Empty space
- Stairs

**Special Cases**:
- Secret doors block until discovered
- Force fields block like walls
- Spinners don't block visibility

## Dependencies

Uses:
- `DungeonService` (tile types, wall checking)
- `MapService` (tile queries)

## Testing

See [VisibilityService.test.ts](../../tests/services/VisibilityService.test.ts)

**Key test cases**:
- Visible tiles within view distance
- Walls block line of sight
- Doors block unless ignored
- Field of view cone correct for each facing
- MILWA extends view distance
- Darkness reduces view distance
- Tiles behind party not visible
- Diagonal visibility works correctly

## Related

- [FirstPersonViewService](./FirstPersonViewService.md) - Uses visibility for 3D rendering
- [AutomapService](./AutomapService.md) - Uses visibility for exploration
- [DungeonService](./DungeonService.md) - Map data
- [MILWA Spell](../research/spell-reference.md) - Light spell
- [First-Person Rendering](../systems/first-person-rendering.md) - Rendering system
