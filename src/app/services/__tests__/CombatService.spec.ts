// src/services/__tests__/CombatService.spec.ts
import { CombatService } from '../CombatService'
import { createTestCharacter, createTestMonster } from '@testing/test-factories'
import { CharacterClass } from '@models/CharacterClass'

describe('CombatService', () => {
  describe('calculateInitiative', () => {
    it('calculates initiative with AGI modifier (Apple II table)', () => {
      const char = createTestCharacter({ agility: 18 })  // -5 modifier (fastest)

      const results = Array.from({ length: 100 }, () =>
        CombatService.calculateInitiative(char)
      )

      // Apple II reference: 1d10 + agility table lookup
      // AGI 18 = -5 modifier (faster = lower initiative)
      // Range: 1-10 (clamped from -4 to 5)
      results.forEach(init => {
        expect(init).toBeGreaterThanOrEqual(1)
        expect(init).toBeLessThanOrEqual(10)
      })
    })

    it('has minimum of 1', () => {
      const char = createTestCharacter({ agility: 3 })  // +2 modifier (slowest)

      const results = Array.from({ length: 100 }, () =>
        CombatService.calculateInitiative(char)
      )

      // Even with positive modifier, maximum is clamped to 10
      results.forEach(init => {
        expect(init).toBeGreaterThanOrEqual(1)
        expect(init).toBeLessThanOrEqual(10)
      })
    })

    it('uses default AGI 10 if undefined', () => {
      const char = createTestCharacter({ agility: undefined })

      const results = Array.from({ length: 100 }, () =>
        CombatService.calculateInitiative(char)
      )

      // AGI 10 = -1 modifier (Apple II table)
      // Range: 1-9 (clamped to 1-10)
      results.forEach(init => {
        expect(init).toBeGreaterThanOrEqual(1)
        expect(init).toBeLessThanOrEqual(10)
      })
    })

    it('monster uses 1d8+1 formula (range 2-9)', () => {
      const monster = createTestMonster()

      const results = Array.from({ length: 100 }, () =>
        CombatService.calculateInitiative(monster)
      )

      // Monsters: 1d8 + 1 (range 2-9)
      results.forEach(init => {
        expect(init).toBeGreaterThanOrEqual(2)
        expect(init).toBeLessThanOrEqual(9)
      })
    })
  })

  describe('initiateCombat', () => {
    it('creates combat state with 1-2 monster groups for level 1', () => {
      const party = [
        createTestCharacter({ id: 'char1' }),
        createTestCharacter({ id: 'char2' })
      ]

      const state = CombatService.initiateCombat(1, party, true)
      const monsters = CombatService.getAllMonsters(state)

      // Level 1 generates 1-2 groups
      expect(state.monsterGroups.length).toBeGreaterThanOrEqual(1)
      expect(state.monsterGroups.length).toBeLessThanOrEqual(2)

      // Each group should have valid ID
      const groupIds = state.monsterGroups.map(g => g.id)
      expect(groupIds.every(id => ['A', 'B', 'C', 'D'].includes(id))).toBe(true)

      // Should have at least 1 monster total
      expect(monsters.length).toBeGreaterThan(0)

      // All monsters should be valid
      expect(monsters.every(m => m.id && m.monsterId && m.hp > 0)).toBe(true)

      // State initialization
      expect(state.commandQueue).toEqual([])
      expect(state.roundNumber).toBe(1)
      expect(state.combatLog).toEqual([])
      expect(state.canFlee).toBe(true)
    })

    it('creates combat state with 1-4 groups for higher levels', () => {
      const party = [createTestCharacter()]
      const state = CombatService.initiateCombat(5, party, true)

      // Level 5+ generates 1-4 groups
      expect(state.monsterGroups.length).toBeGreaterThanOrEqual(1)
      expect(state.monsterGroups.length).toBeLessThanOrEqual(4)
    })

    it('sets canFlee to false for fixed encounters', () => {
      const party = [createTestCharacter()]
      const state = CombatService.initiateCombat(1, party, false)

      expect(state.canFlee).toBe(false)
    })
  })

  describe('createCommand', () => {
    it('creates attack command with initiative', () => {
      const actor = createTestCharacter({ agility: 15 })
      const target = createTestMonster()

      const cmd = CombatService.createCommand(actor, 'ATTACK', target)

      expect(cmd.id).toBeDefined()
      expect(cmd.actor).toBe(actor)
      expect(cmd.type).toBe('ATTACK')
      expect(cmd.target).toBe(target)
      expect(cmd.initiative).toBeGreaterThanOrEqual(1)
      expect(cmd.data).toBeUndefined()
    })

    it('creates spell command with spell data', () => {
      const actor = createTestCharacter()
      const target = createTestMonster()

      const cmd = CombatService.createCommand(actor, 'CAST_SPELL', target, { spellId: 'halito' })

      expect(cmd.type).toBe('CAST_SPELL')
      expect(cmd.data).toEqual({ spellId: 'halito' })
    })

    it('rolls different initiative each time', () => {
      const actor = createTestCharacter({ agility: 10 })
      const initiatives = Array.from({ length: 50 }, () =>
        CombatService.createCommand(actor, 'ATTACK').initiative
      )

      const unique = new Set(initiatives)
      expect(unique.size).toBeGreaterThan(1)
    })
  })

  describe('calculateHitChance', () => {
    it('calculates basic hit chance formula', () => {
      const attacker = createTestCharacter({ level: 1, strength: 10 })
      const defender = createTestMonster({ ac: 8 })

      const hitChance = CombatService.calculateHitChance(attacker, defender)

      // Formula: (attackBonus + defenderAC + 10) × 5%
      // Fighter level 1: hitCalcMod = 2 + floor(1/3) = 2
      // attackBonus = 2 + 0 (strMod) = 2
      // (2 + 8 + 10) × 5% = 100% → capped to 95%
      expect(hitChance).toBe(95)
    })

    it('caps hit chance at 95%', () => {
      const attacker = createTestCharacter({ level: 10 })
      const defender = createTestMonster({ ac: 10 })

      const hitChance = CombatService.calculateHitChance(attacker, defender)

      expect(hitChance).toBeLessThanOrEqual(95)
    })

    it('has minimum hit chance of 5%', () => {
      const attacker = createTestCharacter({ level: 1 })
      const defender = createTestMonster({ ac: -10 })

      const hitChance = CombatService.calculateHitChance(attacker, defender)

      expect(hitChance).toBeGreaterThanOrEqual(5)
    })

    describe('HitCalcMod formula (authentic Wizardry 1)', () => {
      // Fighter/Priest/Samurai/Lord/Ninja: 2 + floor(Level/3)
      // Mage/Thief/Bishop: floor(Level/5)

      it('Fighter level 1: hitCalcMod = 2 + floor(1/3) = 2', () => {
        const fighter = createTestCharacter({
          class: CharacterClass.FIGHTER,
          level: 1,
          strength: 10 // 0 STR mod
        })
        const defender = createTestMonster({ ac: 0 })

        const hitChance = CombatService.calculateHitChance(fighter, defender)

        // attackBonus = 2, (2 + 0 + 10) × 5% = 60%
        expect(hitChance).toBe(60)
      })

      it('Fighter level 6: hitCalcMod = 2 + floor(6/3) = 4', () => {
        const fighter = createTestCharacter({
          class: CharacterClass.FIGHTER,
          level: 6,
          strength: 10
        })
        const defender = createTestMonster({ ac: 0 })

        const hitChance = CombatService.calculateHitChance(fighter, defender)

        // attackBonus = 4, (4 + 0 + 10) × 5% = 70%
        expect(hitChance).toBe(70)
      })

      it('Fighter level 12: hitCalcMod = 2 + floor(12/3) = 6', () => {
        const fighter = createTestCharacter({
          class: CharacterClass.FIGHTER,
          level: 12,
          strength: 10
        })
        const defender = createTestMonster({ ac: 0 })

        const hitChance = CombatService.calculateHitChance(fighter, defender)

        // attackBonus = 6, (6 + 0 + 10) × 5% = 80%
        expect(hitChance).toBe(80)
      })

      it('Mage level 1: hitCalcMod = floor(1/5) = 0', () => {
        const mage = createTestCharacter({
          class: CharacterClass.MAGE,
          level: 1,
          strength: 10
        })
        const defender = createTestMonster({ ac: 0 })

        const hitChance = CombatService.calculateHitChance(mage, defender)

        // attackBonus = 0, (0 + 0 + 10) × 5% = 50%
        expect(hitChance).toBe(50)
      })

      it('Mage level 10: hitCalcMod = floor(10/5) = 2', () => {
        const mage = createTestCharacter({
          class: CharacterClass.MAGE,
          level: 10,
          strength: 10
        })
        const defender = createTestMonster({ ac: 0 })

        const hitChance = CombatService.calculateHitChance(mage, defender)

        // attackBonus = 2, (2 + 0 + 10) × 5% = 60%
        expect(hitChance).toBe(60)
      })

      it('Priest uses strong class formula (like Fighter)', () => {
        const priest = createTestCharacter({
          class: CharacterClass.PRIEST,
          level: 6,
          strength: 10
        })
        const defender = createTestMonster({ ac: 0 })

        const hitChance = CombatService.calculateHitChance(priest, defender)

        // Priest level 6: hitCalcMod = 2 + floor(6/3) = 4
        // attackBonus = 4, (4 + 0 + 10) × 5% = 70%
        expect(hitChance).toBe(70)
      })

      it('Thief uses weak class formula (like Mage)', () => {
        const thief = createTestCharacter({
          class: CharacterClass.THIEF,
          level: 10,
          strength: 10
        })
        const defender = createTestMonster({ ac: 0 })

        const hitChance = CombatService.calculateHitChance(thief, defender)

        // Thief level 10: hitCalcMod = floor(10/5) = 2
        // attackBonus = 2, (2 + 0 + 10) × 5% = 60%
        expect(hitChance).toBe(60)
      })

      it('STR modifier still applies', () => {
        const fighter = createTestCharacter({
          class: CharacterClass.FIGHTER,
          level: 1,
          strength: 16 // +5% hit modifier (authentic Wizardry 1)
        })
        const defender = createTestMonster({ ac: 0 })

        const hitChance = CombatService.calculateHitChance(fighter, defender)

        // Authentic Wizardry 1:
        // hitCalcMod = 2, STR 16 = +5% hit modifier
        // STR hit modifier is percentage, converted to attack bonus: +5% / 5 = +1
        // attackBonus = 2 + 1 = 3
        // (3 + 0 + 10) × 5% = 65%
        expect(hitChance).toBe(65)
      })
    })

    describe('VictimPosition modifier (authentic Wizardry 1)', () => {
      // +3% per position in monster group (0-indexed)
      // Position 0 = +0%, Position 1 = +3%, Position 2 = +6%, etc.

      it('position 0 (front) has no modifier', () => {
        const attacker = createTestCharacter({
          class: CharacterClass.FIGHTER,
          level: 1,
          strength: 10
        })
        const defender = createTestMonster({ ac: 0 })

        const hitChance = CombatService.calculateHitChance(attacker, defender, 0, 0, 0)

        // Base: (2 + 0 + 10) × 5% = 60%, position 0: +0%
        expect(hitChance).toBe(60)
      })

      it('position 1 adds +3%', () => {
        const attacker = createTestCharacter({
          class: CharacterClass.FIGHTER,
          level: 1,
          strength: 10
        })
        const defender = createTestMonster({ ac: 0 })

        const hitChance = CombatService.calculateHitChance(attacker, defender, 0, 0, 1)

        // Base: 60%, position 1: +3% = 63%
        expect(hitChance).toBe(63)
      })

      it('position 2 adds +6%', () => {
        const attacker = createTestCharacter({
          class: CharacterClass.FIGHTER,
          level: 1,
          strength: 10
        })
        const defender = createTestMonster({ ac: 0 })

        const hitChance = CombatService.calculateHitChance(attacker, defender, 0, 0, 2)

        // Base: 60%, position 2: +6% = 66%
        expect(hitChance).toBe(66)
      })

      it('position 5 adds +15%', () => {
        const attacker = createTestCharacter({
          class: CharacterClass.FIGHTER,
          level: 1,
          strength: 10
        })
        const defender = createTestMonster({ ac: 0 })

        const hitChance = CombatService.calculateHitChance(attacker, defender, 0, 0, 5)

        // Base: 60%, position 5: +15% = 75%
        expect(hitChance).toBe(75)
      })

      it('position modifier is still capped at 95%', () => {
        const attacker = createTestCharacter({
          class: CharacterClass.FIGHTER,
          level: 12,
          strength: 18
        })
        const defender = createTestMonster({ ac: 10 })

        // Even with high position, should cap at 95%
        const hitChance = CombatService.calculateHitChance(attacker, defender, 0, 0, 10)

        expect(hitChance).toBe(95)
      })
    })
  })
})
