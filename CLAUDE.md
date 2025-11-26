# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a faithful remake of **Wizardry 1: Proving Grounds of the Mad Overlord** (1981) - a turn-based, party-based dungeon crawler with first-person 3D-style rendering using TypeScript, Angular, and HTML5 Canvas.

## Development Commands

```bash
# Development server with hot reload
npm start
# or
ng serve

# Build for production
npm run build
# or
ng build

# Run all tests (Jest)
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- PartyService

# Run tests with coverage
npm test -- --coverage

# Run tests matching pattern
npm test -- --testNamePattern="adds character"
```

## Architecture Overview

### Four-Layer Clean Architecture

```
UI Layer          → Canvas rendering, menus, input handling
    ↓
Command Layer     → Action orchestration (MovePartyCommand, CastSpellCommand, etc.)
    ↓
Service Layer     → Pure business logic functions (PartyService, CombatService, etc.)
    ↓
Data Layer        → GameState, persistence, event log
```

### Critical Design Principles

**Party-First Architecture**: The party is the primary game entity, not individual characters. All systems (movement, combat, inventory, death) operate on party context. This differs from single-character roguelikes and requires custom patterns.

**Event Sourcing**: Every action creates an event; game state is derived from event replay. Enables save/load as event streams, replay system, undo/redo, and debugging.

**Command Pattern**: All player actions as command objects enables undo/redo, action queuing (combat rounds), macro support, and replay from event log.

**Immutable State Updates**: All state changes create new state objects, never mutations. Use spread operator with Map updates:

```typescript
// Pattern for immutable updates
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

**Pure Service Functions**: Services are pure functions with no side effects. No mocking needed in tests. Always test with real data.

### Modal Game States

The game uses explicit state machine transitions:
- **TOWN**: Can access services, cannot move in dungeon
- **NAVIGATION**: Can move, search; encounters trigger combat
- **COMBAT**: Cannot move map, can attack/cast/flee
- **CHARACTER_CREATION**: Character creation flow

Invalid transitions are prevented at the architecture level.

### UI Action Pattern: Party vs Character

All scenes follow a consistent action placement pattern:

> **Party actions go in the footer menu. Character actions go on character/item cards.**

| Action Type | Location | Examples |
|-------------|----------|----------|
| **Party Actions** | Footer menu (SceneFooterComponent) | Return/Leave, Pool Gold, Movement (maze) |
| **Character Actions** | Character card buttons | Inspect, Cast Spell, Class Change, Delete |
| **Item Actions** | Item card buttons | Equip, Unequip, Trade, Drop, Use |

This pattern ensures:
- **Consistency** across all scenes (Temple, Tavern, Shop, Maze, Inspection)
- **Clear mental model** for users - footer = party, cards = individual
- **Keyboard shortcuts** for party actions (ESC, P, W/A/S/D)
- **Click interactions** for individual actions on cards

## Service Layer Guidelines

Services are **pure functions** organized by domain:
- **PartyService**: Formation (front/back rows), membership (1-6 characters), party positioning/facing
- **CombatService**: Initiative calculation, round-based combat resolution, damage calculation
- **SpellService**: Spell point management per level (1-7 separate pools), spell casting, spell learning
- **DungeonService**: Fixed map loading from JSON (10 levels, 20×20 each), tile resolution, encounter triggering
- **CharacterService**: Character creation, class eligibility, level-up with stat changes, status effects
- **BodyRecoveryService**: Dead body tracking in dungeon, body retrieval, character resurrection
- **SceneNavigationService**: Scene transitions with validation, auto-save logic for safe zones
- **AssetLoadingService**: Asset loading with caching, progress tracking, error handling
- **SaveService**: IndexedDB persistence, hybrid snapshot + event log approach
- **GameInitializationService**: Game state initialization and setup
- **RandomService**: Centralized random number generation with seeding and queue support for deterministic testing

Services can call other services but **no circular dependencies allowed**.

## Testing Strategy

**TDD (Test-Driven Development)**: Write tests first, then implementation.

**Test Framework**: Jest with jest-preset-angular for Angular-specific testing support.

**No Mocks for Services**: Services are pure functions - test with real data using factory functions.

**Colocated Tests**: Tests are colocated with source files using `__tests__/` subdirectories:
```
src/
├── services/
│   ├── __tests__/           # Service tests
│   │   ├── PartyService.spec.ts
│   │   └── CombatService.spec.ts
│   ├── PartyService.ts
│   └── CombatService.ts
└── app/
    └── app.component.spec.ts  # Angular component tests
```

**Test Naming Convention**:
```typescript
describe('ServiceName', () => {
  describe('methodName', () => {
    it('does something specific', () => {
      // Test implementation
    })
  })
})
```

**Factory Functions**: Use test factories from `tests/helpers/test-factories.ts` (create when needed):
- `createTestCharacter()` - Create test character with defaults
- `createEmptyParty()` - Create empty party
- `createFullParty()` - Create party with 6 members
- `createGameState()` - Create initial game state
- `createCombatState()` - Create combat scenario

**Coverage Goals**: Minimum 80% for all services and commands. 100% for critical paths (combat, spells, death/resurrection, leveling).

**Performance Requirements**: Test suite must run in <2.5 seconds. Use instant transitions in tests:
```typescript
// ✅ Always use instant transitions in tests
await SceneNavigationService.transitionTo(SceneType.CASTLE_MENU, {
  direction: 'instant'
})
```

**Anti-Patterns to Avoid**:
- Do NOT mock pure functions
- Do NOT test implementation details (test behavior)
- Do NOT share mutable state between tests (use `beforeEach`)
- Do NOT test multiple unrelated behaviors in one test
- Do NOT use `setTimeout()` in tests (use `queueMicrotask()` or fake timers)
- Do NOT forget to use `{ direction: 'instant' }` for scene transitions in tests
- Do NOT use `Math.random()` directly - always use `RandomService` for testability

**Deterministic Random Testing**: Use `RandomService` for all random number generation. This enables deterministic tests:
```typescript
// Queue specific values for precise test control (values consumed in order)
RandomService.queueNextValues([0.1, 0.5, 0.99])  // hit roll, damage roll, crit roll

// Use descriptive comments explaining what each value controls
RandomService.queueNextValues([0.5])  // 50% < 86% success rate = success

// For reproducible sequences, use seeded random
RandomService.setSeed(12345)

// RandomService auto-resets before each test via setup-jest.ts
```

**RandomService Methods**:
- `queueNextValues([...])` - Queue specific values for tests (most common)
- `setSeed(n)` - Set seed for reproducible sequences
- `resetSeed()` - Return to true random (auto-called before each test)
- `random(min, max)` - Integer in range [min, max]
- `roll(probability)` - Test probability (0-1 float)
- `chance(percent)` - Test percentage (0-100 integer)
- `rollDie(sides)` / `rollDice(count, sides)` - Dice rolls
- `pickRandom(array)` - Random element from array
- `weightedRandom(items, weights)` - Weighted selection

## Game-Specific Mechanics

**Spell System**: Uses **spell points**, not D&D vancian magic. Characters have separate point pools for each spell level (1-7). Each spell costs 1 point from its level pool. Only full rest at inn restores all points.

**Character Classes**: 4 basic classes (Fighter, Mage, Priest, Thief) and 4 advanced classes (Bishop, Samurai, Lord, Ninja) with strict stat requirements.

**Combat System**: Round-based with queued actions. All 6 party members select actions first, then resolve by initiative order (Agility + random(1-10) + action modifier).

**Party Formation**: Front row (max 3) takes melee hits and can melee attack. Back row (max 3) is protected but cannot melee attack (can use spells/ranged).

**Death & Body Recovery**: When a character dies in dungeon, body remains at death location. Party must retrieve the body and pay for resurrection at temple. Death states: DEAD → ASHES → LOST_FOREVER (based on resurrection success/failure).

**Fixed Dungeon**: Uses handcrafted 20×20 maps (not procedural generation). 10 levels total with pre-defined encounters, treasures, and special tiles.

**Scene-Based Navigation**: 14 total scenes with hub-and-spoke navigation centered on Castle Menu. Safe zones (town services) auto-save on entry. Dungeon zones never auto-save.

## File Organization

```
src/
├── index.html                # Application entry HTML
├── main.ts                   # Angular bootstrap entry point
├── styles.scss               # Global styles entry
├── styles/                   # SCSS partials
│   ├── variables.scss
│   └── retro-theme.scss
│
└── app/                      # Angular application
    ├── app.ts, app.config.ts, app.routes.ts, app.html, app.scss
    │
    ├── core/                 # Singleton services and guards
    │   └── guards/           # Route guards (party-exists, party-not-in-maze)
    │
    ├── shared/               # Reusable across the app
    │   ├── components/       # Shared UI components (21 total)
    │   │   ├── character-card/
    │   │   ├── scene-title/
    │   │   ├── scene-footer/
    │   │   ├── menu/
    │   │   ├── confirmation-dialog/
    │   │   └── ...
    │   └── directives/       # Custom directives (keystroke-input)
    │
    ├── scenes/               # Feature/page components (12 scenes)
    │   ├── title-screen/
    │   ├── castle-menu/
    │   ├── tavern/
    │   ├── temple/
    │   ├── shop/
    │   ├── inn/
    │   ├── training-grounds/
    │   ├── character-creation/
    │   ├── character-inspection/
    │   ├── spell-casting/
    │   ├── maze/
    │   └── combat-scene/
    │
    ├── services/             # Pure function services (business logic)
    │   ├── __tests__/        # Service tests
    │   ├── CharacterService.ts
    │   ├── CombatService.ts
    │   ├── PartyService.ts
    │   └── ...               # 40+ services
    │
    ├── types/                # TypeScript interfaces
    │   ├── __tests__/
    │   ├── Character.ts
    │   ├── GameState.ts
    │   └── ...
    │
    ├── utils/                # Utility functions and display helpers
    │   ├── __tests__/
    │   ├── GameStateQueries.ts
    │   └── CharacterDisplayHelpers.ts
    │
    ├── validation/           # Data validation schemas (Zod)
    │   ├── __tests__/
    │   ├── MonsterSchema.ts
    │   ├── item-schema.ts
    │   └── dungeon-schemas.ts
    │
    ├── config/               # Configuration and constants
    │   ├── CombatSettings.ts
    │   └── shop-inventory.ts
    │
    ├── rendering/            # WebGL rendering code
    │   └── shaders/          # GLSL shaders
    │
    └── testing/              # Test utilities and factories
        ├── __tests__/
        └── test-factories.ts

angular.json          # Angular CLI configuration
jest.config.js        # Jest test configuration
setup-jest.ts         # Jest setup file
tsconfig.json         # TypeScript base configuration
tsconfig.app.json     # TypeScript config for application
tsconfig.spec.json    # TypeScript config for tests

data/                 # Game data (source of truth) - JSON files
├── maps/             # level-01.json through level-10.json
├── spells/           # Individual spell JSON files
├── monsters/         # Individual monster JSON files
├── items/            # Individual item JSON files
├── races/            # Race definition JSON files
├── classes/          # Class definition JSON files
├── encounters/       # Level encounter definitions
└── textures/         # Texture assets

docs/
├── architecture.md     # Technical architecture overview
├── testing-strategy.md # Comprehensive testing guide
├── getting-started.md  # Onboarding for new developers
├── services/          # Service documentation (50+ files)
├── game-design/       # Game mechanics documentation
├── ui/               # UI/UX scene documentation (14 scenes)
├── systems/          # System design docs (combat, spells, etc.)
└── research/         # Source validation and research
```

## TypeScript Configuration

- **Strict mode enabled**: All code must satisfy strict TypeScript checks
- **No unused locals/parameters**: Compiler enforces clean code
- **ES2022 target**: Modern JavaScript features available
- **ESNext modules**: Use ES module syntax throughout

### Path Aliases

The project uses TypeScript path aliases for cleaner imports:

```typescript
// Instead of relative paths like:
import { CharacterService } from '../../services/CharacterService';

// Use path aliases:
import { CharacterService } from '@services/CharacterService';
```

Available aliases (configured in `tsconfig.json` and `jest.config.js`):

| Alias | Path |
|-------|------|
| `@app/*` | `src/app/*` |
| `@services/*` | `src/app/services/*` |
| `@types/*` | `src/app/types/*` |
| `@scenes/*` | `src/app/scenes/*` |
| `@shared/*` | `src/app/shared/*` |
| `@utils/*` | `src/app/utils/*` |
| `@config/*` | `src/app/config/*` |
| `@validation/*` | `src/app/validation/*` |
| `@testing/*` | `src/app/testing/*` |
| `@core/*` | `src/app/core/*` |
| `@rendering/*` | `src/app/rendering/*` |
| `@data/*` | `data/*` (root game data) |

## Key Constraints

1. **No Returning to Title Screen**: Once game starts, cannot transition back to TITLE_SCREEN
2. **Party Size Limits**: 1-6 characters maximum in active party
3. **Formation Limits**: Max 3 characters in front row, max 3 in back row
4. **Stat Range**: Character stats range from 3-18 (original Wizardry range)
5. **Spell Levels**: 7 levels for both mage and priest spells (1-7)
6. **Spell Points per Level**: 0-9 points maximum per spell level
7. **Map Dimensions**: All dungeon levels are exactly 20×20 tiles
8. **Inventory Limit**: 8 items maximum per character

## Documentation Resources

Before implementing any feature, **read the relevant documentation first**:

- **For Services**: `docs/services/<ServiceName>.md` contains detailed API, responsibilities, and examples
- **For Game Mechanics**: `docs/game-design/` has complete rules for classes, spells, combat, etc.
- **For UI Scenes**: `docs/ui/scenes/<scene-name>.md` has ASCII mockups, navigation, validation logic
- **For Systems**: `docs/systems/<system-name>.md` explains complex multi-service features

The documentation is comprehensive (13,250+ lines) and production-ready. Always consult docs before writing code.

## Development Workflow

1. Read relevant documentation in `docs/`
2. Write failing test (TDD approach)
3. Implement minimal code to pass test
4. Ensure immutable state updates (no mutations)
5. Verify service is pure function (no side effects)
6. Run tests: `npm test`
7. Commit frequently with clear messages

## Current Implementation Status

**Migration Status**: Angular migration complete - project now uses Angular framework at root level.

**Completed**:
- **Phases 1-4**: Core architecture and Angular migration
  - Angular project structure setup with Angular CLI
  - Migration from Vite to Angular build system
  - Migration from Vitest to Jest testing framework
  - Service layer migration (13+ core services)
  - Test suite migration to Jest with jest-preset-angular
  - Game data files and documentation preserved at root level

- **Phase 5**: Town Service Business Logic (Complete)
  - **Temple Component**: Healing, resurrection, cure services with tithe calculations
  - **Shop Component**: Buy, sell, identify flows with party-based gold system
  - **Training Grounds Component**: Complete 7-step character creation wizard
  - **CharacterService**: Class eligibility, character creation, validation (29 tests)
  - **TempleService**: Tithe calculations based on service type and character level
  - **ResurrectionService**: Success rate logic based on Vitality stat
  - **ShopService**: Buy/sell/identify pricing calculations
  - **InventoryService**: Character inventory management
  - **Integration Tests**: 5 E2E tests covering character creation and shop flows
  - **336 total tests passing** in **<4 seconds** (3.48s)
  - All placeholders removed, code polished

- **Phase 6**: Town Service Completion & Castle Integration (Complete)
  - **Tavern Component**: Party formation with alignment validation, gold divvy
  - **Inn Component**: 5 room types, HP healing, level-up processing, spell learning
  - **Character Inspection Component**: Full character sheet with stats, equipment, spells
  - **Utilities Component**: Save/load system with 3 slots, metadata display
  - **Castle Menu Component**: Enhanced with party display, navigation to all services
  - **PartyService**: Alignment validation, gold distribution (100% coverage)
  - **LevelUpService**: XP tables, HP rolls, stat increases (95% coverage)
  - **SpellLearningService**: Spell progression for Mage/Priest/Bishop (100% coverage)
  - **InnService**: Room costs, heal rates, rest mechanics (100% coverage)
  - **SaveService**: IndexedDB persistence with slot metadata (85% coverage)
  - **Integration Tests**: 9 E2E tests (6 new) covering town service workflows
  - **Performance Tests**: 3 tests verifying speed targets met
  - **501 total tests passing** in **7.8 seconds**
  - **89.07% code coverage** (exceeds 80% target)
  - See `docs/implementation/phase-6-summary.md` for full details

- **Temple Scene Modernization** (Complete)
  - **Architectural Updates**: Migrated to single-state architecture with SceneFooterComponent
  - **Components**: SceneTitleComponent + character card grid + SceneFooterComponent + ConfirmationDialogComponent
  - **State Management**: Removed multi-step view machine, uses computed signals for menu items
  - **Service Integration**: Auto-selects character when only one needs service, uses party gold pool
  - **Testing**: 14 component tests, 1 integration test for full service flow
  - **Documentation**: Updated ASCII mockups, navigation tables, and state diagrams
  - **791 total tests passing** in **20 seconds**
  - See `docs/plans/2025-11-05-temple-scene-modernization.md` for implementation plan

**Next Steps**:
- **Phase 7**: Dungeon navigation and combat system
  - Maze scene (3D Canvas rendering, movement) - Complete with inspect and spell casting
  - Combat scene (turn-based battles)
  - Chest scene (loot and traps)
  - Encounter system (monster spawning, initiative)
  - Spell casting (combat and utility spells)
