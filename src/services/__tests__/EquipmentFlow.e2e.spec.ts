import { ItemDataLoader } from '../ItemDataLoader';
import { EquipmentService } from '../EquipmentService';
import { InventoryService } from '../InventoryService';
import { Character } from '../../types/Character';
import { CharacterClass } from '../../types/CharacterClass';
import { Race } from '../../types/Race';
import { Alignment } from '../../types/Alignment';
import { CharacterStatus } from '../../types/CharacterStatus';
import { ItemType, ItemSlot } from '../../types/ItemType';
import * as fs from 'fs';
import * as path from 'path';

/**
 * End-to-End Equipment Flow Tests
 *
 * Tests the complete equipment management workflow:
 * - Load real items
 * - Equip items on character
 * - Unequip items
 * - Trade items between characters
 * - Drop items
 * - Verify AC calculation throughout
 */
describe('Equipment Flow E2E', () => {
  let fighter: Character;
  let mage: Character;

  beforeEach(() => {
    // Reset ItemDataLoader
    ItemDataLoader['itemsCache'].clear();
    ItemDataLoader['loaded'] = false;

    // Create test characters
    fighter = {
      id: 'fighter-1',
      name: 'Conan',
      race: Race.HUMAN,
      class: CharacterClass.FIGHTER,
      alignment: Alignment.NEUTRAL,
      status: CharacterStatus.OK,
      level: 5,
      experience: 5000,
      strength: 18,
      intelligence: 10,
      piety: 10,
      vitality: 16,
      agility: 14, // +2 AC modifier
      luck: 12,
      hp: 40,
      maxHp: 45,
      ac: 10,
      gold: 0,
      inventory: [],
      spellBook: { mage: [], priest: [] },
      spellPoints: { mage: [0, 0, 0, 0, 0, 0, 0], priest: [0, 0, 0, 0, 0, 0, 0] }
    };

    mage = {
      ...fighter,
      id: 'mage-1',
      name: 'Gandalf',
      class: CharacterClass.MAGE,
      strength: 10,
      intelligence: 18,
      agility: 12, // +1 AC modifier
      inventory: []
    };
  });

  describe('Complete Equipment Workflow', () => {
    it('full equipment cycle: load → equip → unequip → trade → drop', () => {
      // Step 1: Load real items from JSON
      const dataPath = path.join(__dirname, '../../../data/items');
      const longSwordData = JSON.parse(fs.readFileSync(path.join(dataPath, 'long_sword.json'), 'utf-8'));
      const plateMailData = JSON.parse(fs.readFileSync(path.join(dataPath, 'plate_mail.json'), 'utf-8'));

      const longSword = ItemDataLoader['transformJsonToItem'](longSwordData);
      const plateMail = ItemDataLoader['transformJsonToItem'](plateMailData);

      // Mark items as identified so they can be equipped
      longSword.identified = true;
      plateMail.identified = true;

      // Cache items
      ItemDataLoader['itemsCache'].set(longSword.id, longSword);
      ItemDataLoader['itemsCache'].set(plateMail.id, plateMail);

      // Step 2: Add items to fighter's inventory
      fighter.inventory = ['long_sword', 'plate_mail'];
      expect(fighter.inventory.length).toBe(2);

      // Step 3: Equip weapon
      fighter = EquipmentService.equipItem(fighter, 'long_sword');
      expect(fighter.equippedWeapon).toBe('long_sword');
      expect(fighter.inventory).not.toContain('long_sword');
      expect(fighter.ac).toBe(10 - 2); // Base 10 - AGI modifier (no weapon bonus)

      // Step 4: Equip armor (should recalculate AC)
      fighter = EquipmentService.equipItem(fighter, 'plate_mail');
      expect(fighter.equippedArmor).toBe('plate_mail');
      expect(fighter.inventory).toHaveLength(0);
      expect(fighter.ac).toBe(10 - 5 - 2); // Base 10 - armor bonus - AGI modifier
      expect(fighter.ac).toBe(3);

      // Step 5: Unequip weapon
      fighter = EquipmentService.unequipItem(fighter, ItemSlot.WEAPON);
      expect(fighter.equippedWeapon).toBeUndefined();
      expect(fighter.inventory).toContain('long_sword');
      expect(fighter.ac).toBe(3); // Still has armor + AGI

      // Step 6: Trade sword to mage
      const tradeResult = InventoryService.transferItem(fighter, mage, 'long_sword');
      fighter = tradeResult.from;
      mage = tradeResult.to;

      expect(fighter.inventory).not.toContain('long_sword');
      expect(mage.inventory).toContain('long_sword');

      // Step 7: Mage cannot equip sword (wrong class), so just verify trade succeeded
      // Mages cannot use long swords according to real JSON data
      expect(mage.inventory).toContain('long_sword');

      // Step 8: Drop item from inventory (unequipped)
      mage = InventoryService.dropItem(mage, 'long_sword');
      expect(mage.inventory).not.toContain('long_sword');

      // Final state verification
      expect(fighter.equippedArmor).toBe('plate_mail');
      expect(fighter.inventory).toHaveLength(0);
      expect(mage.inventory).toHaveLength(0);
    });
  });

  describe('Full Equipment Set AC Calculation', () => {
    it('equips complete armor set with real JSON data', () => {
      const dataPath = path.join(__dirname, '../../../data/items');

      // Load all equipment pieces
      const items = [
        'plate_mail.json',
        'large_shield.json'
      ];

      for (const filename of items) {
        const itemPath = path.join(dataPath, filename);
        if (fs.existsSync(itemPath)) {
          const jsonData = JSON.parse(fs.readFileSync(itemPath, 'utf-8'));
          const item = ItemDataLoader['transformJsonToItem'](jsonData);
          item.identified = true; // Mark as identified so they can be equipped
          ItemDataLoader['itemsCache'].set(item.id, item);
          fighter.inventory.push(item.id);
        }
      }

      // Initial AC: 10 - 2 (AGI) = 8
      expect(fighter.ac).toBe(10);

      // Equip all items
      let currentAC = 10;
      const startingAGI = 2; // Fighter has AGI 14 = +2

      if (fighter.inventory.includes('plate_mail')) {
        fighter = EquipmentService.equipItem(fighter, 'plate_mail');
        currentAC -= 5; // Plate Mail AC 5
        currentAC -= startingAGI; // AGI modifier
        expect(fighter.ac).toBe(currentAC);
        expect(fighter.equippedArmor).toBe('plate_mail');
      }

      if (fighter.inventory.includes('large_shield')) {
        fighter = EquipmentService.equipItem(fighter, 'large_shield');
        const shield = ItemDataLoader.getItem('large_shield');
        if (shield?.defense) {
          currentAC -= shield.defense;
        }
        expect(fighter.ac).toBe(currentAC);
        expect(fighter.equippedShield).toBe('large_shield');
      }

      // Final AC should be significantly lower (better) than starting AC
      expect(fighter.ac).toBeLessThan(10);
      expect(fighter.ac).toBeGreaterThanOrEqual(-10); // Cap at -10
    });
  });

  describe('Error Handling in Equipment Flow', () => {
    it('prevents equipping items without class permission', () => {
      const dataPath = path.join(__dirname, '../../../data/items');
      const plateMailData = JSON.parse(fs.readFileSync(path.join(dataPath, 'plate_mail.json'), 'utf-8'));
      const plateMail = ItemDataLoader['transformJsonToItem'](plateMailData);
      plateMail.identified = true; // Mark as identified to test class restriction, not identification

      ItemDataLoader['itemsCache'].set(plateMail.id, plateMail);
      mage.inventory = ['plate_mail'];

      // Mage cannot wear plate mail (Fighter, Samurai, Lord, Ninja only)
      expect(() => {
        EquipmentService.equipItem(mage, 'plate_mail');
      }).toThrow();

      // Inventory should be unchanged
      expect(mage.inventory).toContain('plate_mail');
      expect(mage.equippedArmor).toBeUndefined();
    });

    it('prevents trading to character with full inventory', () => {
      const longSword = ItemDataLoader['transformJsonToItem']({
        id: 'long_sword',
        name: 'Long Sword',
        category: 'weapon',
        weaponType: 'sword',
        damage: { dice: '1d8', min: 1, max: 8 },
        cost: 25,
        usableBy: ['fighter'],
        cursed: false
      });

      longSword.identified = true;
      ItemDataLoader['itemsCache'].set('long_sword', longSword);

      fighter.inventory = ['long_sword'];
      mage.inventory = new Array(8).fill('potion'); // Full inventory

      expect(() => {
        InventoryService.transferItem(fighter, mage, 'long_sword');
      }).toThrow('Recipient inventory full');
    });

    it('prevents dropping equipped items directly', () => {
      const longSword = ItemDataLoader['transformJsonToItem']({
        id: 'long_sword',
        name: 'Long Sword',
        category: 'weapon',
        weaponType: 'sword',
        damage: { dice: '1d8', min: 1, max: 8 },
        cost: 25,
        usableBy: ['fighter'],
        cursed: false
      });

      longSword.identified = true;
      ItemDataLoader['itemsCache'].set('long_sword', longSword);

      fighter.inventory = ['long_sword'];
      fighter = EquipmentService.equipItem(fighter, 'long_sword');

      expect(fighter.equippedWeapon).toBe('long_sword');

      // Cannot drop equipped item - must unequip first
      expect(() => {
        InventoryService.dropItem(fighter, 'long_sword');
      }).toThrow('Item not in inventory');
    });
  });

  describe('Cursed Item Workflow', () => {
    it('prevents unequipping cursed items', () => {
      // Create cursed sword
      const cursedSword = ItemDataLoader['transformJsonToItem']({
        id: 'cursed_sword',
        name: 'Cursed Sword',
        category: 'weapon',
        weaponType: 'sword',
        damage: { dice: '1d8', min: 1, max: 8 },
        cost: 0,
        usableBy: ['fighter'],
        cursed: true
      });

      cursedSword.identified = true; // Mark as identified so it can be equipped
      ItemDataLoader['itemsCache'].set('cursed_sword', cursedSword);

      fighter.inventory = ['cursed_sword'];
      fighter = EquipmentService.equipItem(fighter, 'cursed_sword');

      expect(fighter.equippedWeapon).toBe('cursed_sword');

      // Cannot unequip cursed item
      expect(() => {
        EquipmentService.unequipItem(fighter, ItemSlot.WEAPON);
      }).toThrow('Cannot unequip cursed item');

      expect(fighter.equippedWeapon).toBe('cursed_sword');
    });
  });

  describe('Multi-Character Trading', () => {
    it('trades items between multiple party members', () => {
      let thief: Character = {
        ...fighter,
        id: 'thief-1',
        name: 'Bilbo',
        class: CharacterClass.THIEF,
        inventory: []
      };

      const longSword = ItemDataLoader['transformJsonToItem']({
        id: 'long_sword',
        name: 'Long Sword',
        category: 'weapon',
        weaponType: 'sword',
        damage: { dice: '1d8', min: 1, max: 8 },
        cost: 25,
        usableBy: ['fighter', 'samurai', 'lord', 'ninja'],
        cursed: false
      });

      longSword.identified = true; // Mark as identified so it can be equipped
      ItemDataLoader['itemsCache'].set('long_sword', longSword);

      fighter.inventory = ['long_sword'];

      // Fighter → Mage
      let result = InventoryService.transferItem(fighter, mage, 'long_sword');
      fighter = result.from;
      mage = result.to;

      expect(fighter.inventory).toHaveLength(0);
      expect(mage.inventory).toContain('long_sword');

      // Mage → Thief
      result = InventoryService.transferItem(mage, thief, 'long_sword');
      mage = result.from;
      thief = result.to;

      expect(mage.inventory).toHaveLength(0);
      expect(thief.inventory).toContain('long_sword');

      // Thief → Fighter (back to start)
      result = InventoryService.transferItem(thief, fighter, 'long_sword');
      thief = result.from;
      fighter = result.to;

      expect(thief.inventory).toHaveLength(0);
      expect(fighter.inventory).toContain('long_sword');
    });
  });
});
