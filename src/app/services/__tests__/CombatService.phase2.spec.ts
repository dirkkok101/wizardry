// Phase 2 Combat Features Tests
import { CombatService } from '../CombatService'
import { RandomService } from '../RandomService'
import { createTestCharacter, createTestMonster, createTestCombatState } from '@testing/test-factories'
import { MonsterGroup } from '@types/Combat'
import { CharacterStatus } from '@types/CharacterStatus'
import { CharacterClass } from '@types/CharacterClass'

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

      // Messages are now returned as an array
      expect(result.messages[0]).toContain('Fighter')
      expect(result.messages[0]).toContain('defensive stance')
      expect(parryingCombatants.has('c1')).toBe(true)
    })
  })

  describe('RUN/Flee Mechanics', () => {
    it('calculates 50% base flee chance when AGI and Luck are neutral', () => {
      // Create monster with AGI 10 (neutral)
      const monster = createTestMonster({ agility: 10 })
      const monsterGroups: MonsterGroup[] = [{
        id: 'A',
        monsters: [monster],
        formation: 'front'
      }]
      const state = createTestCombatState({ canFlee: true, monsterGroups })
      // Character with AGI 10, Luck 10 (neutral)
      const party = [createTestCharacter({ id: 'c1', agility: 10, luck: 10 })]
      const fleeingIds = new Set<string>(['c1'])

      const chance = CombatService.calculateFleeChance(state, party, fleeingIds)
      expect(chance).toBe(50) // 50% base, no modifiers
    })

    it('returns 0% flee chance for boss fights', () => {
      const state = createTestCombatState({ canFlee: false })
      const party = [createTestCharacter({ id: 'c1' })]
      const fleeingIds = new Set<string>(['c1'])

      const chance = CombatService.calculateFleeChance(state, party, fleeingIds)
      expect(chance).toBe(0)
    })

    it('increases flee chance when party AGI is higher than monsters', () => {
      // Fast party (AGI 15) vs slow monsters (AGI 8)
      const monster = createTestMonster({ agility: 8 })
      const monsterGroups: MonsterGroup[] = [{
        id: 'A',
        monsters: [monster],
        formation: 'front'
      }]
      const state = createTestCombatState({ canFlee: true, monsterGroups })
      const party = [createTestCharacter({ id: 'c1', agility: 15, luck: 10 })]
      const fleeingIds = new Set<string>(['c1'])

      const chance = CombatService.calculateFleeChance(state, party, fleeingIds)
      // 50% base + (15-8)*5 = 50 + 35 = 85%
      expect(chance).toBe(85)
    })

    it('decreases flee chance when party AGI is lower than monsters', () => {
      // Slow party (AGI 8) vs fast monsters (AGI 15)
      const monster = createTestMonster({ agility: 15 })
      const monsterGroups: MonsterGroup[] = [{
        id: 'A',
        monsters: [monster],
        formation: 'front'
      }]
      const state = createTestCombatState({ canFlee: true, monsterGroups })
      const party = [createTestCharacter({ id: 'c1', agility: 8, luck: 10 })]
      const fleeingIds = new Set<string>(['c1'])

      const chance = CombatService.calculateFleeChance(state, party, fleeingIds)
      // 50% base + (8-15)*5 = 50 - 35 = 15%
      expect(chance).toBe(15)
    })

    it('adds luck modifier to flee chance', () => {
      const monster = createTestMonster({ agility: 10 })
      const monsterGroups: MonsterGroup[] = [{
        id: 'A',
        monsters: [monster],
        formation: 'front'
      }]
      const state = createTestCombatState({ canFlee: true, monsterGroups })
      // High luck (18) adds +16%: (18-10)*2 = 16
      const party = [createTestCharacter({ id: 'c1', agility: 10, luck: 18 })]
      const fleeingIds = new Set<string>(['c1'])

      const chance = CombatService.calculateFleeChance(state, party, fleeingIds)
      // 50% base + 0 AGI + 16% luck = 66%
      expect(chance).toBe(66)
    })

    it('clamps flee chance to 10-90% range', () => {
      // Very fast party should cap at 90%
      const slowMonster = createTestMonster({ agility: 5 })
      const slowMonsterGroups: MonsterGroup[] = [{
        id: 'A',
        monsters: [slowMonster],
        formation: 'front'
      }]
      const stateHighChance = createTestCombatState({ canFlee: true, monsterGroups: slowMonsterGroups })
      const fastParty = [createTestCharacter({ id: 'c1', agility: 18, luck: 18 })]
      const fleeingIds = new Set<string>(['c1'])

      const highChance = CombatService.calculateFleeChance(stateHighChance, fastParty, fleeingIds)
      expect(highChance).toBe(90) // Capped at 90%

      // Very slow party should floor at 10%
      const fastMonster = createTestMonster({ agility: 18 })
      const fastMonsterGroups: MonsterGroup[] = [{
        id: 'A',
        monsters: [fastMonster],
        formation: 'front'
      }]
      const stateLowChance = createTestCombatState({ canFlee: true, monsterGroups: fastMonsterGroups })
      const slowParty = [createTestCharacter({ id: 'c1', agility: 5, luck: 5 })]

      const lowChance = CombatService.calculateFleeChance(stateLowChance, slowParty, fleeingIds)
      expect(lowChance).toBe(10) // Floored at 10%
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

      // Messages are now returned as an array
      expect(result.messages[0]).toContain('Fighter')
      expect(result.messages[0]).toContain('flee')
    })

    it('successfully flees when all characters select RUN and roll succeeds', () => {
      const char = createTestCharacter({ id: 'c1', hp: 100, agility: 10, luck: 10 })
      const monster = createTestMonster({ hp: 100, agility: 10 })

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

      const result = CombatService.executeRound(state, [char], [char.id])

      expect(result.fled).toBe(true)
      expect(result.victory).toBe(false)
      expect(result.defeat).toBe(false)
      expect(result.messages.some(m => m.includes('successfully flees'))).toBe(true)

      Math.random = originalRandom
    })

    it('fails to flee when roll fails', () => {
      const char = createTestCharacter({ id: 'c1', hp: 100, agility: 10, luck: 10 })
      const monster = createTestMonster({ hp: 100, agility: 10 })

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

      const result = CombatService.executeRound(state, [char], [char.id])

      expect(result.fled).toBe(false)
      expect(result.messages.some(m => m.includes('fails to escape'))).toBe(true)

      Math.random = originalRandom
    })

    it('applies flee failure penalty - monsters get free attacks', () => {
      const char = createTestCharacter({ id: 'c1', hp: 100, agility: 10, luck: 10 })
      const monster = createTestMonster({ hp: 100, agility: 10, attack: 5, damage: '1d6' })

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
      Math.random = jest.fn(() => 0.7)

      const result = CombatService.executeRound(state, [char], [char.id])

      expect(result.fled).toBe(false)
      expect(result.messages.some(m => m.includes('fails to escape'))).toBe(true)
      // Should have penalty attack message
      expect(result.messages.some(m => m.includes('take advantage'))).toBe(true)
      // Monster should have attacked
      expect(result.messages.some(m => m.includes(monster.name) && m.includes('attacks'))).toBe(true)

      Math.random = originalRandom
    })

    it('executeFleeFailurePenalty targets characters in front row', () => {
      const frontChar = createTestCharacter({ id: 'c1', hp: 50, agility: 10, luck: 10 })
      const backChar = createTestCharacter({ id: 'c2', hp: 50, agility: 10, luck: 10 })
      const monster = createTestMonster({ hp: 100, agility: 10, attack: 10, damage: '1d6' })

      const monsterGroups: MonsterGroup[] = [{
        id: 'A',
        monsters: [monster],
        formation: 'front'
      }]
      const state = createTestCombatState({ monsterGroups, canFlee: true })

      const originalRandom = Math.random
      Math.random = jest.fn(() => 0.1) // Make attacks hit

      const result = CombatService.executeFleeFailurePenalty(
        state,
        [frontChar, backChar],
        [frontChar.id] // Only frontChar is in front row
      )

      // Should attack front row first
      expect(result.messages.some(m => m.includes('take advantage'))).toBe(true)
      // Monster should have attacked the front row character
      expect(result.messages.some(m => m.includes(frontChar.name))).toBe(true)

      Math.random = originalRandom
    })
  })
})
