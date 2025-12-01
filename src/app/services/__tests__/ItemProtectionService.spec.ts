// src/services/__tests__/ItemProtectionService.spec.ts
import { ItemProtectionService } from '../ItemProtectionService'
import { Character } from '@models/Character'
import { Item } from '@models/Item'
import { CharacterClass } from '@models/CharacterClass'
import { CharacterStatus } from '@models/CharacterStatus'
import { Race } from '@models/Race'
import { Alignment } from '@models/Alignment'

/**
 * ItemProtectionService Tests
 *
 * Per Apple II reference (Section 11B: Item Protection System):
 *
 * Elemental Protection:
 * - Items with elemental resistance halve damage from breath attacks
 * - Fire, Cold, Stone, Drain, Poison, Lightning, Acid
 *
 * Class Protection (vs. Monster Types):
 * - 50% chance to nullify attacks from specific monster classes
 * - Dragon, Werebeast, Mage, Undead, Demon, Giant, Mythical, Insect
 *
 * Physical Protection:
 * - Immune to paralysis from hits
 * - Immune to critical hits (cannot be decapitated)
 *
 * Magic Protection:
 * - Nullifies monster spells when targeting protected character
 */

// Helper to create test character with optional equipment
function createTestCharacter(overrides?: Partial<Character>): Character {
  return {
    id: 'test-char',
    name: 'Test Hero',
    race: Race.HUMAN,
    class: CharacterClass.FIGHTER,
    alignment: Alignment.GOOD,
    strength: 14,
    intelligence: 10,
    piety: 10,
    vitality: 12,
    agility: 12,
    luck: 10,
    level: 5,
    maxLev: 5,
    experience: 1000,
    age: 1000,
    hp: 30,
    maxHp: 30,
    ac: 5,
    status: CharacterStatus.OK,
    vim: { current: 100, max: 100 },
    knownSpells: [],
    inventory: [],
    gold: 0,
    deathCount: 0,
    monsterKills: 0,
    ...overrides
  }
}

// Helper to create test item with protection
function createProtectionItem(protection: string | string[]): Item {
  const special = Array.isArray(protection)
    ? { protections: protection }
    : { protection }

  return {
    id: 'protection-item',
    name: 'Protection Item',
    type: 'ACCESSORY',
    slot: 'ACCESSORY',
    price: 1000,
    cursed: false,
    identified: true,
    equipped: true,
    special
  } as Item
}

describe('ItemProtectionService', () => {
  describe('getCharacterProtections', () => {
    it('returns empty set for character with no equipment', () => {
      const char = createTestCharacter()
      const protections = ItemProtectionService.getCharacterProtections(char)
      expect(protections.size).toBe(0)
    })

    it('collects protection from equipped weapon', () => {
      const char = createTestCharacter({
        equippedWeapon: createProtectionItem('fire')
      })
      const protections = ItemProtectionService.getCharacterProtections(char)
      expect(protections.has('fire')).toBe(true)
    })

    it('collects protection from equipped armor', () => {
      const char = createTestCharacter({
        equippedArmor: createProtectionItem('fire')
      })
      const protections = ItemProtectionService.getCharacterProtections(char)
      expect(protections.has('fire')).toBe(true)
    })

    it('collects multiple protections from array', () => {
      const char = createTestCharacter({
        equippedArmor: createProtectionItem(['fire', 'cold', 'poison'])
      })
      const protections = ItemProtectionService.getCharacterProtections(char)
      expect(protections.has('fire')).toBe(true)
      expect(protections.has('cold')).toBe(true)
      expect(protections.has('poison')).toBe(true)
    })

    it('combines protections from multiple equipment slots', () => {
      const char = createTestCharacter({
        equippedArmor: createProtectionItem('fire'),
        equippedShield: createProtectionItem('cold'),
        equippedHelmet: createProtectionItem('poison')
      })
      const protections = ItemProtectionService.getCharacterProtections(char)
      expect(protections.has('fire')).toBe(true)
      expect(protections.has('cold')).toBe(true)
      expect(protections.has('poison')).toBe(true)
    })

    it('includes equipped inventory items (accessories)', () => {
      const accessory = createProtectionItem('magic')
      accessory.equipped = true

      const char = createTestCharacter({
        inventory: [accessory]
      })
      const protections = ItemProtectionService.getCharacterProtections(char)
      expect(protections.has('magic')).toBe(true)
    })

    it('ignores unequipped inventory items', () => {
      const accessory = createProtectionItem('magic')
      accessory.equipped = false

      const char = createTestCharacter({
        inventory: [accessory]
      })
      const protections = ItemProtectionService.getCharacterProtections(char)
      expect(protections.has('magic')).toBe(false)
    })
  })

  describe('hasElementalResistance', () => {
    it('returns false for character without protection', () => {
      const char = createTestCharacter()
      expect(ItemProtectionService.hasElementalResistance(char, 'fire')).toBe(false)
    })

    it('returns true for matching elemental protection', () => {
      const char = createTestCharacter({
        equippedArmor: createProtectionItem('fire')
      })
      expect(ItemProtectionService.hasElementalResistance(char, 'fire')).toBe(true)
    })

    it('returns false for non-matching element', () => {
      const char = createTestCharacter({
        equippedArmor: createProtectionItem('fire')
      })
      expect(ItemProtectionService.hasElementalResistance(char, 'cold')).toBe(false)
    })

    it('handles case-insensitive matching', () => {
      const char = createTestCharacter({
        equippedArmor: createProtectionItem('Fire')
      })
      expect(ItemProtectionService.hasElementalResistance(char, 'FIRE')).toBe(true)
    })

    it('returns true for "all" protection against any element', () => {
      const char = createTestCharacter({
        equippedArmor: createProtectionItem('all')
      })
      expect(ItemProtectionService.hasElementalResistance(char, 'fire')).toBe(true)
      expect(ItemProtectionService.hasElementalResistance(char, 'cold')).toBe(true)
      expect(ItemProtectionService.hasElementalResistance(char, 'stone')).toBe(true)
    })

    it('matches breath types: fire, cold, stone, drain, poison', () => {
      const fireChar = createTestCharacter({ equippedArmor: createProtectionItem('fire') })
      const coldChar = createTestCharacter({ equippedArmor: createProtectionItem('cold') })
      const stoneChar = createTestCharacter({ equippedArmor: createProtectionItem('stone') })
      const drainChar = createTestCharacter({ equippedArmor: createProtectionItem('drain') })
      const poisonChar = createTestCharacter({ equippedArmor: createProtectionItem('poison') })

      expect(ItemProtectionService.hasElementalResistance(fireChar, 'fire')).toBe(true)
      expect(ItemProtectionService.hasElementalResistance(coldChar, 'cold')).toBe(true)
      expect(ItemProtectionService.hasElementalResistance(stoneChar, 'stone')).toBe(true)
      expect(ItemProtectionService.hasElementalResistance(drainChar, 'drain')).toBe(true)
      expect(ItemProtectionService.hasElementalResistance(poisonChar, 'poison')).toBe(true)
    })
  })

  describe('hasClassProtection', () => {
    it('returns false for character without protection', () => {
      const char = createTestCharacter()
      expect(ItemProtectionService.hasClassProtection(char, 'dragon')).toBe(false)
    })

    it('returns true for matching monster class protection', () => {
      const char = createTestCharacter({
        equippedWeapon: createProtectionItem('dragon')
      })
      expect(ItemProtectionService.hasClassProtection(char, 'dragon')).toBe(true)
    })

    it('returns false for non-matching monster class', () => {
      const char = createTestCharacter({
        equippedWeapon: createProtectionItem('dragon')
      })
      expect(ItemProtectionService.hasClassProtection(char, 'undead')).toBe(false)
    })

    it('handles case-insensitive matching', () => {
      const char = createTestCharacter({
        equippedWeapon: createProtectionItem('Dragon')
      })
      expect(ItemProtectionService.hasClassProtection(char, 'DRAGON')).toBe(true)
    })

    it('returns true for "all" protection against any monster class', () => {
      const char = createTestCharacter({
        equippedArmor: createProtectionItem('all')
      })
      expect(ItemProtectionService.hasClassProtection(char, 'dragon')).toBe(true)
      expect(ItemProtectionService.hasClassProtection(char, 'undead')).toBe(true)
      expect(ItemProtectionService.hasClassProtection(char, 'demon')).toBe(true)
    })

    it('matches monster classes: dragon, werebeast, mage, undead, demon, giant, mythical, insect', () => {
      const classes = ['dragon', 'werebeast', 'mage', 'undead', 'demon', 'giant', 'mythical', 'insect']
      for (const cls of classes) {
        const char = createTestCharacter({ equippedWeapon: createProtectionItem(cls) })
        expect(ItemProtectionService.hasClassProtection(char, cls)).toBe(true)
      }
    })
  })

  describe('hasPhysicalProtection', () => {
    it('returns false for character without physical protection', () => {
      const char = createTestCharacter()
      expect(ItemProtectionService.hasPhysicalProtection(char)).toBe(false)
    })

    it('returns true for character with physical protection', () => {
      const char = createTestCharacter({
        equippedArmor: createProtectionItem('physical')
      })
      expect(ItemProtectionService.hasPhysicalProtection(char)).toBe(true)
    })

    it('returns true for "all" protection', () => {
      const char = createTestCharacter({
        equippedArmor: createProtectionItem('all')
      })
      expect(ItemProtectionService.hasPhysicalProtection(char)).toBe(true)
    })
  })

  describe('hasMagicProtection', () => {
    it('returns false for character without magic protection', () => {
      const char = createTestCharacter()
      expect(ItemProtectionService.hasMagicProtection(char)).toBe(false)
    })

    it('returns true for character with magic protection', () => {
      const char = createTestCharacter({
        equippedArmor: createProtectionItem('magic')
      })
      expect(ItemProtectionService.hasMagicProtection(char)).toBe(true)
    })

    it('returns true for "all" protection', () => {
      const char = createTestCharacter({
        equippedArmor: createProtectionItem('all')
      })
      expect(ItemProtectionService.hasMagicProtection(char)).toBe(true)
    })
  })

  describe('hasPoisonProtection', () => {
    it('returns false for character without poison protection', () => {
      const char = createTestCharacter()
      expect(ItemProtectionService.hasPoisonProtection(char)).toBe(false)
    })

    it('returns true for character with poison protection', () => {
      const char = createTestCharacter({
        equippedArmor: createProtectionItem('poison')
      })
      expect(ItemProtectionService.hasPoisonProtection(char)).toBe(true)
    })

    it('returns true for "all" protection', () => {
      const char = createTestCharacter({
        equippedArmor: createProtectionItem('all')
      })
      expect(ItemProtectionService.hasPoisonProtection(char)).toBe(true)
    })
  })

  describe('hasDrainProtection', () => {
    it('returns false for character without drain protection', () => {
      const char = createTestCharacter()
      expect(ItemProtectionService.hasDrainProtection(char)).toBe(false)
    })

    it('returns true for character with drain protection', () => {
      const char = createTestCharacter({
        equippedArmor: createProtectionItem('drain')
      })
      expect(ItemProtectionService.hasDrainProtection(char)).toBe(true)
    })

    it('returns true for "all" protection', () => {
      const char = createTestCharacter({
        equippedArmor: createProtectionItem('all')
      })
      expect(ItemProtectionService.hasDrainProtection(char)).toBe(true)
    })
  })

  describe('real item integration', () => {
    it('Chain Pro Fire provides fire protection', () => {
      // Simulating the real item from data/items/chain_pro_fire.json
      const chainProFire: Item = {
        id: 'chain_pro_fire',
        name: 'Chain Pro Fire',
        type: 'ARMOR',
        slot: 'BODY',
        price: 150000,
        cursed: false,
        identified: true,
        equipped: true,
        special: {
          protection: 'fire'
        }
      } as Item

      const char = createTestCharacter({
        equippedArmor: chainProFire
      })

      expect(ItemProtectionService.hasElementalResistance(char, 'fire')).toBe(true)
      expect(ItemProtectionService.hasElementalResistance(char, 'cold')).toBe(false)
    })

    it('Ring Pro Undead provides undead class protection', () => {
      // Simulating the real item from data/items/ring_pro_undead.json
      const ringProUndead: Item = {
        id: 'ring_pro_undead',
        name: 'Ring Pro Undead',
        type: 'ACCESSORY',
        slot: 'ACCESSORY',
        price: 500000,
        cursed: false,
        identified: true,
        equipped: true,
        special: {
          protection: 'undead'
        }
      } as Item

      const char = createTestCharacter({
        inventory: [ringProUndead]
      })

      expect(ItemProtectionService.hasClassProtection(char, 'undead')).toBe(true)
      expect(ItemProtectionService.hasClassProtection(char, 'dragon')).toBe(false)
    })

    it('Shuriken provides poison and drain protection', () => {
      // Simulating the real item from data/items/shuriken.json
      const shuriken: Item = {
        id: 'shuriken',
        name: 'Shuriken',
        type: 'WEAPON',
        slot: 'WEAPON',
        price: 50000,
        cursed: false,
        identified: true,
        equipped: true,
        special: {
          protections: ['poison', 'drain']
        }
      } as Item

      const char = createTestCharacter({
        equippedWeapon: shuriken
      })

      expect(ItemProtectionService.hasPoisonProtection(char)).toBe(true)
      expect(ItemProtectionService.hasDrainProtection(char)).toBe(true)
      expect(ItemProtectionService.hasElementalResistance(char, 'poison')).toBe(true)
      expect(ItemProtectionService.hasElementalResistance(char, 'drain')).toBe(true)
    })

    it('Lords Garb provides multiple class protections', () => {
      // Simulating the real item from data/items/lords_garb.json
      const lordsGarb: Item = {
        id: 'lords_garb',
        name: "Lord's Garb",
        type: 'ARMOR',
        slot: 'BODY',
        price: 0,
        cursed: false,
        identified: true,
        equipped: true,
        special: {
          protections: ['mythical', 'dragon', 'werebeast', 'demon', 'undead']
        }
      } as Item

      const char = createTestCharacter({
        equippedArmor: lordsGarb
      })

      expect(ItemProtectionService.hasClassProtection(char, 'mythical')).toBe(true)
      expect(ItemProtectionService.hasClassProtection(char, 'dragon')).toBe(true)
      expect(ItemProtectionService.hasClassProtection(char, 'werebeast')).toBe(true)
      expect(ItemProtectionService.hasClassProtection(char, 'demon')).toBe(true)
      expect(ItemProtectionService.hasClassProtection(char, 'undead')).toBe(true)
      expect(ItemProtectionService.hasClassProtection(char, 'mage')).toBe(false) // Not included
    })

    it('Werdna Amulet provides all protections', () => {
      // Simulating the real item from data/items/werdna_amulet.json
      const werdnaAmulet: Item = {
        id: 'werdna_amulet',
        name: "Werdna's Amulet",
        type: 'ACCESSORY',
        slot: 'ACCESSORY',
        price: 0,
        cursed: false,
        identified: true,
        equipped: true,
        special: {
          protections: ['all']
        }
      } as Item

      const char = createTestCharacter({
        inventory: [werdnaAmulet]
      })

      // All protection types should return true
      expect(ItemProtectionService.hasElementalResistance(char, 'fire')).toBe(true)
      expect(ItemProtectionService.hasElementalResistance(char, 'cold')).toBe(true)
      expect(ItemProtectionService.hasElementalResistance(char, 'stone')).toBe(true)
      expect(ItemProtectionService.hasClassProtection(char, 'dragon')).toBe(true)
      expect(ItemProtectionService.hasClassProtection(char, 'undead')).toBe(true)
      expect(ItemProtectionService.hasPhysicalProtection(char)).toBe(true)
      expect(ItemProtectionService.hasMagicProtection(char)).toBe(true)
      expect(ItemProtectionService.hasPoisonProtection(char)).toBe(true)
      expect(ItemProtectionService.hasDrainProtection(char)).toBe(true)
    })
  })
})
