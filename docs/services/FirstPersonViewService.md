# FirstPersonViewService

**Pure function service for first-person 3D view calculations and rendering data.**

## Responsibility

Calculates visible dungeon geometry, wall positions, door placements, and perspective data for first-person dungeon rendering.

## API Reference

### calculateVisibleTiles

Calculate which tiles are visible from party position and facing.

**Signature**:
```typescript
function calculateVisibleTiles(
  position: Position,
  facing: Direction,
  viewDistance: number
): VisibleTile[]
```

**Parameters**:
- `position`: Party's current position (x, y, level)
- `facing`: Party's facing direction ("north", "south", "east", "west")
- `viewDistance`: How far party can see (typically 5 tiles)

**Returns**: Array of visible tiles with depth and perspective info

**Example**:
```typescript
const visible = FirstPersonViewService.calculateVisibleTiles(
  { x: 10, y: 10, level: 1 },
  "north",
  5
)
// visible = [
//   { x: 10, y: 11, depth: 1, column: 0 },  // 1 tile ahead
//   { x: 10, y: 12, depth: 2, column: 0 },  // 2 tiles ahead
//   { x: 9, y: 11, depth: 1, column: -1 },  // 1 left, 1 ahead
//   ...
// ]
```

### getWallSegments

Calculate wall segments to render for visible area.

**Signature**:
```typescript
function getWallSegments(
  visibleTiles: VisibleTile[],
  dungeon: DungeonLevel
): WallSegment[]
```

**Parameters**:
- `visibleTiles`: Tiles visible from party position
- `dungeon`: Current dungeon level map data

**Returns**: Wall segments with position, depth, and side info

**Example**:
```typescript
const walls = FirstPersonViewService.getWallSegments(visible, level1)
// walls = [
//   { depth: 1, side: "left", tileType: "wall" },
//   { depth: 1, side: "right", tileType: "wall" },
//   { depth: 2, side: "front", tileType: "door" },
//   ...
// ]
```

### getDoorPositions

Get positions of visible doors with open/closed state.

**Signature**:
```typescript
function getDoorPositions(
  visibleTiles: VisibleTile[],
  dungeon: DungeonLevel,
  doorStates: Map<string, boolean>
): DoorPosition[]
```

**Parameters**:
- `visibleTiles`: Tiles visible from party position
- `dungeon`: Current dungeon level map data
- `doorStates`: Map of door positions to open/closed state

**Returns**: Doors with position, depth, and state

**Example**:
```typescript
const doors = FirstPersonViewService.getDoorPositions(
  visible,
  level1,
  doorStates
)
// doors = [
//   { x: 10, y: 12, depth: 2, open: false, facing: "north" },
//   { x: 11, y: 13, depth: 3, open: true, facing: "east" }
// ]
```

### calculatePerspective

Calculate perspective scaling for depth rendering.

**Signature**:
```typescript
function calculatePerspective(depth: number): PerspectiveData
```

**Parameters**:
- `depth`: Distance from viewer (1-5)

**Returns**: Scale factors for width, height, and position

**Example**:
```typescript
const perspective = FirstPersonViewService.calculatePerspective(3)
// perspective = { widthScale: 0.4, heightScale: 0.5, yOffset: 100 }
```

### getVisibleMonsters

Get monsters visible in current view.

**Signature**:
```typescript
function getVisibleMonsters(
  visibleTiles: VisibleTile[],
  encounter: Encounter | null
): VisibleMonster[]
```

**Parameters**:
- `visibleTiles`: Tiles visible from party position
- `encounter`: Current encounter (if in combat) or null

**Returns**: Monsters with position and depth for rendering

**Example**:
```typescript
const monsters = FirstPersonViewService.getVisibleMonsters(visible, encounter)
// monsters = [
//   { groupId: "group-0", depth: 2, count: 5, type: "orc" },
//   { groupId: "group-1", depth: 3, count: 2, type: "ogre" }
// ]
```

### getFloorCeilingData

Calculate floor and ceiling rendering data.

**Signature**:
```typescript
function getFloorCeilingData(
  visibleTiles: VisibleTile[]
): FloorCeilingData
```

**Parameters**:
- `visibleTiles`: Tiles visible from party position

**Returns**: Floor/ceiling segments with perspective

**Example**:
```typescript
const floorCeiling = FirstPersonViewService.getFloorCeilingData(visible)
// floorCeiling = {
//   floor: [{ depth: 1, y: 400 }, { depth: 2, y: 350 }, ...],
//   ceiling: [{ depth: 1, y: 200 }, { depth: 2, y: 250 }, ...]
// }
```

### getSpecialTileMarkers

Get markers for special tiles (stairs, teleporters, spinners).

**Signature**:
```typescript
function getSpecialTileMarkers(
  visibleTiles: VisibleTile[],
  dungeon: DungeonLevel
): SpecialMarker[]
```

**Parameters**:
- `visibleTiles`: Tiles visible from party position
- `dungeon`: Current dungeon level map data

**Returns**: Special tile markers with position and type

**Example**:
```typescript
const markers = FirstPersonViewService.getSpecialTileMarkers(visible, level1)
// markers = [
//   { x: 10, y: 15, depth: 5, type: "stairs_down" },
//   { x: 12, y: 13, depth: 3, type: "spinner" }
// ]
```

## View Configuration

### View Distance
- Standard: 5 tiles forward
- Darkness: 3 tiles (MILWA spell not active)
- MILWA spell: Full 5 tiles

### Perspective Depths

| Depth | Width Scale | Height Scale | Y Offset |
|-------|-------------|--------------|----------|
| 1 | 1.0 | 1.0 | 0 |
| 2 | 0.7 | 0.8 | 40 |
| 3 | 0.5 | 0.6 | 80 |
| 4 | 0.3 | 0.4 | 120 |
| 5 | 0.2 | 0.3 | 150 |

### Visible Tile Grid

From party facing north:
```
     -2  -1   0   1   2  (column offset)
5:   [ ] [ ] [ ] [ ] [ ]  (5 tiles ahead)
4:   [ ] [ ] [ ] [ ] [ ]
3:   [ ] [ ] [ ] [ ] [ ]
2:   [ ] [ ] [ ] [ ] [ ]
1:   [ ] [ ] [ ] [ ] [ ]
0:   [ ] [ ] [P] [ ] [ ]  (party position)
```

## Dependencies

Uses:
- `DungeonService` (map data, tile types)
- `VisibilityService` (line of sight, darkness)
- `MapService` (tile queries)

## Testing

See [FirstPersonViewService.test.ts](../../tests/services/FirstPersonViewService.test.ts)

**Key test cases**:
- Visible tiles calculated correctly for each facing
- Wall segments match dungeon geometry
- Doors positioned at correct depth
- Perspective scales decrease with distance
- Special tiles (stairs, spinners) marked correctly
- View distance respects darkness (MILWA spell)
- Monsters positioned at correct depth

## Related

- [VisibilityService](./VisibilityService.md) - Tile visibility logic
- [DungeonService](./DungeonService.md) - Map data
- [First-Person Rendering](../systems/first-person-rendering.md) - Rendering system
- [Canvas Rendering Guide](../ui/canvas-rendering.md) - Implementation details
