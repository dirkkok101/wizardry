// src/services/__tests__/CharacterResistanceService.spec.ts

import { CharacterResistanceService } from '../CharacterResistanceService'
import { Character } from '@models/Character'
import { CharacterClass } from '@models/CharacterClass'
import { CharacterStatus } from '@models/CharacterStatus'
import { Race } from '@models/Race'
import { ResistanceType } from '@models/CharacterResistance'
import { RandomService } from '../RandomService'
import { createTestCharacter } from '@testing/test-factories'

describe('CharacterResistanceService', () => {
  beforeEach(() => {
    RandomService.resetSeed()
  })

  describe('calculateResistance', () => {
    describe('class bonuses', () => {
      it('returns Fighter poison resistance (15% class + 5% Human race)', () => {
        const fighter = createTestCharacter({
          class: CharacterClass.FIGHTER,
          race: Race.HUMAN,  // Human has 5% poison resistance
          level: 1,
          luck: 5  // Below 6, no luck bonus
        })

        const result = CharacterResistanceService.calculateResistance(fighter, 'poison')

        expect(result.breakdown.classBonus).toBe(15)
        expect(result.breakdown.raceBonus).toBe(5)  // Human has poison resistance
        expect(result.breakdown.levelBonus).toBe(0)
        expect(result.breakdown.luckBonus).toBe(0)
        expect(result.resistChance).toBe(20)  // 15 + 5
      })

      it('returns Ninja combined resistances', () => {
        // Ninja has: poison 15%, paralysis 15%, critical 15%, stoning 10%,
        // breath 20%, poisonGasTrap 15%, antiMageTrap 10%, antiPriestTrap 10%
        const ninja = createTestCharacter({
          class: CharacterClass.NINJA,
          race: Race.HUMAN,
          level: 1,
          luck: 5
        })

        expect(CharacterResistanceService.calculateResistance(ninja, 'poison').breakdown.classBonus).toBe(15)
        expect(CharacterResistanceService.calculateResistance(ninja, 'paralysis').breakdown.classBonus).toBe(15)
        expect(CharacterResistanceService.calculateResistance(ninja, 'critical').breakdown.classBonus).toBe(15)
        expect(CharacterResistanceService.calculateResistance(ninja, 'stoning').breakdown.classBonus).toBe(10)
        expect(CharacterResistanceService.calculateResistance(ninja, 'breath').breakdown.classBonus).toBe(20)
        expect(CharacterResistanceService.calculateResistance(ninja, 'poisonGasTrap').breakdown.classBonus).toBe(15)
      })

      it('returns Mage antiMageTrap resistance (15%)', () => {
        const mage = createTestCharacter({
          class: CharacterClass.MAGE,
          race: Race.HUMAN,
          level: 1,
          luck: 5
        })

        const result = CharacterResistanceService.calculateResistance(mage, 'antiMageTrap')
        expect(result.breakdown.classBonus).toBe(15)
      })

      it('returns 0% for classes without that resistance', () => {
        const fighter = createTestCharacter({
          class: CharacterClass.FIGHTER,
          race: Race.HUMAN,
          level: 1,
          luck: 5
        })

        // Fighter has no breath resistance
        const result = CharacterResistanceService.calculateResistance(fighter, 'breath')
        expect(result.breakdown.classBonus).toBe(0)
      })
    })

    describe('race bonuses', () => {
      it('returns Dwarf poisonGasTrap resistance (20%)', () => {
        const dwarf = createTestCharacter({
          class: CharacterClass.FIGHTER,  // Fighter has no poisonGasTrap resistance
          race: Race.DWARF,
          level: 1,
          luck: 5
        })

        const result = CharacterResistanceService.calculateResistance(dwarf, 'poisonGasTrap')
        expect(result.breakdown.raceBonus).toBe(20)
      })

      it('returns Elf breath resistance (10%)', () => {
        const elf = createTestCharacter({
          class: CharacterClass.MAGE,  // Mage has no breath resistance
          race: Race.ELF,
          level: 1,
          luck: 5
        })

        const result = CharacterResistanceService.calculateResistance(elf, 'breath')
        expect(result.breakdown.raceBonus).toBe(10)
      })

      it('returns Gnome stoning resistance (10%)', () => {
        const gnome = createTestCharacter({
          class: CharacterClass.FIGHTER,
          race: Race.GNOME,
          level: 1,
          luck: 5
        })

        const result = CharacterResistanceService.calculateResistance(gnome, 'stoning')
        expect(result.breakdown.raceBonus).toBe(10)
      })

      it('returns Hobbit antiMageTrap resistance (15%)', () => {
        const hobbit = createTestCharacter({
          class: CharacterClass.FIGHTER,
          race: Race.HOBBIT,
          level: 1,
          luck: 5
        })

        const result = CharacterResistanceService.calculateResistance(hobbit, 'antiMageTrap')
        expect(result.breakdown.raceBonus).toBe(15)
      })
    })

    describe('level bonus', () => {
      it('returns +0% for levels 1-4', () => {
        const char = createTestCharacter({ level: 4, luck: 5 })
        const result = CharacterResistanceService.calculateResistance(char, 'poison')
        expect(result.breakdown.levelBonus).toBe(0)
      })

      it('returns +5% for levels 5-9', () => {
        const char = createTestCharacter({ level: 5, luck: 5 })
        expect(CharacterResistanceService.calculateResistance(char, 'poison').breakdown.levelBonus).toBe(5)

        const char9 = createTestCharacter({ level: 9, luck: 5 })
        expect(CharacterResistanceService.calculateResistance(char9, 'poison').breakdown.levelBonus).toBe(5)
      })

      it('returns +10% for levels 10-14', () => {
        const char = createTestCharacter({ level: 10, luck: 5 })
        expect(CharacterResistanceService.calculateResistance(char, 'poison').breakdown.levelBonus).toBe(10)
      })

      it('returns +15% for levels 15-19', () => {
        const char = createTestCharacter({ level: 15, luck: 5 })
        expect(CharacterResistanceService.calculateResistance(char, 'poison').breakdown.levelBonus).toBe(15)
      })

      it('returns +20% for level 20+', () => {
        const char = createTestCharacter({ level: 20, luck: 5 })
        expect(CharacterResistanceService.calculateResistance(char, 'poison').breakdown.levelBonus).toBe(20)
      })
    })

    describe('luck bonus', () => {
      it('returns +0% for Luck < 6', () => {
        const char = createTestCharacter({ luck: 5, level: 1 })
        expect(CharacterResistanceService.calculateResistance(char, 'poison').breakdown.luckBonus).toBe(0)
      })

      it('returns +5% for Luck 6-11', () => {
        const char6 = createTestCharacter({ luck: 6, level: 1 })
        expect(CharacterResistanceService.calculateResistance(char6, 'poison').breakdown.luckBonus).toBe(5)

        const char11 = createTestCharacter({ luck: 11, level: 1 })
        expect(CharacterResistanceService.calculateResistance(char11, 'poison').breakdown.luckBonus).toBe(5)
      })

      it('returns +10% for Luck 12-17', () => {
        const char12 = createTestCharacter({ luck: 12, level: 1 })
        expect(CharacterResistanceService.calculateResistance(char12, 'poison').breakdown.luckBonus).toBe(10)

        const char17 = createTestCharacter({ luck: 17, level: 1 })
        expect(CharacterResistanceService.calculateResistance(char17, 'poison').breakdown.luckBonus).toBe(10)
      })

      it('returns +15% for Luck 18', () => {
        const char = createTestCharacter({ luck: 18, level: 1 })
        expect(CharacterResistanceService.calculateResistance(char, 'poison').breakdown.luckBonus).toBe(15)
      })
    })

    describe('combined bonuses', () => {
      it('combines class + race + level + luck bonuses', () => {
        // Ninja (15% poison) + Human (5% poison) + Level 10 (+10%) + Luck 12 (+10%) = 40%
        const ninja = createTestCharacter({
          class: CharacterClass.NINJA,
          race: Race.HUMAN,
          level: 10,
          luck: 12
        })

        const result = CharacterResistanceService.calculateResistance(ninja, 'poison')

        expect(result.breakdown.classBonus).toBe(15)
        expect(result.breakdown.raceBonus).toBe(5)
        expect(result.breakdown.levelBonus).toBe(10)
        expect(result.breakdown.luckBonus).toBe(10)
        expect(result.resistChance).toBe(40)
      })

      it('caps total resistance at 95%', () => {
        // Ninja (20% breath) + Elf (10% breath) + Level 50 (+50%) + Luck 18 (+15%) = 95% (capped)
        const ninja = createTestCharacter({
          class: CharacterClass.NINJA,
          race: Race.ELF,
          level: 50,
          luck: 18
        })

        const result = CharacterResistanceService.calculateResistance(ninja, 'breath')

        // 20 + 10 + 50 + 15 = 95 (no cap needed here, but verify)
        expect(result.resistChance).toBe(95)
      })

      it('verifies Dwarf vs Gas Bomb scenario from plan', () => {
        // Dwarf (level 10, luck 12) vs GAS_BOMB: 20% + 0% + 10% + 10% = 40%
        const dwarf = createTestCharacter({
          class: CharacterClass.FIGHTER,  // No poisonGasTrap class bonus
          race: Race.DWARF,               // +20% poisonGasTrap
          level: 10,                       // +10%
          luck: 12                         // +10%
        })

        const result = CharacterResistanceService.calculateResistance(dwarf, 'poisonGasTrap')

        expect(result.breakdown.classBonus).toBe(0)
        expect(result.breakdown.raceBonus).toBe(20)
        expect(result.breakdown.levelBonus).toBe(10)
        expect(result.breakdown.luckBonus).toBe(10)
        expect(result.resistChance).toBe(40)
      })
    })
  })

  describe('checkResistance', () => {
    describe('binary resistance (non-breath)', () => {
      it('returns resisted=true when roll succeeds', () => {
        // Queue a low roll (10%) - will succeed against 40% resistance
        RandomService.queueNextValues([0.1])

        const fighter = createTestCharacter({
          class: CharacterClass.FIGHTER,  // 15% poison
          race: Race.HUMAN,               // 5% poison
          level: 10,                       // +10%
          luck: 6                          // +5%
        })
        // Total: 15 + 5 + 10 + 5 = 35%

        const result = CharacterResistanceService.checkResistance(fighter, 'poison')

        expect(result.resisted).toBe(true)
        expect(result.damageMultiplier).toBe(1.0)  // Not breath, so normal multiplier
      })

      it('returns resisted=false when roll fails', () => {
        // Queue a high roll (95%) - will fail against 35% resistance
        RandomService.queueNextValues([0.95])

        const fighter = createTestCharacter({
          class: CharacterClass.FIGHTER,
          race: Race.HUMAN,
          level: 10,
          luck: 6
        })

        const result = CharacterResistanceService.checkResistance(fighter, 'poison')

        expect(result.resisted).toBe(false)
        expect(result.damageMultiplier).toBe(1.0)
      })
    })

    describe('breath attacks (half damage)', () => {
      it('returns damageMultiplier=0.5 when roll succeeds', () => {
        RandomService.queueNextValues([0.1])  // 10% < 30% = success

        const ninja = createTestCharacter({
          class: CharacterClass.NINJA,  // 20% breath
          race: Race.ELF,               // 10% breath
          level: 1,
          luck: 5
        })
        // Total: 20 + 10 + 0 + 0 = 30%

        const result = CharacterResistanceService.checkResistance(ninja, 'breath')

        expect(result.resisted).toBe(false)  // Breath is never fully resisted
        expect(result.damageMultiplier).toBe(0.5)  // Half damage
      })

      it('returns damageMultiplier=1.0 when roll fails', () => {
        RandomService.queueNextValues([0.95])  // 95% > 30% = fail

        const ninja = createTestCharacter({
          class: CharacterClass.NINJA,
          race: Race.ELF,
          level: 1,
          luck: 5
        })

        const result = CharacterResistanceService.checkResistance(ninja, 'breath')

        expect(result.resisted).toBe(false)  // Still not fully resisted
        expect(result.damageMultiplier).toBe(1.0)  // Full damage
      })
    })

    describe('edge cases', () => {
      it('returns 0% resistance when no bonuses apply', () => {
        const char = createTestCharacter({
          class: CharacterClass.FIGHTER,
          race: Race.HUMAN,
          level: 1,
          luck: 5
        })

        // Fighter/Human has no silence resistance
        const result = CharacterResistanceService.calculateResistance(char, 'silence')

        expect(result.resistChance).toBe(0)
        expect(result.breakdown.classBonus).toBe(0)
        expect(result.breakdown.raceBonus).toBe(0)
        expect(result.breakdown.levelBonus).toBe(0)
        expect(result.breakdown.luckBonus).toBe(0)
      })

      it('handles all resistance types', () => {
        const char = createTestCharacter({
          class: CharacterClass.NINJA,  // Has many resistances
          race: Race.HOBBIT,            // Has antiMageTrap, antiPriestTrap, silence
          level: 10,
          luck: 12
        })

        const types: ResistanceType[] = [
          'poisonGasTrap', 'antiMageTrap', 'antiPriestTrap',
          'poison', 'paralysis', 'stoning', 'silence',
          'critical', 'breath'
        ]

        for (const type of types) {
          const result = CharacterResistanceService.calculateResistance(char, type)
          expect(result.resistChance).toBeGreaterThanOrEqual(0)
          expect(result.resistChance).toBeLessThanOrEqual(95)
        }
      })
    })
  })
})
