# Maze Scene Phase 1: Data & Services Foundation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create all core dungeon services (DungeonService, NavigationService, EncounterService) with 100% test coverage and encounter table data files.

**Architecture:** Service-heavy pure functions following existing PartyService/CharacterService patterns. All services are stateless, take GameState as input, return new GameState. Zero side effects, maximum testability.

**Tech Stack:** TypeScript, Jest, Angular signals (for GameStateService integration in Phase 2)

---

## Task 1: TypeScript Interfaces for Dungeon Types

**Files:**
- Create: `src/types/dungeon.types.ts`
- Reference: `src/types/game-state.types.ts` (existing)
- Reference: `data/maps/level1.json` (understand tile structure)

**Step 1: Read existing type files to understand conventions**

```bash
# Read existing types to match coding style
cat src/types/game-state.types.ts
cat src/types/character.types.ts
cat data/maps/level1.json | head -100
```

**Step 2: Create dungeon.types.ts with complete interfaces**

Create: `src/types/dungeon.types.ts`

```typescript
// Dungeon navigation and tile types

export type Direction = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';
export type WallType = 'open' | 'wall' | 'door' | 'secret';
export type TileType =
  | 'stairs_up'
  | 'stairs_down'
  | 'teleporter'
  | 'spinner'
  | 'chute'
  | 'darkness_zone_start'
  | 'anti_magic'
  | 'searchable'
  | 'fixed_encounter'
  | 'message'
  | 'elevator';

export interface Position {
  x: number;          // 0-19
  y: number;          // 0-19
  facing: Direction;
}

export interface TileWalls {
  north: WallType;
  east: WallType;
  south: WallType;
  west: WallType;
}

export interface Destination {
  type?: 'castle' | 'level';
  level?: number;
  x?: number;
  y?: number;
}

export interface TileData {
  x: number;
  y: number;
  walls: TileWalls;
  type?: TileType;
  destination?: Destination;
  message?: string;
  item?: string;
  promptSearch?: boolean;
  encounterId?: string;
  repeatable?: boolean;
  cannotFlee?: boolean;
  isOneWay?: boolean;
  destinations?: Destination[];  // For elevator
}

export interface LevelData {
  level: number;
  name: string;
  size: {
    width: number;
    height: number;
  };
  startPosition: {
    x: number;
    y: number;
    facing: string;  // lowercase in JSON, convert to Direction
  };
  edgeWrapping: boolean;
  tiles: TileData[];
  encounterRate: number;
  encounterTable: string;
}

export interface DungeonState {
  currentLevel: number;
  position: Position;
  lightActive: boolean;
  lightRadius: number;
  visitedTiles: Set<string>;        // "level-x-y"
  defeatedEncounters: string[];     // encounter IDs
}

export interface EncounterTable {
  levelId: string;
  encounterRate: number;
  monsters: MonsterEntry[];
}

export interface MonsterEntry {
  monsterId: string;
  weight: number;
}

export interface MovementValidation {
  allowed: boolean;
  reason?: string;
}

export interface SpecialTileResult {
  newState: any;  // GameState (avoid circular import)
  messages: string[];
}
```

**Step 3: Update GameState to include dungeon**

Modify: `src/types/game-state.types.ts`

Add import at top:
```typescript
import { DungeonState } from './dungeon.types';
```

Add field to GameState interface:
```typescript
export interface GameState {
  // ... existing fields
  dungeon?: DungeonState;  // Optional for now (town-only games)
}
```

**Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors

**Step 5: Commit**

```bash
git add src/types/dungeon.types.ts src/types/game-state.types.ts
git commit -m "feat: add dungeon type definitions for maze scene"
```

---

## Task 2: Encounter Table Data Files (Level 1-10)

**Files:**
- Create: `data/encounters/level-1-encounters.json` through `level-10-encounters.json`
- Reference: `docs/research/monster-reference.md` (monster lists by level)
- Reference: `data/monsters/*.json` (verify monster IDs exist)

**Step 1: Create encounters directory**

```bash
mkdir -p data/encounters
```

**Step 2: Create Level 1 encounter table**

Create: `data/encounters/level-1-encounters.json`

```json
{
  "levelId": "level_1_monsters",
  "encounterRate": 0.10,
  "monsters": [
    { "monsterId": "kobold", "weight": 20 },
    { "monsterId": "orc", "weight": 20 },
    { "monsterId": "zombie", "weight": 15 },
    { "monsterId": "bubbly_slime", "weight": 15 },
    { "monsterId": "rogue", "weight": 10 },
    { "monsterId": "bushwacker", "weight": 8 },
    { "monsterId": "highwayman", "weight": 7 },
    { "monsterId": "undead_kobold", "weight": 3 },
    { "monsterId": "lvl_1_mage", "weight": 1 },
    { "monsterId": "lvl_1_priest", "weight": 1 }
  ]
}
```

**Step 3: Create Level 2 encounter table**

Create: `data/encounters/level-2-encounters.json`

```json
{
  "levelId": "level_2_monsters",
  "encounterRate": 0.10,
  "monsters": [
    { "monsterId": "creeping_crud", "weight": 25 },
    { "monsterId": "huge_spider", "weight": 20 },
    { "monsterId": "gas_cloud", "weight": 20 },
    { "monsterId": "vorpal_bunny", "weight": 15 },
    { "monsterId": "creeping_coin", "weight": 20 }
  ]
}
```

**Step 4: Create Level 3-10 encounter tables**

Create remaining 8 files based on `docs/research/monster-reference.md`:

`level-3-encounters.json`:
```json
{
  "levelId": "level_3_monsters",
  "encounterRate": 0.10,
  "monsters": [
    { "monsterId": "capybara", "weight": 15 },
    { "monsterId": "coyote", "weight": 15 },
    { "monsterId": "dragon_fly", "weight": 10 },
    { "monsterId": "giant_toad", "weight": 15 },
    { "monsterId": "lvl_3_ninja", "weight": 8 },
    { "monsterId": "lvl_3_priest", "weight": 10 },
    { "monsterId": "lvl_3_samurai", "weight": 10 },
    { "monsterId": "lvl_5_mage", "weight": 5 },
    { "monsterId": "rotting_corpse", "weight": 7 },
    { "monsterId": "were_bear", "weight": 5 }
  ]
}
```

`level-4-encounters.json`:
```json
{
  "levelId": "level_4_monsters",
  "encounterRate": 0.10,
  "monsters": [
    { "monsterId": "attack_dog", "weight": 10 },
    { "monsterId": "bishop", "weight": 5 },
    { "monsterId": "boring_beetle", "weight": 10 },
    { "monsterId": "dragon_puppy", "weight": 8 },
    { "monsterId": "gargoyle", "weight": 7 },
    { "monsterId": "gas_dragon", "weight": 6 },
    { "monsterId": "grave_mist", "weight": 10 },
    { "monsterId": "lvl_4_thief", "weight": 10 },
    { "monsterId": "lvl_5_priest", "weight": 8 },
    { "monsterId": "lvl_6_ninja", "weight": 5 },
    { "monsterId": "lvl_7_fighter", "weight": 6 },
    { "monsterId": "ogre", "weight": 10 },
    { "monsterId": "priestess", "weight": 5 },
    { "monsterId": "shade", "weight": 10 }
  ]
}
```

`level-5-encounters.json`:
```json
{
  "levelId": "level_5_monsters",
  "encounterRate": 0.10,
  "monsters": [
    { "monsterId": "champ_samurai", "weight": 8 },
    { "monsterId": "giant_spider", "weight": 12 },
    { "monsterId": "killer_wolf", "weight": 10 },
    { "monsterId": "lvl_7_mage", "weight": 8 },
    { "monsterId": "minor_daimyo", "weight": 10 },
    { "monsterId": "spirit", "weight": 8 },
    { "monsterId": "swordsman", "weight": 12 },
    { "monsterId": "weretiger", "weight": 10 },
    { "monsterId": "wererat", "weight": 12 },
    { "monsterId": "lifestealer", "weight": 10 }
  ]
}
```

`level-6-encounters.json`:
```json
{
  "levelId": "level_6_monsters",
  "encounterRate": 0.10,
  "monsters": [
    { "monsterId": "arch_mage_lesser", "weight": 8 },
    { "monsterId": "chimera", "weight": 5 },
    { "monsterId": "gaze_hound", "weight": 10 },
    { "monsterId": "high_priest_lesser", "weight": 7 },
    { "monsterId": "lvl_7_thief", "weight": 10 },
    { "monsterId": "lvl_8_bishop", "weight": 6 },
    { "monsterId": "lvl_8_priest", "weight": 8 },
    { "monsterId": "master_thief_lesser", "weight": 10 },
    { "monsterId": "medusalizard", "weight": 9 },
    { "monsterId": "ogre_lord", "weight": 8 },
    { "monsterId": "troll", "weight": 7 },
    { "monsterId": "werewolf", "weight": 12 }
  ]
}
```

`level-7-encounters.json`:
```json
{
  "levelId": "level_7_monsters",
  "encounterRate": 0.10,
  "monsters": [
    { "monsterId": "lvl_8_fighter", "weight": 15 },
    { "monsterId": "major_daimyo", "weight": 12 },
    { "monsterId": "nightstalker", "weight": 15 },
    { "monsterId": "wyvern", "weight": 18 },
    { "monsterId": "gorgon", "weight": 20 },
    { "monsterId": "lesser_demon", "weight": 20 }
  ]
}
```

`level-8-encounters.json`:
```json
{
  "levelId": "level_8_monsters",
  "encounterRate": 0.10,
  "monsters": [
    { "monsterId": "dragon_zombie", "weight": 10 },
    { "monsterId": "fire_dragon", "weight": 10 },
    { "monsterId": "lvl_8_ninja", "weight": 15 },
    { "monsterId": "lvl_10_fighter", "weight": 20 },
    { "monsterId": "hatamoto", "weight": 20 },
    { "monsterId": "high_master", "weight": 25 }
  ]
}
```

`level-9-encounters.json`:
```json
{
  "levelId": "level_9_monsters",
  "encounterRate": 0.10,
  "monsters": [
    { "monsterId": "fire_giant", "weight": 30 },
    { "monsterId": "frost_giant", "weight": 20 },
    { "monsterId": "maelific", "weight": 50 }
  ]
}
```

`level-10-encounters.json`:
```json
{
  "levelId": "level_10_monsters",
  "encounterRate": 0.10,
  "monsters": [
    { "monsterId": "arch_mage_greater", "weight": 8 },
    { "monsterId": "bleeb", "weight": 10 },
    { "monsterId": "greater_demon", "weight": 5 },
    { "monsterId": "high_priest_greater", "weight": 7 },
    { "monsterId": "lvl_10_mage", "weight": 12 },
    { "monsterId": "master_ninja", "weight": 8 },
    { "monsterId": "master_thief_greater", "weight": 10 },
    { "monsterId": "poison_giant", "weight": 5 },
    { "monsterId": "raver_lord", "weight": 6 },
    { "monsterId": "thief", "weight": 10 },
    { "monsterId": "vampire", "weight": 7 },
    { "monsterId": "vampire_lord", "weight": 5 },
    { "monsterId": "will_o_wisp", "weight": 2 },
    { "monsterId": "flack", "weight": 5 }
  ]
}
```

**Step 5: Validate JSON files**

```bash
for file in data/encounters/*.json; do
  echo "Validating $file..."
  python3 -m json.tool "$file" > /dev/null || echo "ERROR in $file"
done
```

Expected: No errors

**Step 6: Commit**

```bash
git add data/encounters/
git commit -m "feat: add encounter tables for all 10 dungeon levels"
```

---

## Task 3: DungeonService - Core Map Loading

**Files:**
- Create: `src/services/DungeonService.ts`
- Create: `src/services/__tests__/DungeonService.spec.ts`
- Reference: `src/services/PartyService.ts` (match coding style)

**Step 1: Write failing test for loadLevel**

Create: `src/services/__tests__/DungeonService.spec.ts`

```typescript
import { DungeonService } from '../DungeonService';

describe('DungeonService', () => {
  describe('loadLevel', () => {
    it('loads level 1 map data with 20x20 grid', () => {
      const level = DungeonService.loadLevel(1);

      expect(level.level).toBe(1);
      expect(level.size).toEqual({ width: 20, height: 20 });
      expect(level.encounterTable).toBe('level_1_monsters');
      expect(level.tiles.length).toBeGreaterThan(0);
    });

    it('loads level 2 map data', () => {
      const level = DungeonService.loadLevel(2);

      expect(level.level).toBe(2);
      expect(level.size).toEqual({ width: 20, height: 20 });
    });

    it('throws error for invalid level', () => {
      expect(() => DungeonService.loadLevel(0)).toThrow();
      expect(() => DungeonService.loadLevel(11)).toThrow();
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- DungeonService
```

Expected: FAIL - "Cannot find module '../DungeonService'"

**Step 3: Create minimal DungeonService**

Create: `src/services/DungeonService.ts`

```typescript
import { LevelData, TileData, Position, Direction, WallType, MovementValidation } from '../types/dungeon.types';

// Import JSON data (adjust path as needed)
import level1Data from '../../data/maps/level1.json';
import level2Data from '../../data/maps/level2.json';
import level3Data from '../../data/maps/level3.json';

const LEVEL_DATA_MAP: Record<number, any> = {
  1: level1Data,
  2: level2Data,
  3: level3Data,
  // Levels 4-10 to be added when JSON files created
};

export const DungeonService = {
  /**
   * Load dungeon level data from JSON
   */
  loadLevel(level: number): LevelData {
    if (level < 1 || level > 10) {
      throw new Error(`Invalid dungeon level: ${level}. Must be 1-10.`);
    }

    const rawData = LEVEL_DATA_MAP[level];
    if (!rawData) {
      throw new Error(`Map data not found for level ${level}`);
    }

    // Parse JSON structure (levels[0] contains the level)
    const levelData = rawData.levels[0];

    return {
      level: levelData.level,
      name: levelData.name,
      size: levelData.size,
      startPosition: {
        x: levelData.startPosition.x,
        y: levelData.startPosition.y,
        facing: levelData.startPosition.facing.toUpperCase() as Direction
      },
      edgeWrapping: levelData.edgeWrapping,
      tiles: levelData.tiles,
      encounterRate: levelData.encounterRate,
      encounterTable: levelData.encounterTable
    };
  },
};
```

**Step 4: Run test to verify it passes**

```bash
npm test -- DungeonService
```

Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add src/services/DungeonService.ts src/services/__tests__/DungeonService.spec.ts
git commit -m "feat: add DungeonService.loadLevel with basic map loading"
```

---

## Task 4: DungeonService - Tile Queries

**Files:**
- Modify: `src/services/DungeonService.ts`
- Modify: `src/services/__tests__/DungeonService.spec.ts`

**Step 1: Write failing tests for getTile**

Add to: `src/services/__tests__/DungeonService.spec.ts`

```typescript
describe('getTile', () => {
  it('returns tile at specific coordinates', () => {
    const level = DungeonService.loadLevel(1);
    const tile = DungeonService.getTile(level, 0, 0);

    expect(tile.x).toBe(0);
    expect(tile.y).toBe(0);
    expect(tile.type).toBe('stairs_up');
  });

  it('returns tile with correct wall configuration', () => {
    const level = DungeonService.loadLevel(1);
    const tile = DungeonService.getTile(level, 2, 0);

    expect(tile.walls.east).toBe('door');
  });

  it('returns default tile for coordinates with no tile data', () => {
    const level = DungeonService.loadLevel(1);
    const tile = DungeonService.getTile(level, 19, 19);

    // Should return a default tile if not in tiles array
    expect(tile.x).toBe(19);
    expect(tile.y).toBe(19);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- DungeonService
```

Expected: FAIL - "DungeonService.getTile is not a function"

**Step 3: Implement getTile**

Add to: `src/services/DungeonService.ts`

```typescript
/**
 * Get tile at specific coordinates
 * Returns default empty tile if not found in data
 */
getTile(level: LevelData, x: number, y: number): TileData {
  const tile = level.tiles.find(t => t.x === x && t.y === y);

  if (tile) {
    return tile;
  }

  // Return default tile (all walls)
  return {
    x,
    y,
    walls: {
      north: 'wall',
      east: 'wall',
      south: 'wall',
      west: 'wall'
    }
  };
},
```

**Step 4: Run test to verify it passes**

```bash
npm test -- DungeonService
```

Expected: PASS (6 tests)

**Step 5: Commit**

```bash
git add src/services/DungeonService.ts src/services/__tests__/DungeonService.spec.ts
git commit -m "feat: add DungeonService.getTile for coordinate lookup"
```

---

## Task 5: DungeonService - Movement Validation

**Files:**
- Modify: `src/services/DungeonService.ts`
- Modify: `src/services/__tests__/DungeonService.spec.ts`

**Step 1: Write failing tests for canMove**

Add to: `src/services/__tests__/DungeonService.spec.ts`

```typescript
describe('canMove', () => {
  const level = DungeonService.loadLevel(1);

  it('allows movement when no wall blocks path (facing north with open north)', () => {
    const position: Position = { x: 0, y: 0, facing: 'NORTH' };
    const result = DungeonService.canMove(level, position, 'FORWARD');

    expect(result.allowed).toBe(true);
  });

  it('blocks movement when wall present', () => {
    const position: Position = { x: 0, y: 0, facing: 'EAST' };
    const result = DungeonService.canMove(level, position, 'FORWARD');

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('wall');
  });

  it('blocks movement when door present', () => {
    const position: Position = { x: 2, y: 0, facing: 'EAST' };
    const result = DungeonService.canMove(level, position, 'FORWARD');

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('door');
  });

  it('allows backward movement', () => {
    const position: Position = { x: 5, y: 1, facing: 'NORTH' };
    const result = DungeonService.canMove(level, position, 'BACKWARD');

    // Moving backward from facing north = checking south wall
    expect(result.allowed).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- DungeonService
```

Expected: FAIL - "DungeonService.canMove is not a function"

**Step 3: Implement canMove with helper functions**

Add to: `src/services/DungeonService.ts`

```typescript
/**
 * Check if movement is allowed from current position
 */
canMove(level: LevelData, position: Position, moveDirection: 'FORWARD' | 'BACKWARD' | 'STRAFE_LEFT' | 'STRAFE_RIGHT'): MovementValidation {
  const tile = this.getTile(level, position.x, position.y);

  // Determine which wall to check based on facing and move direction
  const wallDirection = this.getWallDirectionForMovement(position.facing, moveDirection);
  const wallType = tile.walls[wallDirection];

  if (wallType === 'wall') {
    return {
      allowed: false,
      reason: 'You walk into a wall. Ouch!'
    };
  }

  if (wallType === 'door') {
    return {
      allowed: false,
      reason: 'A door blocks your way. Press K to kick it open.'
    };
  }

  if (wallType === 'secret') {
    return {
      allowed: false,
      reason: 'You walk into a wall. Ouch!' // Secret doors appear as walls
    };
  }

  return { allowed: true };
},

/**
 * Helper: determine which wall to check based on facing and movement
 */
getWallDirectionForMovement(facing: Direction, moveDirection: 'FORWARD' | 'BACKWARD' | 'STRAFE_LEFT' | 'STRAFE_RIGHT'): keyof TileWalls {
  const directionMap: Record<Direction, Record<string, keyof TileWalls>> = {
    'NORTH': { FORWARD: 'north', BACKWARD: 'south', STRAFE_LEFT: 'west', STRAFE_RIGHT: 'east' },
    'SOUTH': { FORWARD: 'south', BACKWARD: 'north', STRAFE_LEFT: 'east', STRAFE_RIGHT: 'west' },
    'EAST': { FORWARD: 'east', BACKWARD: 'west', STRAFE_LEFT: 'north', STRAFE_RIGHT: 'south' },
    'WEST': { FORWARD: 'west', BACKWARD: 'east', STRAFE_LEFT: 'south', STRAFE_RIGHT: 'north' }
  };

  return directionMap[facing][moveDirection];
},
```

**Step 4: Run test to verify it passes**

```bash
npm test -- DungeonService
```

Expected: PASS (10 tests)

**Step 5: Commit**

```bash
git add src/services/DungeonService.ts src/services/__tests__/DungeonService.spec.ts
git commit -m "feat: add DungeonService.canMove for movement validation"
```

---

## Task 6: NavigationService - Basic Movement

**Files:**
- Create: `src/services/NavigationService.ts`
- Create: `src/services/__tests__/NavigationService.spec.ts`
- Reference: `src/services/PartyService.ts` (immutable state patterns)

**Step 1: Write failing tests for moveForward**

Create: `src/services/__tests__/NavigationService.spec.ts`

```typescript
import { NavigationService } from '../NavigationService';
import { GameState } from '../../types/game-state.types';
import { Position } from '../../types/dungeon.types';

// Test helper
function createTestGameState(position: Position): GameState {
  return {
    dungeon: {
      currentLevel: 1,
      position,
      lightActive: false,
      lightRadius: 1,
      visitedTiles: new Set(),
      defeatedEncounters: []
    }
  } as GameState;
}

describe('NavigationService', () => {
  describe('moveForward', () => {
    it('increments y when facing north', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'NORTH' });
      const newState = NavigationService.moveForward(state);

      expect(newState.dungeon!.position.y).toBe(11);
      expect(newState.dungeon!.position.x).toBe(10);
    });

    it('decrements y when facing south', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'SOUTH' });
      const newState = NavigationService.moveForward(state);

      expect(newState.dungeon!.position.y).toBe(9);
    });

    it('increments x when facing east', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'EAST' });
      const newState = NavigationService.moveForward(state);

      expect(newState.dungeon!.position.x).toBe(11);
    });

    it('decrements x when facing west', () => {
      const state = createTestGameState({ x: 10, y: 10, facing: 'WEST' });
      const newState = NavigationService.moveForward(state);

      expect(newState.dungeon!.position.x).toBe(9);
    });

    it('wraps x from 19 to 0 when moving east', () => {
      const state = createTestGameState({ x: 19, y: 10, facing: 'EAST' });
      const newState = NavigationService.moveForward(state);

      expect(newState.dungeon!.position.x).toBe(0);
    });

    it('wraps x from 0 to 19 when moving west', () => {
      const state = createTestGameState({ x: 0, y: 10, facing: 'WEST' });
      const newState = NavigationService.moveForward(state);

      expect(newState.dungeon!.position.x).toBe(19);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- NavigationService
```

Expected: FAIL - "Cannot find module '../NavigationService'"

**Step 3: Implement moveForward**

Create: `src/services/NavigationService.ts`

```typescript
import { GameState } from '../types/game-state.types';
import { Position, Direction } from '../types/dungeon.types';

export const NavigationService = {
  /**
   * Move party forward one tile (immutable state update)
   */
  moveForward(state: GameState): GameState {
    if (!state.dungeon) {
      throw new Error('Dungeon state not initialized');
    }

    const currentPos = state.dungeon.position;
    const nextPos = this.getNextPosition(currentPos, currentPos.facing, false);

    return {
      ...state,
      dungeon: {
        ...state.dungeon,
        position: nextPos
      }
    };
  },

  /**
   * Calculate next position based on direction and movement
   * @param position Current position
   * @param direction Direction to move (NORTH/SOUTH/EAST/WEST)
   * @param reverse If true, move opposite direction
   */
  getNextPosition(position: Position, direction: Direction, reverse: boolean): Position {
    let { x, y } = position;
    const multiplier = reverse ? -1 : 1;

    switch (direction) {
      case 'NORTH':
        y = this.wrapCoordinate(y + (1 * multiplier), 20);
        break;
      case 'SOUTH':
        y = this.wrapCoordinate(y - (1 * multiplier), 20);
        break;
      case 'EAST':
        x = this.wrapCoordinate(x + (1 * multiplier), 20);
        break;
      case 'WEST':
        x = this.wrapCoordinate(x - (1 * multiplier), 20);
        break;
    }

    return { x, y, facing: position.facing };
  },

  /**
   * Wrap coordinate within 0-19 range (edge wrapping)
   */
  wrapCoordinate(value: number, max: number): number {
    if (value < 0) return max - 1;
    if (value >= max) return 0;
    return value;
  },
};
```

**Step 4: Run test to verify it passes**

```bash
npm test -- NavigationService
```

Expected: PASS (6 tests)

**Step 5: Commit**

```bash
git add src/services/NavigationService.ts src/services/__tests__/NavigationService.spec.ts
git commit -m "feat: add NavigationService.moveForward with edge wrapping"
```

---

## Task 7: NavigationService - Rotation and Strafe

**Files:**
- Modify: `src/services/NavigationService.ts`
- Modify: `src/services/__tests__/NavigationService.spec.ts`

**Step 1: Write failing tests for rotation**

Add to: `src/services/__tests__/NavigationService.spec.ts`

```typescript
describe('turnLeft', () => {
  it('rotates from NORTH to WEST', () => {
    const state = createTestGameState({ x: 10, y: 10, facing: 'NORTH' });
    const newState = NavigationService.turnLeft(state);

    expect(newState.dungeon!.position.facing).toBe('WEST');
  });

  it('rotates from WEST to SOUTH', () => {
    const state = createTestGameState({ x: 10, y: 10, facing: 'WEST' });
    const newState = NavigationService.turnLeft(state);

    expect(newState.dungeon!.position.facing).toBe('SOUTH');
  });
});

describe('turnRight', () => {
  it('rotates from NORTH to EAST', () => {
    const state = createTestGameState({ x: 10, y: 10, facing: 'NORTH' });
    const newState = NavigationService.turnRight(state);

    expect(newState.dungeon!.position.facing).toBe('EAST');
  });

  it('rotates from EAST to SOUTH', () => {
    const state = createTestGameState({ x: 10, y: 10, facing: 'EAST' });
    const newState = NavigationService.turnRight(state);

    expect(newState.dungeon!.position.facing).toBe('SOUTH');
  });
});

describe('strafeLeft', () => {
  it('moves west when facing north', () => {
    const state = createTestGameState({ x: 10, y: 10, facing: 'NORTH' });
    const newState = NavigationService.strafeLeft(state);

    expect(newState.dungeon!.position.x).toBe(9);
    expect(newState.dungeon!.position.y).toBe(10);
    expect(newState.dungeon!.position.facing).toBe('NORTH');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- NavigationService
```

Expected: FAIL - "NavigationService.turnLeft is not a function"

**Step 3: Implement rotation and strafe**

Add to: `src/services/NavigationService.ts`

```typescript
/**
 * Turn party left 90 degrees
 */
turnLeft(state: GameState): GameState {
  if (!state.dungeon) throw new Error('Dungeon state not initialized');

  const newFacing = this.rotateDirection(state.dungeon.position.facing, 'LEFT');

  return {
    ...state,
    dungeon: {
      ...state.dungeon,
      position: {
        ...state.dungeon.position,
        facing: newFacing
      }
    }
  };
},

/**
 * Turn party right 90 degrees
 */
turnRight(state: GameState): GameState {
  if (!state.dungeon) throw new Error('Dungeon state not initialized');

  const newFacing = this.rotateDirection(state.dungeon.position.facing, 'RIGHT');

  return {
    ...state,
    dungeon: {
      ...state.dungeon,
      position: {
        ...state.dungeon.position,
        facing: newFacing
      }
    }
  };
},

/**
 * Rotate direction 90 degrees left or right
 */
rotateDirection(current: Direction, rotation: 'LEFT' | 'RIGHT'): Direction {
  const directions: Direction[] = ['NORTH', 'EAST', 'SOUTH', 'WEST'];
  const currentIndex = directions.indexOf(current);

  if (rotation === 'LEFT') {
    return directions[(currentIndex + 3) % 4]; // -1 mod 4 = +3 mod 4
  } else {
    return directions[(currentIndex + 1) % 4];
  }
},

/**
 * Move party left without changing facing
 */
strafeLeft(state: GameState): GameState {
  if (!state.dungeon) throw new Error('Dungeon state not initialized');

  const currentPos = state.dungeon.position;
  const leftDirection = this.rotateDirection(currentPos.facing, 'LEFT');
  const nextPos = this.getNextPosition(currentPos, leftDirection, false);

  return {
    ...state,
    dungeon: {
      ...state.dungeon,
      position: {
        ...nextPos,
        facing: currentPos.facing // Preserve original facing
      }
    }
  };
},

/**
 * Move party right without changing facing
 */
strafeRight(state: GameState): GameState {
  if (!state.dungeon) throw new Error('Dungeon state not initialized');

  const currentPos = state.dungeon.position;
  const rightDirection = this.rotateDirection(currentPos.facing, 'RIGHT');
  const nextPos = this.getNextPosition(currentPos, rightDirection, false);

  return {
    ...state,
    dungeon: {
      ...state.dungeon,
      position: {
        ...nextPos,
        facing: currentPos.facing // Preserve original facing
      }
    }
  };
},

/**
 * Move party backward one tile
 */
moveBackward(state: GameState): GameState {
  if (!state.dungeon) throw new Error('Dungeon state not initialized');

  const currentPos = state.dungeon.position;
  const nextPos = this.getNextPosition(currentPos, currentPos.facing, true);

  return {
    ...state,
    dungeon: {
      ...state.dungeon,
      position: nextPos
    }
  };
},
```

**Step 4: Run test to verify it passes**

```bash
npm test -- NavigationService
```

Expected: PASS (11 tests)

**Step 5: Commit**

```bash
git add src/services/NavigationService.ts src/services/__tests__/NavigationService.spec.ts
git commit -m "feat: add NavigationService rotation and strafe movement"
```

---

## Task 8: EncounterService - Random Encounter Generation

**Files:**
- Create: `src/services/EncounterService.ts`
- Create: `src/services/__tests__/EncounterService.spec.ts`

**Step 1: Write failing tests for rollRandomEncounter**

Create: `src/services/__tests__/EncounterService.spec.ts`

```typescript
import { EncounterService } from '../EncounterService';

describe('EncounterService', () => {
  describe('rollRandomEncounter', () => {
    it('returns true approximately 10% of the time', () => {
      const rolls = Array.from({ length: 1000 }, () =>
        EncounterService.rollRandomEncounter()
      );
      const trueCount = rolls.filter(Boolean).length;

      // Expect ~100 true results ± 50 (statistical variance)
      expect(trueCount).toBeGreaterThan(50);
      expect(trueCount).toBeLessThan(150);
    });

    it('returns boolean value', () => {
      const result = EncounterService.rollRandomEncounter();
      expect(typeof result).toBe('boolean');
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- EncounterService
```

Expected: FAIL - "Cannot find module '../EncounterService'"

**Step 3: Implement rollRandomEncounter**

Create: `src/services/EncounterService.ts`

```typescript
import { EncounterTable, MonsterEntry } from '../types/dungeon.types';

export const EncounterService = {
  /**
   * Roll for random encounter (10% chance)
   */
  rollRandomEncounter(): boolean {
    return Math.random() < 0.10;
  },
};
```

**Step 4: Run test to verify it passes**

```bash
npm test -- EncounterService
```

Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add src/services/EncounterService.ts src/services/__tests__/EncounterService.spec.ts
git commit -m "feat: add EncounterService.rollRandomEncounter"
```

---

## Task 9: EncounterService - Load Encounter Tables

**Files:**
- Modify: `src/services/EncounterService.ts`
- Modify: `src/services/__tests__/EncounterService.spec.ts`

**Step 1: Write failing tests for getEncounterTable**

Add to: `src/services/__tests__/EncounterService.spec.ts`

```typescript
describe('getEncounterTable', () => {
  it('loads level 1 encounter table', () => {
    const table = EncounterService.getEncounterTable(1);

    expect(table.levelId).toBe('level_1_monsters');
    expect(table.encounterRate).toBe(0.10);
    expect(table.monsters.length).toBeGreaterThan(0);
  });

  it('includes kobold in level 1 monsters', () => {
    const table = EncounterService.getEncounterTable(1);
    const kobold = table.monsters.find(m => m.monsterId === 'kobold');

    expect(kobold).toBeDefined();
    expect(kobold?.weight).toBeGreaterThan(0);
  });

  it('loads level 2 encounter table', () => {
    const table = EncounterService.getEncounterTable(2);

    expect(table.levelId).toBe('level_2_monsters');
  });

  it('throws error for invalid level', () => {
    expect(() => EncounterService.getEncounterTable(0)).toThrow();
    expect(() => EncounterService.getEncounterTable(11)).toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- EncounterService
```

Expected: FAIL - "EncounterService.getEncounterTable is not a function"

**Step 3: Implement getEncounterTable**

Add to: `src/services/EncounterService.ts`

```typescript
// Import encounter tables
import level1Encounters from '../../data/encounters/level-1-encounters.json';
import level2Encounters from '../../data/encounters/level-2-encounters.json';
import level3Encounters from '../../data/encounters/level-3-encounters.json';
import level4Encounters from '../../data/encounters/level-4-encounters.json';
import level5Encounters from '../../data/encounters/level-5-encounters.json';
import level6Encounters from '../../data/encounters/level-6-encounters.json';
import level7Encounters from '../../data/encounters/level-7-encounters.json';
import level8Encounters from '../../data/encounters/level-8-encounters.json';
import level9Encounters from '../../data/encounters/level-9-encounters.json';
import level10Encounters from '../../data/encounters/level-10-encounters.json';

const ENCOUNTER_TABLES: Record<number, EncounterTable> = {
  1: level1Encounters as EncounterTable,
  2: level2Encounters as EncounterTable,
  3: level3Encounters as EncounterTable,
  4: level4Encounters as EncounterTable,
  5: level5Encounters as EncounterTable,
  6: level6Encounters as EncounterTable,
  7: level7Encounters as EncounterTable,
  8: level8Encounters as EncounterTable,
  9: level9Encounters as EncounterTable,
  10: level10Encounters as EncounterTable,
};

/**
 * Get encounter table for dungeon level
 */
getEncounterTable(level: number): EncounterTable {
  if (level < 1 || level > 10) {
    throw new Error(`Invalid dungeon level: ${level}. Must be 1-10.`);
  }

  const table = ENCOUNTER_TABLES[level];
  if (!table) {
    throw new Error(`Encounter table not found for level ${level}`);
  }

  return table;
},
```

**Step 4: Run test to verify it passes**

```bash
npm test -- EncounterService
```

Expected: PASS (6 tests)

**Step 5: Commit**

```bash
git add src/services/EncounterService.ts src/services/__tests__/EncounterService.spec.ts
git commit -m "feat: add EncounterService.getEncounterTable"
```

---

## Task 10: EncounterService - Weighted Monster Selection

**Files:**
- Modify: `src/services/EncounterService.ts`
- Modify: `src/services/__tests__/EncounterService.spec.ts`

**Step 1: Write failing tests for selectMonster**

Add to: `src/services/__tests__/EncounterService.spec.ts`

```typescript
describe('selectMonster', () => {
  it('selects monster from level 1 table', () => {
    const table = EncounterService.getEncounterTable(1);
    const monsterId = EncounterService.selectMonster(table);

    const validMonsters = table.monsters.map(m => m.monsterId);
    expect(validMonsters).toContain(monsterId);
  });

  it('respects weight distribution over many selections', () => {
    const table = EncounterService.getEncounterTable(1);

    // Kobold has weight 20, Lvl 1 Mage has weight 1
    // Over 1000 selections, kobold should appear much more frequently
    const selections = Array.from({ length: 1000 }, () =>
      EncounterService.selectMonster(table)
    );

    const koboldCount = selections.filter(id => id === 'kobold').length;
    const mageCount = selections.filter(id => id === 'lvl_1_mage').length;

    expect(koboldCount).toBeGreaterThan(mageCount);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- EncounterService
```

Expected: FAIL - "EncounterService.selectMonster is not a function"

**Step 3: Implement selectMonster with weighted random**

Add to: `src/services/EncounterService.ts`

```typescript
/**
 * Select random monster from encounter table using weighted probability
 */
selectMonster(table: EncounterTable): string {
  const totalWeight = table.monsters.reduce((sum, m) => sum + m.weight, 0);
  let random = Math.random() * totalWeight;

  for (const entry of table.monsters) {
    random -= entry.weight;
    if (random <= 0) {
      return entry.monsterId;
    }
  }

  // Fallback (should never reach here)
  return table.monsters[0].monsterId;
},
```

**Step 4: Run test to verify it passes**

```bash
npm test -- EncounterService
```

Expected: PASS (8 tests)

**Step 5: Commit**

```bash
git add src/services/EncounterService.ts src/services/__tests__/EncounterService.spec.ts
git commit -m "feat: add EncounterService.selectMonster with weighted selection"
```

---

## Task 11: Verify All Tests Pass and Coverage

**Files:**
- All service test files

**Step 1: Run full test suite**

```bash
npm test
```

Expected: All tests pass

**Step 2: Run test coverage report**

```bash
npm test -- --coverage
```

Expected:
- DungeonService: 100% coverage
- NavigationService: 100% coverage
- EncounterService: 100% coverage

**Step 3: Review coverage report**

Check output for any uncovered lines. All service functions should have 100% branch and line coverage.

**Step 4: Final commit**

```bash
git add .
git commit -m "test: verify 100% coverage for Phase 1 services"
```

---

## Summary

**Phase 1 Complete! Created:**
- ✅ 10 encounter table JSON files (`data/encounters/`)
- ✅ TypeScript interfaces (`src/types/dungeon.types.ts`)
- ✅ DungeonService (map loading, tile queries, movement validation)
- ✅ NavigationService (movement, rotation, strafe, edge wrapping)
- ✅ EncounterService (random rolls, weighted selection)
- ✅ 100% test coverage for all services

**Next Phase:** Phase 2 - Basic Maze Component (keyboard input, GameState integration, MessageLogComponent)

---

Plan complete and saved to `docs/plans/2025-11-06-maze-phase-1-services.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
