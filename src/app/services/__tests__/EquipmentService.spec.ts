import { EquipmentService } from '../EquipmentService';
import { Character } from '@models/Character';
import { Item } from '@models/Item';
import { ItemType } from '@models/ItemType';
import { ItemSlot } from '@models/ItemType';

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

describe('EquipmentService', () => {
  let fighter: Character;
  let longSword: Item;

  beforeEach(() => {
    // Initialize longSword first
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
      inventory: [longSword],
      gold: 0,
      createdAt: Date.now(),
      lastModified: Date.now()
    };
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

      expect(result.equippedWeapon?.id).toBe('long_sword');
      expect(result.equippedWeapon?.equipped).toBe(true);
      expect(result.inventory.find(i => i.id === 'long_sword')).toBeUndefined();
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
      const shortSword = createItem('short_sword', 'Short Sword')

      fighter.equippedWeapon = { ...shortSword, equipped: true };
      fighter.inventory = [longSword];

      const result = EquipmentService.equipItem(fighter, 'long_sword');

      expect(result.equippedWeapon?.id).toBe('long_sword');
      expect(result.inventory.find(i => i.id === 'short_sword')).toBeDefined();
      expect(result.inventory.find(i => i.id === 'long_sword')).toBeUndefined();
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

      fighter.inventory = [plateMail];
      fighter.ac = 10;

      const result = EquipmentService.equipItem(fighter, 'plate_mail');

      expect(result.ac).toBeLessThan(10);
      expect(result.equippedArmor?.id).toBe('plate_mail');
    });
  });

  describe('unequipItem', () => {
    beforeEach(() => {
      fighter.equippedWeapon = { ...longSword, equipped: true };
      fighter.inventory = [];
    });

    it('moves item from slot to inventory', () => {
      const result = EquipmentService.unequipItem(fighter, ItemSlot.WEAPON);

      expect(result.equippedWeapon).toBeUndefined();
      expect(result.inventory.find(i => i.id === 'long_sword')).toBeDefined();
    });

    it('throws error if no item in slot', () => {
      fighter.equippedWeapon = undefined;

      expect(() => EquipmentService.unequipItem(fighter, ItemSlot.WEAPON))
        .toThrow('No item in slot');
    });

    it('throws error if item is cursed', () => {
      fighter.equippedWeapon = { ...longSword, cursed: true, equipped: true };

      expect(() => EquipmentService.unequipItem(fighter, ItemSlot.WEAPON))
        .toThrow('Cannot unequip cursed item');
    });

    it('throws error if inventory full', () => {
      fighter.inventory = Array(8).fill(null).map((_, i) => createItem(`potion${i}`, `Potion ${i}`));

      expect(() => EquipmentService.unequipItem(fighter, ItemSlot.WEAPON))
        .toThrow('Inventory full');
    });

    it('recalculates AC after unequipping armor', () => {
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
        equipped: true
      };
      fighter.equippedArmor = plateMail;
      fighter.ac = 5;
      fighter.inventory = [];

      const result = EquipmentService.unequipItem(fighter, ItemSlot.ARMOR);

      expect(result.ac).toBeGreaterThan(5);
      expect(result.equippedArmor).toBeUndefined();
    });
  });

  describe('calculateAC', () => {
    describe('Naked Ninja AC bonus (authentic Wizardry 1)', () => {
      // Authentic formula: AC = 10 - floor(Level/3) - 2
      it('calculates Level 1 naked Ninja AC as 8', () => {
        const ninja: Character = {
          ...fighter,
          class: 'NINJA' as const,
          level: 1,
          agility: 10, // 0 AGI modifier
          equippedArmor: undefined
        };
        // AC = 10 - floor(1/3) - 2 = 10 - 0 - 2 = 8
        expect(EquipmentService.calculateAC(ninja)).toBe(8);
      });

      it('calculates Level 6 naked Ninja AC as 6', () => {
        const ninja: Character = {
          ...fighter,
          class: 'NINJA' as const,
          level: 6,
          agility: 10,
          equippedArmor: undefined
        };
        // AC = 10 - floor(6/3) - 2 = 10 - 2 - 2 = 6
        expect(EquipmentService.calculateAC(ninja)).toBe(6);
      });

      it('calculates Level 12 naked Ninja AC as 4', () => {
        const ninja: Character = {
          ...fighter,
          class: 'NINJA' as const,
          level: 12,
          agility: 10,
          equippedArmor: undefined
        };
        // AC = 10 - floor(12/3) - 2 = 10 - 4 - 2 = 4
        expect(EquipmentService.calculateAC(ninja)).toBe(4);
      });

      it('calculates Level 21 naked Ninja AC as 1', () => {
        const ninja: Character = {
          ...fighter,
          class: 'NINJA' as const,
          level: 21,
          agility: 10,
          equippedArmor: undefined
        };
        // AC = 10 - floor(21/3) - 2 = 10 - 7 - 2 = 1
        expect(EquipmentService.calculateAC(ninja)).toBe(1);
      });

      it('naked Ninja AC stacks with AGI modifier', () => {
        const ninja: Character = {
          ...fighter,
          class: 'NINJA' as const,
          level: 12,
          agility: 18, // +4 AGI modifier
          equippedArmor: undefined
        };
        // AC = 10 - floor(12/3) - 2 - 4 = 10 - 4 - 2 - 4 = 0
        expect(EquipmentService.calculateAC(ninja)).toBe(0);
      });

      it('does not apply Ninja bonus when wearing armor', () => {
        const armor: Item = {
          id: 'leather',
          name: 'Leather Armor',
          type: ItemType.ARMOR,
          slot: ItemSlot.ARMOR,
          price: 50,
          defense: 2,
          cursed: false,
          identified: true,
          equipped: true
        };
        const ninja: Character = {
          ...fighter,
          class: 'NINJA' as const,
          level: 12,
          agility: 10,
          equippedArmor: armor
        };
        // AC = 10 - 2 (armor) = 8 (no naked bonus)
        expect(EquipmentService.calculateAC(ninja)).toBe(8);
      });

      it('does not apply Ninja bonus to other classes', () => {
        const thief: Character = {
          ...fighter,
          class: 'THIEF' as const,
          level: 12,
          agility: 10,
          equippedArmor: undefined
        };
        // AC = 10 (base only, no Ninja bonus)
        expect(EquipmentService.calculateAC(thief)).toBe(10);
      });
    });
  });

  describe('AC Calculation Integration', () => {
    it('calculates AC correctly with full equipment set', () => {
      // Create test items directly
      const plateMail: Item = {
        id: 'plate_mail',
        name: 'Plate Mail',
        type: ItemType.ARMOR,
        slot: ItemSlot.ARMOR,
        price: 750,
        defense: 7,
        cursed: false,
        identified: true,
        equipped: false
      };
      const largeShield: Item = {
        id: 'large_shield',
        name: 'Large Shield',
        type: ItemType.SHIELD,
        slot: ItemSlot.SHIELD,
        price: 40,
        defense: 4,
        cursed: false,
        identified: true,
        equipped: false
      };
      const steelHelm: Item = {
        id: 'steel_helm',
        name: 'Steel Helm',
        type: ItemType.HELMET,
        slot: ItemSlot.HELMET,
        price: 100,
        defense: 2,
        cursed: false,
        identified: true,
        equipped: false
      };
      const gauntlets: Item = {
        id: 'gauntlets',
        name: 'Gauntlets',
        type: ItemType.GAUNTLET,
        slot: ItemSlot.GAUNTLETS,
        price: 50,
        defense: 2,
        cursed: false,
        identified: true,
        equipped: false
      };

      // Start with base AC 10
      fighter.ac = 10;
      fighter.agility = 15; // +2 AGI modifier
      fighter.inventory = [plateMail, largeShield, steelHelm, gauntlets];

      let char = fighter;
      char = EquipmentService.equipItem(char, 'plate_mail');
      char = EquipmentService.equipItem(char, 'large_shield');
      char = EquipmentService.equipItem(char, 'steel_helm');
      char = EquipmentService.equipItem(char, 'gauntlets');

      // Expected AC: 10 (base) - 7 (armor) - 4 (shield) - 2 (helm) - 2 (gauntlets) - 2 (AGI) = -7
      expect(char.ac).toBe(-7);
      expect(char.equippedArmor?.id).toBe('plate_mail');
      expect(char.equippedShield?.id).toBe('large_shield');
      expect(char.equippedHelmet?.id).toBe('steel_helm');
      expect(char.equippedGauntlets?.id).toBe('gauntlets');
    });

    it('confirms weapons do not contribute to AC', () => {
      fighter.ac = 10;
      fighter.agility = 10; // 0 AGI modifier
      const sword: Item = {
        id: 'long_sword',
        name: 'Long Sword',
        type: ItemType.WEAPON,
        slot: ItemSlot.WEAPON,
        price: 25,
        damage: 8,
        defense: 0,
        cursed: false,
        identified: true,
        equipped: false
      };
      fighter.inventory = [sword];

      const result = EquipmentService.equipItem(fighter, 'long_sword');

      // AC should remain 10 - weapon doesn't contribute to AC
      expect(result.ac).toBe(10);
      expect(result.equippedWeapon?.id).toBe('long_sword');
    });
  });
});
