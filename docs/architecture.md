# Wizardry Remake - Technical Architecture

**Version**: 1.1
**Last Updated**: 2025-10-26

---

## 1. Architecture Overview

### 1.1 Design Philosophy

**Party-First Architecture**: Built around party management as core abstraction, not single-character roguelike patterns.

**Why**: Wizardry's party-based mechanics are fundamentally different from single-character roguelikes. Starting with party architecture ensures systems are designed correctly rather than retrofitted.

### 1.2 Four-Layer Architecture

```
┌─────────────────────────────────────────┐
│ UI Layer (First-Person + Menus)        │
│ - Canvas 3D-style dungeon view         │
│ - Party stats panel                     │
│ - Combat interface                      │
│ - Character sheets, spell selection    │
│ - Blueprint-style automap              │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Command Layer                           │
│ - MovePartyCommand                      │
│ - TurnCommand, StrafeCommand            │
│ - CastSpellCommand                      │
│ - AttackCommand (combat)                │
│ - RestCommand, SearchCommand, etc.      │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Service Layer                           │
│ - PartyService (formation, positioning) │
│ - CombatService (round-based timeline)  │
│ - SpellService (spell points, casting)  │
│ - DungeonService (map loading)          │
│ - CharacterService (classes, leveling)  │
│ - MapService (automap, exploration)     │
│ - BodyRecoveryService (death handling)  │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Data Layer                              │
│ - GameState (party, dungeon, turn)      │
│ - Character Roster (all created chars)  │
│ - Data files: spells.json, monsters.json│
│ - Event log (replay system)             │
│ - IndexedDB (saves + replay data)       │
└─────────────────────────────────────────┘
```

See [Architecture Diagram](./diagrams/architecture-layers.md) for detailed visual.

### 1.3 Code Organization: Vertical Slice by Scene

**Decision**: Organize code by game scenes using vertical slice architecture, with shared infrastructure in services.

**Rationale**: In a game remake, scenes ARE the features from a player's perspective. Each scene (Title Screen, Castle Menu, Training Grounds, Tavern, Maze, Combat, etc.) represents a distinct player-facing feature with its own UI, commands, and logic.

**Structure**:
```
/src
  /scenes
    /title-screen-scene
      - TitleScreenScene.ts (scene implementation)
      /commands
        - StartGameCommand.ts (scene-specific commands)
      /components (future: reusable UI components)
    /castle-menu-scene
      - CastleMenuScene.ts
      /commands (future: menu navigation commands)
    /camp-scene
      - CampScene.ts
      /commands (future: camp commands)
  /services (truly shared infrastructure)
    - SceneNavigationService.ts
    - AssetLoadingService.ts
    - InputService.ts
    - SaveService.ts
    - GameInitializationService.ts
  /managers
    - SceneManager.ts (scene lifecycle orchestration)
  /types
    - SceneType.ts (scene enumeration)
```

**Benefits**:
- **Scene-Focused Development**: All code for a scene lives together (scene class, commands, components)
- **Clear Feature Boundaries**: Each scene folder represents a distinct game feature
- **Easier Navigation**: Developers can find all title screen code in `/scenes/title-screen-scene`
- **Reduced Coupling**: Commands are scoped to scenes that use them
- **Shared Services**: Truly common infrastructure (input, assets, saves) remains in `/services`

**Example - Title Screen Scene**:
- **TitleScreenScene.ts**: Canvas rendering, animation, scene lifecycle
- **commands/StartGameCommand.ts**: Business logic for starting game (new game vs load game)
- Future: **components/Button.ts**: Reusable button component

### 1.4 Reusable UI Components

Beyond scene-specific components, certain UI patterns appear across multiple scenes and are implemented as shared, reusable components:

- **SceneTitleComponent**: Standardized header for scenes with consistent styling and layout. Used in Training Grounds, Character Creation, and other scenes.
- **SceneFooterComponent**: Standardized footer containing navigation menu and scene-specific actions. Wraps MenuComponent for consistent navigation across scenes.
- **MenuComponent**: Horizontal button menu for scene navigation and actions. Used within SceneFooter.

These components enforce UI consistency across scenes while allowing scenes to customize which menu options are available.

See [Scene Architecture](./scenes/README.md) for detailed scene implementation patterns.

## 2. Core Patterns

### 2.1 Event Sourcing

Every action creates an event. Game state derived from event replay.

**Benefits**:
- Save/load as event streams
- Replay system (watch game playback)
- Undo/redo support
- Debugging (step through events)

### 2.2 Command Pattern

All player actions as command objects.

**Benefits**:
- Undo/redo capability
- Action queuing (combat rounds)
- Macro support
- Replay from event log
- Commands don't implement game logic
- Commands orchestrate between services (which do implement game logic)

### 2.3 Service Layer Separation

Pure functions, no side effects.

**Benefits**:
- Easy testing (no mocks needed)
- Parallel execution safe
- Deterministic outcomes
- State transitions explicit
- Implements game logic
- Orchestrated by commands

## 3. Technology Stack

**Language**: TypeScript (strict mode)
**Build Tool**: Angular CLI + esbuild
**Framework**: Angular 19
**Rendering**: HTML5 Canvas (first-person 3D-style view)
**Storage**: IndexedDB (saves + event replay data)
**Platform**: Modern web browsers (ES2020+)
**Testing**: Jest with jest-preset-angular (unit + integration + performance)
**Data Files**: JSON (spells, monsters, items, maps)

## 4. Key Design Decisions

### 4.1 Party as Core Abstraction

**Decision**: Party is the primary game entity, not individual characters.

**Rationale**: Wizardry is party-based. All systems (movement, combat, inventory, death) operate on party context.

**Impact**:
- Party has position, facing, active members
- Characters belong to roster, subset active in party
- Movement moves entire party
- Combat involves entire party formation

### 4.2 Modal Game States

**States**: TOWN, NAVIGATION, COMBAT, CHARACTER_CREATION, CAMP

**Decision**: Explicit state machine prevents invalid transitions.

**Rationale**: Different modes have different valid actions.

**Impact**:
- Town: Can't move in dungeon, can access services
- Navigation: Can move, search, camp, encounter triggers combat
- Combat: Can't move map, can attack/cast/flee
- Clear state transitions prevent bugs

### 4.3 Spell Points (Not Slots)

**Decision**: Wizardry 1 uses spell points per level, not memorized slots.

**Rationale**: Validated against original game sources.

**Impact**:
- Separate point pools for each spell level (1-7)
- Each spell costs 1 point from its level
- Inn rest restores all points
- Simpler than D&D vancian magic

## 5. Service Architecture

### 5.1 Service Responsibilities

Each service handles one domain:
- **PartyService**: Formation, membership, position
- **CombatService**: Initiative, resolution, damage
- **SpellService**: Spell points, casting, learning
- **DungeonService**: Map loading, tile resolution
- **CharacterService**: Classes, stats, leveling

### 5.2 Service Dependencies

Services can call other services, but no circular dependencies.

**Example**: CombatService uses SpellService (for spell effects) but SpellService doesn't use CombatService.

See [Service Dependency Diagram](./diagrams/service-dependencies.md)

## 6. Data Model

### 6.1 Core Entities

- **Character**: Race, class, stats, spells, equipment, status
- **Party**: Active characters (1-6), formation (front/back), position, facing
- **GameState**: Mode, party, roster, dungeon level, event log
- **Combatant**: Unified interface for characters & monsters

### 6.2 Immutable Updates

All state changes create new state (no mutations).

**Pattern**:
```typescript
function updateCharacterHP(state: GameState, charId: string, newHP: number): GameState {
  return {
    ...state,
    roster: new Map(state.roster).set(charId, {
      ...state.roster.get(charId)!,
      hp: newHP
    })
  }
}
```

## 7. Testing Strategy

### 7.1 Service Testing

Pure function testing, no mocks:
```typescript
test('PartyService.addMember adds character to party', () => {
  const party = createEmptyParty()
  const character = createTestCharacter()

  const result = PartyService.addMember(party, character)

  expect(result.members).toHaveLength(1)
  expect(result.members[0]).toBe(character)
})
```

### 7.2 Command Testing

Test orchestration logic:
```typescript
test('MoveForwardCommand updates party position', () => {
  const state = createGameState()
  const command = new MoveForwardCommand()

  const result = command.execute(state)

  expect(result.party.position.y).toBe(state.party.position.y + 1)
})
```

See [Testing Strategy](./testing-strategy.md) for full approach.

---

## 8. Rendering Architecture

### 8.1 Dual Renderer System

The game implements two rendering engines that can be toggled for different visual styles:

**Raycasting Renderer** (Default):
- Mathematical DDA (Digital Differential Analyzer) algorithm
- Casts 600 rays per frame (one per screen column)
- Smooth, authentic retro 3D appearance
- Performance: ~2ms per frame (562 FPS theoretical max)

**Wireframe Renderer** (Alternative):
- 3D wireframe projection of visible geometry
- 5-column peripheral vision grid
- Spatial awareness with visible walls at all distances
- Performance: ~8ms per frame (125 FPS theoretical max)

Both renderers:
- Support the same dungeon data format
- Use identical game logic and state
- Render to the same 600×600px canvas
- Can be toggled at runtime via configuration

### 8.2 Raycasting Renderer

#### Algorithm Overview

Uses the **DDA (Digital Differential Analyzer)** algorithm for efficient grid traversal:

1. Cast one ray per screen column (600 rays for 600px width)
2. Each ray steps through grid cells until hitting a wall
3. Calculate perpendicular distance (prevents fisheye distortion)
4. Render wall column with height inversely proportional to distance
5. Apply distance-based fog (linear interpolation from 1.0 to 0.2 brightness)

#### Mathematical Foundation

**Ray Direction Calculation**:
```
cameraX = (2 × screenX / screenWidth) - 1    // Range: -1 to +1
rayDirX = playerDirX + planePlaneX × cameraX
rayDirY = playerDirY + planePlaneY × cameraX
```

**Perpendicular Distance** (Critical for fisheye correction):
```
perpDist = sideDistX - deltaDistX  (for vertical walls)
perpDist = sideDistY - deltaDistY  (for horizontal walls)
```

**Wall Height Projection**:
```
wallHeight = screenHeight / perpDistance
```

**Distance Fog Formula**:
```
brightness = 1.0 - ((distance - fogStart) / (fogEnd - fogStart)) × 0.8
brightness = clamp(brightness, 0.2, 1.0)
```

#### Performance Characteristics

From performance benchmarks:

```
Single Frame (600×600 resolution):
  Average render time: 1.78ms
  Maximum render time: 3.21ms
  Rays cast per frame: 600
  Commands generated: 350-450 (varies by view)

Multi-Frame (60 frames):
  Average frame time: 1.78ms
  Theoretical max FPS: 562
```

**Performance Advantages**:
- 4x faster than wireframe renderer
- No geometry generation overhead
- Direct fillRect commands (one per wall column)
- Minimal floating-point math

#### Services

**RaycastingService**:
- Implements DDA algorithm
- Casts individual rays through grid
- Returns wall hits with perpendicular distance
- Supports toroidal map wrapping
- See [RaycastingService](./services/RaycastingService.md)

**RaycastingRenderingService**:
- Generates canvas commands from ray hits
- Calculates wall heights and screen positions
- Applies color scheme and distance fog
- Returns array of fillRect commands
- See [RaycastingRenderingService](./services/RaycastingRenderingService.md)

**PlayerStateService**:
- Converts discrete Position to continuous PlayerState
- Pre-computes direction vectors and camera plane
- Handles 90-degree FOV configuration
- See [PlayerStateService](./services/PlayerStateService.md)

#### Color Scheme

Matching wireframe aesthetic:

```typescript
wallNS: '#666666'       // Vertical walls (lighter)
wallEW: '#444444'       // Horizontal walls (darker)
door: '#8B4513'         // Doors (brown)
lockedDoor: '#8B0000'   // Locked doors (dark red)
secretDoor: '#000000'   // Secret doors (black/invisible)
ceiling: '#1a1a1a'      // Dark gray ceiling
floor: '#0d0d0d'        // Very dark gray floor
```

NS/EW differentiation creates depth perception through lighting differences.

### 8.3 Wireframe Renderer

#### Algorithm Overview

Uses **3D wireframe projection** with spatial awareness:

1. Build 5-column grid of visible tiles (center + peripheral vision)
2. For each visible tile, generate 3D wireframe geometry
3. Project wireframe to screen coordinates using camera matrices
4. Cull back-facing geometry and frustum clip
5. Render lines with depth-based coloring

#### Spatial Awareness Features

**5-Column Peripheral Vision**:
```
Columns:  -2  -1   0  +1  +2
           ╔═══╦═══╬═══╦═══╗
           ║   ║   ║ ▲ ║   ║
           ║   ║   ║ │ ║   ║
           ╚═══╩═══╩═══╩═══╝
              Peripheral  Center
```

**Relaxed Frustum Culling**:
- Peripheral walls visible up to ±60 degrees
- Creates wider field of view than raycaster
- Better spatial awareness for navigation

**Distance-Based Depth**:
- Near walls: Bright lines (#00ff00)
- Far walls: Darker lines (fades to #003300)

#### Performance Characteristics

```
Single Frame (600×600 resolution):
  Average render time: ~8ms
  Theoretical max FPS: 125
  Geometry generated: 50-100 wireframe segments
```

**Performance Trade-off**:
- Slower than raycasting (4x)
- Better spatial awareness
- Visible walls at all distances
- More complex geometry generation

### 8.4 Renderer Comparison

| Feature | Raycasting | Wireframe |
|---------|-----------|-----------|
| **Performance** | ~2ms/frame | ~8ms/frame |
| **Visual Style** | Solid walls, fog | Wireframe, depth lines |
| **Spatial Awareness** | Limited (forward view) | Excellent (5-column grid) |
| **Distance Rendering** | Fog fades far walls | All walls visible |
| **Peripheral Vision** | 66° FOV | 5-column grid (±60°) |
| **Aesthetic** | Authentic retro 3D | Technical blueprint |
| **Complexity** | Simple (DDA only) | Complex (3D projection) |

### 8.5 Renderer Toggle Mechanism

**Configuration-Based Toggle**:
```typescript
// In MazeComponent or renderer configuration
const useRaycasting = true; // Toggle between renderers

if (useRaycasting) {
  const commands = raycastRenderer.generateRaycastCommands(level, position, config);
  this.executeCommands(commands);
} else {
  const commands = wireframeRenderer.generateCommands(level, position, config);
  this.executeCommands(commands);
}
```

**Runtime Switching**:
- No data conversion required (both use same LevelData)
- Same canvas element (600×600px)
- Same game state and logic
- Instant toggle with no initialization overhead

### 8.6 Rendering Pipeline Integration

```
GameState (party position, dungeon level)
    ↓
MazeComponent (render orchestration)
    ↓
┌─────────────────┬─────────────────┐
│  Raycasting     │  Wireframe      │
│  Renderer       │  Renderer       │
│  (~2ms/frame)   │  (~8ms/frame)   │
└─────────────────┴─────────────────┘
    ↓                   ↓
CanvasCommand[]    CanvasCommand[]
    ↓                   ↓
    └───────┬───────────┘
            ↓
    Canvas Execution
            ↓
    Rendered Frame
```

Both renderers output identical CanvasCommand structure, enabling seamless switching.

### 8.7 Future Rendering Enhancements

**Raycasting Extensions**:
- Texture mapping (sample textures per wall column)
- Sprite rendering (enemies, items)
- Floor/ceiling texture mapping
- Parallax scrolling effects

**Wireframe Extensions**:
- Colored wireframes based on tile type
- Animation of wireframe vertices
- Minimap integration
- Entity wireframe outlines

---

## 9. Research and References

### 9.1 Raycasting Implementation

The raycasting renderer implementation is based on extensive research documented in:

**Research Files**:
- [Raycasting Algorithms Pseudocode](./research/renderer/raycasting-algorithms-pseudocode.md) - 595 lines of detailed algorithm documentation
- [Implementation Guide](./research/renderer/implementation-guide.md) - 506 lines of step-by-step implementation instructions
- [Raycasting Quick Reference](./research/renderer/raycasting-quick-reference.md) - Mathematical formulas and key concepts
- [Dungeon Raycaster Demo](./research/renderer/dungeon-raycaster-demo.html) - Working HTML5 demo
- [Dungeon Renderer Implementation](./research/renderer/dungeon-renderer-implementation.ts) - Reference TypeScript implementation

**Key Mathematical Concepts**:
- DDA grid traversal algorithm
- Perpendicular distance calculation (fisheye correction)
- 2D rotation matrices for player movement
- Linear fog interpolation
- Camera plane calculation for field of view

**References**:
- Lode's Computer Graphics Tutorial (raycasting)
- Wolfenstein 3D source code analysis
- Classic raycasting papers from 1990s

See [Architecture Diagram](./diagrams/architecture-layers.md) for detailed visual.

---

**Next**: See [Game Design Documentation](./game-design/README.md) for game mechanics.
