# Dungeon Navigation System

**Comprehensive overview of dungeon movement mechanics, stairs interactions, and special tile effects.**

## Overview

The dungeon navigation system handles party movement through the 10-level dungeon, including:
- **Movement validation** - Checking walls, doors, obstacles
- **Position updates** - Calculating new positions based on direction
- **Stairs interactions** - Immediate transitions when walking into stairs walls
- **Special tile effects** - Teleporters, spinners, pits, chutes
- **Encounter triggering** - Random and fixed encounters

**Key Concepts**:
- Grid-based movement (discrete tile positions)
- Four-directional facing (NORTH, SOUTH, EAST, WEST)
- Wall-based collision detection
- Stairs as wall types (not tile types)
- Tile effects trigger after landing (except stairs)

## Architecture

### Services Involved

- **NavigationService** - Movement execution, position updates, stairs transitions
- **DungeonService** - Movement validation, tile data access, stairs validation
- **VisibilityService** - Wall detection for rendering
- **EncounterService** - Encounter triggering after movement

### Movement Validation Priority

When checking if movement is allowed, the system checks in this order:

1. **Wall type at target** - Check if wall blocks movement
   - `stairs_up` / `stairs_down` → Allow + trigger transition (highest priority)
   - `door` / `locked_door` → Block (require kicking)
   - `wall` / `secret` → Block
   - `illusion` / `open` → Allow
2. **Tile type at target** - Check special tile effects (after landing)
   - `teleporter` → Trigger teleport
   - `spinner` → Trigger rotation
   - `pit` → Trigger fall damage
   - `chute` → Trigger forced descent

**Key insight**: Stairs walls trigger **before** position update, while tile effects trigger **after** landing.

## Stairs Wall Interactions

### Overview

Stairs are implemented as **wall types** rather than tile types, allowing:
- Visual rendering of stairs textures on specific walls
- Immediate transition when walking into stairs walls (before position update)
- Distinct textures for stairs_up (castle) vs stairs_down (next level)
- Wall-based texture selection in WebGL renderer

### Wall Types

- **`stairs_up`**: Returns to castle, triggers auto-save
- **`stairs_down`**: Descends to next level, no auto-save

### Data Model

Stairs walls reference destination data stored on tiles:

```json
{
  "x": 0,
  "y": 0,
  "walls": {
    "north": "open",
    "south": "wall",
    "east": "open",
    "west": "stairs_up"
  },
  "destination": {
    "type": "castle"
  }
}
```

**Destination formats**:

```typescript
// Castle (stairs_up)
{ "type": "castle" }

// Level transition (stairs_down)
{
  "level": 2,
  "x": 10,
  "y": 5,
  "facing": "south"  // Optional, defaults to current facing
}
```

### Movement Behavior

When player walks into stairs wall:

1. **`DungeonService.canMove()`** returns:
   ```typescript
   {
     allowed: true,
     triggersSpecialAction: 'stairs',
     destination: { type: 'castle' }  // or level data
   }
   ```

2. **`NavigationService.moveForward()`** calls `handleStairsTransition()` **BEFORE** updating position

3. **Position does NOT update** - transition handles new location

4. **Tile effects are NOT checked** - unlike teleporters which check after landing

### Comparison: Stairs Walls vs Tile Effects

| Feature | Stairs Walls | Tile Effects (teleporter, spinner) |
|---------|--------------|-----------------------------------|
| **Trigger timing** | Before position update | After landing on tile |
| **Position update** | No (transition handles it) | Yes (already at new position) |
| **Tile effects checked** | No | Yes |
| **Validation field** | `triggersSpecialAction: 'stairs'` | No special field |
| **Movement allowed** | Yes (with special action) | Yes (normal movement) |

### Rendering

- **Texture atlas positions:**
  - `stairs_up`: (384, 0) - 64×64 (or via `getTextureById('stairs_up')`)
  - `stairs_down`: (320, 0) - 64×64 (or via `getTextureById('stairs_down')`)
- **Selection priority:** Stairs walls checked before doors or regular walls
- **Selection basis:** Based on `wall.side` (north/south/east/west), not `tile.type`
- **Service:** `WebGLRenderingService.selectWallTexture()`

**Example**: If tile has `walls.north = 'stairs_up'`, only the north wall renders the stairs texture. Other walls render normally.

### Validation

Map validation at load time ensures all stairs walls have valid destination data:

```typescript
const errors = DungeonService.validateStairsWalls(level);
if (errors.length > 0) {
  console.error('Map validation errors:', errors);
  // Example: "Tile (0, 0) has stairs wall but no destination"
}
```

**Validation rules**:
- Any tile with `stairs_up` or `stairs_down` wall **must** have `destination` field
- Destination must be valid (castle type or level number)
- Normal tiles without stairs can omit destination field

## Movement System

### Movement Actions

- **Forward** - Move one tile in facing direction
- **Backward** - Move one tile opposite facing direction
- **Strafe Left** - Move one tile to the left (perpendicular to facing)
- **Strafe Right** - Move one tile to the right (perpendicular to facing)
- **Turn Left** - Rotate 90° counter-clockwise (no position change)
- **Turn Right** - Rotate 90° clockwise (no position change)

### Coordinate System

**Grid coordinates**: (x, y)
- x = 0-19 (west to east)
- y = 0-19 (south to north)

**Facing directions**: NORTH, SOUTH, EAST, WEST

**Direction vectors**:
```typescript
NORTH: { dx: 0, dy: 1 }   // Increase Y
SOUTH: { dx: 0, dy: -1 }  // Decrease Y
EAST:  { dx: 1, dy: 0 }   // Increase X
WEST:  { dx: -1, dy: 0 }  // Decrease X
```

### Movement Validation Flow

```typescript
// 1. Get current position
const currentPos = state.dungeon.position;

// 2. Determine target wall direction
const wallDirection = getWallDirection(currentPos.facing, 'FORWARD');
// Example: Facing NORTH + FORWARD = check north wall

// 3. Get tile at current position
const tile = DungeonService.getTile(level, currentPos.x, currentPos.y);

// 4. Check wall type
const wallType = tile.walls[wallDirection];

// 5. Validate movement
if (wallType === 'wall' || wallType === 'secret') {
  return { allowed: false, reason: 'You walk into a wall. Ouch!' };
}

if (wallType === 'stairs_up' || wallType === 'stairs_down') {
  return {
    allowed: true,
    triggersSpecialAction: 'stairs',
    destination: tile.destination
  };
}

// 6. Calculate new position (if allowed)
const newPos = calculatePosition(currentPos, 'FORWARD');

// 7. Execute movement or transition
if (triggersSpecialAction === 'stairs') {
  handleStairsTransition(destination);  // No position update
} else {
  updatePosition(newPos);  // Normal movement
  checkTileEffects(newPos);  // Teleporter, spinner, etc.
}
```

## Special Tile Effects

### Teleporters

**Trigger timing**: After landing on tile

**Behavior**:
- Instant transport to destination
- Can change level
- Can change facing
- Position update happens normally, then teleport triggers

**Data model**:
```json
{
  "x": 5,
  "y": 10,
  "type": "teleporter",
  "destination": {
    "level": 3,
    "x": 15,
    "y": 8,
    "facing": "west"
  }
}
```

### Spinners

**Trigger timing**: After landing on tile

**Behavior**:
- Randomizes facing direction
- No position change
- Disorients player

### Pits and Chutes

**Trigger timing**: After landing on tile

**Behavior**:
- Forced descent 1-3 levels
- Fall damage based on distance
- Cannot avoid

## Related Documentation

**Services**:
- [NavigationService](../services/NavigationService.md) - Movement execution, stairs transitions
- [DungeonService](../services/DungeonService.md) - Movement validation, stairs validation
- [WebGLRenderingService](../architecture/webgl-renderer.md) - Stairs texture rendering
- [VisibilityService](../services/VisibilityService.md) - Wall detection

**Systems**:
- [Dungeon System](./dungeon-system.md) - Overall dungeon structure
- [First-Person Rendering](./first-person-rendering.md) - Visual representation

**Types**:
- `src/types/Dungeon.ts` - Position, Direction, WallType, MovementValidation
- `src/types/GameState.ts` - DungeonState

**Implementation Notes**:
- Stairs walls introduced in Nov 2025 to replace tile-based stairs
- Enables wall-specific texture rendering
- Maintains backward compatibility with existing movement system
- Performance: No overhead vs tile-based system
