import { ItemDataService } from '../ItemDataService';
import { Item } from '../../types/Item';
import { ItemType, ItemSlot } from '../../types/ItemType';

describe('ItemDataService', () => {
  const mockItems: Item[] = [
    {
      id: 'long_sword',
      name: 'Long Sword',
      type: ItemType.WEAPON,
      slot: ItemSlot.WEAPON,
      price: 25,
      damage: 8,
      identified: true,
      cursed: false,
      equipped: false
    },
    {
      id: 'plate_mail',
      name: 'Plate Mail',
      type: ItemType.ARMOR,
      slot: ItemSlot.ARMOR,
      price: 750,
      defense: 5,
      identified: true,
      cursed: false,
      equipped: false
    }
  ];

  beforeEach(() => {
    // Reset service state between tests
    ItemDataService['itemsCache'].clear();
    ItemDataService['loaded'] = false;

    // Mock fetch for testing
    global.fetch = jest.fn((url: string) => {
      return Promise.resolve({
        json: () => Promise.resolve(mockItems)
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

    it('does not reload on subsequent calls', async () => {
      await ItemDataService.loadAllItems();
      const firstLoadCount = ItemDataService['itemsCache'].size;

      await ItemDataService.loadAllItems();
      const secondLoadCount = ItemDataService['itemsCache'].size;

      expect(secondLoadCount).toBe(firstLoadCount);
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
});
