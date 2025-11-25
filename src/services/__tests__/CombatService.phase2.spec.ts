// Phase 2 Combat Features Tests
import { CombatService } from '../CombatService'
import { RandomService } from '../RandomService'
import { createTestCharacter, createTestMonster, createTestCombatState } from '../../test-helpers/test-factories'
import { MonsterGroup } from '../../types/Combat'
import { CharacterStatus } from '../../types/CharacterStatus'
import { CharacterClass } from '../../types/CharacterClass'

describe('CombatService - Phase 2 Features', () => {
  describe('Critical Hit Formula', () => {
    it('calculates critical chance as (2 × Level)% for level 1', () => {
      const attacker = createTestCharacter({ level: 1 })
      const defender = createTestMonster()

      // Queue random values: hit roll, damage roll, crit roll
      RandomService.queueNextValues([0.5, 0.5, 0.01])

      const result = CombatService.resolveAttack(attacker, defender)

      expect(result.critical).toBe(true) // 1% < 2% (level 1 = 2% crit chance)
    })

    it('calculates critical chance as (2 × Level)% for level 10', () => {
      const attacker = createTestCharacter({ level: 10 })
      const defender = createTestMonster()

      // Queue random values: hit roll, damage roll, crit roll
      RandomService.queueNextValues([0.5, 0.5, 0.15])

      const result = CombatService.resolveAttack(attacker, defender)

      expect(result.critical).toBe(true) // 15% < 20% (level 10 = 20% crit chance)
    })

    it('caps critical chance at 50% for high levels', () => {
      const attacker = createTestCharacter({ level: 50 })
      const defender = createTestMonster()

      // Queue random values: hit roll, damage roll, crit roll
      RandomService.queueNextValues([0.5, 0.5, 0.49])

      const result = CombatService.resolveAttack(attacker, defender)

      expect(result.critical).toBe(true) // 49% < 50% (capped at 50%)
    })

    it('does not crit when roll exceeds crit chance', () => {
      const attacker = createTestCharacter({ level: 10 })
      const defender = createTestMonster()

      // Queue random values: hit roll, damage roll, crit roll
      RandomService.queueNextValues([0.5, 0.5, 0.25])

      const result = CombatService.resolveAttack(attacker, defender)

      expect(result.critical).toBe(false) // 25% >= 20% (no crit)
    })
  })

  describe('getAttacksPerRound', () => {
    it('Fighter gets 1 attack at level 1', () => {
      const fighter = createTestCharacter({ class: CharacterClass.FIGHTER, level: 1 })
      expect(CombatService.getAttacksPerRound(fighter)).toBe(1)
    })

    it('Fighter gets 2 attacks at level 5', () => {
      const fighter = createTestCharacter({ class: CharacterClass.FIGHTER, level: 5 })
      expect(CombatService.getAttacksPerRound(fighter)).toBe(2)
    })

    it('Fighter gets 3 attacks at level 10', () => {
      const fighter = createTestCharacter({ class: CharacterClass.FIGHTER, level: 10 })
      expect(CombatService.getAttacksPerRound(fighter)).toBe(3)
    })

    it('Lord gets 1 + floor(level/5) attacks', () => {
      const lord = createTestCharacter({ class: CharacterClass.LORD, level: 7 })
      expect(CombatService.getAttacksPerRound(lord)).toBe(2) // 1 + floor(7/5) = 2
    })

    it('Samurai gets 1 + floor(level/5) attacks', () => {
      const samurai = createTestCharacter({ class: CharacterClass.SAMURAI, level: 12 })
      expect(CombatService.getAttacksPerRound(samurai)).toBe(3) // 1 + floor(12/5) = 3
    })

    it('Ninja gets 2 + floor(level/5) attacks', () => {
      const ninja = createTestCharacter({ class: CharacterClass.NINJA, level: 1 })
      expect(CombatService.getAttacksPerRound(ninja)).toBe(2)
    })

    it('Ninja gets 4 attacks at level 10', () => {
      const ninja = createTestCharacter({ class: CharacterClass.NINJA, level: 10 })
      expect(CombatService.getAttacksPerRound(ninja)).toBe(4) // 2 + floor(10/5) = 4
    })

    it('Mage always gets 1 attack', () => {
      const mage = createTestCharacter({ class: CharacterClass.MAGE, level: 10 })
      expect(CombatService.getAttacksPerRound(mage)).toBe(1)
    })

    it('Priest always gets 1 attack', () => {
      const priest = createTestCharacter({ class: CharacterClass.PRIEST, level: 10 })
      expect(CombatService.getAttacksPerRound(priest)).toBe(1)
    })

    it('Bishop always gets 1 attack', () => {
      const bishop = createTestCharacter({ class: CharacterClass.BISHOP, level: 10 })
      expect(CombatService.getAttacksPerRound(bishop)).toBe(1)
    })

    it('Thief always gets 1 attack', () => {
      const thief = createTestCharacter({ class: CharacterClass.THIEF, level: 10 })
      expect(CombatService.getAttacksPerRound(thief)).toBe(1)
    })

    it('caps attacks at 10 maximum', () => {
      const fighter = createTestCharacter({ class: CharacterClass.FIGHTER, level: 100 })
      expect(CombatService.getAttacksPerRound(fighter)).toBe(10)
    })

    it('monsters always get 1 attack', () => {
      const monster = createTestMonster()
      expect(CombatService.getAttacksPerRound(monster)).toBe(1)
    })
  })

  describe('PARRY Action', () => {
    it('applies -2 AC modifier when target is parrying', () => {
      const attacker = createTestCharacter({ level: 1 })
      const defender = createTestCharacter({ id: 'def', ac: 5 })

      const parryingCombatants = new Set<string>(['def'])

      // Calculate hit chance without parry
      const normalChance = CombatService.calculateHitChance(attacker, defender, 0)

      // Calculate hit chance with parry (-2 AC = harder to hit)
      const parryChance = CombatService.calculateHitChance(attacker, defender, -2)

      expect(parryChance).toBeLessThan(normalChance)
      expect(parryChance).toBe(normalChance - 10) // -2 AC × 5% = -10%
    })

    it('executes parry command and tracks parrying combatant', () => {
      const char = createTestCharacter({ id: 'c1', name: 'Fighter' })
      const state = createTestCombatState()
      const parryingCombatants = new Set<string>()

      const cmd = CombatService.createCommand(char, 'PARRY')
      const result = CombatService.executeCommand(state, cmd, parryingCombatants)

      expect(result.message).toContain('Fighter')
      expect(result.message).toContain('defensive stance')
      expect(parryingCombatants.has('c1')).toBe(true)
    })
  })

  describe('RUN/Flee Mechanics', () => {
    it('calculates 50% base flee chance', () => {
      const state = createTestCombatState({ canFlee: true })
      const party = [createTestCharacter({ id: 'c1' })]
      const fleeingIds = new Set<string>(['c1'])

      const chance = CombatService.calculateFleeChance(state, party, fleeingIds)
      expect(chance).toBe(50)
    })

    it('returns 0% flee chance for boss fights', () => {
      const state = createTestCombatState({ canFlee: false })
      const party = [createTestCharacter({ id: 'c1' })]
      const fleeingIds = new Set<string>(['c1'])

      const chance = CombatService.calculateFleeChance(state, party, fleeingIds)
      expect(chance).toBe(0)
    })

    it('adds +20% when >50% of party is dead', () => {
      const state = createTestCombatState({ canFlee: true })
      const party = [
        createTestCharacter({ id: 'c1', status: CharacterStatus.DEAD, hp: 0 }),
        createTestCharacter({ id: 'c2', status: CharacterStatus.DEAD, hp: 0 }),
        createTestCharacter({ id: 'c3', status: CharacterStatus.DEAD, hp: 0 }),
        createTestCharacter({ id: 'c4', hp: 10 })
      ]
      const fleeingIds = new Set<string>(['c4'])

      const chance = CombatService.calculateFleeChance(state, party, fleeingIds)
      expect(chance).toBe(70) // 50% base + 20% casualties
    })

    it('returns 0% if no characters fleeing', () => {
      const state = createTestCombatState({ canFlee: true })
      const party = [createTestCharacter({ id: 'c1' })]
      const fleeingIds = new Set<string>()

      const chance = CombatService.calculateFleeChance(state, party, fleeingIds)
      expect(chance).toBe(0)
    })

    it('executes run command successfully', () => {
      const char = createTestCharacter({ id: 'c1', name: 'Fighter' })
      const state = createTestCombatState()

      const cmd = CombatService.createCommand(char, 'RUN')
      const result = CombatService.executeCommand(state, cmd, new Set())

      expect(result.message).toContain('Fighter')
      expect(result.message).toContain('flee')
    })

    it('successfully flees when all characters select RUN and roll succeeds', () => {
      const char = createTestCharacter({ id: 'c1', hp: 100 })
      const monster = createTestMonster({ hp: 100 })

      const monsterGroups: MonsterGroup[] = [{
        id: 'A',
        monsters: [monster],
        formation: 'front'
      }]
      const state = createTestCombatState({ monsterGroups, canFlee: true })

      const runCmd = CombatService.createCommand(char, 'RUN')
      state.commandQueue = [runCmd]

      // Mock random to ensure flee success (roll < 50%)
      const originalRandom = Math.random
      Math.random = jest.fn(() => 0.3) // 30% roll < 50% flee chance

      const result = CombatService.executeRound(state, [char])

      expect(result.fled).toBe(true)
      expect(result.victory).toBe(false)
      expect(result.defeat).toBe(false)
      expect(result.messages.some(m => m.includes('successfully flees'))).toBe(true)

      Math.random = originalRandom
    })

    it('fails to flee when roll fails', () => {
      const char = createTestCharacter({ id: 'c1', hp: 100 })
      const monster = createTestMonster({ hp: 100 })

      const monsterGroups: MonsterGroup[] = [{
        id: 'A',
        monsters: [monster],
        formation: 'front'
      }]
      const state = createTestCombatState({ monsterGroups, canFlee: true })

      const runCmd = CombatService.createCommand(char, 'RUN')
      state.commandQueue = [runCmd]

      // Mock random to ensure flee failure (roll >= 50%)
      const originalRandom = Math.random
      Math.random = jest.fn(() => 0.7) // 70% roll >= 50% flee chance

      const result = CombatService.executeRound(state, [char])

      expect(result.fled).toBe(false)
      expect(result.messages.some(m => m.includes('fails to escape'))).toBe(true)

      Math.random = originalRandom
    })
  })
})
