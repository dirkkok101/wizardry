import { ItemDataLoader } from '../ItemDataLoader';
import { ItemType, ItemSlot } from '@models/ItemType';
import { CharacterClass } from '@models/CharacterClass';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Integration tests for ItemDataLoader using real JSON files
 *
 * These tests verify that the transformation layer correctly handles
 * actual item data from the data/items/ directory through the public API.
 */
describe('ItemDataLoader Integration', () => {
  const dataPath = path.join(__dirname, '../../../data/items');

  beforeAll(() => {
    // Mock fetch to load real data files from data/ directory
    global.fetch = jest.fn((url: string) => {
      const urlPath = url.toString();

      // Extract filename from URL
      const match = urlPath.match(/\/(items)\/([^/]+\.json)$/);
      if (match) {
        const [, directory, filename] = match;
        const filePath = path.join(__dirname, '../../../../data', directory, filename);

        try {
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          const jsonData = JSON.parse(fileContent);

          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(jsonData)
          } as Response);
        } catch (error) {
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
  });

  beforeEach(async () => {
    // Reset service state
    ItemDataLoader['itemsCache'] = null;
    ItemDataLoader['loadPromise'] = null;
    ItemDataLoader['loaded'] = false;
    ItemDataLoader['loading'] = false;
    ItemDataLoader['loadError'] = null;
    ItemDataLoader['failedItems'].clear();

    // Load all items from real data files
    await ItemDataLoader.loadAllItems();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Real JSON File Loading', () => {
    it('loads and transforms long_sword.json correctly', () => {
      const item = ItemDataLoader.getItem('long_sword');

      expect(item).not.toBeNull();

      // Verify core identity
      expect(item!.id).toBe('long_sword');
      expect(item!.name).toBe('Long Sword');

      // Verify transformed fields
      expect(item!.type).toBe(ItemType.WEAPON);
      expect(item!.slot).toBe(ItemSlot.WEAPON);
      expect(item!.price).toBe(25); // from cost
      expect(item!.damage).toBe(8); // from damage.max

      // Verify class restrictions transformation
      expect(item!.classRestrictions).toContain(CharacterClass.FIGHTER);
      expect(item!.classRestrictions).toContain(CharacterClass.SAMURAI);
      expect(item!.classRestrictions).toContain(CharacterClass.LORD);
      expect(item!.classRestrictions).toContain(CharacterClass.NINJA);

      // Verify runtime defaults
      expect(item!.identified).toBe(false);
      expect(item!.equipped).toBe(false);

      // Verify JSON fields preserved
      expect(item!.category).toBe('weapon');
      expect(item!.weaponType).toBe('sword');
      expect(item!.damageRoll).toBeDefined();
      expect(item!.cost).toBe(25);
    });

    it('loads and transforms plate_mail.json correctly', () => {
      const item = ItemDataLoader.getItem('plate_mail');

      expect(item).not.toBeNull();

      // Verify core identity
      expect(item!.id).toBe('plate_mail');
      expect(item!.name).toBe('Plate Mail');

      // Verify transformed fields
      expect(item!.type).toBe(ItemType.ARMOR);
      expect(item!.slot).toBe(ItemSlot.ARMOR);
      expect(item!.defense).toBe(5); // from ac
      expect(item!.price).toBe(750); // from cost

      // Verify class restrictions (Fighter, Lord, Samurai only)
      expect(item!.classRestrictions.length).toBeGreaterThan(0);

      // Verify runtime defaults
      expect(item!.identified).toBe(false);
      expect(item!.equipped).toBe(false);

      // Verify JSON fields preserved
      expect(item!.category).toBe('armor');
      expect(item!.armorType).toBe('body');
      expect(item!.ac).toBe(5);
    });
  });

  describe('Bulk Loading', () => {
    it('loads all items from directory', () => {
      const allItems = ItemDataLoader.getAllItems();

      expect(allItems.size).toBeGreaterThan(50); // Should have many items
      expect(ItemDataLoader.getLoadedCount()).toBe(allItems.size);
    });

    it('loads specific items by ID list', () => {
      const itemIds = ['long_sword', 'plate_mail', 'dagger'];
      const items = ItemDataLoader.getItems(itemIds);

      expect(items.length).toBe(3);
      expect(items.every(item => item !== null)).toBe(true);
      expect(items[0].id).toBe('long_sword');
      expect(items[1].id).toBe('plate_mail');
      expect(items[2].id).toBe('dagger');
    });

    it('returns only successful items when some IDs are invalid', () => {
      const itemIds = ['long_sword', 'invalid_item_xyz', 'plate_mail'];
      const items = ItemDataLoader.getItems(itemIds);

      expect(items.length).toBe(2); // Only valid items
      expect(items.every(item => item !== null)).toBe(true);
    });
  });

  describe('Type-Based Queries', () => {
    it('retrieves all weapons', () => {
      const weapons = ItemDataLoader.getItemsByType(ItemType.WEAPON);

      expect(weapons.length).toBeGreaterThan(10); // Should have many weapons
      expect(weapons.every(item => item.type === ItemType.WEAPON)).toBe(true);
      expect(weapons.every(item => item.damage !== undefined)).toBe(true);
    });

    it('retrieves all armor', () => {
      const armor = ItemDataLoader.getItemsByType(ItemType.ARMOR);

      expect(armor.length).toBeGreaterThan(5); // Should have several armor pieces
      expect(armor.every(item => item.type === ItemType.ARMOR)).toBe(true);
      expect(armor.every(item => item.defense !== undefined)).toBe(true);
    });

    it('retrieves all consumables', () => {
      const consumables = ItemDataLoader.getItemsByType(ItemType.CONSUMABLE);

      expect(consumables.length).toBeGreaterThanOrEqual(0); // May or may not have consumables
      expect(consumables.every(item => item.type === ItemType.CONSUMABLE)).toBe(true);
    });
  });

  describe('Data Integrity', () => {
    it('verifies weapons have damage values', () => {
      const weapons = ItemDataLoader.getItemsByType(ItemType.WEAPON);

      for (const weapon of weapons) {
        expect(weapon.damage).toBeGreaterThan(0);
        expect(weapon.damageRoll).toBeDefined();
        expect(weapon.damageRoll?.max).toBeGreaterThan(0);
      }
    });

    it('verifies armor has defense values', () => {
      const armor = ItemDataLoader.getItemsByType(ItemType.ARMOR);
      const shields = ItemDataLoader.getItemsByType(ItemType.SHIELD);
      const helmets = ItemDataLoader.getItemsByType(ItemType.HELMET);
      const gauntlets = ItemDataLoader.getItemsByType(ItemType.GAUNTLET);

      const defensiveItems = [...armor, ...shields, ...helmets, ...gauntlets];

      for (const item of defensiveItems) {
        expect(item.defense).toBeDefined();
        expect(item.defense!).toBeGreaterThanOrEqual(-10); // Can be negative for cursed items
        expect(item.ac).toBeDefined();
      }
    });

    it('verifies all items have valid prices', () => {
      const allItems = ItemDataLoader.getAllItems();

      for (const [itemId, item] of allItems) {
        expect(item.price).toBeGreaterThanOrEqual(0);
        expect(typeof item.price).toBe('number');
        expect(isNaN(item.price)).toBe(false);
      }
    });
  });
});
