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
          { x: 0, y: 0, walls: { north: 'wall', south: 'wall', east: 'wall', west: 'wall' }, types: ['searchable'], item: 'bronze_key', message: 'You found a bronze key!' },
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
        },
      };

      const result = TileInspectionService.inspectTileWithState(state, level);

      expect(result.found).toBe(true);
      expect(result.itemId).toBe('bronze_key');

      // Check item added to inventory
      const charAfter = result.state!.roster.get('char1')!;
      expect(charAfter.inventory.find(i => i.id === 'bronze_key')).toBeDefined();
    });

    it('clears tile search content after discovery', () => {
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
        },
      };

      const result = TileInspectionService.inspectTileWithState(state, level);

      // Second inspection should return nothing
      const result2 = TileInspectionService.inspectTileWithState(result.state!, level);
      expect(result2.found).toBe(false);
    });
  });
});
