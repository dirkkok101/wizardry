import { ItemUseService } from '../ItemUseService'
import { Character } from '@models/Character'
import { Item } from '@models/Item'
import { ItemType, ItemSlot } from '@models/ItemType'
import { RandomService } from '../RandomService'

// Helper to create test character
const createTestCharacter = (overrides: Partial<Character> = {}): Character => ({
  id: 'test-char-1',
  name: 'Test Hero',
  race: 'HUMAN',
  class: 'FIGHTER',
  alignment: 'GOOD',
  strength: 15,
  intelligence: 10,
  piety: 10,
  vitality: 14,
  agility: 12,
  luck: 10,
  level: 5,
  experience: 1000,
  age: 20,
  hp: 30,
  maxHp: 50,
  ac: 5,
  status: 'OK',
  vim: { current: 100, max: 100 },
  knownSpells: [],
  inventory: [],
  gold: 100,
  createdAt: Date.now(),
  lastModified: Date.now(),
  ...overrides
})

// Helper to create test item
const createTestItem = (overrides: Partial<Item> = {}): Item => ({
  id: 'test-item',
  name: 'Test Item',
  type: ItemType.CONSUMABLE,
  slot: ItemSlot.NONE,
  price: 100,
  cursed: false,
  identified: true,
  equipped: false,
  ...overrides
})

describe('ItemUseService', () => {
  beforeEach(() => {
    RandomService.resetSeed()
  })

  describe('canUseItem', () => {
    it('returns false for unidentified items', () => {
      const character = createTestCharacter()
      const item = createTestItem({ identified: false })

      const result = ItemUseService.canUseItem(character, item)

      expect(result.canUse).toBe(false)
      expect(result.reason).toContain('identified')
    })

    it('returns false for items with no effect', () => {
      const character = createTestCharacter()
      const item = createTestItem({ effect: undefined, special: null })

      const result = ItemUseService.canUseItem(character, item)

      expect(result.canUse).toBe(false)
      expect(result.reason).toContain('no usable effect')
    })

    it('returns false for wrong class', () => {
      const character = createTestCharacter({ class: 'MAGE' })
      const item = createTestItem({
        classRestrictions: ['FIGHTER', 'SAMURAI'],
        effect: { type: 'heal', healAmount: 10 }
      })

      const result = ItemUseService.canUseItem(character, item)

      expect(result.canUse).toBe(false)
      expect(result.reason).toContain('MAGE')
    })

    it('returns false for wrong alignment', () => {
      const character = createTestCharacter({ alignment: 'GOOD' })
      const item = createTestItem({
        alignmentRestrictions: ['EVIL'],
        effect: { type: 'heal', healAmount: 10 }
      })

      const result = ItemUseService.canUseItem(character, item)

      expect(result.canUse).toBe(false)
      expect(result.reason).toContain('alignment')
    })

    it('returns true for valid item with effect', () => {
      const character = createTestCharacter()
      const healingPotion = createTestItem({
        effect: { type: 'heal', healAmount: 10 }
      })

      const result = ItemUseService.canUseItem(character, healingPotion)

      expect(result.canUse).toBe(true)
    })

    it('returns true for item with special invoke', () => {
      const character = createTestCharacter()
      const magicRing = createTestItem({
        special: { invoke: 'cast_spell', spellId: 'porfic' }
      })

      const result = ItemUseService.canUseItem(character, magicRing)

      expect(result.canUse).toBe(true)
    })
  })

  describe('useItem', () => {
    describe('healing items', () => {
      it('heals character with potion', () => {
        const character = createTestCharacter({
          hp: 30,
          maxHp: 50,
          inventory: [createTestItem({
            id: 'potion_dios',
            name: 'Potion of DIOS',
            effect: { type: 'heal', healAmount: 15 },
            singleUse: true,
            depletionChance: 100
          })]
        })

        const result = ItemUseService.useItem(character, 'potion_dios')

        expect(result.success).toBe(true)
        expect(result.updatedCharacter.hp).toBe(45)
        expect(result.healing).toEqual({ amount: 15, target: 'self' })
      })

      it('does not exceed max HP when healing', () => {
        const character = createTestCharacter({
          hp: 45,
          maxHp: 50,
          inventory: [createTestItem({
            id: 'potion_dial',
            name: 'Potion of DIAL',
            effect: { type: 'heal', healAmount: 50 },
            singleUse: true
          })]
        })

        const result = ItemUseService.useItem(character, 'potion_dial')

        expect(result.updatedCharacter.hp).toBe(50)
        expect(result.healing?.amount).toBe(5) // Only healed 5
      })
    })

    describe('spell casting items', () => {
      it('casts spell from scroll', () => {
        // HALITO targets "single" monster per spell data
        const character = createTestCharacter({
          inventory: [createTestItem({
            id: 'scroll_halito',
            name: 'Scroll of HALITO',
            effect: { type: 'cast_spell', spellId: 'halito' },
            singleUse: true
          })]
        })

        const result = ItemUseService.useItem(character, 'scroll_halito')

        expect(result.success).toBe(true)
        expect(result.spellCast).toEqual({
          spellId: 'halito',
          targetType: 'enemy'  // HALITO targets single enemy, not all
        })
      })

      it('casts spell from equipment invoke', () => {
        // PORFIC targets "caster" per spell data, not party
        const character = createTestCharacter({
          inventory: [createTestItem({
            id: 'ring_porfic',
            name: 'Ring of PORFIC',
            special: { invoke: 'cast_spell', spellId: 'porfic' }
          })]
        })

        const result = ItemUseService.useItem(character, 'ring_porfic')

        expect(result.success).toBe(true)
        expect(result.spellCast).toEqual({
          spellId: 'porfic',
          targetType: 'self'  // PORFIC targets caster, not party
        })
      })
    })

    describe('stat bonus items', () => {
      it('grants HP bonus from item', () => {
        const character = createTestCharacter({
          hp: 30,
          maxHp: 50,
          inventory: [createTestItem({
            id: 'shuriken',
            name: 'Shuriken',
            special: {
              invoke: 'hp_bonus',
              invokeEffect: { stat: 'hp', bonus: 1 }
            }
          })]
        })

        const result = ItemUseService.useItem(character, 'shuriken')

        expect(result.success).toBe(true)
        expect(result.updatedCharacter.maxHp).toBe(51)
        expect(result.updatedCharacter.hp).toBe(31)
        expect(result.statBonus).toEqual({ stat: 'hp', bonus: 1 })
      })

      it('reports STR bonus from item', () => {
        const character = createTestCharacter({
          strength: 15,
          inventory: [createTestItem({
            id: 'murasama_blade',
            name: 'Murasama Blade',
            special: {
              invoke: 'str_bonus',
              invokeEffect: { stat: 'str', bonus: 1 }
            },
            depletionChance: 50
          })]
        })

        const result = ItemUseService.useItem(character, 'murasama_blade')

        expect(result.success).toBe(true)
        expect(result.statBonus).toEqual({ stat: 'strength', bonus: 1 })
      })
    })

    describe('depletion', () => {
      it('removes single-use item from inventory', () => {
        const character = createTestCharacter({
          inventory: [createTestItem({
            id: 'potion_dios',
            name: 'Potion of DIOS',
            effect: { type: 'heal', healAmount: 10 },
            singleUse: true,
            depletionChance: 100,
            transformsTo: null
          })]
        })

        const result = ItemUseService.useItem(character, 'potion_dios')

        expect(result.itemDepleted).toBe(true)
        expect(result.itemTransformedTo).toBeNull()
        expect(result.updatedCharacter.inventory).toHaveLength(0)
      })

      it('does not deplete item when roll fails', () => {
        RandomService.queueNextValues([0.99]) // 99% > 25% depletion chance = no depletion
        const character = createTestCharacter({
          inventory: [createTestItem({
            id: 'staff_mogref',
            name: 'Staff of MOGREF',
            special: { invoke: 'cast_spell', spellId: 'mogref' },
            depletionChance: 25
          })]
        })

        const result = ItemUseService.useItem(character, 'staff_mogref')

        expect(result.itemDepleted).toBe(false)
        expect(result.updatedCharacter.inventory).toHaveLength(1)
      })

      it('depletes item when roll succeeds', () => {
        RandomService.queueNextValues([0.10]) // 10% < 25% = depletes
        const character = createTestCharacter({
          inventory: [createTestItem({
            id: 'staff_mogref',
            name: 'Staff of MOGREF',
            special: { invoke: 'cast_spell', spellId: 'mogref' },
            depletionChance: 25,
            transformsTo: null
          })]
        })

        const result = ItemUseService.useItem(character, 'staff_mogref')

        expect(result.itemDepleted).toBe(true)
        expect(result.updatedCharacter.inventory).toHaveLength(0)
      })
    })

    describe('error cases', () => {
      it('fails if item not in inventory', () => {
        const character = createTestCharacter({ inventory: [] })

        const result = ItemUseService.useItem(character, 'nonexistent')

        expect(result.success).toBe(false)
        expect(result.message).toContain('not in inventory')
      })

      it('fails if item cannot be used', () => {
        const character = createTestCharacter({
          inventory: [createTestItem({
            id: 'unidentified',
            identified: false,
            effect: { type: 'heal', healAmount: 10 }
          })]
        })

        const result = ItemUseService.useItem(character, 'unidentified')

        expect(result.success).toBe(false)
        expect(result.message).toContain('identified')
      })
    })
  })

  describe('isSingleUse', () => {
    it('returns true for items with singleUse flag', () => {
      const item = createTestItem({ singleUse: true })
      expect(ItemUseService.isSingleUse(item)).toBe(true)
    })

    it('returns true for items with 100% depletion chance', () => {
      const item = createTestItem({ depletionChance: 100 })
      expect(ItemUseService.isSingleUse(item)).toBe(true)
    })

    it('returns false for reusable items', () => {
      const item = createTestItem({ singleUse: false, depletionChance: 25 })
      expect(ItemUseService.isSingleUse(item)).toBe(false)
    })
  })

  describe('getInvokeDescription', () => {
    it('returns spell description for cast_spell invoke', () => {
      const item = createTestItem({
        special: { invoke: 'cast_spell', spellId: 'halito' }
      })
      expect(ItemUseService.getInvokeDescription(item)).toBe('Casts HALITO')
    })

    it('returns null for items without invoke', () => {
      const item = createTestItem({ special: null })
      expect(ItemUseService.getInvokeDescription(item)).toBeNull()
    })

    it('returns class change description', () => {
      const item = createTestItem({
        special: { invoke: 'class_change', targetClass: 'ninja' }
      })
      expect(ItemUseService.getInvokeDescription(item)).toBe('Change class to ninja')
    })
  })
})
