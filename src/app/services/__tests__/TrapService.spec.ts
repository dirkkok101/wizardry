/**
 * TrapService Tests
 *
 * Tests for trap inspection and disarm mechanics matching original Wizardry 1 formulas.
 */

import { TrapService } from '../TrapService'
import { RandomService } from '../RandomService'
import { createTestCharacter } from '@testing/test-factories'
import { CharacterClass } from '@models/CharacterClass'
import { CharacterStatus } from '@models/CharacterStatus'
import { TrapId } from '@models/Trap'
import { Chest, RewardTier } from '@models/Chest'

// Helper to create a test chest
function createTestChest(overrides: Partial<Chest> = {}): Chest {
  return {
    id: 'test-chest',
    trapped: true,
    trapId: 'POISON_NEEDLE',
    trapIdentified: false,
    trapDisarmed: false,
    rewardTier: 1 as RewardTier,
    contents: { gold: 100, items: [] },
    sourcePosition: { x: 0, y: 0, facing: 'NORTH' },
    mazeLevel: 1,
    source: 'combat_victory',
    ...overrides
  }
}

describe('TrapService', () => {
  beforeEach(() => {
    RandomService.resetSeed()
  })

  describe('calculateInspectChance', () => {
    it('should calculate 95% for Thief with AGI 16+', () => {
      const thief = createTestCharacter({ class: CharacterClass.THIEF, agility: 16 })
      expect(TrapService.calculateInspectChance(thief)).toBe(95)
    })

    it('should calculate 95% for Thief with AGI 18 (capped)', () => {
      const thief = createTestCharacter({ class: CharacterClass.THIEF, agility: 18 })
      // 18 × 6 = 108, capped at 95
      expect(TrapService.calculateInspectChance(thief)).toBe(95)
    })

    it('should calculate 72% for Ninja with AGI 18', () => {
      const ninja = createTestCharacter({ class: CharacterClass.NINJA, agility: 18 })
      // 18 × 4 = 72
      expect(TrapService.calculateInspectChance(ninja)).toBe(72)
    })

    it('should calculate 60% for Thief with AGI 10', () => {
      const thief = createTestCharacter({ class: CharacterClass.THIEF, agility: 10 })
      // 10 × 6 = 60
      expect(TrapService.calculateInspectChance(thief)).toBe(60)
    })

    it('should calculate 12% for Fighter with AGI 12', () => {
      const fighter = createTestCharacter({ class: CharacterClass.FIGHTER, agility: 12 })
      // 12 × 1 = 12
      expect(TrapService.calculateInspectChance(fighter)).toBe(12)
    })

    it('should calculate 10% for Mage with AGI 10', () => {
      const mage = createTestCharacter({ class: CharacterClass.MAGE, agility: 10 })
      // 10 × 1 = 10
      expect(TrapService.calculateInspectChance(mage)).toBe(10)
    })

    it('should use multiplier 1 for Priest', () => {
      const priest = createTestCharacter({ class: CharacterClass.PRIEST, agility: 15 })
      // 15 × 1 = 15
      expect(TrapService.calculateInspectChance(priest)).toBe(15)
    })

    it('should use multiplier 1 for Bishop', () => {
      const bishop = createTestCharacter({ class: CharacterClass.BISHOP, agility: 14 })
      // 14 × 1 = 14
      expect(TrapService.calculateInspectChance(bishop)).toBe(14)
    })
  })

  describe('calculateDisarmChance', () => {
    it('should calculate 71% for Level 1 Thief on Maze Level 1', () => {
      const thief = createTestCharacter({ class: CharacterClass.THIEF, level: 1 })
      // (1 + 50 - 1) / 70 × 100 = 71.43%
      const chance = TrapService.calculateDisarmChance(thief, 1)
      expect(chance).toBeCloseTo(71.43, 1)
    })

    it('should calculate 84% for Level 10 Thief on Maze Level 1', () => {
      const thief = createTestCharacter({ class: CharacterClass.THIEF, level: 10 })
      // (10 + 50 - 1) / 70 × 100 = 84.29%
      const chance = TrapService.calculateDisarmChance(thief, 1)
      expect(chance).toBeCloseTo(84.29, 1)
    })

    it('should calculate 0% for Level 1 Fighter on Maze Level 1', () => {
      const fighter = createTestCharacter({ class: CharacterClass.FIGHTER, level: 1 })
      // (1 + 0 - 1) / 70 × 100 = 0%
      expect(TrapService.calculateDisarmChance(fighter, 1)).toBe(0)
    })

    it('should calculate ~71% for Level 51 Fighter (equals Level 1 Thief)', () => {
      const fighter = createTestCharacter({ class: CharacterClass.FIGHTER, level: 51 })
      const thief = createTestCharacter({ class: CharacterClass.THIEF, level: 1 })

      // Fighter: (51 + 0 - 1) / 70 = 71.43%
      // Thief: (1 + 50 - 1) / 70 = 71.43%
      const fighterChance = TrapService.calculateDisarmChance(fighter, 1)
      const thiefChance = TrapService.calculateDisarmChance(thief, 1)

      expect(fighterChance).toBeCloseTo(thiefChance, 1)
    })

    it('should reduce chance on higher maze levels', () => {
      const thief = createTestCharacter({ class: CharacterClass.THIEF, level: 1 })

      const chanceLevel1 = TrapService.calculateDisarmChance(thief, 1)
      const chanceLevel5 = TrapService.calculateDisarmChance(thief, 5)

      // Level 1: (1 + 50 - 1) / 70 = 71.43%
      // Level 5: (1 + 50 - 5) / 70 = 65.71%
      expect(chanceLevel1).toBeGreaterThan(chanceLevel5)
      expect(chanceLevel5).toBeCloseTo(65.71, 1)
    })

    it('should cap chance at 95%', () => {
      const thief = createTestCharacter({ class: CharacterClass.THIEF, level: 50 })
      // (50 + 50 - 1) / 70 = 141% → capped at 95%
      expect(TrapService.calculateDisarmChance(thief, 1)).toBe(95)
    })

    it('should not go below 0%', () => {
      const fighter = createTestCharacter({ class: CharacterClass.FIGHTER, level: 1 })
      // (1 + 0 - 10) / 70 = -12.86% → capped at 0%
      expect(TrapService.calculateDisarmChance(fighter, 10)).toBe(0)
    })

    it('should give Ninja same +50 bonus as Thief', () => {
      const ninja = createTestCharacter({ class: CharacterClass.NINJA, level: 1 })
      const thief = createTestCharacter({ class: CharacterClass.THIEF, level: 1 })

      expect(TrapService.calculateDisarmChance(ninja, 1))
        .toBe(TrapService.calculateDisarmChance(thief, 1))
    })
  })

  describe('calculateTriggerAvoidance', () => {
    it('should calculate 90% for AGI 18', () => {
      const character = createTestCharacter({ agility: 18 })
      // 18 × 5 = 90%
      expect(TrapService.calculateTriggerAvoidance(character)).toBe(90)
    })

    it('should calculate 50% for AGI 10', () => {
      const character = createTestCharacter({ agility: 10 })
      // 10 × 5 = 50%
      expect(TrapService.calculateTriggerAvoidance(character)).toBe(50)
    })

    it('should calculate 15% for AGI 3', () => {
      const character = createTestCharacter({ agility: 3 })
      // 3 × 5 = 15%
      expect(TrapService.calculateTriggerAvoidance(character)).toBe(15)
    })
  })

  describe('calculateWrongNameTriggerChance', () => {
    it('should return ~99% trigger for level 10 character', () => {
      // Original formula: Level × 0.1% chance to NOT trigger
      // So trigger chance = 100 - (10 × 0.1) = 99%
      expect(TrapService.calculateWrongNameTriggerChance(10)).toBeCloseTo(99, 0)
    })

    it('should return ~95% trigger for level 50 character', () => {
      // 100 - (50 × 0.1) = 95%
      expect(TrapService.calculateWrongNameTriggerChance(50)).toBeCloseTo(95, 0)
    })

    it('should return ~99.9% trigger for level 1 character', () => {
      // 100 - (1 × 0.1) = 99.9%
      expect(TrapService.calculateWrongNameTriggerChance(1)).toBeCloseTo(99.9, 1)
    })

    it('should not go below 0%', () => {
      // Even at absurdly high level (1000+), cap at 0%
      expect(TrapService.calculateWrongNameTriggerChance(1000)).toBe(0)
    })
  })

  describe('calculateScaledDamage (authentic Wizardry 1)', () => {
    it('should return base damage on maze level 1', () => {
      // Level 1: scale factor = 1 + (0 * 0.25) = 1.0
      expect(TrapService.calculateScaledDamage(10, 1)).toBe(10)
    })

    it('should increase damage by 25% per maze level beyond 1', () => {
      // Level 2: scale factor = 1 + (1 * 0.25) = 1.25
      expect(TrapService.calculateScaledDamage(10, 2)).toBe(12) // 10 * 1.25 = 12.5 → 12
    })

    it('should scale significantly on deep levels', () => {
      // Level 5: scale factor = 1 + (4 * 0.25) = 2.0
      expect(TrapService.calculateScaledDamage(10, 5)).toBe(20)

      // Level 10: scale factor = 1 + (9 * 0.25) = 3.25
      expect(TrapService.calculateScaledDamage(10, 10)).toBe(32) // 10 * 3.25 = 32.5 → 32
    })

    it('should floor the result', () => {
      // Level 3: scale factor = 1 + (2 * 0.25) = 1.5
      expect(TrapService.calculateScaledDamage(7, 3)).toBe(10) // 7 * 1.5 = 10.5 → 10
    })
  })

  describe('escalateStatus (authentic Wizardry 1)', () => {
    it('should not escalate POISONED (stays POISONED)', () => {
      const result = TrapService.escalateStatus(CharacterStatus.POISONED, CharacterStatus.POISONED)
      expect(result).toBe(CharacterStatus.POISONED)
    })

    it('should escalate PARALYZED + PARALYZED to DEAD', () => {
      const result = TrapService.escalateStatus(CharacterStatus.PARALYZED, CharacterStatus.PARALYZED)
      expect(result).toBe(CharacterStatus.DEAD)
    })

    it('should escalate STONED + STONED to DEAD', () => {
      const result = TrapService.escalateStatus(CharacterStatus.STONED, CharacterStatus.STONED)
      expect(result).toBe(CharacterStatus.DEAD)
    })

    it('should not escalate OK to POISONED (just apply new status)', () => {
      const result = TrapService.escalateStatus(CharacterStatus.OK, CharacterStatus.POISONED)
      expect(result).toBe(CharacterStatus.POISONED)
    })

    it('should not escalate different statuses (apply new one)', () => {
      // Already paralyzed, getting poisoned → just poisoned
      const result = TrapService.escalateStatus(CharacterStatus.PARALYZED, CharacterStatus.POISONED)
      expect(result).toBe(CharacterStatus.POISONED)
    })
  })

  describe('attemptInspection', () => {
    it('should succeed when roll is under inspect chance', () => {
      const thief = createTestCharacter({ class: CharacterClass.THIEF, agility: 16 })
      const chest = createTestChest()

      // Queue values: first for critical failure check (> 2 = no crit), second for inspect (< 95 = success)
      RandomService.queueNextValues([0.5, 0.5])

      const result = TrapService.attemptInspection(thief, chest)

      expect(result.success).toBe(true)
      expect(result.trapIdentified).toBe('POISON_NEEDLE')
      expect(result.triggered).toBe(false)
    })

    it('should return random trap name on failed inspection (deception mechanic)', () => {
      const fighter = createTestCharacter({ class: CharacterClass.FIGHTER, agility: 18 })
      const chest = createTestChest({ trapId: 'POISON_NEEDLE' })

      // Queue values: crit check pass, inspection fail, AGI trigger check pass (roll < AGI), random trap pick
      RandomService.queueNextValues([0.5, 0.99, 0.1, 0.3])

      const result = TrapService.attemptInspection(fighter, chest)

      expect(result.success).toBe(false)
      expect(result.triggered).toBe(false)
      // Should return SOME trap name (deception - could be correct by chance)
      expect(result.trapIdentified).not.toBeNull()
    })

    it('should trigger trap if AGI check fails on failed inspection', () => {
      const fighter = createTestCharacter({ class: CharacterClass.FIGHTER, agility: 5 })
      const chest = createTestChest()

      // Queue values: crit check pass, inspection fail, AGI trigger check fail (roll >= 5)
      // AGI check: RandomService.random(0, 19) - if result >= AGI, trap triggers
      RandomService.queueNextValues([0.5, 0.99])  // crit pass, inspect fail
      RandomService.queueNextValues([0.5])  // 0.5 * 20 = 10 >= 5 = fail AGI check

      const result = TrapService.attemptInspection(fighter, chest)

      expect(result.success).toBe(false)
      expect(result.triggered).toBe(true)
      expect(result.trapIdentified).toBeNull()
    })

    it('should trigger trap on critical failure (1-2%)', () => {
      const thief = createTestCharacter({ class: CharacterClass.THIEF, agility: 16 })
      const chest = createTestChest()

      // Queue value for critical failure check (< 2% = critical failure)
      RandomService.queueNextValues([0.01])

      const result = TrapService.attemptInspection(thief, chest)

      expect(result.success).toBe(false)
      expect(result.triggered).toBe(true)
    })

    it('should not trigger on untrapped chest even with critical failure', () => {
      const thief = createTestCharacter({ class: CharacterClass.THIEF, agility: 16 })
      const chest = createTestChest({ trapped: false, trapId: null })

      // Queue value for critical failure check
      RandomService.queueNextValues([0.01])

      const result = TrapService.attemptInspection(thief, chest)

      expect(result.triggered).toBe(false)
    })

    it('should return random trap on failed inspection of untrapped chest', () => {
      const fighter = createTestCharacter({ class: CharacterClass.FIGHTER, agility: 10 })
      const chest = createTestChest({ trapped: false, trapId: null })

      // Queue: crit pass, inspect fail, random trap selection
      RandomService.queueNextValues([0.5, 0.99, 0.3])

      const result = TrapService.attemptInspection(fighter, chest)

      expect(result.success).toBe(false)
      expect(result.triggered).toBe(false)
      // Deception: even untrapped chest returns random trap name on failed inspect!
      expect(result.trapIdentified).not.toBeNull()
    })
  })

  describe('attemptDisarm', () => {
    it('should succeed with correct trap name and successful roll', () => {
      const thief = createTestCharacter({ class: CharacterClass.THIEF, level: 10 })
      const chest = createTestChest({ mazeLevel: 1 })

      // Queue value for disarm roll (< 84% = success)
      RandomService.queueNextValues([0.5])

      const result = TrapService.attemptDisarm(thief, chest, 'POISON NEEDLE')

      expect(result.success).toBe(true)
      expect(result.triggered).toBe(false)
      expect(result.wrongName).toBe(false)
    })

    it('should almost always trigger with wrong trap name (99%+ chance)', () => {
      const thief = createTestCharacter({ class: CharacterClass.THIEF, level: 10 })
      const chest = createTestChest({ mazeLevel: 1 })

      // Level 10 = 99% trigger chance
      // Queue value > 1% avoid chance = trigger
      RandomService.queueNextValues([0.5])  // 50% > 1% = trigger

      const result = TrapService.attemptDisarm(thief, chest, 'WRONG TRAP')

      expect(result.success).toBe(false)
      expect(result.wrongName).toBe(true)
      expect(result.triggered).toBe(true)  // 50% < 99% trigger = trigger
    })

    it('should very rarely avoid trigger with wrong name (based on character level)', () => {
      // A level 1000 character would have 0% trigger chance (100 - 1000*0.1 = 0%)
      const godlike = createTestCharacter({ class: CharacterClass.THIEF, level: 1000 })
      const chest = createTestChest({ mazeLevel: 10 })

      // At level 1000, trigger chance is 0%, so any roll avoids
      RandomService.queueNextValues([0.5])

      const result = TrapService.attemptDisarm(godlike, chest, 'WRONG TRAP')

      expect(result.success).toBe(false)
      expect(result.wrongName).toBe(true)
      expect(result.triggered).toBe(false)  // 0% trigger = never triggers
    })

    it('should check AGI save on failed disarm', () => {
      const thief = createTestCharacter({ class: CharacterClass.THIEF, level: 1, agility: 18 })
      const chest = createTestChest({ mazeLevel: 1 })

      // Queue values: first for disarm (> 71% = fail), second for AGI save (< 90% = saved)
      RandomService.queueNextValues([0.99, 0.5])

      const result = TrapService.attemptDisarm(thief, chest, 'POISON NEEDLE')

      expect(result.success).toBe(false)
      expect(result.triggered).toBe(false)  // Saved by AGI
    })

    it('should trigger if AGI save fails', () => {
      const thief = createTestCharacter({ class: CharacterClass.THIEF, level: 1, agility: 10 })
      const chest = createTestChest({ mazeLevel: 1 })

      // Queue values: first for disarm (> 71% = fail), second for AGI save (> 50% = not saved)
      RandomService.queueNextValues([0.99, 0.99])

      const result = TrapService.attemptDisarm(thief, chest, 'POISON NEEDLE')

      expect(result.success).toBe(false)
      expect(result.triggered).toBe(true)  // AGI save failed
    })

    it('should accept trap name with different casing', () => {
      const thief = createTestCharacter({ class: CharacterClass.THIEF, level: 10 })
      const chest = createTestChest({ mazeLevel: 1 })

      RandomService.queueNextValues([0.5])

      const result = TrapService.attemptDisarm(thief, chest, 'poison needle')

      expect(result.wrongName).toBe(false)
    })

    it('should accept trap name without spaces', () => {
      const thief = createTestCharacter({ class: CharacterClass.THIEF, level: 10 })
      const chest = createTestChest({ mazeLevel: 1 })

      RandomService.queueNextValues([0.5])

      const result = TrapService.attemptDisarm(thief, chest, 'POISONNEEDLE')

      expect(result.wrongName).toBe(false)
    })
  })

  describe('applyTrapEffects', () => {
    it('should apply damage to opener for CROSSBOW_BOLT', () => {
      const opener = createTestCharacter({ id: 'opener' })
      const party = [opener]

      // Queue dice roll for 2d8 damage
      RandomService.queueNextValues([0.5, 0.5])

      const result = TrapService.applyTrapEffects('CROSSBOW_BOLT', opener, party)

      expect(result.damageDealt.has('opener')).toBe(true)
      expect(result.damageDealt.get('opener')).toBeGreaterThan(0)
      expect(result.statusApplied.size).toBe(0)
    })

    it('should apply poison status to opener for POISON_NEEDLE', () => {
      const opener = createTestCharacter({ id: 'opener' })
      const party = [opener]

      // Queue dice roll for 1d6 damage
      RandomService.queueNextValues([0.5])

      const result = TrapService.applyTrapEffects('POISON_NEEDLE', opener, party)

      expect(result.statusApplied.get('opener')).toBe(CharacterStatus.POISONED)
    })

    it('should apply damage to entire party for GAS_BOMB', () => {
      const opener = createTestCharacter({ id: 'opener' })
      const member1 = createTestCharacter({ id: 'member1' })
      const member2 = createTestCharacter({ id: 'member2' })
      const party = [opener, member1, member2]

      // Queue dice rolls for 2d6 damage for each party member (2 dice × 3 members = 6 rolls)
      RandomService.queueNextValues([0.5, 0.5, 0.5, 0.5, 0.5, 0.5])

      const result = TrapService.applyTrapEffects('GAS_BOMB', opener, party)

      expect(result.damageDealt.size).toBe(3)
      expect(result.statusApplied.size).toBe(3)
    })

    it('should only affect mages and bishops for MAGE_BLASTER', () => {
      const opener = createTestCharacter({ id: 'opener', class: CharacterClass.FIGHTER })
      const mage = createTestCharacter({ id: 'mage', class: CharacterClass.MAGE })
      const bishop = createTestCharacter({ id: 'bishop', class: CharacterClass.BISHOP })
      const priest = createTestCharacter({ id: 'priest', class: CharacterClass.PRIEST })
      const party = [opener, mage, bishop, priest]

      // Queue dice rolls for 4d6 damage for each affected target (4 dice × 2 targets = 8 rolls)
      RandomService.queueNextValues([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5])

      const result = TrapService.applyTrapEffects('MAGE_BLASTER', opener, party)

      expect(result.damageDealt.has('mage')).toBe(true)
      expect(result.damageDealt.has('bishop')).toBe(true)
      expect(result.damageDealt.has('opener')).toBe(false)
      expect(result.damageDealt.has('priest')).toBe(false)
    })

    it('should return teleport special effect for TELEPORTER', () => {
      const opener = createTestCharacter({ id: 'opener' })
      const party = [opener]

      const result = TrapService.applyTrapEffects('TELEPORTER', opener, party)

      expect(result.specialEffect).toBe('teleport')
      expect(result.damageDealt.size).toBe(0)
    })

    it('should return combat special effect for ALARM', () => {
      const opener = createTestCharacter({ id: 'opener' })
      const party = [opener]

      const result = TrapService.applyTrapEffects('ALARM', opener, party)

      expect(result.specialEffect).toBe('combat')
    })

    describe('maze level scaling (authentic Wizardry 1)', () => {
      it('should apply base damage on maze level 1', () => {
        const opener = createTestCharacter({ id: 'opener' })
        const party = [opener]

        // Queue dice roll for 2d8 damage
        RandomService.queueNextValues([0.5, 0.5])  // ~5 + ~5 = 10 base

        const result = TrapService.applyTrapEffects('CROSSBOW_BOLT', opener, party, 1)

        const baseDamage = result.damageDealt.get('opener')!
        expect(baseDamage).toBeGreaterThan(0)
      })

      it('should scale damage by 25% per level beyond 1', () => {
        const opener = createTestCharacter({ id: 'opener' })
        const party = [opener]

        // Test level 1 vs level 5
        // Seed for deterministic damage
        RandomService.setSeed(12345)
        const result1 = TrapService.applyTrapEffects('CROSSBOW_BOLT', opener, party, 1)
        const damage1 = result1.damageDealt.get('opener')!

        // Same rolls at level 5 should give 2x damage (1 + 4*0.25 = 2.0)
        RandomService.setSeed(12345)
        const result5 = TrapService.applyTrapEffects('CROSSBOW_BOLT', opener, party, 5)
        const damage5 = result5.damageDealt.get('opener')!

        expect(damage5).toBe(damage1 * 2)
      })

      it('should apply scaling to party-wide traps', () => {
        const member1 = createTestCharacter({ id: 'char1' })
        const member2 = createTestCharacter({ id: 'char2' })
        const party = [member1, member2]

        // GAS_BOMB hits entire party
        RandomService.setSeed(12345)
        const result1 = TrapService.applyTrapEffects('GAS_BOMB', member1, party, 1)

        RandomService.setSeed(12345)
        const result5 = TrapService.applyTrapEffects('GAS_BOMB', member1, party, 5)

        // Each member should have 2x damage at level 5
        expect(result5.damageDealt.get('char1')!).toBe(result1.damageDealt.get('char1')! * 2)
        expect(result5.damageDealt.get('char2')!).toBe(result1.damageDealt.get('char2')! * 2)
      })
    })

    describe('status escalation (authentic Wizardry 1)', () => {
      it('should escalate PARALYZED to DEAD on already paralyzed character', () => {
        const opener = createTestCharacter({
          id: 'opener',
          name: 'Stunned',
          status: CharacterStatus.PARALYZED
        })
        const party = [opener]

        // STUNNER applies PARALYZED - queue hit roll
        RandomService.queueNextValues([0.5])

        const result = TrapService.applyTrapEffects('STUNNER', opener, party)

        expect(result.statusApplied.get('opener')).toBe(CharacterStatus.DEAD)
        expect(result.message).toContain('already paralyzed and dies')
      })

      it('should NOT escalate POISONED (stays POISONED)', () => {
        const opener = createTestCharacter({
          id: 'opener',
          status: CharacterStatus.POISONED
        })
        const party = [opener]

        // POISON_NEEDLE applies damage + POISONED
        RandomService.queueNextValues([0.5])  // 1d6 damage

        const result = TrapService.applyTrapEffects('POISON_NEEDLE', opener, party)

        // Should stay POISONED, not escalate
        expect(result.statusApplied.get('opener')).toBe(CharacterStatus.POISONED)
        expect(result.message).not.toContain('dies')
      })

      it('should apply status normally to OK character', () => {
        const opener = createTestCharacter({
          id: 'opener',
          status: CharacterStatus.OK
        })
        const party = [opener]

        RandomService.queueNextValues([0.5])

        const result = TrapService.applyTrapEffects('STUNNER', opener, party)

        expect(result.statusApplied.get('opener')).toBe(CharacterStatus.PARALYZED)
        expect(result.message).toContain('paralyzed')
        expect(result.message).not.toContain('dies')
      })
    })

    describe('hitChance', () => {
      it('should hit when roll is below hitChance (SPLINTERS 70%)', () => {
        const opener = createTestCharacter({ id: 'opener', name: 'Fighter' })
        const party = [opener]

        // Queue: hit roll (0.5 < 0.7 = hit), then damage roll for 1d6
        RandomService.queueNextValues([0.5, 0.5])

        const result = TrapService.applyTrapEffects('SPLINTERS', opener, party)

        expect(result.damageDealt.has('opener')).toBe(true)
        expect(result.message).toContain('takes')
      })

      it('should miss when roll exceeds hitChance (BLADES 30%)', () => {
        const opener = createTestCharacter({ id: 'opener', name: 'Fighter' })
        const party = [opener]

        // Queue: hit roll (0.8 > 0.3 = miss)
        RandomService.queueNextValues([0.8])

        const result = TrapService.applyTrapEffects('BLADES', opener, party)

        expect(result.damageDealt.has('opener')).toBe(false)
        expect(result.message).toContain('avoids')
      })

      it('should always hit traps without hitChance (default 1.0)', () => {
        const opener = createTestCharacter({ id: 'opener', name: 'Fighter' })
        const party = [opener]

        // CROSSBOW_BOLT has no hitChance, should always hit
        // Queue damage roll only (2d8)
        RandomService.queueNextValues([0.5, 0.5])

        const result = TrapService.applyTrapEffects('CROSSBOW_BOLT', opener, party)

        expect(result.damageDealt.has('opener')).toBe(true)
      })

      it('should roll hitChance independently for each party member', () => {
        const member1 = createTestCharacter({ id: 'char1', name: 'Fighter' })
        const member2 = createTestCharacter({ id: 'char2', name: 'Mage' })
        const party = [member1, member2]

        // SPLINTERS (70% hit) - queue: char1 hits (0.5 < 0.7), damage, char2 misses (0.8 > 0.7)
        RandomService.queueNextValues([0.5, 0.5, 0.8])

        const result = TrapService.applyTrapEffects('SPLINTERS', member1, party)

        expect(result.damageDealt.has('char1')).toBe(true)
        expect(result.damageDealt.has('char2')).toBe(false)
        expect(result.message).toContain('Fighter takes')
        expect(result.message).toContain('Mage avoids')
      })
    })
  })

  describe('canCastCalfo', () => {
    it('should return true for Priest with CALFO and spell points', () => {
      const priest = createTestCharacter({
        class: CharacterClass.PRIEST,
        knownSpells: ['calfo'],
        spellPoints: {
          priest: {
            level1: { current: 3, max: 3 },
            level2: { current: 2, max: 2 }  // Level 2 has 2 SP
          }
        }
      })

      expect(TrapService.canCastCalfo(priest)).toBe(true)
    })

    it('should return false for Priest without CALFO spell', () => {
      const priest = createTestCharacter({
        class: CharacterClass.PRIEST,
        knownSpells: ['dios'],  // Only knows DIOS, not CALFO
        spellPoints: {
          priest: {
            level1: { current: 3, max: 3 },
            level2: { current: 2, max: 2 }
          }
        }
      })

      expect(TrapService.canCastCalfo(priest)).toBe(false)
    })

    it('should return false for Priest without level 2 spell points', () => {
      const priest = createTestCharacter({
        class: CharacterClass.PRIEST,
        knownSpells: ['calfo'],
        spellPoints: {
          priest: {
            level1: { current: 3, max: 3 },
            level2: { current: 0, max: 2 }  // Level 2 has 0 SP
          }
        }
      })

      expect(TrapService.canCastCalfo(priest)).toBe(false)
    })

    it('should return false for Fighter', () => {
      const fighter = createTestCharacter({
        class: CharacterClass.FIGHTER,
        knownSpells: ['calfo']
      })

      expect(TrapService.canCastCalfo(fighter)).toBe(false)
    })

    it('should return true for Bishop with CALFO', () => {
      const bishop = createTestCharacter({
        class: CharacterClass.BISHOP,
        knownSpells: ['calfo'],
        spellPoints: {
          mage: {
            level1: { current: 2, max: 2 }
          },
          priest: {
            level1: { current: 2, max: 2 },
            level2: { current: 1, max: 1 }
          }
        }
      })

      expect(TrapService.canCastCalfo(bishop)).toBe(true)
    })

    it('should return true for Lord with CALFO', () => {
      const lord = createTestCharacter({
        class: CharacterClass.LORD,
        knownSpells: ['calfo'],
        spellPoints: {
          priest: {
            level1: { current: 2, max: 2 },
            level2: { current: 1, max: 1 }
          }
        }
      })

      expect(TrapService.canCastCalfo(lord)).toBe(true)
    })
  })

  describe('castCalfo', () => {
    it('should identify trap with 95% success rate', () => {
      const priest = createTestCharacter({ class: CharacterClass.PRIEST })
      const chest = createTestChest()

      // Queue success roll (< 95% = success)
      RandomService.queueNextValues([0.5])

      const result = TrapService.castCalfo(priest, chest)

      expect(result.success).toBe(true)
      expect(result.trapIdentified).toBe('POISON_NEEDLE')
      expect(result.triggered).toBe(false)
    })

    it('should return random trap name on 5% failure (deception mechanic)', () => {
      const priest = createTestCharacter({ class: CharacterClass.PRIEST })
      const chest = createTestChest({ trapId: 'POISON_NEEDLE' })

      // Queue failure roll (> 95% = fail), then random trap selection
      RandomService.queueNextValues([0.99, 0.3])

      const result = TrapService.castCalfo(priest, chest)

      expect(result.success).toBe(false)
      // Should return random trap, not null (deception mechanic)
      expect(result.trapIdentified).not.toBeNull()
      expect(result.triggered).toBe(false)
    })

    it('should never trigger trap', () => {
      const priest = createTestCharacter({ class: CharacterClass.PRIEST })
      const chest = createTestChest()

      // Even on failure, CALFO should never trigger
      RandomService.queueNextValues([0.99, 0.5])  // fail + random trap

      const result = TrapService.castCalfo(priest, chest)

      expect(result.triggered).toBe(false)
    })

    it('should return null trap on success for untrapped chest', () => {
      const priest = createTestCharacter({ class: CharacterClass.PRIEST })
      const chest = createTestChest({ trapped: false, trapId: null })

      // Queue success roll
      RandomService.queueNextValues([0.5])

      const result = TrapService.castCalfo(priest, chest)

      expect(result.success).toBe(true)
      expect(result.trapIdentified).toBeNull()  // Correctly identifies no trap
    })
  })

  // ============================================
  // SCRAMBLED LETTERS SYSTEM TESTS
  // ============================================

  describe('scrambleLetters', () => {
    it('should scramble all letters from trap name', () => {
      RandomService.setSeed(12345)  // Deterministic shuffle
      const result = TrapService.scrambleLetters('POISON NEEDLE')

      // Should have same letters, different order
      const originalLetters = 'POISON NEEDLE'.split('').sort().join('')
      const scrambledLetters = result.map(l => l.char).sort().join('')
      expect(scrambledLetters).toBe(originalLetters)

      // All should start as hidden
      expect(result.every(l => l.state === 'hidden')).toBe(true)
    })

    it('should preserve spaces in scramble', () => {
      RandomService.setSeed(12345)
      const result = TrapService.scrambleLetters('GAS BOMB')

      const spaceCount = result.filter(l => l.char === ' ').length
      expect(spaceCount).toBe(1)  // "GAS BOMB" has 1 space
    })

    it('should track original positions', () => {
      RandomService.setSeed(12345)
      const result = TrapService.scrambleLetters('ABC')

      // Each letter should have a unique original position 0, 1, or 2
      const positions = result.map(l => l.position).sort()
      expect(positions).toEqual([0, 1, 2])
    })

    it('should handle single character', () => {
      const result = TrapService.scrambleLetters('X')

      expect(result.length).toBe(1)
      expect(result[0].char).toBe('X')
      expect(result[0].position).toBe(0)
      expect(result[0].state).toBe('hidden')
    })
  })

  describe('revealLetters', () => {
    it('should reveal percentage of letters based on skill', () => {
      RandomService.setSeed(12345)
      const scrambled = TrapService.scrambleLetters('POISON NEEDLE')

      // High skill = reveal ~80% as green, ~20% as red
      // Note: "POISON NEEDLE" is 13 chars; 80% + 20% = 10 + 2 = 12 (floored)
      const revealed = TrapService.revealLetters(scrambled, 80, 20)

      const greenCount = revealed.filter(l => l.state === 'green').length
      const redCount = revealed.filter(l => l.state === 'red').length
      const hiddenCount = revealed.filter(l => l.state === 'hidden').length

      // ~80% green = 10, ~20% red = 2, 1 hidden (rounding)
      expect(greenCount).toBe(10)
      expect(redCount).toBe(2)
      expect(hiddenCount).toBe(1)
    })

    it('should reveal fewer letters for low skill', () => {
      RandomService.setSeed(12345)
      const scrambled = TrapService.scrambleLetters('POISON NEEDLE')

      // Low skill = reveal only 30% as green, 30% as red
      const revealed = TrapService.revealLetters(scrambled, 30, 30)

      const greenCount = revealed.filter(l => l.state === 'green').length
      const hiddenCount = revealed.filter(l => l.state === 'hidden').length

      expect(greenCount).toBeLessThan(6)  // Less than half green
      expect(hiddenCount).toBeGreaterThan(0)  // Some still hidden
    })

    it('should not modify already revealed letters', () => {
      RandomService.setSeed(12345)
      const scrambled = TrapService.scrambleLetters('ABC')

      // First reveal: 50% green
      const firstReveal = TrapService.revealLetters(scrambled, 50, 0)
      const greenBefore = firstReveal.filter(l => l.state === 'green').length

      // Second reveal: more green should accumulate
      const secondReveal = TrapService.revealLetters(firstReveal, 50, 0)
      const greenAfter = secondReveal.filter(l => l.state === 'green').length

      expect(greenAfter).toBeGreaterThanOrEqual(greenBefore)
    })

    it('should return clone without modifying original', () => {
      const scrambled = TrapService.scrambleLetters('ABC')
      const original = scrambled[0].state

      TrapService.revealLetters(scrambled, 100, 0)

      expect(scrambled[0].state).toBe(original)
    })
  })

  describe('createScrambledState', () => {
    it('should create initial scrambled state for a trap', () => {
      RandomService.setSeed(12345)
      const state = TrapService.createScrambledState('POISON_NEEDLE')

      expect(state.actualTrapId).toBe('POISON_NEEDLE')
      expect(state.fullyRevealed).toBe(false)
      expect(state.inspectionCount).toBe(0)
      expect(state.letters.length).toBe(13)  // "POISON NEEDLE"
      expect(state.letters.every(l => l.state === 'hidden')).toBe(true)
    })

    it('should use trap name from TrapDataLoader', () => {
      RandomService.setSeed(12345)
      const state = TrapService.createScrambledState('GAS_BOMB')

      // Letters should contain all characters from "GAS BOMB"
      const chars = state.letters.map(l => l.char).sort().join('')
      expect(chars).toBe(' ABBGMOS')  // sorted: space, A, B, B, G, M, O, S
    })
  })

  describe('calculateRevealPercents', () => {
    it('should calculate higher percents for thieves', () => {
      const thief = createTestCharacter({ class: CharacterClass.THIEF, agility: 16 })
      const { greenPercent, redPercent } = TrapService.calculateRevealPercents(thief)

      // Thief with AGI 16 = 95% inspect chance (capped)
      // Green = 95 * 0.8 = 76, Red = 95 * 0.2 = 19
      expect(greenPercent).toBe(76)
      expect(redPercent).toBe(19)
    })

    it('should calculate lower percents for fighters', () => {
      const fighter = createTestCharacter({ class: CharacterClass.FIGHTER, agility: 12 })
      const { greenPercent, redPercent } = TrapService.calculateRevealPercents(fighter)

      // Fighter with AGI 12 = 12% inspect chance
      // Green = 12 * 0.8 = 9, Red = 12 * 0.2 = 2
      expect(greenPercent).toBe(9)
      expect(redPercent).toBe(2)
    })
  })

  describe('performInspection', () => {
    it('should update scrambled state with revealed letters', () => {
      RandomService.setSeed(12345)
      const thief = createTestCharacter({ class: CharacterClass.THIEF, agility: 16 })
      const initialState = TrapService.createScrambledState('POISON_NEEDLE')

      const result = TrapService.performInspection(thief, initialState)

      expect(result.inspectionCount).toBe(1)
      expect(result.fullyRevealed).toBe(false)

      const revealed = result.letters.filter(l => l.state !== 'hidden')
      expect(revealed.length).toBeGreaterThan(0)
    })

    it('should stack inspections', () => {
      RandomService.setSeed(12345)
      const thief = createTestCharacter({ class: CharacterClass.THIEF, agility: 12 })
      let state = TrapService.createScrambledState('POISON_NEEDLE')

      state = TrapService.performInspection(thief, state)
      const firstRevealCount = state.letters.filter(l => l.state !== 'hidden').length

      state = TrapService.performInspection(thief, state)
      const secondRevealCount = state.letters.filter(l => l.state !== 'hidden').length

      expect(secondRevealCount).toBeGreaterThanOrEqual(firstRevealCount)
      expect(state.inspectionCount).toBe(2)
    })

    it('should preserve actualTrapId', () => {
      RandomService.setSeed(12345)
      const thief = createTestCharacter({ class: CharacterClass.THIEF, agility: 16 })
      const initialState = TrapService.createScrambledState('GAS_BOMB')

      const result = TrapService.performInspection(thief, initialState)

      expect(result.actualTrapId).toBe('GAS_BOMB')
    })
  })

  describe('performCalfo', () => {
    it('should reveal all letters as green', () => {
      RandomService.setSeed(12345)
      const priest = createTestCharacter({ class: CharacterClass.PRIEST })
      const initialState = TrapService.createScrambledState('POISON_NEEDLE')

      const result = TrapService.performCalfo(priest, initialState)

      expect(result.fullyRevealed).toBe(true)
      expect(result.letters.every(l => l.state === 'green')).toBe(true)
    })

    it('should keep letters scrambled (not in original order)', () => {
      RandomService.setSeed(12345)
      const priest = createTestCharacter({ class: CharacterClass.PRIEST })
      const initialState = TrapService.createScrambledState('POISON_NEEDLE')

      const result = TrapService.performCalfo(priest, initialState)
      const displayText = result.letters.map(l => l.char).join('')

      // Should still be scrambled, not "POISON NEEDLE"
      expect(displayText).not.toBe('POISON NEEDLE')
    })

    it('should preserve actualTrapId', () => {
      RandomService.setSeed(12345)
      const priest = createTestCharacter({ class: CharacterClass.PRIEST })
      const initialState = TrapService.createScrambledState('GAS_BOMB')

      const result = TrapService.performCalfo(priest, initialState)

      expect(result.actualTrapId).toBe('GAS_BOMB')
    })
  })

  describe('getRecommendedHandler', () => {
    it('should recommend Thief over Fighter', () => {
      const fighter = createTestCharacter({
        id: 'fighter',
        class: CharacterClass.FIGHTER,
        agility: 12,
        level: 5
      })
      const thief = createTestCharacter({
        id: 'thief',
        class: CharacterClass.THIEF,
        agility: 16,
        level: 3
      })

      const result = TrapService.getRecommendedHandler([fighter, thief], 1)

      expect(result?.character.id).toBe('thief')
    })

    it('should skip dead characters', () => {
      const deadThief = createTestCharacter({
        id: 'thief',
        class: CharacterClass.THIEF,
        agility: 18,
        status: CharacterStatus.DEAD
      })
      const fighter = createTestCharacter({
        id: 'fighter',
        class: CharacterClass.FIGHTER,
        agility: 12,
        level: 5
      })

      const result = TrapService.getRecommendedHandler([deadThief, fighter], 1)

      expect(result?.character.id).toBe('fighter')
    })

    it('should return null for empty party', () => {
      const result = TrapService.getRecommendedHandler([], 1)
      expect(result).toBeNull()
    })

    it('should return null if all party members are incapacitated', () => {
      const dead = createTestCharacter({ id: 'dead', status: CharacterStatus.DEAD })
      const paralyzed = createTestCharacter({ id: 'paralyzed', status: CharacterStatus.PARALYZED })

      const result = TrapService.getRecommendedHandler([dead, paralyzed], 1)

      expect(result).toBeNull()
    })
  })
})
