# TileService

**Pure function service for special tile effects (teleporters, spinners, chutes, darkness zones, anti-magic zones).**

## Responsibility

Handles special tile effects when party moves onto or interacts with special dungeon tiles. Manages teleportation, spinner disorientation, chute falls, darkness zones, and anti-magic zones.

## API Reference

### processTileEffect

Process special effect when party enters a tile.

**Signature**:
```typescript
function processTileEffect(
  gameState: GameState,
  dungeonData: DungeonData,
  position: Position
): GameState
```

**Parameters**:
- `gameState`: Current game state
- `dungeonData`: Dungeon map data
- `position`: Tile position

**Returns**: New game state after tile effect applied

**Example**:
```typescript
// Party steps on teleporter at Level 1 (5E, 9N) → warps to (15E, 4N)
const newState = TileService.processTileEffect(gameState, dungeonData, { x: 5, y: 9 })
// newState.party.position === { x: 15, y: 4 }
```

### getTileEffect

Get special effect type for a tile.

**Signature**:
```typescript
function getTileEffect(
  dungeonData: DungeonData,
  level: number,
  position: Position
): TileEffect | null
```

**Parameters**:
- `dungeonData`: Dungeon map data
- `level`: Dungeon level
- `position`: Tile coordinates

**Returns**: Tile effect type, or `null` if normal tile

**Example**:
```typescript
const effect = TileService.getTileEffect(dungeonData, 1, { x: 5, y: 9 })
// effect = { type: "teleporter", destination: { level: 1, x: 15, y: 4 } }

const normal = TileService.getTileEffect(dungeonData, 1, { x: 1, y: 1 })
// normal === null (normal floor tile)
```

### applyTeleporter

Apply teleporter effect.

**Signature**:
```typescript
function applyTeleporter(
  party: Party,
  destination: Position,
  destLevel?: number
): Party
```

**Parameters**:
- `party`: Current party state
- `destination`: Teleport destination coordinates
- `destLevel`: Optional level change (default: same level)

**Returns**: New party state at destination

**Example**:
```typescript
const newParty = TileService.applyTeleporter(
  party,
  { x: 15, y: 4 },
  1
)
// newParty.position === { x: 15, y: 4 }
// newParty.level === 1 (same level)
```

### applySpinner

Apply spinner effect (randomize facing direction).

**Signature**:
```typescript
function applySpinner(party: Party): Party
```

**Parameters**:
- `party`: Current party state

**Returns**: New party state with random facing direction

**Example**:
```typescript
const originalFacing = party.facing // "north"
const newParty = TileService.applySpinner(party)
// newParty.facing === "west" (random direction)
```

### applyChute

Apply chute effect (force fall to lower level).

**Signature**:
```typescript
function applyChute(
  party: Party,
  destination: Position,
  destLevel: number
): Party
```

**Parameters**:
- `party`: Current party state
- `destination`: Landing coordinates
- `destLevel`: Destination level (usually currentLevel - 1)

**Returns**: New party state at lower level

**Throws**:
- `InvalidLevelError` if destLevel < 1

**Example**:
```typescript
const newParty = TileService.applyChute(party, { x: 10, y: 10 }, 7)
// newParty.position === { x: 10, y: 10 }
// newParty.level === 7 (fell from level 8)
```

### isDarknessZone

Check if position is in a darkness zone.

**Signature**:
```typescript
function isDarknessZone(
  dungeonData: DungeonData,
  level: number,
  position: Position
): boolean
```

**Parameters**:
- `dungeonData`: Dungeon map data
- `level`: Dungeon level
- `position`: Tile coordinates

**Returns**: `true` if in darkness zone (MILWA/LOMILWA ineffective)

**Example**:
```typescript
// Level 1 darkness zone starts at (9E, 12N)
const isDark = TileService.isDarknessZone(dungeonData, 1, { x: 9, y: 12 })
// isDark === true

const isLit = TileService.isDarknessZone(dungeonData, 1, { x: 5, y: 5 })
// isLit === false (normal lighting)
```

### isAntiMagicZone

Check if position is in an anti-magic zone.

**Signature**:
```typescript
function isAntiMagicZone(
  dungeonData: DungeonData,
  level: number,
  position: Position
): boolean
```

**Parameters**:
- `dungeonData`: Dungeon map data
- `level`: Dungeon level
- `position`: Tile coordinates

**Returns**: `true` if spells cannot be cast in this zone

**Example**:
```typescript
const isAntiMagic = TileService.isAntiMagicZone(dungeonData, 5, { x: 10, y: 10 })
// isAntiMagic === true (anti-magic zone)
```

### getStairDestination

Get destination for stairs.

**Signature**:
```typescript
function getStairDestination(
  dungeonData: DungeonData,
  level: number,
  position: Position
): { level: number; position: Position } | null
```

**Parameters**:
- `dungeonData`: Dungeon map data
- `level`: Current level
- `position`: Stairs tile position

**Returns**: Destination level and position, or `null` if not stairs

**Example**:
```typescript
// Stairs down at Level 1 (0E, 10N) → Level 2
const dest = TileService.getStairDestination(dungeonData, 1, { x: 0, y: 10 })
// dest = { level: 2, position: { x: 0, y: 10 } }
```

### isTeleporterTile

Check if tile is a teleporter.

**Signature**:
```typescript
function isTeleporterTile(
  dungeonData: DungeonData,
  level: number,
  position: Position
): boolean
```

**Parameters**:
- `dungeonData`: Dungeon map data
- `level`: Dungeon level
- `position`: Tile coordinates

**Returns**: `true` if tile is teleporter

**Example**:
```typescript
const isTeleporter = TileService.isTeleporterTile(dungeonData, 1, { x: 5, y: 9 })
// isTeleporter === true
```

### isSpinnerTile

Check if tile is a spinner.

**Signature**:
```typescript
function isSpinnerTile(
  dungeonData: DungeonData,
  level: number,
  position: Position
): boolean
```

**Parameters**:
- `dungeonData`: Dungeon map data
- `level`: Dungeon level
- `position`: Tile coordinates

**Returns**: `true` if tile is spinner

**Example**:
```typescript
// Level 8 has many spinners
const isSpinner = TileService.isSpinnerTile(dungeonData, 8, { x: 10, y: 10 })
// isSpinner === true
```

## Dependencies

Uses:
- `DungeonService` (get tile data)
- `RandomService` (randomize facing for spinners)
- `ValidationService` (validate positions and levels)

## Testing

See [TileService.test.ts](../../tests/services/TileService.test.ts)

**Key test cases**:
- Process teleporter tile effect
- Process spinner tile effect
- Process chute tile effect
- Get tile effect for teleporter
- Get tile effect for normal tile (returns null)
- Apply teleporter (same level)
- Apply teleporter (different level)
- Apply spinner (randomizes facing)
- Apply chute (drops to lower level)
- Check darkness zone (Level 1 darkness area)
- Check anti-magic zone
- Get stair destination (up and down)
- Check teleporter tile
- Check spinner tile
- Invalid level throws error

## Related

- [DungeonService](./DungeonService.md) - Provides tile data
- [NavigationService](./NavigationService.md) - Movement triggers tile effects
- [MoveForwardCommand](../commands/MoveForwardCommand.md) - Calls processTileEffect
- [SpellService](./SpellService.md) - Checks anti-magic zones
- [Dungeon Maps Reference](../research/dungeon-maps-reference.md) - Special tile mechanics
