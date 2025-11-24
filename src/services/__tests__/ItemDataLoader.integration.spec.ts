import { ItemDataLoader } from '../ItemDataLoader';
import { ItemType, ItemSlot } from '../../types/ItemType';
import { CharacterClass } from '../../types/CharacterClass';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Integration tests for ItemDataLoader using real JSON files
 *
 * These tests verify that the transformation layer correctly handles
 * actual item data from the data/items/ directory.
 */
describe('ItemDataLoader Integration', () => {
  const dataPath = path.join(__dirname, '../../../data/items');

  beforeEach(() => {
    // Reset service state
    ItemDataLoader['itemsCache'] = null;
    ItemDataLoader['loadPromise'] = null;
    ItemDataLoader['loaded'] = false;
    ItemDataLoader['loading'] = false;
    ItemDataLoader['loadError'] = null;
    ItemDataLoader['failedItems'].clear();
  });

  describe('Real JSON File Loading', () => {
    it('loads and transforms long_sword.json correctly', () => {
      const jsonPath = path.join(dataPath, 'long_sword.json');
      const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
      const jsonData = JSON.parse(jsonContent);

      const item = ItemDataLoader['transformJsonToItem'](jsonData);

      // Verify core identity
      expect(item.id).toBe('long_sword');
      expect(item.name).toBe('Long Sword');

      // Verify transformed fields
      expect(item.type).toBe(ItemType.WEAPON);
      expect(item.slot).toBe(ItemSlot.WEAPON);
      expect(item.price).toBe(25); // from cost
      expect(item.damage).toBe(8); // from damage.max

      // Verify class restrictions transformation
      expect(item.classRestrictions).toContain(CharacterClass.FIGHTER);
      expect(item.classRestrictions).toContain(CharacterClass.SAMURAI);
      expect(item.classRestrictions).toContain(CharacterClass.LORD);
      expect(item.classRestrictions).toContain(CharacterClass.NINJA);

      // Verify runtime defaults
      expect(item.identified).toBe(false);
      expect(item.equipped).toBe(false);
      expect(item.cursed).toBe(false);

      // Verify JSON fields preserved
      expect(item.category).toBe('weapon');
      expect(item.weaponType).toBe('sword');
      expect(item.cost).toBe(25);
      expect(item.damageRoll).toBeDefined();
      expect(item.damageRoll?.max).toBe(8);
    });

    it('loads and transforms plate_mail.json correctly', () => {
      const jsonPath = path.join(dataPath, 'plate_mail.json');
      const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
      const jsonData = JSON.parse(jsonContent);

      const item = ItemDataLoader['transformJsonToItem'](jsonData);

      // Verify core identity
      expect(item.id).toBe('plate_mail');
      expect(item.name).toBe('Plate Mail');

      // Verify transformed fields
      expect(item.type).toBe(ItemType.ARMOR);
      expect(item.slot).toBe(ItemSlot.ARMOR);
      expect(item.price).toBe(750);
      expect(item.defense).toBe(5); // from ac
      expect(item.damage).toBeUndefined(); // armor has no damage

      // Verify class restrictions
      expect(item.classRestrictions).toContain(CharacterClass.FIGHTER);
      expect(item.classRestrictions).toContain(CharacterClass.SAMURAI);

      // Verify JSON fields preserved
      expect(item.category).toBe('armor');
      expect(item.armorType).toBe('body');
      expect(item.ac).toBe(5);
    });

    it('loads and transforms shield correctly', () => {
      const jsonPath = path.join(dataPath, 'large_shield.json');

      if (!fs.existsSync(jsonPath)) {
        console.warn(`Skipping test: ${jsonPath} not found`);
        return;
      }

      const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
      const jsonData = JSON.parse(jsonContent);

      const item = ItemDataLoader['transformJsonToItem'](jsonData);

      expect(item.type).toBe(ItemType.SHIELD);
      expect(item.slot).toBe(ItemSlot.SHIELD);
      expect(item.defense).toBeGreaterThan(0);
      expect(item.category).toBe('shield');
    });

    it('loads and transforms helmet correctly', () => {
      const jsonPath = path.join(dataPath, 'steel_helm.json');

      if (!fs.existsSync(jsonPath)) {
        console.warn(`Skipping test: ${jsonPath} not found`);
        return;
      }

      const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
      const jsonData = JSON.parse(jsonContent);

      const item = ItemDataLoader['transformJsonToItem'](jsonData);

      expect(item.type).toBe(ItemType.HELMET);
      expect(item.slot).toBe(ItemSlot.HELMET);
      expect(item.defense).toBeGreaterThan(0);
      expect(item.category).toBe('helmet');
    });

    it('loads and transforms gauntlets correctly', () => {
      const jsonPath = path.join(dataPath, 'gauntlets.json');

      if (!fs.existsSync(jsonPath)) {
        console.warn(`Skipping test: ${jsonPath} not found`);
        return;
      }

      const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
      const jsonData = JSON.parse(jsonContent);

      const item = ItemDataLoader['transformJsonToItem'](jsonData);

      expect(item.type).toBe(ItemType.GAUNTLET);
      expect(item.slot).toBe(ItemSlot.GAUNTLETS);
      expect(item.defense).toBeGreaterThan(0);
      expect(item.category).toBe('gauntlet');
    });
  });

  describe('Batch Loading', () => {
    it('can load multiple real items without errors', () => {
      const testFiles = ['long_sword.json', 'plate_mail.json', 'broken_item.json'];
      const items: any[] = [];

      for (const filename of testFiles) {
        const jsonPath = path.join(dataPath, filename);
        if (fs.existsSync(jsonPath)) {
          const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
          const jsonData = JSON.parse(jsonContent);
          const item = ItemDataLoader['transformJsonToItem'](jsonData);
          items.push(item);
        }
      }

      expect(items.length).toBeGreaterThan(0);

      // All items should have required fields
      for (const item of items) {
        expect(item.id).toBeDefined();
        expect(item.name).toBeDefined();
        expect(item.type).toBeDefined();
        expect(item.slot).toBeDefined();
        expect(item.price).toBeGreaterThanOrEqual(0);
        expect(typeof item.identified).toBe('boolean');
        expect(typeof item.equipped).toBe('boolean');
        expect(typeof item.cursed).toBe('boolean');
      }
    });

    it('verifies all JSON files in data/items are valid', () => {
      const files = fs.readdirSync(dataPath).filter(f => f.endsWith('.json'));

      expect(files.length).toBeGreaterThan(50); // Should have many items

      let successCount = 0;
      let failCount = 0;
      const failures: string[] = [];

      for (const filename of files) {
        try {
          const jsonPath = path.join(dataPath, filename);
          const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
          const jsonData = JSON.parse(jsonContent);

          // Try to transform
          const item = ItemDataLoader['transformJsonToItem'](jsonData);

          // Verify basic structure
          expect(item.id).toBeDefined();
          expect(item.type).toBeDefined();
          expect(item.slot).toBeDefined();

          successCount++;
        } catch (error) {
          failCount++;
          failures.push(`${filename}: ${error}`);
        }
      }

      console.log(`Validated ${successCount}/${files.length} item files`);

      if (failures.length > 0) {
        console.error('Failed files:', failures);
      }

      // At least 95% should succeed
      expect(successCount / files.length).toBeGreaterThanOrEqual(0.95);
    });
  });

  describe('Data Integrity', () => {
    it('verifies weapons have damage values', () => {
      const weaponFiles = ['long_sword.json', 'dagger.json', 'mace.json'];

      for (const filename of weaponFiles) {
        const jsonPath = path.join(dataPath, filename);
        if (!fs.existsSync(jsonPath)) continue;

        const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
        const jsonData = JSON.parse(jsonContent);
        const item = ItemDataLoader['transformJsonToItem'](jsonData);

        if (item.type === ItemType.WEAPON) {
          expect(item.damage).toBeGreaterThan(0);
          expect(item.damageRoll).toBeDefined();
        }
      }
    });

    it('verifies armor has defense values', () => {
      const armorFiles = ['plate_mail.json', 'chain_mail.json', 'leather.json'];

      for (const filename of armorFiles) {
        const jsonPath = path.join(dataPath, filename);
        if (!fs.existsSync(jsonPath)) continue;

        const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
        const jsonData = JSON.parse(jsonContent);
        const item = ItemDataLoader['transformJsonToItem'](jsonData);

        if (item.type === ItemType.ARMOR || item.type === ItemType.SHIELD ||
            item.type === ItemType.HELMET || item.type === ItemType.GAUNTLET) {
          expect(item.defense).toBeGreaterThan(0);
          expect(item.ac).toBeDefined();
        }
      }
    });

    it('verifies all items have valid prices', () => {
      const testFiles = fs.readdirSync(dataPath)
        .filter(f => f.endsWith('.json'))
        .slice(0, 20); // Test sample of 20 files

      for (const filename of testFiles) {
        const jsonPath = path.join(dataPath, filename);
        const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
        const jsonData = JSON.parse(jsonContent);
        const item = ItemDataLoader['transformJsonToItem'](jsonData);

        expect(item.price).toBeGreaterThanOrEqual(0);
        expect(typeof item.price).toBe('number');
        expect(isNaN(item.price)).toBe(false);
      }
    });
  });
});
