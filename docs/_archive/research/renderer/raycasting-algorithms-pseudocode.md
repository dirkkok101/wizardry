# RAYCASTING ALGORITHMS - DETAILED PSEUDOCODE
## For Cell-Based Map Layout

This document provides detailed pseudocode for each algorithm in the mathematical raycasting renderer.

---

## 1. DDA RAYCASTING ALGORITHM
**Purpose**: Cast a ray and find the first wall intersection

### Core Concept
The Digital Differential Analyzer (DDA) algorithm steps through a grid efficiently by always moving to the next grid line intersection, either vertical or horizontal.

### Pseudocode

```
FUNCTION castRay(playerPos, rayDirection, screenX, screenWidth):
    // Calculate ray direction for this specific screen column
    cameraX = (2 * screenX / screenWidth) - 1    // Range: -1 to +1
    rayDirX = playerDir.x + cameraPlane.x * cameraX
    rayDirY = playerDir.y + cameraPlane.y * cameraX
    
    // Start at player's current grid cell
    mapX = floor(playerPos.x)
    mapY = floor(playerPos.y)
    
    // Calculate how far the ray must travel to cross one grid unit
    deltaDistX = abs(1 / rayDirX)
    deltaDistY = abs(1 / rayDirY)
    
    // Determine step direction and initial distance to next grid line
    IF rayDirX < 0:
        stepX = -1
        sideDistX = (playerPos.x - mapX) * deltaDistX
    ELSE:
        stepX = 1
        sideDistX = (mapX + 1 - playerPos.x) * deltaDistX
    
    IF rayDirY < 0:
        stepY = -1
        sideDistY = (playerPos.y - mapY) * deltaDistY
    ELSE:
        stepY = 1
        sideDistY = (mapY + 1 - playerPos.y) * deltaDistY
    
    // Step through grid until wall hit
    hit = false
    WHILE NOT hit AND steps < maxDistance:
        // Jump to next grid intersection
        IF sideDistX < sideDistY:
            sideDistX = sideDistX + deltaDistX
            mapX = mapX + stepX
            side = VERTICAL_WALL    // Hit north-south wall
        ELSE:
            sideDistY = sideDistY + deltaDistY
            mapY = mapY + stepY
            side = HORIZONTAL_WALL  // Hit east-west wall
        
        // Check if this grid cell has a wall
        IF hasWall(mapX, mapY, side, stepDirection):
            hit = true
        
        steps = steps + 1
    
    IF NOT hit:
        RETURN null
    
    // Calculate perpendicular wall distance (prevents fisheye)
    IF side == VERTICAL_WALL:
        perpDist = sideDistX - deltaDistX
    ELSE:
        perpDist = sideDistY - deltaDistY
    
    // Calculate exact hit position on wall (0 to 1)
    IF side == VERTICAL_WALL:
        wallX = playerPos.y + perpDist * rayDirY
    ELSE:
        wallX = playerPos.x + perpDist * rayDirX
    wallX = wallX - floor(wallX)
    
    RETURN RayHit(perpDist, mapX, mapY, side, wallX)
```

### Mathematical Explanation

**DeltaDist Calculation**:
```
deltaDistX = |1 / rayDirX|
```
This represents: "How far must the ray travel to cross one grid unit in X?"

**Perpendicular Distance** (Critical for fisheye correction):
```
perpDist = sideDistX - deltaDistX  (for vertical walls)
```
This gives the distance measured perpendicular to the camera plane, not along the ray direction.

**Why Perpendicular Distance?**
- Direct ray distance creates fisheye distortion (center rays shorter than edge rays)
- Perpendicular distance projects all rays onto the camera plane
- Result: straight walls appear straight

---

## 2. WALL DETECTION IN CELL-BASED MAP

### Pseudocode

```
FUNCTION hasWall(mapX, mapY, side, stepX, stepY):
    tile = getTile(mapX, mapY)
    IF tile is null:
        RETURN true  // Out of bounds = wall
    
    // Determine which wall of the tile we're checking
    wallDirection = getWallDirection(side, stepX, stepY)
    
    // Check wall state
    wallState = tile.walls[wallDirection]
    
    RETURN (wallState == WALL OR wallState == DOOR)

FUNCTION getWallDirection(side, stepX, stepY):
    IF side == VERTICAL_WALL:
        IF stepX > 0:
            RETURN WEST  // Entering from left, hit west wall
        ELSE:
            RETURN EAST  // Entering from right, hit east wall
    ELSE:  // HORIZONTAL_WALL
        IF stepY > 0:
            RETURN NORTH  // Entering from top, hit north wall
        ELSE:
            RETURN SOUTH  // Entering from bottom, hit south wall
```

### Logic Explanation

When the DDA algorithm steps into a new grid cell, it needs to know which wall face it hit:
- **Vertical step (stepX)**: Hit either east or west wall
- **Horizontal step (stepY)**: Hit either north or south wall

The direction depends on which way we're traveling:
- Moving right (stepX > 0) → Hit the west wall (left side) of new cell
- Moving left (stepX < 0) → Hit the east wall (right side) of new cell
- Moving down (stepY > 0) → Hit the north wall (top side) of new cell
- Moving up (stepY < 0) → Hit the south wall (bottom side) of new cell

---

## 3. WALL RENDERING

### Pseudocode

```
FUNCTION drawWallStripe(screenX, rayHit):
    // Calculate projected wall height
    lineHeight = screenHeight / rayHit.distance
    
    // Calculate vertical drawing bounds (clamped to screen)
    drawStart = max(0, -lineHeight/2 + screenHeight/2)
    drawEnd = min(screenHeight, lineHeight/2 + screenHeight/2)
    
    // Choose base color based on wall orientation
    IF rayHit.wallState == DOOR:
        baseColor = doorColor
    ELSE IF rayHit.side == VERTICAL_WALL:
        baseColor = wallNSColor
    ELSE:
        baseColor = wallEWColor
    
    // Apply distance-based darkening (fog)
    brightness = calculateBrightness(rayHit.distance)
    finalColor = baseColor * brightness
    
    // Draw vertical stripe
    drawVerticalLine(screenX, drawStart, drawEnd, finalColor)
```

### Projection Mathematics

**Wall Height Calculation**:
```
lineHeight = screenHeight / perpDistance
```

This is inverse projection:
- Close walls (small distance) → Large lineHeight
- Far walls (large distance) → Small lineHeight

**Vertical Centering**:
```
centerY = screenHeight / 2
topY = centerY - lineHeight / 2
bottomY = centerY + lineHeight / 2
```

The wall extends equally above and below the horizon line.

---

## 4. BRIGHTNESS/FOG CALCULATION

### Pseudocode

```
FUNCTION calculateBrightness(distance):
    minBrightness = 0.2   // Darkest (far away)
    maxBrightness = 1.0   // Brightest (close)
    fogStart = 1.0        // Distance where fog begins
    fogEnd = 10.0         // Distance where fully fogged
    
    IF distance <= fogStart:
        RETURN maxBrightness
    
    IF distance >= fogEnd:
        RETURN minBrightness
    
    // Linear interpolation between fogStart and fogEnd
    factor = (distance - fogStart) / (fogEnd - fogStart)
    brightness = maxBrightness - (factor * (maxBrightness - minBrightness))
    
    RETURN brightness
```

### Fog Formula

Linear fog interpolation:
```
brightness = 1.0 - ((distance - fogStart) / (fogEnd - fogStart)) * (1.0 - minBrightness)
```

For exponential fog (more realistic):
```
brightness = exp(-distance * fogDensity)
```

---

## 5. PLAYER ROTATION

### Pseudocode

```
FUNCTION rotatePlayer(angle):
    // Rotate direction vector
    oldDirX = player.direction.x
    player.direction.x = oldDirX * cos(angle) - player.direction.y * sin(angle)
    player.direction.y = oldDirX * sin(angle) + player.direction.y * cos(angle)
    
    // Rotate camera plane (must stay perpendicular)
    oldPlaneX = player.plane.x
    player.plane.x = oldPlaneX * cos(angle) - player.plane.y * sin(angle)
    player.plane.y = oldPlaneX * sin(angle) + player.plane.y * cos(angle)
    
    // Update cardinal facing direction
    player.facing = vectorToCardinalDirection(player.direction)
```

### Rotation Matrix

For a 2D rotation by angle θ:
```
[x']   [cos(θ)  -sin(θ)] [x]
[y'] = [sin(θ)   cos(θ)] [y]
```

**For 90-degree rotations** (optimized):
```
// Left turn (90° counter-clockwise)
newX = -oldY
newY = oldX

// Right turn (90° clockwise)  
newX = oldY
newY = -oldX
```

---

## 6. PLAYER MOVEMENT WITH COLLISION

### Pseudocode

```
FUNCTION movePlayer(direction):
    moveSpeed = 0.1
    
    IF direction == FORWARD:
        multiplier = 1
    ELSE:  // BACKWARD
        multiplier = -1
    
    // Calculate new position
    newX = player.x + player.dirX * moveSpeed * multiplier
    newY = player.y + player.dirY * moveSpeed * multiplier
    
    // Check collision at new position
    tileX = floor(newX)
    tileY = floor(newY)
    
    IF NOT hasCollision(tileX, tileY):
        player.x = newX
        player.y = newY
        RETURN true
    ELSE:
        RETURN false  // Movement blocked

FUNCTION hasCollision(tileX, tileY):
    tile = getTile(tileX, tileY)
    IF tile is null:
        RETURN true  // Out of bounds
    
    // Check if any wall exists (simplified collision)
    RETURN (tile.walls.north == WALL OR
            tile.walls.south == WALL OR
            tile.walls.east == WALL OR
            tile.walls.west == WALL)
```

### Advanced Collision (Sliding)

For smoother collision with sliding:
```
FUNCTION movePlayerWithSliding(direction):
    newX = player.x + player.dirX * moveSpeed
    newY = player.y + player.dirY * moveSpeed
    
    // Try full movement
    IF NOT hasCollision(floor(newX), floor(newY)):
        player.x = newX
        player.y = newY
        RETURN
    
    // Try X-axis only (slide along Y)
    IF NOT hasCollision(floor(newX), floor(player.y)):
        player.x = newX
        RETURN
    
    // Try Y-axis only (slide along X)
    IF NOT hasCollision(floor(player.x), floor(newY)):
        player.y = newY
        RETURN
    
    // No movement possible
```

---

## 7. CAMERA PLANE CALCULATION

### Purpose
The camera plane defines the field of view (FOV).

### Pseudocode

```
FUNCTION setupCamera(directionVector, fovDegrees):
    // Direction is unit vector pointing where player faces
    direction = normalize(directionVector)
    
    // Camera plane is perpendicular to direction
    // Rotate direction 90 degrees
    planeX = -direction.y
    planeY = direction.x
    
    // Scale plane to achieve desired FOV
    fovRadians = fovDegrees * (PI / 180)
    planeScale = tan(fovRadians / 2)
    
    plane.x = planeX * planeScale
    plane.y = planeY * planeScale
    
    RETURN (direction, plane)
```

### FOV Mathematics

Relationship between plane length and FOV:
```
FOV = 2 * atan(|plane| / |direction|)
```

For a 66-degree FOV with unit direction vector:
```
planeLength = tan(66° / 2) = tan(33°) ≈ 0.65
```

Common values:
- 60° FOV: plane = 0.57
- 66° FOV: plane = 0.66
- 90° FOV: plane = 1.0
- 120° FOV: plane = 1.73

---

## 8. TEXTURE MAPPING (OPTIONAL ENHANCEMENT)

### Pseudocode

```
FUNCTION drawTexturedWallStripe(screenX, rayHit, texture):
    // Calculate wall height and bounds (same as before)
    lineHeight = screenHeight / rayHit.distance
    drawStart = max(0, -lineHeight/2 + screenHeight/2)
    drawEnd = min(screenHeight, lineHeight/2 + screenHeight/2)
    
    // Get texture X coordinate from wall hit position
    texX = floor(rayHit.wallX * texture.width)
    
    // Mirror texture for certain wall orientations
    IF shouldMirrorTexture(rayHit):
        texX = texture.width - texX - 1
    
    // Calculate texture Y step
    texStep = texture.height / lineHeight
    texY = (drawStart - screenHeight/2 + lineHeight/2) * texStep
    
    // Draw column pixel by pixel
    FOR y FROM drawStart TO drawEnd:
        texYInt = floor(texY) MOD texture.height
        pixel = texture.getPixel(texX, texYInt)
        
        // Apply fog/distance shading
        brightness = calculateBrightness(rayHit.distance)
        shadedPixel = pixel * brightness
        
        drawPixel(screenX, y, shadedPixel)
        
        texY = texY + texStep
```

### Affine Texture Mapping

The step calculation ensures texture maps linearly across wall height:
```
texStep = textureHeight / projectedWallHeight
```

Each screen pixel steps through the texture:
```
texY[i+1] = texY[i] + texStep
```

---

## 9. MAIN RENDER LOOP

### Pseudocode

```
FUNCTION renderFrame(player):
    // Clear screen
    clearCanvas()
    
    // Draw background (floor and ceiling)
    drawFloorAndCeiling()
    
    // Cast one ray per vertical screen column
    FOR x FROM 0 TO screenWidth:
        rayHit = castRay(player.position, player.direction, x)
        
        IF rayHit is not null AND rayHit.distance < maxRenderDistance:
            drawWallStripe(x, rayHit)
    
    // Optionally draw sprites/entities (future enhancement)
    // drawSprites(player)
```

### Game Loop

```
FUNCTION gameLoop(currentTime):
    deltaTime = currentTime - lastTime
    lastTime = currentTime
    
    // Update game state
    handleInput(deltaTime)
    updatePhysics(deltaTime)
    updateEntities(deltaTime)
    
    // Render
    renderFrame(player)
    
    // Continue loop
    requestNextFrame(gameLoop)
```

---

## 10. COORDINATE SYSTEM

### Map Grid vs. World Coordinates

```
// Grid coordinates (integers)
gridX = 5
gridY = 3

// World coordinates (floats, for smooth movement)
worldX = 5.5  // Center of grid cell 5
worldY = 3.7  // 70% through grid cell 3

// Conversion
gridX = floor(worldX)
gridY = floor(worldY)
```

### Tile-Based Collision

```
FUNCTION getTileAt(worldX, worldY):
    gridX = floor(worldX)
    gridY = floor(worldY)
    RETURN map.getTile(gridX, gridY)
```

### Edge Wrapping (Toroidal Map)

```
FUNCTION getTileWithWrapping(x, y):
    // Wrap coordinates to map bounds
    wrappedX = ((x MOD mapWidth) + mapWidth) MOD mapWidth
    wrappedY = ((y MOD mapHeight) + mapHeight) MOD mapHeight
    
    RETURN map.getTile(wrappedX, wrappedY)
```

This handles both positive and negative coordinates correctly.

---

## PERFORMANCE OPTIMIZATIONS

### 1. Integer-Only DDA
Replace floating-point divisions with bit shifts:
```
// Instead of: deltaDistX = abs(1 / rayDirX)
// Use fixed-point arithmetic:
deltaDistX = (1 << 16) / abs(rayDirX)  // 16-bit fixed point
```

### 2. Lookup Tables
Pre-calculate trig functions:
```
sinTable[360], cosTable[360]
brightness = sinTable[angle]
```

### 3. Draw Buffer
Render to off-screen buffer, then blit once:
```
imageData = createImageData(screenWidth, screenHeight)
// Fill imageData pixel by pixel
ctx.putImageData(imageData, 0, 0)
```

### 4. Dirty Rectangles
Only redraw changed screen regions (for static scenes).

---

## KEY FORMULAS REFERENCE

**Perpendicular Distance** (Fisheye correction):
```
perpDist = abs((mapX - posX + (1 - stepX)/2) / rayDirX)
perpDist = abs((mapY - posY + (1 - stepY)/2) / rayDirY)
```

**Wall Height Projection**:
```
wallHeight = screenHeight / perpDistance
```

**Field of View**:
```
FOV = 2 * atan(|plane| / |direction|)
```

**2D Rotation Matrix**:
```
x' = x*cos(θ) - y*sin(θ)
y' = x*sin(θ) + y*cos(θ)
```

**Linear Fog**:
```
brightness = 1.0 - (distance - fogStart) / (fogEnd - fogStart)
```

**Exponential Fog**:
```
brightness = e^(-distance * density)
```
