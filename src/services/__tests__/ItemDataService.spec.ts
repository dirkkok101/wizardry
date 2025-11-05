import { ItemDataService } from '../ItemDataService';
import { Item } from '../../types/Item';
import { ItemType, ItemSlot } from '../../types/ItemType';

describe('ItemDataService', () => {
  // Mock JSON data (raw format from data files)
  const mockJsonData: Record<string, any> = {
    'long_sword': {
      id: 'long_sword',
      name: 'Long Sword',
      category: 'weapon',
      weaponType: 'sword',
      damage: { dice: '1d8', min: 1, max: 8 }, // Real JSON uses "damage" not "damageRoll"
      cost: 25,
      usableBy: ['fighter', 'lord', 'samurai'],
      cursed: false
    },
    'plate_mail': {
      id: 'plate_mail',
      name: 'Plate Mail',
      category: 'armor',
      armorType: 'body',
      ac: 5,
      cost: 750,
      usableBy: ['fighter', 'lord'],
      cursed: false
    }
  };

  beforeEach(() => {
    // Reset service state between tests
    ItemDataService['itemsCache'].clear();
    ItemDataService['loaded'] = false;

    // Mock fetch to return JSON format for individual item files
    global.fetch = jest.fn((url: string) => {
      // Extract item ID from URL: /assets/items/{itemId}.json
      const match = url.match(/\/assets\/items\/(.+)\.json$/);
      if (match) {
        const itemId = match[1];
        const jsonData = mockJsonData[itemId];

        if (jsonData) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(jsonData)
          } as Response);
        }
      }

      // Return 404 for unknown items
      return Promise.resolve({
        ok: false,
        status: 404
      } as Response);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('loadAllItems', () => {
    it('loads items from JSON files', async () => {
      await ItemDataService.loadAllItems();

      const sword = ItemDataService.getItem('long_sword');
      expect(sword).toBeDefined();
      expect(sword?.name).toBe('Long Sword');
    });

    it('transforms JSON format to Item format', async () => {
      await ItemDataService.loadAllItems();

      const sword = ItemDataService.getItem('long_sword');
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
      await ItemDataService.loadAllItems();

      const armor = ItemDataService.getItem('plate_mail');
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
      await ItemDataService.loadAllItems();
      const firstLoadCount = ItemDataService['itemsCache'].size;

      await ItemDataService.loadAllItems();
      const secondLoadCount = ItemDataService['itemsCache'].size;

      expect(secondLoadCount).toBe(firstLoadCount);
    });

    it('continues loading other items if one fails', async () => {
      await ItemDataService.loadAllItems();

      // Should have loaded the items we mocked
      expect(ItemDataService.getItem('long_sword')).not.toBeNull();
      expect(ItemDataService.getItem('plate_mail')).not.toBeNull();

      // Should complete without throwing despite missing items in manifest
      expect(ItemDataService['loaded']).toBe(true);
    });
  });

  describe('getItem', () => {
    beforeEach(async () => {
      await ItemDataService.loadAllItems();
    });

    it('returns item by ID', () => {
      const item = ItemDataService.getItem('long_sword');
      expect(item).not.toBeNull();
      expect(item?.name).toBe('Long Sword');
    });

    it('returns null for unknown ID', () => {
      const item = ItemDataService.getItem('unknown_item_xyz');
      expect(item).toBeNull();
    });
  });

  describe('getItems', () => {
    beforeEach(async () => {
      await ItemDataService.loadAllItems();
    });

    it('resolves multiple item IDs', () => {
      const items = ItemDataService.getItems(['long_sword', 'plate_mail']);
      expect(items.length).toBe(2);
      expect(items[0].id).toBe('long_sword');
      expect(items[1].id).toBe('plate_mail');
    });

    it('filters out null values for missing items', () => {
      const items = ItemDataService.getItems(['long_sword', 'unknown', 'plate_mail']);
      // Should only return valid items
      expect(items.length).toBe(2);
      expect(items.every(item => item !== null)).toBe(true);
    });

    it('returns empty array for empty input', () => {
      const items = ItemDataService.getItems([]);
      expect(items).toEqual([]);
    });
  });

  describe('State Accessors', () => {
    beforeEach(() => {
      // Reset state
      ItemDataService['itemsCache'].clear();
      ItemDataService['loaded'] = false;
      ItemDataService['loading'] = false;
      ItemDataService['loadError'] = null;
    });

    it('reports not loaded initially', () => {
      expect(ItemDataService.isLoaded()).toBe(false);
      expect(ItemDataService.isLoading()).toBe(false);
      expect(ItemDataService.getError()).toBeNull();
    });

    it('reports loading state during load', async () => {
      const loadPromise = ItemDataService.loadAllItems();

      // Should be loading immediately after starting
      expect(ItemDataService.isLoading()).toBe(true);
      expect(ItemDataService.isLoaded()).toBe(false);

      await loadPromise;

      // Should be loaded and not loading after completion
      expect(ItemDataService.isLoading()).toBe(false);
      expect(ItemDataService.isLoaded()).toBe(true);
      expect(ItemDataService.getError()).toBeNull();
    });

    it('prevents duplicate concurrent loads', async () => {
      const load1 = ItemDataService.loadAllItems();
      const load2 = ItemDataService.loadAllItems(); // Should return immediately

      await Promise.all([load1, load2]);

      expect(ItemDataService.isLoaded()).toBe(true);
      expect(ItemDataService.isLoading()).toBe(false);
    });

    it('stores error on catastrophic load failure', async () => {
      // Mock Promise.all to throw error (simulates catastrophic failure)
      const originalPromiseAll = Promise.all;
      jest.spyOn(Promise, 'all').mockRejectedValueOnce(new Error('Catastrophic failure'));

      try {
        await ItemDataService.loadAllItems();
      } catch (error) {
        // Expected to throw
      }

      expect(ItemDataService.getError()).toBeInstanceOf(Error);
      expect(ItemDataService.getError()?.message).toBe('Catastrophic failure');
      expect(ItemDataService.isLoading()).toBe(false);

      // Restore
      jest.spyOn(Promise, 'all').mockRestore();
    });

    it('tracks failed item loads', async () => {
      await ItemDataService.loadAllItems();

      const failedItems = ItemDataService.getFailedItems();
      const loadedCount = ItemDataService.getLoadedCount();
      const totalCount = ItemDataService.getTotalCount();

      // We only mock 2 items, so most will fail
      expect(loadedCount).toBe(2); // long_sword and plate_mail
      expect(failedItems.size).toBeGreaterThan(0);
      expect(totalCount).toBe(98); // Total items in manifest

      // Check that failed items have error messages
      for (const [itemId, errorMsg] of failedItems.entries()) {
        expect(typeof itemId).toBe('string');
        expect(typeof errorMsg).toBe('string');
        expect(errorMsg.length).toBeGreaterThan(0);
      }
    });

    it('clears failed items on reload', async () => {
      // First load with some failures
      await ItemDataService.loadAllItems();
      const firstFailCount = ItemDataService.getFailedItems().size;
      expect(firstFailCount).toBeGreaterThan(0);

      // Reset and reload
      ItemDataService['loaded'] = false;
      await ItemDataService.loadAllItems();

      // Failed items should be cleared and recounted
      const secondFailCount = ItemDataService.getFailedItems().size;
      expect(secondFailCount).toBe(firstFailCount); // Same failures expected
    });
  });
});
