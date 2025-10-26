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

## Service Architecture

```
┌─────────────────────────────────────────────────┐
│           Game Application Layer                │
└─────────────────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────┐
│              Service Layer                      │
│                                                 │
│  ┌──────────────┐  ┌──────────────┐           │
│  │ Data Services│  │ Game Services│           │
│  │              │  │              │           │
│  │ • Classes    │  │ • Character  │           │
│  │ • Races      │  │ • Combat     │           │
│  │ • Spells     │  │ • Inventory  │           │
│  │ • Items      │  │ • Party      │           │
│  │ • Monsters   │  │ • Dungeon    │           │
│  │ • Maps       │  │ • Save/Load  │           │
│  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────┐
│              Data Layer                         │
│                                                 │
│  • JSON files in data/ directory                │
│  • Individual files per entity                  │
│  • 245+ data files total                        │
└─────────────────────────────────────────────────┘
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

### Current
- **[Data Services](./data-services.md)** - Data loading and querying services

### Planned
- **Game Services** - Game state management services
  - CharacterService
  - CombatService
  - InventoryService
  - PartyService
  - DungeonService
  - SaveGameService

- **Command Services** - User action handlers
  - MovementCommands
  - CombatCommands
  - InventoryCommands
  - SpellCommands
  - TownCommands

## Implementation Status

| Service Category | Status | Documentation |
|-----------------|--------|---------------|
| Data Services | ⚠️ Planned | ✅ Complete |
| Game Services | ⚠️ Planned | ⚠️ Pending |
| Command Services | ⚠️ Planned | ⚠️ Pending |

## Next Steps

1. Implement data loading services based on documentation
2. Create TypeScript interfaces for all data types
3. Write unit tests for data services
4. Document game state management services
5. Document command pattern services

## Related Documentation

- **[Data Format Specifications](../data-format/README.md)** - JSON file format documentation
- **[Architecture](../architecture.md)** - Overall system architecture
- **[Commands](../commands/README.md)** - Command pattern documentation

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
