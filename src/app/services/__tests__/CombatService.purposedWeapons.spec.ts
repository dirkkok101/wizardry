// Test for purposed weapon double damage
import { CombatService } from '../CombatService'
import { RandomService } from '../RandomService'
import { createTestCharacter, createTestMonster } from '@testing/test-factories'
import { Item } from '@models/Item'
import { MonsterInstance } from '@models/Combat'

describe('CombatService - Purposed Weapon Double Damage', () => {
  describe('resolveAttack with purposed weapons', () => {
    it('deals 2x damage when Dragon Slayer attacks dragon', () => {
      const dragonSlayer: Item = {
        id: 'dragon_slayer',
        name: 'Dragon Slayer',
        type: 'WEAPON',
        slot: 'WEAPON',
        price: 10000,
        damage: 11, // max from 2d6
        cursed: false,
        identified: true,
        equipped: true,
        effectiveAgainst: ['dragon']
      } as Item

      const attacker = createTestCharacter({
        strength: 10, // 0 STR bonus
        equippedWeapon: dragonSlayer
      })

      const dragon: MonsterInstance = createTestMonster({
        monsterId: 'dragon_puppy',
        name: 'Dragon Puppy',
        monsterClass: 'dragon'
      })

      // Queue: hit roll (low = hit), damage roll (0.99 for max 11), crit roll (high = no crit)
      RandomService.queueNextValues([0.1, 0.99, 0.99])

      const result = CombatService.resolveAttack(attacker, dragon)

      expect(result.hit).toBe(true)
      expect(result.critical).toBe(false)
      // Base damage 11 (max) * 2 (purposed) = 22
      expect(result.damage).toBe(22)
    })

    it('deals 2x damage when Mage Masher attacks mage', () => {
      const mageMasher: Item = {
        id: 'mage_masher',
        name: 'Mage Masher',
        type: 'WEAPON',
        slot: 'WEAPON',
        price: 10000,
        damage: 7, // max from 2d4
        cursed: false,
        identified: true,
        equipped: true,
        effectiveAgainst: ['mage']
      } as Item

      const attacker = createTestCharacter({
        strength: 10, // 0 STR bonus
        equippedWeapon: mageMasher
      })

      const mage: MonsterInstance = createTestMonster({
        monsterId: 'arch_mage',
        name: 'Arch Mage',
        monsterClass: 'mage'
      })

      // Queue: hit roll (low = hit), damage roll (0.99 for max 11), crit roll (high = no crit)
      RandomService.queueNextValues([0.1, 0.99, 0.99])

      const result = CombatService.resolveAttack(attacker, mage)

      expect(result.hit).toBe(true)
      expect(result.critical).toBe(false)
      // Base damage 7 (max) * 2 (purposed) = 14
      expect(result.damage).toBe(14)
    })

    it('deals 2x damage when Were Slayer attacks werebeast', () => {
      const wereSlayer: Item = {
        id: 'were_slayer',
        name: 'Were Slayer',
        type: 'WEAPON',
        slot: 'WEAPON',
        price: 10000,
        damage: 11, // max from 2d6
        cursed: false,
        identified: true,
        equipped: true,
        effectiveAgainst: ['werebeast']
      } as Item

      const attacker = createTestCharacter({
        strength: 10, // 0 STR bonus
        equippedWeapon: wereSlayer
      })

      const werebeast: MonsterInstance = createTestMonster({
        monsterId: 'wererat',
        name: 'Wererat',
        monsterClass: 'werebeast'
      })

      // Queue: hit roll (low = hit), damage roll (0.99 for max 11), crit roll (high = no crit)
      RandomService.queueNextValues([0.1, 0.99, 0.99])

      const result = CombatService.resolveAttack(attacker, werebeast)

      expect(result.hit).toBe(true)
      expect(result.critical).toBe(false)
      // Base damage 11 (max) * 2 (purposed) = 22
      expect(result.damage).toBe(22)
    })

    it('deals normal damage when purposed weapon attacks non-matching monster class', () => {
      const dragonSlayer: Item = {
        id: 'dragon_slayer',
        name: 'Dragon Slayer',
        type: 'WEAPON',
        slot: 'WEAPON',
        price: 10000,
        damage: 11, // max from 2d6
        cursed: false,
        identified: true,
        equipped: true,
        effectiveAgainst: ['dragon']
      } as Item

      const attacker = createTestCharacter({
        strength: 10, // 0 STR bonus
        equippedWeapon: dragonSlayer
      })

      const mage: MonsterInstance = createTestMonster({
        monsterId: 'arch_mage',
        name: 'Arch Mage',
        monsterClass: 'mage' // Not dragon!
      })

      // Queue: hit roll (low = hit), damage roll (0.99 for max 11), crit roll (high = no crit)
      RandomService.queueNextValues([0.1, 0.99, 0.99])

      const result = CombatService.resolveAttack(attacker, mage)

      expect(result.hit).toBe(true)
      expect(result.critical).toBe(false)
      // Base damage 11 (no multiplier) = 11
      expect(result.damage).toBe(11)
    })

    it('deals normal damage when non-purposed weapon attacks any monster', () => {
      const longSword: Item = {
        id: 'long_sword',
        name: 'Long Sword',
        type: 'WEAPON',
        slot: 'WEAPON',
        price: 25,
        damage: 8, // max from 1d8
        cursed: false,
        identified: true,
        equipped: true
        // No effectiveAgainst property
      } as Item

      const attacker = createTestCharacter({
        strength: 10, // 0 STR bonus
        equippedWeapon: longSword
      })

      const dragon: MonsterInstance = createTestMonster({
        monsterId: 'dragon_puppy',
        name: 'Dragon Puppy',
        monsterClass: 'dragon'
      })

      // Queue: hit roll (low = hit), damage roll (0.99 for max 11), crit roll (high = no crit)
      RandomService.queueNextValues([0.1, 0.99, 0.99])

      const result = CombatService.resolveAttack(attacker, dragon)

      expect(result.hit).toBe(true)
      expect(result.critical).toBe(false)
      // Base damage 8 (no multiplier) = 8
      expect(result.damage).toBe(8)
    })

    it('applies purposed multiplier with STR bonus', () => {
      const dragonSlayer: Item = {
        id: 'dragon_slayer',
        name: 'Dragon Slayer',
        type: 'WEAPON',
        slot: 'WEAPON',
        price: 10000,
        damage: 11, // max from 2d6
        cursed: false,
        identified: true,
        equipped: true,
        effectiveAgainst: ['dragon']
      } as Item

      const attacker = createTestCharacter({
        strength: 16, // +1 STR damage bonus
        equippedWeapon: dragonSlayer
      })

      const dragon: MonsterInstance = createTestMonster({
        monsterId: 'dragon_puppy',
        name: 'Dragon Puppy',
        monsterClass: 'dragon'
      })

      // Queue: hit roll (low = hit), damage roll (0.99 for max 11), crit roll (high = no crit)
      RandomService.queueNextValues([0.1, 0.99, 0.99])

      const result = CombatService.resolveAttack(attacker, dragon)

      expect(result.hit).toBe(true)
      expect(result.critical).toBe(false)
      // (Base damage 11 + STR +1 = 12) * 2 (purposed) = 24
      expect(result.damage).toBe(24)
    })

    it('applies purposed multiplier before helpless multiplier', () => {
      const dragonSlayer: Item = {
        id: 'dragon_slayer',
        name: 'Dragon Slayer',
        type: 'WEAPON',
        slot: 'WEAPON',
        price: 10000,
        damage: 11, // max from 2d6
        cursed: false,
        identified: true,
        equipped: true,
        effectiveAgainst: ['dragon']
      } as Item

      const attacker = createTestCharacter({
        strength: 10, // 0 STR bonus
        equippedWeapon: dragonSlayer
      })

      const dragon: MonsterInstance = createTestMonster({
        monsterId: 'dragon_puppy',
        name: 'Dragon Puppy',
        monsterClass: 'dragon',
        status: 'PARALYZED' // Helpless = 2x damage
      })

      // Queue: hit roll (low = hit), damage roll (0.99 for max 11), crit roll (high = no crit)
      RandomService.queueNextValues([0.1, 0.99, 0.99])

      const result = CombatService.resolveAttack(attacker, dragon)

      expect(result.hit).toBe(true)
      expect(result.critical).toBe(false)
      // (Base 11 * 2 purposed = 22) * 2 helpless = 44
      expect(result.damage).toBe(44)
    })

    it('does not multiply critical hits (crits are instant kill, not damage)', () => {
      const dragonSlayer: Item = {
        id: 'dragon_slayer',
        name: 'Dragon Slayer',
        type: 'WEAPON',
        slot: 'WEAPON',
        price: 10000,
        damage: 11, // max from 2d6
        cursed: false,
        identified: true,
        equipped: true,
        effectiveAgainst: ['dragon']
      } as Item

      const attacker = createTestCharacter({
        strength: 10, // 0 STR bonus
        level: 10, // 20% crit chance
        equippedWeapon: dragonSlayer
      })

      const dragon: MonsterInstance = createTestMonster({
        monsterId: 'dragon_puppy',
        name: 'Dragon Puppy',
        monsterClass: 'dragon',
        level: 1 // Low level = less crit resistance
      })

      // Queue: hit roll (low = hit), damage roll, crit roll (low = crit), resist roll (high = no resist)
      RandomService.queueNextValues([0.1, 1.0, 0.1, 30])

      const result = CombatService.resolveAttack(attacker, dragon)

      expect(result.hit).toBe(true)
      expect(result.critical).toBe(true)
      expect(result.instantKill).toBe(true)
      // Critical = instant kill, damage is still calculated but instant kill takes precedence
      expect(result.message).toContain('Critical hit')
    })
  })
})
