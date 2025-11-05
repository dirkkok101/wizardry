import { EquipmentService } from '../EquipmentService';
import { ItemDataService } from '../ItemDataService';
import { Character } from '../../types/Character';
import { Item } from '../../types/Item';
import { ItemType } from '../../types/ItemType';
import { ItemSlot } from '../../types/ItemType';

describe('EquipmentService', () => {
  let fighter: Character;
  let longSword: Item;

  beforeEach(() => {
    // Mock ItemDataService.getItem
    jest.spyOn(ItemDataService, 'getItem').mockImplementation((itemId: string) => {
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
});
