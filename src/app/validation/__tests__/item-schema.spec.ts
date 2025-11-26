import { ItemSchema, ItemSchemas, ValidatedItem } from '../item-schema';
import { z } from 'zod';

describe('ItemSchema', () => {
  describe('WeaponSchema', () => {
    it('validates a valid weapon', () => {
      const validWeapon = {
        id: 'long_sword',
        name: 'Long Sword',
        category: 'weapon',
        weaponType: 'sword',
        damage: { dice: '1d8', min: 1, max: 8 },
        enhancement: 0,
        cost: 200,
        usableBy: ['fighter', 'lord'],
        cursed: false,
        special: null
      };

      expect(() => ItemSchemas.Weapon.parse(validWeapon)).not.toThrow();
    });

    it('validates enhanced weapon', () => {
      const enhancedWeapon = {
        id: 'long_sword_1',
        name: 'Long Sword +1',
        category: 'weapon',
        weaponType: 'sword',
        damage: { dice: '1d8', min: 1, max: 8 },
        enhancement: 1,
        cost: 1000,
        usableBy: ['fighter', 'lord'],
        cursed: false,
        special: null
      };

      expect(() => ItemSchemas.Weapon.parse(enhancedWeapon)).not.toThrow();
    });

    it('validates weapon with special properties', () => {
      const specialWeapon = {
        id: 'were_slayer',
        name: 'Were Slayer',
        category: 'weapon',
        weaponType: 'sword',
        damage: { dice: '2d8', min: 2, max: 16 },
        enhancement: 2,
        cost: 5000,
        usableBy: ['fighter', 'lord', 'samurai'],
        cursed: false,
        effectiveAgainst: ['werebeast'],
        special: null
      };

      expect(() => ItemSchemas.Weapon.parse(specialWeapon)).not.toThrow();
    });

    it('rejects weapon with invalid damage dice format', () => {
      const invalidWeapon = {
        id: 'bad_sword',
        name: 'Bad Sword',
        category: 'weapon',
        weaponType: 'sword',
        damage: { dice: 'invalid', min: 1, max: 8 },
        enhancement: 0,
        cost: 100,
        usableBy: ['fighter'],
        cursed: false,
        special: null
      };

      expect(() => ItemSchemas.Weapon.parse(invalidWeapon)).toThrow();
    });

    it('rejects weapon with min > max damage', () => {
      const invalidWeapon = {
        id: 'bad_sword',
        name: 'Bad Sword',
        category: 'weapon',
        weaponType: 'sword',
        damage: { dice: '1d8', min: 10, max: 5 },
        enhancement: 0,
        cost: 100,
        usableBy: ['fighter'],
        cursed: false,
        special: null
      };

      expect(() => ItemSchemas.Weapon.parse(invalidWeapon)).toThrow();
    });

    it('rejects weapon with invalid class', () => {
      const invalidWeapon = {
        id: 'bad_sword',
        name: 'Bad Sword',
        category: 'weapon',
        weaponType: 'sword',
        damage: { dice: '1d8', min: 1, max: 8 },
        enhancement: 0,
        cost: 100,
        usableBy: ['invalid_class'],
        cursed: false,
        special: null
      };

      expect(() => ItemSchemas.Weapon.parse(invalidWeapon)).toThrow();
    });

    it('validates weapon with depletion chance', () => {
      const depletableWeapon = {
        id: 'shuriken',
        name: 'Shuriken',
        category: 'weapon',
        weaponType: 'shuriken',
        damage: { dice: '1d6', min: 1, max: 6 },
        enhancement: 0,
        cost: 50,
        usableBy: ['ninja'],
        cursed: false,
        depletionChance: 30,
        transformsTo: null,
        special: null
      };

      expect(() => ItemSchemas.Weapon.parse(depletableWeapon)).not.toThrow();
    });
  });

  describe('ArmorSchema', () => {
    it('validates valid armor', () => {
      const validArmor = {
        id: 'plate_mail',
        name: 'Plate Mail',
        category: 'armor',
        armorType: 'body',
        ac: 6,
        enhancement: 0,
        cost: 750,
        usableBy: ['fighter', 'lord'],
        cursed: false,
        special: null
      };

      expect(() => ItemSchemas.Armor.parse(validArmor)).not.toThrow();
    });

    it('validates cursed armor with negative AC', () => {
      const cursedArmor = {
        id: 'cursed_leather',
        name: 'Cursed Leather',
        category: 'armor',
        armorType: 'body',
        ac: -1,
        enhancement: -1,
        cost: 0,
        usableBy: ['fighter', 'mage', 'priest', 'thief', 'bishop', 'samurai', 'lord', 'ninja'],
        cursed: true,
        special: null
      };

      expect(() => ItemSchemas.Armor.parse(cursedArmor)).not.toThrow();
    });

    it('rejects armor with AC out of range', () => {
      const invalidArmor = {
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

      expect(() => ItemSchemas.Armor.parse(invalidArmor)).toThrow();
    });
  });

  describe('ShieldSchema', () => {
    it('validates valid shield', () => {
      const validShield = {
        id: 'large_shield',
        name: 'Large Shield',
        category: 'shield',
        ac: 2,
        enhancement: 0,
        cost: 40,
        usableBy: ['fighter', 'lord', 'samurai'],
        cursed: false,
        special: null
      };

      expect(() => ItemSchemas.Shield.parse(validShield)).not.toThrow();
    });
  });

  describe('HelmetSchema', () => {
    it('validates valid helmet', () => {
      const validHelmet = {
        id: 'steel_helm',
        name: 'Steel Helm',
        category: 'helmet',
        ac: 2,
        enhancement: 0,
        cost: 200,
        usableBy: ['fighter', 'lord', 'samurai'],
        cursed: false,
        special: null
      };

      expect(() => ItemSchemas.Helmet.parse(validHelmet)).not.toThrow();
    });
  });

  describe('GauntletsSchema', () => {
    it('validates valid gauntlets', () => {
      const validGauntlets = {
        id: 'copper_gloves',
        name: 'Copper Gloves',
        category: 'gauntlets',
        ac: 1,
        enhancement: 0,
        cost: 6000,
        usableBy: ['fighter', 'samurai', 'lord', 'ninja'],
        cursed: false,
        special: null
      };

      expect(() => ItemSchemas.Gauntlets.parse(validGauntlets)).not.toThrow();
    });

    it('rejects gauntlets with AC < 1', () => {
      const invalidGauntlets = {
        id: 'bad_gauntlets',
        name: 'Bad Gauntlets',
        category: 'gauntlets',
        ac: 0, // Min is 1
        enhancement: 0,
        cost: 100,
        usableBy: ['fighter'],
        cursed: false,
        special: null
      };

      expect(() => ItemSchemas.Gauntlets.parse(invalidGauntlets)).toThrow();
    });
  });

  describe('AccessorySchema', () => {
    it('validates valid accessory', () => {
      const validAccessory = {
        id: 'ring_healing',
        name: 'Ring of Healing',
        category: 'accessory',
        accessoryType: 'ring',
        cost: 5000,
        usableBy: ['mage', 'priest', 'bishop'],
        cursed: false,
        special: {
          regeneration: 1
        }
      };

      expect(() => ItemSchemas.Accessory.parse(validAccessory)).not.toThrow();
    });

    it('validates accessory with protection', () => {
      const protectionAccessory = {
        id: 'amulet_protection',
        name: 'Amulet of Protection',
        category: 'accessory',
        accessoryType: 'amulet',
        cost: 10000,
        usableBy: ['fighter', 'mage', 'priest', 'thief', 'bishop', 'samurai', 'lord', 'ninja'],
        cursed: false,
        special: {
          protection: 'fire',
          ac: 2
        }
      };

      expect(() => ItemSchemas.Accessory.parse(protectionAccessory)).not.toThrow();
    });

    it('rejects accessory with invalid type', () => {
      const invalidAccessory = {
        id: 'bad_accessory',
        name: 'Bad Accessory',
        category: 'accessory',
        accessoryType: 'invalid_type',
        cost: 100,
        usableBy: ['fighter'],
        cursed: false,
        special: null
      };

      expect(() => ItemSchemas.Accessory.parse(invalidAccessory)).toThrow();
    });
  });

  describe('ConsumableSchema', () => {
    it('validates valid consumable', () => {
      const validConsumable = {
        id: 'potion_healing',
        name: 'Potion of Healing',
        category: 'consumable',
        consumableType: 'potion',
        singleUse: true,
        depletionChance: 100,
        transformsTo: 'broken_item',
        cost: 50,
        usableBy: ['fighter', 'mage', 'priest', 'thief', 'bishop', 'samurai', 'lord', 'ninja'],
        cursed: false,
        effect: {
          type: 'heal',
          healing: '1d8'
        },
        special: null
      };

      expect(() => ItemSchemas.Consumable.parse(validConsumable)).not.toThrow();
    });

    it('validates scroll with spell effect', () => {
      const validScroll = {
        id: 'scroll_halito',
        name: 'Scroll/Halito',
        category: 'consumable',
        consumableType: 'scroll',
        singleUse: true,
        depletionChance: 100,
        transformsTo: 'broken_item',
        cost: 100,
        usableBy: ['mage', 'bishop'],
        cursed: false,
        effect: {
          type: 'cast_spell',
          spellId: 'halito'
        },
        special: null
      };

      expect(() => ItemSchemas.Consumable.parse(validScroll)).not.toThrow();
    });

    it('rejects consumable without effect', () => {
      const invalidConsumable = {
        id: 'bad_potion',
        name: 'Bad Potion',
        category: 'consumable',
        consumableType: 'potion',
        singleUse: true,
        depletionChance: 100,
        transformsTo: 'broken_item',
        cost: 50,
        usableBy: ['fighter'],
        cursed: false,
        special: null
      };

      expect(() => ItemSchemas.Consumable.parse(invalidConsumable)).toThrow();
    });

    it('rejects consumable with invalid depletion chance', () => {
      const invalidConsumable = {
        id: 'bad_potion',
        name: 'Bad Potion',
        category: 'consumable',
        consumableType: 'potion',
        singleUse: true,
        depletionChance: 150, // Max is 100
        transformsTo: 'broken_item',
        cost: 50,
        usableBy: ['fighter'],
        cursed: false,
        effect: {
          type: 'heal',
          healing: '1d8'
        },
        special: null
      };

      expect(() => ItemSchemas.Consumable.parse(invalidConsumable)).toThrow();
    });
  });

  describe('SpecialItemSchema', () => {
    it('validates valid special item', () => {
      const validSpecial = {
        id: 'bronze_key',
        name: 'Bronze Key',
        category: 'special',
        specialType: 'key',
        purpose: 'Opens bronze doors',
        cost: 0,
        usableBy: ['fighter', 'mage', 'priest', 'thief', 'bishop', 'samurai', 'lord', 'ninja'],
        cursed: false,
        special: null
      };

      expect(() => ItemSchemas.Special.parse(validSpecial)).not.toThrow();
    });

    it('validates legendary item', () => {
      const legendaryItem = {
        id: 'werdnas_amulet',
        name: "Werdna's Amulet",
        category: 'special',
        specialType: 'legendary',
        purpose: 'Ultimate treasure',
        cost: 0,
        usableBy: ['fighter', 'mage', 'priest', 'thief', 'bishop', 'samurai', 'lord', 'ninja'],
        cursed: false,
        special: null
      };

      expect(() => ItemSchemas.Special.parse(legendaryItem)).not.toThrow();
    });

    it('validates broken item', () => {
      const brokenItem = {
        id: 'broken_item',
        name: 'Broken Item',
        category: 'special',
        specialType: 'broken',
        cost: 0,
        usableBy: ['fighter', 'mage', 'priest', 'thief', 'bishop', 'samurai', 'lord', 'ninja'],
        cursed: false,
        special: null
      };

      expect(() => ItemSchemas.Special.parse(brokenItem)).not.toThrow();
    });
  });

  describe('Discriminated Union', () => {
    it('correctly discriminates on category field', () => {
      const weapon = {
        id: 'sword',
        name: 'Sword',
        category: 'weapon',
        weaponType: 'sword',
        damage: { dice: '1d8', min: 1, max: 8 },
        enhancement: 0,
        cost: 100,
        usableBy: ['fighter'],
        cursed: false,
        special: null
      };

      const result = ItemSchema.parse(weapon);
      expect(result.category).toBe('weapon');
      if (result.category === 'weapon') {
        // TypeScript should narrow the type here
        expect(result.weaponType).toBe('sword');
      }
    });

    it('rejects item with wrong category-specific fields', () => {
      const invalidItem = {
        id: 'bad_item',
        name: 'Bad Item',
        category: 'weapon',
        // Missing weaponType and damage (required for weapons)
        enhancement: 0,
        cost: 100,
        usableBy: ['fighter'],
        cursed: false,
        special: null
      };

      expect(() => ItemSchema.parse(invalidItem)).toThrow();
    });
  });

  describe('Alignment Restrictions', () => {
    it('validates item with alignment restriction', () => {
      const alignmentItem = {
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

      expect(() => ItemSchemas.Weapon.parse(alignmentItem)).not.toThrow();
    });

    it('rejects item with invalid alignment', () => {
      const invalidItem = {
        id: 'bad_sword',
        name: 'Bad Sword',
        category: 'weapon',
        weaponType: 'sword',
        damage: { dice: '1d8', min: 1, max: 8 },
        enhancement: 0,
        cost: 100,
        usableBy: ['fighter'],
        cursed: false,
        alignmentRequired: 'invalid_alignment',
        special: null
      };

      expect(() => ItemSchemas.Weapon.parse(invalidItem)).toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('rejects item with missing required fields', () => {
      const incompleteItem = {
        id: 'incomplete',
        name: 'Incomplete Item',
        // Missing category
        cost: 100,
        usableBy: ['fighter'],
        cursed: false
      };

      expect(() => ItemSchema.parse(incompleteItem)).toThrow();
    });

    it('rejects item with negative cost', () => {
      const negativeCostItem = {
        id: 'bad_item',
        name: 'Bad Item',
        category: 'weapon',
        weaponType: 'sword',
        damage: { dice: '1d8', min: 1, max: 8 },
        enhancement: 0,
        cost: -100, // Negative cost
        usableBy: ['fighter'],
        cursed: false,
        special: null
      };

      expect(() => ItemSchemas.Weapon.parse(negativeCostItem)).toThrow();
    });

    it('rejects item with empty id', () => {
      const emptyIdItem = {
        id: '', // Empty string
        name: 'Item',
        category: 'weapon',
        weaponType: 'sword',
        damage: { dice: '1d8', min: 1, max: 8 },
        enhancement: 0,
        cost: 100,
        usableBy: ['fighter'],
        cursed: false,
        special: null
      };

      expect(() => ItemSchemas.Weapon.parse(emptyIdItem)).toThrow();
    });

    it('rejects item with empty name', () => {
      const emptyNameItem = {
        id: 'item',
        name: '', // Empty string
        category: 'weapon',
        weaponType: 'sword',
        damage: { dice: '1d8', min: 1, max: 8 },
        enhancement: 0,
        cost: 100,
        usableBy: ['fighter'],
        cursed: false,
        special: null
      };

      expect(() => ItemSchemas.Weapon.parse(emptyNameItem)).toThrow();
    });

    it('handles special field as null', () => {
      const itemWithNullSpecial = {
        id: 'simple_sword',
        name: 'Simple Sword',
        category: 'weapon',
        weaponType: 'sword',
        damage: { dice: '1d8', min: 1, max: 8 },
        enhancement: 0,
        cost: 100,
        usableBy: ['fighter'],
        cursed: false,
        special: null
      };

      const result = ItemSchemas.Weapon.parse(itemWithNullSpecial);
      expect(result.special).toBeNull();
    });

    it('handles special field omitted (defaults to null)', () => {
      const itemWithoutSpecial = {
        id: 'simple_sword',
        name: 'Simple Sword',
        category: 'weapon',
        weaponType: 'sword',
        damage: { dice: '1d8', min: 1, max: 8 },
        enhancement: 0,
        cost: 100,
        usableBy: ['fighter'],
        cursed: false
        // special field omitted
      };

      const result = ItemSchemas.Weapon.parse(itemWithoutSpecial);
      expect(result.special).toBeNull();
    });
  });
});
