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
**Build Tool**: Vite
**Rendering**: HTML5 Canvas (first-person 3D-style view)
**Storage**: IndexedDB (saves + event replay data)
**Platform**: Modern web browsers (ES2020+)
**Testing**: Jest (unit + integration)
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

**Next**: See [Game Design Documentation](./game-design/README.md) for game mechanics.
