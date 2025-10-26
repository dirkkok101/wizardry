# First-Person Rendering System

**Comprehensive overview of first-person 3D-style dungeon view calculation and rendering.**

## Overview

Wizardry 1 uses a **pseudo-3D first-person perspective** rendered on 2D canvas, creating the illusion of depth without true 3D graphics.

**Key Concepts**:
- Wire-frame style dungeon view
- Visible depth: 3 tiles forward
- Perspective scaling (closer = bigger)
- Party facing determines view direction
- Walls, doors, and corridors rendered
- Canvas-based 2D rendering (not WebGL)

## Architecture

### Services Involved

- **FirstPersonViewService** - Calculate visible tiles, perspective
- **DungeonService** - Get tile data for rendering
- **VisibilityService** - Determine which tiles visible from position
- **RenderingService** - Canvas drawing operations
- **DoorService** - Door state (open/closed) for rendering

### Commands Involved

None directly - rendering is passive (state → view)

### Data Structures

```typescript
interface ViewState {
  position: Position              // Party position
  facing: Direction               // North, South, East, West
  visibleTiles: VisibleTile[]    // Tiles to render
  darkness: boolean               // MILWA spell active?
}

interface VisibleTile {
  relativeX: number               // -1, 0, +1 (left, center, right)
  relativeY: number               // 0, 1, 2, 3 (distance)
  tile: Tile                      // Tile data
  perspective: PerspectiveData    // Scaling info
}

interface PerspectiveData {
  scale: number                   // 1.0 (close) to 0.2 (far)
  screenX: number                 // Canvas X position
  screenY: number                 // Canvas Y position
  width: number                   // Rendered width
  height: number                  // Rendered height
}

interface Tile {
  type: 'floor' | 'wall' | 'door' | 'rock' | 'stairs' | 'teleporter'
  walls: WallState                // Which walls present
  door?: DoorState                // If door tile
}

interface WallState {
  north: boolean
  south: boolean
  east: boolean
  west: boolean
}
```

## View Calculation

### Visible Tile Grid

**From Party Perspective** (facing north):
```
       [-1,3]  [0,3]  [+1,3]    (3 tiles ahead - farthest)
       [-1,2]  [0,2]  [+1,2]    (2 tiles ahead)
       [-1,1]  [0,1]  [+1,1]    (1 tile ahead)
       [-1,0]  [0,0]  [+1,0]    (Current position)
         ^      ^      ^
       Left   Center  Right
```

**Relative Coordinates**:
- X: -1 (left), 0 (center), +1 (right)
- Y: 0 (current), 1, 2, 3 (distance ahead)

### World to View Transformation

**Facing North** (Y decreases):
```typescript
function getVisibleTiles(party: Party): VisibleTile[] {
  const tiles: VisibleTile[] = []

  for (let relY = 0; relY <= 3; relY++) {
    for (let relX = -1; relX <= 1; relX++) {
      const worldX = party.position.x + relX
      const worldY = party.position.y - relY  // North = -Y

      const tile = DungeonService.getTile(party.position.level, {x: worldX, y: worldY})
      const perspective = calculatePerspective(relX, relY)

      tiles.push({ relativeX: relX, relativeY: relY, tile, perspective })
    }
  }

  return tiles
}
```

**Facing East** (X increases):
```typescript
// Rotate coordinates 90° clockwise
worldX = party.position.x + relY  // Distance = +X
worldY = party.position.y + relX  // Left/right = +Y
```

**Facing South** (Y increases):
```typescript
worldX = party.position.x - relX  // Left/right inverted
worldY = party.position.y + relY  // South = +Y
```

**Facing West** (X decreases):
```typescript
worldX = party.position.x - relY  // Distance = -X
worldY = party.position.y - relX  // Left/right inverted
```

## Perspective Scaling

### Distance-Based Scaling

**Scaling Formula**:
```typescript
function calculateScale(distance: number): number {
  const scales = [
    1.0,   // Distance 0 (current tile)
    0.7,   // Distance 1 (1 tile ahead)
    0.4,   // Distance 2 (2 tiles ahead)
    0.2    // Distance 3 (3 tiles ahead)
  ]
  return scales[distance] || 0.0
}
```

**Perspective Diminishing**:
- Closer tiles rendered larger (scale 1.0)
- Farther tiles rendered smaller (scale 0.2)
- Creates depth illusion

### Screen Position Calculation

**Canvas Layout**:
```
Canvas: 800×600 pixels

Center X = 400
Center Y = 300

View corridor:
  Width at distance 0: 400px
  Width at distance 3: 80px
```

**Position Formula**:
```typescript
function calculateScreenPosition(
  relX: number,
  relY: number,
  scale: number
): {x: number, y: number, width: number, height: number} {
  const centerX = 400
  const centerY = 300

  const baseWidth = 400
  const baseHeight = 300

  const width = baseWidth * scale
  const height = baseHeight * scale

  // Offset based on left/center/right
  const xOffset = relX * (width / 3)

  // Y offset based on distance
  const yOffset = relY * (height / 4)

  return {
    x: centerX + xOffset - width / 2,
    y: centerY - yOffset - height / 2,
    width,
    height
  }
}
```

## Rendering Order

### Layer-Based Rendering

**Rendering Sequence** (back to front):
1. **Background** - Black void
2. **Far walls** (distance 3)
3. **Mid walls** (distance 2)
4. **Near walls** (distance 1)
5. **Current tile walls** (distance 0)
6. **Doors** - Overlaid on walls
7. **Stairs** - Special floor markers
8. **Overlays** - Darkness, effects

**Painter's Algorithm**: Render far objects first, near objects last (occlusion)

### Wall Rendering

**Wall Types**:
- **Corridor walls**: Vertical lines (left/right edges)
- **End walls**: Horizontal lines (ahead)
- **Corners**: L-shaped intersections

**Drawing Walls**:
```typescript
function renderWall(
  ctx: CanvasRenderingContext2D,
  wall: 'north' | 'south' | 'east' | 'west',
  perspective: PerspectiveData
): void {
  ctx.strokeStyle = '#888888'  // Gray wire-frame
  ctx.lineWidth = 2

  switch (wall) {
    case 'north':
      // Top wall (distance ahead)
      ctx.beginPath()
      ctx.moveTo(perspective.x, perspective.y)
      ctx.lineTo(perspective.x + perspective.width, perspective.y)
      ctx.stroke()
      break

    case 'east':
      // Right wall
      ctx.beginPath()
      ctx.moveTo(perspective.x + perspective.width, perspective.y)
      ctx.lineTo(perspective.x + perspective.width, perspective.y + perspective.height)
      ctx.stroke()
      break

    case 'west':
      // Left wall
      ctx.beginPath()
      ctx.moveTo(perspective.x, perspective.y)
      ctx.lineTo(perspective.x, perspective.y + perspective.height)
      ctx.stroke()
      break
  }
}
```

### Door Rendering

**Door States**:
- **Closed**: Rendered as solid wall with door icon
- **Open**: Rendered as recessed opening
- **Locked**: Rendered with lock icon

**Drawing Doors**:
```typescript
function renderDoor(
  ctx: CanvasRenderingContext2D,
  door: DoorState,
  perspective: PerspectiveData
): void {
  if (door.open) {
    // Draw recessed opening
    ctx.fillStyle = '#444444'
    ctx.fillRect(
      perspective.x + perspective.width * 0.3,
      perspective.y,
      perspective.width * 0.4,
      perspective.height
    )
  } else {
    // Draw closed door
    ctx.fillStyle = '#664400'
    ctx.fillRect(
      perspective.x + perspective.width * 0.3,
      perspective.y,
      perspective.width * 0.4,
      perspective.height
    )

    // Draw door frame
    ctx.strokeStyle = '#888888'
    ctx.lineWidth = 2
    ctx.strokeRect(
      perspective.x + perspective.width * 0.3,
      perspective.y,
      perspective.width * 0.4,
      perspective.height
    )
  }
}
```

## Darkness Zones

### MILWA Spell Effect

**Without MILWA**:
- Darkness zones render black (no walls visible)
- Party can still move
- Bumps into walls blind

**With MILWA**:
- Normal rendering
- Walls and doors visible
- Duration: Until leaving darkness zone

**Rendering Darkness**:
```typescript
function renderView(viewState: ViewState): void {
  if (viewState.darkness && !hasMILWA(viewState.party)) {
    // Render all black (no walls)
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, 800, 600)

    // Show "It's too dark to see" message
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '24px monospace'
    ctx.fillText("It's too dark to see!", 250, 300)
  } else {
    // Normal rendering
    renderWalls(viewState)
    renderDoors(viewState)
  }
}
```

## Special Tile Rendering

### Stairs

**Descending Stairs**:
- Render floor with down arrow
- Arrow icon: ↓ or stair graphic

**Ascending Stairs**:
- Render floor with up arrow
- Arrow icon: ↑ or stair graphic

### Teleporters

**Visual Indicator**:
- Shimmering effect on floor
- Pulsating color (optional)
- Warning: "Teleporter ahead!"

### Spinners

**Visual Indicator**:
- Rotating spiral on floor
- Disorienting animation
- No visual indicator (implementation choice)

## Canvas Implementation

### Canvas Setup

**HTML**:
```html
<canvas id="dungeon-view" width="800" height="600"></canvas>
```

**TypeScript**:
```typescript
const canvas = document.getElementById('dungeon-view') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!

// Set rendering properties
ctx.imageSmoothingEnabled = false  // Crisp pixels
ctx.lineCap = 'square'
ctx.lineJoin = 'miter'
```

### Rendering Loop

```typescript
function render(gameState: GameState): void {
  const viewState = calculateViewState(gameState.party)

  // Clear canvas
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, 800, 600)

  // Render visible tiles (back to front)
  for (const tile of viewState.visibleTiles.reverse()) {
    renderTile(ctx, tile)
  }

  // Render party stats overlay (HP, spell points)
  renderStatsOverlay(ctx, gameState.party)
}
```

### Performance Optimization

**Dirty Rectangle**:
- Only redraw changed regions
- Track previous frame state
- Compare and skip unchanged areas

**Offscreen Canvas**:
- Pre-render walls to offscreen canvas
- Composite to main canvas
- Faster for complex scenes

**Sprite Caching**:
- Cache common wall segments
- Reuse cached sprites
- Scale/position as needed

## View Distance

### Visibility Limits

**Standard View**: 3 tiles ahead

**Extended View** (rare spells):
- Some spells may extend view to 5 tiles
- Implementation detail (not in original)

**Reduced View**:
- Darkness: 0 tiles (black screen)
- Fog: 1 tile (limited visibility)

### Occlusion

**Wall Occlusion**:
- Walls block view of tiles behind
- Cannot see through walls
- Doors block view when closed

**Corridor Visibility**:
```
Party facing North:

X X X   (3 ahead - visible if corridor)
X . X   (2 ahead - visible)
X . X   (1 ahead - visible)
X P X   (current - always visible)

X = wall, P = party, . = floor
```

## Related Documentation

**Services**:
- [FirstPersonViewService](../services/FirstPersonViewService.md) - View calculation
- [RenderingService](../services/RenderingService.md) - Canvas operations
- [VisibilityService](../services/VisibilityService.md) - Tile visibility

**Commands**:
- None (rendering is passive)

**Game Design**:
- [Dungeon Navigation](../game-design/06-dungeon.md) - Player perspective
- [Controls](../game-design/12-controls.md) - Movement keys

**Research**:
- No specific research docs (implementation detail)

**Diagrams**:
- [Architecture Layers](../diagrams/architecture-layers.md) - UI layer

**Implementation Notes**:
- Wire-frame aesthetic maintains original Wizardry feel
- Canvas 2D rendering sufficient (no WebGL needed)
- Perspective scaling creates convincing depth
- Performance excellent on modern browsers
