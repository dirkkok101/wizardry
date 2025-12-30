# RAYCASTING QUICK REFERENCE
## Essential Formulas and Constants

---

## DDA ALGORITHM CORE

### Initial Setup
```typescript
// Ray direction for screen column x
cameraX = 2 * x / screenWidth - 1
rayDirX = playerDir.x + cameraPlane.x * cameraX
rayDirY = playerDir.y + cameraPlane.y * cameraX

// Starting position
mapX = floor(playerPos.x)
mapY = floor(playerPos.y)

// Delta distances (distance to cross one grid unit)
deltaDistX = abs(1 / rayDirX)
deltaDistY = abs(1 / rayDirY)
```

### Step Direction
```typescript
if (rayDirX < 0) {
    stepX = -1
    sideDistX = (playerPos.x - mapX) * deltaDistX
} else {
    stepX = 1
    sideDistX = (mapX + 1 - playerPos.x) * deltaDistX
}

// Same for Y
```

### Main Loop
```typescript
while (!hit && steps < maxDistance) {
    if (sideDistX < sideDistY) {
        sideDistX += deltaDistX
        mapX += stepX
        side = 'NS'  // Vertical wall
    } else {
        sideDistY += deltaDistY
        mapY += stepY
        side = 'EW'  // Horizontal wall
    }
    
    if (hasWall(mapX, mapY)) {
        hit = true
    }
}
```

### Distance Calculation
```typescript
// CRITICAL: Use perpendicular distance (prevents fisheye)
if (side === 'NS') {
    perpDist = sideDistX - deltaDistX
} else {
    perpDist = sideDistY - deltaDistY
}

// Wall X position (0-1, for textures)
if (side === 'NS') {
    wallX = playerPos.y + perpDist * rayDirY
} else {
    wallX = playerPos.x + perpDist * rayDirX
}
wallX = wallX - floor(wallX)
```

---

## WALL DIRECTION MAPPING

```typescript
function getWallDirection(side, stepX, stepY) {
    if (side === 'NS') {
        // Vertical wall (X-axis step)
        return stepX > 0 ? 'west' : 'east'
    } else {
        // Horizontal wall (Y-axis step)
        return stepY > 0 ? 'north' : 'south'
    }
}
```

**Logic:**
- Moving **right** (+X) → Hit **west** wall (left side of new cell)
- Moving **left** (-X) → Hit **east** wall (right side of new cell)
- Moving **down** (+Y) → Hit **north** wall (top side of new cell)
- Moving **up** (-Y) → Hit **south** wall (bottom side of new cell)

---

## RENDERING FORMULAS

### Wall Height Projection
```typescript
lineHeight = screenHeight / perpDistance

// Vertical position on screen
drawStart = max(0, -lineHeight/2 + screenHeight/2)
drawEnd = min(screenHeight, lineHeight/2 + screenHeight/2)
```

### Distance Fog (Linear)
```typescript
function calculateBrightness(distance) {
    const minBright = 0.2
    const maxBright = 1.0
    const fogStart = 1.0
    const fogEnd = 10.0
    
    if (distance <= fogStart) return maxBright
    if (distance >= fogEnd) return minBright
    
    const t = (distance - fogStart) / (fogEnd - fogStart)
    return maxBright - t * (maxBright - minBright)
}
```

### Distance Fog (Exponential)
```typescript
brightness = Math.exp(-distance * fogDensity)
// Typical fogDensity: 0.1 - 0.3
```

### Color Shading
```typescript
function shadeColor(baseColor, brightness) {
    const r = baseColor.r * brightness
    const g = baseColor.g * brightness
    const b = baseColor.b * brightness
    return rgb(r, g, b)
}
```

---

## CAMERA AND FOV

### Camera Plane Setup
```typescript
// Plane is perpendicular to direction
planeX = -directionY * planeScale
planeY = directionX * planeScale

// Plane scale from FOV
const fovRadians = fovDegrees * (Math.PI / 180)
planeScale = Math.tan(fovRadians / 2)
```

### FOV Calculation
```typescript
FOV = 2 * Math.atan(planeLength / directionLength)

// Common values (directionLength = 1):
// 60° → plane = 0.577
// 66° → plane = 0.649
// 70° → plane = 0.700
// 90° → plane = 1.000
```

### Typical Configuration
```typescript
const player = {
    direction: { x: 0, y: -1 },  // North
    plane: { x: 0.66, y: 0 }     // ~66° FOV
}
```

---

## ROTATION MATH

### 2D Rotation Matrix
```typescript
function rotate(vector, angle) {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    return {
        x: vector.x * cos - vector.y * sin,
        y: vector.x * sin + vector.y * cos
    }
}
```

### 90-Degree Rotations (Optimized)
```typescript
// Left turn (counter-clockwise)
newX = -oldY
newY = oldX

// Right turn (clockwise)
newX = oldY
newY = -oldX

// 180 degrees
newX = -oldX
newY = -oldY
```

### Cardinal Direction Conversion
```typescript
function vectorToDirection(dir) {
    const angle = Math.atan2(dir.y, dir.x)
    const norm = ((angle + 2*Math.PI) % (2*Math.PI))
    
    if (norm < Math.PI/4 || norm >= 7*Math.PI/4) return 'east'
    if (norm >= Math.PI/4 && norm < 3*Math.PI/4) return 'south'
    if (norm >= 3*Math.PI/4 && norm < 5*Math.PI/4) return 'west'
    return 'north'
}

const directionVectors = {
    north: { x: 0, y: -1 },
    east: { x: 1, y: 0 },
    south: { x: 0, y: 1 },
    west: { x: -1, y: 0 }
}
```

---

## MOVEMENT AND COLLISION

### Basic Movement
```typescript
const moveSpeed = 0.1
const newX = playerX + dirX * moveSpeed
const newY = playerY + dirY * moveSpeed

// Check collision
if (!hasWall(floor(newX), floor(newY))) {
    playerX = newX
    playerY = newY
}
```

### Strafing
```typescript
// Perpendicular to direction
const strafeX = -dirY * moveSpeed
const strafeY = dirX * moveSpeed

// For right strafe:
newX = playerX + strafeX
newY = playerY + strafeY

// For left strafe:
newX = playerX - strafeX
newY = playerY - strafeY
```

### Sliding Collision
```typescript
// Try full movement
if (!collision(newX, newY)) {
    move to (newX, newY)
}
// Try X only
else if (!collision(newX, oldY)) {
    move to (newX, oldY)
}
// Try Y only
else if (!collision(oldX, newY)) {
    move to (oldX, newY)
}
```

---

## TEXTURE MAPPING

### Basic Texture Sampling
```typescript
const texX = floor(wallX * textureWidth)

// Y-coordinate step through texture
const texStep = textureHeight / lineHeight
let texY = (drawStart - screenHeight/2 + lineHeight/2) * texStep

for (let y = drawStart; y < drawEnd; y++) {
    const texYInt = floor(texY) % textureHeight
    const pixel = texture.getPixel(texX, texYInt)
    
    // Apply distance shading
    const shadedPixel = pixel * brightness
    drawPixel(x, y, shadedPixel)
    
    texY += texStep
}
```

### Texture Mirroring
```typescript
// Mirror for certain orientations
if ((side === 'NS' && stepX < 0) || 
    (side === 'EW' && stepY > 0)) {
    texX = textureWidth - texX - 1
}
```

---

## COORDINATE SYSTEMS

### Grid to World
```typescript
worldX = gridX + 0.5  // Center of tile
worldY = gridY + 0.5
```

### World to Grid
```typescript
gridX = floor(worldX)
gridY = floor(worldY)
```

### Edge Wrapping (Toroidal)
```typescript
function wrap(coord, size) {
    return ((coord % size) + size) % size
}

wrappedX = wrap(x, mapWidth)
wrappedY = wrap(y, mapHeight)
```

---

## PERFORMANCE CONSTANTS

### Recommended Settings
```typescript
const CONFIG = {
    screenWidth: 800,
    screenHeight: 600,
    maxRenderDistance: 10,  // tiles
    moveSpeed: 0.1,         // units per frame
    rotSpeed: Math.PI / 2,  // 90 degrees
    fov: 66,                // degrees
    fogStart: 1.0,
    fogEnd: 10.0,
    minBrightness: 0.2
}
```

### Optimization Thresholds
```typescript
// Maximum ray steps before giving up
const MAX_RAY_STEPS = 100

// Minimum wall height to render (skip distant walls)
const MIN_WALL_HEIGHT = 2  // pixels

// Texture sampling quality
const TEXTURE_QUALITY = 'low'  // low, medium, high
// low: 1 sample per pixel
// medium: 2 samples per pixel
// high: 4 samples per pixel (anti-aliasing)
```

---

## COLOR SCHEMES

### Classic Dungeon
```typescript
const COLORS = {
    ceiling: '#1a1a1a',
    floor: '#2a2a2a',
    wallNS: '#666666',  // Lighter (vertical)
    wallEW: '#444444',  // Darker (horizontal)
    door: '#8B4513'
}
```

### Stone Castle
```typescript
const COLORS = {
    ceiling: '#0a0a0a',
    floor: '#2a251f',
    wallNS: '#8B7355',
    wallEW: '#6B5345',
    door: '#CD853F'
}
```

### Ice Cave
```typescript
const COLORS = {
    ceiling: '#1a1a2a',
    floor: '#2a2a3a',
    wallNS: '#6B8BA8',
    wallEW: '#4B6B88',
    door: '#87CEEB'
}
```

---

## DEBUG HELPERS

### Ray Visualization
```typescript
function debugRay(rayHit) {
    console.log(`Distance: ${rayHit.distance.toFixed(2)}`)
    console.log(`Position: (${rayHit.mapX}, ${rayHit.mapY})`)
    console.log(`Side: ${rayHit.side}`)
    console.log(`Wall: ${rayHit.wallDirection}`)
    console.log(`WallX: ${rayHit.wallX.toFixed(2)}`)
}
```

### FPS Counter
```typescript
let frameCount = 0
let lastTime = performance.now()

function updateFPS() {
    frameCount++
    const now = performance.now()
    if (now - lastTime >= 1000) {
        const fps = frameCount
        console.log(`FPS: ${fps}`)
        frameCount = 0
        lastTime = now
    }
}
```

### Minimap Drawing
```typescript
function drawMinimap(ctx, map, player, scale) {
    // Draw tiles
    for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
            if (map.hasWall(x, y)) {
                ctx.fillStyle = '#666'
            } else {
                ctx.fillStyle = '#222'
            }
            ctx.fillRect(x * scale, y * scale, scale, scale)
        }
    }
    
    // Draw player
    ctx.fillStyle = '#0f0'
    ctx.fillRect(
        floor(player.x) * scale,
        floor(player.y) * scale,
        scale, scale
    )
    
    // Draw direction
    ctx.strokeStyle = '#0f0'
    ctx.beginPath()
    ctx.moveTo(player.x * scale, player.y * scale)
    ctx.lineTo(
        (player.x + player.dirX) * scale,
        (player.y + player.dirY) * scale
    )
    ctx.stroke()
}
```

---

## COMMON PITFALLS

### ❌ Fisheye Effect
**Problem:** Walls appear curved
**Fix:** Use perpendicular distance, not Euclidean distance
```typescript
// WRONG
distance = sqrt((hitX - playerX)² + (hitY - playerY)²)

// CORRECT
distance = sideDistX - deltaDistX  // or sideDistY - deltaDistY
```

### ❌ Wrong Wall Detection
**Problem:** Checking wrong wall face
**Fix:** Match step direction to wall direction
```typescript
// When stepping +X, we hit the WEST wall of new cell
// When stepping -X, we hit the EAST wall of new cell
```

### ❌ Rotation Desync
**Problem:** Direction and plane not perpendicular
**Fix:** Always rotate both together
```typescript
// Rotate direction
newDir = rotate(oldDir, angle)
// Rotate plane by same angle
newPlane = rotate(oldPlane, angle)
```

### ❌ Collision Issues
**Problem:** Can walk through walls
**Fix:** Check integer grid position, not floating point
```typescript
// WRONG
if (hasWall(playerX, playerY))

// CORRECT
if (hasWall(floor(playerX), floor(playerY)))
```

---

## QUICK TEST CASES

### Test 1: North-Facing at (0.5, 0.5)
```typescript
Expected:
- dirX = 0, dirY = -1
- planeX = 0.66, planeY = 0
- First ray (x=0) goes NW
- Center ray (x=width/2) goes N
- Last ray (x=width-1) goes NE
```

### Test 2: 90° Right Turn
```typescript
Before: dir = (0, -1), plane = (0.66, 0)
After:  dir = (1, 0),  plane = (0, 0.66)
```

### Test 3: Wall Hit Detection
```typescript
Ray at (1.5, 1.5) facing North
Should hit wall at (1, 0) on SOUTH face
- stepY = -1 (moving up)
- side = 'EW' (horizontal grid line)
- wallDirection = 'south'
```

---

## FORMULA CHEAT SHEET

| Formula | Usage |
|---------|-------|
| `perpDist = sideDist - deltaDist` | Fisheye correction |
| `wallHeight = screenH / perpDist` | Projection |
| `FOV = 2*atan(plane/dir)` | Field of view |
| `x' = x*cos(θ) - y*sin(θ)` | Rotation |
| `bright = 1 - d/maxD` | Linear fog |
| `bright = e^(-d*density)` | Exponential fog |
| `texStep = texH / wallH` | Texture mapping |
| `wrap = ((n % m) + m) % m` | Edge wrapping |

---

## KEYBOARD SHORTCUTS (Typical)

| Key | Action |
|-----|--------|
| W / ↑ | Move Forward |
| S / ↓ | Move Backward |
| A / ← | Turn Left |
| D / → | Turn Right |
| Q | Strafe Left |
| E | Strafe Right |
| Space | Action/Use |
| M | Toggle Map |
| Esc | Pause Menu |

---

This reference card contains all essential formulas and constants needed to implement and debug a raycasting dungeon renderer. Keep it handy when working with Claude Code!
