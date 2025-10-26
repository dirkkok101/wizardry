# Service Layer Documentation

**Pure function services implementing business logic.**

## Service Catalog (43 Services)

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
14. [DispellService](./DispellService.md) - Dispel undead (Turn Undead)
15. [SpellCastingService](./SpellCastingService.md) - Spell resolution
16. [SpellLearningService](./SpellLearningService.md) - Learn new spells

### Town Services
17. [TownService](./TownService.md) - Town state management
18. [InnService](./InnService.md) - Rest, restore HP/spells
19. [TempleService](./TempleService.md) - Resurrection, cure status
20. [ShopService](./ShopService.md) - Buy/sell equipment
21. [TrainingService](./TrainingService.md) - Roster management, level-up

### Dungeon & Navigation
22. [MapService](./MapService.md) - Automap, exploration
23. [NavigationService](./NavigationService.md) - Movement validation
24. [EncounterService](./EncounterService.md) - Random encounters
25. [TileService](./TileService.md) - Tile effects (teleport, spinner)
26. [DoorService](./DoorService.md) - Door interactions

### Death & Recovery
27. [DeathService](./DeathService.md) - Character death
28. [BodyRecoveryService](./BodyRecoveryService.md) - Body retrieval
29. [ResurrectionService](./ResurrectionService.md) - DI/KADORTO spells
30. [StatusEffectService](./StatusEffectService.md) - Poison, paralyze, etc.

### Monsters & AI
31. [MonsterService](./MonsterService.md) - Monster stat loading
32. [MonsterAIService](./MonsterAIService.md) - Monster behavior
33. [GroupService](./GroupService.md) - Monster group management

### Rendering & UI
34. [FirstPersonViewService](./FirstPersonViewService.md) - 3D view calc
35. [AutomapService](./AutomapService.md) - Blueprint map rendering
36. [VisibilityService](./VisibilityService.md) - Tile visibility

### Persistence & Events
37. [EventService](./EventService.md) - Event creation
38. [ReplayService](./ReplayService.md) - Event replay
39. [SaveService](./SaveService.md) - IndexedDB persistence
40. [LoadService](./LoadService.md) - Load saved games

### Utility Services
41. [ValidationService](./ValidationService.md) - Data validation
42. [FormulaService](./FormulaService.md) - Game formulas (hit chance, etc.)
43. [RandomService](./RandomService.md) - RNG with seed support

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
