# Automap System

**Comprehensive overview of blueprint-style dungeon mapping and exploration tracking.**

## Overview

The automap provides a **top-down blueprint view** of explored dungeon areas, essential for navigation and orientation.

**Key Concepts**:
- Explored tiles tracked per dungeon level
- Blueprint-style rendering (white lines on black)
- Shows walls, doors, stairs, special tiles
- Party position and facing indicator
- Grid coordinates optional display
- Persistent across game sessions

## Architecture

### Services Involved

- **AutomapService** - Map rendering, exploration tracking
- **MapService** - Explored tile management
- **DungeonService** - Tile data retrieval
- **VisibilityService** - Determine visible/explored tiles
- **RenderingService** - Canvas drawing

### Commands Involved

- **ToggleAutomapCommand** - Show/hide automap
- **CastDUMAPICCommand** - Reveal coordinates on map

### Data Structures

```typescript
interface ExplorationState {
  exploredTiles: Map<string, ExploredTile>  // Key: "level-x-y"
  currentLevel: number
  partyPosition: Position
  partyFacing: Direction
}

interface ExploredTile {
  position: Position
  tile: Tile
  exploredAt: number                        // Timestamp
  walls: WallState
  special: 'stairs' | 'teleporter' | 'spinner' | null
}

interface MapRenderOptions {
  showGrid: boolean                         // Draw coordinate grid
  showCoordinates: boolean                  // Label coordinates
  showUnexplored: boolean                   // Fog of war vs. hidden
  zoom: number                              // 1.0 = normal, 2.0 = zoomed
  centerOnParty: boolean                    // Auto-center map on party
}
```

## Exploration Tracking

### Tile Discovery

**Discovery Trigger**:
- Party moves to new tile → mark current tile explored
- Party can see ahead 3 tiles → mark visible tiles explored
- DUMAPIC spell → no additional exploration (just shows coordinates)

**Exploration Algorithm**:
```typescript
function markExplored(party: Party, dungeonLevel: number): ExplorationState {
  const explored = new Set<string>()

  // Current tile always explored
  explored.add(tileKey(party.position))

  // Visible tiles in view cone (3 ahead)
  const visibleTiles = VisibilityService.getVisibleTiles(party)
  for (const tile of visibleTiles) {
    explored.add(tileKey(tile.position))
  }

  return updateExplorationState(explored)
}

function tileKey(pos: Position): string {
  return `${pos.level}-${pos.x}-${pos.y}`
}
```

### Fog of War

**Unexplored Tiles**:
- Option 1: Hidden (black, not rendered)
- Option 2: Fog (grayed out, partially visible)
- Option 3: Outline only (walls hinted)

**Implementation Choice**: Hidden (original Wizardry approach)

### Persistent Exploration

**Storage**:
- ExplorationState saved with game state
- Persists across sessions
- Per-dungeon level tracking

**Reset**:
- New game: All tiles unexplored
- Death and reload: Exploration retained
- Manual clear: Delete saved exploration (debugging)

## Map Rendering

### Blueprint Style

**Visual Design**:
- Black background
- White lines for walls
- Gray for unexplored (if fog enabled)
- Red for party position
- Yellow for stairs
- Cyan for special tiles

**Tile Scale**:
```
Grid: 20×20 tiles (per level)
Canvas: 600×600 pixels
Tile size: 30×30 pixels
```

### Grid Rendering

**Grid Lines**:
```typescript
function renderGrid(ctx: CanvasRenderingContext2D, options: MapRenderOptions): void {
  if (!options.showGrid) return

  ctx.strokeStyle = '#333333'  // Dark gray
  ctx.lineWidth = 1

  for (let x = 0; x <= 20; x++) {
    ctx.beginPath()
    ctx.moveTo(x * 30, 0)
    ctx.lineTo(x * 30, 600)
    ctx.stroke()
  }

  for (let y = 0; y <= 20; y++) {
    ctx.beginPath()
    ctx.moveTo(0, y * 30)
    ctx.lineTo(600, y * 30)
    ctx.stroke()
  }
}
```

**Coordinate Labels**:
```typescript
function renderCoordinates(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#888888'
  ctx.font = '10px monospace'

  for (let x = 0; x < 20; x++) {
    ctx.fillText(x.toString(), x * 30 + 10, 10)
  }

  for (let y = 0; y < 20; y++) {
    ctx.fillText(y.toString(), 5, y * 30 + 20)
  }
}
```

### Wall Rendering

**Wall Drawing**:
```typescript
function renderWalls(
  ctx: CanvasRenderingContext2D,
  tile: ExploredTile,
  tileSize: number
): void {
  const x = tile.position.x * tileSize
  const y = tile.position.y * tileSize

  ctx.strokeStyle = '#FFFFFF'
  ctx.lineWidth = 2

  if (tile.walls.north) {
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + tileSize, y)
    ctx.stroke()
  }

  if (tile.walls.south) {
    ctx.beginPath()
    ctx.moveTo(x, y + tileSize)
    ctx.lineTo(x + tileSize, y + tileSize)
    ctx.stroke()
  }

  if (tile.walls.east) {
    ctx.beginPath()
    ctx.moveTo(x + tileSize, y)
    ctx.lineTo(x + tileSize, y + tileSize)
    ctx.stroke()
  }

  if (tile.walls.west) {
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x, y + tileSize)
    ctx.stroke()
  }
}
```

### Door Rendering

**Door Indicator**:
```typescript
function renderDoor(
  ctx: CanvasRenderingContext2D,
  tile: ExploredTile,
  tileSize: number
): void {
  const x = tile.position.x * tileSize
  const y = tile.position.y * tileSize

  // Draw door as gap in wall with marker
  if (tile.tile.door) {
    ctx.fillStyle = tile.tile.door.open ? '#00FF00' : '#FFFF00'
    ctx.fillRect(x + tileSize / 2 - 3, y + tileSize / 2 - 3, 6, 6)
  }
}
```

### Special Tile Rendering

**Stairs**:
```typescript
function renderStairs(
  ctx: CanvasRenderingContext2D,
  tile: ExploredTile,
  tileSize: number
): void {
  const x = tile.position.x * tileSize + tileSize / 2
  const y = tile.position.y * tileSize + tileSize / 2

  ctx.fillStyle = '#FFFF00'  // Yellow
  ctx.font = '16px monospace'

  if (tile.special === 'stairs') {
    ctx.fillText(tile.tile.stairsDirection === 'down' ? '↓' : '↑', x - 5, y + 5)
  }
}
```

**Teleporters**:
```typescript
function renderTeleporter(
  ctx: CanvasRenderingContext2D,
  tile: ExploredTile,
  tileSize: number
): void {
  const x = tile.position.x * tileSize + tileSize / 2
  const y = tile.position.y * tileSize + tileSize / 2

  ctx.fillStyle = '#00FFFF'  // Cyan
  ctx.font = '16px monospace'
  ctx.fillText('T', x - 5, y + 5)
}
```

**Spinners**:
```typescript
function renderSpinner(
  ctx: CanvasRenderingContext2D,
  tile: ExploredTile,
  tileSize: number
): void {
  const x = tile.position.x * tileSize + tileSize / 2
  const y = tile.position.y * tileSize + tileSize / 2

  ctx.fillStyle = '#FF00FF'  // Magenta
  ctx.font = '16px monospace'
  ctx.fillText('S', x - 5, y + 5)
}
```

## Party Position Indicator

### Party Rendering

**Position Marker**:
```typescript
function renderParty(
  ctx: CanvasRenderingContext2D,
  party: Party,
  tileSize: number
): void {
  const x = party.position.x * tileSize + tileSize / 2
  const y = party.position.y * tileSize + tileSize / 2

  // Draw circle for party position
  ctx.fillStyle = '#FF0000'  // Red
  ctx.beginPath()
  ctx.arc(x, y, 8, 0, Math.PI * 2)
  ctx.fill()

  // Draw facing indicator (triangle)
  renderFacingArrow(ctx, x, y, party.facing)
}
```

**Facing Arrow**:
```typescript
function renderFacingArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facing: Direction
): void {
  ctx.fillStyle = '#FF0000'
  ctx.beginPath()

  switch (facing) {
    case 'north':
      ctx.moveTo(x, y - 12)
      ctx.lineTo(x - 6, y - 4)
      ctx.lineTo(x + 6, y - 4)
      break
    case 'east':
      ctx.moveTo(x + 12, y)
      ctx.lineTo(x + 4, y - 6)
      ctx.lineTo(x + 4, y + 6)
      break
    case 'south':
      ctx.moveTo(x, y + 12)
      ctx.lineTo(x - 6, y + 4)
      ctx.lineTo(x + 6, y + 4)
      break
    case 'west':
      ctx.moveTo(x - 12, y)
      ctx.lineTo(x - 4, y - 6)
      ctx.lineTo(x - 4, y + 6)
      break
  }

  ctx.closePath()
  ctx.fill()
}
```

## DUMAPIC Spell Integration

### Coordinate Display

**DUMAPIC Effect**:
- Shows current coordinates in UI
- Highlights current tile on automap
- Reveals party position even if automap hidden

**Display Format**:
```
X: 12, Y: 8, Level: 3, Facing: North
```

**Map Highlight**:
```typescript
function highlightCurrentPosition(
  ctx: CanvasRenderingContext2D,
  position: Position,
  tileSize: number
): void {
  const x = position.x * tileSize
  const y = position.y * tileSize

  // Draw pulsating border
  ctx.strokeStyle = '#00FF00'
  ctx.lineWidth = 3
  ctx.strokeRect(x, y, tileSize, tileSize)
}
```

## Map Zoom and Pan

### Zoom Levels

**Zoom Options**:
- 0.5× - Full level overview (small tiles)
- 1.0× - Normal (30px tiles)
- 2.0× - Zoomed in (60px tiles)

**Zoom Implementation**:
```typescript
function applyZoom(
  ctx: CanvasRenderingContext2D,
  zoom: number,
  centerX: number,
  centerY: number
): void {
  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.scale(zoom, zoom)
  ctx.translate(-centerX, -centerY)

  // Render map here

  ctx.restore()
}
```

### Auto-Centering

**Center on Party**:
```typescript
function getCenterOffset(
  party: Party,
  canvasWidth: number,
  canvasHeight: number,
  tileSize: number
): {offsetX: number, offsetY: number} {
  const partyScreenX = party.position.x * tileSize
  const partyScreenY = party.position.y * tileSize

  return {
    offsetX: canvasWidth / 2 - partyScreenX,
    offsetY: canvasHeight / 2 - partyScreenY
  }
}
```

### Manual Panning

**Pan Controls**:
- Arrow keys: Pan map
- Mouse drag: Pan map
- Reset button: Re-center on party

## Map Legend

### Legend Display

**Legend Items**:
```
Legend:
  █ = Unexplored
  ┌─┐ = Walls
  ● = Party
  ↑/↓ = Stairs
  T = Teleporter
  S = Spinner
  D = Door (yellow = closed, green = open)
```

**Rendering Legend**:
```typescript
function renderLegend(ctx: CanvasRenderingContext2D): void {
  const legendX = 620
  const legendY = 20

  ctx.fillStyle = '#FFFFFF'
  ctx.font = '12px monospace'

  ctx.fillText('Legend:', legendX, legendY)
  ctx.fillText('█ Unexplored', legendX, legendY + 20)
  ctx.fillText('┌─┐ Walls', legendX, legendY + 40)
  ctx.fillText('● Party', legendX, legendY + 60)
  // ... etc
}
```

## Performance Optimization

### Dirty Region Tracking

**Optimization Strategy**:
- Only redraw changed tiles
- Track previous exploration state
- Skip rendering if no changes

**Dirty Check**:
```typescript
function needsRedraw(
  prevExploration: ExplorationState,
  currExploration: ExplorationState
): boolean {
  if (prevExploration.partyPosition !== currExploration.partyPosition) {
    return true
  }

  if (prevExploration.exploredTiles.size !== currExploration.exploredTiles.size) {
    return true
  }

  return false
}
```

### Offscreen Canvas

**Pre-Rendering**:
```typescript
// Render static map to offscreen canvas
const offscreenCanvas = document.createElement('canvas')
const offscreenCtx = offscreenCanvas.getContext('2d')!

// Render walls, doors, stairs to offscreen
renderStaticMap(offscreenCtx, explorationState)

// Composite to main canvas
mainCtx.drawImage(offscreenCanvas, 0, 0)

// Render dynamic elements (party position)
renderParty(mainCtx, party)
```

## Related Documentation

**Services**:
- [AutomapService](../services/AutomapService.md) - Map rendering
- [MapService](../services/MapService.md) - Exploration tracking
- [VisibilityService](../services/VisibilityService.md) - Tile visibility

**Commands**:
- [ToggleAutomapCommand](../commands/ToggleAutomapCommand.md) - Show/hide map
- [CastDUMAPICCommand](../commands/CastDUMAPICCommand.md) - Show coordinates

**Game Design**:
- [Dungeon Navigation](../game-design/06-dungeon.md) - Using automap
- [Spells](../game-design/04-spells.md) - DUMAPIC spell

**Research**:
- [Spell Reference](../research/spell-reference.md) - DUMAPIC details

**Diagrams**:
- [Architecture Layers](../diagrams/architecture-layers.md) - UI layer

**Implementation Notes**:
- Blueprint style maintains original aesthetic
- Canvas 2D sufficient (no WebGL needed)
- Persistent exploration enhances gameplay
- Auto-centering improves usability
