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
- **NAVIGATION**: Can move, search, camp; encounters trigger combat
- **COMBAT**: Cannot move map, can attack/cast/flee
- **CHARACTER_CREATION**: Character creation flow
- **CAMP**: Pre-dungeon staging area

Invalid transitions are prevented at the architecture level.

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
├── app/              # Angular components and modules
│   ├── app.component.ts
│   ├── app.component.spec.ts
│   └── app.config.ts
├── services/         # Pure function services (business logic)
│   ├── __tests__/    # Service tests
│   ├── AssetLoadingService.ts
│   ├── CharacterService.ts
│   ├── GameInitializationService.ts
│   ├── InputService.ts
│   ├── SaveService.ts
│   └── SceneNavigationService.ts
├── types/            # TypeScript interfaces (GameState, Party, Character, etc.)
├── assets/           # Static assets and game data (copied from data/)
├── main.ts           # Angular bootstrap entry point
├── index.html        # Application entry HTML
└── styles.scss       # Global styles

angular.json          # Angular CLI configuration
jest.config.js        # Jest test configuration
setup-jest.ts         # Jest setup file
tsconfig.json         # TypeScript base configuration
tsconfig.app.json     # TypeScript config for application
tsconfig.spec.json    # TypeScript config for tests

data/                 # Game data (source of truth)
├── maps/             # level-01.json through level-10.json
├── spells/           # mage-spells.json, priest-spells.json
├── monsters/         # monsters.json
└── items/            # weapons.json, armor.json, consumables.json

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
- **ES2020 target**: Modern JavaScript features available
- **ESNext modules**: Use ES module syntax throughout

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
- Angular project structure setup with Angular CLI
- Migration from Vite to Angular build system
- Migration from Vitest to Jest testing framework
- Service layer migration (6 core services migrated):
  - AssetLoadingService
  - CharacterService
  - GameInitializationService
  - InputService
  - SaveService
  - SceneNavigationService
- Test suite migration to Jest with jest-preset-angular
- Game data files and documentation preserved at root level
- Comprehensive documentation (14/14 UI scenes, all core services, all game systems)

**Next Steps**:
- Continue implementing UI layer with Angular components
- Migrate canvas rendering to Angular services/components
- Implement remaining services and commands following the documentation in `docs/services/` and `docs/commands/`
- Add Angular-specific features (dependency injection, change detection optimization)
