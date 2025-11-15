# Implementation Guide: Building Your Dungeon Raycaster with Claude Code

This guide provides step-by-step instructions for implementing the raycasting dungeon renderer using the provided TypeScript code and algorithms.

---

## Overview

You have three core files:
1. **dungeon-renderer-implementation.ts** - Complete TypeScript raycaster
2. **raycasting-algorithms-pseudocode.md** - Detailed algorithms and math
3. **dungeon-raycaster-demo.html** - Working demo

---

## Quick Start: Demo First

**To see it working immediately:**

1. Open `dungeon-raycaster-demo.html` in a web browser
2. Use arrow keys or WASD to navigate
3. Press Q/E to strafe
4. Click buttons to toggle features

This demonstrates the core concepts working with your actual map data.

---

## Full Implementation with Claude Code

### Phase 1: Project Setup (Day 1)

**Tell Claude Code:**

```
Create a new TypeScript project for a dungeon raycaster game with the following structure:

src/
├── core/
│   ├── types.ts
│   ├── DungeonMap.ts
│   ├── Raycaster.ts
│   └── Player.ts
├── rendering/
│   └── Renderer.ts
├── game/
│   └── Game.ts
├── data/
│   └── level1.json
└── main.ts

Setup:
- Initialize with npm and TypeScript
- Configure tsconfig.json with strict mode
- Add a basic HTML file with canvas element
- Use Vite or webpack for bundling
```

### Phase 2: Core Types (Day 1)

**Tell Claude Code:**

```
Create src/core/types.ts with these TypeScript interfaces based on my map JSON structure:

- WallState type: 'open' | 'wall' | 'door'
- Direction type: 'north' | 'east' | 'south' | 'west'
- WallConfiguration interface with all four directions
- Position interface with x, y
- Vector2 interface with x, y
- Tile interface matching my JSON structure
- MapData interface for the full level data
- Player interface with position, direction, plane
- RayHit interface for raycasting results

Use the map JSON I provided as reference for the exact structure.
```

### Phase 3: Map System (Day 2)

**Tell Claude Code:**

```
Implement src/core/DungeonMap.ts that:

1. Loads map data from JSON
2. Stores tiles in a Map for fast lookup by "x,y" key
3. Handles edge wrapping for toroidal maps
4. Provides getTile(x, y) method
5. Provides hasWall(x, y, direction) method
6. Provides getWallState(x, y, direction) method

Key logic: When checking walls, determine which wall face was hit based on:
- If stepping in X direction (vertical wall hit): check east/west walls
- If stepping in Y direction (horizontal wall hit): check north/south walls
- Step direction determines which face: 
  - stepX > 0 hits west wall, stepX < 0 hits east wall
  - stepY > 0 hits north wall, stepY < 0 hits south wall
```

### Phase 4: DDA Raycaster (Days 3-4)

**Tell Claude Code:**

```
Implement src/core/Raycaster.ts using the DDA algorithm.

Key algorithm steps:

1. Cast a ray for each screen column:
   - Calculate ray direction from player direction + camera plane
   - cameraX = (2 * screenX / screenWidth) - 1
   - rayDir = playerDir + cameraPlane * cameraX

2. DDA traversal:
   - Calculate deltaDistX = abs(1 / rayDirX)
   - Calculate deltaDistY = abs(1 / rayDirY)
   - Step through grid, always moving to next grid line
   - Choose smaller of sideDistX or sideDistY

3. Wall detection:
   - When entering new grid cell, check which wall face we hit
   - Use map.hasWall(mapX, mapY, wallDirection)
   - wallDirection determined by step direction and side

4. Distance calculation:
   - Use PERPENDICULAR distance, not direct distance
   - perpDist = sideDistX - deltaDistX (for vertical walls)
   - This prevents fisheye distortion

5. Return RayHit with:
   - distance (perpendicular)
   - map coordinates
   - wall type (wall/door)
   - exact hit position (0-1) for texture mapping

Use the pseudocode from raycasting-algorithms-pseudocode.md as reference.
```

### Phase 5: Player Controller (Day 4)

**Tell Claude Code:**

```
Implement src/core/Player.ts with:

1. Position as Vector2 (floating point for smooth movement)
2. Direction vector (unit vector pointing forward)
3. Camera plane vector (perpendicular to direction, scaled for FOV)

Movement methods:
- move(forward/backward): Move along direction vector
- turn(left/right): Rotate direction and plane by 90 degrees
- strafe(left/right): Move perpendicular to direction

Rotation math:
For angle θ:
newX = oldX * cos(θ) - oldY * sin(θ)
newY = oldX * sin(θ) + oldY * cos(θ)

For 90-degree turns:
Left: newX = -oldY, newY = oldX
Right: newX = oldY, newY = -oldX

Collision detection:
- Calculate new position
- Check if grid cell at floor(newX), floor(newY) has walls
- Only move if no collision

Camera plane:
- Always perpendicular to direction
- Length controls FOV: 0.66 gives ~66 degree FOV
- planeX = -dirY * 0.66, planeY = dirX * 0.66
```

### Phase 6: Renderer (Days 5-6)

**Tell Claude Code:**

```
Implement src/rendering/Renderer.ts that:

1. Clears canvas each frame
2. Draws background (ceiling and floor)
3. Casts rays for each screen column
4. Renders wall stripes

For each wall stripe:
- Calculate wall height: screenHeight / perpDistance
- Calculate draw bounds: center ± height/2, clamped to screen
- Choose color based on wall type (wall/door) and orientation (NS/EW)
- Apply distance-based darkening (fog):
  brightness = 1.0 - (distance / maxRenderDistance)
  brightness = clamp(brightness, 0.2, 1.0)
- Draw vertical line at column x

Optimization: Draw entire stripe at once, not pixel-by-pixel
Use fillRect(x, drawStart, 1, drawEnd - drawStart)
```

### Phase 7: Game Loop (Day 7)

**Tell Claude Code:**

```
Implement src/game/Game.ts with:

1. Initialize all systems (map, player, raycaster, renderer)
2. Setup input handling:
   - Keyboard events for WASD + arrows + Q/E
   - Map keys to player movement methods
3. Main game loop:
   - requestAnimationFrame for smooth 60fps
   - Update player position based on input
   - Render current frame
4. Start/stop methods

Input mapping:
W/↑: move forward
S/↓: move backward  
A/←: turn left
D/→: turn right
Q: strafe left
E: strafe right
```

### Phase 8: Main Entry Point (Day 7)

**Tell Claude Code:**

```
Implement src/main.ts that:

1. Loads map JSON from data/level1.json
2. Gets canvas element from HTML
3. Creates Game instance with loaded map
4. Starts game loop
5. Optionally adds UI for:
   - Position display
   - FPS counter
   - Minimap
   - Settings controls
```

---

## Advanced Features (Optional Extensions)

### Texture Mapping

**Tell Claude Code:**

```
Add texture support to the renderer:

1. Load wall texture images
2. In drawWallStripe, sample texture:
   - texX = floor(wallX * textureWidth)
   - For each pixel Y, calculate texY
   - Sample texture pixel at (texX, texY)
   - Apply fog/distance shading to sampled color

Use the texture mapping pseudocode from the algorithms document.
```

### Minimap

**Tell Claude Code:**

```
Add a minimap to the renderer:

1. Create small canvas overlay (100x100)
2. Scale map to fit (mapSize → canvasSize)
3. Draw each tile as colored square:
   - Floor tiles: dark gray
   - Wall tiles: based on wall states
4. Draw player position as green dot
5. Optional: Draw view direction as line
```

### Doors

**Tell Claude Code:**

```
Implement interactive doors:

1. Add door state to Tile (open/closed/locked)
2. In raycaster, check door state
3. If door closed, it blocks like a wall
4. Add player action to open/close doors
5. Optional: Door opening animation (slide texture)
```

### Entities/Sprites

**Tell Claude Code:**

```
Add sprite rendering for entities:

1. After rendering walls, render sprites:
   - Calculate sprite screen position from world position
   - Sort sprites by distance (back to front)
   - Scale sprite based on distance
   - Draw if not occluded by walls

2. Use separate canvas layer or draw after walls

3. Entity types: enemies, items, NPCs
```

---

## Debugging Tips for Claude Code

### Issue: Fisheye Effect (Walls Appear Curved)

**Tell Claude Code:**
```
The walls have fisheye distortion. Ensure we're using PERPENDICULAR distance:
perpDist = sideDistX - deltaDistX (not raw sideDistX)

This must be the distance projected onto the camera plane, not the direct ray distance.
```

### Issue: Incorrect Wall Detection

**Tell Claude Code:**
```
Walls are detected incorrectly. Debug the wall direction logic:

When the ray steps in +X direction, it hits the WEST wall of the new cell
When the ray steps in -X direction, it hits the EAST wall of the new cell
When the ray steps in +Y direction, it hits the NORTH wall of the new cell  
When the ray steps in -Y direction, it hits the SOUTH wall of the new cell

Print the step direction and wall direction for debugging.
```

### Issue: Wrong Colors/Orientation

**Tell Claude Code:**
```
Wall colors don't match orientation. Verify:
- NS walls (vertical): use one color
- EW walls (horizontal): use different color (usually darker)
- Side is determined during DDA:
  - side = 'NS' when stepping in X
  - side = 'EW' when stepping in Y
```

### Issue: Player Can't Move/Turns Wrong

**Tell Claude Code:**
```
Movement issues. Check:
1. Direction vector is normalized (length = 1)
2. Rotation applies to BOTH direction and plane
3. Collision detection checks floor(position), not position directly
4. Step size is reasonable (0.05 - 0.2)
```

### Issue: Performance Problems

**Tell Claude Code:**
```
Optimize rendering:
1. Use single fillRect per stripe, not pixel-by-pixel
2. Limit max ray distance (10-20 tiles)
3. Use integer arithmetic where possible
4. Cache color calculations
5. Consider using OffscreenCanvas or ImageData for faster drawing
```

---

## Testing Strategy

### Test 1: Basic Rendering
```
Load demo map, verify:
✓ Walls render at correct positions
✓ Perspective looks correct (no fisheye)
✓ Distance fog works
✓ Different wall types have different colors
```

### Test 2: Movement
```
Test player movement:
✓ Forward/backward moves in facing direction
✓ Turning rotates view 90 degrees
✓ Strafing moves perpendicular
✓ Collision stops movement at walls
```

### Test 3: Edge Cases
```
Test edge wrapping:
✓ Moving off map edge wraps to opposite side
✓ Raycasting works across wrap boundary
✓ Minimap shows wrapped position

Test map boundaries (if not wrapping):
✓ Out-of-bounds is treated as wall
✓ Player can't move outside map
```

### Test 4: Door Handling
```
Verify door tiles:
✓ Doors block movement when closed
✓ Doors render with distinct color
✓ Door state persists in map data
```

---

## Performance Benchmarks

**Target Performance:**
- 60 FPS on modern browsers
- 800x600 resolution
- 10-15 tile render distance

**Typical Metrics:**
- Ray casting: ~5ms per frame (800 rays)
- Rendering: ~3ms per frame
- Total frame time: <16ms (60 FPS)

**Optimization Priorities:**
1. Use fillRect for stripes (not pixel-by-pixel)
2. Limit render distance
3. Integer math in DDA when possible
4. Avoid object allocations in hot paths

---

## Map Data Integration

Your map format is already perfect for this renderer. Each tile specifies walls explicitly, which maps directly to the raycaster logic.

**Key mappings:**
- `"open"` → No wall, ray passes through
- `"wall"` → Solid wall, ray stops
- `"door"` → Wall that can be opened (treated as wall for now)

**Edge wrapping:**
Your map has `"edgeWrapping": true`, which the DungeonMap class handles automatically using modulo arithmetic.

**Special tiles:**
Your map includes special tiles (teleporter, searchable, etc). Add these as extensions:
```
// In map lookup, check tile.type
if (tile.type === 'teleporter') {
    handleTeleport(tile.destination);
}
```

---

## Next Steps After Basic Implementation

1. **Add texture support** for more visual variety
2. **Implement doors** with open/close mechanics  
3. **Add sprites** for enemies and items
4. **Create HUD** with health, inventory, etc.
5. **Implement combat** system
6. **Add save/load** for game state
7. **Multi-level** support with stairs
8. **Sound effects** and music

---

## Reference Implementation

The `dungeon-renderer-implementation.ts` file contains a complete, production-ready implementation that you can use as-is or customize.

**To use it directly:**
```typescript
import { DungeonGame } from './dungeon-renderer-implementation';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const mapData = await fetch('level1.json').then(r => r.json());

const game = new DungeonGame(canvas, mapData.levels[0]);
game.start();
```

---

## Conclusion

This raycasting renderer gives you:
✓ Authentic retro 3D dungeon feeling
✓ Smooth 60 FPS performance
✓ Full TypeScript type safety
✓ Extensible architecture for features
✓ Direct integration with your map format

The mathematical approach (vs prerendered tiles) gives you flexibility for dynamic lighting, smooth turning, texture mapping, and other modern enhancements while maintaining the classic dungeon crawler aesthetic.

Start with the basic implementation, verify it works with your map data, then add features incrementally. The pseudocode and reference implementation provide all the algorithms you need for Claude Code to build this efficiently.
