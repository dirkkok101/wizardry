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
  });
});
