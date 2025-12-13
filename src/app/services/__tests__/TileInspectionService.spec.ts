import { TileInspectionService } from '../TileInspectionService';
import { LevelData, Position } from '@models/Dungeon';
import { GameState } from '@models/GameState';
import { createTestCharacter, createTestGameState } from '@testing/test-factories';
import { Item } from '@models/Item';
import { ItemType, ItemSlot } from '@models/ItemType';
import { ItemDataLoader } from '../ItemDataLoader';

// Helper function to create test items
const createItem = (id: string, name: string, overrides: Partial<Item> = {}): Item => ({
  id,
  name,
  type: ItemType.WEAPON,
  slot: ItemSlot.WEAPON,
  price: 100,
  damage: 5,
  cursed: false,
  identified: true,
  equipped: false,
  ...overrides
})

describe('TileInspectionService', () => {
  beforeEach(() => {
    // Mock ItemDataLoader.getItem to return test items
    jest.spyOn(ItemDataLoader, 'getItem').mockImplementation((itemId: string) => {
      return createItem(itemId, itemId.replace(/_/g, ' '))
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('getTileMessage', () => {
    const level: LevelData = {
      level: 1,
      name: 'Test Level',
      size: { width: 20, height: 20 },
      startPosition: { x: 0, y: 0, facing: 'north' },
      edgeWrapping: false,
      tiles: [
        { x: 0, y: 0, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' } },
        { x: 1, y: 0, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' }, message: 'A mysterious inscription!' },
        { x: 2, y: 0, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' }, types: ['searchable'], item: 'key', message: 'A glowing statue!' },
      ],
      encounterRate: 0.1,
      encounterTable: 'level_1',
    };

    it('returns undefined for tile without message', () => {
      const position: Position = { x: 0, y: 0, facing: 'NORTH' };
      const result = TileInspectionService.getTileMessage(level, position);
      expect(result).toBeUndefined();
    });

    it('returns message for tile with message', () => {
      const position: Position = { x: 1, y: 0, facing: 'NORTH' };
      const result = TileInspectionService.getTileMessage(level, position);
      expect(result).toBe('A mysterious inscription!');
    });

    it('returns message for searchable tile with message', () => {
      const position: Position = { x: 2, y: 0, facing: 'NORTH' };
      const result = TileInspectionService.getTileMessage(level, position);
      expect(result).toBe('A glowing statue!');
    });
  });

  describe('hasTileMessage', () => {
    const level: LevelData = {
      level: 1,
      name: 'Test Level',
      size: { width: 20, height: 20 },
      startPosition: { x: 0, y: 0, facing: 'north' },
      edgeWrapping: false,
      tiles: [
        { x: 0, y: 0, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' } },
        { x: 1, y: 0, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' }, message: 'A warning sign!' },
      ],
      encounterRate: 0.1,
      encounterTable: 'level_1',
    };

    it('returns false for tile without message', () => {
      const position: Position = { x: 0, y: 0, facing: 'NORTH' };
      const result = TileInspectionService.hasTileMessage(level, position);
      expect(result).toBe(false);
    });

    it('returns true for tile with message', () => {
      const position: Position = { x: 1, y: 0, facing: 'NORTH' };
      const result = TileInspectionService.hasTileMessage(level, position);
      expect(result).toBe(true);
    });
  });

  describe('hasSearchableContent', () => {
    const level: LevelData = {
      level: 1,
      name: 'Test Level',
      size: { width: 20, height: 20 },
      startPosition: { x: 0, y: 0, facing: 'north' },
      edgeWrapping: false,
      tiles: [
        { x: 0, y: 0, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' } },
        { x: 1, y: 0, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' }, types: ['searchable'], item: 'bronze_key' },
      ],
      encounterRate: 0.1,
      encounterTable: 'level_1',
    };

    it('returns true for searchable tile with content', () => {
      const position: Position = { x: 1, y: 0, facing: 'NORTH' };
      const result = TileInspectionService.hasSearchableContent(level, position);
      expect(result).toBe(true);
    });

    it('returns false for non-searchable tile', () => {
      const position: Position = { x: 0, y: 0, facing: 'NORTH' };
      const result = TileInspectionService.hasSearchableContent(level, position);
      expect(result).toBe(false);
    });

    it('returns false for already looted tile when dungeonState provided', () => {
      const position: Position = { x: 1, y: 0, facing: 'NORTH' };
      const dungeonState = {
        currentLevel: 1,
        position,
        lightActive: false,
        lightRadius: 0,
        teleportCount: 0,
        defeatedEncounters: [],
        unlockedDoors: new Set<string>(),
        openDoors: new Set<string>(),
        visitedTiles: new Set<string>(),
        lootedTiles: new Set<string>(['1_1_0']), // Already looted
        inDarknessZone: false,
      };

      const result = TileInspectionService.hasSearchableContent(level, position, dungeonState);
      expect(result).toBe(false);
    });

    it('returns true for non-looted tile when dungeonState provided', () => {
      const position: Position = { x: 1, y: 0, facing: 'NORTH' };
      const dungeonState = {
        currentLevel: 1,
        position,
        lightActive: false,
        lightRadius: 0,
        teleportCount: 0,
        defeatedEncounters: [],
        unlockedDoors: new Set<string>(),
        openDoors: new Set<string>(),
        visitedTiles: new Set<string>(),
        lootedTiles: new Set<string>(), // Not looted
        inDarknessZone: false,
      };

      const result = TileInspectionService.hasSearchableContent(level, position, dungeonState);
      expect(result).toBe(true);
    });
  });

  describe('inspectTile', () => {
    it('returns item from searchable tile', () => {
      const level: LevelData = {
        level: 1,
        name: 'Test Level',
        size: { width: 20, height: 20 },
        startPosition: { x: 0, y: 0, facing: 'north' },
        edgeWrapping: false,
        tiles: [
          { x: 0, y: 0, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' }, types: ['searchable'], item: 'bronze_key', message: 'You found a bronze key!' },
        ],
        encounterRate: 0.1,
        encounterTable: 'level_1',
      };
      const position: Position = { x: 0, y: 0, facing: 'NORTH' };
      const result = TileInspectionService.inspectTile(level, position);

      expect(result.found).toBe(true);
      expect(result.itemId).toBe('bronze_key');
      expect(result.message).toBe('You found a bronze key!');
    });

    it('returns empty result for non-searchable tile', () => {
      const level: LevelData = {
        level: 1,
        name: 'Test Level',
        size: { width: 20, height: 20 },
        startPosition: { x: 0, y: 0, facing: 'north' },
        edgeWrapping: false,
        tiles: [
          { x: 0, y: 0, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' } },
        ],
        encounterRate: 0.1,
        encounterTable: 'level_1',
      };
      const position: Position = { x: 0, y: 0, facing: 'NORTH' };
      const result = TileInspectionService.inspectTile(level, position);

      expect(result.found).toBe(false);
      expect(result.itemId).toBeUndefined();
    });
  });

  describe('inspectTileWithState', () => {
    it('adds discovered item to first party member inventory', () => {
      const level: LevelData = {
        level: 1,
        name: 'Test Level',
        size: { width: 20, height: 20 },
        startPosition: { x: 0, y: 0, facing: 'north' },
        edgeWrapping: false,
        tiles: [
          { x: 0, y: 0, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' }, types: ['searchable'], item: 'bronze_key', message: 'A hidden cache!' },
        ],
        encounterRate: 0.1,
        encounterTable: 'level_1',
      };

      const character = createTestCharacter({ id: 'char1', inventory: [] });
      const state: GameState = {
        ...createTestGameState(),
        party: {
          members: ['char1'],
          formation: { frontRow: ['char1'], backRow: [] },
          position: { level: 1, x: 0, y: 0, facing: 'NORTH' },
          light: false,
          gold: 0,
        },
        roster: new Map([['char1', character]]),
        dungeon: {
          currentLevel: 1,
          position: { x: 0, y: 0, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
          defeatedEncounters: [],
          unlockedDoors: new Set(),
          openDoors: new Set(),
          visitedTiles: new Set(),
          lootedTiles: new Set(),
          inDarknessZone: false,
        },
      };

      const result = TileInspectionService.inspectTileWithState(state, level);

      expect(result.found).toBe(true);
      expect(result.itemId).toBe('bronze_key');

      // Check item added to inventory
      const charAfter = result.state!.roster.get('char1')!;
      expect(charAfter.inventory.find(i => i.id === 'bronze_key')).toBeDefined();
    });

    it('adds tile to lootedTiles after discovery', () => {
      const level: LevelData = {
        level: 1,
        name: 'Test Level',
        size: { width: 20, height: 20 },
        startPosition: { x: 0, y: 0, facing: 'north' },
        edgeWrapping: false,
        tiles: [
          { x: 0, y: 0, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' }, types: ['searchable'], item: 'bronze_key' },
        ],
        encounterRate: 0.1,
        encounterTable: 'level_1',
      };

      const character = createTestCharacter({ id: 'char1', inventory: [] });
      const state: GameState = {
        ...createTestGameState(),
        party: {
          members: ['char1'],
          formation: { frontRow: ['char1'], backRow: [] },
          position: { level: 1, x: 0, y: 0, facing: 'NORTH' },
          light: false,
          gold: 0,
        },
        roster: new Map([['char1', character]]),
        dungeon: {
          currentLevel: 1,
          position: { x: 0, y: 0, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
          defeatedEncounters: [],
          unlockedDoors: new Set(),
          openDoors: new Set(),
          visitedTiles: new Set(),
          lootedTiles: new Set(),
          inDarknessZone: false,
        },
      };

      const result = TileInspectionService.inspectTileWithState(state, level);

      // Tile should be marked as looted
      expect(result.state!.dungeon!.lootedTiles.has('1_0_0')).toBe(true);
    });

    it('returns already searched message for looted tile', () => {
      const level: LevelData = {
        level: 1,
        name: 'Test Level',
        size: { width: 20, height: 20 },
        startPosition: { x: 0, y: 0, facing: 'north' },
        edgeWrapping: false,
        tiles: [
          { x: 0, y: 0, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' }, types: ['searchable'], item: 'bronze_key' },
        ],
        encounterRate: 0.1,
        encounterTable: 'level_1',
      };

      const character = createTestCharacter({ id: 'char1', inventory: [] });
      const state: GameState = {
        ...createTestGameState(),
        party: {
          members: ['char1'],
          formation: { frontRow: ['char1'], backRow: [] },
          position: { level: 1, x: 0, y: 0, facing: 'NORTH' },
          light: false,
          gold: 0,
        },
        roster: new Map([['char1', character]]),
        dungeon: {
          currentLevel: 1,
          position: { x: 0, y: 0, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
          defeatedEncounters: [],
          unlockedDoors: new Set(),
          openDoors: new Set(),
          visitedTiles: new Set(),
          lootedTiles: new Set(),
          inDarknessZone: false,
        },
      };

      // First search finds the item
      const result = TileInspectionService.inspectTileWithState(state, level);
      expect(result.found).toBe(true);

      // Second search with updated state returns "already searched"
      const result2 = TileInspectionService.inspectTileWithState(result.state!, level);
      expect(result2.found).toBe(false);
      expect(result2.message).toBe('You have already searched here.');
    });

    it('includes item name in found message', () => {
      const level: LevelData = {
        level: 1,
        name: 'Test Level',
        size: { width: 20, height: 20 },
        startPosition: { x: 0, y: 0, facing: 'north' },
        edgeWrapping: false,
        tiles: [
          { x: 0, y: 0, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' }, types: ['searchable'], item: 'bronze_key' },
        ],
        encounterRate: 0.1,
        encounterTable: 'level_1',
      };

      const character = createTestCharacter({ id: 'char1', inventory: [] });
      const state: GameState = {
        ...createTestGameState(),
        party: {
          members: ['char1'],
          formation: { frontRow: ['char1'], backRow: [] },
          position: { level: 1, x: 0, y: 0, facing: 'NORTH' },
          light: false,
          gold: 0,
        },
        roster: new Map([['char1', character]]),
        dungeon: {
          currentLevel: 1,
          position: { x: 0, y: 0, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
          defeatedEncounters: [],
          unlockedDoors: new Set(),
          openDoors: new Set(),
          visitedTiles: new Set(),
          lootedTiles: new Set(),
          inDarknessZone: false,
        },
      };

      const result = TileInspectionService.inspectTileWithState(state, level);

      // Mock returns item name as 'bronze key' (from id 'bronze_key')
      expect(result.message).toBe('You found a bronze key!');
    });

    it('includes tile message and item name when tile has custom message', () => {
      const level: LevelData = {
        level: 1,
        name: 'Test Level',
        size: { width: 20, height: 20 },
        startPosition: { x: 0, y: 0, facing: 'north' },
        edgeWrapping: false,
        tiles: [
          { x: 0, y: 0, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' }, types: ['searchable'], item: 'bronze_key', message: 'A STATUE OF A MONSTER...' },
        ],
        encounterRate: 0.1,
        encounterTable: 'level_1',
      };

      const character = createTestCharacter({ id: 'char1', inventory: [] });
      const state: GameState = {
        ...createTestGameState(),
        party: {
          members: ['char1'],
          formation: { frontRow: ['char1'], backRow: [] },
          position: { level: 1, x: 0, y: 0, facing: 'NORTH' },
          light: false,
          gold: 0,
        },
        roster: new Map([['char1', character]]),
        dungeon: {
          currentLevel: 1,
          position: { x: 0, y: 0, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
          defeatedEncounters: [],
          unlockedDoors: new Set(),
          openDoors: new Set(),
          visitedTiles: new Set(),
          lootedTiles: new Set(),
          inDarknessZone: false,
        },
      };

      const result = TileInspectionService.inspectTileWithState(state, level);

      // Should include both tile message and found item
      expect(result.message).toBe('A STATUE OF A MONSTER... You found a bronze key!');
    });

    it('does not give special item if party already has it', () => {
      // Mock to return a special item
      jest.spyOn(ItemDataLoader, 'getItem').mockImplementation((itemId: string) => {
        return createItem(itemId, 'Bronze Key', { category: 'special' })
      })

      const level: LevelData = {
        level: 1,
        name: 'Test Level',
        size: { width: 20, height: 20 },
        startPosition: { x: 0, y: 0, facing: 'north' },
        edgeWrapping: false,
        tiles: [
          { x: 0, y: 0, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' }, types: ['searchable'], item: 'bronze_key' },
        ],
        encounterRate: 0.1,
        encounterTable: 'level_1',
      };

      // Character already has the bronze key
      const existingKey = createItem('bronze_key', 'Bronze Key', { category: 'special' })
      const character = createTestCharacter({ id: 'char1', inventory: [existingKey] });
      const state: GameState = {
        ...createTestGameState(),
        party: {
          members: ['char1'],
          formation: { frontRow: ['char1'], backRow: [] },
          position: { level: 1, x: 0, y: 0, facing: 'NORTH' },
          light: false,
          gold: 0,
        },
        roster: new Map([['char1', character]]),
        dungeon: {
          currentLevel: 1,
          position: { x: 0, y: 0, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
          defeatedEncounters: [],
          unlockedDoors: new Set(),
          openDoors: new Set(),
          visitedTiles: new Set(),
          lootedTiles: new Set(),
          inDarknessZone: false,
        },
      };

      const result = TileInspectionService.inspectTileWithState(state, level);

      // Should not give the item
      expect(result.found).toBe(false);
      expect(result.message).toBe('You search but find nothing new.');

      // Character should still have exactly one key (no duplicate added)
      const charAfter = result.state!.roster.get('char1')!;
      expect(charAfter.inventory.filter(i => i.id === 'bronze_key')).toHaveLength(1);

      // Tile should still be marked as looted
      expect(result.state!.dungeon!.lootedTiles.has('1_0_0')).toBe(true);
    });

    it('checks all party members for special item ownership', () => {
      // Mock to return a special item
      jest.spyOn(ItemDataLoader, 'getItem').mockImplementation((itemId: string) => {
        return createItem(itemId, 'Bronze Key', { category: 'special' })
      })

      const level: LevelData = {
        level: 1,
        name: 'Test Level',
        size: { width: 20, height: 20 },
        startPosition: { x: 0, y: 0, facing: 'north' },
        edgeWrapping: false,
        tiles: [
          { x: 0, y: 0, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' }, types: ['searchable'], item: 'bronze_key' },
        ],
        encounterRate: 0.1,
        encounterTable: 'level_1',
      };

      // Second party member has the key (not the first)
      const existingKey = createItem('bronze_key', 'Bronze Key', { category: 'special' })
      const char1 = createTestCharacter({ id: 'char1', inventory: [] });
      const char2 = createTestCharacter({ id: 'char2', inventory: [existingKey] });

      const state: GameState = {
        ...createTestGameState(),
        party: {
          members: ['char1', 'char2'],
          formation: { frontRow: ['char1', 'char2'], backRow: [] },
          position: { level: 1, x: 0, y: 0, facing: 'NORTH' },
          light: false,
          gold: 0,
        },
        roster: new Map([['char1', char1], ['char2', char2]]),
        dungeon: {
          currentLevel: 1,
          position: { x: 0, y: 0, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
          defeatedEncounters: [],
          unlockedDoors: new Set(),
          openDoors: new Set(),
          visitedTiles: new Set(),
          lootedTiles: new Set(),
          inDarknessZone: false,
        },
      };

      const result = TileInspectionService.inspectTileWithState(state, level);

      // Should not give the item - char2 already has it
      expect(result.found).toBe(false);
      expect(result.message).toBe('You search but find nothing new.');
    });

    it('does not give special item if it was consumed at a condition tile', () => {
      // Mock to return a special item
      jest.spyOn(ItemDataLoader, 'getItem').mockImplementation((itemId: string) => {
        return createItem(itemId, 'Bronze Key', { category: 'special' })
      })

      const level: LevelData = {
        level: 1,
        name: 'Test Level',
        size: { width: 20, height: 20 },
        startPosition: { x: 0, y: 0, facing: 'north' },
        edgeWrapping: false,
        tiles: [
          { x: 0, y: 0, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' }, types: ['searchable'], item: 'bronze_key' },
        ],
        encounterRate: 0.1,
        encounterTable: 'level_1',
      };

      // Party does NOT have the item (it was consumed at a condition tile)
      const character = createTestCharacter({ id: 'char1', inventory: [] });
      const state: GameState = {
        ...createTestGameState(),
        party: {
          members: ['char1'],
          formation: { frontRow: ['char1'], backRow: [] },
          position: { level: 1, x: 0, y: 0, facing: 'NORTH' },
          light: false,
          gold: 0,
        },
        roster: new Map([['char1', character]]),
        dungeon: {
          currentLevel: 1,
          position: { x: 0, y: 0, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
          defeatedEncounters: [],
          unlockedDoors: new Set(),
          openDoors: new Set(),
          visitedTiles: new Set(),
          lootedTiles: new Set(),
          completedConditionTiles: new Set(),
          consumedConditionItems: new Set(['bronze_key']), // Item was consumed at a condition tile
          inDarknessZone: false,
          latumapicActive: false,
          expeditionAcBuff: 0,
          activeExpeditionSpells: [],
        },
      };

      const result = TileInspectionService.inspectTileWithState(state, level);

      // Should not give the item - it was consumed at a condition tile
      expect(result.found).toBe(false);
      expect(result.message).toBe('You search but find nothing new.');

      // Character should still have no items
      const charAfter = result.state!.roster.get('char1')!;
      expect(charAfter.inventory).toHaveLength(0);

      // Tile should still be marked as looted
      expect(result.state!.dungeon!.lootedTiles.has('1_0_0')).toBe(true);
    });

    it('still gives non-special items even if party has one', () => {
      // Mock to return a NON-special item (normal weapon)
      jest.spyOn(ItemDataLoader, 'getItem').mockImplementation((itemId: string) => {
        return createItem(itemId, 'Short Sword', { category: 'weapon' })
      })

      const level: LevelData = {
        level: 1,
        name: 'Test Level',
        size: { width: 20, height: 20 },
        startPosition: { x: 0, y: 0, facing: 'north' },
        edgeWrapping: false,
        tiles: [
          { x: 0, y: 0, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' }, types: ['searchable'], item: 'short_sword' },
        ],
        encounterRate: 0.1,
        encounterTable: 'level_1',
      };

      // Character already has a short sword
      const existingSword = createItem('short_sword', 'Short Sword', { category: 'weapon' })
      const character = createTestCharacter({ id: 'char1', inventory: [existingSword] });
      const state: GameState = {
        ...createTestGameState(),
        party: {
          members: ['char1'],
          formation: { frontRow: ['char1'], backRow: [] },
          position: { level: 1, x: 0, y: 0, facing: 'NORTH' },
          light: false,
          gold: 0,
        },
        roster: new Map([['char1', character]]),
        dungeon: {
          currentLevel: 1,
          position: { x: 0, y: 0, facing: 'NORTH' },
          lightActive: false,
          lightRadius: 0,
          teleportCount: 0,
          defeatedEncounters: [],
          unlockedDoors: new Set(),
          openDoors: new Set(),
          visitedTiles: new Set(),
          lootedTiles: new Set(),
          inDarknessZone: false,
        },
      };

      const result = TileInspectionService.inspectTileWithState(state, level);

      // SHOULD give the item - non-special items can be duplicated
      expect(result.found).toBe(true);

      // Character should now have 2 swords
      const charAfter = result.state!.roster.get('char1')!;
      expect(charAfter.inventory.filter(i => i.id === 'short_sword')).toHaveLength(2);
    });
  });
});
