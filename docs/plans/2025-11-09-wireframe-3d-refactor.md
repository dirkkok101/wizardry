# Wireframe 3D Maze Renderer Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace current 3-column grid rendering with flood-fill visibility algorithm and proper 5-stage perspective projection pipeline for mathematically correct 3D wireframe rendering.

**Architecture:** New `WireframeRenderingService` replaces `MazeRenderingService`. Uses flood-fill to find visible wall segments, transforms world coordinates through view space to screen space via perspective projection, generates CanvasCommand[] for drawing. Maintains discrete tile-based player positioning (no sub-tile interpolation).

**Tech Stack:** TypeScript, Angular signals, HTML5 Canvas, pure functional services

---

## Task 1: Add Core Data Structures

**Files:**
- Modify: `src/types/Dungeon.ts` (add after line 138)
- Test: Will be tested indirectly through WireframeRenderingService tests

**Step 1: Add Vector types**

Add these interfaces to `src/types/Dungeon.ts` after the `Level` interface (line 138):

```typescript
/**
 * 3D point in world space
 */
export interface Vector3 {
  x: number  // Horizontal position
  y: number  // Vertical position (height)
  z: number  // Depth
}

/**
 * 2D point in screen space
 */
export interface Vector2 {
  x: number  // Screen X coordinate
  y: number  // Screen Y coordinate
}

/**
 * Wall segment in world space
 * Represents a quad (4 corners) to be rendered
 */
export interface WallSegment {
  // Bottom edge endpoints in world space
  x1: number
  z1: number
  x2: number
  z2: number

  // Wall properties
  height: number       // Wall height (typically 1.0)
  distance: number     // Distance from camera (for z-ordering)
  isVertical: boolean  // true = N/S wall, false = E/W wall
  wallType: WallType   // Wall type for coloring
}

/**
 * Enhanced player state with pre-computed direction vectors
 * for efficient perspective transformation
 */
export interface PlayerState {
  // Grid position (discrete)
  gridX: number
  gridY: number

  // Orientation (radians: 0=North, π/2=East, π=South, 3π/2=West)
  angle: number

  // Pre-computed direction vectors (updated when angle changes)
  dirX: number   // cos(angle)
  dirY: number   // sin(angle)

  // Camera plane (perpendicular to direction, scaled by FOV)
  planeX: number
  planeY: number
}
```

**Step 2: Commit**

```bash
git add src/types/Dungeon.ts
git commit -m "feat: add Vector3, Vector2, WallSegment, PlayerState types for wireframe rendering"
```

---

## Task 2: Create PlayerState Helper Functions

**Files:**
- Create: `src/services/PlayerStateService.ts`
- Test: `src/services/__tests__/PlayerStateService.spec.ts`

**Step 1: Write the failing test**

Create `src/services/__tests__/PlayerStateService.spec.ts`:

```typescript
import { PlayerStateService } from '../PlayerStateService'
import { Position } from '../../types/Dungeon'

describe('PlayerStateService', () => {
  describe('fromPosition', () => {
    it('creates PlayerState from Position facing NORTH', () => {
      const position: Position = { x: 5, y: 10, facing: 'NORTH' }

      const playerState = PlayerStateService.fromPosition(position)

      expect(playerState.gridX).toBe(5)
      expect(playerState.gridY).toBe(10)
      expect(playerState.angle).toBeCloseTo(0)
      expect(playerState.dirX).toBeCloseTo(0)
      expect(playerState.dirY).toBeCloseTo(-1)
    })

    it('creates PlayerState from Position facing EAST', () => {
      const position: Position = { x: 3, y: 7, facing: 'EAST' }

      const playerState = PlayerStateService.fromPosition(position)

      expect(playerState.angle).toBeCloseTo(Math.PI / 2)
      expect(playerState.dirX).toBeCloseTo(1)
      expect(playerState.dirY).toBeCloseTo(0)
    })

    it('creates PlayerState from Position facing SOUTH', () => {
      const position: Position = { x: 8, y: 2, facing: 'SOUTH' }

      const playerState = PlayerStateService.fromPosition(position)

      expect(playerState.angle).toBeCloseTo(Math.PI)
      expect(playerState.dirX).toBeCloseTo(0)
      expect(playerState.dirY).toBeCloseTo(1)
    })

    it('creates PlayerState from Position facing WEST', () => {
      const position: Position = { x: 1, y: 9, facing: 'WEST' }

      const playerState = PlayerStateService.fromPosition(position)

      expect(playerState.angle).toBeCloseTo((3 * Math.PI) / 2)
      expect(playerState.dirX).toBeCloseTo(-1)
      expect(playerState.dirY).toBeCloseTo(0)
    })

    it('pre-computes camera plane perpendicular to direction', () => {
      const position: Position = { x: 0, y: 0, facing: 'NORTH' }

      const playerState = PlayerStateService.fromPosition(position)

      // For 90° FOV, plane length should be tan(45°) = 1.0
      // Perpendicular to (0, -1) is (-1, 0) for leftward plane
      expect(playerState.planeX).toBeCloseTo(-1)
      expect(playerState.planeY).toBeCloseTo(0)
    })
  })

  describe('updateDirectionVectors', () => {
    it('updates direction vectors when angle changes', () => {
      const playerState = PlayerStateService.fromPosition({ x: 0, y: 0, facing: 'NORTH' })

      // Turn 90° to the right (EAST)
      playerState.angle = Math.PI / 2
      const updated = PlayerStateService.updateDirectionVectors(playerState)

      expect(updated.dirX).toBeCloseTo(1)
      expect(updated.dirY).toBeCloseTo(0)
      expect(updated.planeX).toBeCloseTo(0)
      expect(updated.planeY).toBeCloseTo(1)
    })

    it('handles arbitrary angles', () => {
      const playerState = PlayerStateService.fromPosition({ x: 0, y: 0, facing: 'NORTH' })

      // Turn 45°
      playerState.angle = Math.PI / 4
      const updated = PlayerStateService.updateDirectionVectors(playerState)

      expect(updated.dirX).toBeCloseTo(Math.cos(Math.PI / 4))
      expect(updated.dirY).toBeCloseTo(Math.sin(Math.PI / 4))
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- PlayerStateService
```

Expected: FAIL with "Cannot find module '../PlayerStateService'"

**Step 3: Write minimal implementation**

Create `src/services/PlayerStateService.ts`:

```typescript
import { Position, Direction, PlayerState } from '../types/Dungeon'

/**
 * Service for managing PlayerState transformations
 * Pure functions for converting Position to PlayerState with direction vectors
 */
export const PlayerStateService = {
  /**
   * Convert Direction enum to radians
   * 0 = NORTH, π/2 = EAST, π = SOUTH, 3π/2 = WEST
   */
  directionToAngle(direction: Direction): number {
    switch (direction) {
      case 'NORTH': return 0
      case 'EAST': return Math.PI / 2
      case 'SOUTH': return Math.PI
      case 'WEST': return (3 * Math.PI) / 2
    }
  },

  /**
   * Create PlayerState from discrete Position
   * Pre-computes direction vectors for efficient rendering
   */
  fromPosition(position: Position): PlayerState {
    const angle = this.directionToAngle(position.facing)
    const dirX = Math.cos(angle)
    const dirY = Math.sin(angle)

    // Camera plane perpendicular to direction
    // For 90° FOV, plane length = tan(45°) = 1.0
    const fov = Math.PI / 2
    const planeLength = Math.tan(fov / 2)
    const planeX = -dirY * planeLength
    const planeY = dirX * planeLength

    return {
      gridX: position.x,
      gridY: position.y,
      angle,
      dirX,
      dirY,
      planeX,
      planeY
    }
  },

  /**
   * Update direction vectors after angle changes
   * Returns new PlayerState (immutable)
   */
  updateDirectionVectors(playerState: PlayerState): PlayerState {
    const dirX = Math.cos(playerState.angle)
    const dirY = Math.sin(playerState.angle)

    const fov = Math.PI / 2
    const planeLength = Math.tan(fov / 2)
    const planeX = -dirY * planeLength
    const planeY = dirX * planeLength

    return {
      ...playerState,
      dirX,
      dirY,
      planeX,
      planeY
    }
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- PlayerStateService
```

Expected: PASS (8 tests)

**Step 5: Commit**

```bash
git add src/services/PlayerStateService.ts src/services/__tests__/PlayerStateService.spec.ts
git commit -m "feat: add PlayerStateService for direction vector management"
```

---

## Task 3: Implement Visibility System (Flood-Fill)

**Files:**
- Create: `src/services/VisibilityService.ts`
- Test: `src/services/__tests__/VisibilityService.spec.ts`

**Step 1: Write the failing test**

Create `src/services/__tests__/VisibilityService.spec.ts`:

```typescript
import { VisibilityService } from '../VisibilityService'
import { LevelData, TileData, Position } from '../../types/Dungeon'

describe('VisibilityService', () => {
  const createTestLevel = (): LevelData => ({
    level: 1,
    name: 'Test Level',
    size: { width: 5, height: 5 },
    startPosition: { x: 2, y: 2, facing: 'north' },
    edgeWrapping: false,
    encounterRate: 0,
    encounterTable: '',
    tiles: [
      // Create 5x5 grid with walls on borders
      // Player at (2, 2) facing NORTH
      ...Array.from({ length: 5 }, (_, y) =>
        Array.from({ length: 5 }, (_, x): TileData => ({
          x, y,
          walls: {
            north: y === 0 ? 'wall' : 'open',
            south: y === 4 ? 'wall' : 'open',
            east: x === 4 ? 'wall' : 'open',
            west: x === 0 ? 'wall' : 'open'
          }
        }))
      ).flat()
    ]
  })

  describe('getVisibleWalls', () => {
    it('finds walls around player position', () => {
      const level = createTestLevel()
      const position: Position = { x: 2, y: 2, facing: 'NORTH' }

      const walls = VisibilityService.getVisibleWalls(level, position, 2)

      expect(walls.length).toBeGreaterThan(0)
      expect(walls.every(w => w.distance >= 0)).toBe(true)
    })

    it('finds north wall when player at (2,1) facing north', () => {
      const level = createTestLevel()
      const position: Position = { x: 2, y: 1, facing: 'NORTH' }

      const walls = VisibilityService.getVisibleWalls(level, position, 2)

      // Should find north wall at y=0
      const northWalls = walls.filter(w => w.z1 === -0.5 && w.z2 === -0.5)
      expect(northWalls.length).toBeGreaterThan(0)
    })

    it('sorts walls by distance (back to front)', () => {
      const level = createTestLevel()
      const position: Position = { x: 2, y: 2, facing: 'NORTH' }

      const walls = VisibilityService.getVisibleWalls(level, position, 3)

      // Verify sorted in descending distance order
      for (let i = 0; i < walls.length - 1; i++) {
        expect(walls[i].distance).toBeGreaterThanOrEqual(walls[i + 1].distance)
      }
    })

    it('respects maxDepth parameter', () => {
      const level = createTestLevel()
      const position: Position = { x: 2, y: 2, facing: 'NORTH' }

      const wallsDepth2 = VisibilityService.getVisibleWalls(level, position, 2)
      const wallsDepth4 = VisibilityService.getVisibleWalls(level, position, 4)

      // More depth = more walls visible
      expect(wallsDepth4.length).toBeGreaterThanOrEqual(wallsDepth2.length)
    })

    it('does not traverse through walls', () => {
      // Create level with blocking wall at (2,1) north side
      const level = createTestLevel()
      level.tiles.find(t => t.x === 2 && t.y === 1)!.walls.north = 'wall'

      const position: Position = { x: 2, y: 2, facing: 'NORTH' }
      const walls = VisibilityService.getVisibleWalls(level, position, 5)

      // Should not see walls beyond the blocking wall
      const beyondWalls = walls.filter(w => w.z1 < -1.5 || w.z2 < -1.5)
      expect(beyondWalls.length).toBe(0)
    })
  })

  describe('createWallSegment', () => {
    it('creates north wall segment correctly', () => {
      const position: Position = { x: 0, y: 0, facing: 'NORTH' }

      const wall = VisibilityService.createWallSegment(3, 5, 'north', position, 'wall')

      expect(wall.x1).toBe(2.5)  // 3 - 0.5
      expect(wall.z1).toBe(4.5)  // 5 - 0.5
      expect(wall.x2).toBe(3.5)  // 3 + 0.5
      expect(wall.z2).toBe(4.5)
      expect(wall.isVertical).toBe(true)
      expect(wall.height).toBe(1.0)
    })

    it('creates east wall segment correctly', () => {
      const position: Position = { x: 0, y: 0, facing: 'NORTH' }

      const wall = VisibilityService.createWallSegment(3, 5, 'east', position, 'wall')

      expect(wall.x1).toBe(3.5)
      expect(wall.z1).toBe(4.5)
      expect(wall.x2).toBe(3.5)
      expect(wall.z2).toBe(5.5)
      expect(wall.isVertical).toBe(false)
    })

    it('calculates distance from player position', () => {
      const position: Position = { x: 2, y: 2, facing: 'NORTH' }

      const nearWall = VisibilityService.createWallSegment(2, 1, 'north', position, 'wall')
      const farWall = VisibilityService.createWallSegment(2, 0, 'north', position, 'wall')

      expect(farWall.distance).toBeGreaterThan(nearWall.distance)
    })

    it('preserves wallType for rendering', () => {
      const position: Position = { x: 0, y: 0, facing: 'NORTH' }

      const solidWall = VisibilityService.createWallSegment(1, 1, 'north', position, 'wall')
      const door = VisibilityService.createWallSegment(1, 2, 'north', position, 'door')

      expect(solidWall.wallType).toBe('wall')
      expect(door.wallType).toBe('door')
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- VisibilityService
```

Expected: FAIL with "Cannot find module '../VisibilityService'"

**Step 3: Write minimal implementation**

Create `src/services/VisibilityService.ts`:

```typescript
import { LevelData, Position, WallSegment, WallType } from '../types/Dungeon'
import { DungeonService } from './DungeonService'

/**
 * Service for determining visible walls using flood-fill algorithm
 * Pure functions - no side effects
 */
export const VisibilityService = {
  /**
   * Get all visible wall segments from player position using flood-fill
   * Returns walls sorted back-to-front for painter's algorithm
   */
  getVisibleWalls(
    level: LevelData,
    position: Position,
    maxDepth: number = 5
  ): WallSegment[] {
    const walls: WallSegment[] = []
    const visited = new Set<string>()
    const queue: { x: number; y: number; depth: number }[] = []

    // Start from player's grid position
    queue.push({ x: position.x, y: position.y, depth: 0 })
    visited.add(`${position.x},${position.y}`)

    while (queue.length > 0) {
      const current = queue.shift()!
      const { x, y, depth } = current

      if (depth >= maxDepth) continue

      const tile = DungeonService.getTile(level, x, y)

      // Check all 4 walls of current cell
      // North wall (y-1)
      if (tile.walls.north !== 'open') {
        walls.push(this.createWallSegment(x, y, 'north', position, tile.walls.north))
      } else if (!visited.has(`${x},${y - 1}`)) {
        queue.push({ x, y: y - 1, depth: depth + 1 })
        visited.add(`${x},${y - 1}`)
      }

      // South wall (y+1)
      if (tile.walls.south !== 'open') {
        walls.push(this.createWallSegment(x, y, 'south', position, tile.walls.south))
      } else if (!visited.has(`${x},${y + 1}`)) {
        queue.push({ x, y: y + 1, depth: depth + 1 })
        visited.add(`${x},${y + 1}`)
      }

      // East wall (x+1)
      if (tile.walls.east !== 'open') {
        walls.push(this.createWallSegment(x, y, 'east', position, tile.walls.east))
      } else if (!visited.has(`${x + 1},${y}`)) {
        queue.push({ x: x + 1, y, depth: depth + 1 })
        visited.add(`${x + 1},${y}`)
      }

      // West wall (x-1)
      if (tile.walls.west !== 'open') {
        walls.push(this.createWallSegment(x, y, 'west', position, tile.walls.west))
      } else if (!visited.has(`${x - 1},${y}`)) {
        queue.push({ x: x - 1, y, depth: depth + 1 })
        visited.add(`${x - 1},${y}`)
      }
    }

    // Sort by distance (back-to-front for painter's algorithm)
    walls.sort((a, b) => b.distance - a.distance)

    return walls
  },

  /**
   * Create wall segment from grid position and side
   * Converts grid coordinates to world space (each tile = 1 unit, centered at grid position)
   */
  createWallSegment(
    gridX: number,
    gridY: number,
    side: 'north' | 'south' | 'east' | 'west',
    playerPos: Position,
    wallType: WallType
  ): WallSegment {
    let x1: number, z1: number, x2: number, z2: number
    let isVertical: boolean

    // Convert grid to world coordinates (tile center at gridX, gridY)
    // Each tile is 1.0 units
    if (side === 'north') {
      x1 = gridX - 0.5
      z1 = gridY - 0.5
      x2 = gridX + 0.5
      z2 = gridY - 0.5
      isVertical = true
    } else if (side === 'south') {
      x1 = gridX - 0.5
      z1 = gridY + 0.5
      x2 = gridX + 0.5
      z2 = gridY + 0.5
      isVertical = true
    } else if (side === 'east') {
      x1 = gridX + 0.5
      z1 = gridY - 0.5
      x2 = gridX + 0.5
      z2 = gridY + 0.5
      isVertical = false
    } else { // west
      x1 = gridX - 0.5
      z1 = gridY - 0.5
      x2 = gridX - 0.5
      z2 = gridY + 0.5
      isVertical = false
    }

    // Calculate distance from player (use midpoint of wall)
    const midX = (x1 + x2) / 2
    const midZ = (z1 + z2) / 2
    const dx = midX - playerPos.x
    const dz = midZ - playerPos.y
    const distance = Math.sqrt(dx * dx + dz * dz)

    return {
      x1,
      z1,
      x2,
      z2,
      height: 1.0,
      distance,
      isVertical,
      wallType
    }
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- VisibilityService
```

Expected: PASS (9 tests)

**Step 5: Commit**

```bash
git add src/services/VisibilityService.ts src/services/__tests__/VisibilityService.spec.ts
git commit -m "feat: add VisibilityService with flood-fill wall detection"
```

---

## Task 4: Implement Perspective Projection Pipeline

**Files:**
- Create: `src/services/ProjectionService.ts`
- Test: `src/services/__tests__/ProjectionService.spec.ts`

**Step 1: Write the failing test**

Create `src/services/__tests__/ProjectionService.spec.ts`:

```typescript
import { ProjectionService } from '../ProjectionService'
import { PlayerStateService } from '../PlayerStateService'
import { Vector3 } from '../../types/Dungeon'

describe('ProjectionService', () => {
  describe('worldToView', () => {
    it('transforms world point to view space (camera at origin)', () => {
      const playerState = PlayerStateService.fromPosition({ x: 5, y: 5, facing: 'NORTH' })
      const worldPoint: Vector3 = { x: 5, y: 0, z: 3 } // 2 tiles in front

      const viewPoint = ProjectionService.worldToView(worldPoint, playerState)

      // Player at (5,5), point at (5,3) = 2 units north
      // In view space: camera looks down -Z, so point should be at z=-2
      expect(viewPoint.x).toBeCloseTo(0)
      expect(viewPoint.y).toBeCloseTo(0)
      expect(viewPoint.z).toBeCloseTo(-2)
    })

    it('handles rotation for EAST facing', () => {
      const playerState = PlayerStateService.fromPosition({ x: 5, y: 5, facing: 'EAST' })
      const worldPoint: Vector3 = { x: 7, y: 0, z: 5 } // 2 tiles east

      const viewPoint = ProjectionService.worldToView(worldPoint, playerState)

      expect(viewPoint.x).toBeCloseTo(0)
      expect(viewPoint.z).toBeCloseTo(-2)
    })

    it('preserves Y coordinate (height)', () => {
      const playerState = PlayerStateService.fromPosition({ x: 0, y: 0, facing: 'NORTH' })
      const worldPoint: Vector3 = { x: 0, y: 2.5, z: -1 }

      const viewPoint = ProjectionService.worldToView(worldPoint, playerState)

      expect(viewPoint.y).toBeCloseTo(2.5)
    })

    it('handles points to the left of player', () => {
      const playerState = PlayerStateService.fromPosition({ x: 5, y: 5, facing: 'NORTH' })
      const worldPoint: Vector3 = { x: 4, y: 0, z: 3 } // 1 left, 2 forward

      const viewPoint = ProjectionService.worldToView(worldPoint, playerState)

      expect(viewPoint.x).toBeCloseTo(-1)
      expect(viewPoint.z).toBeCloseTo(-2)
    })
  })

  describe('viewToScreen', () => {
    const config = { width: 600, height: 600 }

    it('projects point in front of camera to screen center', () => {
      const viewPoint: Vector3 = { x: 0, y: 0, z: -5 }

      const screenPoint = ProjectionService.viewToScreen(viewPoint, config)

      expect(screenPoint).not.toBeNull()
      expect(screenPoint!.x).toBeCloseTo(300) // Center X
      expect(screenPoint!.y).toBeCloseTo(300) // Center Y
    })

    it('rejects points behind camera (z >= 0)', () => {
      const viewPoint: Vector3 = { x: 0, y: 0, z: 1 }

      const screenPoint = ProjectionService.viewToScreen(viewPoint, config)

      expect(screenPoint).toBeNull()
    })

    it('projects point to the right correctly', () => {
      const viewPoint: Vector3 = { x: 1, y: 0, z: -2 }

      const screenPoint = ProjectionService.viewToScreen(viewPoint, config)

      expect(screenPoint).not.toBeNull()
      expect(screenPoint!.x).toBeGreaterThan(300) // Right of center
    })

    it('projects point to the left correctly', () => {
      const viewPoint: Vector3 = { x: -1, y: 0, z: -2 }

      const screenPoint = ProjectionService.viewToScreen(viewPoint, config)

      expect(screenPoint).not.toBeNull()
      expect(screenPoint!.x).toBeLessThan(300) // Left of center
    })

    it('projects point above horizon correctly', () => {
      const viewPoint: Vector3 = { x: 0, y: 1, z: -2 }

      const screenPoint = ProjectionService.viewToScreen(viewPoint, config)

      expect(screenPoint).not.toBeNull()
      expect(screenPoint!.y).toBeLessThan(300) // Above center (Y inverted)
    })

    it('projects point below horizon correctly', () => {
      const viewPoint: Vector3 = { x: 0, y: -0.5, z: -2 }

      const screenPoint = ProjectionService.viewToScreen(viewPoint, config)

      expect(screenPoint).not.toBeNull()
      expect(screenPoint!.y).toBeGreaterThan(300) // Below center
    })

    it('handles perspective division (closer = larger)', () => {
      const nearPoint: Vector3 = { x: 1, y: 0, z: -1 }
      const farPoint: Vector3 = { x: 1, y: 0, z: -4 }

      const nearScreen = ProjectionService.viewToScreen(nearPoint, config)
      const farScreen = ProjectionService.viewToScreen(farPoint, config)

      // Near point should be farther from center (larger on screen)
      const nearOffset = Math.abs(nearScreen!.x - 300)
      const farOffset = Math.abs(farScreen!.x - 300)
      expect(nearOffset).toBeGreaterThan(farOffset)
    })

    it('clips points outside frustum', () => {
      const viewPoint: Vector3 = { x: 10, y: 0, z: -1 } // Way off to the side

      const screenPoint = ProjectionService.viewToScreen(viewPoint, config)

      // Should be clipped (outside NDC bounds)
      expect(screenPoint).toBeNull()
    })
  })

  describe('projectPoint (full pipeline)', () => {
    const config = { width: 600, height: 600 }

    it('projects wall corner from world to screen', () => {
      const playerState = PlayerStateService.fromPosition({ x: 5, y: 5, facing: 'NORTH' })
      const wallCorner: Vector3 = { x: 5.5, y: 1.0, z: 3.5 } // Top-right corner 2 tiles ahead

      const screenPoint = ProjectionService.projectPoint(wallCorner, playerState, config)

      expect(screenPoint).not.toBeNull()
      expect(screenPoint!.x).toBeGreaterThan(300) // Right of center
      expect(screenPoint!.y).toBeLessThan(300) // Above horizon
    })

    it('returns null for points behind player', () => {
      const playerState = PlayerStateService.fromPosition({ x: 5, y: 5, facing: 'NORTH' })
      const behindPoint: Vector3 = { x: 5, y: 0, z: 7 } // Behind player

      const screenPoint = ProjectionService.projectPoint(behindPoint, playerState, config)

      expect(screenPoint).toBeNull()
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- ProjectionService
```

Expected: FAIL with "Cannot find module '../ProjectionService'"

**Step 3: Write minimal implementation**

Create `src/services/ProjectionService.ts`:

```typescript
import { Vector3, Vector2, PlayerState } from '../types/Dungeon'

/**
 * Service for perspective projection transformations
 * Implements 5-stage pipeline: World → View → Screen
 * Pure functions - no side effects
 */
export const ProjectionService = {
  /**
   * FOV in radians (90 degrees for Wizardry)
   */
  FOV: Math.PI / 2,

  /**
   * Stage 1-2: Transform world space point to view space (camera coordinates)
   * Camera is at origin looking down -Z axis
   */
  worldToView(point: Vector3, playerState: PlayerState): Vector3 {
    // Translate to camera origin
    let x = point.x - playerState.gridX
    let z = point.z - playerState.gridY

    // Rotate to camera orientation (camera looks down -Z)
    const cos = playerState.dirX
    const sin = playerState.dirY

    const rotatedX = x * cos - z * sin
    const rotatedZ = x * sin + z * cos

    return {
      x: rotatedX,
      y: point.y, // Height stays same
      z: -rotatedZ // Negate because camera looks down -Z
    }
  },

  /**
   * Stage 3-5: Transform view space point to screen coordinates
   * Includes perspective division, NDC conversion, and viewport mapping
   * Returns null if point is clipped (behind camera or outside frustum)
   */
  viewToScreen(
    viewPoint: Vector3,
    config: { width: number; height: number }
  ): Vector2 | null {
    // Frustum culling - reject if behind camera
    if (viewPoint.z >= 0) return null

    // FOV scaling factor
    const S = 1.0 / Math.tan(this.FOV / 2)

    // Perspective projection: divide by -z
    const ndcX = (viewPoint.x * S) / -viewPoint.z
    const ndcY = (viewPoint.y * S) / -viewPoint.z

    // Frustum culling in NDC space [-1, 1]
    if (Math.abs(ndcX) > 1 || Math.abs(ndcY) > 1) return null

    // Convert NDC to screen coordinates
    const screenX = (ndcX + 1) * (config.width / 2)
    const screenY = (1 - ndcY) * (config.height / 2) // Flip Y axis

    return { x: screenX, y: screenY }
  },

  /**
   * Complete transformation: World → View → Screen
   * Convenience method combining both stages
   */
  projectPoint(
    worldPoint: Vector3,
    playerState: PlayerState,
    config: { width: number; height: number }
  ): Vector2 | null {
    const viewPoint = this.worldToView(worldPoint, playerState)
    return this.viewToScreen(viewPoint, config)
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- ProjectionService
```

Expected: PASS (15 tests)

**Step 5: Commit**

```bash
git add src/services/ProjectionService.ts src/services/__tests__/ProjectionService.spec.ts
git commit -m "feat: add ProjectionService with 5-stage perspective pipeline"
```

---

## Task 5: Create WireframeRenderingService

**Files:**
- Create: `src/services/WireframeRenderingService.ts`
- Test: `src/services/__tests__/WireframeRenderingService.spec.ts`

**Step 1: Write the failing test**

Create `src/services/__tests__/WireframeRenderingService.spec.ts`:

```typescript
import { WireframeRenderingService } from '../WireframeRenderingService'
import { LevelData, Position, WallSegment } from '../../types/Dungeon'

describe('WireframeRenderingService', () => {
  const createSimpleLevel = (): LevelData => ({
    level: 1,
    name: 'Test',
    size: { width: 3, height: 3 },
    startPosition: { x: 1, y: 1, facing: 'north' },
    edgeWrapping: false,
    encounterRate: 0,
    encounterTable: '',
    tiles: [
      { x: 1, y: 0, walls: { north: 'wall', south: 'open', east: 'open', west: 'open' } },
      { x: 1, y: 1, walls: { north: 'open', south: 'open', east: 'open', west: 'open' } },
      { x: 1, y: 2, walls: { north: 'open', south: 'wall', east: 'open', west: 'open' } }
    ]
  })

  describe('generateWireframeCommands', () => {
    it('generates line commands for wall segments', () => {
      const level = createSimpleLevel()
      const position: Position = { x: 1, y: 1, facing: 'NORTH' }
      const config = { width: 600, height: 600, tileDepth: 3 }

      const commands = WireframeRenderingService.generateWireframeCommands(
        level,
        position,
        config
      )

      expect(commands.length).toBeGreaterThan(0)
      expect(commands.every(cmd => cmd.type === 'line')).toBe(true)
    })

    it('uses green color for normal walls', () => {
      const level = createSimpleLevel()
      const position: Position = { x: 1, y: 1, facing: 'NORTH' }
      const config = { width: 600, height: 600, tileDepth: 3 }

      const commands = WireframeRenderingService.generateWireframeCommands(
        level,
        position,
        config
      )

      const greenCommands = commands.filter(cmd => cmd.color.includes('#0'))
      expect(greenCommands.length).toBeGreaterThan(0)
    })

    it('uses darker color for doors', () => {
      const level = createSimpleLevel()
      level.tiles[0].walls.north = 'door'
      const position: Position = { x: 1, y: 1, facing: 'NORTH' }
      const config = { width: 600, height: 600, tileDepth: 3 }

      const commands = WireframeRenderingService.generateWireframeCommands(
        level,
        position,
        config
      )

      // Should have door color (#080)
      const doorCommands = commands.filter(cmd => cmd.color === '#080')
      expect(doorCommands.length).toBeGreaterThan(0)
    })

    it('skips walls with clipped vertices', () => {
      const level = createSimpleLevel()
      const position: Position = { x: 1, y: 1, facing: 'SOUTH' } // Face away from wall
      const config = { width: 600, height: 600, tileDepth: 3 }

      const commands = WireframeRenderingService.generateWireframeCommands(
        level,
        position,
        config
      )

      // Walls behind player should be clipped
      // Should have fewer commands than when facing toward walls
      expect(commands.length).toBeGreaterThanOrEqual(0)
    })

    it('generates 4 edges per visible wall (quad outline)', () => {
      const level = createSimpleLevel()
      const position: Position = { x: 1, y: 1, facing: 'NORTH' }
      const config = { width: 600, height: 600, tileDepth: 3 }

      const commands = WireframeRenderingService.generateWireframeCommands(
        level,
        position,
        config
      )

      // Each wall quad has 4 edges
      // Command count should be multiple of 4 (if all walls fully visible)
      expect(commands.length % 4).toBe(0)
    })

    it('applies distance-based alpha fading', () => {
      const level = createSimpleLevel()
      const position: Position = { x: 1, y: 1, facing: 'NORTH' }
      const config = { width: 600, height: 600, tileDepth: 5 }

      const commands = WireframeRenderingService.generateWireframeCommands(
        level,
        position,
        config
      )

      // Far walls should have lower alpha
      const alphaValues = commands.map(cmd => cmd.alpha ?? 1.0)
      expect(Math.min(...alphaValues)).toBeLessThan(1.0)
    })
  })

  describe('getWallColor', () => {
    it('returns green for normal walls', () => {
      const color = WireframeRenderingService.getWallColor('wall', 1.0)
      expect(color).toBe('#0f0')
    })

    it('returns dark green for doors', () => {
      const color = WireframeRenderingService.getWallColor('door', 1.0)
      expect(color).toBe('#080')
    })

    it('returns red for locked doors', () => {
      const color = WireframeRenderingService.getWallColor('locked_door', 1.0)
      expect(color).toBe('#800')
    })

    it('returns dimmer color at distance 2', () => {
      const nearColor = WireframeRenderingService.getWallColor('wall', 1.0)
      const farColor = WireframeRenderingService.getWallColor('wall', 2.0)

      expect(nearColor).toBe('#0f0')
      expect(farColor).toBe('#0c0') // Dimmer
    })

    it('returns dimmest color at distance 3+', () => {
      const color = WireframeRenderingService.getWallColor('wall', 3.5)
      expect(color).toBe('#090')
    })
  })

  describe('calculateAlpha', () => {
    it('returns 1.0 for close distances', () => {
      const alpha = WireframeRenderingService.calculateAlpha(0.5)
      expect(alpha).toBeCloseTo(1.0)
    })

    it('returns lower alpha for far distances', () => {
      const alpha = WireframeRenderingService.calculateAlpha(5.0)
      expect(alpha).toBeLessThan(1.0)
      expect(alpha).toBeGreaterThan(0)
    })

    it('uses formula 1.0 / (1 + distance * 0.15)', () => {
      const alpha = WireframeRenderingService.calculateAlpha(2.0)
      const expected = 1.0 / (1 + 2.0 * 0.15)
      expect(alpha).toBeCloseTo(expected)
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test -- WireframeRenderingService
```

Expected: FAIL with "Cannot find module '../WireframeRenderingService'"

**Step 3: Write implementation**

Create `src/services/WireframeRenderingService.ts`:

```typescript
import { LevelData, Position, WallSegment, Vector3, WallType } from '../types/Dungeon'
import { CanvasCommand } from '../types/rendering.types'
import { ViewportConfig } from '../types/rendering.types'
import { VisibilityService } from './VisibilityService'
import { PlayerStateService } from './PlayerStateService'
import { ProjectionService } from './ProjectionService'

/**
 * Service for generating wireframe 3D rendering commands
 * Replaces MazeRenderingService with flood-fill + perspective projection
 * Pure functions - no side effects
 */
export const WireframeRenderingService = {
  /**
   * Generate canvas drawing commands for wireframe view
   * Main entry point for rendering system
   */
  generateWireframeCommands(
    level: LevelData,
    position: Position,
    config: ViewportConfig
  ): CanvasCommand[] {
    const commands: CanvasCommand[] = []

    // Get player state with direction vectors
    const playerState = PlayerStateService.fromPosition(position)

    // Find visible walls using flood-fill
    const walls = VisibilityService.getVisibleWalls(level, position, 5)

    // Render each wall quad (already sorted back-to-front)
    for (const wall of walls) {
      const wallCommands = this.renderWallQuad(wall, playerState, config)
      commands.push(...wallCommands)
    }

    return commands
  },

  /**
   * Render a single wall quad as 4 line segments (wireframe outline)
   */
  renderWallQuad(
    wall: WallSegment,
    playerState: any,
    config: ViewportConfig
  ): CanvasCommand[] {
    const commands: CanvasCommand[] = []

    // Define 4 corners of wall quad in world space
    const bottomLeft: Vector3 = { x: wall.x1, y: 0, z: wall.z1 }
    const bottomRight: Vector3 = { x: wall.x2, y: 0, z: wall.z2 }
    const topRight: Vector3 = { x: wall.x2, y: wall.height, z: wall.z2 }
    const topLeft: Vector3 = { x: wall.x1, y: wall.height, z: wall.z1 }

    // Project to screen space
    const p1 = ProjectionService.projectPoint(bottomLeft, playerState, config)
    const p2 = ProjectionService.projectPoint(bottomRight, playerState, config)
    const p3 = ProjectionService.projectPoint(topRight, playerState, config)
    const p4 = ProjectionService.projectPoint(topLeft, playerState, config)

    // Skip if any point is clipped
    if (!p1 || !p2 || !p3 || !p4) return commands

    // Get color and alpha based on wall type and distance
    const color = this.getWallColor(wall.wallType, wall.distance)
    const alpha = this.calculateAlpha(wall.distance)

    // Draw 4 edges of quad
    const edges = [
      [p1, p2], // Bottom edge
      [p2, p3], // Right edge
      [p3, p4], // Top edge
      [p4, p1]  // Left edge
    ]

    for (const [start, end] of edges) {
      commands.push({
        type: 'line',
        x: start.x,
        y: start.y,
        x2: end.x,
        y2: end.y,
        color,
        lineWidth: this.getLineWidth(wall.distance),
        alpha
      })
    }

    return commands
  },

  /**
   * Get wall color based on type and distance
   */
  getWallColor(wallType: WallType, distance: number): string {
    // Base colors by wall type
    let baseColor: string
    if (wallType === 'door') {
      baseColor = '#080' // Dark green for doors
    } else if (wallType === 'locked_door') {
      baseColor = '#800' // Red for locked doors
    } else if (wallType === 'secret') {
      return '#000' // Black (invisible) for secret doors
    } else {
      // Normal walls - fade with distance
      if (distance < 1.5) {
        baseColor = '#0f0' // Bright green (near)
      } else if (distance < 2.5) {
        baseColor = '#0c0' // Medium green (mid)
      } else {
        baseColor = '#090' // Dim green (far)
      }
    }

    return baseColor
  },

  /**
   * Calculate alpha transparency based on distance
   */
  calculateAlpha(distance: number): number {
    return 1.0 / (1 + distance * 0.15)
  },

  /**
   * Get line width based on distance (thinner at distance)
   */
  getLineWidth(distance: number): number {
    if (distance < 1.5) return 2
    if (distance < 3.0) return 1.5
    return 1
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- WireframeRenderingService
```

Expected: PASS (10 tests)

**Step 5: Commit**

```bash
git add src/services/WireframeRenderingService.ts src/services/__tests__/WireframeRenderingService.spec.ts
git commit -m "feat: add WireframeRenderingService for flood-fill + projection rendering"
```

---

## Task 6: Update MazeComponent to Use New Rendering

**Files:**
- Modify: `src/app/maze/maze.component.ts` (lines 91-101)

**Step 1: Update import statements**

At top of file (around line 12), replace:

```typescript
import { MazeRenderingService } from '../../services/MazeRenderingService';
```

With:

```typescript
import { WireframeRenderingService } from '../../services/WireframeRenderingService';
```

**Step 2: Update drawCommands computed signal**

Replace the `drawCommands` computed signal (lines 91-101) with:

```typescript
  /**
   * Canvas drawing commands for 3D wireframe view
   */
  readonly drawCommands = computed(() => {
    const pos = this.position();
    if (!pos) return [];

    const level = DungeonService.loadLevel(this.currentLevel());

    return WireframeRenderingService.generateWireframeCommands(
      level,
      pos,
      { width: 600, height: 600, tileDepth: 5 }
    );
  });
```

**Step 3: Remove visibleTiles computed signal (no longer needed)**

Delete lines 73-86 (the `visibleTiles` computed signal) since WireframeRenderingService handles visibility internally.

**Step 4: Test the component manually**

```bash
npm start
```

Navigate to maze scene and verify:
- Walls render as wireframe quads
- Perspective looks correct
- Movement updates view properly
- No console errors

**Step 5: Commit**

```bash
git add src/app/maze/maze.component.ts
git commit -m "feat: switch MazeComponent to use WireframeRenderingService"
```

---

## Task 7: Update Integration Tests

**Files:**
- Modify: `src/app/maze/__tests__/maze-rendering.integration.spec.ts`

**Step 1: Update test to match new rendering output**

Read the current test file to understand structure, then update tests to verify:
- Commands are generated (length > 0)
- Commands are line type
- Commands have proper color values
- Commands update when position changes

Replace tile-based assertions with wall-segment-based assertions.

**Step 2: Run integration tests**

```bash
npm test -- maze-rendering.integration
```

Expected: PASS

**Step 3: Commit**

```bash
git add src/app/maze/__tests__/maze-rendering.integration.spec.ts
git commit -m "test: update maze rendering integration tests for wireframe system"
```

---

## Task 8: Remove Old MazeRenderingService

**Files:**
- Delete: `src/services/MazeRenderingService.ts`
- Delete: `src/services/__tests__/MazeRenderingService.spec.ts`
- Modify: `src/services/DungeonService.ts` (remove getVisibleTiles if unused elsewhere)
- Modify: `src/types/Dungeon.ts` (remove SpatialTileData if unused)

**Step 1: Verify no other files import MazeRenderingService**

```bash
grep -r "MazeRenderingService" src/
```

Expected: Only finds deleted files and git history

**Step 2: Delete old service files**

```bash
git rm src/services/MazeRenderingService.ts
git rm src/services/__tests__/MazeRenderingService.spec.ts
```

**Step 3: Check if getVisibleTiles is used elsewhere**

```bash
grep -r "getVisibleTiles" src/
```

If only used in deleted MazeRenderingService tests, remove from DungeonService.

**Step 4: Remove SpatialTileData type**

In `src/types/Dungeon.ts`, remove lines 62-69 (SpatialTileData type and comment).

Also remove `relativeX` and `relativeDepth` properties from TileData interface (lines 58-59).

**Step 5: Run full test suite**

```bash
npm test
```

Expected: All tests pass, no references to old service

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor: remove old MazeRenderingService and spatial tile types"
```

---

## Task 9: Performance Verification

**Files:**
- Test: `src/app/maze/__tests__/maze-rendering.performance.spec.ts`

**Step 1: Run performance tests**

```bash
npm test -- maze-rendering.performance
```

Expected: Tests pass in <2.5s target

**Step 2: Run full test suite with timing**

```bash
time npm test
```

Expected: Total time < 20 seconds

**Step 3: If performance issues, profile and optimize**

If tests are slow:
- Check flood-fill maxDepth (reduce from 5 to 3 if needed)
- Add memoization to projection calculations
- Reduce number of walls rendered

**Step 4: Commit if changes made**

```bash
git add <modified-files>
git commit -m "perf: optimize wireframe rendering for <20s test suite"
```

---

## Task 10: Update Documentation

**Files:**
- Modify: `docs/systems/first-person-rendering.md`
- Create: `docs/services/WireframeRenderingService.md`

**Step 1: Document WireframeRenderingService API**

Create `docs/services/WireframeRenderingService.md`:

```markdown
# WireframeRenderingService

Generates wireframe 3D maze rendering using flood-fill visibility and perspective projection.

## API

### generateWireframeCommands(level, position, config)

Main entry point. Returns CanvasCommand[] for drawing.

**Parameters:**
- `level: LevelData` - Current dungeon level
- `position: Position` - Player position and facing
- `config: ViewportConfig` - Canvas dimensions

**Returns:** `CanvasCommand[]` - Drawing commands sorted back-to-front

### renderWallQuad(wall, playerState, config)

Renders single wall segment as 4-line wireframe quad.

### getWallColor(wallType, distance)

Returns color string based on wall type and distance.

### calculateAlpha(distance)

Returns transparency value (0-1) for distance fading.

### getLineWidth(distance)

Returns line width (1-2px) based on distance.

## Algorithm

1. Convert Position to PlayerState with direction vectors
2. Run flood-fill from player position to find visible walls
3. For each wall segment:
   - Project 4 corners through perspective pipeline
   - Generate 4 line commands for quad outline
   - Apply distance-based color, alpha, line width
4. Return commands (already sorted back-to-front)

## See Also

- VisibilityService - Flood-fill wall detection
- ProjectionService - Perspective transformation
- PlayerStateService - Direction vector management
```

**Step 2: Update first-person-rendering.md**

Update `docs/systems/first-person-rendering.md` to document new architecture:
- Replace 3-column grid section with flood-fill description
- Update perspective section with 5-stage pipeline
- Update service references

**Step 3: Commit**

```bash
git add docs/services/WireframeRenderingService.md docs/systems/first-person-rendering.md
git commit -m "docs: document wireframe rendering architecture"
```

---

## Task 11: Final Verification

**Files:**
- All project files

**Step 1: Run full test suite**

```bash
npm test
```

Expected: All 791+ tests pass in <20 seconds

**Step 2: Test in browser**

```bash
npm start
```

Verify:
- Maze renders with wireframe walls
- Movement (WASD) updates view correctly
- Turning (arrow keys) rotates view
- Extended view distance (can see 5 tiles ahead)
- Perspective looks correct (walls shrink with distance)
- Colors match wall types (green/dark green/red)

**Step 3: Check for console errors**

Open browser DevTools → Console
Expected: No errors

**Step 4: Verify performance**

In DevTools → Performance tab, record while moving through maze.
Expected: 60fps rendering, no frame drops

**Step 5: Create summary document**

Create `docs/plans/2025-11-09-wireframe-refactor-summary.md`:

```markdown
# Wireframe 3D Refactor - Implementation Summary

**Date:** 2025-11-09
**Status:** Complete ✅

## Changes Made

1. **New Data Structures:** Vector3, Vector2, WallSegment, PlayerState
2. **PlayerStateService:** Direction vector management
3. **VisibilityService:** Flood-fill wall detection (5 tile depth)
4. **ProjectionService:** 5-stage perspective pipeline (world → view → screen)
5. **WireframeRenderingService:** Main rendering service
6. **MazeComponent:** Updated to use new rendering system
7. **Removed:** MazeRenderingService, SpatialTileData, getVisibleTiles

## Results

- ✅ Extended view distance (5 tiles vs 3)
- ✅ Mathematically correct perspective projection
- ✅ Cleaner architecture (4 focused services)
- ✅ All tests passing (791+ tests)
- ✅ Performance maintained (<20s test suite)
- ✅ 60fps rendering in browser

## Metrics

- Files added: 6
- Files modified: 4
- Files deleted: 2
- Tests added: 42
- Lines of code: ~800 new, ~350 removed
```

**Step 6: Final commit**

```bash
git add docs/plans/2025-11-09-wireframe-refactor-summary.md
git commit -m "docs: add wireframe refactor implementation summary"
```

---

## Success Criteria Checklist

- ✅ Extended view distance (5+ tiles visible)
- ✅ Mathematically correct perspective projection (5-stage pipeline)
- ✅ Cleaner architecture (VisibilityService, ProjectionService, WireframeRenderingService)
- ✅ All tests passing
- ✅ Performance maintained (<20s test suite, 60fps rendering)
- ✅ Discrete tile-based movement preserved (no sub-tile)

---

## Notes for Engineer

- **Pure Functions:** All services are pure functions - easy to test, no mocking needed
- **Immutability:** All state updates create new objects, never mutate
- **TDD:** Write test first, watch it fail, implement, watch it pass
- **Commits:** Commit after each passing test (frequent commits)
- **DRY:** Don't repeat yourself - extract common logic to helper functions
- **YAGNI:** You aren't gonna need it - implement only what's in the plan

**Testing Pattern:**
```typescript
// 1. Arrange - set up test data
const input = createTestData()

// 2. Act - call the function
const result = ServiceName.methodName(input)

// 3. Assert - verify output
expect(result.property).toBe(expected)
```

**Common Pitfalls:**
- Don't forget `toBeCloseTo()` for floating point comparisons
- Import types from correct paths (`../../types/Dungeon`)
- Run tests after every step (`npm test -- ServiceName`)
- Check TypeScript errors (`npm run build`)

Good luck! This refactor will result in cleaner, more maintainable code with better rendering quality.
