# Stairs Wall Texture & Interaction Design

**Date:** 2025-11-17
**Status:** Approved
**Author:** Claude Code (Brainstorming Session)

## Overview

This design document describes the implementation of stairs as **wall types** rather than tile types, enabling:
- Visual rendering of stairs textures on walls
- Immediate transition when walking into stairs walls (similar to illusion walls)
- Distinct textures for stairs_up vs stairs_down
- Cleaner separation between wall rendering and tile-based destinations

## Current State

### Existing Implementation

**Stairs are currently tile types:**
```json
{
  "x": 0, "y": 0,
  "walls": { "west": "wall" },
  "type": "stairs_up",
  "destination": { "type": "castle" }
}
```

**Problems:**
1. Stairs texture renders based on tile type, not wall direction
2. Player must step ONTO the tile to trigger stairs
3. No visual indication on walls where stairs are located
4. All walls around stairs tile look like normal walls

**Rendering:** WebGLRenderingService checks `tile.type` for stairs, uses single texture (128, 0) for both up and down.

**Movement:** DungeonService allows movement through all `'wall'` type walls (blocks movement), then NavigationService checks tile type after landing.

## Design Goals

1. **Visual clarity:** Stairs appear as textures on specific walls
2. **Immediate interaction:** Walking into stairs wall triggers transition instantly
3. **Texture distinction:** Separate visuals for stairs_up vs stairs_down
4. **Data model simplicity:** Reuse existing destination system from teleporters
5. **Architectural consistency:** Wall type determines rendering + collision, tile holds destination data

## Proposed Solution: Option A - Wall Type References Tile for Destination

### Architecture Decision

**Approach:** Wall types indicate stairs behavior, tiles hold destination data.

**Why this approach:**
- ✅ Minimal data model changes (reuse existing TileDestination)
- ✅ Wall type is simple string enum
- ✅ Supports flexible destinations (not hardcoded)
- ✅ Clear separation: walls handle rendering/collision, tiles handle destinations
- ✅ Consistent with existing teleporter system

**Trade-off accepted:** Wall behavior requires reading tile data (already done in DungeonService.canMove).

### Alternative Approaches Considered

**Option B: Wall Type Is Self-Contained**
- Introduce `wallDestinations` field mapping wall directions to destinations
- Rejected: Overkill for typical use case, adds complexity

**Option C: Convention-Based Destinations**
- Hardcode stairs_up → castle, stairs_down → next level
- Rejected: Less flexible, can't support custom destinations

---

## Detailed Design

### 1. Data Model Changes

#### WallType Enum Extension

**File:** `src/types/Dungeon.ts`

```typescript
type WallType =
  | 'open' | 'wall' | 'door' | 'secret' | 'locked_door' | 'illusion'
  | 'stairs_up' | 'stairs_down'  // NEW: Stairs as wall types
```

#### Map Data Structure

**Example: Stairs up at (0,0)**
```json
{
  "x": 0,
  "y": 0,
  "walls": {
    "north": "open",
    "east": "open",
    "south": "wall",
    "west": "stairs_up"  // Wall type indicates stairs
  },
  "destination": {       // Tile-level destination data
    "type": "castle"
  }
  // NOTE: No "type" field - tile is implicitly normal
}
```

**Example: Stairs down from level 1 to level 2**
```json
{
  "x": 10,
  "y": 15,
  "walls": {
    "south": "stairs_down"
  },
  "destination": {
    "level": 2,
    "x": 10,
    "y": 0,
    "facing": "south"
  }
}
```

#### Destination Data Rules

**When required:** Any wall on the tile has type `stairs_up` or `stairs_down`

**Type reuse:** Existing `TileDestination` interface (already used for teleporters):
```typescript
interface TileDestination {
  type?: 'castle';        // For stairs_up to castle
  level?: number;         // For stairs_down or inter-level teleporters
  x?: number;             // Target coordinates
  y?: number;
  facing?: Direction;     // Optional: override player facing
}
```

**Validation:** At map load time, verify tiles with stairs walls have valid destination data.

---

### 2. Movement & Collision System

#### DungeonService.canMove() Updates

**File:** `src/services/DungeonService.ts`

**New behavior:**
```typescript
canMove(level, position, moveDirection): MovementValidation {
  const tile = this.getTile(level, position.x, position.y);
  const wallDirection = this.getWallDirectionForMovement(position.facing, moveDirection);
  const wallType = tile.walls[wallDirection];

  // Block solid walls
  if (wallType === 'wall') {
    return { allowed: false, reason: 'You walk into a wall. Ouch!' };
  }

  // Block doors (requires kicking)
  if (wallType === 'door') {
    return { allowed: false, reason: 'A door blocks your way. Press K to kick it open.' };
  }

  // Block secret doors (appear as walls)
  if (wallType === 'secret') {
    return { allowed: false, reason: 'You walk into a wall. Ouch!' };
  }

  // NEW: Allow passage through stairs walls
  if (wallType === 'stairs_up' || wallType === 'stairs_down') {
    return {
      allowed: true,
      triggersSpecialAction: 'stairs',  // NEW field
      destination: tile.destination      // Pass destination along
    };
  }

  // Allow passage through illusions and open spaces
  if (wallType === 'illusion') {
    return { allowed: true };
  }

  return { allowed: true };
}
```

#### MovementValidation Type Extension

**File:** `src/types/Dungeon.ts`

**Current:**
```typescript
interface MovementValidation {
  allowed: boolean;
  reason?: string;
}
```

**Updated:**
```typescript
interface MovementValidation {
  allowed: boolean;
  reason?: string;
  triggersSpecialAction?: 'stairs' | 'teleporter' | 'pit' | 'chute';  // NEW
  destination?: TileDestination;  // NEW: For stairs/teleporters
}
```

#### Map Validation Method

**File:** `src/services/DungeonService.ts`

```typescript
validateStairsWalls(level: LevelData): string[] {
  const errors: string[] = [];

  for (const tile of level.tiles) {
    const hasStairsWall = Object.values(tile.walls).some(
      w => w === 'stairs_up' || w === 'stairs_down'
    );

    if (hasStairsWall && !tile.destination) {
      errors.push(`Tile (${tile.x}, ${tile.y}) has stairs wall but no destination`);
    }
  }

  return errors;
}
```

**Called at:** Map load time in DungeonService initialization.

---

### 3. NavigationService Integration

#### Movement Flow

**File:** `src/services/NavigationService.ts`

**Updated moveForward() logic:**
```typescript
moveForward(): void {
  const validation = DungeonService.canMove(level, position, 'forward');

  if (!validation.allowed) {
    // Show message, play bump sound
    this.showMessage(validation.reason);
    return;
  }

  // NEW: Check for special wall actions BEFORE moving
  if (validation.triggersSpecialAction === 'stairs') {
    this.handleStairsTransition(validation.destination);
    return;  // Don't update position - transition handles it
  }

  // Normal movement: update position
  this.updatePosition(newX, newY);

  // Then check tile-based triggers (existing logic)
  this.checkTileEffects();
}
```

**Key distinction:**
- **Wall-based triggers** (stairs): Fire BEFORE position updates
- **Tile-based triggers** (teleporters, pits): Fire AFTER landing on tile

#### Stairs Transition Handler

**File:** `src/services/NavigationService.ts`

```typescript
private handleStairsTransition(destination: TileDestination): void {
  // Validate destination exists
  if (!destination) {
    console.error('Stairs wall has no destination data');
    this.showMessage('The stairs seem to lead nowhere...');
    return;
  }

  // Handle stairs_up (to castle)
  if (destination.type === 'castle') {
    SceneNavigationService.transitionTo(SceneType.CASTLE_MENU, {
      saveBeforeTransition: true,  // Auto-save when leaving dungeon
      message: 'You climb the stairs back to the castle.'
    });
    return;
  }

  // Handle stairs_down (to another level)
  if (destination.level !== undefined) {
    this.transitionToLevel(
      destination.level,
      destination.x ?? 0,
      destination.y ?? 0,
      destination.facing ?? this.currentPosition.facing
    );
    return;
  }

  // Fallback error
  console.error('Invalid stairs destination:', destination);
  this.showMessage('The stairs seem to lead nowhere...');
}
```

#### Scene Transition Behavior

**Stairs up to castle:**
- Triggers immediate scene transition to `CASTLE_MENU`
- Auto-saves game state (leaving dungeon = safe zone)
- Shows flavor text: "You climb the stairs back to the castle."
- Party position in dungeon is preserved for returning

**Stairs down to next level:**
- Loads new level map data via `transitionToLevel()`
- Updates party position to destination coordinates
- Preserves party facing (or uses destination.facing if specified)
- Does NOT auto-save (still in dungeon = danger zone)
- Shows flavor text: "You descend the stairs..."

---

### 4. Texture Atlas & Rendering

#### Texture Atlas Updates

**File:** `data/textures/eob-dungeon-level-01.json`

**Current layout** (448×128 pixels):
- (0, 0): `stone_wall_01` - 64×64
- (64, 0): `stone_wall_02` - 64×64
- (128, 0): `stairs_down` - 64×64 (existing)
- (192, 0): `door_closed` - 64×64
- (256, 0): **AVAILABLE SLOT** - 64×64
- (320, 0): **AVAILABLE SLOT** - 64×64
- (384, 0): `door_open` - 64×64

**Proposed layout:**
- (128, 0): `stairs_down` - Keep existing texture
- (256, 0): `stairs_up` - **NEW texture to be created**

**Visual design guidance for stairs_up:**
- Clear upward direction indication (ascending steps, upward arrow motif)
- Lighter color palette than stairs_down (suggests returning to surface)
- Brighter lighting/highlights
- Must be 64×64 pixels to match atlas grid

#### WebGLRenderingService Updates

**File:** `src/services/WebGLRenderingService.ts`

**Current logic (lines 365-395):**
```typescript
private selectWallTexture(level: LevelData, wall: WallSegment): [number, number, number, number] {
  const tile = DungeonService.getTile(level, wall.gridX, wall.gridY);

  // Check for stairs (both use same texture)
  if (tile.type === 'stairs_down' || tile.type === 'stairs_up') {
    return [128, 0, 64, 64];
  }

  // ... rest of method
}
```

**Updated logic:**
```typescript
private selectWallTexture(level: LevelData, wall: WallSegment): [number, number, number, number] {
  const tile = DungeonService.getTile(level, wall.gridX, wall.gridY);

  // Get the wall type for the specific wall segment being rendered
  const wallType = tile.walls[wall.side];  // wall.side = 'north'|'south'|'east'|'west'

  // Check for stairs walls FIRST (highest priority)
  if (wallType === 'stairs_up') {
    return [256, 0, 64, 64];  // NEW stairs_up texture
  }

  if (wallType === 'stairs_down') {
    return [128, 0, 64, 64];  // Existing stairs_down texture
  }

  // Check for doors
  if (wallType === 'door') {
    return [192, 0, 64, 64];
  }

  // Secret doors and illusions render as normal walls
  if (wallType === 'secret' || wallType === 'illusion' || wallType === 'wall') {
    const useVariation2 = (wall.gridX + wall.gridY) % 2 === 1;
    return useVariation2 ? [64, 0, 64, 64] : [0, 0, 64, 64];
  }

  // Default: regular wall with checkerboard pattern
  const useVariation2 = (wall.gridX + wall.gridY) % 2 === 1;
  return useVariation2 ? [64, 0, 64, 64] : [0, 0, 64, 64];
}
```

**Key change:** Check `wall.type` instead of `tile.type` for texture selection.

#### Rendering Priority Order

**Updated priority** (high to low):
1. **Stairs walls** (`stairs_up`, `stairs_down`) - Check wall type first
2. **Door walls** (`door`, `locked_door`) - Check wall type
3. **Secret doors** (`secret`) - Render as normal wall
4. **Illusion walls** (`illusion`) - Render as normal wall
5. **Regular walls** (`wall`) - Checkerboard pattern based on position

---

### 5. Edge Cases & Validation

#### Edge Case Handling

**1. Missing destination data:**
- **Prevention:** `validateStairsWalls()` runs at map load time
- **Runtime:** Show error message "The stairs seem to lead nowhere..."
- **Logging:** Console error with tile coordinates

**2. Player somehow standing on stairs tile:**
- **Behavior:** No effect when standing on tile (tile has no type)
- **Trigger:** Only fires when walking INTO the stairs wall
- **Rationale:** Prevents double-triggering if player spawns on stairs tile

**3. Multiple stairs walls on same tile:**
- **Current design:** Single `destination` field shared by all walls
- **Behavior:** Whichever stairs wall triggers uses the destination
- **Limitation:** Cannot have north=stairs_up AND south=stairs_down with different destinations
- **Future enhancement:** Introduce `wallDestinations` map (out of scope for now)
- **Recommendation:** Avoid multiple stairs walls per tile in level design

**4. Invalid destination data:**
- **Example:** `destination: { type: 'invalid' }`
- **Handling:** Error message + console.error, no transition occurs
- **Prevention:** Map validation should catch schema violations

**5. Player tries door-kicking on stairs:**
- **N/A:** Stairs walls are passable (not blockable)
- **Door kick command:** Only works on `door` type walls
- **No conflict:** Stairs don't need kicking

**6. Save/load with stairs:**
- **Save:** Party position in dungeon is saved (current level + x, y, facing)
- **Load:** Player resumes at saved position
- **Edge case:** If saved on stairs tile, player standing there doesn't trigger stairs
- **Intentional:** Must walk into wall to trigger

---

## Testing Strategy

### Test Coverage Requirements

**Minimum coverage:** 90% for all modified services (DungeonService, NavigationService, WebGLRenderingService)

#### 1. Type System Tests

**File:** `src/types/__tests__/Dungeon.spec.ts`

```typescript
describe('WallType', () => {
  it('includes stairs_up and stairs_down', () => {
    const validTypes: WallType[] = ['stairs_up', 'stairs_down'];
    // Type check compilation test
  });
});

describe('MovementValidation', () => {
  it('includes triggersSpecialAction field', () => {
    const validation: MovementValidation = {
      allowed: true,
      triggersSpecialAction: 'stairs',
      destination: { type: 'castle' }
    };
    expect(validation.triggersSpecialAction).toBe('stairs');
  });
});
```

#### 2. DungeonService Tests

**File:** `src/services/__tests__/DungeonService.spec.ts`

```typescript
describe('canMove with stairs walls', () => {
  it('allows movement through stairs_up wall', () => {
    const level = createTestLevel();
    const tile = createTestTile({
      x: 0, y: 0,
      walls: { north: 'stairs_up' },
      destination: { type: 'castle' }
    });

    const result = DungeonService.canMove(level, { x: 0, y: 1, facing: 'north' }, 'forward');

    expect(result.allowed).toBe(true);
    expect(result.triggersSpecialAction).toBe('stairs');
    expect(result.destination?.type).toBe('castle');
  });

  it('allows movement through stairs_down wall', () => {
    const tile = createTestTile({
      walls: { south: 'stairs_down' },
      destination: { level: 2, x: 10, y: 5, facing: 'south' }
    });

    const result = DungeonService.canMove(level, { x: 0, y: 0, facing: 'south' }, 'forward');

    expect(result.allowed).toBe(true);
    expect(result.triggersSpecialAction).toBe('stairs');
    expect(result.destination?.level).toBe(2);
  });

  it('passes destination data through validation result', () => {
    const destination = { level: 3, x: 5, y: 10 };
    const tile = createTestTile({
      walls: { east: 'stairs_down' },
      destination
    });

    const result = DungeonService.canMove(level, position, 'right');

    expect(result.destination).toEqual(destination);
  });
});

describe('validateStairsWalls', () => {
  it('returns no errors when stairs walls have valid destinations', () => {
    const level = createTestLevel([
      { walls: { west: 'stairs_up' }, destination: { type: 'castle' } },
      { walls: { south: 'stairs_down' }, destination: { level: 2 } }
    ]);

    const errors = DungeonService.validateStairsWalls(level);
    expect(errors).toHaveLength(0);
  });

  it('detects missing destination on stairs_up wall', () => {
    const level = createTestLevel([
      { x: 0, y: 0, walls: { west: 'stairs_up' } }  // Missing destination
    ]);

    const errors = DungeonService.validateStairsWalls(level);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('(0, 0)');
    expect(errors[0]).toContain('no destination');
  });

  it('detects missing destination on stairs_down wall', () => {
    const level = createTestLevel([
      { x: 5, y: 10, walls: { north: 'stairs_down' } }  // Missing destination
    ]);

    const errors = DungeonService.validateStairsWalls(level);
    expect(errors).toContain('Tile (5, 10) has stairs wall but no destination');
  });

  it('allows normal tiles without stairs walls to have no destination', () => {
    const level = createTestLevel([
      { walls: { north: 'wall', south: 'open' } }  // No stairs, no destination = valid
    ]);

    const errors = DungeonService.validateStairsWalls(level);
    expect(errors).toHaveLength(0);
  });
});
```

#### 3. NavigationService Tests

**File:** `src/services/__tests__/NavigationService.spec.ts`

```typescript
describe('handleStairsTransition', () => {
  let service: NavigationService;

  beforeEach(() => {
    service = new NavigationService();
  });

  it('transitions to castle when stairs_up triggered', () => {
    const spy = jest.spyOn(SceneNavigationService, 'transitionTo');

    service.handleStairsTransition({ type: 'castle' });

    expect(spy).toHaveBeenCalledWith(SceneType.CASTLE_MENU, {
      saveBeforeTransition: true,
      message: 'You climb the stairs back to the castle.'
    });
  });

  it('transitions to next level when stairs_down triggered', () => {
    const spy = jest.spyOn(service, 'transitionToLevel');

    service.handleStairsTransition({ level: 2, x: 10, y: 5, facing: 'north' });

    expect(spy).toHaveBeenCalledWith(2, 10, 5, 'north');
  });

  it('uses current facing when destination.facing not specified', () => {
    service.currentPosition = { x: 0, y: 0, facing: 'east' };
    const spy = jest.spyOn(service, 'transitionToLevel');

    service.handleStairsTransition({ level: 2, x: 10, y: 5 });

    expect(spy).toHaveBeenCalledWith(2, 10, 5, 'east');
  });

  it('shows error message when destination is undefined', () => {
    const spy = jest.spyOn(service, 'showMessage');

    service.handleStairsTransition(undefined);

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('nowhere'));
  });

  it('shows error message when destination is invalid', () => {
    const spy = jest.spyOn(service, 'showMessage');

    service.handleStairsTransition({} as TileDestination);  // Invalid: no type or level

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('nowhere'));
  });

  it('logs console error for missing destination', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation();

    service.handleStairsTransition(undefined);

    expect(spy).toHaveBeenCalledWith('Stairs wall has no destination data');
    spy.mockRestore();
  });
});

describe('moveForward with stairs walls', () => {
  it('triggers stairs transition instead of moving position', () => {
    // Setup: player at (0, 1) facing north, (0, 0) has stairs_up on north wall
    const level = createTestLevel([
      { x: 0, y: 0, walls: { south: 'stairs_up' }, destination: { type: 'castle' } }
    ]);
    service.loadLevel(level);
    service.setPosition({ x: 0, y: 1, facing: 'north' });

    const transitionSpy = jest.spyOn(service, 'handleStairsTransition');
    const positionSpy = jest.spyOn(service, 'updatePosition');

    service.moveForward();

    expect(transitionSpy).toHaveBeenCalledWith({ type: 'castle' });
    expect(positionSpy).not.toHaveBeenCalled();  // Should NOT update position
  });

  it('does not trigger tile effects when stairs wall hit', () => {
    const level = createTestLevel([
      { x: 0, y: 0, walls: { south: 'stairs_down' }, destination: { level: 2 } }
    ]);
    service.loadLevel(level);
    service.setPosition({ x: 0, y: 1, facing: 'north' });

    const tileEffectsSpy = jest.spyOn(service, 'checkTileEffects');

    service.moveForward();

    expect(tileEffectsSpy).not.toHaveBeenCalled();
  });

  it('still checks tile effects for normal movement', () => {
    const level = createTestLevel([
      { x: 0, y: 0, walls: { south: 'open' } }  // Normal open wall
    ]);
    service.loadLevel(level);
    service.setPosition({ x: 0, y: 1, facing: 'north' });

    const tileEffectsSpy = jest.spyOn(service, 'checkTileEffects');

    service.moveForward();

    expect(tileEffectsSpy).toHaveBeenCalled();
  });
});
```

#### 4. WebGLRenderingService Tests

**File:** `src/services/__tests__/WebGLRenderingService.spec.ts`

```typescript
describe('selectWallTexture with stairs walls', () => {
  let service: WebGLRenderingService;
  let level: LevelData;

  beforeEach(() => {
    service = new WebGLRenderingService();
    level = createTestLevel();
  });

  it('returns stairs_up texture coordinates for stairs_up wall', () => {
    const wall: WallSegment = { gridX: 0, gridY: 0, side: 'west' };
    const tile = createTestTile({
      x: 0, y: 0,
      walls: { west: 'stairs_up' }
    });
    jest.spyOn(DungeonService, 'getTile').mockReturnValue(tile);

    const coords = service.selectWallTexture(level, wall);

    expect(coords).toEqual([256, 0, 64, 64]);  // stairs_up position in atlas
  });

  it('returns stairs_down texture coordinates for stairs_down wall', () => {
    const wall: WallSegment = { gridX: 5, gridY: 10, side: 'south' };
    const tile = createTestTile({
      walls: { south: 'stairs_down' }
    });
    jest.spyOn(DungeonService, 'getTile').mockReturnValue(tile);

    const coords = service.selectWallTexture(level, wall);

    expect(coords).toEqual([128, 0, 64, 64]);  // stairs_down position in atlas
  });

  it('uses correct wall side for texture selection', () => {
    const tile = createTestTile({
      walls: {
        north: 'stairs_up',
        south: 'stairs_down',
        east: 'wall',
        west: 'door'
      }
    });
    jest.spyOn(DungeonService, 'getTile').mockReturnValue(tile);

    // North wall should get stairs_up texture
    const northCoords = service.selectWallTexture(level, { side: 'north' });
    expect(northCoords).toEqual([256, 0, 64, 64]);

    // South wall should get stairs_down texture
    const southCoords = service.selectWallTexture(level, { side: 'south' });
    expect(southCoords).toEqual([128, 0, 64, 64]);

    // East wall should get regular wall texture
    const eastCoords = service.selectWallTexture(level, { side: 'east' });
    expect(eastCoords[0]).toBeOneOf([0, 64]);  // Checkerboard pattern

    // West wall should get door texture
    const westCoords = service.selectWallTexture(level, { side: 'west' });
    expect(westCoords).toEqual([192, 0, 64, 64]);
  });

  it('prioritizes stairs over tile type', () => {
    // Edge case: tile has type='door' but wall is stairs_up
    const tile = createTestTile({
      walls: { north: 'stairs_up' },
      type: 'door'  // Should be ignored
    });
    jest.spyOn(DungeonService, 'getTile').mockReturnValue(tile);

    const coords = service.selectWallTexture(level, { side: 'north' });

    expect(coords).toEqual([256, 0, 64, 64]);  // stairs_up, NOT door
  });
});
```

#### 5. Integration Tests

**File:** `src/services/__tests__/stairs-integration.spec.ts`

```typescript
describe('Stairs Integration Tests', () => {
  it('complete stairs_up journey: dungeon → castle', async () => {
    // Setup: Player in dungeon at (0, 1) facing north
    const gameState = createTestGameState();
    const level = createTestLevel([
      { x: 0, y: 0, walls: { south: 'stairs_up' }, destination: { type: 'castle' } }
    ]);

    const navigation = new NavigationService();
    navigation.loadLevel(level);
    navigation.setPosition({ x: 0, y: 1, facing: 'north' });

    const sceneTransitionSpy = jest.spyOn(SceneNavigationService, 'transitionTo');
    const saveSpy = jest.spyOn(SaveService, 'saveGame');

    // Player presses forward
    navigation.moveForward();

    // Verify scene transition to castle
    expect(sceneTransitionSpy).toHaveBeenCalledWith(
      SceneType.CASTLE_MENU,
      expect.objectContaining({ saveBeforeTransition: true })
    );

    // Verify game state was saved
    expect(saveSpy).toHaveBeenCalled();

    // Verify player position did NOT update (transition handles it)
    expect(navigation.currentPosition).toEqual({ x: 0, y: 1, facing: 'north' });
  });

  it('complete stairs_down journey: level 1 → level 2', async () => {
    // Setup: Player at (10, 15) facing south, stairs_down ahead
    const level1 = createTestLevel([
      { x: 10, y: 14, walls: { north: 'stairs_down' }, destination: { level: 2, x: 5, y: 5, facing: 'south' } }
    ]);
    const level2 = createTestLevel([]);  // Level 2 data

    const navigation = new NavigationService();
    navigation.loadLevel(level1);
    navigation.setPosition({ x: 10, y: 15, facing: 'north' });

    const loadLevelSpy = jest.spyOn(navigation, 'transitionToLevel');
    const saveSpy = jest.spyOn(SaveService, 'saveGame');

    // Player presses forward
    navigation.moveForward();

    // Verify level transition
    expect(loadLevelSpy).toHaveBeenCalledWith(2, 5, 5, 'south');

    // Verify NO auto-save (still in dungeon)
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('handles stairs wall in all four directions', async () => {
    // Test tile with stairs on different walls
    const level = createTestLevel([
      // Center tile (5, 5) with stairs on all walls
      {
        x: 5, y: 5,
        walls: {
          north: 'stairs_up',
          south: 'stairs_down',
          east: 'wall',
          west: 'wall'
        },
        destination: { type: 'castle' }
      }
    ]);

    const navigation = new NavigationService();
    navigation.loadLevel(level);

    // Test from south (walking north into stairs_up)
    navigation.setPosition({ x: 5, y: 6, facing: 'north' });
    const transitionSpy = jest.spyOn(navigation, 'handleStairsTransition');
    navigation.moveForward();
    expect(transitionSpy).toHaveBeenCalledWith({ type: 'castle' });

    // Reset
    transitionSpy.mockClear();

    // Test from north (walking south into stairs_down)
    navigation.setPosition({ x: 5, y: 4, facing: 'south' });
    navigation.moveForward();
    expect(transitionSpy).toHaveBeenCalledWith({ type: 'castle' });  // Same destination
  });

  it('validates all stairs walls in level at load time', () => {
    const invalidLevel = createTestLevel([
      { x: 0, y: 0, walls: { west: 'stairs_up' } },  // Missing destination - ERROR
      { x: 5, y: 5, walls: { north: 'stairs_down' }, destination: { level: 2 } },  // Valid
      { x: 10, y: 10, walls: { east: 'stairs_up' } }  // Missing destination - ERROR
    ]);

    const errors = DungeonService.validateStairsWalls(invalidLevel);

    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain('(0, 0)');
    expect(errors[1]).toContain('(10, 10)');
  });
});
```

---

## Implementation Plan

### Phase 1: Type System & Data Model (1-2 hours)

**Tasks:**
- [ ] Update `WallType` type in `src/types/Dungeon.ts`
- [ ] Verify `TileDestination` interface supports stairs use cases
- [ ] Update `MovementValidation` interface with new fields
- [ ] Update `data/maps/level1.json` tile (0,0) as example
- [ ] Write type system tests
- [ ] Run tests: `npm test -- Dungeon.spec`

**Files modified:**
- `src/types/Dungeon.ts`
- `data/maps/level1.json`
- `src/types/__tests__/Dungeon.spec.ts` (new)

**Verification:** Type checks pass, no TypeScript errors

---

### Phase 2: Movement Logic (2-3 hours)

**Tasks:**
- [ ] Update `DungeonService.canMove()` to handle stairs walls
- [ ] Add `DungeonService.validateStairsWalls()` method
- [ ] Update `NavigationService.moveForward()` to check special actions
- [ ] Implement `NavigationService.handleStairsTransition()` method
- [ ] Write DungeonService tests
- [ ] Write NavigationService tests
- [ ] Run tests: `npm test -- DungeonService.spec NavigationService.spec`

**Files modified:**
- `src/services/DungeonService.ts`
- `src/services/NavigationService.ts`
- `src/services/__tests__/DungeonService.spec.ts`
- `src/services/__tests__/NavigationService.spec.ts`

**Verification:**
- All movement tests pass
- Validation detects missing destinations
- Stairs transitions trigger correctly

---

### Phase 3: Rendering (3-4 hours)

**Tasks:**
- [ ] Create `stairs_up.png` texture asset (64×64)
- [ ] Add texture to atlas PNG at position (256, 0)
- [ ] Update `data/textures/eob-dungeon-level-01.json` metadata
- [ ] Update `WebGLRenderingService.selectWallTexture()` logic
- [ ] Write rendering tests
- [ ] Visual test: Verify stairs textures render correctly in-game
- [ ] Run tests: `npm test -- WebGLRenderingService.spec`

**Files modified:**
- `data/textures/eob-dungeon-level-01.png` (atlas image)
- `data/textures/eob-dungeon-level-01.json` (atlas metadata)
- `src/services/WebGLRenderingService.ts`
- `src/services/__tests__/WebGLRenderingService.spec.ts`

**Asset creation:**
- Tool: GIMP, Photoshop, or Aseprite
- Reference: Existing `stairs_down` texture at (128, 0)
- Style: Match Eye of the Beholder aesthetic
- Export: PNG with transparency

**Verification:**
- Stairs_up texture renders at correct atlas position
- Different textures appear for up vs down stairs
- No visual glitches or texture bleeding

---

### Phase 4: Integration & Polish (2-3 hours)

**Tasks:**
- [ ] Write integration tests for full stairs journeys
- [ ] Update all level maps (level1.json through level10.json) with stairs wall types
- [ ] Add flavor text messages for transitions
- [ ] Performance test: Ensure no rendering regression
- [ ] Manual playtesting: Walk through all stairs in game
- [ ] Update `docs/systems/dungeon-navigation.md` documentation
- [ ] Run full test suite: `npm test`
- [ ] Run build: `npm run build`

**Files modified:**
- `data/maps/level1.json` through `level10.json`
- `src/services/__tests__/stairs-integration.spec.ts` (new)
- `docs/systems/dungeon-navigation.md`

**Verification:**
- All 501+ tests pass (including new stairs tests)
- Build succeeds with no errors
- Performance: Rendering maintains 60 FPS
- Coverage: >90% on modified services

---

### Phase 5: Documentation & Cleanup (1 hour)

**Tasks:**
- [ ] Update CHANGELOG.md with feature description
- [ ] Add implementation notes to this design doc
- [ ] Create visual diagram of stairs interaction flow
- [ ] Code review: Check for TODOs and debug code
- [ ] Final test run: `npm test -- --coverage`

**Files modified:**
- `CHANGELOG.md`
- `docs/plans/2025-11-17-stairs-wall-texture-design.md` (this file)

**Deliverables:**
- Updated design doc with "Implemented" status
- Code coverage report showing >90% on modified services
- Clean git history with atomic commits

---

## Estimated Total Time

**Total:** 9-13 hours (1-2 days of development)

**Breakdown:**
- Phase 1: 1-2 hours (types & data)
- Phase 2: 2-3 hours (movement logic)
- Phase 3: 3-4 hours (rendering + asset creation)
- Phase 4: 2-3 hours (integration & testing)
- Phase 5: 1 hour (documentation)

---

## Success Criteria

### Functional Requirements

✅ **FR1:** Stairs textures render on walls (not just tile types)
✅ **FR2:** Distinct visuals for stairs_up vs stairs_down
✅ **FR3:** Walking into stairs wall triggers immediate transition
✅ **FR4:** Stairs_up returns to castle with auto-save
✅ **FR5:** Stairs_down transitions to next level without auto-save
✅ **FR6:** Destination data stored on tiles (reuse TileDestination)
✅ **FR7:** Map validation detects missing destinations at load time

### Non-Functional Requirements

✅ **NFR1:** Test coverage >90% on modified services
✅ **NFR2:** No performance regression (maintain 60 FPS)
✅ **NFR3:** All existing tests continue to pass
✅ **NFR4:** Code follows existing architectural patterns
✅ **NFR5:** Documentation updated to reflect changes

### Visual Requirements

✅ **VR1:** Stairs_up texture clearly indicates upward direction
✅ **VR2:** Stairs_down texture clearly indicates downward direction
✅ **VR3:** Textures match Eye of the Beholder aesthetic
✅ **VR4:** No texture bleeding or rendering artifacts

---

## Risks & Mitigations

### Risk 1: Texture Quality

**Risk:** Created stairs_up texture looks out of place or low quality
**Likelihood:** Medium
**Impact:** Medium (visual polish issue)
**Mitigation:**
- Use existing stairs_down as reference for style
- Get feedback early (after Phase 3 visual test)
- Iterate on texture before finalizing

### Risk 2: Multiple Stairs Per Tile

**Risk:** Players confused when tile has multiple stairs walls pointing to same destination
**Likelihood:** Low (avoid in level design)
**Impact:** Low (minor UX issue)
**Mitigation:**
- Document guideline: avoid multiple stairs per tile
- Map validation warns if detected
- Future enhancement: support wall-specific destinations

### Risk 3: Breaking Existing Tests

**Risk:** Changes to DungeonService.canMove() break existing movement tests
**Likelihood:** Medium
**Impact:** Medium (delays implementation)
**Mitigation:**
- TDD approach: write tests first
- Run test suite after each phase
- Use feature flag during development (optional)

### Risk 4: Save/Load Compatibility

**Risk:** Existing save files break with new data model
**Likelihood:** Low (additive changes only)
**Impact:** High (player frustration)
**Mitigation:**
- Changes are backward compatible (no removed fields)
- SaveService already handles missing fields gracefully
- Test loading old saves with new code

---

## Future Enhancements (Out of Scope)

### Wall-Specific Destinations

**Current limitation:** Single `destination` per tile shared by all stairs walls

**Enhancement:** Introduce `wallDestinations` mapping:
```json
{
  "walls": {
    "north": "stairs_up",
    "south": "stairs_down"
  },
  "wallDestinations": {
    "north": { "type": "castle" },
    "south": { "level": 2, "x": 5, "y": 5 }
  }
}
```

**Benefit:** Supports complex tile designs with multiple exits
**Complexity:** Moderate (requires data migration)

### Secret Stairs

**Feature:** Stairs hidden until discovered (render as normal wall)

**Implementation:**
- Add `secret_stairs_up` and `secret_stairs_down` wall types
- Track discovered secret walls in `DungeonState.discoveredSecrets`
- Render as normal wall until discovered, then show stairs texture

**Benefit:** Additional puzzle mechanic
**Complexity:** Low (follows existing secret door pattern)

### Animated Stairs

**Feature:** Subtle animation on stairs textures (flickering torches, moving shadows)

**Implementation:**
- Multi-frame texture atlas
- Frame cycling in WebGL renderer
- Performance impact: minimal (pre-rendered frames)

**Benefit:** Enhanced visual appeal
**Complexity:** Medium (requires animation asset creation)

### Sound Effects

**Feature:** Different sounds for stairs_up vs stairs_down

**Implementation:**
- Add audio files: `stairs_up.mp3`, `stairs_down.mp3`
- Play in `handleStairsTransition()` based on destination type

**Benefit:** Audio feedback for player actions
**Complexity:** Low (existing audio system)

---

## Open Questions

### Q1: Should stairs be blockable by monsters?

**Context:** If monster stands on tile with stairs wall, can player use stairs?

**Options:**
- A: Monsters block stairs (must defeat first)
- B: Stairs usable even with monsters present
- C: Trigger combat, then allow stairs after victory

**Recommendation:** Option A (monsters block) - more strategic, prevents escape exploits

**Status:** Deferred to combat system implementation

### Q2: Should there be a confirmation prompt for stairs?

**Context:** Prevent accidental transitions when exploring

**Options:**
- A: No prompt, immediate transition (current design)
- B: Prompt: "Climb the stairs? (Y/N)"
- C: Configurable in settings

**Recommendation:** Option A for now - matches original Wizardry immediacy

**Status:** Can add in future if players request

### Q3: Should stairs_down always go to next sequential level?

**Context:** Or allow arbitrary level jumps (e.g., level 2 → level 5)?

**Options:**
- A: Sequential only (level N → level N+1)
- B: Arbitrary jumps allowed (destination.level can be any value)

**Recommendation:** Option B (current design) - more flexible for future level designs

**Status:** Resolved - allowing arbitrary destinations

---

## Appendix: File Change Summary

### New Files
- `src/types/__tests__/Dungeon.spec.ts` - Type system tests
- `src/services/__tests__/stairs-integration.spec.ts` - Integration tests
- `data/textures/stairs_up.png` - New texture asset (64×64)

### Modified Files
- `src/types/Dungeon.ts` - WallType, MovementValidation updates
- `src/services/DungeonService.ts` - canMove(), validateStairsWalls()
- `src/services/NavigationService.ts` - moveForward(), handleStairsTransition()
- `src/services/WebGLRenderingService.ts` - selectWallTexture()
- `src/services/__tests__/DungeonService.spec.ts` - New tests
- `src/services/__tests__/NavigationService.spec.ts` - New tests
- `src/services/__tests__/WebGLRenderingService.spec.ts` - New tests
- `data/textures/eob-dungeon-level-01.json` - Atlas metadata
- `data/textures/eob-dungeon-level-01.png` - Atlas image (add stairs_up)
- `data/maps/level1.json` through `level10.json` - Stairs wall types
- `docs/systems/dungeon-navigation.md` - Documentation update
- `CHANGELOG.md` - Feature notes

### Test Files Count
- **3 new test files**
- **3 modified test files**
- **Estimated +200 lines of test code**

---

## Conclusion

This design provides a clean, flexible solution for rendering stairs as wall textures while maintaining architectural consistency with the existing codebase. Key benefits:

1. **Visual clarity:** Players immediately see where stairs are located
2. **Immediate interaction:** Matches Wizardry's fast-paced dungeon crawling
3. **Architectural consistency:** Reuses existing patterns (TileDestination, MovementValidation)
4. **Future-proof:** Supports arbitrary destinations, not hardcoded conventions
5. **Well-tested:** Comprehensive test coverage ensures reliability

The implementation follows TDD principles, maintains >90% test coverage, and integrates seamlessly with the existing four-layer clean architecture.

**Next steps:** Proceed with Phase 1 implementation (Type System & Data Model).
