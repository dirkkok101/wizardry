# Maze Scene Design Document

**Date**: 2025-11-06
**Status**: Approved
**Estimated Timeline**: 6 weeks

## Overview

The Maze Scene implements 3D first-person dungeon navigation using HTML5 Canvas wireframe rendering, service-heavy architecture with pure functions, and instant tile-to-tile movement. This is the core dungeon exploration experience where parties navigate 10 levels of 20×20 tile mazes, encounter monsters, discover treasure, and face special tile challenges.

## Design Decisions

### Core Mechanics

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Rendering** | HTML5 Canvas wireframe | Authentic retro Wizardry aesthetic, moderate complexity, good performance |
| **Movement** | Instant teleport (no animation) | Matches original game feel, simplest implementation, fastest response |
| **Special Tiles** | Trigger immediately on entry | Authentic tension and danger, no confirmations |
| **Encounter Rate** | Flat 10% per move | Original game rate, constant tension across all levels |
| **Encounter Data** | Separate `data/encounters/` files | Clean separation, explicit, easy to balance |
| **Stairs Transition** | Automatic on entry | Fast-paced dungeon crawling, momentum preservation |
| **Message Log** | Transient (5-10 messages) | Lightweight, current context only, doesn't bloat save files |
| **Architecture** | Service-heavy (6+ pure functions) | Matches established patterns, maximum testability, 100% coverage |
| **Layout** | 50/50 split (view + party) | Balanced information density, 2×3 character grid fits well |

### Monster Encounter System

**Data Structure**: Monsters are organized by dungeon level (not monster power level). Each level has its own encounter table defining which monsters can appear and their spawn weights.

**Research Source**: `docs/research/monster-reference.md` documents 96 monsters across 10 levels:
- Level 1: 12 monster types (Kobold, Orc, Zombie, Murphy's Ghost, etc.)
- Level 2: 5 monster types (Creeping Coin, Vorpal Bunny, etc.)
- Level 10: 16 monster types (Greater Demon, Vampire Lord, Werdna, etc.)

**Fixed Encounters**: Special boss battles like Murphy's Ghost (Level 1, position 13,5) have `fixedEncounter: true` in monster definition with exact coordinates.

## Architecture

### Service Layer (All Pure Functions)

#### 1. DungeonService
**Responsibility**: Map data loading and spatial queries

```typescript
interface DungeonService {
  loadLevel(level: number): LevelData;
  getTile(level: number, x: number, y: number): TileData;
  canMove(position: Position, direction: Direction): { allowed: boolean; reason?: string };
  getWallType(tile: TileData, direction: Direction): WallType;
  getVisibleTiles(position: Position, facing: Direction, lightRadius: number): TileData[];
  findStairsTile(level: number, type: 'stairs_up' | 'stairs_down', connectsTo: number): TileData;
}
```

**Key Features**:
- Loads 20×20 maps from `data/maps/level-X.json`
- Handles edge wrapping (x=20 wraps to x=0 when enabled)
- Returns tile at coordinates with O(1) lookup
- Validates movement against walls, doors, and boundaries
- Calculates 3-tile visibility cone for rendering

#### 2. NavigationService
**Responsibility**: Pure movement and rotation logic

```typescript
interface NavigationService {
  moveForward(state: GameState): GameState;
  moveBackward(state: GameState): GameState;
  strafeLeft(state: GameState): GameState;
  strafeRight(state: GameState): GameState;
  turnLeft(state: GameState): GameState;
  turnRight(state: GameState): GameState;

  getNextPosition(position: Position, direction: Direction): { x: number; y: number };
  rotateDirection(current: Direction, rotation: 'LEFT' | 'RIGHT'): Direction;
  handleSpecialTile(state: GameState, tile: TileData): { newState: GameState; messages: string[] };
  enterLevel(state: GameState, level: number, entryType: 'from_camp' | 'stairs_up' | 'stairs_down'): GameState;
}
```

**Key Features**:
- Immutable position updates (spread operator with Map)
- 6-direction movement (forward, back, strafe left/right, turn left/right)
- Special tile handling (teleporters, spinners, chutes)
- Correct entry point positioning when changing levels
- Edge wrapping calculation

#### 3. EncounterService
**Responsibility**: Random and fixed encounter generation

```typescript
interface EncounterService {
  rollRandomEncounter(): boolean;
  getEncounterTable(level: number): EncounterTable;
  generateEncounter(level: number): Encounter;
  getFixedEncounter(position: Position): Encounter | null;
  isEncounterDefeated(encounterId: string, defeatedList: string[]): boolean;
}
```

**Key Features**:
- 10% roll per movement action
- Weighted random selection from level's monster pool
- Fixed encounter lookup by position
- Tracks defeated encounters to prevent respawns

#### 4. DoorService
**Responsibility**: Door interaction and kick checks

```typescript
interface DoorService {
  canKickDoor(position: Position, facing: Direction, dungeon: DungeonState): boolean;
  kickDoor(state: GameState, direction: Direction): {
    success: boolean;
    damage?: number;
    newState: GameState;
    message: string
  };
}
```

**Key Features**:
- STR-based success check (higher STR = better chance)
- Failure causes 1-3 damage to kicker
- Success removes door from wall definition
- Validates door exists before kick attempt

#### 5. TileInspectionService
**Responsibility**: Searchable tile content discovery

```typescript
interface TileInspectionService {
  inspectTile(tile: TileData): { message: string; item?: Item };
  hasSearchableContent(tile: TileData): boolean;
}
```

**Key Features**:
- Reveals searchable content (bronze key at 13E,3N on Level 1)
- Returns tile description messages
- Item discovery integration

#### 6. MazeRenderingService
**Responsibility**: 3D wireframe generation for Canvas

```typescript
interface MazeRenderingService {
  generateView(position: Position, facing: Direction, tiles: TileData[]): CanvasCommand[];
  calculatePerspective(distance: number): { scale: number; offset: number };
}
```

**Key Features**:
- Returns drawing commands (lines, rectangles) for Canvas
- 3-tile depth with perspective scaling
- Near walls larger, far walls smaller
- Door/corridor/wall differentiation

### Component Layer

#### MazeComponent
**Responsibility**: Main scene orchestrator

**Key Features**:
- Keyboard input handling via `@HostListener`
- Service orchestration (call pure functions, update state)
- GameStateService integration
- Router navigation to Combat/Camp scenes
- Message log management (5-10 recent messages)

**Computed Signals**:
```typescript
position = computed(() => this.gameState.state().dungeon.position);
facing = computed(() => this.position().facing);
party = computed(() => this.gameState.state().party);
currentLevel = computed(() => this.gameState.state().dungeon.currentLevel);
sceneTitle = computed(() => `MAZE LEVEL ${this.currentLevel()}`);
```

#### MazeViewComponent
**Responsibility**: Canvas rendering consumer

**Key Features**:
- Receives drawing commands from MazeRenderingService
- Executes Canvas 2D API calls (lines, rectangles)
- Square aspect ratio (1:1)
- 60fps redraw on position change

#### ActiveSpellsComponent
**Responsibility**: Party spell status display

**Key Features**:
- MILWA/LOMILWA light spell indicator
- DUMAPIC coordinate display (Level X, (Y, Z), Facing)
- "No active spells" default state

#### MessageLogComponent
**Responsibility**: Scrolling event text

**Key Features**:
- Display last 5-10 messages
- Auto-scroll to newest
- Transient (not persisted to GameState)

## Data Structures

### GameState Extensions

```typescript
interface GameState {
  // ... existing fields
  dungeon: {
    currentLevel: number;        // 1-10
    position: {
      x: number;                 // 0-19
      y: number;                 // 0-19
      facing: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';
    };
    lightActive: boolean;        // MILWA/LOMILWA spell active
    lightRadius: number;         // 1 (default) or 3+ (with light spell)
    visitedTiles: Set<string>;   // "level-x-y" for mapping
    defeatedEncounters: string[]; // Fixed encounter IDs
  };
}
```

### New TypeScript Interfaces

```typescript
interface LevelData {
  level: number;
  size: { width: number; height: number };
  startPosition: { x: number; y: number; facing: Direction };
  edgeWrapping: boolean;
  tiles: TileData[];
  encounterTable: string;
}

interface TileData {
  x: number;
  y: number;
  walls: { north: WallType; east: WallType; south: WallType; west: WallType };
  type?: TileType;
  destination?: Destination;
  message?: string;
  item?: string;
  promptSearch?: boolean;
  encounterId?: string;
  repeatable?: boolean;
  cannotFlee?: boolean;
}

type WallType = 'open' | 'wall' | 'door' | 'secret';
type Direction = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';
type TileType = 'stairs_up' | 'stairs_down' | 'teleporter' | 'spinner' |
                'chute' | 'darkness_zone_start' | 'anti_magic' | 'searchable' |
                'fixed_encounter' | 'message' | 'elevator';

interface EncounterTable {
  levelId: string;
  encounterRate: number;
  monsters: MonsterEntry[];
}

interface MonsterEntry {
  monsterId: string;
  weight: number;
}
```

### New Data Files

**Format**: `data/encounters/level-X-encounters.json` (10 files)

**Example** (`level-1-encounters.json`):
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

**Weight Distribution**: Higher weight = more frequent spawns. Total weights don't need to sum to 100 (relative probability).

## UI Layout

### Grid Structure

```
┌─────────────────────────────────────────────────────┐
│ MAZE LEVEL 1                                        │
├──────────────────────────┬──────────────────────────┤
│                          │ Active Spells:           │
│                          │ 💡 MILWA (Radius: 1)     │
│                          ├──────────────────────────┤
│     3D Maze View         │ [Char 1]    [Char 2]     │
│     (Canvas 50%)         │                          │
│                          │ [Char 3]    [Char 4]     │
│                          │                          │
│                          │ [Char 5]    [Char 6]     │
│                          │ (2×3 grid, 50%)          │
├──────────────────────────┴──────────────────────────┤
│ Message Log:                                        │
│ You move forward.                                   │
│ You hear monsters nearby...                         │
│ (5-10 messages, scrollable)                         │
├─────────────────────────────────────────────────────┤
│ [C] Return to Camp  [K] Kick Door  [I] Inspect     │
└─────────────────────────────────────────────────────┘
```

**Responsive**: 50/50 split, stacked on mobile

## Error Handling & Edge Cases

### Movement Validation
- **Wall collision**: "You walk into a wall. Ouch!"
- **Door blocking**: "A door blocks your way. Press K to kick it open."
- **Secret door**: Invisible until found (Inspect or MILWA)
- **Edge wrapping**: x=20 → x=0 seamlessly when `edgeWrapping: true`

### Special Tile Handling
- **Stairs from Level 1 (0,0)**: Auto-transition to Castle/Camp
- **Teleporter loops**: Max 3 consecutive teleports, then stop with message
- **Spinner**: Random facing + "You feel disoriented!"
- **Chute**: Forced fall to lower level
- **Darkness zones**: `lightRadius = 0` regardless of MILWA
- **Anti-magic zones**: Block spell casting

### Encounter Edge Cases
- **Back-to-back encounters**: Allowed (brutal but authentic)
- **Fixed encounter defeated**: Check `defeatedEncounters[]`, treat as normal tile
- **No flee**: Fixed encounters with `cannotFlee: true` disable Run in Combat

### Door Interaction
- **No door present**: "There is no door here."
- **Already open**: "The door is already open."
- **Kick success**: STR-based check, door removed from walls
- **Kick failure**: 1-3 damage to character

### State Consistency
- **Position bounds**: 0 ≤ x < 20, 0 ≤ y < 20, level 1-10
- **Facing validity**: NORTH/SOUTH/EAST/WEST only
- **Tile existence**: Default tile if missing from JSON
- **Party requirement**: 1-6 active members (validated on entry)

### Level Transition Entry Points

**From Camp**: Place at `startPosition` from level JSON
- Level 1: `{ x: 0, y: 0, facing: 'north' }`

**From Lower Level (stairs_up)**: Find `stairs_down` tile on current level that connects to lower level
- Example: Going up from Level 2 → find stairs_down on Level 1 with `destination.level: 2`

**From Upper Level (stairs_down)**: Find `stairs_up` tile on current level that connects to upper level
- Example: Going down from Level 1 → find stairs_up on Level 2 with `destination.level: 1`

**Facing Preservation**: Maintain facing direction when transitioning between levels

**Fallback**: If no matching stairs found (data corruption), use level's `startPosition`

## Testing Strategy

### Service Unit Tests (TDD)

**Coverage Goal**: 100% (all pure functions, no excuses)

**DungeonService**:
- Load level 1-10 maps successfully
- Validate 20×20 grid structure
- Block movement when wall present
- Block movement when door present
- Allow movement when path open
- Return 3 visible tiles with light radius 3
- Return 1 visible tile with light radius 1
- Find stairs tiles correctly by destination level
- Return startPosition as fallback

**NavigationService**:
- Increment/decrement x/y for forward/backward
- Wrap x from 19→0 and 0→19 with edge wrapping
- Rotate facing 90° left/right
- Handle teleporter (new position + message)
- Handle spinner (random facing + message)
- Handle chute (level decrement + message)
- Enter level from camp at startPosition
- Enter level from stairs at correct connecting tile
- Preserve facing on level transition

**EncounterService**:
- Return true ~10% of time over 1000 rolls
- Generate encounters with level-appropriate monsters
- Respect monster weight distribution
- Return fixed encounter at specific position
- Return null for non-fixed encounter positions
- Check defeated status correctly

**DoorService**:
- Validate door exists before kick
- Success rate increases with STR stat
- Failure causes 1-3 damage
- Success removes door from walls
- Return appropriate messages

### Component Tests

**Coverage Goal**: 85%

**MazeComponent**:
- Update position when W pressed and path clear
- Show error message when moving into wall
- Transition to Combat on encounter trigger
- Add message to log on action
- Call correct service for each key press
- Update visible tiles after movement
- Navigate to Camp on C key

### Integration Tests

**Coverage Goal**: Critical paths

**Level Transition Flow**:
- Start at camp → Level 1 position (0,0)
- Navigate to stairs_down (0,10) → Level 2 at stairs_up
- Go back up stairs → Level 1 at stairs_down (0,10)
- Verify facing preserved throughout

**Encounter Flow**:
- Move 10 times, expect ~1 encounter
- Fixed encounter triggers at correct position
- Defeated fixed encounter doesn't retrigger
- Transition to Combat scene on encounter

**Special Tile Flow**:
- Teleporter moves party to destination
- Spinner randomizes facing
- Darkness zone sets lightRadius to 0

### Performance Requirements

- **Test suite**: <2 seconds total runtime
- **Rendering**: 60fps (Canvas redraw <16ms)
- **Map loading**: <100ms per level
- **Memory**: No leaks (visited tiles Set bounded, message log capped at 10)

## Implementation Phases

### Phase 1: Data & Services Foundation (Week 1)
**Deliverable**: All services with 100% test coverage, no UI

**Tasks**:
1. Create TypeScript interfaces in `src/types/`
2. Create 10 encounter table JSON files in `data/encounters/`
3. Implement DungeonService with tests (8 test cases minimum)
4. Implement NavigationService with tests (12 test cases minimum)
5. Implement EncounterService with tests (6 test cases minimum)
6. Verify 100% service test coverage

### Phase 2: Basic Maze Component (Week 2)
**Deliverable**: Working movement in maze (console logs, no rendering)

**Tasks**:
1. Create MazeComponent skeleton with routes
2. Add keyboard input handling (`@HostListener`)
3. Implement W/A/S/D/Q/E movement commands
4. Integrate GameStateService for position tracking
5. Add movement validation and error messages
6. Create MessageLogComponent
7. Write component tests (85% coverage)

### Phase 3: Canvas Rendering (Week 3)
**Deliverable**: Functional 3D wireframe view updates on movement

**Tasks**:
1. Implement MazeRenderingService
2. Create MazeViewComponent with Canvas element
3. Implement 3-tile depth rendering (near, mid, far)
4. Add perspective scaling (distance → scale factor)
5. Differentiate doors/corridors/walls visually
6. Add lighting effects (brightness by distance)
7. Test rendering at 60fps

### Phase 4: Party Status & UI Polish (Week 4)
**Deliverable**: Complete UI with party status and polished visuals

**Tasks**:
1. Create ActiveSpellsComponent
2. Integrate CharacterCardComponent in 2×3 grid
3. Add SceneFooterComponent with actions
4. Implement 50/50 responsive layout
5. Style for retro aesthetic (green phosphor CRT?)
6. Add loading states for map transitions
7. Test responsive breakpoints

### Phase 5: Special Tiles & Interactions (Week 5)
**Deliverable**: All special tile mechanics working

**Tasks**:
1. Implement DoorService with tests
2. Implement TileInspectionService with tests
3. Add teleporter handling in NavigationService
4. Add spinner handling with random facing
5. Add chute handling with level decrement
6. Add darkness zone effect (lightRadius = 0)
7. Add anti-magic zone effect (flag in state)
8. Add stairs automatic transitions
9. Test all special tile types

### Phase 6: Encounter Integration (Week 6)
**Deliverable**: Complete maze scene ready for combat

**Tasks**:
1. Wire up random encounter checks (10% per move)
2. Add fixed encounter checking with position lookup
3. Create scene transition to Combat (stub initially)
4. Track defeated encounters in GameState
5. Add "Return to Camp" action with scene transition
6. Test encounter generation distribution
7. Write integration tests for full navigation flow

## Dependencies

### Required Before Maze
- **Camp Scene**: Must exist as party staging area before entering dungeon
- **GameStateService**: Must support `dungeon` state extension
- **Router**: Scene transitions to Combat/Camp

### Can Be Stubbed
- **Combat Scene**: Stub transition initially, full integration in Phase 6
- **Spell System**: MILWA/LOMILWA/DUMAPIC effects can be mocked initially
- **Item System**: Searchable tile items can return placeholder data

### Data Dependencies
- All 10 level map JSONs must exist in `data/maps/`
- Monster JSONs must exist in `data/monsters/`
- Encounter tables must be created in `data/encounters/`

## Open Questions

1. **Werdna HP Discrepancy**: Monster reference doc shows 210-300 HP vs 30-120 in Strategy Wiki. Needs resolution before Level 10 encounters finalized.

2. **Chute Damage**: Original game - do chutes cause damage when falling? Need to verify mechanics.

3. **Darkness Zone Scope**: Does darkness affect entire level or just specific tiles? Level 1 has "darkness_zone_start" at (9,12) - need clarification on radius/extent.

4. **Encounter Table Weights**: Initial weights are estimated. May need balancing after playtesting to match original game feel.

5. **Retro Aesthetic**: CSS styling - exact color scheme for CRT phosphor green look? Need mockup approval.

## Success Criteria

- [ ] All 6 services implemented with 100% test coverage
- [ ] Maze component with keyboard navigation functional
- [ ] Canvas rendering at 60fps with 3-tile depth
- [ ] All special tiles (stairs, teleporters, spinners, chutes) working
- [ ] Random encounters trigger at ~10% rate
- [ ] Fixed encounters trigger at correct positions
- [ ] Entry points correct when transitioning between levels
- [ ] 2×3 character grid displays party status
- [ ] Active spells component shows MILWA/DUMAPIC
- [ ] Message log displays last 5-10 events
- [ ] Scene transitions to Combat/Camp work
- [ ] Test suite runs in <2 seconds
- [ ] No memory leaks during extended navigation

## Estimated Timeline

**Total**: 6 weeks

**Critical Path**: Phase 1 → Phase 2 → Phase 3 (data → movement → rendering)

**Parallel Work**: Phase 4 (UI) can overlap with Phase 5 (special tiles)

---

## Phase 5: Special Tiles & Interactions ✅ COMPLETE

**Status:** Complete (2025-11-07)
**Total Tests:** 1050+ passing
**Performance:** All targets met (<10ms per special tile, <3s suite)
**Coverage:** 82% overall

All special tile mechanics implemented and tested:
- ✅ Teleporters with loop prevention
- ✅ Spinners (random facing)
- ✅ Chutes (1-3 level fall, 1d6 damage per level)
- ✅ Pits (AGI-based avoidance, 1d6 damage)
- ✅ Darkness (per-tile lightRadius override)
- ✅ Anti-magic (tile flag check)
- ✅ Stairs (auto level change)
- ✅ Elevators (UI dialog with level selection)
- ✅ Searchable tiles (I key inspection)
- ✅ Fixed encounters (defeated list check)
- ✅ Message tiles (display text)
- ✅ Door kicking (K key, STR-based, encounter chance)

---

**Document Status**: Complete and approved for implementation
**Next Steps**: Create git worktree for feature branch, then detailed implementation plan
