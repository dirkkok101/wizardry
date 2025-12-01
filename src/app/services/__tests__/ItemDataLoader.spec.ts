import { ItemDataLoader } from '../ItemDataLoader';
import { ItemType, ItemSlot } from '@models/ItemType';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Helper to create fetch mock that handles manifest and item files
 * @param manifestItems - Array of item IDs to include in manifest
 * @param itemData - Map of item ID to item data (for custom item data)
 */
function createFetchMock(manifestItems?: string[], itemData?: Map<string, any>) {
  return jest.fn((url: string) => {
    const urlPath = url.toString();

    // Handle manifest file
    if (urlPath.includes('/items/index.json')) {
      if (manifestItems) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(manifestItems)
        } as Response);
      }
      // Load real manifest from file
      const manifestPath = path.join(__dirname, '../../../../data/items/index.json');
      try {
        const content = fs.readFileSync(manifestPath, 'utf-8');
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(JSON.parse(content))
        } as Response);
      } catch {
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found'
        } as Response);
      }
    }

    // Handle individual item files
    const match = urlPath.match(/\/items\/([^/]+)\.json$/);
    if (match) {
      const itemId = match[1];

      // Check custom item data first
      if (itemData?.has(itemId)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(itemData.get(itemId))
        } as Response);
      }

      // Load from real data file
      const dataPath = path.join(__dirname, '../../../../data/items', `${itemId}.json`);
      try {
        const fileContent = fs.readFileSync(dataPath, 'utf-8');
        const jsonData = JSON.parse(fileContent);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(jsonData)
        } as Response);
      } catch {
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found'
        } as Response);
      }
    }

    // Return 404 for unknown paths
    return Promise.resolve({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    } as Response);
  });
}

describe('ItemDataLoader', () => {
  beforeEach(() => {
    // Reset service state between tests
    ItemDataLoader.clearCache();
    // Default fetch mock that loads real data files
    global.fetch = createFetchMock();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('loadAllItems', () => {
    it('loads items from JSON files', async () => {
      await ItemDataLoader.loadAllItems();

      const sword = ItemDataLoader.getItem('long_sword');
      expect(sword).toBeDefined();
      expect(sword?.name).toBe('Long Sword');
    });

    it('transforms JSON format to Item format', async () => {
      await ItemDataLoader.loadAllItems();

      const sword = ItemDataLoader.getItem('long_sword');
      expect(sword).not.toBeNull();

      // Verify transformed fields
      expect(sword?.type).toBe(ItemType.WEAPON);
      expect(sword?.slot).toBe(ItemSlot.WEAPON);
      expect(sword?.price).toBe(25); // Transformed from cost
      expect(sword?.damage).toBe(8); // Transformed from damage.max

      // Verify runtime defaults
      expect(sword?.identified).toBe(false);
      expect(sword?.equipped).toBe(false);

      // Verify JSON fields preserved
      expect(sword?.category).toBe('weapon');
      expect(sword?.weaponType).toBe('sword');
      expect(sword?.damageRoll?.max).toBe(8);
      expect(sword?.cost).toBe(25);
    });

    it('transforms armor defense correctly', async () => {
      await ItemDataLoader.loadAllItems();

      const armor = ItemDataLoader.getItem('plate_mail');
      expect(armor).not.toBeNull();

      expect(armor?.type).toBe(ItemType.ARMOR);
      expect(armor?.slot).toBe(ItemSlot.ARMOR);
      expect(armor?.defense).toBe(5); // Transformed from ac
      expect(armor?.price).toBe(750); // Transformed from cost

      // Verify JSON fields preserved
      expect(armor?.ac).toBe(5);
      expect(armor?.armorType).toBe('body');
    });

    it('does not reload on subsequent calls', async () => {
      await ItemDataLoader.loadAllItems();
      const firstLoadCount = ItemDataLoader['itemsCache']!.size;

      await ItemDataLoader.loadAllItems();
      const secondLoadCount = ItemDataLoader['itemsCache']!.size;

      expect(secondLoadCount).toBe(firstLoadCount);
    });

    it('continues loading other items if one fails', async () => {
      await ItemDataLoader.loadAllItems();

      // Should have loaded the items we mocked
      expect(ItemDataLoader.getItem('long_sword')).not.toBeNull();
      expect(ItemDataLoader.getItem('plate_mail')).not.toBeNull();

      // Should complete without throwing despite missing items in manifest
      expect(ItemDataLoader['loaded']).toBe(true);
    });
  });

  describe('getItem', () => {
    beforeEach(async () => {
      await ItemDataLoader.loadAllItems();
    });

    it('returns item by ID', () => {
      const item = ItemDataLoader.getItem('long_sword');
      expect(item).not.toBeNull();
      expect(item?.name).toBe('Long Sword');
    });

    it('returns null for unknown ID', () => {
      const item = ItemDataLoader.getItem('unknown_item_xyz');
      expect(item).toBeNull();
    });
  });

  describe('getItems', () => {
    beforeEach(async () => {
      await ItemDataLoader.loadAllItems();
    });

    it('resolves multiple item IDs', () => {
      const items = ItemDataLoader.getItems(['long_sword', 'plate_mail']);
      expect(items.length).toBe(2);
      expect(items[0].id).toBe('long_sword');
      expect(items[1].id).toBe('plate_mail');
    });

    it('filters out null values for missing items', () => {
      const items = ItemDataLoader.getItems(['long_sword', 'unknown', 'plate_mail']);
      // Should only return valid items
      expect(items.length).toBe(2);
      expect(items.every(item => item !== null)).toBe(true);
    });

    it('returns empty array for empty input', () => {
      const items = ItemDataLoader.getItems([]);
      expect(items).toEqual([]);
    });
  });

  describe('State Accessors', () => {
    beforeEach(() => {
      // Reset state
      ItemDataLoader['itemsCache'] = null;
      ItemDataLoader['loadPromise'] = null;
      ItemDataLoader['loaded'] = false;
      ItemDataLoader['loading'] = false;
      ItemDataLoader['loadError'] = null;
      ItemDataLoader['failedItems'].clear();
    });

    it('reports not loaded initially', () => {
      expect(ItemDataLoader.isLoaded()).toBe(false);
      expect(ItemDataLoader.isLoading()).toBe(false);
      expect(ItemDataLoader.getError()).toBeNull();
    });

    it('reports loading state during load', async () => {
      const loadPromise = ItemDataLoader.loadAllItems();

      // Should be loading immediately after starting
      expect(ItemDataLoader.isLoading()).toBe(true);
      expect(ItemDataLoader.isLoaded()).toBe(false);

      await loadPromise;

      // Should be loaded and not loading after completion
      expect(ItemDataLoader.isLoading()).toBe(false);
      expect(ItemDataLoader.isLoaded()).toBe(true);
      expect(ItemDataLoader.getError()).toBeNull();
    });

    it('prevents duplicate concurrent loads', async () => {
      const load1 = ItemDataLoader.loadAllItems();
      const load2 = ItemDataLoader.loadAllItems(); // Should return immediately

      await Promise.all([load1, load2]);

      expect(ItemDataLoader.isLoaded()).toBe(true);
      expect(ItemDataLoader.isLoading()).toBe(false);
    });

    it('stores error on catastrophic load failure', async () => {
      // Mock fetch to fail on manifest request
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        } as Response)
      );

      try {
        await ItemDataLoader.loadAllItems();
      } catch {
        // Expected to throw
      }

      expect(ItemDataLoader.getError()).toBeInstanceOf(Error);
      expect(ItemDataLoader.getError()?.message).toBe('Failed to load item manifest');
      expect(ItemDataLoader.isLoading()).toBe(false);
    });

    it('tracks failed item loads', async () => {
      await ItemDataLoader.loadAllItems();

      const failedItems = ItemDataLoader.getFailedItems();
      const loadedCount = ItemDataLoader.getLoadedCount();
      const totalCount = ItemDataLoader.getTotalCount();

      // Loading real data files - all items should load successfully
      expect(loadedCount).toBe(104); // All items from real data files
      expect(failedItems.size).toBe(0); // No failures with real data
      expect(totalCount).toBe(104); // Total items in manifest

      // Verify failed items map is empty when all items load successfully
      expect(failedItems).toBeInstanceOf(Map);
      expect(Array.from(failedItems.keys())).toEqual([]);
    });

    it('clears failed items on reload', async () => {
      // First load with real data files (no failures expected)
      await ItemDataLoader.loadAllItems();
      const firstFailCount = ItemDataLoader.getFailedItems().size;
      expect(firstFailCount).toBe(0); // All items load successfully with real data

      // Reset and reload - must clear cache to force actual reload
      ItemDataLoader['itemsCache'] = null;
      ItemDataLoader['loadPromise'] = null;
      ItemDataLoader['loaded'] = false;
      await ItemDataLoader.loadAllItems();

      // Failed items should remain at 0 on successful reload
      const secondFailCount = ItemDataLoader.getFailedItems().size;
      expect(secondFailCount).toBe(0); // Still no failures
      expect(ItemDataLoader.isLoaded()).toBe(true);
    });
  });

  describe('Zod Validation', () => {
    beforeEach(() => {
      ItemDataLoader.clearCache();
    });

    it('validates items with Zod schemas during load', async () => {
      // Mock manifest with single test item
      const testItem = {
        id: 'test_sword',
        name: 'Test Sword',
        category: 'weapon',
        weaponType: 'sword',
        damage: { dice: '1d8', min: 1, max: 8 },
        enhancement: 0,
        cost: 100,
        usableBy: ['fighter'],
        cursed: false,
        special: null
      };

      global.fetch = createFetchMock(
        ['test_sword'],
        new Map([['test_sword', testItem]])
      );

      const items = await ItemDataLoader.loadAllItems();

      expect(items.size).toBe(1);
      expect(ItemDataLoader.getFailedItems().size).toBe(0);
    });

    it('rejects items with invalid damage dice format', async () => {
      const invalidItem = {
        id: 'bad_sword',
        name: 'Bad Sword',
        category: 'weapon',
        weaponType: 'sword',
        damage: { dice: 'invalid', min: 1, max: 8 }, // Invalid dice format
        enhancement: 0,
        cost: 100,
        usableBy: ['fighter'],
        cursed: false,
        special: null
      };

      global.fetch = createFetchMock(
        ['bad_sword'],
        new Map([['bad_sword', invalidItem]])
      );

      await ItemDataLoader.loadAllItems();

      expect(ItemDataLoader.getLoadedCount()).toBe(0);
      expect(ItemDataLoader.getFailedItems().size).toBe(1);
      expect(ItemDataLoader.getFailedItems().get('bad_sword')).toContain('dice');
    });

    it('rejects items with min > max damage', async () => {
      const invalidItem = {
        id: 'bad_sword',
        name: 'Bad Sword',
        category: 'weapon',
        weaponType: 'sword',
        damage: { dice: '1d8', min: 10, max: 5 }, // min > max
        enhancement: 0,
        cost: 100,
        usableBy: ['fighter'],
        cursed: false,
        special: null
      };

      global.fetch = createFetchMock(
        ['bad_sword'],
        new Map([['bad_sword', invalidItem]])
      );

      await ItemDataLoader.loadAllItems();

      expect(ItemDataLoader.getLoadedCount()).toBe(0);
      expect(ItemDataLoader.getFailedItems().size).toBe(1);
    });

    it('rejects items with invalid character class', async () => {
      const invalidItem = {
        id: 'bad_sword',
        name: 'Bad Sword',
        category: 'weapon',
        weaponType: 'sword',
        damage: { dice: '1d8', min: 1, max: 8 },
        enhancement: 0,
        cost: 100,
        usableBy: ['invalid_class'], // Invalid class
        cursed: false,
        special: null
      };

      global.fetch = createFetchMock(
        ['bad_sword'],
        new Map([['bad_sword', invalidItem]])
      );

      await ItemDataLoader.loadAllItems();

      expect(ItemDataLoader.getLoadedCount()).toBe(0);
      expect(ItemDataLoader.getFailedItems().size).toBe(1);
    });

    it('rejects armor with AC out of range', async () => {
      const invalidItem = {
        id: 'bad_armor',
        name: 'Bad Armor',
        category: 'armor',
        armorType: 'body',
        ac: 15, // Max is 10
        enhancement: 0,
        cost: 1000,
        usableBy: ['fighter'],
        cursed: false,
        special: null
      };

      global.fetch = createFetchMock(
        ['bad_armor'],
        new Map([['bad_armor', invalidItem]])
      );

      await ItemDataLoader.loadAllItems();

      expect(ItemDataLoader.getLoadedCount()).toBe(0);
      expect(ItemDataLoader.getFailedItems().size).toBe(1);
    });

    it('accepts cursed armor with negative AC', async () => {
      const validItem = {
        id: 'cursed_armor',
        name: 'Cursed Armor',
        category: 'armor',
        armorType: 'body',
        ac: -1, // Negative AC is valid for cursed items
        enhancement: -1,
        cost: 0,
        usableBy: ['fighter', 'mage', 'priest', 'thief', 'bishop', 'samurai', 'lord', 'ninja'],
        cursed: true,
        special: null
      };

      global.fetch = createFetchMock(
        ['cursed_armor'],
        new Map([['cursed_armor', validItem]])
      );

      const items = await ItemDataLoader.loadAllItems();

      expect(items.size).toBe(1);
      expect(ItemDataLoader.getFailedItems().size).toBe(0);

      const cursedArmor = ItemDataLoader.getItem('cursed_armor');
      expect(cursedArmor?.cursed).toBe(true);
      expect(cursedArmor?.defense).toBe(-1);
    });

    it('validates alignment restrictions', async () => {
      const validItem = {
        id: 'holy_sword',
        name: 'Holy Sword',
        category: 'weapon',
        weaponType: 'sword',
        damage: { dice: '2d8', min: 2, max: 16 },
        enhancement: 2,
        cost: 10000,
        usableBy: ['fighter', 'lord'],
        cursed: false,
        alignmentRequired: 'good',
        special: null
      };

      global.fetch = createFetchMock(
        ['holy_sword'],
        new Map([['holy_sword', validItem]])
      );

      const items = await ItemDataLoader.loadAllItems();

      expect(items.size).toBe(1);

      const holySword = ItemDataLoader.getItem('holy_sword');
      expect(holySword?.alignmentRestrictions).toEqual(['GOOD']);
    });

    it('continues loading valid items when some items fail validation', async () => {
      const validSword = {
        id: 'valid_sword',
        name: 'Valid Sword',
        category: 'weapon',
        weaponType: 'sword',
        damage: { dice: '1d8', min: 1, max: 8 },
        enhancement: 0,
        cost: 100,
        usableBy: ['fighter'],
        cursed: false,
        special: null
      };

      const invalidSword = {
        id: 'invalid_sword',
        name: 'Invalid Sword',
        category: 'weapon',
        weaponType: 'sword',
        damage: { dice: 'bad', min: 1, max: 8 }, // Invalid
        enhancement: 0,
        cost: 100,
        usableBy: ['fighter'],
        cursed: false,
        special: null
      };

      const validArmor = {
        id: 'valid_armor',
        name: 'Valid Armor',
        category: 'armor',
        armorType: 'body',
        ac: 5,
        enhancement: 0,
        cost: 500,
        usableBy: ['fighter'],
        cursed: false,
        special: null
      };

      global.fetch = createFetchMock(
        ['valid_sword', 'invalid_sword', 'valid_armor'],
        new Map([
          ['valid_sword', validSword],
          ['invalid_sword', invalidSword],
          ['valid_armor', validArmor]
        ])
      );

      await ItemDataLoader.loadAllItems();

      // Should load 2 valid items
      expect(ItemDataLoader.getLoadedCount()).toBe(2);
      expect(ItemDataLoader.getItem('valid_sword')).not.toBeNull();
      expect(ItemDataLoader.getItem('valid_armor')).not.toBeNull();

      // Should track 1 failed item
      expect(ItemDataLoader.getFailedItems().size).toBe(1);
      expect(ItemDataLoader.getFailedItems().has('invalid_sword')).toBe(true);
    });
  });
});
