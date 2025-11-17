# Stairs Wall Texture Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement stairs as wall types with distinct textures and immediate transition behavior.

**Architecture:** Extend WallType enum to include stairs, update movement validation to trigger transitions before position updates, modify WebGL renderer to select textures based on wall type instead of tile type.

**Tech Stack:** TypeScript, Angular, Jest, WebGL, JSON (map data)

**Related Design Doc:** `docs/plans/2025-11-17-stairs-wall-texture-design.md`

---

## Phase 1: Type System & Data Model

### Task 1.1: Update WallType Enum

**Files:**
- Modify: `src/types/Dungeon.ts:4-20`

**Step 1: Add stairs types to WallType**

Update the WallType definition to include stairs:

```typescript
type WallType =
  | 'open'
  | 'wall'
  | 'door'
  | 'secret'
  | 'locked_door'
  | 'illusion'
  | 'stairs_up'      // NEW
  | 'stairs_down';   // NEW
```

**Step 2: Verify TypeScript compilation**

Run: `npm run build`
Expected: BUILD SUCCESSFUL (no type errors)

**Step 3: Commit**

```bash
git add src/types/Dungeon.ts
git commit -m "feat: add stairs_up and stairs_down to WallType enum"
```

---

### Task 1.2: Update MovementValidation Interface

**Files:**
- Modify: `src/types/Dungeon.ts` (find MovementValidation interface)

**Step 1: Locate MovementValidation interface**

Search for the interface definition (should be in Dungeon.ts or a related types file).

**Step 2: Add new optional fields**

```typescript
interface MovementValidation {
  allowed: boolean;
  reason?: string;
  triggersSpecialAction?: 'stairs' | 'teleporter' | 'pit' | 'chute';  // NEW
  destination?: TileDestination;  // NEW
}
```

**Step 3: Verify TypeScript compilation**

Run: `npm run build`
Expected: BUILD SUCCESSFUL

**Step 4: Commit**

```bash
git add src/types/Dungeon.ts
git commit -m "feat: extend MovementValidation with triggersSpecialAction and destination"
```

---

### Task 1.3: Update Level 1 Map Data Example

**Files:**
- Modify: `data/maps/level1.json:17-30`

**Step 1: Update tile at (0,0) with stairs_up wall**

Modify the tile at position (0,0):

```json
{
  "x": 0,
  "y": 0,
  "walls": {
    "north": "open",
    "east": "open",
    "south": "wall",
    "west": "stairs_up"
  },
  "destination": {
    "type": "castle"
  }
}
```

**Key changes:**
- `walls.west` changed from `"wall"` to `"stairs_up"`
- Removed `"type": "stairs_up"` field from tile (tile is now implicitly normal)
- Kept `destination` field (required for stairs walls)

**Step 2: Verify JSON is valid**

Run: `npm run build`
Expected: No JSON parsing errors

**Step 3: Commit**

```bash
git add data/maps/level1.json
git commit -m "feat: convert level1 (0,0) stairs to wall-based system"
```

---

## Phase 2: Movement Logic

### Task 2.1: Update DungeonService.canMove() for Stairs Walls

**Files:**
- Modify: `src/services/DungeonService.ts` (find canMove method)
- Test: `src/services/__tests__/DungeonService.spec.ts`

**Step 1: Write failing tests for stairs wall movement**

Create or update `src/services/__tests__/DungeonService.spec.ts`:

```typescript
describe('DungeonService', () => {
  describe('canMove', () => {
    describe('with stairs walls', () => {
      it('allows movement through stairs_up wall and marks special action', () => {
        const level = createTestLevel();
        const tile: TileData = {
          x: 0,
          y: 0,
          walls: {
            north: 'open',
            south: 'stairs_up',
            east: 'open',
            west: 'wall'
          },
          destination: { type: 'castle' }
        };

        // Mock getTile to return our test tile
        jest.spyOn(DungeonService, 'getTile').mockReturnValue(tile);

        const position = { x: 0, y: 1, facing: 'north' as Direction };
        const result = DungeonService.canMove(level, position, 'forward');

        expect(result.allowed).toBe(true);
        expect(result.triggersSpecialAction).toBe('stairs');
        expect(result.destination).toEqual({ type: 'castle' });
      });

      it('allows movement through stairs_down wall and passes destination', () => {
        const tile: TileData = {
          x: 5,
          y: 10,
          walls: {
            north: 'stairs_down',
            south: 'wall',
            east: 'wall',
            west: 'wall'
          },
          destination: { level: 2, x: 10, y: 5, facing: 'south' }
        };

        jest.spyOn(DungeonService, 'getTile').mockReturnValue(tile);

        const position = { x: 5, y: 11, facing: 'north' as Direction };
        const result = DungeonService.canMove(level, position, 'forward');

        expect(result.allowed).toBe(true);
        expect(result.triggersSpecialAction).toBe('stairs');
        expect(result.destination?.level).toBe(2);
        expect(result.destination?.x).toBe(10);
        expect(result.destination?.y).toBe(5);
      });

      it('still blocks regular wall types', () => {
        const tile: TileData = {
          x: 0,
          y: 0,
          walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' }
        };

        jest.spyOn(DungeonService, 'getTile').mockReturnValue(tile);

        const position = { x: 0, y: 1, facing: 'north' as Direction };
        const result = DungeonService.canMove(level, position, 'forward');

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('wall');
      });
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- DungeonService.spec`
Expected: FAIL - "Property 'triggersSpecialAction' does not exist" or similar

**Step 3: Update canMove() implementation**

Find the `canMove` method in `src/services/DungeonService.ts` and add stairs handling:

```typescript
canMove(level: LevelData, position: Position, moveDirection: MoveDirection): MovementValidation {
  const tile = this.getTile(level, position.x, position.y);
  const wallDirection = this.getWallDirectionForMovement(position.facing, moveDirection);
  const wallType = tile.walls[wallDirection];

  // Block solid walls
  if (wallType === 'wall') {
    return { allowed: false, reason: 'You walk into a wall. Ouch!' };
  }

  // Block doors (requires kicking)
  if (wallType === 'door' || wallType === 'locked_door') {
    return { allowed: false, reason: 'A door blocks your way. Press K to kick it open.' };
  }

  // Block secret doors (appear as walls)
  if (wallType === 'secret') {
    return { allowed: false, reason: 'You walk into a wall. Ouch!' };
  }

  // NEW: Allow passage through stairs walls and trigger special action
  if (wallType === 'stairs_up' || wallType === 'stairs_down') {
    return {
      allowed: true,
      triggersSpecialAction: 'stairs',
      destination: tile.destination
    };
  }

  // Allow passage through illusions and open spaces
  if (wallType === 'illusion') {
    return { allowed: true };
  }

  return { allowed: true };
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- DungeonService.spec`
Expected: PASS (all stairs wall tests green)

**Step 5: Commit**

```bash
git add src/services/DungeonService.ts src/services/__tests__/DungeonService.spec.ts
git commit -m "feat: add stairs wall handling to canMove with special action trigger"
```

---

### Task 2.2: Add Map Validation for Stairs Walls

**Files:**
- Modify: `src/services/DungeonService.ts`
- Test: `src/services/__tests__/DungeonService.spec.ts`

**Step 1: Write failing test for validation**

Add to `src/services/__tests__/DungeonService.spec.ts`:

```typescript
describe('DungeonService', () => {
  describe('validateStairsWalls', () => {
    it('returns no errors when stairs walls have valid destinations', () => {
      const level: LevelData = {
        level: 1,
        name: 'Test Level',
        size: { width: 20, height: 20 },
        tiles: [
          {
            x: 0,
            y: 0,
            walls: { north: 'open', south: 'wall', east: 'open', west: 'stairs_up' },
            destination: { type: 'castle' }
          },
          {
            x: 5,
            y: 5,
            walls: { north: 'stairs_down', south: 'wall', east: 'wall', west: 'wall' },
            destination: { level: 2, x: 10, y: 10 }
          }
        ]
      };

      const errors = DungeonService.validateStairsWalls(level);
      expect(errors).toHaveLength(0);
    });

    it('detects missing destination on stairs_up wall', () => {
      const level: LevelData = {
        level: 1,
        name: 'Test Level',
        size: { width: 20, height: 20 },
        tiles: [
          {
            x: 0,
            y: 0,
            walls: { north: 'open', south: 'wall', east: 'open', west: 'stairs_up' }
            // Missing destination field
          }
        ]
      };

      const errors = DungeonService.validateStairsWalls(level);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('(0, 0)');
      expect(errors[0]).toContain('no destination');
    });

    it('detects missing destination on stairs_down wall', () => {
      const level: LevelData = {
        level: 1,
        name: 'Test Level',
        size: { width: 20, height: 20 },
        tiles: [
          {
            x: 10,
            y: 15,
            walls: { north: 'wall', south: 'stairs_down', east: 'wall', west: 'wall' }
            // Missing destination field
          }
        ]
      };

      const errors = DungeonService.validateStairsWalls(level);
      expect(errors).toContain('Tile (10, 15) has stairs wall but no destination');
    });

    it('allows normal tiles without stairs to have no destination', () => {
      const level: LevelData = {
        level: 1,
        name: 'Test Level',
        size: { width: 20, height: 20 },
        tiles: [
          {
            x: 0,
            y: 0,
            walls: { north: 'wall', south: 'open', east: 'door', west: 'illusion' }
            // No stairs, no destination = valid
          }
        ]
      };

      const errors = DungeonService.validateStairsWalls(level);
      expect(errors).toHaveLength(0);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- DungeonService.spec`
Expected: FAIL - "validateStairsWalls is not a function"

**Step 3: Implement validateStairsWalls method**

Add to `src/services/DungeonService.ts`:

```typescript
validateStairsWalls(level: LevelData): string[] {
  const errors: string[] = [];

  for (const tile of level.tiles) {
    // Check if any wall on this tile is a stairs type
    const hasStairsWall = Object.values(tile.walls).some(
      wallType => wallType === 'stairs_up' || wallType === 'stairs_down'
    );

    // If has stairs wall but no destination, that's an error
    if (hasStairsWall && !tile.destination) {
      errors.push(`Tile (${tile.x}, ${tile.y}) has stairs wall but no destination`);
    }
  }

  return errors;
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- DungeonService.spec`
Expected: PASS (all validation tests green)

**Step 5: Commit**

```bash
git add src/services/DungeonService.ts src/services/__tests__/DungeonService.spec.ts
git commit -m "feat: add validateStairsWalls to detect missing destinations"
```

---

### Task 2.3: Update NavigationService to Handle Stairs Transitions

**Files:**
- Modify: `src/services/NavigationService.ts`
- Test: `src/services/__tests__/NavigationService.spec.ts`

**Step 1: Write failing test for handleStairsTransition**

Create or update `src/services/__tests__/NavigationService.spec.ts`:

```typescript
describe('NavigationService', () => {
  describe('handleStairsTransition', () => {
    let service: NavigationService;
    let sceneTransitionSpy: jest.SpyInstance;
    let transitionToLevelSpy: jest.SpyInstance;
    let showMessageSpy: jest.SpyInstance;

    beforeEach(() => {
      service = new NavigationService();
      sceneTransitionSpy = jest.spyOn(SceneNavigationService, 'transitionTo').mockImplementation();
      transitionToLevelSpy = jest.spyOn(service as any, 'transitionToLevel').mockImplementation();
      showMessageSpy = jest.spyOn(service as any, 'showMessage').mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('transitions to castle when destination type is castle', () => {
      const destination: TileDestination = { type: 'castle' };

      service.handleStairsTransition(destination);

      expect(sceneTransitionSpy).toHaveBeenCalledWith(
        SceneType.CASTLE_MENU,
        expect.objectContaining({
          saveBeforeTransition: true,
          message: expect.stringContaining('castle')
        })
      );
    });

    it('transitions to next level when destination has level number', () => {
      const destination: TileDestination = {
        level: 2,
        x: 10,
        y: 5,
        facing: 'south'
      };

      service.handleStairsTransition(destination);

      expect(transitionToLevelSpy).toHaveBeenCalledWith(2, 10, 5, 'south');
    });

    it('uses current facing when destination facing not specified', () => {
      (service as any).currentPosition = { x: 0, y: 0, facing: 'east' };
      const destination: TileDestination = { level: 3, x: 5, y: 5 };

      service.handleStairsTransition(destination);

      expect(transitionToLevelSpy).toHaveBeenCalledWith(3, 5, 5, 'east');
    });

    it('shows error when destination is undefined', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      service.handleStairsTransition(undefined);

      expect(showMessageSpy).toHaveBeenCalledWith(expect.stringContaining('nowhere'));
      expect(consoleErrorSpy).toHaveBeenCalledWith('Stairs wall has no destination data');

      consoleErrorSpy.mockRestore();
    });

    it('shows error when destination is invalid', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const invalidDestination = {} as TileDestination;

      service.handleStairsTransition(invalidDestination);

      expect(showMessageSpy).toHaveBeenCalledWith(expect.stringContaining('nowhere'));
      expect(consoleErrorSpy).toHaveBeenCalledWith('Invalid stairs destination:', invalidDestination);

      consoleErrorSpy.mockRestore();
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- NavigationService.spec`
Expected: FAIL - "handleStairsTransition is not a function"

**Step 3: Implement handleStairsTransition method**

Add to `src/services/NavigationService.ts`:

```typescript
private handleStairsTransition(destination: TileDestination | undefined): void {
  // Validate destination exists
  if (!destination) {
    console.error('Stairs wall has no destination data');
    this.showMessage('The stairs seem to lead nowhere...');
    return;
  }

  // Handle stairs_up (to castle)
  if (destination.type === 'castle') {
    SceneNavigationService.transitionTo(SceneType.CASTLE_MENU, {
      saveBeforeTransition: true,
      message: 'You climb the stairs back to the castle.'
    });
    return;
  }

  // Handle stairs_down (to another level)
  if (destination.level !== undefined) {
    const targetX = destination.x ?? 0;
    const targetY = destination.y ?? 0;
    const targetFacing = destination.facing ?? this.currentPosition.facing;

    this.transitionToLevel(destination.level, targetX, targetY, targetFacing);
    return;
  }

  // Fallback error
  console.error('Invalid stairs destination:', destination);
  this.showMessage('The stairs seem to lead nowhere...');
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- NavigationService.spec`
Expected: PASS (all handleStairsTransition tests green)

**Step 5: Commit**

```bash
git add src/services/NavigationService.ts src/services/__tests__/NavigationService.spec.ts
git commit -m "feat: add handleStairsTransition for castle and level transitions"
```

---

### Task 2.4: Update moveForward to Check Special Actions

**Files:**
- Modify: `src/services/NavigationService.ts`
- Test: `src/services/__tests__/NavigationService.spec.ts`

**Step 1: Write failing test for moveForward with stairs**

Add to `src/services/__tests__/NavigationService.spec.ts`:

```typescript
describe('NavigationService', () => {
  describe('moveForward', () => {
    describe('with stairs walls', () => {
      it('triggers stairs transition instead of updating position', () => {
        const level = createTestLevel();
        const tile: TileData = {
          x: 0,
          y: 0,
          walls: { north: 'open', south: 'stairs_up', east: 'open', west: 'wall' },
          destination: { type: 'castle' }
        };

        jest.spyOn(DungeonService, 'getTile').mockReturnValue(tile);
        jest.spyOn(DungeonService, 'canMove').mockReturnValue({
          allowed: true,
          triggersSpecialAction: 'stairs',
          destination: { type: 'castle' }
        });

        const service = new NavigationService();
        service.loadLevel(level);
        service.setPosition({ x: 0, y: 1, facing: 'north' });

        const handleStairsSpy = jest.spyOn(service as any, 'handleStairsTransition');
        const updatePositionSpy = jest.spyOn(service as any, 'updatePosition');

        service.moveForward();

        expect(handleStairsSpy).toHaveBeenCalledWith({ type: 'castle' });
        expect(updatePositionSpy).not.toHaveBeenCalled();
      });

      it('does not check tile effects when stairs triggered', () => {
        jest.spyOn(DungeonService, 'canMove').mockReturnValue({
          allowed: true,
          triggersSpecialAction: 'stairs',
          destination: { level: 2 }
        });

        const service = new NavigationService();
        const checkTileEffectsSpy = jest.spyOn(service as any, 'checkTileEffects');

        service.moveForward();

        expect(checkTileEffectsSpy).not.toHaveBeenCalled();
      });

      it('still checks tile effects for normal movement', () => {
        jest.spyOn(DungeonService, 'canMove').mockReturnValue({
          allowed: true
          // No triggersSpecialAction
        });

        const service = new NavigationService();
        const checkTileEffectsSpy = jest.spyOn(service as any, 'checkTileEffects');

        service.moveForward();

        expect(checkTileEffectsSpy).toHaveBeenCalled();
      });
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- NavigationService.spec`
Expected: FAIL - Tests fail because moveForward doesn't check triggersSpecialAction

**Step 3: Update moveForward implementation**

Find the `moveForward` method in `src/services/NavigationService.ts` and update it:

```typescript
moveForward(): void {
  const validation = DungeonService.canMove(
    this.currentLevel,
    this.currentPosition,
    'forward'
  );

  // Block movement if not allowed
  if (!validation.allowed) {
    this.showMessage(validation.reason || 'Cannot move in that direction.');
    this.playSound('bump');
    return;
  }

  // NEW: Check for special wall actions BEFORE moving
  if (validation.triggersSpecialAction === 'stairs') {
    this.handleStairsTransition(validation.destination);
    return;  // Don't update position - transition handles it
  }

  // Calculate new position
  const newPosition = this.calculateNewPosition(this.currentPosition, 'forward');

  // Update position
  this.updatePosition(newPosition.x, newPosition.y);

  // Check for tile-based effects AFTER landing
  this.checkTileEffects();
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- NavigationService.spec`
Expected: PASS (all moveForward tests green)

**Step 5: Commit**

```bash
git add src/services/NavigationService.ts src/services/__tests__/NavigationService.spec.ts
git commit -m "feat: check for stairs special action before position update in moveForward"
```

---

## Phase 3: Rendering

### Task 3.1: Create Stairs Up Texture Asset

**Files:**
- Create: `data/textures/stairs_up.png` (temporary, will be added to atlas)
- Modify: `data/textures/eob-dungeon-level-01.png` (atlas image)

**Step 1: Create stairs_up texture (64x64 PNG)**

**Instructions for texture creation:**

1. Open the existing atlas: `data/textures/eob-dungeon-level-01.png`
2. Locate the stairs_down texture at position (128, 0)
3. Create a new 64×64 texture with these characteristics:
   - **Direction:** Clear upward steps/angle
   - **Color:** Lighter palette than stairs_down (suggests returning to surface)
   - **Lighting:** Brighter highlights/ambient light
   - **Style:** Match Eye of the Beholder aesthetic
4. Export as `stairs_up.png` (temporary file for reference)

**If no image editor available:** Skip to Step 2 and use placeholder coordinates. Texture can be added later.

**Step 2: Add texture to atlas at position (256, 0)**

Using an image editor (GIMP, Photoshop, Aseprite):
1. Open `data/textures/eob-dungeon-level-01.png`
2. Paste the stairs_up texture at pixel position (256, 0)
3. Save the atlas image

**Step 3: Verify atlas dimensions**

Check that atlas is still 448×128 pixels.

**Step 4: Commit**

```bash
git add data/textures/eob-dungeon-level-01.png
git commit -m "feat: add stairs_up texture to atlas at position (256, 0)"
```

---

### Task 3.2: Update Texture Atlas Metadata

**Files:**
- Modify: `data/textures/eob-dungeon-level-01.json`

**Step 1: Add stairs_up to atlas metadata**

Update `data/textures/eob-dungeon-level-01.json`:

```json
{
  "meta": {
    "image": "eob-dungeon-level-01.png",
    "size": { "w": 448, "h": 128 },
    "scale": "1"
  },
  "frames": {
    "stone_wall_01": {
      "frame": { "x": 0, "y": 0, "w": 64, "h": 64 }
    },
    "stone_wall_02": {
      "frame": { "x": 64, "y": 0, "w": 64, "h": 64 }
    },
    "stairs_down": {
      "frame": { "x": 128, "y": 0, "w": 64, "h": 64 }
    },
    "door_closed": {
      "frame": { "x": 192, "y": 0, "w": 64, "h": 64 }
    },
    "stairs_up": {
      "frame": { "x": 256, "y": 0, "w": 64, "h": 64 }
    },
    "door_open": {
      "frame": { "x": 384, "y": 0, "w": 64, "h": 64 }
    }
  }
}
```

**Step 2: Verify JSON is valid**

Run: `npm run build`
Expected: No JSON parsing errors

**Step 3: Commit**

```bash
git add data/textures/eob-dungeon-level-01.json
git commit -m "feat: add stairs_up metadata to texture atlas"
```

---

### Task 3.3: Update WebGLRenderingService Texture Selection

**Files:**
- Modify: `src/services/WebGLRenderingService.ts:365-395`
- Test: `src/services/__tests__/WebGLRenderingService.spec.ts`

**Step 1: Write failing tests for texture selection**

Create or update `src/services/__tests__/WebGLRenderingService.spec.ts`:

```typescript
describe('WebGLRenderingService', () => {
  describe('selectWallTexture', () => {
    let service: WebGLRenderingService;
    let level: LevelData;

    beforeEach(() => {
      service = new WebGLRenderingService();
      level = createTestLevel();
    });

    describe('stairs walls', () => {
      it('returns stairs_up texture coordinates for stairs_up wall', () => {
        const wall: WallSegment = { gridX: 0, gridY: 0, side: 'west' };
        const tile: TileData = {
          x: 0,
          y: 0,
          walls: { north: 'open', south: 'wall', east: 'open', west: 'stairs_up' }
        };

        jest.spyOn(DungeonService, 'getTile').mockReturnValue(tile);

        const coords = service['selectWallTexture'](level, wall);

        expect(coords).toEqual([256, 0, 64, 64]);
      });

      it('returns stairs_down texture coordinates for stairs_down wall', () => {
        const wall: WallSegment = { gridX: 5, gridY: 10, side: 'south' };
        const tile: TileData = {
          x: 5,
          y: 10,
          walls: { north: 'wall', south: 'stairs_down', east: 'wall', west: 'wall' }
        };

        jest.spyOn(DungeonService, 'getTile').mockReturnValue(tile);

        const coords = service['selectWallTexture'](level, wall);

        expect(coords).toEqual([128, 0, 64, 64]);
      });

      it('selects texture based on wall side, not tile type', () => {
        const tile: TileData = {
          x: 0,
          y: 0,
          walls: {
            north: 'stairs_up',
            south: 'stairs_down',
            east: 'wall',
            west: 'door'
          }
        };

        jest.spyOn(DungeonService, 'getTile').mockReturnValue(tile);

        // North wall -> stairs_up texture
        const northWall: WallSegment = { gridX: 0, gridY: 0, side: 'north' };
        const northCoords = service['selectWallTexture'](level, northWall);
        expect(northCoords).toEqual([256, 0, 64, 64]);

        // South wall -> stairs_down texture
        const southWall: WallSegment = { gridX: 0, gridY: 0, side: 'south' };
        const southCoords = service['selectWallTexture'](level, southWall);
        expect(southCoords).toEqual([128, 0, 64, 64]);

        // East wall -> regular wall texture
        const eastWall: WallSegment = { gridX: 0, gridY: 0, side: 'east' };
        const eastCoords = service['selectWallTexture'](level, eastWall);
        expect([0, 64]).toContain(eastCoords[0]); // Checkerboard pattern

        // West wall -> door texture
        const westWall: WallSegment = { gridX: 0, gridY: 0, side: 'west' };
        const westCoords = service['selectWallTexture'](level, westWall);
        expect(westCoords).toEqual([192, 0, 64, 64]);
      });

      it('prioritizes wall type over tile type for stairs', () => {
        const tile: TileData = {
          x: 0,
          y: 0,
          walls: { north: 'stairs_up', south: 'wall', east: 'wall', west: 'wall' },
          type: 'door'  // Tile type should be ignored
        };

        jest.spyOn(DungeonService, 'getTile').mockReturnValue(tile);

        const wall: WallSegment = { gridX: 0, gridY: 0, side: 'north' };
        const coords = service['selectWallTexture'](level, wall);

        expect(coords).toEqual([256, 0, 64, 64]); // stairs_up, NOT door
      });
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- WebGLRenderingService.spec`
Expected: FAIL - Tests fail because selectWallTexture still checks tile.type

**Step 3: Update selectWallTexture implementation**

Find and update the `selectWallTexture` method in `src/services/WebGLRenderingService.ts`:

```typescript
private selectWallTexture(level: LevelData, wall: WallSegment): [number, number, number, number] {
  const tile = DungeonService.getTile(level, wall.gridX, wall.gridY);

  // Get the wall type for the specific wall segment being rendered
  const wallType = tile.walls[wall.side];

  // Priority 1: Check for stairs walls (highest priority)
  if (wallType === 'stairs_up') {
    return [256, 0, 64, 64];  // stairs_up texture at (256, 0)
  }

  if (wallType === 'stairs_down') {
    return [128, 0, 64, 64];  // stairs_down texture at (128, 0)
  }

  // Priority 2: Check for doors
  if (wallType === 'door' || wallType === 'locked_door') {
    return [192, 0, 64, 64];  // door_closed texture at (192, 0)
    // TODO: integrate with DungeonState.openDoors for open door texture
  }

  // Priority 3: Secret doors and illusions render as normal walls
  if (wallType === 'secret' || wallType === 'illusion' || wallType === 'wall') {
    const useVariation2 = (wall.gridX + wall.gridY) % 2 === 1;
    return useVariation2 ? [64, 0, 64, 64] : [0, 0, 64, 64];
  }

  // Default: open space or unknown (should not render, but return default wall)
  const useVariation2 = (wall.gridX + wall.gridY) % 2 === 1;
  return useVariation2 ? [64, 0, 64, 64] : [0, 0, 64, 64];
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- WebGLRenderingService.spec`
Expected: PASS (all texture selection tests green)

**Step 5: Visual verification in browser**

Run: `npm start`
Navigate to maze scene, walk to position (0, 1) facing north
Expected: See stairs_up texture on north wall

**Step 6: Commit**

```bash
git add src/services/WebGLRenderingService.ts src/services/__tests__/WebGLRenderingService.spec.ts
git commit -m "feat: update selectWallTexture to use wall type for stairs"
```

---

## Phase 4: Integration & Testing

### Task 4.1: Write Integration Tests

**Files:**
- Create: `src/services/__tests__/stairs-integration.spec.ts`

**Step 1: Create integration test file**

Create `src/services/__tests__/stairs-integration.spec.ts`:

```typescript
import { DungeonService } from '../DungeonService';
import { NavigationService } from '../NavigationService';
import { SceneNavigationService } from '../SceneNavigationService';
import { SaveService } from '../SaveService';
import { createTestLevel, createTestGameState } from '../../../tests/helpers/test-factories';
import { LevelData, TileData, Direction, SceneType } from '../../types';

describe('Stairs Integration Tests', () => {
  describe('complete stairs_up journey: dungeon → castle', () => {
    it('triggers castle transition with auto-save when walking into stairs_up wall', () => {
      // Setup: Level with stairs_up at (0, 0) on south wall
      const tiles: TileData[] = [
        {
          x: 0,
          y: 0,
          walls: { north: 'open', south: 'stairs_up', east: 'open', west: 'wall' },
          destination: { type: 'castle' }
        },
        {
          x: 0,
          y: 1,
          walls: { north: 'open', south: 'open', east: 'wall', west: 'wall' }
        }
      ];
      const level = createTestLevel({ tiles });

      const navigation = new NavigationService();
      navigation.loadLevel(level);
      navigation.setPosition({ x: 0, y: 1, facing: 'north' as Direction });

      const sceneTransitionSpy = jest.spyOn(SceneNavigationService, 'transitionTo').mockImplementation();
      const saveSpy = jest.spyOn(SaveService, 'saveGame').mockImplementation();

      // Player presses forward (walks north into stairs_up wall)
      navigation.moveForward();

      // Verify scene transition to castle
      expect(sceneTransitionSpy).toHaveBeenCalledWith(
        SceneType.CASTLE_MENU,
        expect.objectContaining({
          saveBeforeTransition: true
        })
      );

      // Verify player position did NOT update (transition handles it)
      expect(navigation.currentPosition).toEqual({ x: 0, y: 1, facing: 'north' });

      sceneTransitionSpy.mockRestore();
      saveSpy.mockRestore();
    });
  });

  describe('complete stairs_down journey: level 1 → level 2', () => {
    it('transitions to next level without auto-save when walking into stairs_down wall', () => {
      // Setup: Level with stairs_down at (10, 14) on north wall
      const tiles: TileData[] = [
        {
          x: 10,
          y: 14,
          walls: { north: 'stairs_down', south: 'open', east: 'wall', west: 'wall' },
          destination: { level: 2, x: 5, y: 5, facing: 'south' }
        },
        {
          x: 10,
          y: 15,
          walls: { north: 'open', south: 'wall', east: 'wall', west: 'wall' }
        }
      ];
      const level = createTestLevel({ tiles });

      const navigation = new NavigationService();
      navigation.loadLevel(level);
      navigation.setPosition({ x: 10, y: 15, facing: 'north' as Direction });

      const transitionToLevelSpy = jest.spyOn(navigation as any, 'transitionToLevel').mockImplementation();
      const saveSpy = jest.spyOn(SaveService, 'saveGame').mockImplementation();

      // Player presses forward (walks north into stairs_down wall)
      navigation.moveForward();

      // Verify level transition
      expect(transitionToLevelSpy).toHaveBeenCalledWith(2, 5, 5, 'south');

      // Verify NO auto-save (still in dungeon)
      expect(saveSpy).not.toHaveBeenCalled();

      transitionToLevelSpy.mockRestore();
      saveSpy.mockRestore();
    });
  });

  describe('stairs walls in all four directions', () => {
    it('handles stairs on different wall sides correctly', () => {
      const tiles: TileData[] = [
        // Tile (5, 5) with stairs on north and south walls
        {
          x: 5,
          y: 5,
          walls: {
            north: 'stairs_up',
            south: 'stairs_down',
            east: 'wall',
            west: 'wall'
          },
          destination: { type: 'castle' }
        },
        // Adjacent tiles for testing from different directions
        { x: 5, y: 4, walls: { north: 'wall', south: 'open', east: 'wall', west: 'wall' } },
        { x: 5, y: 6, walls: { north: 'open', south: 'wall', east: 'wall', west: 'wall' } }
      ];
      const level = createTestLevel({ tiles });

      const navigation = new NavigationService();
      navigation.loadLevel(level);

      const transitionSpy = jest.spyOn(navigation as any, 'handleStairsTransition').mockImplementation();

      // Test from south (walking north into stairs_up)
      navigation.setPosition({ x: 5, y: 6, facing: 'north' as Direction });
      navigation.moveForward();
      expect(transitionSpy).toHaveBeenCalledWith({ type: 'castle' });

      // Reset
      transitionSpy.mockClear();

      // Test from north (walking south into stairs_down)
      navigation.setPosition({ x: 5, y: 4, facing: 'south' as Direction });
      navigation.moveForward();
      expect(transitionSpy).toHaveBeenCalledWith({ type: 'castle' }); // Same destination

      transitionSpy.mockRestore();
    });
  });

  describe('map validation at load time', () => {
    it('detects all stairs walls missing destinations', () => {
      const tiles: TileData[] = [
        {
          x: 0,
          y: 0,
          walls: { north: 'open', south: 'wall', east: 'open', west: 'stairs_up' }
          // Missing destination - ERROR
        },
        {
          x: 5,
          y: 5,
          walls: { north: 'stairs_down', south: 'wall', east: 'wall', west: 'wall' },
          destination: { level: 2 }
          // Valid
        },
        {
          x: 10,
          y: 10,
          walls: { north: 'wall', south: 'wall', east: 'stairs_up', west: 'wall' }
          // Missing destination - ERROR
        }
      ];
      const level = createTestLevel({ tiles });

      const errors = DungeonService.validateStairsWalls(level);

      expect(errors).toHaveLength(2);
      expect(errors[0]).toContain('(0, 0)');
      expect(errors[1]).toContain('(10, 10)');
    });
  });
});
```

**Step 2: Run integration tests**

Run: `npm test -- stairs-integration.spec`
Expected: PASS (all integration tests green)

**Step 3: Commit**

```bash
git add src/services/__tests__/stairs-integration.spec.ts
git commit -m "test: add integration tests for stairs transitions"
```

---

### Task 4.2: Run Full Test Suite

**Step 1: Run all tests**

Run: `npm test`
Expected: ALL TESTS PASS (501+ tests)

**Step 2: Check test coverage**

Run: `npm test -- --coverage`
Expected: Coverage >90% on modified services:
- DungeonService
- NavigationService
- WebGLRenderingService

**Step 3: If any tests fail, debug and fix**

Review failures, fix issues, re-run tests until all pass.

**Step 4: Commit (if fixes needed)**

```bash
git add <fixed-files>
git commit -m "fix: resolve test failures in stairs implementation"
```

---

### Task 4.3: Performance Testing

**Step 1: Build production bundle**

Run: `npm run build`
Expected: BUILD SUCCESSFUL

**Step 2: Manual performance test**

1. Run: `npm start`
2. Navigate to maze scene
3. Walk around stairs walls
4. Monitor FPS in browser dev tools (should maintain 60 FPS)
5. Check for texture flickering or rendering artifacts

**Step 3: Document performance results**

If performance regression detected:
- Profile with Chrome DevTools
- Identify bottleneck
- Optimize selectWallTexture or caching

Expected: No regression, maintains 60 FPS

---

## Phase 5: Map Data Updates

### Task 5.1: Update All Level Maps with Stairs Walls

**Files:**
- Modify: `data/maps/level1.json` through `data/maps/level10.json`

**Step 1: Audit existing stairs tiles in all levels**

For each level file (level1.json through level10.json):
1. Search for tiles with `"type": "stairs_up"` or `"type": "stairs_down"`
2. Note their coordinates and wall configurations
3. Create checklist of tiles to update

**Step 2: Update level1.json (already done in Task 1.3)**

Verify tile (0,0) is correctly updated.

**Step 3: Update remaining levels (level2.json through level10.json)**

For each stairs tile:
1. Move tile type to appropriate wall (e.g., west wall for entrance)
2. Remove `"type"` field from tile (unless tile has other special properties)
3. Ensure `destination` field exists and is valid
4. Update adjacent tiles if needed

**Example transformation:**

Before:
```json
{
  "x": 0,
  "y": 0,
  "walls": { "north": "open", "south": "wall", "east": "open", "west": "wall" },
  "type": "stairs_up",
  "destination": { "type": "castle" }
}
```

After:
```json
{
  "x": 0,
  "y": 0,
  "walls": { "north": "open", "south": "wall", "east": "open", "west": "stairs_up" },
  "destination": { "type": "castle" }
}
```

**Step 4: Validate each level after update**

Run map validation:
```bash
# Assuming validation is called at level load
npm test -- DungeonService.spec
```

**Step 5: Commit each level individually**

```bash
git add data/maps/level2.json
git commit -m "feat: convert level2 stairs to wall-based system"

git add data/maps/level3.json
git commit -m "feat: convert level3 stairs to wall-based system"

# ... repeat for all levels
```

---

## Phase 6: Documentation & Cleanup

### Task 6.1: Update System Documentation

**Files:**
- Modify: `docs/systems/dungeon-navigation.md`

**Step 1: Add section on stairs wall interactions**

Add to `docs/systems/dungeon-navigation.md`:

```markdown
## Stairs Wall Interactions

### Overview

Stairs are implemented as **wall types** rather than tile types, allowing:
- Visual rendering of stairs textures on specific walls
- Immediate transition when walking into stairs walls
- Distinct textures for stairs_up (castle) vs stairs_down (next level)

### Wall Types

- `stairs_up`: Returns to castle, triggers auto-save
- `stairs_down`: Descends to next level, no auto-save

### Data Model

Stairs walls reference destination data stored on tiles:

```json
{
  "x": 0,
  "y": 0,
  "walls": { "west": "stairs_up" },
  "destination": { "type": "castle" }
}
```

### Movement Behavior

When player walks into stairs wall:
1. `DungeonService.canMove()` returns `{ allowed: true, triggersSpecialAction: 'stairs' }`
2. `NavigationService.moveForward()` calls `handleStairsTransition()` BEFORE updating position
3. Position does NOT update (transition handles it)
4. Tile effects are NOT checked (unlike teleporters)

### Rendering

- **Texture atlas positions:**
  - stairs_up: (256, 0) - 64×64
  - stairs_down: (128, 0) - 64×64
- **Priority:** Stairs walls checked before doors or regular walls
- **Selection:** Based on wall.side, not tile.type

### Validation

Map validation at load time ensures all stairs walls have valid destination data:
```typescript
const errors = DungeonService.validateStairsWalls(level);
```

Errors indicate missing destinations on stairs walls.
```

**Step 2: Commit**

```bash
git add docs/systems/dungeon-navigation.md
git commit -m "docs: add stairs wall interaction documentation"
```

---

### Task 6.2: Update CHANGELOG

**Files:**
- Modify: `CHANGELOG.md`

**Step 1: Add entry for stairs wall feature**

Add to `CHANGELOG.md` under "Unreleased" or appropriate version:

```markdown
## [Unreleased]

### Added
- **Stairs as Wall Types**: Stairs now render on specific walls rather than entire tiles
  - Distinct textures for stairs_up (castle) vs stairs_down (next level)
  - Immediate transition when walking into stairs walls
  - Wall-based texture selection in WebGL renderer
  - Map validation for stairs destination data
- New texture: stairs_up at atlas position (256, 0)

### Changed
- **Movement System**: `DungeonService.canMove()` now returns `triggersSpecialAction` for stairs
- **Navigation**: `NavigationService.moveForward()` checks special actions before position updates
- **Data Model**: Stairs tiles no longer have `type` field, use wall type + destination instead

### Technical
- Extended WallType enum with stairs_up and stairs_down
- Added MovementValidation.triggersSpecialAction field
- Updated WebGLRenderingService.selectWallTexture to prioritize wall types
- Added DungeonService.validateStairsWalls for map validation
- 90%+ test coverage on modified services
```

**Step 2: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: add stairs wall feature to changelog"
```

---

### Task 6.3: Code Review & Cleanup

**Step 1: Search for TODOs and debug code**

Run: `git grep -n "TODO\|FIXME\|console.log\|debugger"`

Review results, remove debug code, document TODOs.

**Step 2: Check for unused imports**

Run TypeScript compiler:
```bash
npm run build
```

Review warnings for unused imports, remove them.

**Step 3: Format code**

If project has formatter configured:
```bash
npm run format
```

**Step 4: Final test run**

Run: `npm test -- --coverage`
Expected: ALL TESTS PASS, >90% coverage

**Step 5: Commit cleanup**

```bash
git add <cleaned-files>
git commit -m "chore: remove debug code and unused imports"
```

---

## Final Verification

### Checklist

- [ ] All type system changes compile without errors
- [ ] All unit tests pass (DungeonService, NavigationService, WebGLRenderingService)
- [ ] All integration tests pass (stairs-integration.spec.ts)
- [ ] Full test suite passes (501+ tests)
- [ ] Test coverage >90% on modified services
- [ ] Production build succeeds
- [ ] Visual verification: stairs textures render correctly
- [ ] Performance: maintains 60 FPS in maze
- [ ] All level maps updated (level1-10)
- [ ] Documentation updated
- [ ] CHANGELOG updated
- [ ] No debug code or TODOs remaining
- [ ] Clean git history with atomic commits

### Final Test Commands

```bash
# Run all tests
npm test

# Check coverage
npm test -- --coverage

# Build for production
npm run build

# Start development server
npm start
```

### Success Criteria

✅ Stairs textures visible on walls
✅ Distinct visuals for up vs down
✅ Walking into stairs triggers immediate transition
✅ Stairs_up → castle with auto-save
✅ Stairs_down → next level without auto-save
✅ All tests passing
✅ No performance regression

---

## Estimated Time

**Total: 9-13 hours**

- Phase 1 (Types & Data): 1-2 hours
- Phase 2 (Movement Logic): 2-3 hours
- Phase 3 (Rendering): 3-4 hours
- Phase 4 (Integration): 2-3 hours
- Phase 5 (Map Updates): 1-2 hours
- Phase 6 (Docs & Cleanup): 1 hour

---

## Implementation Complete!

Once all tasks are done, the stairs wall texture system will be fully functional:
- Players see stairs textures on dungeon walls
- Walking into stairs immediately transitions to destination
- Separate textures distinguish up vs down direction
- All tests passing with high coverage
- Documentation complete

Ready to execute? Use **@superpowers:executing-plans** or **@superpowers:subagent-driven-development** to implement this plan.
