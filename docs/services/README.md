# Service Layer Documentation

**Pure function services implementing business logic.**

## Service Catalog (40+ Services)

### Core Services
1. [PartyService](./PartyService.md) - Party formation, membership
2. [CombatService](./CombatService.md) - Combat resolution
3. [SpellService](./SpellService.md) - Spell casting, points, learning
4. [CharacterService](./CharacterService.md) - Stats, classes, progression
5. [DungeonService](./DungeonService.md) - Map loading, tile resolution

### Character & Progression
6. [CharacterCreationService](./CharacterCreationService.md) - Creation flow
7. [LevelingService](./LevelingService.md) - XP, level-up, stat changes
8. [ClassChangeService](./ClassChangeService.md) - Class changing
9. [EquipmentService](./EquipmentService.md) - Equipment management
10. [InventoryService](./InventoryService.md) - Item management

### Combat & Spells
11. [InitiativeService](./InitiativeService.md) - Combat initiative
12. [AttackService](./AttackService.md) - Attack resolution
13. [DamageService](./DamageService.md) - Damage calculation
14. [SpellCastingService](./SpellCastingService.md) - Spell resolution
15. [SpellLearningService](./SpellLearningService.md) - Learn new spells

### Town Services
16. [TownService](./TownService.md) - Town state management
17. [InnService](./InnService.md) - Rest, restore HP/spells
18. [TempleService](./TempleService.md) - Resurrection, cure status
19. [ShopService](./ShopService.md) - Buy/sell equipment
20. [TrainingService](./TrainingService.md) - Roster management, level-up

### Dungeon & Navigation
21. [MapService](./MapService.md) - Automap, exploration
22. [NavigationService](./NavigationService.md) - Movement validation
23. [EncounterService](./EncounterService.md) - Random encounters
24. [TileService](./TileService.md) - Tile effects (teleport, spinner)
25. [DoorService](./DoorService.md) - Door interactions

### Death & Recovery
26. [DeathService](./DeathService.md) - Character death
27. [BodyRecoveryService](./BodyRecoveryService.md) - Body retrieval
28. [ResurrectionService](./ResurrectionService.md) - DI/KADORTO spells
29. [StatusEffectService](./StatusEffectService.md) - Poison, paralyze, etc.

### Monsters & AI
30. [MonsterService](./MonsterService.md) - Monster stat loading
31. [MonsterAIService](./MonsterAIService.md) - Monster behavior
32. [GroupService](./GroupService.md) - Monster group management

### Rendering & UI
33. [FirstPersonViewService](./FirstPersonViewService.md) - 3D view calc
34. [AutomapService](./AutomapService.md) - Blueprint map rendering
35. [VisibilityService](./VisibilityService.md) - Tile visibility

### Persistence & Events
36. [EventService](./EventService.md) - Event creation
37. [ReplayService](./ReplayService.md) - Event replay
38. [SaveService](./SaveService.md) - IndexedDB persistence
39. [LoadService](./LoadService.md) - Load saved games

### Utility Services
40. [ValidationService](./ValidationService.md) - Data validation
41. [FormulaService](./FormulaService.md) - Game formulas (hit chance, etc.)
42. [RandomService](./RandomService.md) - RNG with seed support

## Service Principles

**Pure Functions**: No side effects, deterministic
**Single Responsibility**: Each service handles one domain
**Testable**: Easy to test without mocks
**Composable**: Services call other services

## Getting Started

1. Read [Creation Guide](./creation-guide.md) to create new services
2. Read [Patterns](./patterns.md) for common patterns
3. Read [Testing Guide](./testing-guide.md) for testing approach
4. Check individual service docs for API reference
