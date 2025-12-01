import { CombatService } from '../CombatService'
import { createTestCharacter } from '@testing/test-factories'
import { CharacterClass } from '@models/CharacterClass'
import { Item } from '@models/Item'
import { ItemType, ItemSlot } from '@models/ItemType'

describe('CombatService - Weapon Swings', () => {
  describe('getAttacksPerRound with weapon swings', () => {
    it('uses weapon swings when higher than class attacks (Long Sword +2 gives level 1 Fighter 3 attacks)', () => {
      // Long Sword +2 has 3 swings per round
      const longSword: Item = {
        id: 'long_sword_2',
        name: 'Long Sword +2',
        type: ItemType.WEAPON,
        slot: ItemSlot.WEAPON,
        price: 4000,
        damage: 12,
        swings: 3,
        cursed: false,
        identified: true,
        equipped: true
      }

      const fighter = createTestCharacter({
        class: CharacterClass.FIGHTER,
        level: 1, // Fighter at level 1 normally gets 1 attack
        equippedWeapon: longSword
      })

      // Should use weapon's 3 swings, not class's 1 attack
      expect(CombatService.getAttacksPerRound(fighter)).toBe(3)
    })

    it('uses class attacks when higher than weapon swings (level 10 Fighter with 1-swing sword)', () => {
      const basicSword: Item = {
        id: 'short_sword',
        name: 'Short Sword',
        type: ItemType.WEAPON,
        slot: ItemSlot.WEAPON,
        price: 100,
        damage: 6,
        swings: 1, // Only 1 swing per round
        cursed: false,
        identified: true,
        equipped: true
      }

      const fighter = createTestCharacter({
        class: CharacterClass.FIGHTER,
        level: 10, // Fighter at level 10 gets 3 attacks (1 + floor(10/5))
        equippedWeapon: basicSword
      })

      // Should use class's 3 attacks, not weapon's 1 swing
      expect(CombatService.getAttacksPerRound(fighter)).toBe(3)
    })

    it('uses weapon swings for non-martial classes (level 1 Ninja with 3-swing weapon)', () => {
      const multiSwingWeapon: Item = {
        id: 'multi_strike_blade',
        name: 'Multi-Strike Blade',
        type: ItemType.WEAPON,
        slot: ItemSlot.WEAPON,
        price: 5000,
        damage: 8,
        swings: 3,
        cursed: false,
        identified: true,
        equipped: true
      }

      const ninja = createTestCharacter({
        class: CharacterClass.NINJA,
        level: 1, // Ninja at level 1 gets 2 attacks
        equippedWeapon: multiSwingWeapon
      })

      // Should use weapon's 3 swings (higher than class's 2 attacks)
      expect(CombatService.getAttacksPerRound(ninja)).toBe(3)
    })

    it('caps attacks at 10 maximum even with high weapon swings', () => {
      const crazyWeapon: Item = {
        id: 'super_blade',
        name: 'Blade of Many Strikes',
        type: ItemType.WEAPON,
        slot: ItemSlot.WEAPON,
        price: 10000,
        damage: 10,
        swings: 15, // Ridiculously high swings
        cursed: false,
        identified: true,
        equipped: true
      }

      const fighter = createTestCharacter({
        class: CharacterClass.FIGHTER,
        level: 1,
        equippedWeapon: crazyWeapon
      })

      // Should cap at 10, not use weapon's 15 swings
      expect(CombatService.getAttacksPerRound(fighter)).toBe(10)
    })

    it('ignores weapon swings if no weapon equipped', () => {
      const fighter = createTestCharacter({
        class: CharacterClass.FIGHTER,
        level: 1,
        equippedWeapon: undefined // No weapon
      })

      // Should use class's 1 attack
      expect(CombatService.getAttacksPerRound(fighter)).toBe(1)
    })

    it('uses class attacks if weapon has no swings property', () => {
      const weaponWithoutSwings: Item = {
        id: 'basic_dagger',
        name: 'Basic Dagger',
        type: ItemType.WEAPON,
        slot: ItemSlot.WEAPON,
        price: 50,
        damage: 4,
        // No swings property
        cursed: false,
        identified: true,
        equipped: true
      }

      const fighter = createTestCharacter({
        class: CharacterClass.FIGHTER,
        level: 5, // Gets 2 attacks from class
        equippedWeapon: weaponWithoutSwings
      })

      // Should use class's 2 attacks since weapon has no swings
      expect(CombatService.getAttacksPerRound(fighter)).toBe(2)
    })

    it('handles weapon swings of 0 correctly', () => {
      const zeroSwingWeapon: Item = {
        id: 'broken_weapon',
        name: 'Broken Weapon',
        type: ItemType.WEAPON,
        slot: ItemSlot.WEAPON,
        price: 1,
        damage: 1,
        swings: 0, // Broken weapon with 0 swings
        cursed: false,
        identified: true,
        equipped: true
      }

      const fighter = createTestCharacter({
        class: CharacterClass.FIGHTER,
        level: 5, // Gets 2 attacks from class
        equippedWeapon: zeroSwingWeapon
      })

      // Should use class's 2 attacks (max of 2 and 0)
      expect(CombatService.getAttacksPerRound(fighter)).toBe(2)
    })

    it('non-martial classes still get at least 1 attack with no weapon', () => {
      const mage = createTestCharacter({
        class: CharacterClass.MAGE,
        level: 10,
        equippedWeapon: undefined
      })

      // Mage always gets 1 attack
      expect(CombatService.getAttacksPerRound(mage)).toBe(1)
    })
  })
})
