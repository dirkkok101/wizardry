# AutomapService

**Pure function service for blueprint-style automap rendering and exploration tracking.**

## Responsibility

Manages automap state, exploration tracking, map rendering data, and blueprint-style visualization of explored dungeon areas.

## API Reference

### updateExploration

Mark tiles as explored when party visits or sees them.

**Signature**:
```typescript
function updateExploration(
  automap: Automap,
  position: Position,
  visibleTiles: VisibleTile[]
): Automap
```

**Parameters**:
- `automap`: Current automap state
- `position`: Party's current position
- `visibleTiles`: Tiles visible from current position

**Returns**: New automap with tiles marked as explored

**Example**:
```typescript
const updatedMap = AutomapService.updateExploration(
  automap,
  { x: 10, y: 10, level: 1 },
  visibleTiles
)
// updatedMap.explored now includes (10,10) and all visible tiles
```

### getMapRenderData

Get rendering data for automap display.

**Signature**:
```typescript
function getMapRenderData(
  automap: Automap,
  dungeon: DungeonLevel,
  centerPosition: Position,
  viewRadius: number
): MapRenderData
```

**Parameters**:
- `automap`: Current automap state
- `dungeon`: Current dungeon level
- `centerPosition`: Position to center map on (usually party position)
- `viewRadius`: Tiles to show in each direction (typically 10)

**Returns**: Rendering data with walls, doors, explored tiles, party position

**Example**:
```typescript
const renderData = AutomapService.getMapRenderData(
  automap,
  level1,
  partyPosition,
  10
)
// renderData = {
//   walls: [...],
//   doors: [...],
//   explored: Set([...]),
//   partyPos: { x: 10, y: 10 },
//   partyFacing: "north"
// }
```

### isExplored

Check if specific tile has been explored.

**Signature**:
```typescript
function isExplored(automap: Automap, position: Position): boolean
```

**Parameters**:
- `automap`: Current automap state
- `position`: Position to check

**Returns**: True if tile has been explored, false otherwise

**Example**:
```typescript
const explored = AutomapService.isExplored(automap, { x: 10, y: 10, level: 1 })
// explored = true (party has visited this tile)
```

### getWallLines

Get wall lines for blueprint rendering.

**Signature**:
```typescript
function getWallLines(
  automap: Automap,
  dungeon: DungeonLevel,
  bounds: Bounds
): WallLine[]
```

**Parameters**:
- `automap`: Current automap state (for explored areas)
- `dungeon`: Dungeon level map data
- `bounds`: Rendering bounds (min/max x/y)

**Returns**: Wall lines with start/end positions

**Example**:
```typescript
const walls = AutomapService.getWallLines(automap, level1, bounds)
// walls = [
//   { x1: 10, y1: 10, x2: 10, y2: 11 },  // Vertical wall
//   { x1: 10, y1: 11, x2: 11, y2: 11 },  // Horizontal wall
//   ...
// ]
```

### getDoorMarkers

Get door markers for automap.

**Signature**:
```typescript
function getDoorMarkers(
  automap: Automap,
  dungeon: DungeonLevel,
  bounds: Bounds
): DoorMarker[]
```

**Parameters**:
- `automap`: Current automap state
- `dungeon`: Dungeon level map data
- `bounds`: Rendering bounds

**Returns**: Door markers with position and orientation

**Example**:
```typescript
const doors = AutomapService.getDoorMarkers(automap, level1, bounds)
// doors = [
//   { x: 10, y: 12, orientation: "horizontal", explored: true },
//   { x: 11, y: 10, orientation: "vertical", explored: false }
// ]
```

### getSpecialTileMarkers

Get markers for stairs, teleporters, spinners.

**Signature**:
```typescript
function getSpecialTileMarkers(
  automap: Automap,
  dungeon: DungeonLevel,
  bounds: Bounds
): SpecialTileMarker[]
```

**Parameters**:
- `automap`: Current automap state
- `dungeon`: Dungeon level map data
- `bounds`: Rendering bounds

**Returns**: Special tile markers with type and position

**Example**:
```typescript
const markers = AutomapService.getSpecialTileMarkers(automap, level1, bounds)
// markers = [
//   { x: 10, y: 15, type: "stairs_down", explored: true },
//   { x: 5, y: 20, type: "spinner", explored: true },
//   { x: 12, y: 8, type: "teleporter", explored: false }
// ]
```

### clearAutomap

Reset automap exploration for current level.

**Signature**:
```typescript
function clearAutomap(automap: Automap, level: number): Automap
```

**Parameters**:
- `automap`: Current automap state
- `level`: Dungeon level to clear (1-10)

**Returns**: New automap with specified level unexplored

**Example**:
```typescript
const cleared = AutomapService.clearAutomap(automap, 3)
// All exploration data for level 3 removed
```

### exportAutomapData

Export automap as JSON for save system.

**Signature**:
```typescript
function exportAutomapData(automap: Automap): AutomapData
```

**Parameters**:
- `automap`: Current automap state

**Returns**: Serializable automap data

**Example**:
```typescript
const data = AutomapService.exportAutomapData(automap)
// data = { explored: [[x,y,level], ...], version: 1 }
```

## Automap Display Modes

### Compact Mode
- Shows 10x10 tiles around party
- Blueprint style (white lines on blue)
- Party position marked with arrow
- Unexplored areas black

### Full Level Mode
- Shows entire explored portion of level
- Can pan/zoom
- Overview of dungeon layout

### DUMAPIC Spell Mode
- Shows coordinates and facing
- Overlays position info on map
- Temporary display (doesn't update exploration)

## Blueprint Style Rendering

### Visual Elements
- **Walls**: White lines (explored), hidden (unexplored)
- **Doors**: White rectangles with gap
- **Stairs Down**: Down arrow symbol
- **Stairs Up**: Up arrow symbol
- **Spinners**: Circular arrow symbol
- **Teleporters**: "T" marker
- **Party**: Arrow pointing in facing direction
- **Background**: Dark blue (explored), black (unexplored)

### Grid Scale
- 1 tile = 10x10 pixels
- Walls = 2px thick lines
- Party marker = 8x8 pixels

## Dependencies

Uses:
- `DungeonService` (map data, tile types)
- `VisibilityService` (visible tile calculation)
- `MapService` (tile queries)

## Testing

See [AutomapService.test.ts](../../tests/services/AutomapService.test.ts)

**Key test cases**:
- Tiles marked explored when visited
- Visible tiles added to exploration
- Wall lines generated for explored areas only
- Door markers positioned correctly
- Special tiles (stairs, spinners) marked
- Automap clears correctly per level
- Export/import preserves exploration data

## Related

- [VisibilityService](./VisibilityService.md) - Visible tile calculation
- [FirstPersonViewService](./FirstPersonViewService.md) - 3D view rendering
- [DungeonService](./DungeonService.md) - Map data
- [Automap System](../systems/automap-system.md) - Automap overview
- [DUMAPIC Spell](../research/spell-reference.md) - Position display spell
