/**
 * TrapEffectService Tests
 *
 * Tests for trap damage, status effects, and effect application.
 */

import { TrapEffectService } from '../TrapEffectService'
import { RandomService } from '../../RandomService'
import { createTestCharacter, createTestGameState } from '@testing/test-factories'
import { CharacterClass } from '@models/CharacterClass'
import { CharacterStatus } from '@models/CharacterStatus'
import { Race } from '@models/Race'
import { PendingTrapResult } from '@models/GameState'
import { loadTrapsWithResistanceForTests } from '@testing/test-data-loader'

// Load trap data with class data (needed for trap effects and resistance checks)
beforeAll(async () => {
  await loadTrapsWithResistanceForTests()
})

describe('TrapEffectService', () => {
  beforeEach(() => {
    RandomService.resetSeed()
  })

  describe('calculateTrapDamage (authentic Wizardry 1)', () => {
    it('should roll 1 die on maze level 1', () => {
      // Level 1 with d8: rolls 1d8
      RandomService.queueNextValues([0.5])  // Middle roll = 5 on d8 (4.5 → 5)
      expect(TrapEffectService.calculateTrapDamage(8, 1)).toBe(5)
    })

    it('should roll more dice on deeper levels', () => {
      // Level 3 with d8: rolls 3d8
      RandomService.queueNextValues([0.5, 0.5, 0.5])  // Three middle rolls = 5+5+5 = 15
      const damage = TrapEffectService.calculateTrapDamage(8, 3)
      expect(damage).toBeGreaterThan(3)  // At least 3 (minimum 3 dice)
      expect(damage).toBeLessThanOrEqual(24)  // At most 24 (max 3×8)
    })

    it('should scale linearly with maze level (more dice)', () => {
      // Level 5 with d6: rolls 5d6
      RandomService.setSeed(12345)
      const damage5 = TrapEffectService.calculateTrapDamage(6, 5)

      // Level 10 with d6: rolls 10d6
      RandomService.setSeed(12345)
      const damage10 = TrapEffectService.calculateTrapDamage(6, 10)

      // More dice = higher expected damage
      expect(damage10).toBeGreaterThan(damage5)
    })

    it('should use different dice types correctly', () => {
      // Test d6 at level 1
      RandomService.queueNextValues([0.99])  // Max roll on d6 = 6
      expect(TrapEffectService.calculateTrapDamage(6, 1)).toBe(6)

      // Test d12 at level 1
      RandomService.queueNextValues([0.99])  // Max roll on d12 = 12
      expect(TrapEffectService.calculateTrapDamage(12, 1)).toBe(12)
    })
  })

  describe('escalateStatus (authentic Wizardry 1)', () => {
    it('should not escalate POISONED (stays POISONED)', () => {
      const result = TrapEffectService.escalateStatus(CharacterStatus.POISONED, CharacterStatus.POISONED)
      expect(result).toBe(CharacterStatus.POISONED)
    })

    it('should escalate STONED + STONED to DEAD', () => {
      const result = TrapEffectService.escalateStatus(CharacterStatus.STONED, CharacterStatus.STONED)
      expect(result).toBe(CharacterStatus.DEAD)
    })

    it('should not escalate OK to POISONED (just apply new status)', () => {
      const result = TrapEffectService.escalateStatus(CharacterStatus.OK, CharacterStatus.POISONED)
      expect(result).toBe(CharacterStatus.POISONED)
    })

    it('should not escalate different statuses (apply new one)', () => {
      // Already paralyzed, getting poisoned → just poisoned
      const result = TrapEffectService.escalateStatus(CharacterStatus.PARALYZED, CharacterStatus.POISONED)
      expect(result).toBe(CharacterStatus.POISONED)
    })

    describe('class-specific trap escalation', () => {
      it('should escalate PARALYZED to STONED for class-specific traps (Anti-Mage/Anti-Priest)', () => {
        // Class-specific traps: PARALYZED + PARALYZED = STONED (not DEAD)
        const result = TrapEffectService.escalateStatus(
          CharacterStatus.PARALYZED,
          CharacterStatus.PARALYZED,
          true  // isClassSpecific = true
        )
        expect(result).toBe(CharacterStatus.STONED)
      })

      it('should NOT escalate PARALYZED to DEAD for regular traps', () => {
        // Regular traps: PARALYZED doesn't escalate (stays PARALYZED)
        const result = TrapEffectService.escalateStatus(
          CharacterStatus.PARALYZED,
          CharacterStatus.PARALYZED,
          false  // isClassSpecific = false (default)
        )
        expect(result).toBe(CharacterStatus.PARALYZED)
      })
    })
  })

  describe('applyTrapEffects', () => {
    it('should apply damage to opener for CROSSBOW_BOLT', () => {
      const opener = createTestCharacter({ id: 'opener' })
      const party = [opener]

      // Queue dice roll for damage (1d8 at maze level 1)
      RandomService.queueNextValues([0.5])

      const result = TrapEffectService.applyTrapEffects('CROSSBOW_BOLT', opener, party, 1)

      expect(result.damageDealt.has('opener')).toBe(true)
      expect(result.damageDealt.get('opener')).toBeGreaterThan(0)
      expect(result.statusApplied.size).toBe(0)
    })

    it('should apply poison status to opener for POISON_NEEDLE (no damage)', () => {
      const opener = createTestCharacter({ id: 'opener' })
      const party = [opener]

      // Queue: hit roll + resistance roll (0.99 > 25% = no resistance)
      // POISON_NEEDLE has no damage in authentic Wizardry 1
      RandomService.queueNextValues([0.5, 0.99])

      const result = TrapEffectService.applyTrapEffects('POISON_NEEDLE', opener, party)

      expect(result.statusApplied.get('opener')).toBe(CharacterStatus.POISONED)
      expect(result.damageDealt.size).toBe(0)  // No damage, status only
    })

    it('should apply poison status to entire party for GAS_BOMB (no damage)', () => {
      const opener = createTestCharacter({ id: 'opener' })
      const member1 = createTestCharacter({ id: 'member1' })
      const member2 = createTestCharacter({ id: 'member2' })
      const party = [opener, member1, member2]

      // GAS_BOMB applies poison status to entire party, no damage
      // Queue: hit + resistance rolls for each member
      RandomService.queueNextValues([0.5, 0.99, 0.5, 0.99, 0.5, 0.99])

      const result = TrapEffectService.applyTrapEffects('GAS_BOMB', opener, party)

      expect(result.damageDealt.size).toBe(0)  // No damage in authentic
      expect(result.statusApplied.size).toBe(3)  // All get poisoned
    })

    it('should only affect mages, bishops, and samurai for MAGE_BLASTER', () => {
      const opener = createTestCharacter({ id: 'opener', class: CharacterClass.FIGHTER })
      const mage = createTestCharacter({ id: 'mage', class: CharacterClass.MAGE })
      const bishop = createTestCharacter({ id: 'bishop', class: CharacterClass.BISHOP })
      const samurai = createTestCharacter({ id: 'samurai', class: CharacterClass.SAMURAI })
      const priest = createTestCharacter({ id: 'priest', class: CharacterClass.PRIEST })
      const party = [opener, mage, bishop, samurai, priest]

      // MAGE_BLASTER applies PARALYZED status (no damage)
      // Queue: hit + resistance rolls for each affected target (mage, bishop, samurai)
      RandomService.queueNextValues([0.5, 0.99, 0.5, 0.99, 0.5, 0.99])

      const result = TrapEffectService.applyTrapEffects('MAGE_BLASTER', opener, party)

      // MAGE_BLASTER targets MAGE, BISHOP, SAMURAI (class-specific)
      expect(result.statusApplied.has('mage')).toBe(true)
      expect(result.statusApplied.has('bishop')).toBe(true)
      expect(result.statusApplied.has('samurai')).toBe(true)
      expect(result.statusApplied.has('opener')).toBe(false)  // Fighter not affected
      expect(result.statusApplied.has('priest')).toBe(false)  // Priest not affected
      expect(result.damageDealt.size).toBe(0)  // No damage in authentic
    })

    it('should return teleport special effect for TELEPORTER', () => {
      const opener = createTestCharacter({ id: 'opener' })
      const party = [opener]

      const result = TrapEffectService.applyTrapEffects('TELEPORTER', opener, party)

      expect(result.specialEffect).toBe('teleport')
      expect(result.damageDealt.size).toBe(0)
    })

    it('should return combat special effect for ALARM', () => {
      const opener = createTestCharacter({ id: 'opener' })
      const party = [opener]

      const result = TrapEffectService.applyTrapEffects('ALARM', opener, party)

      expect(result.specialEffect).toBe('combat')
    })

    describe('maze level scaling (authentic Wizardry 1)', () => {
      it('should roll 1 die on maze level 1', () => {
        const opener = createTestCharacter({ id: 'opener' })
        const party = [opener]

        // Queue dice roll for 1d8 damage (level 1 = 1 die)
        RandomService.queueNextValues([0.5])  // ~5 on d8

        const result = TrapEffectService.applyTrapEffects('CROSSBOW_BOLT', opener, party, 1)

        const damage = result.damageDealt.get('opener')!
        expect(damage).toBeGreaterThan(0)
        expect(damage).toBeLessThanOrEqual(8)  // Max 1d8
      })

      it('should roll more dice on deeper levels (mazeLevel)d{diceType}', () => {
        const opener = createTestCharacter({ id: 'opener' })
        const party = [opener]

        // Level 5 = 5d8 damage
        // Queue 5 dice rolls
        RandomService.queueNextValues([0.5, 0.5, 0.5, 0.5, 0.5])

        const result5 = TrapEffectService.applyTrapEffects('CROSSBOW_BOLT', opener, party, 5)
        const damage5 = result5.damageDealt.get('opener')!

        // Expect reasonable 5d8 damage range (5-40)
        expect(damage5).toBeGreaterThan(4)
        expect(damage5).toBeLessThanOrEqual(40)
      })

      it('should scale damage linearly with maze level', () => {
        const opener = createTestCharacter({ id: 'opener' })
        const party = [opener]

        // Level 1 = 1d8
        RandomService.setSeed(12345)
        const result1 = TrapEffectService.applyTrapEffects('CROSSBOW_BOLT', opener, party, 1)
        const damage1 = result1.damageDealt.get('opener')!

        // Level 5 = 5d8 (expected ~5x average damage)
        RandomService.setSeed(12345)
        const result5 = TrapEffectService.applyTrapEffects('CROSSBOW_BOLT', opener, party, 5)
        const damage5 = result5.damageDealt.get('opener')!

        // Should have significantly more damage at level 5
        expect(damage5).toBeGreaterThan(damage1)
      })

      it('should apply scaling to party-wide damage traps', () => {
        const member1 = createTestCharacter({ id: 'char1' })
        const member2 = createTestCharacter({ id: 'char2' })
        const party = [member1, member2]

        // EXPLODING_BOX targets party with hitChance
        // Queue: hit roll for char1, damage dice, hit roll for char2, damage dice
        RandomService.queueNextValues([0.3, 0.5, 0.3, 0.5])  // < 50% = both hit, then damage

        const result = TrapEffectService.applyTrapEffects('EXPLODING_BOX', member1, party, 1)

        // Both should take damage
        expect(result.damageDealt.has('char1')).toBe(true)
        expect(result.damageDealt.has('char2')).toBe(true)
      })
    })

    describe('status escalation (authentic Wizardry 1)', () => {
      it('should NOT escalate PARALYZED with regular trap (stays PARALYZED)', () => {
        const opener = createTestCharacter({
          id: 'opener',
          name: 'Stunned',
          status: CharacterStatus.PARALYZED
        })
        const party = [opener]

        // STUNNER applies PARALYZED - queue hit roll + resistance roll
        // Regular traps do NOT escalate PARALYZED to DEAD
        RandomService.queueNextValues([0.5, 0.99])

        const result = TrapEffectService.applyTrapEffects('STUNNER', opener, party)

        // Regular trap: PARALYZED stays PARALYZED (no escalation)
        expect(result.statusApplied.get('opener')).toBe(CharacterStatus.PARALYZED)
        expect(result.message).not.toContain('dies')
      })

      it('should escalate PARALYZED to STONED for class-specific traps (Anti-Mage)', () => {
        const mage = createTestCharacter({
          id: 'mage',
          name: 'Paralyzed Mage',
          class: CharacterClass.MAGE,
          status: CharacterStatus.PARALYZED
        })
        const party = [mage]

        // MAGE_BLASTER is class-specific: PARALYZED + PARALYZED = STONED
        RandomService.queueNextValues([0.5, 0.99])

        const result = TrapEffectService.applyTrapEffects('MAGE_BLASTER', mage, party)

        expect(result.statusApplied.get('mage')).toBe(CharacterStatus.STONED)
        expect(result.message).toContain('turns to stone')
      })

      it('should NOT escalate POISONED (stays POISONED)', () => {
        const opener = createTestCharacter({
          id: 'opener',
          status: CharacterStatus.POISONED
        })
        const party = [opener]

        // Queue: hit roll + resistance roll (0.99 > 25% = no resistance)
        // POISON_NEEDLE has no damage, just status
        RandomService.queueNextValues([0.5, 0.99])

        const result = TrapEffectService.applyTrapEffects('POISON_NEEDLE', opener, party)

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

        // Queue hit roll + resistance roll (0.99 > 25% = no resistance)
        RandomService.queueNextValues([0.5, 0.99])

        const result = TrapEffectService.applyTrapEffects('STUNNER', opener, party)

        expect(result.statusApplied.get('opener')).toBe(CharacterStatus.PARALYZED)
        expect(result.message).toContain('paralyzed')
        expect(result.message).not.toContain('dies')
      })
    })

    describe('authentic Wizardry 1 Anti-Mage/Anti-Priest mechanics', () => {
      // Research citation: Lords are IMMUNE to Anti-Priest trap (from source code)
      it('should NOT affect LORD with PRIEST_BLASTER (Lords are immune)', () => {
        const lord = createTestCharacter({
          id: 'lord',
          name: 'Holy Lord',
          class: CharacterClass.LORD,
          status: CharacterStatus.OK
        })
        const party = [lord]

        // LORD should not be in targetClasses at all
        const result = TrapEffectService.applyTrapEffects('PRIEST_BLASTER', lord, party)

        // LORD is immune - should not be affected
        expect(result.statusApplied.has('lord')).toBe(false)
        expect(result.message).not.toContain('paralyzed')
        expect(result.message).not.toContain('Lord')
      })

      // Research citation: Primary class (MAGE) - save success = STILL paralyzed
      it('should paralyze MAGE (primary) even on save success for MAGE_BLASTER', () => {
        const mage = createTestCharacter({
          id: 'mage',
          name: 'Test Mage',
          class: CharacterClass.MAGE,
          status: CharacterStatus.OK,
          vitality: 18,  // High VIT for good save chance
          luck: 18       // High Luck for good save chance
        })
        const party = [mage]

        // Queue: hit roll (pass), resistance roll (pass save)
        // 0.01 should pass almost any resistance check
        RandomService.queueNextValues([0.5, 0.01])

        const result = TrapEffectService.applyTrapEffects('MAGE_BLASTER', mage, party)

        // Primary class: STILL paralyzed even though save succeeded
        expect(result.statusApplied.get('mage')).toBe(CharacterStatus.PARALYZED)
        expect(result.message).toContain('paralyzed')
      })

      // Research citation: Secondary class (SAMURAI) - save success = NO effect
      it('should NOT affect SAMURAI (secondary) on save success for MAGE_BLASTER', () => {
        const samurai = createTestCharacter({
          id: 'samurai',
          name: 'Test Samurai',
          class: CharacterClass.SAMURAI,
          status: CharacterStatus.OK,
          vitality: 18,
          luck: 18
        })
        const party = [samurai]

        // Queue: hit roll (pass), resistance roll (pass save - 0.01 passes any check)
        RandomService.queueNextValues([0.5, 0.01])

        const result = TrapEffectService.applyTrapEffects('MAGE_BLASTER', samurai, party)

        // Secondary class: NO effect on save success
        expect(result.statusApplied.has('samurai')).toBe(false)
        expect(result.message).toContain('resists')
      })

      // Research citation: Secondary class (SAMURAI) - save failure = paralyzed only
      it('should paralyze SAMURAI (secondary) on save failure for MAGE_BLASTER', () => {
        const samurai = createTestCharacter({
          id: 'samurai',
          name: 'Test Samurai',
          class: CharacterClass.SAMURAI,
          status: CharacterStatus.OK
        })
        const party = [samurai]

        // Queue: hit roll (pass), resistance roll (fail save - 0.99 fails most checks)
        RandomService.queueNextValues([0.5, 0.99])

        const result = TrapEffectService.applyTrapEffects('MAGE_BLASTER', samurai, party)

        // Secondary class: Paralyzed on save failure
        expect(result.statusApplied.get('samurai')).toBe(CharacterStatus.PARALYZED)
        expect(result.message).toContain('paralyzed')
      })

      // Research citation: Primary class already PARALYZED + failed save = STONED
      it('should escalate MAGE (primary) from PARALYZED to STONED on failed save', () => {
        const mage = createTestCharacter({
          id: 'mage',
          name: 'Already Paralyzed Mage',
          class: CharacterClass.MAGE,
          status: CharacterStatus.PARALYZED
        })
        const party = [mage]

        // Queue: hit roll (pass), resistance roll (fail save)
        RandomService.queueNextValues([0.5, 0.99])

        const result = TrapEffectService.applyTrapEffects('MAGE_BLASTER', mage, party)

        // Primary class + already paralyzed + failed save = STONED
        expect(result.statusApplied.get('mage')).toBe(CharacterStatus.STONED)
        expect(result.message).toContain('turns to stone')
      })

      // Research citation: Primary class already PARALYZED + succeeded save = stays PARALYZED (no escalation)
      it('should NOT escalate MAGE (primary) to STONED on save success', () => {
        const mage = createTestCharacter({
          id: 'mage',
          name: 'Already Paralyzed Mage',
          class: CharacterClass.MAGE,
          status: CharacterStatus.PARALYZED,
          vitality: 18,
          luck: 18
        })
        const party = [mage]

        // Queue: hit roll (pass), resistance roll (pass save)
        RandomService.queueNextValues([0.5, 0.01])

        const result = TrapEffectService.applyTrapEffects('MAGE_BLASTER', mage, party)

        // Primary class + save success = stays PARALYZED (no escalation to STONED)
        expect(result.statusApplied.get('mage')).toBe(CharacterStatus.PARALYZED)
        expect(result.message).not.toContain('stone')
      })

      // Research citation: Secondary class NEVER escalates to STONED
      it('should NEVER escalate SAMURAI (secondary) to STONED even when already paralyzed', () => {
        const samurai = createTestCharacter({
          id: 'samurai',
          name: 'Already Paralyzed Samurai',
          class: CharacterClass.SAMURAI,
          status: CharacterStatus.PARALYZED
        })
        const party = [samurai]

        // Queue: hit roll (pass), resistance roll (fail save)
        RandomService.queueNextValues([0.5, 0.99])

        const result = TrapEffectService.applyTrapEffects('MAGE_BLASTER', samurai, party)

        // Secondary class NEVER escalates - stays PARALYZED
        expect(result.statusApplied.get('samurai')).toBe(CharacterStatus.PARALYZED)
        expect(result.message).not.toContain('stone')
      })

      // Same tests for PRIEST_BLASTER
      it('should paralyze PRIEST (primary) even on save success for PRIEST_BLASTER', () => {
        const priest = createTestCharacter({
          id: 'priest',
          name: 'Test Priest',
          class: CharacterClass.PRIEST,
          status: CharacterStatus.OK,
          vitality: 18,
          luck: 18
        })
        const party = [priest]

        // Queue: hit roll (pass), resistance roll (pass save)
        RandomService.queueNextValues([0.5, 0.01])

        const result = TrapEffectService.applyTrapEffects('PRIEST_BLASTER', priest, party)

        // Primary class: STILL paralyzed even though save succeeded
        expect(result.statusApplied.get('priest')).toBe(CharacterStatus.PARALYZED)
        expect(result.message).toContain('paralyzed')
      })

      it('should NOT affect BISHOP (secondary) on save success for PRIEST_BLASTER', () => {
        const bishop = createTestCharacter({
          id: 'bishop',
          name: 'Test Bishop',
          class: CharacterClass.BISHOP,
          status: CharacterStatus.OK,
          vitality: 18,
          luck: 18
        })
        const party = [bishop]

        // Queue: hit roll (pass), resistance roll (pass save)
        RandomService.queueNextValues([0.5, 0.01])

        const result = TrapEffectService.applyTrapEffects('PRIEST_BLASTER', bishop, party)

        // Secondary class: NO effect on save success
        expect(result.statusApplied.has('bishop')).toBe(false)
        expect(result.message).toContain('resists')
      })

      it('should escalate PRIEST (primary) from PARALYZED to STONED on failed save', () => {
        const priest = createTestCharacter({
          id: 'priest',
          name: 'Already Paralyzed Priest',
          class: CharacterClass.PRIEST,
          status: CharacterStatus.PARALYZED
        })
        const party = [priest]

        // Queue: hit roll (pass), resistance roll (fail save)
        RandomService.queueNextValues([0.5, 0.99])

        const result = TrapEffectService.applyTrapEffects('PRIEST_BLASTER', priest, party)

        // Primary class + already paralyzed + failed save = STONED
        expect(result.statusApplied.get('priest')).toBe(CharacterStatus.STONED)
        expect(result.message).toContain('turns to stone')
      })
    })

    describe('hitChance', () => {
      it('should hit when roll is below hitChance (SPLINTERS 70%)', () => {
        const opener = createTestCharacter({ id: 'opener', name: 'Fighter' })
        const party = [opener]

        // Queue: hit roll (0.5 < 0.7 = hit), then damage roll for 1d6
        RandomService.queueNextValues([0.5, 0.5])

        const result = TrapEffectService.applyTrapEffects('SPLINTERS', opener, party)

        expect(result.damageDealt.has('opener')).toBe(true)
        expect(result.message).toContain('takes')
      })

      it('should miss when roll exceeds hitChance (BLADES 30%)', () => {
        const opener = createTestCharacter({ id: 'opener', name: 'Fighter' })
        const party = [opener]

        // Queue: hit roll (0.8 > 0.3 = miss)
        RandomService.queueNextValues([0.8])

        const result = TrapEffectService.applyTrapEffects('BLADES', opener, party)

        expect(result.damageDealt.has('opener')).toBe(false)
        expect(result.message).toContain('avoids')
      })

      it('should always hit traps without hitChance (default 1.0)', () => {
        const opener = createTestCharacter({ id: 'opener', name: 'Fighter' })
        const party = [opener]

        // CROSSBOW_BOLT has no hitChance, should always hit
        // Queue damage roll only (2d8)
        RandomService.queueNextValues([0.5, 0.5])

        const result = TrapEffectService.applyTrapEffects('CROSSBOW_BOLT', opener, party)

        expect(result.damageDealt.has('opener')).toBe(true)
      })

      it('should roll hitChance independently for each party member', () => {
        const member1 = createTestCharacter({ id: 'char1', name: 'Fighter' })
        const member2 = createTestCharacter({ id: 'char2', name: 'Mage' })
        const party = [member1, member2]

        // SPLINTERS (70% hit) - queue: char1 hits (0.5 < 0.7), damage, char2 misses (0.8 > 0.7)
        RandomService.queueNextValues([0.5, 0.5, 0.8])

        const result = TrapEffectService.applyTrapEffects('SPLINTERS', member1, party)

        expect(result.damageDealt.has('char1')).toBe(true)
        expect(result.damageDealt.has('char2')).toBe(false)
        expect(result.message).toContain('Fighter takes')
        expect(result.message).toContain('Mage avoids')
      })
    })

    describe('resistance checks (authentic Wizardry 1)', () => {
      it('should allow character to resist poison trap damage', () => {
        // High luck Ninja has better poison resistance
        const ninja = createTestCharacter({
          id: 'ninja',
          name: 'Ninja',
          class: CharacterClass.NINJA,
          race: Race.HUMAN,
          level: 10,  // +10% level bonus
          luck: 18    // +15% luck bonus
          // Total: 15% (class) + 5% (race) + 10% (level) + 15% (luck) = 45% poison resistance
        })
        const party = [ninja]

        // Queue: hit roll (pass) + resistance roll (0.1 < 0.45 = resist)
        RandomService.queueNextValues([0.5, 0.1])

        const result = TrapEffectService.applyTrapEffects('POISON_NEEDLE', ninja, party)

        // Character resisted - no damage or status applied
        expect(result.damageDealt.has('ninja')).toBe(false)
        expect(result.statusApplied.has('ninja')).toBe(false)
        expect(result.message).toContain('resists the poisoned')  // Status-only trap message
      })

      it('should NOT resist when resistance roll fails', () => {
        const fighter = createTestCharacter({
          id: 'fighter',
          name: 'Fighter',
          class: CharacterClass.FIGHTER,
          race: Race.HUMAN,
          level: 1,
          luck: 5  // 15% + 5% + 0% + 0% = 20% poison resistance
        })
        const party = [fighter]

        // Queue: hit roll + resistance roll (0.95 > 0.20 = no resist)
        // POISON_NEEDLE has no damage in authentic - just status
        RandomService.queueNextValues([0.5, 0.95])

        const result = TrapEffectService.applyTrapEffects('POISON_NEEDLE', fighter, party)

        // Character did NOT resist - status applied (no damage)
        expect(result.damageDealt.has('fighter')).toBe(false)  // No damage in authentic
        expect(result.statusApplied.get('fighter')).toBe(CharacterStatus.POISONED)
      })

      it('should give Dwarf +20% poisonGasTrap resistance vs GAS_BOMB', () => {
        const dwarf = createTestCharacter({
          id: 'dwarf',
          name: 'Dwarf Fighter',
          class: CharacterClass.FIGHTER,  // No gas resistance
          race: Race.DWARF,               // +20% poisonGasTrap
          level: 10,                       // +10% level bonus
          luck: 12                         // +10% luck bonus
          // Total: 0% + 20% + 10% + 10% = 40% poisonGasTrap resistance
        })
        const party = [dwarf]

        // Queue: hit roll + resistance roll (0.1 < 0.40 = resist)
        RandomService.queueNextValues([0.5, 0.1])

        const result = TrapEffectService.applyTrapEffects('GAS_BOMB', dwarf, party)

        // Dwarf resisted the gas bomb
        expect(result.damageDealt.has('dwarf')).toBe(false)
        expect(result.statusApplied.has('dwarf')).toBe(false)
        expect(result.message).toContain('resists the poisoned')  // Status-only trap message
      })

      it('should give Hobbit +15% antiMageTrap resistance vs MAGE_BLASTER (secondary class)', () => {
        // Note: In authentic Wizardry 1, primary classes (MAGE) always get paralyzed even on save success.
        // Only secondary classes (SAMURAI, BISHOP) can fully resist. This test uses SAMURAI.
        const hobbitSamurai = createTestCharacter({
          id: 'samurai',
          name: 'Hobbit Samurai',
          class: CharacterClass.SAMURAI,  // Secondary class for MAGE_BLASTER, +10% antiMageTrap
          race: Race.HOBBIT,               // +15% antiMageTrap
          level: 1,
          luck: 5
          // Total: 10% + 15% + 0% + 0% = 25% antiMageTrap resistance
        })
        const party = [hobbitSamurai]

        // Queue: hit roll + resistance roll (0.1 < 0.25 = resist)
        RandomService.queueNextValues([0.5, 0.1])

        const result = TrapEffectService.applyTrapEffects('MAGE_BLASTER', hobbitSamurai, party)

        // Hobbit Samurai resisted (secondary class + successful save = no effect)
        expect(result.damageDealt.has('samurai')).toBe(false)
        expect(result.statusApplied.has('samurai')).toBe(false)
        expect(result.message).toContain('resists')
      })

      it('should apply resistance independently per party member', () => {
        const ninja = createTestCharacter({
          id: 'ninja',
          name: 'Ninja',
          class: CharacterClass.NINJA,     // +15% poisonGasTrap
          race: Race.DWARF,                 // +20% poisonGasTrap
          level: 10,
          luck: 12
          // Total: 15% + 20% + 10% + 10% = 55% poisonGasTrap resistance
        })
        const fighter = createTestCharacter({
          id: 'fighter',
          name: 'Fighter',
          class: CharacterClass.FIGHTER,   // No poisonGasTrap
          race: Race.HUMAN,                 // No poisonGasTrap
          level: 1,
          luck: 5
          // Total: 0% + 0% + 0% + 0% = 0% poisonGasTrap resistance
        })
        const party = [ninja, fighter]

        // Queue: ninja (hit + resist), fighter (hit + no resist)
        // GAS_BOMB applies poison status (no damage in authentic)
        RandomService.queueNextValues([
          0.5, 0.1,   // Ninja: hit roll, resist roll (resists)
          0.5, 0.99   // Fighter: hit roll, resist roll (fails)
        ])

        const result = TrapEffectService.applyTrapEffects('GAS_BOMB', ninja, party)

        // Ninja resisted, Fighter did not
        expect(result.damageDealt.has('ninja')).toBe(false)
        expect(result.damageDealt.has('fighter')).toBe(false)  // No damage in authentic
        expect(result.statusApplied.has('ninja')).toBe(false)
        expect(result.statusApplied.get('fighter')).toBe(CharacterStatus.POISONED)
      })
    })
  })

  describe('applyTrapEffectsToState', () => {
    it('should apply damage to character', () => {
      const char = createTestCharacter({ id: 'char1', hp: 20, maxHp: 20 })
      const state = createTestGameState({
        roster: new Map([['char1', char]]),
        party: { members: ['char1'], formation: { frontRow: ['char1'], backRow: [] }, gold: 0 }
      })

      const trapResult: PendingTrapResult = {
        trapId: 'POISON_NEEDLE',
        trapName: 'Poison Needle',
        message: 'Test message',
        damageDealt: new Map([['char1', 8]]),
        statusApplied: new Map(),
        openerId: 'char1'
      }

      const newState = TrapEffectService.applyTrapEffectsToState(state, trapResult)

      const updatedChar = newState.roster.get('char1')
      expect(updatedChar?.hp).toBe(12)  // 20 - 8
    })

    it('should set status to DEAD when HP drops to 0', () => {
      const char = createTestCharacter({ id: 'char1', hp: 5, maxHp: 20 })
      const state = createTestGameState({
        roster: new Map([['char1', char]]),
        party: { members: ['char1'], formation: { frontRow: ['char1'], backRow: [] }, gold: 0 }
      })

      const trapResult: PendingTrapResult = {
        trapId: 'EXPLODING_BOX',
        trapName: 'Exploding Box',
        message: 'Test message',
        damageDealt: new Map([['char1', 10]]),
        statusApplied: new Map(),
        openerId: 'char1'
      }

      const newState = TrapEffectService.applyTrapEffectsToState(state, trapResult)

      const updatedChar = newState.roster.get('char1')
      expect(updatedChar?.hp).toBe(0)
      expect(updatedChar?.status).toBe(CharacterStatus.DEAD)
    })

    it('should apply status effect from trapResult even with damage', () => {
      const char = createTestCharacter({ id: 'char1', hp: 20, maxHp: 20 })
      const state = createTestGameState({
        roster: new Map([['char1', char]]),
        party: { members: ['char1'], formation: { frontRow: ['char1'], backRow: [] }, gold: 0 }
      })

      // Character takes 5 damage and is also poisoned
      const trapResult: PendingTrapResult = {
        trapId: 'GAS_BOMB',
        trapName: 'Gas Bomb',
        message: 'Test message',
        damageDealt: new Map([['char1', 5]]),
        statusApplied: new Map([['char1', CharacterStatus.POISONED]]),
        openerId: 'char1'
      }

      const newState = TrapEffectService.applyTrapEffectsToState(state, trapResult)

      const updatedChar = newState.roster.get('char1')
      expect(updatedChar?.hp).toBe(15)
      expect(updatedChar?.status).toBe(CharacterStatus.POISONED)
    })

    it('should apply status effect without damage', () => {
      const char = createTestCharacter({ id: 'char1', hp: 20, maxHp: 20 })
      const state = createTestGameState({
        roster: new Map([['char1', char]]),
        party: { members: ['char1'], formation: { frontRow: ['char1'], backRow: [] }, gold: 0 }
      })

      // Character is paralyzed but no damage
      const trapResult: PendingTrapResult = {
        trapId: 'STUNNER',
        trapName: 'Stunner',
        message: 'Test message',
        damageDealt: new Map(),
        statusApplied: new Map([['char1', CharacterStatus.PARALYZED]]),
        openerId: 'char1'
      }

      const newState = TrapEffectService.applyTrapEffectsToState(state, trapResult)

      const updatedChar = newState.roster.get('char1')
      expect(updatedChar?.hp).toBe(20)  // No damage
      expect(updatedChar?.status).toBe(CharacterStatus.PARALYZED)
    })

    it('should apply effects to multiple characters', () => {
      const char1 = createTestCharacter({ id: 'char1', hp: 20, maxHp: 20 })
      const char2 = createTestCharacter({ id: 'char2', hp: 15, maxHp: 20 })
      const state = createTestGameState({
        roster: new Map([['char1', char1], ['char2', char2]]),
        party: { members: ['char1', 'char2'], formation: { frontRow: ['char1', 'char2'], backRow: [] }, gold: 0 }
      })

      const trapResult: PendingTrapResult = {
        trapId: 'GAS_BOMB',
        trapName: 'Gas Bomb',
        message: 'Test message',
        damageDealt: new Map([['char1', 6], ['char2', 4]]),
        statusApplied: new Map([['char1', CharacterStatus.POISONED]]),
        openerId: 'char1'
      }

      const newState = TrapEffectService.applyTrapEffectsToState(state, trapResult)

      expect(newState.roster.get('char1')?.hp).toBe(14)
      expect(newState.roster.get('char1')?.status).toBe(CharacterStatus.POISONED)
      expect(newState.roster.get('char2')?.hp).toBe(11)
      expect(newState.roster.get('char2')?.status).toBe(CharacterStatus.OK)
    })

    it('should return immutable state (not mutate original)', () => {
      const char = createTestCharacter({ id: 'char1', hp: 20, maxHp: 20 })
      const originalState = createTestGameState({
        roster: new Map([['char1', char]]),
        party: { members: ['char1'], formation: { frontRow: ['char1'], backRow: [] }, gold: 0 }
      })

      const trapResult: PendingTrapResult = {
        trapId: 'POISON_NEEDLE',
        trapName: 'Poison Needle',
        message: 'Test message',
        damageDealt: new Map([['char1', 8]]),
        statusApplied: new Map(),
        openerId: 'char1'
      }

      const newState = TrapEffectService.applyTrapEffectsToState(originalState, trapResult)

      // Original state unchanged
      expect(originalState.roster.get('char1')?.hp).toBe(20)

      // New state has updates
      expect(newState.roster.get('char1')?.hp).toBe(12)

      // Different references
      expect(newState).not.toBe(originalState)
      expect(newState.roster).not.toBe(originalState.roster)
    })

    it('should handle empty damage and status maps', () => {
      const char = createTestCharacter({ id: 'char1', hp: 20, maxHp: 20 })
      const state = createTestGameState({
        roster: new Map([['char1', char]]),
        party: { members: ['char1'], formation: { frontRow: ['char1'], backRow: [] }, gold: 0 }
      })

      // Teleporter trap - no damage, no status
      const trapResult: PendingTrapResult = {
        trapId: 'TELEPORTER',
        trapName: 'Teleporter',
        message: 'Test message',
        damageDealt: new Map(),
        statusApplied: new Map(),
        specialEffect: 'teleport',
        openerId: 'char1'
      }

      const newState = TrapEffectService.applyTrapEffectsToState(state, trapResult)

      // Character should be unchanged
      expect(newState.roster.get('char1')?.hp).toBe(20)
      expect(newState.roster.get('char1')?.status).toBe(CharacterStatus.OK)
    })
  })
})
