// src/app/services/__tests__/CombatService.surprise.spec.ts
import { CombatService } from '../CombatService'
import { RandomService } from '../RandomService'
import { EncounterService } from '../EncounterService'
import { createTestCharacter, createTestMonster } from '@testing/test-factories'
import { CombatState, MonsterGroup } from '@models/Combat'

describe('CombatService - Surprise Mechanics', () => {
  describe('rollSurprise', () => {
    it('returns correct structure with party and monster surprise flags', () => {
      RandomService.queueNextValues([0.5, 0.5])  // Both fail surprise (>20%)

      const result = CombatService.rollSurprise()

      expect(result).toHaveProperty('partySurprises')
      expect(result).toHaveProperty('monstersSurprise')
      expect(typeof result.partySurprises).toBe('boolean')
      expect(typeof result.monstersSurprise).toBe('boolean')
    })

    it('party surprises monsters when first roll succeeds', () => {
      RandomService.queueNextValues([0.1])  // 10% < 20% = party surprises

      const result = CombatService.rollSurprise()

      expect(result.partySurprises).toBe(true)
      expect(result.monstersSurprise).toBe(false)
    })

    it('monsters surprise party when first roll fails and second succeeds', () => {
      RandomService.queueNextValues([0.5, 0.1])  // First fails (50%), second succeeds (10%)

      const result = CombatService.rollSurprise()

      expect(result.partySurprises).toBe(false)
      expect(result.monstersSurprise).toBe(true)
    })

    it('no surprise when both rolls fail', () => {
      RandomService.queueNextValues([0.5, 0.5])  // Both fail (50% > 20%)

      const result = CombatService.rollSurprise()

      expect(result.partySurprises).toBe(false)
      expect(result.monstersSurprise).toBe(false)
    })

    it('follows correct sequence: check party first, then monsters if party fails', () => {
      // Party succeeds - should not check monsters
      RandomService.queueNextValues([0.1])  // Only need one value

      let result = CombatService.rollSurprise()
      expect(result.partySurprises).toBe(true)
      expect(result.monstersSurprise).toBe(false)

      // Party fails - should check monsters
      RandomService.queueNextValues([0.5, 0.1])  // Need two values

      result = CombatService.rollSurprise()
      expect(result.partySurprises).toBe(false)
      expect(result.monstersSurprise).toBe(true)
    })

    it('distributes surprise correctly over many trials (~20% each way)', () => {
      const trials = 1000
      let partySurprises = 0
      let monstersSurprise = 0
      let noSurprise = 0

      for (let i = 0; i < trials; i++) {
        const result = CombatService.rollSurprise()

        if (result.partySurprises) {
          partySurprises++
        } else if (result.monstersSurprise) {
          monstersSurprise++
        } else {
          noSurprise++
        }
      }

      // Expected: 20% party, 16% monsters (80% * 20%), 64% no surprise (80% * 80%)
      const partyPercent = (partySurprises / trials) * 100
      const monstersPercent = (monstersSurprise / trials) * 100
      const noSurprisePercent = (noSurprise / trials) * 100

      // Allow 5% margin of error for statistical variance
      expect(partyPercent).toBeGreaterThan(15)
      expect(partyPercent).toBeLessThan(25)

      expect(monstersPercent).toBeGreaterThan(11)
      expect(monstersPercent).toBeLessThan(21)

      expect(noSurprisePercent).toBeGreaterThan(59)
      expect(noSurprisePercent).toBeLessThan(69)
    })
  })

  describe('initiateCombat with surprise', () => {
    // Mock EncounterService to bypass random encounter generation
    const mockMonsterGroups: MonsterGroup[] = [{
      id: 'A',
      monsters: [createTestMonster()],
      formation: 'front',
      identified: false
    }]

    beforeEach(() => {
      jest.spyOn(EncounterService, 'generateEncounter').mockReturnValue(mockMonsterGroups)
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('includes surprise state in initial combat state', () => {
      RandomService.queueNextValues([0.1])  // Party surprises

      const party = [createTestCharacter()]
      const state = CombatService.initiateCombat(1, party, true)

      expect(state.surpriseState).toBeDefined()
      expect(['party', 'monsters', 'none']).toContain(state.surpriseState)
    })

    it('sets surpriseState to "party" when party surprises', () => {
      RandomService.queueNextValues([0.1])  // Party surprises (10% < 20%)

      const party = [createTestCharacter()]
      const state = CombatService.initiateCombat(1, party, true)

      expect(state.surpriseState).toBe('party')
    })

    it('sets surpriseState to "monsters" when monsters surprise', () => {
      RandomService.queueNextValues([0.5, 0.1])  // Party fails (50%), monsters succeed (10%)

      const party = [createTestCharacter()]
      const state = CombatService.initiateCombat(1, party, true)

      expect(state.surpriseState).toBe('monsters')
    })

    it('sets surpriseState to "none" when no surprise occurs', () => {
      RandomService.queueNextValues([0.5, 0.5])  // Both fail (50% > 20%)

      const party = [createTestCharacter()]
      const state = CombatService.initiateCombat(1, party, true)

      expect(state.surpriseState).toBe('none')
    })
  })

  describe('executeRoundWithEvents with surprise', () => {
    it('filters out monster commands when party surprises in round 1', () => {
      const fighter = createTestCharacter({ id: 'char1', name: 'Fighter', hp: 20 })
      const monster = createTestMonster({ id: 'mon1', name: 'Kobold', hp: 5 })

      const group: MonsterGroup = {
        id: 'A',
        monsters: [monster],
        formation: 'front',
        identified: false
      }

      // Create fighter attack command
      const fighterCmd = CombatService.createCommand(fighter, 'ATTACK', monster)
      // Create monster attack command
      const monsterCmd = CombatService.createCommand(monster, 'ATTACK', fighter)

      const state: CombatState = {
        monsterGroups: [group],
        commandQueue: [fighterCmd, monsterCmd],
        roundNumber: 1,
        combatLog: [],
        canFlee: true,
        dungeonLevel: 1,
        statusEffects: new Map(),
        acModifiers: new Map(),
        statusDurations: new Map(),
        surpriseState: 'party'
      }

      const party = [fighter]

      // Queue random values for attack resolution (only fighter attacks)
      RandomService.queueNextValues([0.5, 0.5])  // Hit roll, damage roll

      const result = CombatService.executeRoundWithEvents(state, party, [fighter.id])

      // Party member should act, monster should not
      const messages = result.events.flatMap(e => e.messages)
      expect(messages.some(m => m.includes('Fighter attacks'))).toBe(true)
      expect(messages.some(m => m.includes('Kobold attacks'))).toBe(false)
    })

    it('filters out party commands when monsters surprise in round 1', () => {
      const fighter = createTestCharacter({ id: 'char1', name: 'Fighter', hp: 20 })
      const monster = createTestMonster({ id: 'mon1', name: 'Kobold', hp: 5 })

      const group: MonsterGroup = {
        id: 'A',
        monsters: [monster],
        formation: 'front',
        identified: false
      }

      // Create fighter attack command
      const fighterCmd = CombatService.createCommand(fighter, 'ATTACK', monster)
      // Create monster attack command
      const monsterCmd = CombatService.createCommand(monster, 'ATTACK', fighter)

      const state: CombatState = {
        monsterGroups: [group],
        commandQueue: [fighterCmd, monsterCmd],
        roundNumber: 1,
        combatLog: [],
        canFlee: true,
        dungeonLevel: 1,
        statusEffects: new Map(),
        acModifiers: new Map(),
        statusDurations: new Map(),
        surpriseState: 'monsters'
      }

      const party = [fighter]

      // Queue random values for attack resolution (only monster attacks)
      RandomService.queueNextValues([0.5, 0.5])  // Hit roll, damage roll

      const result = CombatService.executeRoundWithEvents(state, party, [fighter.id])

      // Monster should act, party member should not
      const messages = result.events.flatMap(e => e.messages)
      expect(messages.some(m => m.includes('Kobold attacks'))).toBe(true)
      expect(messages.some(m => m.includes('Fighter attacks'))).toBe(false)
    })

    it('allows both sides to act when no surprise in round 1', () => {
      const fighter = createTestCharacter({ id: 'char1', name: 'Fighter', hp: 20 })
      const monster = createTestMonster({ id: 'mon1', name: 'Kobold', hp: 5 })

      const group: MonsterGroup = {
        id: 'A',
        monsters: [monster],
        formation: 'front',
        identified: false
      }

      // Create fighter attack command
      const fighterCmd = CombatService.createCommand(fighter, 'ATTACK', monster)
      // Create monster attack command
      const monsterCmd = CombatService.createCommand(monster, 'ATTACK', fighter)

      const state: CombatState = {
        monsterGroups: [group],
        commandQueue: [fighterCmd, monsterCmd],
        roundNumber: 1,
        combatLog: [],
        canFlee: true,
        dungeonLevel: 1,
        statusEffects: new Map(),
        acModifiers: new Map(),
        statusDurations: new Map(),
        surpriseState: 'none'
      }

      const party = [fighter]

      // Queue random values for attack resolution (both attack)
      RandomService.queueNextValues([0.5, 0.5, 0.5, 0.5])  // Hit/damage for both

      const result = CombatService.executeRoundWithEvents(state, party, [fighter.id])

      // Both should act
      const messages = result.events.flatMap(e => e.messages)
      expect(messages.some(m => m.includes('Fighter attacks'))).toBe(true)
      expect(messages.some(m => m.includes('Kobold attacks'))).toBe(true)
    })

    it('allows both sides to act in round 2 regardless of surprise state', () => {
      const fighter = createTestCharacter({ id: 'char1', name: 'Fighter', hp: 20 })
      const monster = createTestMonster({ id: 'mon1', name: 'Kobold', hp: 5 })

      const group: MonsterGroup = {
        id: 'A',
        monsters: [monster],
        formation: 'front',
        identified: false
      }

      // Create fighter attack command
      const fighterCmd = CombatService.createCommand(fighter, 'ATTACK', monster)
      // Create monster attack command
      const monsterCmd = CombatService.createCommand(monster, 'ATTACK', fighter)

      const state: CombatState = {
        monsterGroups: [group],
        commandQueue: [fighterCmd, monsterCmd],
        roundNumber: 2,  // Round 2
        combatLog: [],
        canFlee: true,
        dungeonLevel: 1,
        statusEffects: new Map(),
        acModifiers: new Map(),
        statusDurations: new Map(),
        surpriseState: 'party'  // Party surprised in round 1, but doesn't matter now
      }

      const party = [fighter]

      // Queue random values for attack resolution (both attack in round 2)
      RandomService.queueNextValues([0.5, 0.5, 0.5, 0.5])  // Hit/damage for both

      const result = CombatService.executeRoundWithEvents(state, party, [fighter.id])

      // Both should act in round 2
      const messages = result.events.flatMap(e => e.messages)
      expect(messages.some(m => m.includes('Fighter attacks'))).toBe(true)
      expect(messages.some(m => m.includes('Kobold attacks'))).toBe(true)
    })
  })
})
