# Services Documentation

**Documentation for all game services and system components.**

## Overview

This directory contains documentation for the service layer of the Wizardry remake. Services are responsible for managing game state, data loading, business logic, and coordination between different game systems.

## Service Categories

### Data Services

**[Data Loading Services](./data-services.md)** - Load and manage game data from JSON files

Services for loading static game data:
- **DataLoaderService**: Base service for JSON file loading
- **ClassDataService**: Character class data (8 classes)
- **RaceDataService**: Race data (5 races)
- **SpellDataService**: Spell data (56 spells)
- **ItemDataService**: Item/equipment data (80+ items)
- **MonsterDataService**: Monster data (96 monsters)
- **MapDataService**: Dungeon map data (10 levels)

### Core System Services

**[SceneNavigationService](./SceneNavigationService.md)** - Scene lifecycle and transitions

Manages navigation between game scenes with state machine pattern:
- Scene transitions with fade effects
- Navigation history and back stack
- Lifecycle hooks (onEnter, onExit, onUpdate)
- Scene validation and error handling
- Preloading support for next scene

**[AssetLoadingService](./AssetLoadingService.md)** - Progressive asset loading

Two-phase asset loading strategy:
- Critical path loading (title screen bitmap)
- Parallel loading (fonts, audio, sprites)
- Progress tracking and callbacks
- Error handling and retry logic
- Asset manifest management

**[InputService](./InputService.md)** - Cross-platform input handling

Unified input abstraction for keyboard, mouse, and touch:
- Single keystroke waiting (title screen mode)
- Key press handlers with validation
- Button click handlers
- Input state management (enabled/disabled)
- Event cleanup and memory management

**[GameInitializationService](./GameInitializationService.md)** - New game creation

Creates initial game state with default values:
- Empty character roster
- Starting gold (0)
- Quest flags (all false)
- Initial party state (empty, at castle)
- New game detection

### State Management Services

**[SaveService](./SaveService.md)** - Game state persistence

Serializes game state and event log to IndexedDB:
- Save game to slots (save1-save10, autosave, quicksave)
- Metadata management (timestamp, description, play time)
- Compression support (50-70% size reduction)
- Checksum generation for integrity
- Autosave triggers (level change, party wipe, 10 min interval)

**[LoadService](./LoadService.md)** - Save game loading

Loads and deserializes saved games:
- Load from save slots
- Checksum verification (detect corruption)
- Version migration (upgrade old saves)
- State reconstruction from event log
- Quickload and autosave loading

**[ReplayService](./ReplayService.md)** - Event replay and time-travel

Reconstructs game state from event streams:
- Replay events to rebuild state
- Time-travel to specific event
- Undo/redo functionality
- State snapshots (every 100 events)
- State diff calculation

**[EventService](./EventService.md)** - Event creation and management

Event sourcing system for all state changes:
- Create typed events (movement, combat, spell, character, level)
- Event validation and schema
- Event serialization/deserialization
- Event metadata (timestamp, session ID)
- 20+ event types defined

## Service Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                   Game Application Layer                      │
└───────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌───────────────────────────────────────────────────────────────┐
│                      Service Layer                            │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Data Services│  │ Core System  │  │State Mgmt    │       │
│  │              │  │  Services    │  │  Services    │       │
│  │ • Classes    │  │              │  │              │       │
│  │ • Races      │  │ • Scene Nav  │  │ • Save       │       │
│  │ • Spells     │  │ • Assets     │  │ • Load       │       │
│  │ • Items      │  │ • Input      │  │ • Replay     │       │
│  │ • Monsters   │  │ • Game Init  │  │ • Events     │       │
│  │ • Maps       │  │              │  │              │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
│  ┌──────────────────────────────────────────────────┐        │
│  │         Game Logic Services (Planned)            │        │
│  │  • Character  • Combat  • Inventory  • Party     │        │
│  └──────────────────────────────────────────────────┘        │
└───────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌───────────────────────────────────────────────────────────────┐
│                      Data & Storage Layer                     │
│                                                               │
│  • JSON files in data/ directory (245+ files)                 │
│  • IndexedDB (save games, event logs)                         │
│  • Asset files (images, audio, fonts)                         │
└───────────────────────────────────────────────────────────────┘
```

## Design Principles

### 1. Separation of Concerns
- **Data Services**: Load and query static data
- **Game Services**: Manage game state and logic
- **Command Services**: Handle user actions

### 2. Single Responsibility
Each service has one clear purpose:
- ClassDataService only handles class data
- CombatService only handles combat logic
- No service does multiple unrelated things

### 3. Dependency Injection
Services should receive dependencies via constructor:

```typescript
class CharacterService {
  constructor(
    private classService: ClassDataService,
    private raceService: RaceDataService,
    private itemService: ItemDataService
  ) {}
}
```

### 4. Type Safety
All services use TypeScript interfaces for data and method signatures

### 5. Testability
Services should be easy to test in isolation with mocked dependencies

## Service Guidelines

### Initialization

Services should be initialized at application startup:

```typescript
// Initialize data services
const dataServices = await initializeDataServices();

// Initialize game services with data service dependencies
const gameServices = initializeGameServices(dataServices);
```

### Error Handling

Services should throw specific error types:

```typescript
class ServiceError extends Error {
  constructor(
    public readonly service: string,
    public readonly operation: string,
    public readonly reason: string
  ) {
    super(`${service}.${operation} failed: ${reason}`);
  }
}
```

### State Management

Services that manage state should:
- Use clear state interfaces
- Provide state change events/callbacks
- Support state serialization for save games

### Performance

Services should:
- Cache frequently accessed data
- Lazy load large datasets
- Use async/await for I/O operations
- Batch operations when possible

## Available Documentation

### Data Services (7 services)
- **[DataLoaderService](./data-services.md#dataloaderservice)** - Base JSON file loader
- **[ClassDataService](./data-services.md#classdataservice)** - Character class data
- **[RaceDataService](./data-services.md#racedataservice)** - Race data
- **[SpellDataService](./data-services.md#spelldataservice)** - Spell data
- **[ItemDataService](./data-services.md#itemdataservice)** - Item/equipment data
- **[MonsterDataService](./data-services.md#monsterdataservice)** - Monster data
- **[MapDataService](./data-services.md#mapdataservice)** - Dungeon map data

### Core System Services (4 services)
- **[SceneNavigationService](./SceneNavigationService.md)** - Scene lifecycle and transitions
- **[AssetLoadingService](./AssetLoadingService.md)** - Progressive asset loading
- **[InputService](./InputService.md)** - Cross-platform input handling
- **[GameInitializationService](./GameInitializationService.md)** - New game creation

### State Management Services (4 services)
- **[SaveService](./SaveService.md)** - Game state persistence to IndexedDB
- **[LoadService](./LoadService.md)** - Save game loading and validation
- **[ReplayService](./ReplayService.md)** - Event replay and time-travel debugging
- **[EventService](./EventService.md)** - Event creation and management

### Planned Services
- **Game Logic Services** - Character, combat, inventory, party, dungeon
- **Command Services** - User action handlers (movement, combat, spell, town)

## Implementation Status

| Service Category | Services | Documentation | Implementation |
|-----------------|----------|---------------|----------------|
| Data Services | 7 | ✅ Complete | ⚠️ Planned |
| Core System Services | 4 | ✅ Complete | ✅ Complete |
| State Management Services | 1/4 | ✅ Complete | SaveService ✅ |
| Game Logic Services | 0 | ⚠️ Pending | ⚠️ Pending |
| Command Services | 0 | ⚠️ Pending | ⚠️ Pending |

**Total Documented:** 15 services
**Total Implemented:** 5 services

### Implemented Services

**Core System Services (4/4)** - ✅ Complete
- ✅ **SceneNavigationService** - Scene lifecycle and transitions (`src/services/SceneNavigationService.ts:1`)
- ✅ **AssetLoadingService** - Progressive asset loading (`src/services/AssetLoadingService.ts:1`)
- ✅ **InputService** - Cross-platform input handling (`src/services/InputService.ts:1`)
- ✅ **GameInitializationService** - New game creation (`src/services/GameInitializationService.ts:1`)

**State Management Services (1/4)**
- ✅ **SaveService** - Game state persistence (`src/services/SaveService.ts:1`)
- ⚠️ **LoadService** - Planned
- ⚠️ **ReplayService** - Planned
- ⚠️ **EventService** - Planned

**Managers (1)**
- ✅ **SceneManager** - Scene lifecycle orchestration (`src/managers/SceneManager.ts:1`)

**Scenes (3)**
- ✅ **TitleScreenScene** - Title screen with asset loading (`src/scenes/title-screen-scene/TitleScreenScene.ts:1`)
- ✅ **CastleMenuScene** - Castle menu placeholder (`src/scenes/castle-menu-scene/CastleMenuScene.ts:1`)
- ✅ **CampScene** - Camp placeholder (`src/scenes/camp-scene/CampScene.ts:1`)

**Scene Commands (1)**
- ✅ **StartGameCommand** - Start game logic (new/load) (`src/scenes/title-screen-scene/commands/StartGameCommand.ts:1`)

## Next Steps

1. **Implementation Phase** - Begin implementing the 15 documented services
   - Start with Core System Services (scene navigation, assets, input, game init)
   - Implement Data Services (7 loaders for JSON data)
   - Implement State Management Services (save/load/replay/events)

2. **Type Definitions** - Create TypeScript interfaces for all documented services

3. **Testing** - Write comprehensive unit tests following test specifications in docs

4. **Additional Documentation** - Document remaining service categories
   - Game Logic Services (character, combat, inventory, party, dungeon)
   - Command Services (movement, combat, spell, town commands)

5. **Integration** - Wire up services to Title Screen scene for first functional implementation

## Related Documentation

- **[Data Format Specifications](../data-format/README.md)** - JSON file format documentation
- **[Architecture](../architecture.md)** - Overall system architecture
- **[Commands](../commands/README.md)** - Command pattern documentation
- **[Title Screen Implementation Plan](../plans/title-screen-implementation-plan.md)** - First scene implementation
- **[Title Screen Scene Spec](../ui/scenes/00-title-screen.md)** - Title screen design
- **[Save/Load Architecture](../analysis/save-load-architecture.md)** - Event sourcing design

## Contributing

When documenting new services:

1. Create a new markdown file in this directory
2. Include complete interface definitions
3. Provide usage examples
4. Document error handling
5. Include testing approach
6. Update this README with links

## Last Updated

2025-10-26
