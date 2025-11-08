// src/services/__tests__/CombatService.spec.ts
import { CombatService } from '../CombatService'
import { createTestCharacter, createTestMonster } from '../../test-helpers/test-factories'

describe('CombatService', () => {
  describe('calculateInitiative', () => {
    it('calculates initiative with AGI modifier', () => {
      const char = createTestCharacter({ agility: 18 })  // +4 modifier

      const results = Array.from({ length: 100 }, () =>
        CombatService.calculateInitiative(char)
      )

      // Formula: random(0-9) + AGI_modifier
      // AGI 18 = +4 modifier
      // Range: 4-13 (0+4 to 9+4)
      results.forEach(init => {
        expect(init).toBeGreaterThanOrEqual(4)
        expect(init).toBeLessThanOrEqual(13)
      })
    })

    it('has minimum of 1', () => {
      const char = createTestCharacter({ agility: 3 })  // -4 modifier

      const results = Array.from({ length: 100 }, () =>
        CombatService.calculateInitiative(char)
      )

      // Even with negative modifier, minimum is 1
      results.forEach(init => {
        expect(init).toBeGreaterThanOrEqual(1)
      })
    })

    it('uses default AGI 10 if undefined', () => {
      const char = createTestCharacter({ agility: undefined })

      const results = Array.from({ length: 100 }, () =>
        CombatService.calculateInitiative(char)
      )

      // AGI 10 = +0 modifier, range 0-9, but min 1
      results.forEach(init => {
        expect(init).toBeGreaterThanOrEqual(1)
        expect(init).toBeLessThanOrEqual(9)
      })
    })
  })

  describe('initiateCombat', () => {
    it('creates combat state with monster group', () => {
      const party = [
        createTestCharacter({ id: 'char1' }),
        createTestCharacter({ id: 'char2' })
      ]

      const state = CombatService.initiateCombat('kobold', party, true)

      expect(state.monsters.length).toBeGreaterThanOrEqual(3)
      expect(state.monsters.length).toBeLessThanOrEqual(5)
      expect(state.monsters.every(m => m.monsterId === 'kobold')).toBe(true)
      expect(state.commandQueue).toEqual([])
      expect(state.roundNumber).toBe(1)
      expect(state.combatLog).toEqual([])
      expect(state.canFlee).toBe(true)
    })

    it('sets canFlee to false for fixed encounters', () => {
      const party = [createTestCharacter()]
      const state = CombatService.initiateCombat('kobold', party, false)

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
      const attacker = createTestCharacter({ level: 1 })  // Attack bonus ~1
      const defender = createTestMonster({ ac: 8 })

      const hitChance = CombatService.calculateHitChance(attacker, defender)

      // Formula: (attackBonus + defenderAC + 10) × 5%
      // (1 + 8 + 10) × 5% = 19 × 5% = 95%
      expect(hitChance).toBe(95)
    })

    it('caps hit chance at 95%', () => {
      const attacker = createTestCharacter({ level: 10 })  // High attack bonus
      const defender = createTestMonster({ ac: 10 })

      const hitChance = CombatService.calculateHitChance(attacker, defender)

      expect(hitChance).toBeLessThanOrEqual(95)
    })

    it('has minimum hit chance of 5%', () => {
      const attacker = createTestCharacter({ level: 1 })
      const defender = createTestMonster({ ac: -10 })  // Very low AC

      const hitChance = CombatService.calculateHitChance(attacker, defender)

      expect(hitChance).toBeGreaterThanOrEqual(5)
    })
  })
})
