# Data Loading Services Documentation

**Service layer for loading and managing game data from JSON files.**

## Overview

The data loading services provide a consistent interface for loading, caching, and querying all game data types. Each data type has its own specialized service that handles loading individual JSON files from the data directory.

## Architecture

### Design Principles

1. **Individual File Loading**: Each data item (class, spell, item, etc.) is stored as a separate JSON file
2. **Lazy Loading**: Load data on demand to reduce initial load time
3. **Caching**: Cache loaded data in memory for performance
4. **Type Safety**: All data validated against TypeScript interfaces
5. **Query Interface**: Provide convenient methods for querying data

### Service Hierarchy

```
DataLoaderService (base)
├── ClassDataService
├── RaceDataService
├── SpellDataService
├── ItemDataService
├── MonsterDataService
└── MapDataService
```

## Core Services

### 1. DataLoaderService

**Base service providing generic JSON file loading functionality.**

#### Location
`src/services/data/DataLoaderService.ts`

#### Responsibilities
- Load JSON files from disk
- Parse and validate JSON
- Handle file system errors
- Provide caching mechanism

#### Interface

```typescript
interface DataLoaderService {
  /**
   * Load a single JSON file
   * @param path - Relative path from project root
   * @returns Parsed JSON object
   * @throws DataLoadError if file not found or invalid JSON
   */
  loadFile<T>(path: string): Promise<T>;

  /**
   * Load multiple JSON files from a directory
   * @param directory - Directory path relative to project root
   * @param pattern - Optional glob pattern (default: "*.json")
   * @returns Array of parsed JSON objects with filenames
   */
  loadDirectory<T>(directory: string, pattern?: string): Promise<Array<{ filename: string; data: T }>>;

  /**
   * Check if a file exists
   * @param path - File path to check
   * @returns true if file exists
   */
  fileExists(path: string): Promise<boolean>;
}
```

#### Usage Example

```typescript
const loader = new DataLoaderService();

// Load single file
const fighter = await loader.loadFile<Class>('data/classes/fighter.json');

// Load directory
const allClasses = await loader.loadDirectory<Class>('data/classes');
```

### 2. ClassDataService

**Service for loading and querying character class data.**

#### Location
`src/services/data/ClassDataService.ts`

#### Data Source
- Directory: `data/classes/`
- Files: 8 individual class JSON files
  - `fighter.json`, `mage.json`, `priest.json`, `thief.json`
  - `bishop.json`, `samurai.json`, `lord.json`, `ninja.json`

#### Interface

```typescript
interface ClassDataService {
  /**
   * Load all class data
   * @returns Map of class ID to Class object
   */
  loadAll(): Promise<Map<string, Class>>;

  /**
   * Get a specific class by ID
   * @param classId - Class identifier (e.g., "fighter", "ninja")
   * @returns Class object or undefined
   */
  getClass(classId: string): Promise<Class | undefined>;

  /**
   * Get all basic classes (Fighter, Mage, Priest, Thief)
   * @returns Array of basic Class objects
   */
  getBasicClasses(): Promise<Class[]>;

  /**
   * Get all elite classes (Bishop, Samurai, Lord, Ninja)
   * @returns Array of elite Class objects
   */
  getEliteClasses(): Promise<Class[]>;

  /**
   * Get classes a character qualifies for
   * @param stats - Character stats
   * @param alignment - Character alignment
   * @returns Array of qualifying Class objects
   */
  getQualifyingClasses(stats: Stats, alignment: Alignment): Promise<Class[]>;

  /**
   * Check if character meets class requirements
   * @param classId - Class to check
   * @param stats - Character stats
   * @param alignment - Character alignment
   * @returns true if character qualifies
   */
  meetsRequirements(classId: string, stats: Stats, alignment: Alignment): Promise<boolean>;
}
```

#### Usage Example

```typescript
const classService = new ClassDataService();

// Load all classes
await classService.loadAll();

// Get specific class
const fighter = await classService.getClass('fighter');

// Check requirements
const stats = { str: 15, int: 12, pie: 10, vit: 14, agi: 10, luc: 12 };
const canBeSamurai = await classService.meetsRequirements('samurai', stats, 'good');

// Get qualifying classes
const qualifyingClasses = await classService.getQualifyingClasses(stats, 'good');
```

### 3. RaceDataService

**Service for loading and querying race data.**

#### Location
`src/services/data/RaceDataService.ts`

#### Data Source
- Directory: `data/races/`
- Files: 5 individual race JSON files
  - `human.json`, `elf.json`, `dwarf.json`, `gnome.json`, `hobbit.json`

#### Interface

```typescript
interface RaceDataService {
  /**
   * Load all race data
   * @returns Map of race ID to Race object
   */
  loadAll(): Promise<Map<string, Race>>;

  /**
   * Get a specific race by ID
   * @param raceId - Race identifier (e.g., "human", "elf")
   * @returns Race object or undefined
   */
  getRace(raceId: string): Promise<Race | undefined>;

  /**
   * Get all races
   * @returns Array of all Race objects
   */
  getAllRaces(): Promise<Race[]>;

  /**
   * Calculate stat minimums for a race and class
   * @param raceId - Race identifier
   * @param classId - Class identifier
   * @returns Minimum bonus points needed
   */
  calculateBonusPointsNeeded(raceId: string, classId: string): Promise<number>;

  /**
   * Get best races for a specific class
   * @param classId - Class identifier
   * @returns Array of Race objects sorted by suitability
   */
  getBestRacesForClass(classId: string): Promise<Race[]>;
}
```

#### Usage Example

```typescript
const raceService = new RaceDataService();

// Load all races
await raceService.loadAll();

// Get specific race
const elf = await raceService.getRace('elf');

// Get best races for Mage
const bestMageRaces = await raceService.getBestRacesForClass('mage');
// Returns: [elf, gnome, human, ...]

// Calculate bonus points needed
const bonusNeeded = await raceService.calculateBonusPointsNeeded('hobbit', 'ninja');
// Returns: 52
```

### 4. SpellDataService

**Service for loading and querying spell data.**

#### Location
`src/services/data/SpellDataService.ts`

#### Data Source
- Directory: `data/spells/`
- Files: 56 individual spell JSON files
  - Mage spells: 23 spells across 7 levels
  - Priest spells: 33 spells across 7 levels

#### Interface

```typescript
interface SpellDataService {
  /**
   * Load all spell data
   * @returns Map of spell ID to Spell object
   */
  loadAll(): Promise<Map<string, Spell>>;

  /**
   * Get a specific spell by ID
   * @param spellId - Spell identifier (e.g., "halito", "dios")
   * @returns Spell object or undefined
   */
  getSpell(spellId: string): Promise<Spell | undefined>;

  /**
   * Get all spells of a specific type
   * @param spellType - "mage" or "priest"
   * @returns Array of Spell objects
   */
  getSpellsByType(spellType: 'mage' | 'priest'): Promise<Spell[]>;

  /**
   * Get all spells of a specific level
   * @param spellType - "mage" or "priest"
   * @param level - Spell level (1-7)
   * @returns Array of Spell objects
   */
  getSpellsByLevel(spellType: 'mage' | 'priest', level: number): Promise<Spell[]>;

  /**
   * Get spells a character can learn
   * @param characterClass - Character's class
   * @param characterLevel - Character's level
   * @returns Array of learnable Spell objects
   */
  getLearnableSpells(characterClass: Class, characterLevel: number): Promise<Spell[]>;

  /**
   * Get spells castable in a specific context
   * @param context - "combat", "dungeon", or "town"
   * @returns Array of Spell objects
   */
  getSpellsByContext(context: 'combat' | 'dungeon' | 'town'): Promise<Spell[]>;
}
```

#### Usage Example

```typescript
const spellService = new SpellDataService();

// Load all spells
await spellService.loadAll();

// Get specific spell
const halito = await spellService.getSpell('halito');

// Get all level 1 mage spells
const level1Mage = await spellService.getSpellsByLevel('mage', 1);
// Returns: [DUMAPIC, HALITO, KATINO, MOGREF]

// Get spells character can learn
const learnableSpells = await spellService.getLearnableSpells(mageClass, 3);

// Get combat spells
const combatSpells = await spellService.getSpellsByContext('combat');
```

### 5. ItemDataService

**Service for loading and querying item/equipment data.**

#### Location
`src/services/data/ItemDataService.ts`

#### Data Source
- Directory: `data/items/`
- Files: 80+ individual item JSON files
- Categories: weapons, armor, shields, helmets, gauntlets, accessories, consumables, special

#### Interface

```typescript
interface ItemDataService {
  /**
   * Load all item data
   * @returns Map of item ID to Item object
   */
  loadAll(): Promise<Map<string, Item>>;

  /**
   * Get a specific item by ID
   * @param itemId - Item identifier (e.g., "dagger", "murasama_blade")
   * @returns Item object or undefined
   */
  getItem(itemId: string): Promise<Item | undefined>;

  /**
   * Get all items of a specific category
   * @param category - Item category ("weapon", "armor", "shield", etc.)
   * @returns Array of Item objects
   */
  getItemsByCategory(category: string): Promise<Item[]>;

  /**
   * Get items usable by a specific class
   * @param classId - Class identifier
   * @param category - Optional category filter
   * @returns Array of usable Item objects
   */
  getUsableItems(classId: string, category?: string): Promise<Item[]>;

  /**
   * Get items within a price range
   * @param minCost - Minimum cost
   * @param maxCost - Maximum cost
   * @returns Array of Item objects
   */
  getItemsByPriceRange(minCost: number, maxCost: number): Promise<Item[]>;

  /**
   * Get cursed items
   * @returns Array of cursed Item objects
   */
  getCursedItems(): Promise<Item[]>;

  /**
   * Get items with special abilities
   * @returns Array of Item objects with special properties
   */
  getSpecialItems(): Promise<Item[]>;
}
```

#### Usage Example

```typescript
const itemService = new ItemDataService();

// Load all items
await itemService.loadAll();

// Get specific item
const murasama = await itemService.getItem('murasama_blade');

// Get all weapons
const weapons = await itemService.getItemsByCategory('weapon');

// Get items usable by Mage
const mageItems = await itemService.getUsableItems('mage');

// Get affordable items (under 1000 gold)
const affordableItems = await itemService.getItemsByPriceRange(0, 1000);

// Get cursed items
const cursedItems = await itemService.getCursedItems();
```

### 6. MonsterDataService

**Service for loading and querying monster data.**

#### Location
`src/services/data/MonsterDataService.ts`

#### Data Source
- Directory: `data/monsters/`
- Files: 96 individual monster JSON files

#### Interface

```typescript
interface MonsterDataService {
  /**
   * Load all monster data
   * @returns Map of monster ID to Monster object
   */
  loadAll(): Promise<Map<string, Monster>>;

  /**
   * Get a specific monster by ID
   * @param monsterId - Monster identifier (e.g., "bubbly_slime", "werdna")
   * @returns Monster object or undefined
   */
  getMonster(monsterId: string): Promise<Monster | undefined>;

  /**
   * Get monsters by dungeon level
   * @param level - Dungeon level (1-10)
   * @returns Array of Monster objects
   */
  getMonstersByLevel(level: number): Promise<Monster[]>;

  /**
   * Get monsters by type
   * @param type - Monster type ("undead", "demon", "dragon", etc.)
   * @returns Array of Monster objects
   */
  getMonstersByType(type: string): Promise<Monster[]>;

  /**
   * Get boss monsters
   * @returns Array of boss Monster objects
   */
  getBossMonsters(): Promise<Monster[]>;

  /**
   * Get fixed encounter monsters
   * @returns Array of fixed encounter Monster objects
   */
  getFixedEncounters(): Promise<Monster[]>;

  /**
   * Get monsters that can cast spells
   * @returns Array of spellcasting Monster objects
   */
  getSpellcasters(): Promise<Monster[]>;
}
```

#### Usage Example

```typescript
const monsterService = new MonsterDataService();

// Load all monsters
await monsterService.loadAll();

// Get specific monster
const werdna = await monsterService.getMonster('werdna');

// Get all level 1 monsters
const level1Monsters = await monsterService.getMonstersByLevel(1);

// Get all undead monsters
const undeadMonsters = await monsterService.getMonstersByType('undead');

// Get all bosses
const bosses = await monsterService.getBossMonsters();

// Get spellcasters
const spellcasters = await monsterService.getSpellcasters();
```

### 7. MapDataService

**Service for loading and querying dungeon map data.**

#### Location
`src/services/data/MapDataService.ts`

#### Data Source
- Directory: `data/maps/`
- Files: 10 dungeon level JSON files
  - `level1.json` through `level10.json`

#### Interface

```typescript
interface MapDataService {
  /**
   * Load all map data
   * @returns Map of level number to DungeonLevel object
   */
  loadAll(): Promise<Map<number, DungeonLevel>>;

  /**
   * Get a specific dungeon level
   * @param level - Level number (1-10)
   * @returns DungeonLevel object or undefined
   */
  getLevel(level: number): Promise<DungeonLevel | undefined>;

  /**
   * Get a specific tile
   * @param level - Level number (1-10)
   * @param x - X coordinate (0-19)
   * @param y - Y coordinate (0-19)
   * @returns Tile object or undefined
   */
  getTile(level: number, x: number, y: number): Promise<Tile | undefined>;

  /**
   * Get all tiles of a specific type
   * @param level - Level number (1-10)
   * @param type - Tile type (e.g., "stairs_down", "teleporter", "chest")
   * @returns Array of Tile objects
   */
  getTilesByType(level: number, type: string): Promise<Tile[]>;

  /**
   * Get fixed encounters on a level
   * @param level - Level number (1-10)
   * @returns Array of Tile objects with fixed encounters
   */
  getFixedEncounters(level: number): Promise<Tile[]>;

  /**
   * Get special tiles (stairs, elevators, teleporters, etc.)
   * @param level - Level number (1-10)
   * @returns Array of special Tile objects
   */
  getSpecialTiles(level: number): Promise<Tile[]>;

  /**
   * Check if a tile has a specific wall type
   * @param tile - Tile to check
   * @param direction - Direction ("north", "south", "east", "west")
   * @param wallType - Wall type to check for
   * @returns true if wall matches type
   */
  hasWallType(tile: Tile, direction: Direction, wallType: string): boolean;
}
```

#### Usage Example

```typescript
const mapService = new MapDataService();

// Load all maps
await mapService.loadAll();

// Get specific level
const level1 = await mapService.getLevel(1);

// Get specific tile
const tile = await mapService.getTile(1, 0, 0);

// Get all stairs on level 1
const stairs = await mapService.getTilesByType(1, 'stairs_down');

// Get fixed encounters on level 10
const fixedEncounters = await mapService.getFixedEncounters(10);

// Check wall type
const hasDoor = mapService.hasWallType(tile, 'north', 'door');
```

## Implementation Guidelines

### 1. Initialization

Services should be initialized at application startup:

```typescript
// In main application initialization
async function initializeDataServices() {
  const classService = new ClassDataService();
  const raceService = new RaceDataService();
  const spellService = new SpellDataService();
  const itemService = new ItemDataService();
  const monsterService = new MonsterDataService();
  const mapService = new MapDataService();

  // Preload critical data
  await Promise.all([
    classService.loadAll(),
    raceService.loadAll(),
    // Load others lazily as needed
  ]);

  return {
    classService,
    raceService,
    spellService,
    itemService,
    monsterService,
    mapService,
  };
}
```

### 2. Caching Strategy

Each service should implement internal caching:

```typescript
class ClassDataService {
  private cache: Map<string, Class> = new Map();
  private loaded: boolean = false;

  async loadAll(): Promise<Map<string, Class>> {
    if (this.loaded) {
      return this.cache;
    }

    const loader = new DataLoaderService();
    const files = await loader.loadDirectory<Class>('data/classes');

    for (const { data } of files) {
      this.cache.set(data.id, data);
    }

    this.loaded = true;
    return this.cache;
  }

  async getClass(classId: string): Promise<Class | undefined> {
    if (!this.loaded) {
      await this.loadAll();
    }
    return this.cache.get(classId);
  }
}
```

### 3. Error Handling

Services should handle errors gracefully:

```typescript
class DataLoadError extends Error {
  constructor(
    public readonly filePath: string,
    public readonly reason: string,
    public readonly originalError?: Error
  ) {
    super(`Failed to load data from ${filePath}: ${reason}`);
    this.name = 'DataLoadError';
  }
}

// Usage
try {
  const data = await loader.loadFile('data/classes/fighter.json');
} catch (error) {
  if (error instanceof DataLoadError) {
    console.error(`Data load failed: ${error.message}`);
    console.error(`File: ${error.filePath}`);
    console.error(`Reason: ${error.reason}`);
  }
  throw error;
}
```

### 4. Type Safety

All services should use TypeScript interfaces:

```typescript
// Define interfaces for all data types
interface Class {
  id: string;
  name: string;
  type: 'basic' | 'elite';
  description: string;
  requirements: Record<string, number>;
  // ... other fields
}

interface Race {
  id: string;
  name: string;
  baseStats: Stats;
  // ... other fields
}

// Use interfaces in service methods
async getClass(classId: string): Promise<Class | undefined> {
  // TypeScript ensures returned data matches Class interface
}
```

### 5. Performance Optimization

#### Lazy Loading
Load data only when needed:

```typescript
// Don't load all items at startup
const itemService = new ItemDataService();

// Load specific item on demand
const dagger = await itemService.getItem('dagger');
// Only loads dagger.json
```

#### Bulk Loading
Load multiple related items efficiently:

```typescript
// Load all level 1 spells at once
const level1Spells = await spellService.getSpellsByLevel('mage', 1);
// Loads multiple spell files in parallel
```

#### Preloading Critical Data
Load frequently accessed data at startup:

```typescript
// Preload classes and races (small datasets)
await Promise.all([
  classService.loadAll(),
  raceService.loadAll(),
]);

// Lazy load items, monsters, maps (larger datasets)
```

## Testing

Each service should have comprehensive tests:

```typescript
describe('ClassDataService', () => {
  let service: ClassDataService;

  beforeEach(() => {
    service = new ClassDataService();
  });

  test('loadAll loads all 8 classes', async () => {
    const classes = await service.loadAll();
    expect(classes.size).toBe(8);
  });

  test('getClass returns Fighter', async () => {
    const fighter = await service.getClass('fighter');
    expect(fighter).toBeDefined();
    expect(fighter?.name).toBe('Fighter');
  });

  test('getBasicClasses returns 4 classes', async () => {
    const basicClasses = await service.getBasicClasses();
    expect(basicClasses.length).toBe(4);
  });

  test('meetsRequirements validates Samurai requirements', async () => {
    const stats = { str: 15, int: 11, pie: 10, vit: 14, agi: 10, luc: 10 };
    const meets = await service.meetsRequirements('samurai', stats, 'good');
    expect(meets).toBe(true);
  });
});
```

## Integration with Game Systems

### Character Creation

```typescript
// Get available races
const races = await raceService.getAllRaces();

// User selects race
const selectedRace = await raceService.getRace('elf');

// Roll bonus points and calculate stats
const stats = calculateStats(selectedRace, bonusPoints);

// Get qualifying classes
const qualifyingClasses = await classService.getQualifyingClasses(stats, alignment);
```

### Combat System

```typescript
// Load monster data
const monster = await monsterService.getMonster('werdna');

// Check if character can cast spell
const spell = await spellService.getSpell('halito');
if (spell.castableIn.includes('combat')) {
  // Cast spell
}
```

### Equipment Management

```typescript
// Get items character can use
const usableWeapons = await itemService.getUsableItems('fighter', 'weapon');

// Check if item is cursed
const item = await itemService.getItem('deadly_ring');
if (item.cursed) {
  // Warn player
}
```

### Dungeon Exploration

```typescript
// Get current tile
const tile = await mapService.getTile(currentLevel, x, y);

// Check if can move north
if (tile.walls.north === 'wall') {
  // Can't move
} else if (tile.walls.north === 'door') {
  // Open door
} else {
  // Move freely
}
```

## File Organization

Recommended source directory structure:

```
src/
  services/
    data/
      DataLoaderService.ts       # Base loader
      ClassDataService.ts        # Class data
      RaceDataService.ts         # Race data
      SpellDataService.ts        # Spell data
      ItemDataService.ts         # Item data
      MonsterDataService.ts      # Monster data
      MapDataService.ts          # Map data
      index.ts                   # Export all services
```

## Future Enhancements

### 1. Save Game Integration
Services could be extended to load custom/modified data from save games:

```typescript
interface SaveGameDataService extends DataLoaderService {
  loadSaveGameData(saveId: string): Promise<SaveGameData>;
  mergeWithBaseData(): void;
}
```

### 2. Modding Support
Services could load custom mod data:

```typescript
interface ModDataService {
  loadModData(modId: string): Promise<void>;
  getModItems(): Promise<Item[]>;
  getModMonsters(): Promise<Monster[]>;
}
```

### 3. Data Validation
Add runtime validation to ensure data integrity:

```typescript
interface DataValidator {
  validateClass(data: unknown): Class;
  validateItem(data: unknown): Item;
  validateSpell(data: unknown): Spell;
}
```

## Summary

The data loading services provide:

- **Consistent Interface**: All data types loaded the same way
- **Type Safety**: TypeScript ensures data integrity
- **Performance**: Caching and lazy loading optimize memory and speed
- **Modularity**: Each service is independent and testable
- **Extensibility**: Easy to add new data types or enhance existing services

**Total Services**: 7 (1 base + 6 specialized)

**Data Types Supported**: 6 (classes, races, spells, items, monsters, maps)

**Total Data Files**: 245+ individual JSON files

**Last Updated**: 2025-10-26
