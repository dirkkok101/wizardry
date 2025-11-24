import { EquipmentService } from '../EquipmentService';
import { ItemDataLoader } from '../ItemDataLoader';
import { Character } from '../../types/Character';
import { Item } from '../../types/Item';
import { ItemType } from '../../types/ItemType';
import { ItemSlot } from '../../types/ItemType';

describe('EquipmentService', () => {
  let fighter: Character;
  let longSword: Item;

  beforeEach(() => {
    // Mock ItemDataLoader.getItem
    jest.spyOn(ItemDataLoader, 'getItem').mockImplementation((itemId: string) => {
      if (itemId === 'long_sword') return longSword;
      if (itemId === 'plate_mail') {
        return {
          id: 'plate_mail',
          name: 'Plate Mail',
          type: ItemType.ARMOR,
          slot: ItemSlot.ARMOR,
          price: 750,
          defense: 5,
          classRestrictions: ['FIGHTER', 'SAMURAI', 'LORD'],
          cursed: false,
          identified: true,
          equipped: false
        };
      }
      return null;
    });

    fighter = {
      id: 'fighter-1',
      name: 'Test Fighter',
      race: 'HUMAN',
      class: 'FIGHTER',
      alignment: 'GOOD',
      strength: 16,
      intelligence: 10,
      piety: 10,
      vitality: 14,
      agility: 12,
      luck: 10,
      level: 1,
      experience: 0,
      age: 18,
      hp: 10,
      maxHp: 10,
      ac: 10,
      status: 'OK',
      vim: { current: 100, max: 100 },
      knownSpells: [],
      inventory: ['long_sword'],
      createdAt: Date.now(),
      lastModified: Date.now()
    };

    longSword = {
      id: 'long_sword',
      name: 'Long Sword',
      type: ItemType.WEAPON,
      slot: ItemSlot.WEAPON,
      price: 25,
      damage: 8,
      classRestrictions: ['FIGHTER', 'SAMURAI', 'LORD', 'NINJA'],
      cursed: false,
      identified: true,
      equipped: false
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('canEquipItem', () => {
    it('allows fighter to equip sword', () => {
      const result = EquipmentService.canEquipItem(fighter, longSword);
      expect(result.allowed).toBe(true);
    });

    it('rejects unidentified item', () => {
      longSword.identified = false;
      const result = EquipmentService.canEquipItem(fighter, longSword);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('identified');
    });

    it('rejects item for wrong class', () => {
      const mage = { ...fighter, class: 'MAGE' as const };
      const result = EquipmentService.canEquipItem(mage, longSword);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('MAGE');
    });

    it('allows item with no class restrictions', () => {
      const potion: Item = {
        ...longSword,
        id: 'potion',
        type: ItemType.CONSUMABLE,
        classRestrictions: undefined
      };
      const result = EquipmentService.canEquipItem(fighter, potion);
      expect(result.allowed).toBe(true);
    });
  });

  describe('equipItem', () => {
    it('equips weapon from inventory to slot', () => {
      const result = EquipmentService.equipItem(fighter, 'long_sword');

      expect(result.equippedWeapon).toBe('long_sword');
      expect(result.inventory).not.toContain('long_sword');
    });

    it('throws error if item not in inventory', () => {
      fighter.inventory = [];

      expect(() => EquipmentService.equipItem(fighter, 'long_sword'))
        .toThrow('Item not in inventory');
    });

    it('throws error for unidentified item', () => {
      longSword.identified = false;

      expect(() => EquipmentService.equipItem(fighter, 'long_sword'))
        .toThrow('identified');
    });

    it('unequips existing item when slot occupied', () => {
      fighter.equippedWeapon = 'short_sword';
      fighter.inventory = ['long_sword'];

      const result = EquipmentService.equipItem(fighter, 'long_sword');

      expect(result.equippedWeapon).toBe('long_sword');
      expect(result.inventory).toContain('short_sword');
      expect(result.inventory).not.toContain('long_sword');
    });

    it('recalculates AC after equipping armor', () => {
      const plateMail: Item = {
        id: 'plate_mail',
        name: 'Plate Mail',
        type: ItemType.ARMOR,
        slot: ItemSlot.ARMOR,
        price: 750,
        defense: 5,
        classRestrictions: ['FIGHTER', 'SAMURAI', 'LORD'],
        cursed: false,
        identified: true,
        equipped: false
      };

      fighter.inventory = ['plate_mail'];
      fighter.ac = 10;

      const result = EquipmentService.equipItem(fighter, 'plate_mail');

      expect(result.ac).toBeLessThan(10);
      expect(result.equippedArmor).toBe('plate_mail');
    });
  });

  describe('unequipItem', () => {
    beforeEach(() => {
      fighter.equippedWeapon = 'long_sword';
      fighter.inventory = [];
    });

    it('moves item from slot to inventory', () => {
      const result = EquipmentService.unequipItem(fighter, ItemSlot.WEAPON);

      expect(result.equippedWeapon).toBeUndefined();
      expect(result.inventory).toContain('long_sword');
    });

    it('throws error if no item in slot', () => {
      fighter.equippedWeapon = undefined;

      expect(() => EquipmentService.unequipItem(fighter, ItemSlot.WEAPON))
        .toThrow('No item in slot');
    });

    it('throws error if item is cursed', () => {
      longSword.cursed = true;

      expect(() => EquipmentService.unequipItem(fighter, ItemSlot.WEAPON))
        .toThrow('Cannot unequip cursed item');
    });

    it('throws error if inventory full', () => {
      fighter.inventory = new Array(8).fill('potion');

      expect(() => EquipmentService.unequipItem(fighter, ItemSlot.WEAPON))
        .toThrow('Inventory full');
    });

    it('recalculates AC after unequipping armor', () => {
      fighter.equippedArmor = 'plate_mail';
      fighter.ac = 5;
      fighter.inventory = [];

      const result = EquipmentService.unequipItem(fighter, ItemSlot.ARMOR);

      expect(result.ac).toBeGreaterThan(5);
      expect(result.equippedArmor).toBeUndefined();
    });
  });

  describe('AC Calculation Integration', () => {
    it('calculates AC correctly with full equipment set from transformation layer', () => {
      // Mock ItemDataLoader to return transformed items
      jest.spyOn(ItemDataLoader, 'getItem').mockImplementation((id: string) => {
        const items: Record<string, Item> = {
          'plate_mail': {
            id: 'plate_mail',
            name: 'Plate Mail',
            type: ItemType.ARMOR,
            slot: ItemSlot.ARMOR,
            price: 750,
            defense: 7, // Transformed from JSON ac: 7
            cursed: false,
            identified: true,
            equipped: false,
            // JSON fields preserved
            category: 'armor',
            armorType: 'body',
            ac: 7,
            cost: 750
          },
          'large_shield': {
            id: 'large_shield',
            name: 'Large Shield',
            type: ItemType.SHIELD,
            slot: ItemSlot.SHIELD,
            price: 40,
            defense: 4, // Transformed from JSON ac: 4
            cursed: false,
            identified: true,
            equipped: false,
            category: 'shield',
            ac: 4,
            cost: 40
          },
          'steel_helm': {
            id: 'steel_helm',
            name: 'Steel Helm',
            type: ItemType.HELMET,
            slot: ItemSlot.HELMET,
            price: 100,
            defense: 2, // Transformed from JSON ac: 2
            cursed: false,
            identified: true,
            equipped: false,
            category: 'helmet',
            ac: 2,
            cost: 100
          },
          'gauntlets': {
            id: 'gauntlets',
            name: 'Gauntlets',
            type: ItemType.GAUNTLET,
            slot: ItemSlot.GAUNTLETS,
            price: 50,
            defense: 2, // Transformed from JSON ac: 2
            cursed: false,
            identified: true,
            equipped: false,
            category: 'gauntlet',
            ac: 2,
            cost: 50
          }
        };
        return items[id] || null;
      });

      // Start with base AC 10
      fighter.ac = 10;
      fighter.agility = 15; // +2 AGI modifier

      // Equip full armor set
      fighter.inventory = ['plate_mail', 'large_shield', 'steel_helm', 'gauntlets'];

      let char = fighter;
      char = EquipmentService.equipItem(char, 'plate_mail');
      char = EquipmentService.equipItem(char, 'large_shield');
      char = EquipmentService.equipItem(char, 'steel_helm');
      char = EquipmentService.equipItem(char, 'gauntlets');

      // Expected AC: 10 (base) - 7 (armor) - 4 (shield) - 2 (helm) - 2 (gauntlets) - 2 (AGI) = -7
      expect(char.ac).toBe(-7);
      expect(char.equippedArmor).toBe('plate_mail');
      expect(char.equippedShield).toBe('large_shield');
      expect(char.equippedHelmet).toBe('steel_helm');
      expect(char.equippedGauntlets).toBe('gauntlets');
    });

    it('confirms weapons do not contribute to AC', () => {
      jest.spyOn(ItemDataLoader, 'getItem').mockImplementation((id: string) => {
        if (id === 'long_sword') {
          return {
            id: 'long_sword',
            name: 'Long Sword',
            type: ItemType.WEAPON,
            slot: ItemSlot.WEAPON,
            price: 25,
            damage: 8, // Transformed from damageRoll.max
            defense: 0, // Weapons have no defense
            cursed: false,
            identified: true,
            equipped: false,
            category: 'weapon',
            weaponType: 'sword',
            damageRoll: { dice: '1d8', min: 1, max: 8 },
            cost: 25
          };
        }
        return null;
      });

      fighter.ac = 10;
      fighter.agility = 10; // 0 AGI modifier
      fighter.inventory = ['long_sword'];

      const result = EquipmentService.equipItem(fighter, 'long_sword');

      // AC should remain 10 - weapon doesn't contribute to AC
      expect(result.ac).toBe(10);
      expect(result.equippedWeapon).toBe('long_sword');
    });
  });
});
